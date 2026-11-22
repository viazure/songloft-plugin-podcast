import { describe, expect, it } from "vitest";
import {
  PLAY_FROM_START_MESSAGE,
  PLAY_ONE_LABEL,
  PLAY_THROUGH_LABEL,
  SINGLE_MODE_MESSAGE,
  episodeSongId,
  hostQueueMatches,
  isSinglePlayMode,
  playButtonLabel,
  queueIdsForStart,
  readPlayMode,
  readyQueueSongIds,
} from "../ui/lib/playThrough.js";
import { REPLACE_PLAYBACK_MESSAGE } from "../ui/lib/playSession.js";

describe("episodeSongId", () => {
  it("prefers songId over playlist row id", () => {
    expect(episodeSongId({ songId: 7, id: 1 })).toBe(7);
    expect(episodeSongId({ id: 3 })).toBe(3);
    expect(episodeSongId({ songId: "9" })).toBe(9);
    expect(episodeSongId({})).toBeNull();
  });
});

describe("playButtonLabel", () => {
  it("keeps pause / resume for the current episode and distinguishes queue vs one-shot play", () => {
    expect(playButtonLabel({ pending: true })).toBe("正在加入…");
    expect(playButtonLabel({ isCurrent: true, phase: "playing" })).toBe("暂停");
    expect(playButtonLabel({ isCurrent: true, phase: "paused" })).toBe("继续");
    expect(playButtonLabel({ isCurrent: false, phase: "idle" })).toBe(PLAY_ONE_LABEL);
    expect(playButtonLabel({ isCurrent: false, fromWaitlist: true })).toBe(PLAY_THROUGH_LABEL);
  });

  it("does not describe「播客」as a separate listen-later plan", () => {
    expect(PLAY_THROUGH_LABEL).not.toContain("待听");
    expect(PLAY_THROUGH_LABEL).toContain("「播客」");
    expect(PLAY_FROM_START_MESSAGE).not.toContain("待听");
    expect(SINGLE_MODE_MESSAGE).not.toContain("待听");
  });
});

describe("queueIdsForStart", () => {
  const songs = [
    { id: 1, title: "a" },
    { id: 2, title: "b", pending: true },
    { id: 3, title: "c" },
    { id: 4, title: "d" },
  ];

  it("moves the target to the front and always starts at 0", () => {
    expect(readyQueueSongIds(songs)).toEqual([1, 3, 4]);
    expect(queueIdsForStart(songs, 3)).toEqual({ ids: [3, 1, 4], startIndex: 0 });
    expect(queueIdsForStart(songs, 4)).toEqual({ ids: [4, 1, 3], startIndex: 0 });
    expect(queueIdsForStart(songs, 1)).toEqual({ ids: [1, 3, 4], startIndex: 0 });
  });

  it("prepends a missing target instead of appending or truncating", () => {
    expect(queueIdsForStart(songs, 99)).toEqual({ ids: [99, 1, 3, 4], startIndex: 0 });
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

describe("honest copy about the order change", () => {
  it("says the list order changes before the play request", () => {
    expect(REPLACE_PLAYBACK_MESSAGE).toContain("移到「播客」列表第一位");
    expect(REPLACE_PLAYBACK_MESSAGE).toContain("取消");
    expect(REPLACE_PLAYBACK_MESSAGE).toMatch(/顺序不变/);
    expect(REPLACE_PLAYBACK_MESSAGE).not.toContain("待听");
  });
});
