import { describe, expect, it } from "vitest";
import {
  PLAY_THROUGH_LABEL,
  episodeSongId,
  hostQueueMatches,
  isSinglePlayMode,
  playButtonLabel,
  queueIdsForStart,
  readPlayMode,
  readyQueueSongIds,
} from "../ui/lib/playThrough.js";

describe("episodeSongId", () => {
  it("prefers songId over playlist row id", () => {
    expect(episodeSongId({ songId: 7, id: 1 })).toBe(7);
    expect(episodeSongId({ id: 3 })).toBe(3);
    expect(episodeSongId({ songId: "9" })).toBe(9);
    expect(episodeSongId({})).toBeNull();
  });
});

describe("playButtonLabel", () => {
  it("keeps pause / resume for the current episode and explains play-through otherwise", () => {
    expect(playButtonLabel({ pending: true })).toBe("正在加入…");
    expect(playButtonLabel({ isCurrent: true, phase: "playing" })).toBe("暂停");
    expect(playButtonLabel({ isCurrent: true, phase: "paused" })).toBe("继续");
    expect(playButtonLabel({ isCurrent: false, phase: "idle" })).toBe(PLAY_THROUGH_LABEL);
  });
});

describe("queueIdsForStart", () => {
  const songs = [
    { id: 1, title: "a" },
    { id: 2, title: "b", pending: true },
    { id: 3, title: "c" },
    { id: 4, title: "d" },
  ];

  it("keeps full list order when starting in the middle and skips pending rows", () => {
    expect(readyQueueSongIds(songs)).toEqual([1, 3, 4]);
    expect(queueIdsForStart(songs, 3)).toEqual({ ids: [1, 3, 4], startIndex: 1 });
    expect(queueIdsForStart(songs, 4)).toEqual({ ids: [1, 3, 4], startIndex: 2 });
    expect(queueIdsForStart(songs, 1)).toEqual({ ids: [1, 3, 4], startIndex: 0 });
  });

  it("appends a missing target instead of truncating to a suffix", () => {
    expect(queueIdsForStart(songs, 99)).toEqual({ ids: [1, 3, 4, 99], startIndex: 3 });
  });

  it("starts at 0 when no target is given", () => {
    expect(queueIdsForStart(songs, null)).toEqual({ ids: [1, 3, 4], startIndex: 0 });
  });
});

describe("play mode and host queue match", () => {
  it("treats single / singlePlay as single-track modes", () => {
    expect(isSinglePlayMode("order")).toBe(false);
    expect(isSinglePlayMode("loop")).toBe(false);
    expect(isSinglePlayMode("random")).toBe(false);
    expect(isSinglePlayMode("single")).toBe(true);
    expect(isSinglePlayMode("singlePlay")).toBe(true);
    expect(readPlayMode({ play_mode: "single" })).toBe("single");
    expect(readPlayMode({ playMode: "order" })).toBe("order");
  });

  it("matches only when the host queue ids are the same list in the same order", () => {
    const ids = [1, 3, 4];
    expect(hostQueueMatches({ queue: [1, 3, 4] }, ids)).toBe(true);
    expect(hostQueueMatches({ song_ids: [1, 3, 4] }, ids)).toBe(true);
    expect(hostQueueMatches({ queue: [{ id: 1 }, { songId: 3 }, { id: 4 }] }, ids)).toBe(true);
    expect(hostQueueMatches({ queue: [3, 4] }, ids)).toBe(false);
    expect(hostQueueMatches({ queue: [1, 4, 3] }, ids)).toBe(false);
    expect(hostQueueMatches({ play_mode: "order", current_song: { id: 3 } }, ids)).toBe(false);
  });
});
