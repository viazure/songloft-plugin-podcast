/**
 * One-click hand-off of a podcast episode to the MIoT speaker plugin.
 *
 * Why HTTP instead of an inter-plugin action: the MIoT plugin only registers
 * `register-search-provider` / `unregister-search-provider` over
 * `songloft.comm`. It has no "play this song" action, so a comm call can never
 * work. Its real entry points are HTTP routes on its own plugin base URL:
 *
 *   GET  /mina/devices            → accounts + devices (+ last_selected_device_id)
 *   POST /mina/play-url           → { account_id, device_id, url }
 *
 * We therefore drive it the same way its own web UI does, using our plugin JWT.
 * The song URL must be reachable *by the speaker*, so it is built from a LAN
 * address of this host, not from localhost.
 */

export const MIOT_ENTRY_PATH = "miot";
const HTTP_TIMEOUT_MS = 8000;

export type CastReason =
  | "miot_unavailable"
  | "miot_no_device"
  | "miot_device_offline"
  | "not_podcast_song"
  | "cast_failed";

export type CastResult = {
  ok: boolean;
  reason?: CastReason;
  error?: string;
  deviceId?: string;
  deviceName?: string;
  accountId?: string;
  online?: boolean;
};

/* ------------------------------------------------------------------ */
/* host helpers                                                        */
/* ------------------------------------------------------------------ */

type HostLike = {
  getToken?: () => Promise<string>;
  getHostUrl?: () => Promise<string>;
  getNetworkAddresses?: () => Promise<string[]>;
};

function plugin(): HostLike {
  const anyGlobal = globalThis as unknown as { songloft?: { plugin?: HostLike } };
  return (anyGlobal.songloft && anyGlobal.songloft.plugin) || {};
}

async function hostBase(): Promise<string> {
  try {
    const p = plugin();
    if (typeof p.getHostUrl === "function") {
      const url = String((await p.getHostUrl()) || "").trim();
      if (url) return url.replace(/\/+$/, "");
    }
  } catch (_) {
    /* fall through */
  }
  return "http://127.0.0.1:58091";
}

async function hostToken(): Promise<string> {
  try {
    const p = plugin();
    if (typeof p.getToken === "function") return String((await p.getToken()) || "");
  } catch (_) {
    /* ignore */
  }
  return "";
}

async function miotFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = await hostBase();
  const token = await hostToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init && init.headers ? (init.headers as Record<string, string>) : {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init && init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return fetch(`${base}/api/v1/jsplugin/${MIOT_ENTRY_PATH}${path}`, {
    ...(init || {}),
    headers,
  });
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await miotFetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err =
      (body && typeof body === "object" && (body as { error?: string }).error) ||
      `HTTP ${res.status}`;
    throw new Error(String(err));
  }
  return body as T;
}

/* ------------------------------------------------------------------ */
/* song validation                                                     */
/* ------------------------------------------------------------------ */

type SongLike = { id?: number; source_data?: unknown; title?: string };

/** Only songs this plugin created (podcast enclosures) may be cast. */
export function isPodcastSong(song: SongLike | null | undefined): boolean {
  if (!song) return false;
  const raw = song.source_data;
  let data: Record<string, unknown> | null = null;
  if (raw && typeof raw === "object") data = raw as Record<string, unknown>;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      data = null;
    }
  }
  if (!data) return false;
  const feedUrl = typeof data.feedUrl === "string" ? data.feedUrl.trim() : "";
  const enclosureUrl = typeof data.enclosureUrl === "string" ? data.enclosureUrl.trim() : "";
  return !!(feedUrl || enclosureUrl);
}

/* ------------------------------------------------------------------ */
/* device selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Device shapes differ between MIoT plugin versions and code paths:
 * `buildDeviceInfoMerged` emits `{ deviceID, name, presence, managed }`, while
 * local-cache fallbacks and older builds emitted snake_case. Accept both.
 */
type MiotDevice = {
  device_id?: string;
  deviceID?: string;
  id?: string;
  name?: string;
  alias?: string;
  model?: string;
  hardware?: string;
  presence?: string;
  managed?: boolean;
};

type MiotAccountBlock = {
  account_id?: string;
  account_name?: string;
  last_selected_device_id?: string;
  devices?: MiotDevice[];
};

type DevicesResponse = { success?: boolean; data?: MiotAccountBlock[]; error?: string };

function deviceIdOf(device: MiotDevice | null | undefined): string {
  if (!device) return "";
  return String(device.device_id || device.deviceID || device.id || "").trim();
}

function deviceNameOf(device: MiotDevice | null | undefined): string {
  if (!device) return "";
  return String(device.name || device.alias || deviceIdOf(device)).trim();
}

function isOnline(device: MiotDevice): boolean {
  const p = String(device.presence || "").trim().toLowerCase();
  return p === "online";
}

/**
 * Pick a speaker, honouring an explicit choice from the UI.
 *
 * `managed` marks devices the user enabled inside the MIoT plugin; unmanaged ones
 * are merely discovered. Preference order: requested > last selected (online) >
 * managed online > any online > last selected > managed > any. Offline devices are
 * still returned (with a flag) so the UI can explain *why* nothing is playable
 * instead of claiming there is no device.
 */
function pickDeviceFor(
  blocks: MiotAccountBlock[],
  requestedId?: string
): { accountId: string; deviceId: string; deviceName: string; online: boolean } | null {
  const wanted = String(requestedId || "").trim();
  if (wanted) {
    for (const block of blocks || []) {
      const hit = (block.devices || []).find((d) => deviceIdOf(d) === wanted);
      if (hit) {
        return {
          accountId: String(block.account_id || ""),
          deviceId: deviceIdOf(hit),
          deviceName: deviceNameOf(hit) || wanted,
          online: isOnline(hit),
        };
      }
    }
  }
  return pickDevice(blocks);
}

function pickDevice(blocks: MiotAccountBlock[]): {
  accountId: string;
  deviceId: string;
  deviceName: string;
  online: boolean;
} | null {
  for (const block of blocks || []) {
    const accountId = String(block.account_id || "").trim();
    const devices = (Array.isArray(block.devices) ? block.devices : []).filter((d) => deviceIdOf(d));
    if (!devices.length) continue;

    const wanted = String(block.last_selected_device_id || "").trim();
    const selected = wanted ? devices.find((d) => deviceIdOf(d) === wanted) : undefined;
    const ordered = [
      // Prefer what the user last picked, but never over a device that can
      // actually play right now.
      selected && isOnline(selected) ? selected : undefined,
      devices.find((d) => d.managed !== false && isOnline(d)),
      devices.find((d) => isOnline(d)),
      selected,
      devices.find((d) => d.managed !== false),
      devices[0],
    ].filter(Boolean) as MiotDevice[];

    const match = ordered[0];
    if (!match) continue;
    return {
      accountId,
      deviceId: deviceIdOf(match),
      deviceName: deviceNameOf(match) || deviceIdOf(match),
      online: isOnline(match),
    };
  }
  return null;
}

/** Flatten every device across accounts (for the settings picker). */
function flattenDevices(blocks: MiotAccountBlock[]) {
  const out: Array<{
    accountId: string;
    deviceId: string;
    name: string;
    model: string;
    online: boolean;
    managed: boolean;
    selected: boolean;
  }> = [];
  for (const block of blocks || []) {
    const accountId = String(block.account_id || "").trim();
    const wanted = String(block.last_selected_device_id || "").trim();
    for (const d of block.devices || []) {
      const deviceId = deviceIdOf(d);
      if (!deviceId) continue;
      out.push({
        accountId,
        deviceId,
        name: deviceNameOf(d) || deviceId,
        model: String(d.model || d.hardware || ""),
        online: isOnline(d),
        managed: d.managed !== false,
        selected: !!wanted && wanted === deviceId,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* speaker-reachable song url                                          */
/* ------------------------------------------------------------------ */

function portOf(base: string): string {
  try {
    const u = new URL(base);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch (_) {
    return "58091";
  }
}

/**
 * The speaker is a separate device: it cannot resolve `127.0.0.1`. Prefer a LAN
 * IPv4 of this host; fall back to the host URL's own hostname when it is already
 * non-loopback.
 */
async function speakerReachableBase(): Promise<string> {
  const hostUrl = await hostBase();
  const port = portOf(hostUrl);

  let hostname = "";
  let proto = "http:";
  try {
    const u = new URL(hostUrl);
    hostname = u.hostname;
    proto = u.protocol;
  } catch (_) {
    /* ignore */
  }

  const isLoopback =
    !hostname || hostname === "localhost" || hostname.startsWith("127.") || hostname === "::1";
  if (!isLoopback) return `${proto}//${hostname}:${port}`;

  try {
    const p = plugin();
    if (typeof p.getNetworkAddresses === "function") {
      const list = await p.getNetworkAddresses();
      const first = (Array.isArray(list) ? list : []).find(
        (a) => typeof a === "string" && a.trim() && !a.startsWith("127.") && a !== "localhost"
      );
      if (first) return `http://${String(first).trim()}:${port}`;
    }
  } catch (_) {
    /* ignore */
  }
  return hostUrl;
}

/** `/api/v1/songs/{id}/play?access_token=…` reachable from the speaker. */
async function buildSongUrl(songId: number): Promise<string> {
  const base = await speakerReachableBase();
  const token = await hostToken();
  const qs = new URLSearchParams();
  if (token) qs.set("access_token", token);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `${base}/api/v1/songs/${songId}/play${suffix}`;
}

/**
 * Cast a whole playlist to the speaker.
 *
 * MIoT's `POST /player/play` takes `{ account_id, device_id, playlist_id }` and
 * drives its own queue, which is the only way to play a list on the speaker —
 * `/mina/play-url` pushes a single stream with no next-track handling.
 */
export async function castPlaylistToMiot(
  playlistId: number,
  options: { deviceId?: string; startIndex?: number } = {}
): Promise<CastResult & { playlistId?: number; queued?: number }> {
  if (typeof playlistId !== "number" || !Number.isFinite(playlistId) || playlistId <= 0) {
    return { ok: false, reason: "cast_failed", error: "缺少有效的歌单 ID" };
  }

  let devices: DevicesResponse;
  try {
    devices = await fetchJson<DevicesResponse>("/mina/devices", { method: "GET" });
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e ?? "无法连接智能音箱插件");
    const missing = /HTTP 40[0-9]|not found|plugin_unavailable/i.test(msg);
    return {
      ok: false,
      reason: "miot_unavailable",
      error: missing ? "未安装或未启用「智能音箱」插件" : msg,
    };
  }

  const blocks = Array.isArray(devices.data) ? devices.data : [];
  const target = pickDeviceFor(blocks, options.deviceId);
  if (!target) {
    return { ok: false, reason: "miot_no_device", error: "没有可选的音箱设备" };
  }
  if (!target.online) {
    return {
      ok: false,
      reason: "miot_device_offline",
      error: `音箱「${target.deviceName}」当前离线，请先唤醒或检查电源与网络后重试`,
      ...target,
    };
  }

  try {
    const res = await fetchJson<{ success?: boolean; error?: string; data?: { current_index?: number } }>(
      "/player/play",
      {
        method: "POST",
        body: JSON.stringify({
          account_id: target.accountId,
          device_id: target.deviceId,
          playlist_id: playlistId,
          start_index: options.startIndex || 0,
        }),
      }
    );
    if (res && res.success === false) {
      return { ok: false, reason: "cast_failed", error: String(res.error || "音箱拒绝播放"), ...target };
    }
    return { ok: true, ...target, playlistId };
  } catch (e) {
    return {
      ok: false,
      reason: "cast_failed",
      error: String((e as { message?: string })?.message ?? e ?? "投放失败"),
      ...target,
    };
  }
}

/**
 * Speaker-reachable base url for the current host.
 *
 * Exposed so the episode-list cast can hand MIoT a playlist id while the caller
 * still reports a sensible error when no LAN address exists.
 */
export async function speakerBaseUrl(): Promise<string> {
  return speakerReachableBase();
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Cast an already-created song to the last-selected (or first) MIoT speaker.
 * Never throws: failures come back as `{ ok: false, reason, error }`.
 */
export async function castSongToMiot(
  songId: number,
  options: { deviceId?: string } = {}
): Promise<CastResult> {
  if (typeof songId !== "number" || !Number.isFinite(songId) || songId <= 0) {
    return { ok: false, reason: "cast_failed", error: "缺少有效的歌曲 ID" };
  }

  let devices: DevicesResponse;
  try {
    devices = await fetchJson<DevicesResponse>("/mina/devices", { method: "GET" });
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e ?? "无法连接智能音箱插件");
    const missing = /HTTP 40[0-9]|not found|plugin_unavailable/i.test(msg);
    return {
      ok: false,
      reason: "miot_unavailable",
      error: missing ? "未安装或未启用「智能音箱」插件" : msg,
    };
  }

  if (devices && devices.success === false) {
    return { ok: false, reason: "cast_failed", error: String(devices.error || "读取设备失败") };
  }

  const blocks = Array.isArray(devices.data) ? devices.data : [];
  const all = flattenDevices(blocks);

  if (!all.length) {
    return {
      ok: false,
      reason: "miot_no_device",
      error: "智能音箱插件里没有设备：请先在插件页登录小米账号",
    };
  }

  // An explicit pick wins over the automatic choice, even when offline: the user
  // asked for that device, so report its state rather than silently switching.
  const target = pickDeviceFor(blocks, options.deviceId);
  if (!target) {
    return { ok: false, reason: "miot_no_device", error: "没有可选的音箱设备" };
  }

  // Offline devices can still be told to play (the cloud queues it and the
  // speaker picks it up when it reconnects), but say so instead of pretending
  // it worked.
  if (!target.online) {
    return {
      ok: false,
      reason: "miot_device_offline",
      error: `音箱「${target.deviceName}」当前离线，请先唤醒或检查电源与网络后重试`,
      deviceId: target.deviceId,
      deviceName: target.deviceName,
      accountId: target.accountId,
      online: false,
    };
  }

  let url = "";
  try {
    url = await buildSongUrl(songId);
  } catch (e) {
    return { ok: false, reason: "cast_failed", error: String((e as Error)?.message ?? e) };
  }

  try {
    const res = await fetchJson<{ success?: boolean; error?: string }>("/mina/play-url", {
      method: "POST",
      body: JSON.stringify({
        account_id: target.accountId,
        device_id: target.deviceId,
        url,
      }),
    });
    if (res && res.success === false) {
      return {
        ok: false,
        reason: "cast_failed",
        error: String(res.error || "音箱拒绝播放"),
        ...target,
      };
    }
  } catch (e) {
    return {
      ok: false,
      reason: "cast_failed",
      error: String((e as { message?: string })?.message ?? e ?? "投放失败"),
      ...target,
    };
  }

  return { ok: true, ...target };
}

/** Devices list for the settings page (best-effort; empty on failure). */export async function listMiotDevices(): Promise<
  Array<{
    accountId: string;
    deviceId: string;
    name: string;
    model: string;
    online: boolean;
    managed: boolean;
    selected: boolean;
  }>
> {
  try {
    const res = await fetchJson<DevicesResponse>("/mina/devices", { method: "GET" });
    return flattenDevices(res.data || []);
  } catch (_) {
    return [];
  }
}

export { };
