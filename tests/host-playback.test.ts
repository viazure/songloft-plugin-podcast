import { describe, expect, it, vi } from "vitest";

/**
 * Mirrors HostPlaybackAdapter default play path contract:
 * play(id) must not call setQueue; replaceQueueAndPlay is explicit.
 */
function createAdapter(player: {
  play: (id?: number) => Promise<void>;
  setQueue: (ids: number[], opts?: { startIndex?: number }) => Promise<void>;
  addToQueue: (ids: number[]) => Promise<void>;
}) {
  return {
    async play(songId?: number) {
      if (songId == null) return player.play();
      return player.play(Number(songId));
    },
    async replaceQueueAndPlay(songIds: number[], startIndex?: number) {
      return player.setQueue(songIds.map(Number), { startIndex: startIndex || 0 });
    },
    async addToHostQueue(songIds: number[]) {
      return player.addToQueue(songIds.map(Number));
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

  it("replaceQueueAndPlay uses setQueue after explicit path", async () => {
    const player = {
      play: vi.fn(async () => {}),
      setQueue: vi.fn(async () => {}),
      addToQueue: vi.fn(async () => {}),
    };
    const adapter = createAdapter(player);
    await adapter.replaceQueueAndPlay([1, 2, 3], 0);
    expect(player.setQueue).toHaveBeenCalledWith([1, 2, 3], { startIndex: 0 });
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
