/**
 * Casting to a speaker plays the persistent「播客」playlist itself.
 *
 * 「播客」is the real playback queue, so a cast moves the chosen episode to the
 * front of that same playlist and then asks MIoT to play it from index 0 in
 * order. No separate「播客投放」snapshot table is created or refilled: failures
 * and concurrency never create a spare table either.
 *
 * The playlist is identified only by the id this plugin saved
 * (`settings.podcastPlaylistId`, via `getWaitlistId`), never by name.
 * Historical snapshot tables and old ledger rows are listed for manual
 * cleanup only; they are never auto-deleted or claimed by name, and the
 * 「播客」playlist itself is never deleted by cleanup.
 */

import {
  type CastLedger,
  CAST_SHARED_TABLE_DISCLAIMER,
  CLEANUP_DISCLAIMER,
  loadCastLedger,
  removeLeftover,
  saveCastLedger,
  uniqueSongIds,
  withPlaylist,
} from "./castLedger";
import { playAttemptFromUnknown } from "./httpDeadline";
import {
  isSnapshotPlaylistName,
  SNAPSHOT_NAME_PREFIX,
  type SnapshotKind,
  type SnapshotPlaylistsApi,
} from "./castSnapshot";

export { CAST_SHARED_TABLE_DISCLAIMER, CLEANUP_DISCLAIMER, SNAPSHOT_NAME_PREFIX };
export type PlayerState = {
  playlistId: number;
  state: string;
};

export type DeviceTarget = {
  accountId: string;
  deviceId: string;
  deviceName: string;
  online: boolean;
};

export type MiotGroup = {
  id: string;
  name: string;
  members: Array<{ accountId: string; deviceId: string }>;
};

export type PlaylistRef = {
  playlistId: number;
  accountId: string;
  deviceId: string;
  state: string;
  targetKey: string;
};

export type RefScan = {
  refs: PlaylistRef[];
  incomplete: boolean;
};

export type PlayAttempt = {
  ok: boolean;
  error?: string;
  playIssued: boolean;
  uncertain: boolean;
};

export type CastExecInput = {
  songIds: number[];
  kind: SnapshotKind;
  deviceId?: string;
  /** Kept for API compatibility; a cast always starts at the front (index 0). */
  startIndex?: number;
  songId?: number;
  playMode?: string;
};

export type CastExecResult = {
  ok: boolean;
  reason?: string;
  error?: string;
  warning?: string;
  /** The persistent「播客」playlist id the speaker was asked to play. */
  playlistId?: number;
  playlistName?: string;
  songIds?: number[];
  count?: number;
  /** True when the playlist order was changed (target moved to the front). */
  orderChanged?: boolean;
  deviceId?: string;
  deviceName?: string;
  accountId?: string;
  online?: boolean;
  targetKey?: string;
  playIssued?: boolean;
  uncertain?: boolean;
  generation?: number;
};

export type CleanupItem = {
  playlistId: number;
  name: string;
  source: "ledger" | "legacy-name";
  targetKey?: string;
  role?: "current" | "idle";
  trust?: "ours" | "external";
  playIssued?: boolean;
  kind?: SnapshotKind;
};

export type FrontMove = {
  playlistId: number;
  playlistName: string;
  songIds: number[];
  moved: boolean;
};

export type CastSlotRuntime = {
  playlists: SnapshotPlaylistsApi;
  /** The plugin's own saved「播客」playlist id (null when it was never created). */
  getWaitlistId(): Promise<number | null>;
  listDevices(): Promise<{
    ok: boolean;
    reason?: string;
    error?: string;
    devices: DeviceTarget[];
  }>;
  pickTarget(devices: DeviceTarget[], requestedId?: string): DeviceTarget | null;
  listGroups(): Promise<MiotGroup[] | null>;
  playerStatus(accountId: string, deviceId: string): Promise<PlayerState | null>;
  /** Move one episode to the front of the saved「播客」playlist. */
  moveToFront?(songId: number, playlistId: number): Promise<FrontMove>;
  play(
    playlistId: number,
    target: DeviceTarget,
    opts: { startIndex?: number; songId?: number; playMode?: string }
  ): Promise<PlayAttempt>;
};

let queueTail: Promise<unknown> = Promise.resolve();
let inflight: { key: string; promise: Promise<CastExecResult> } | null = null;

export function __resetCastLocksForTests(): void {
  queueTail = Promise.resolve();
  inflight = null;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(fn, fn);
  queueTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
export function parseMiotGroups(body: unknown): MiotGroup[] {
  const raw = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)
      ? ((body as { data: unknown[] }).data)
      : [];
  const out: MiotGroup[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = String(rec.id ?? rec.group_id ?? rec.groupId ?? "").trim();
    if (!id) continue;
    const name = String(rec.name ?? rec.title ?? "").trim() || `分组 ${id}`;
    const membersRaw = Array.isArray(rec.members) ? rec.members : [];
    const members: Array<{ accountId: string; deviceId: string }> = [];
    for (const member of membersRaw) {
      if (!member || typeof member !== "object") continue;
      const m = member as Record<string, unknown>;
      const deviceId = String(m.device_id || m.deviceId || m.deviceID || m.id || "").trim();
      if (!deviceId) continue;
      members.push({
        accountId: String(m.account_id || m.accountId || "").trim(),
        deviceId,
      });
    }
    if (!members.length) continue;
    out.push({ id, name, members });
  }
  return out;
}

export function parsePlayerStatus(body: unknown): PlayerState {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const playlistId = Number(nested.playlist_id ?? nested.playlistId ?? 0);
  const state = String(nested.state || "").trim().toLowerCase();
  return {
    playlistId: Number.isFinite(playlistId) && playlistId > 0 ? Math.round(playlistId) : 0,
    state,
  };
}

export function isActivePlayback(status: PlayerState | null | undefined): boolean {
  if (!status) return false;
  return status.state === "playing" || status.state === "paused";
}

/** Any persisted playlist id may be used for later restore. */
export function isRestorableRef(status: PlayerState | null | undefined): boolean {
  return !!(status && status.playlistId > 0);
}

export function isInUseByStatus(
  status: PlayerState | null | undefined,
  playlistId: number
): boolean {
  if (!status || !playlistId) return false;
  if (status.playlistId !== playlistId) return false;
  return isActivePlayback(status) || isRestorableRef(status);
}

export function executionKeyFor(
  target: DeviceTarget,
  groups: MiotGroup[] | null
): { key: string; label: string; group: MiotGroup | null; groupsKnown: boolean } {
  const deviceKey = `device:${target.accountId}:${target.deviceId}`;
  const deviceLabel = target.deviceName || target.deviceId;
  if (!groups) {
    return { key: deviceKey, label: deviceLabel, group: null, groupsKnown: false };
  }
  const group = groups.find((g) =>
    g.members.some(
      (m) => m.deviceId === target.deviceId && (!m.accountId || m.accountId === target.accountId)
    )
  );
  if (group) {
    return {
      key: `group:${group.id}`,
      label: group.name || `分组 ${group.id}`,
      group,
      groupsKnown: true,
    };
  }
  return { key: deviceKey, label: deviceLabel, group: null, groupsKnown: true };
}

export function keyForDevice(
  accountId: string,
  deviceId: string,
  groups: MiotGroup[] | null
): string {
  return executionKeyFor(
    { accountId, deviceId, deviceName: deviceId, online: true },
    groups
  ).key;
}
export async function scanPlaylistRefs(
  runtime: Pick<CastSlotRuntime, "playerStatus">,
  devices: DeviceTarget[],
  groups: MiotGroup[] | null
): Promise<RefScan> {
  const seen = new Map<string, DeviceTarget>();
  for (const d of devices) {
    const id = `${d.accountId}:${d.deviceId}`;
    if (d.deviceId) seen.set(id, d);
  }
  if (groups) {
    for (const group of groups) {
      for (const m of group.members) {
        const id = `${m.accountId}:${m.deviceId}`;
        if (!m.deviceId || seen.has(id)) continue;
        seen.set(id, {
          accountId: m.accountId,
          deviceId: m.deviceId,
          deviceName: m.deviceId,
          online: true,
        });
      }
    }
  }
  const refs: PlaylistRef[] = [];
  let incomplete = groups == null;
  const jobs = [...seen.values()].map(async (device) => {
    const status = await runtime.playerStatus(device.accountId, device.deviceId);
    if (!status) {
      incomplete = true;
      return;
    }
    if (!status.playlistId) return;
    refs.push({
      playlistId: status.playlistId,
      accountId: device.accountId,
      deviceId: device.deviceId,
      state: status.state,
      targetKey: keyForDevice(device.accountId, device.deviceId, groups),
    });
  });
  await Promise.all(jobs);
  return { refs, incomplete };
}

function refsToPlaylist(scan: RefScan, playlistId: number): PlaylistRef[] {
  return scan.refs.filter((r) => r.playlistId === playlistId);
}

async function readPlaylistMeta(
  api: SnapshotPlaylistsApi,
  playlistId: number
): Promise<{ id: number; name: string; description: string; songIds: number[] } | null> {
  const listed = ((await api.list()) || []).find((p) => p.id === playlistId);
  let row = listed || null;
  if (!row && typeof api.getById === "function") {
    row = (await api.getById(playlistId)) || null;
  }
  if (!row) return null;
  let songIds: number[] = [];
  if (typeof api.getSongs === "function") {
    const songs = (await api.getSongs(playlistId)) || [];
    songIds = uniqueSongIds(songs.map((s) => Number(s && s.id)));
  }
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : "",
    songIds,
  };
}

/**
 * Move `songId` to index 0 of the persistent「播客」playlist.
 *
 * An episode that is already first is left untouched (no needless reorder).
 * A missing episode is added, then reordered to the front — this is the only
 * write a cast performs on the playlist. `appendToPodcastQueue` still appends.
 */
export async function moveEpisodeToFront(
  api: SnapshotPlaylistsApi,
  playlistId: number,
  playlistName: string,
  songId: number
): Promise<FrontMove> {
  const id = Number(songId);
  const readIds = async (): Promise<number[]> => {
    if (typeof api.getSongs !== "function") return [];
    const songs = (await api.getSongs(playlistId)) || [];
    return uniqueSongIds(songs.map((s) => Number(s && s.id)));
  };
  const current = await readIds();
  if (!Number.isFinite(id) || id <= 0) {
    return { playlistId, playlistName, songIds: current, moved: false };
  }
  if (current[0] === id) {
    return { playlistId, playlistName, songIds: current, moved: false };
  }
  let ids = current;
  if (!current.includes(id)) {
    await api.addSongs(playlistId, [id]);
    ids = await readIds();
    if (!ids.includes(id)) {
      return { playlistId, playlistName, songIds: ids, moved: false };
    }
  }
  const next = [id, ...ids.filter((x) => x !== id)];
  if (typeof api.reorder !== "function") {
    throw new Error("宿主不支持调整歌单顺序，无法把这一集移到「播客」第一位");
  }
  await api.reorder(playlistId, next);
  return { playlistId, playlistName, songIds: next, moved: true };
}

function fail(
  partial: Partial<CastExecResult> & { error: string; reason?: string }
): CastExecResult {
  return { ok: false, reason: partial.reason || "cast_failed", warning: CAST_SHARED_TABLE_DISCLAIMER, ...partial };
}

async function persist(ledger: CastLedger): Promise<CastLedger> {
  return saveCastLedger(ledger);
}

async function deletePlaylistSafe(
  api: SnapshotPlaylistsApi,
  playlistId: number,
  podcastPlaylistId: number | null
): Promise<boolean> {
  if (!playlistId || (podcastPlaylistId && playlistId === podcastPlaylistId)) return false;
  try {
    await api.delete(playlistId);
    return true;
  } catch {
    return false;
  }
}
function mergeWarning(extra: string[]): string {
  const parts = [CAST_SHARED_TABLE_DISCLAIMER, ...extra.filter(Boolean)];
  return parts.join("；");
}

async function runCast(runtime: CastSlotRuntime, input: CastExecInput): Promise<CastExecResult> {
  const songIds = uniqueSongIds(input.songIds);
  if (!songIds.length) {
    return fail({ error: input.kind === "list" ? "「播客」列表为空" : "没有可投放的单集" });
  }

  const devicesRes = await runtime.listDevices();
  if (!devicesRes.ok) {
    return fail({
      reason: devicesRes.reason || "miot_unavailable",
      error: devicesRes.error || "无法连接智能音箱插件",
    });
  }
  const target = runtime.pickTarget(devicesRes.devices, input.deviceId);
  if (!target) {
    return fail({ reason: "miot_no_device", error: "没有可选的音箱设备" });
  }
  if (!target.online) {
    return fail({
      reason: "miot_device_offline",
      error: `音箱「${target.deviceName}」当前离线，请先唤醒或检查电源与网络后重试`,
      deviceId: target.deviceId,
      deviceName: target.deviceName,
      accountId: target.accountId,
      online: false,
    });
  }

  // Only the id this plugin saved identifies「播客」. Never claim by name, and
  // never create a table here: a cast must not invent a playlist.
  const podcastPlaylistId = await runtime.getWaitlistId();
  const exists =
    podcastPlaylistId && typeof podcastPlaylistId === "number"
      ? await readPlaylistMeta(runtime.playlists, podcastPlaylistId)
      : null;
  if (!podcastPlaylistId || !exists) {
    return fail({
      reason: "no_podcast_playlist",
      error: "找不到插件保存的「播客」歌单（可能已被删除）。请先加入任意一集以重建歌单，再投放。",
      deviceId: target.deviceId,
      deviceName: target.deviceName,
      accountId: target.accountId,
      online: target.online,
    });
  }

  const groups = await runtime.listGroups();
  const exec = executionKeyFor(target, groups);
  const extras: string[] = [];
  if (!exec.groupsKnown) {
    extras.push("未能确认设备分组，同一分组里的其他音箱可能共用播放队列");
  }
  const warning = mergeWarning(extras);

  // Ledger generation is only a historical counter now; a cast no longer writes
  // to any ledger record, so it just reports the current value.
  const generation = (await loadCastLedger()).generation || 0;
  const requested = Number(input.songId);
  const targetSongId =
    Number.isFinite(requested) && requested > 0 && songIds.includes(requested)
      ? requested
      : songIds[0];

  let move: FrontMove;
  try {
    const moved = runtime.moveToFront
      ? await runtime.moveToFront(targetSongId, podcastPlaylistId)
      : await moveEpisodeToFront(
          runtime.playlists,
          podcastPlaylistId,
          exists.name,
          targetSongId
        );
    move = moved;
  } catch (e) {
    return fail({
      reason: "cast_failed",
      error: `无法把这一集移到「播客」列表第一位：${String(
        (e as Error)?.message ?? e ?? "调整顺序失败"
      )}。未向音箱发出播放请求。`,
      playlistId: podcastPlaylistId,
      playlistName: exists.name,
      deviceId: target.deviceId,
      deviceName: target.deviceName,
      accountId: target.accountId,
      online: target.online,
      targetKey: exec.key,
      playIssued: false,
      uncertain: false,
      generation,
      warning,
    });
  }

  const count = move.songIds.length || songIds.length;
  const base = {
    playlistId: podcastPlaylistId,
    playlistName: move.playlistName || exists.name,
    songIds: move.songIds.length ? move.songIds : songIds,
    count,
    orderChanged: move.moved,
    deviceId: target.deviceId,
    deviceName: target.deviceName,
    accountId: target.accountId,
    online: target.online,
    targetKey: exec.key,
    generation,
    warning,
  };

  let attempt: PlayAttempt;
  try {
    attempt = await runtime.play(podcastPlaylistId, target, {
      startIndex: 0,
      songId: targetSongId,
      playMode: input.playMode || "order",
    });
  } catch (e) {
    attempt = playAttemptFromUnknown(e);
  }

  if (attempt.uncertain) {
    return {
      ok: false,
      reason: "cast_failed",
      error: `已向音箱发出播放请求，但结果不明确：${
        attempt.error || "请在智能音箱插件里确认当前播放"
      }。「播客」列表顺序已调整为从这一集开始（这一步在播放请求之前完成）。不能保证音箱仍在播原来的队列。`,
      ...base,
      playIssued: true,
      uncertain: true,
    };
  }

  if (!attempt.ok) {
    const orderNote = move.moved
      ? "「播客」列表顺序已调整为从这一集开始（这一步在播放请求之前完成），但"
      : "「播客」列表顺序未改变，但";
    if (!attempt.playIssued) {
      return fail({
        error: `播放请求未能发出：${attempt.error || "投放失败"}。${orderNote}不能保证音箱上的原队列可以恢复。`,
        ...base,
        playIssued: false,
        uncertain: false,
      });
    }
    return fail({
      error: `${attempt.error || "音箱拒绝播放"}。${orderNote}不能保证音箱上的原队列可以恢复。`,
      ...base,
      playIssued: true,
      uncertain: false,
    });
  }

  return { ok: true, ...base, playIssued: true, uncertain: false };
}

export async function executeCastToSpeaker(
  runtime: CastSlotRuntime,
  input: CastExecInput
): Promise<CastExecResult> {
  const songIds = uniqueSongIds(input.songIds);
  if (!songIds.length) {
    return fail({ error: input.kind === "list" ? "「播客」列表为空" : "没有可投放的单集" });
  }
  const targetSongId = input.songId || songIds[0];
  const joinKey = [String(input.deviceId || "").trim(), String(targetSongId)].join("::");

  if (inflight && inflight.key === joinKey) {
    return inflight.promise;
  }

  const promise = enqueue(async () => {
    if (inflight && inflight.key === joinKey && inflight.promise !== promise) {
      return inflight.promise;
    }
    try {
      return await runCast(runtime, { ...input, songIds });
    } finally {
      if (inflight && inflight.promise === promise) inflight = null;
    }
  });
  inflight = { key: joinKey, promise };
  return promise;
}
export async function listCastCleanupCandidates(
  runtime: Pick<CastSlotRuntime, "playlists" | "getWaitlistId">
): Promise<{ items: CleanupItem[]; disclaimer: string }> {
  const podcastPlaylistId = await runtime.getWaitlistId();
  const ledger = await loadCastLedger();
  const listed = (await runtime.playlists.list()) || [];
  const items: CleanupItem[] = [];
  const seen = new Set<number>();

  const pushItem = (item: CleanupItem) => {
    if (!item.playlistId || seen.has(item.playlistId)) return;
    // Never offer the real「播客」queue for cleanup.
    if (podcastPlaylistId && item.playlistId === podcastPlaylistId) return;
    items.push(item);
    seen.add(item.playlistId);
  };

  // The formerly used cast table is no longer the current one; it belongs to
  // manual cleanup like any other historical table.
  if (ledger.playlist) {
    const record = ledger.playlist;
    const listedRow = listed.find((p) => p.id === record.playlistId);
    pushItem({
      playlistId: record.playlistId,
      name: listedRow?.name || record.name,
      source: "ledger",
      targetKey: record.lastTargetKey,
      trust: record.trust,
      playIssued: record.playIssued,
      kind: record.kind,
    });
  }

  for (const row of ledger.leftovers) {
    const listedRow = listed.find((p) => p.id === row.playlistId);
    pushItem({
      playlistId: row.playlistId,
      name: listedRow?.name || row.name,
      source: row.source === "legacy-name" ? "legacy-name" : "ledger",
      targetKey: row.targetKey,
      role: row.role,
      trust: row.trust,
      playIssued: row.playIssued,
      kind: row.kind,
    });
  }

  for (const row of listed) {
    if (podcastPlaylistId && row.id === podcastPlaylistId) continue;
    if (seen.has(row.id)) continue;
    if (!isSnapshotPlaylistName(row.name)) continue;
    pushItem({
      playlistId: row.id,
      name: row.name,
      source: "legacy-name",
    });
  }

  items.sort((a, b) => a.playlistId - b.playlistId);
  return { items, disclaimer: CLEANUP_DISCLAIMER };
}

export async function cleanupConfirmedCastPlaylists(
  runtime: CastSlotRuntime,
  playlistIds: number[],
  confirmed: boolean
): Promise<{
  ok: boolean;
  error?: string;
  deleted: number[];
  skipped: Array<{ playlistId: number; reason: string }>;
  disclaimer: string;
}> {
  if (!confirmed) {
    return {
      ok: false,
      error: "清理投放表需要先确认后果",
      deleted: [],
      skipped: [],
      disclaimer: CLEANUP_DISCLAIMER,
    };
  }
  const ids = uniqueSongIds(playlistIds);
  const podcastPlaylistId = await runtime.getWaitlistId();
  const devicesRes = await runtime.listDevices().catch(() => ({ ok: false, devices: [] as DeviceTarget[] }));
  const groups = await runtime.listGroups().catch(() => null);
  const scan = await scanPlaylistRefs(runtime, devicesRes.devices || [], groups);
  let ledger = await loadCastLedger();
  const deleted: number[] = [];
  const skipped: Array<{ playlistId: number; reason: string }> = [];

  for (const id of ids) {
    if (podcastPlaylistId && id === podcastPlaylistId) {
      skipped.push({ playlistId: id, reason: "「播客」歌单不会被清理" });
      continue;
    }
    const hits = refsToPlaylist(scan, id);
    if (hits.some((r) => isActivePlayback(r) || isRestorableRef({ playlistId: r.playlistId, state: r.state }))) {
      skipped.push({ playlistId: id, reason: "检测到仍被音箱引用，未删除" });
      continue;
    }
    const ok = await deletePlaylistSafe(runtime.playlists, id, podcastPlaylistId);
    if (!ok) {
      skipped.push({ playlistId: id, reason: "删除失败或不存在" });
      continue;
    }
    ledger = removeLeftover(ledger, id);
    if (ledger.playlist && ledger.playlist.playlistId === id) {
      ledger = withPlaylist(ledger, null);
    }
    deleted.push(id);
  }
  await persist(ledger);
  return { ok: true, deleted, skipped, disclaimer: CLEANUP_DISCLAIMER };
}
