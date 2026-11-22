import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { uiConfirm, host, queuePlayFront } = vi.hoisted(() => {
  const uiConfirm = vi.fn(async () => true);
  const queuePlayFront = vi.fn(async (songId: number) => ({ ok: true, moved: false, songIds: [] }));
  const host = {
    hasSetQueue: vi.fn(() => true),
    getState: vi.fn(async () => ({ is_playing: false, queue: [] })),
    play: vi.fn(async () => {}),
    replaceQueueAndPlay: vi.fn(async () => {}),
    setPlayMode: vi.fn(async () => {}),
    seek: vi.fn(async () => {}),
  };
  return { uiConfirm, host, queuePlayFront };
});

vi.mock("../ui/lib/toast.js", () => ({ toast: vi.fn(), clearToast: vi.fn() }));
vi.mock("../ui/lib/modal.js", () => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  uiConfirm: (...args: unknown[]) => uiConfirm(...args),
  closePopovers: vi.fn(),
}));
vi.mock("../ui/lib/host.js", () => host);
vi.mock("../ui/lib/api.js", () => ({
  api: {
    prepare: vi.fn(),
    saveProgress: vi.fn(async () => ({ ok: true })),
    recordHistory: vi.fn(async () => ({ ok: true })),
    queueReorder: vi.fn(),
    queuePlayFront: (...args: [number]) => queuePlayFront(...args),
    queue: vi.fn(),
  },
}));

import { getData, patch } from "../ui/lib/store.js";
import {
  ensureSequentialPlayMode,
  onQueueViewChange,
  playEpisode,
  playFrontTargetIsFirst,
  replaceQueueAndPlay,
  setCapabilities,
} from "../ui/lib/actions.js";

const SONGS = [
  { id: 11, title: "one", feedUrl: "https://ex/1", guid: "g1" },
  { id: 12, title: "two", feedUrl: "https://ex/2", guid: "g2" },
  { id: 13, title: "three", feedUrl: "https://ex/3", guid: "g3" },
];

function idleState(extra: Record<string, unknown> = {}) {
  return { is_playing: false, queue: [], ...extra };
}

function playingState(songId: number, extra: Record<string, unknown> = {}) {
  return {
    is_playing: true,
    current_song: { id: songId },
    current_time: 0,
    duration: 60,
    queue: [songId],
    ...extra,
  };
}

describe("playEpisode starts from the front of「播客」", () => {
  beforeEach(() => {
    const doc = globalThis as typeof globalThis & { document?: { querySelector: (s: string) => null } };
    if (!doc.document || typeof doc.document.querySelector !== "function") {
      doc.document = { querySelector: () => null };
    }
    vi.clearAllMocks();
    uiConfirm.mockResolvedValue(true);
    host.hasSetQueue.mockReturnValue(true);
    host.getState.mockResolvedValue(idleState({ play_mode: "order" }));
    host.replaceQueueAndPlay.mockResolvedValue(undefined);
    host.setPlayMode.mockResolvedValue(undefined);
    queuePlayFront.mockImplementation(async (songId: number) => {
      const others = SONGS.map((s) => s.id).filter((id) => id !== Number(songId));
      return { ok: true, moved: true, playlistId: 8, playlistName: "播客", songIds: [Number(songId), ...others] };
    });
    setCapabilities({ available: true, hasPlayer: true });
    patch({ queueSongs: SONGS.map((s) => ({ ...s })), queueMeta: { playlistId: 8, playlistName: "播客" } });
  });

  afterEach(async () => {
    // Let a background play-front persist (and its finally) settle between tests.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("moves the tapped episode to the front, then setQueue at index 0 in order mode", async () => {
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(12, { play_mode: "order", queue: [12, 11, 13], current_index: 0 }));

    await playEpisode(
      { songId: 12, title: "two", feedUrl: "https://ex/2", guid: "g2", showTitle: "Show" },
      { fromWaitlist: true }
    );
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(12));

    expect(host.replaceQueueAndPlay).toHaveBeenCalledTimes(1);
    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([12, 11, 13], 0, { sourcePlaylistId: 8 });
    expect(host.replaceQueueAndPlay.mock.invocationCallOrder[0]).toBeLessThan(
      queuePlayFront.mock.invocationCallOrder[0]
    );
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([12, 11, 13]);
    expect(host.setPlayMode).toHaveBeenCalledWith("order");
    expect(host.setPlayMode).not.toHaveBeenCalledWith("autoAdvance");
    expect(host.play).not.toHaveBeenCalled();
  });

  it("behaves the same for a row outside the list (no single-episode fallback)", async () => {
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(99, { queue: [99, 11, 12, 13], current_index: 0 }));

    await playEpisode({ songId: 99, title: "new", feedUrl: "https://ex/9", guid: "g9" });
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(99));

    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([99, 11, 12, 13], 0, {
      sourcePlaylistId: 8,
    });
    expect(getData().queueSongs.map((s: { id: number }) => s.id)[0]).toBe(99);
  });

  it("does not reorder or play when the user declines single play mode", async () => {
    uiConfirm.mockResolvedValue(false);
    host.getState.mockResolvedValue(idleState({ play_mode: "single" }));

    await playEpisode({ songId: 11, title: "one" }, { fromWaitlist: true });

    expect(uiConfirm).toHaveBeenCalled();
    expect(queuePlayFront).not.toHaveBeenCalled();
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
    expect(host.setPlayMode).not.toHaveBeenCalled();
  });

  it("switches single mode to order before moving the episode and playing", async () => {
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "single" }))
      .mockResolvedValueOnce(idleState({ play_mode: "single" }))
      .mockResolvedValue(playingState(13, { play_mode: "order", queue: [13, 11, 12], current_index: 0 }));

    await playEpisode({ songId: 13, title: "three" }, { fromWaitlist: true });

    expect(uiConfirm).toHaveBeenCalled();
    expect(host.setPlayMode).toHaveBeenCalledWith("order");
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(13));
    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([13, 11, 12], 0, {
      sourcePlaylistId: 8,
    });
  });

  it("does not move or play when the replacement confirm is cancelled", async () => {
    // First confirm (replace) declines → nothing may change.
    uiConfirm.mockResolvedValueOnce(false);
    host.getState.mockResolvedValue(playingState(11, { queue: [11], current_index: 0 }));

    await playEpisode({ songId: 12, title: "two" });

    expect(queuePlayFront).not.toHaveBeenCalled();
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
    expect(host.play).not.toHaveBeenCalled();
  });

  it("resumes a paused episode that is already first without rebuilding the queue", async () => {
    host.getState.mockResolvedValue({
      is_playing: false,
      current_song: { id: 12 },
      current_time: 30,
      queue: [12, 11, 13],
      current_index: 0,
      source_playlist_id: 8,
    });

    await playEpisode({ songId: 12, title: "two" });

    expect(host.play).toHaveBeenCalled();
    expect(queuePlayFront).not.toHaveBeenCalled();
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
  });

  it("does not restart an episode that is first and already playing", async () => {
    host.getState.mockResolvedValue({
      is_playing: true,
      current_song: { id: 12 },
      current_time: 30,
      queue: [12, 11, 13],
      current_index: 0,
      source_playlist_id: 8,
    });

    await playEpisode({ songId: 12, title: "two" });

    expect(host.play).not.toHaveBeenCalled();
    expect(queuePlayFront).not.toHaveBeenCalled();
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
  });

  it("re-anchors the same episode to the front when it is not row 0", async () => {
    host.getState
      .mockResolvedValueOnce({
        is_playing: true,
        current_song: { id: 12 },
        queue: [11, 12, 13],
        current_index: 1,
        source_playlist_id: 8,
      })
      .mockResolvedValue(playingState(12, { queue: [12, 11, 13], current_index: 0 }));

    await playEpisode({ songId: 12, title: "two" });

    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(12));
    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([12, 11, 13], 0, {
      sourcePlaylistId: 8,
    });
  });

  it("define ensureSequentialPlayMode and keep replace-from-start on order", async () => {
    expect(typeof ensureSequentialPlayMode).toBe("function");
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(11, { queue: [11, 12, 13] }));

    await replaceQueueAndPlay();

    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([11, 12, 13], 0, {
      sourcePlaylistId: 8,
    });
    expect(host.setPlayMode).toHaveBeenCalledWith("order");
    expect(host.setPlayMode).not.toHaveBeenCalledWith("autoAdvance");
  });

  it("does not throw if host state cannot be read before setQueue", async () => {
    host.getState
      .mockRejectedValueOnce(new Error("no state"))
      .mockRejectedValueOnce(new Error("no state"))
      .mockResolvedValue(playingState(11));

    await playEpisode({ songId: 11, title: "one" }, { fromWaitlist: true });

    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([11, 12, 13], 0, {
      sourcePlaylistId: 8,
    });
    expect(host.setPlayMode).toHaveBeenCalledWith("order");
  });

  it("says the list order may already have changed when setQueue throws", async () => {
    const { toast } = await import("../ui/lib/toast.js");
    host.getState.mockResolvedValue(idleState({ play_mode: "order" }));
    host.replaceQueueAndPlay.mockRejectedValueOnce(new Error("setQueue rejected"));

    await playEpisode({ songId: 12, title: "two" });
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(12));

    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([12, 11, 13]);
    const messages = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0])
    );
    expect(messages.some((m) => m.includes("播放请求失败") && m.includes("提前放到第一位"))).toBe(true);
  });

  it("never falls back to play(id) when setQueue is unavailable", async () => {
    host.hasSetQueue.mockReturnValue(false);

    await playEpisode({ songId: 12, title: "two" });

    expect(host.play).not.toHaveBeenCalled();
    expect(queuePlayFront).not.toHaveBeenCalled();
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
  });

  it("starts setQueue without waiting for play-front to finish", async () => {
    let releaseFront: (value?: unknown) => void = () => {};
    const frontGate = new Promise((resolve) => {
      releaseFront = resolve;
    });
    queuePlayFront.mockImplementation(async (songId: number) => {
      await frontGate;
      return {
        ok: true,
        moved: true,
        playlistId: 8,
        playlistName: "播客",
        songIds: [Number(songId), 11, 13],
      };
    });
    host.replaceQueueAndPlay.mockImplementation(async () => {
      expect(queuePlayFront).not.toHaveBeenCalled();
    });
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(12, { play_mode: "order", queue: [12, 11, 13], current_index: 0 }));

    const done = playEpisode({ songId: 12, title: "two", feedUrl: "https://ex/2", guid: "g2" });
    await vi.waitFor(() => expect(host.replaceQueueAndPlay).toHaveBeenCalledTimes(1));
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([12, 11, 13]);

    // Playback can finish while the write is still in flight.
    await done;
    expect(queuePlayFront).toHaveBeenCalledWith(12);
    expect(host.replaceQueueAndPlay.mock.invocationCallOrder[0]).toBeLessThan(
      queuePlayFront.mock.invocationCallOrder[0]
    );

    releaseFront();
    await vi.waitFor(() => expect(queuePlayFront).toHaveReturned());
  });

  it("keeps the optimistic pin when play-front returns the old order", async () => {
    const { toast } = await import("../ui/lib/toast.js");
    queuePlayFront.mockResolvedValue({
      ok: true,
      moved: false,
      playlistId: 8,
      playlistName: "播客",
      songIds: [11, 12, 13],
    });
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(12, { play_mode: "order", queue: [12, 11, 13], current_index: 0 }));

    await playEpisode({ songId: 12, title: "two" });
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(12));

    expect(host.replaceQueueAndPlay).toHaveBeenCalledWith([12, 11, 13], 0, { sourcePlaylistId: 8 });
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([12, 11, 13]);
    const messages = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0])
    );
    expect(messages.some((m) => m.includes("未能把这一集写到「播客」列表第一位"))).toBe(true);
  });

  it("keeps the optimistic pin when play-front throws", async () => {
    const { toast } = await import("../ui/lib/toast.js");
    queuePlayFront.mockRejectedValue(new Error("write failed"));
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(12, { play_mode: "order", queue: [12, 11, 13], current_index: 0 }));

    await playEpisode({ songId: 12, title: "two" });
    await vi.waitFor(() => expect(queuePlayFront).toHaveBeenCalledWith(12));

    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([12, 11, 13]);
    const messages = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0])
    );
    expect(messages.some((m) => m.includes("未能把这一集写到「播客」列表第一位"))).toBe(true);
  });

  it("re-renders the queue panel when the optimistic pin lands", async () => {
    const views: number[][] = [];
    const stop = onQueueViewChange(() => {
      views.push(getData().queueSongs.map((s: { id: number }) => s.id));
    });
    host.getState
      .mockResolvedValueOnce(idleState({ play_mode: "order" }))
      .mockResolvedValue(playingState(12, { play_mode: "order", queue: [12, 11, 13], current_index: 0 }));

    await playEpisode({ songId: 12, title: "two" });
    stop();

    expect(views.some((v) => v[0] === 12 && v.length === 3)).toBe(true);
    expect(host.replaceQueueAndPlay).toHaveBeenCalled();
  });

  it("playFrontTargetIsFirst rejects a list that does not start with the target", () => {
    expect(playFrontTargetIsFirst({ ok: true, songIds: [12, 11, 13] }, 12)).toBe(true);
    expect(playFrontTargetIsFirst({ ok: true, songIds: [11, 12, 13] }, 12)).toBe(false);
    expect(playFrontTargetIsFirst({ ok: false, songIds: [12] }, 12)).toBe(false);
    expect(playFrontTargetIsFirst({ ok: true, songIds: [] }, 12)).toBe(false);
  });
});
