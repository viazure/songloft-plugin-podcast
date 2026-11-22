import { afterEach, describe, expect, it, vi } from "vitest";
import { playPlaylistOnDevice } from "../src/castMiot";

const target = { accountId: "acc1", deviceId: "dev1", deviceName: "客厅", online: true };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("playPlaylistOnDevice compatibility", () => {
  const originalAbort = globalThis.AbortController;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (originalAbort) {
      (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController = originalAbort;
    } else {
      delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    }
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("plays successfully when AbortController is not defined", async () => {
    delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    (globalThis as unknown as { songloft: unknown }).songloft = {
      plugin: {
        getHostUrl: async () => "http://127.0.0.1:58091",
        getToken: async () => "tkn",
      },
    };
    const fetchSpy = vi.fn(async () => jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await playPlaylistOnDevice(12, target);
    expect(result).toEqual({ ok: true, playIssued: true, uncertain: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/api/v1/jsplugin/miot/player/play");
  });

  it("keeps uncertain protection when the issued request times out", async () => {
    delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    (globalThis as unknown as { songloft: unknown }).songloft = {
      plugin: {
        getHostUrl: async () => "http://127.0.0.1:58091",
        getToken: async () => "tkn",
      },
    };
    vi.stubGlobal("fetch", () => new Promise(() => undefined));
    vi.useFakeTimers();
    const pending = playPlaylistOnDevice(12, target);
    await vi.advanceTimersByTimeAsync(8000);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result.playIssued).toBe(true);
    expect(result.uncertain).toBe(true);
    expect(result.error).toBe("请求超时");
  });
});