import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * MIoT owns its own queue, so "play the whole list" must hand it a playlist id
 * via `POST /player/play` — pushing single streams (`/mina/play-url`) has no
 * next-track handling. These tests pin that route choice.
 */
const HOST_PLUGIN = {
  plugin: {
    getHostUrl: async () => "http://127.0.0.1:58091",
    getToken: async () => "tkn",
    getNetworkAddresses: async () => ["192.168.1.10"],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deviceBlock(devices: unknown[], selected?: string) {
  return {
    success: true,
    data: [{ account_id: "acc1", last_selected_device_id: selected || "", devices }],
  };
}

const ONLINE = { success: true, data: [{ account_id: "acc1", devices: [
  { deviceID: "dev1", name: "客厅音箱", presence: "online", managed: true },
] }] };

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as unknown as { songloft?: unknown }).songloft;
});

describe("castPlaylistToMiot", () => {
  it("rejects an invalid playlist id without network access", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { castPlaylistToMiot } = await import("../src/castMiot");
    const r = await castPlaylistToMiot(0);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("cast_failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the playlist id to /player/play instead of pushing a stream", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    const calls: Array<{ url: string; body?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), body: init?.body ? String(init.body) : undefined });
        if (String(url).endsWith("/mina/devices")) return jsonResponse(ONLINE);
        return jsonResponse({ success: true });
      })
    );

    const { castPlaylistToMiot } = await import("../src/castMiot");
    const r = await castPlaylistToMiot(2915);
    expect(r.ok).toBe(true);
    expect(r.playlistId).toBe(2915);

    const play = calls.find((c) => c.url.endsWith("/player/play"));
    expect(play).toBeTruthy();
    expect(calls.some((c) => c.url.endsWith("/mina/play-url"))).toBe(false);
    const body = JSON.parse(String(play!.body));
    expect(body).toMatchObject({ account_id: "acc1", device_id: "dev1", playlist_id: 2915 });
  });

  it("supports a start index", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    let sent: Record<string, unknown> | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith("/mina/devices")) return jsonResponse(ONLINE);
        sent = JSON.parse(String(init!.body));
        return jsonResponse({ success: true });
      })
    );
    const { castPlaylistToMiot } = await import("../src/castMiot");
    await castPlaylistToMiot(2915, { startIndex: 3 });
    expect(sent).toMatchObject({ playlist_id: 2915, start_index: 3 });
  });

  it("refuses to pretend it played on an offline speaker", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/mina/devices")) {
          return jsonResponse(
            deviceBlock([{ deviceID: "off", name: "离线音箱", presence: "offline" }])
          );
        }
        throw new Error("should not reach /player/play");
      })
    );
    const { castPlaylistToMiot } = await import("../src/castMiot");
    const r = await castPlaylistToMiot(2915);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("miot_device_offline");
  });

  it("maps a MIoT rejection to cast_failed with its message", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/mina/devices")) return jsonResponse(ONLINE);
        return jsonResponse({ success: false, error: "failed to start playlist" });
      })
    );
    const { castPlaylistToMiot } = await import("../src/castMiot");
    const r = await castPlaylistToMiot(2915);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("cast_failed");
    expect(r.error).toContain("failed to start playlist");
  });
});
