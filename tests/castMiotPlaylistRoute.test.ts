import { afterEach, describe, expect, it, vi } from "vitest";

const { listPodcastQueue, executeCastToSpeaker, appendLog } = vi.hoisted(() => ({
  listPodcastQueue: vi.fn(),
  executeCastToSpeaker: vi.fn(),
  appendLog: vi.fn(),
}));

vi.mock("../src/podcastQueue", () => ({
  listPodcastQueue,
  appendToPodcastQueue: vi.fn(),
  clearPodcastQueue: vi.fn(),
  moveInPodcastQueue: vi.fn(),
  moveToFrontInPodcastQueue: vi.fn(),
  removeFromPodcastQueue: vi.fn(),
  reorderPodcastQueue: vi.fn(),
}));

vi.mock("../src/castSlots", () => ({
  executeCastToSpeaker,
  listCastCleanupCandidates: vi.fn(),
  cleanupConfirmedCastPlaylists: vi.fn(),
}));

vi.mock("../src/castRuntime", () => ({
  buildHostCastRuntime: () => ({ kind: "host-runtime" }),
}));

vi.mock("../src/castMiot", () => ({
  isPodcastSong: vi.fn(),
  listMiotDevices: vi.fn(),
}));

vi.mock("../src/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/store")>();
  return { ...actual, appendLog };
});

import { handleHTTP } from "../src/router";
import type { HTTPRequest } from "@songloft/plugin-sdk";

function req(body: Record<string, unknown>, path = "/api/cast/miot-playlist"): HTTPRequest {
  return {
    method: "POST",
    path,
    headers: {},
    body: body as unknown as HTTPRequest["body"],
    query: "",
  };
}

function parse(res: { body?: string | Uint8Array }) {
  const raw = res.body;
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  return JSON.parse(text || "{}");
}

describe("POST /api/cast/miot-playlist", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("hands the queue and the target episode to the persistent-playlist runner", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = { playlists: {} };
    const ids = [11, 22, 33, 44];
    listPodcastQueue.mockResolvedValue({ songs: ids.map((id) => ({ id })), playlistId: 3 });
    executeCastToSpeaker.mockResolvedValue({
      ok: true,
      playlistId: 3,
      playlistName: "播客",
      count: 4,
      orderChanged: true,
      deviceId: "dev1",
      deviceName: "客厅",
    });

    const res = await handleHTTP(req({ songIds: ids, songId: 33 }));
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toMatchObject({ ok: true, count: 4, playlistId: 3 });

    expect(executeCastToSpeaker).toHaveBeenCalledTimes(1);
    const [runtime, input] = executeCastToSpeaker.mock.calls[0];
    expect(runtime).toMatchObject({ kind: "host-runtime" });
    expect(input.songIds).toEqual([11, 22, 33, 44]);
    // Always ordered from the front: the target is the anchor, not an index.
    expect(input).toMatchObject({ kind: "list", startIndex: 0, songId: 33, playMode: "order" });
  });

  it("falls back to the current queue ids when songIds are omitted", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = { playlists: {} };
    const ids = [11, 22, 33];
    listPodcastQueue.mockResolvedValue({ songs: ids.map((id) => ({ id })), playlistId: 3 });
    executeCastToSpeaker.mockResolvedValue({
      ok: true,
      playlistId: 3,
      playlistName: "播客",
      count: 3,
      deviceId: "dev1",
      deviceName: "客厅",
    });

    const res = await handleHTTP(req({ songId: 11 }));
    expect(parse(res).ok).toBe(true);
    expect(executeCastToSpeaker.mock.calls[0][1].songIds).toEqual(ids);
    expect(executeCastToSpeaker).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ startIndex: 0, songId: 11, playMode: "order", kind: "list" })
    );
  });

  it("explains an empty「播客」queue without calling it a separate listen-later list", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = { playlists: {} };
    listPodcastQueue.mockResolvedValue({ songs: [], playlistId: 3 });
    const res = await handleHTTP(req({}));
    expect(res.statusCode).toBe(400);
    const body = parse(res);
    expect(body.error).toContain("「播客」");
    expect(body.error).not.toContain("待听");
    expect(executeCastToSpeaker).not.toHaveBeenCalled();
  });
});

describe("POST /api/queue/play-front", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("rejects a missing songId", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = { playlists: {} };
    const res = await handleHTTP(req({}, "/api/queue/play-front"));
    expect(res.statusCode).toBe(400);
  });
});
