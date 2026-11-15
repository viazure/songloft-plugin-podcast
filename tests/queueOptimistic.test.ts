import { describe, expect, it } from "vitest";
import {
  appendPendingSong,
  createQueueWriteTracker,
  hasPendingSong,
  isPendingQueueSong,
  pendingSongId,
  playedSongs,
  reorderSongs,
  rollbackPlan,
  shouldApplyQueueResponse,
  snapshotQueue,
  withoutSongs,
} from "../ui/lib/queueOptimistic.js";

const SONGS = [
  { id: 1, title: "one" },
  { id: 2, title: "two" },
  { id: 3, title: "three" },
];

describe("optimistic queue patch", () => {
  it("removes only the requested rows and preserves order", () => {
    expect(withoutSongs(SONGS, [2]).map((s) => s.id)).toEqual([1, 3]);
    expect(withoutSongs(SONGS, [1, 3]).map((s) => s.id)).toEqual([2]);
    expect(withoutSongs(SONGS, []).map((s) => s.id)).toEqual([1, 2, 3]);
    expect(withoutSongs(SONGS, ["2"])).toHaveLength(2);
    expect(withoutSongs(SONGS, [999]).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("is safe with malformed input", () => {
    expect(withoutSongs(null, [1])).toEqual([]);
    expect(withoutSongs(SONGS, null).map((s) => s.id)).toEqual([1, 2, 3]);
    expect(withoutSongs([{ id: null }], [1])).toEqual([{ id: null }]);
  });

  it("snapshots the list and its meta for a faithful rollback", () => {
    const meta = { playlistId: 7, playlistName: "播客" };
    const snap = snapshotQueue({ queueSongs: SONGS, queueMeta: meta });
    expect(snap.queueMeta).toBe(meta);
    expect(snap.queueSongs).toHaveLength(3);
    // A copy: later mutation of the live array must not corrupt the snapshot.
    SONGS.push({ id: 4, title: "four" });
    expect(snap.queueSongs).toHaveLength(3);
    SONGS.pop();
  });

  it("detects the played rows the 移除已播放 action drops", () => {
    const songs = [
      { id: 1, progress: { completed: true } },
      { id: 2, progress: { completed: false } },
      { id: 3 },
      { id: 4, progress: { completed: true } },
    ];
    expect(playedSongs(songs).map((s) => s.id)).toEqual([1, 4]);
    expect(playedSongs(null)).toEqual([]);
  });
});

describe("rollback under racing writes", () => {
  it("restores the exact previous state when the mutation still owns the queue", () => {
    const tracker = createQueueWriteTracker();
    const token = tracker.begin();
    const before = { queueSongs: SONGS, queueMeta: { playlistName: "播客" } };
    const plan = rollbackPlan({ before, token, tracker });
    expect(plan.discarded).toBe(false);
    expect(plan.patch.queueSongs).toEqual(SONGS);
    expect(plan.patch.queueMeta.playlistName).toBe("播客");
  });

  it("discards a stale rollback so it cannot undo a newer mutation", () => {
    const tracker = createQueueWriteTracker();
    const stale = tracker.begin();
    tracker.begin(); // a newer removal started
    const plan = rollbackPlan({ before: { queueSongs: SONGS }, token: stale, tracker });
    expect(plan.discarded).toBe(true);
    expect(plan.patch).toBeNull();
  });

  it("discards a stale reload response", () => {
    const tracker = createQueueWriteTracker();
    const readToken = tracker.begin();
    expect(shouldApplyQueueResponse(readToken, tracker)).toBe(true);
    tracker.begin();
    expect(shouldApplyQueueResponse(readToken, tracker)).toBe(false);
  });

  it("keeps generations monotonic", () => {
    const tracker = createQueueWriteTracker();
    const a = tracker.begin();
    const b = tracker.begin();
    expect(b).toBeGreaterThan(a);
    expect(tracker.current()).toBe(b);
  });
});

describe("pending writes and reorderSongs", () => {
  it("isPending tracks overlapping writes and end is safe when idle", () => {
    const tracker = createQueueWriteTracker();
    expect(tracker.isPending()).toBe(false);
    tracker.end();
    expect(tracker.isPending()).toBe(false);
    const first = tracker.begin();
    expect(tracker.isPending()).toBe(true);
    tracker.begin();
    expect(tracker.isPending()).toBe(true);
    tracker.end();
    expect(tracker.isPending()).toBe(true);
    expect(tracker.isCurrent(first)).toBe(false);
    tracker.end();
    expect(tracker.isPending()).toBe(false);
  });

  it("reorders by id and appends leftovers instead of dropping them", () => {
    expect(reorderSongs(SONGS, [3, 1, 2]).map((s) => s.id)).toEqual([3, 1, 2]);
    expect(reorderSongs(SONGS, [2, 2, 99, 1]).map((s) => s.id)).toEqual([2, 1, 3]);
    expect(reorderSongs(null, [1])).toEqual([]);
    expect(reorderSongs(SONGS, null).map((s) => s.id)).toEqual([1, 2, 3]);
  });
});

describe("pending add placeholder", () => {
  const ep = {
    title: "No.233",
    showTitle: "三五环",
    feedUrl: "https://feed.example/show",
    guid: "abc",
    coverUrl: "https://img.example/a.jpg",
    durationSec: 100,
  };

  it("appends a loading row at the end and is idempotent", () => {
    const once = appendPendingSong(SONGS, ep);
    expect(once.map((s) => s.id)).toEqual([1, 2, 3, pendingSongId(ep)]);
    const last = once[3];
    expect(isPendingQueueSong(last)).toBe(true);
    expect(last.title).toBe("No.233");
    expect(last.artist).toBe("三五环");
    expect(last.feedUrl).toBe(ep.feedUrl);
    expect(last.guid).toBe(ep.guid);
    expect(appendPendingSong(once, ep)).toHaveLength(4);
    expect(hasPendingSong(once, ep)).toBe(true);
    expect(hasPendingSong(SONGS, ep)).toBe(false);
  });

  it("does not append when a real row already has the same identity", () => {
    const existing = [{ id: 9, feedUrl: ep.feedUrl, guid: ep.guid, title: "No.233" }];
    expect(appendPendingSong(existing, ep)).toEqual(existing);
    expect(hasPendingSong(existing, ep)).toBe(false);
  });
});
