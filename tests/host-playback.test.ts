import { describe, expect, it, vi } from "vitest";

/**
 * Mirrors HostPlaybackAdapter:
 * play(id) must not call setQueue; replaceQueueAndPlay must use setQueue
 * and fail clearly when it is missing.
 */
function createAdapter(player: {
  play: (id?: number) => Promise<void>;
  setQueue?: (ids: number[], opts?: { startIndex?: number; sourcePlaylistId?: number }) => Promise<void>;
  addToQueue: (ids: number[]) => Promise<void>;
  setPlayMode?: (mode: string) => Promise<void>;
}) {
  function requireSetQueue() {
    if (typeof player.setQueue !== "function") {
      throw new Error("宿主不支持整表播放（请在 Songloft 客户端内打开本插件，或升级宿主）");
    }
    return player;
  }
  return {
    hasSetQueue() {
      return typeof player.setQueue === "function";
    },
    async play(songId?: number) {
      if (songId == null) return player.play();
      return player.play(Number(songId));
    },
    async replaceQueueAndPlay(
      songIds: number[],
      startIndex?: number,
      opts?: { sourcePlaylistId?: number }
    ) {
      const p = requireSetQueue();
      const options: { startIndex: number; sourcePlaylistId?: number } = {
        startIndex: startIndex == null ? 0 : Number(startIndex),
      };
      if (opts && opts.sourcePlaylistId != null) {
        options.sourcePlaylistId = Number(opts.sourcePlaylistId);
      }
      return p.setQueue!(songIds.map(Number), options);
    },
    async addToHostQueue(songIds: number[]) {
      return player.addToQueue(songIds.map(Number));
    },
    async setPlayMode(mode: string) {
      if (typeof player.setPlayMode !== "function") {
        throw new Error("宿主不支持切换播放模式");
      }
      return player.setPlayMode(mode);
    },
  };
}

describe("HostPlaybackAdapter play vs setQueue", () => {
  it("default play(id) never calls setQueue", async () => {
    const player = {
      play: vi.fn(async () => {}),
      setQueue: vi.fn(async () => {}),
      addToQueue: vi.fn(async () => {}),
    };
    const adapter = createAdapter(player);
    await adapter.play(42);
    expect(player.play).toHaveBeenCalledWith(42);
    expect(player.setQueue).not.toHaveBeenCalled();
  });

  it("replaceQueueAndPlay uses setQueue with startIndex and optional sourcePlaylistId", async () => {
    const player = {
      play: vi.fn(async () => {}),
      setQueue: vi.fn(async () => {}),
      addToQueue: vi.fn(async () => {}),
    };
    const adapter = createAdapter(player);
    await adapter.replaceQueueAndPlay([1, 2, 3], 2, { sourcePlaylistId: 15 });
    expect(player.setQueue).toHaveBeenCalledWith([1, 2, 3], { startIndex: 2, sourcePlaylistId: 15 });
    expect(player.play).not.toHaveBeenCalled();
    await adapter.replaceQueueAndPlay([9], 0);
    expect(player.setQueue).toHaveBeenLastCalledWith([9], { startIndex: 0 });
  });

  it("replaceQueueAndPlay fails clearly when setQueue is missing", async () => {
    const player = {
      play: vi.fn(async () => {}),
      addToQueue: vi.fn(async () => {}),
    };
    const adapter = createAdapter(player);
    expect(adapter.hasSetQueue()).toBe(false);
    await expect(adapter.replaceQueueAndPlay([1, 2], 0)).rejects.toThrow(/宿主不支持整表播放/);
    expect(player.play).not.toHaveBeenCalled();
  });
});

describe("continue CTA gating", () => {
  function canShowContinue(snap: {
    progressCapable: boolean;
    positionSec: number;
    phase: string;
    current: { feedUrl?: string; guid?: string; guidSource?: string } | null;
  }) {
    const cur = snap.current;
    if (!cur) return false;
    if (!snap.progressCapable) return false;
    if (!(snap.positionSec > 5)) return false;
    if (snap.phase === "ended") return false;
    if (!cur.feedUrl || !cur.guid) return false;
    if (cur.guidSource === "enclosure") return false;
    return true;
  }

  it("requires progress capability and persistent identity", () => {
    expect(
      canShowContinue({
        progressCapable: true,
        positionSec: 30,
        phase: "paused",
        current: { feedUrl: "https://a/x", guid: "g1", guidSource: "rss" },
      })
    ).toBe(true);
    expect(
      canShowContinue({
        progressCapable: false,
        positionSec: 30,
        phase: "paused",
        current: { feedUrl: "https://a/x", guid: "g1", guidSource: "rss" },
      })
    ).toBe(false);
    expect(
      canShowContinue({
        progressCapable: true,
        positionSec: 30,
        phase: "paused",
        current: { feedUrl: "https://a/x", guid: "http://enc", guidSource: "enclosure" },
      })
    ).toBe(false);
  });
});
