import { beforeEach, describe, expect, it, vi } from "vitest";

const { host, api } = vi.hoisted(() => {
  const host = {
    hasSetQueue: vi.fn(() => true),
    getState: vi.fn(async () => ({ is_playing: false, queue: [] })),
    play: vi.fn(async () => {}),
    replaceQueueAndPlay: vi.fn(async () => {}),
    setPlayMode: vi.fn(async () => {}),
    addToHostQueue: vi.fn(async () => {}),
  };
  const api = {
    queueReorder: vi.fn(),
    queue: vi.fn(),
    prepare: vi.fn(),
    saveProgress: vi.fn(async () => ({ ok: true })),
    recordHistory: vi.fn(async () => ({ ok: true })),
  };
  return { host, api };
});

vi.mock("../ui/lib/toast.js", () => ({ toast: vi.fn(), clearToast: vi.fn() }));
vi.mock("../ui/lib/modal.js", () => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  uiConfirm: vi.fn(async () => true),
  closePopovers: vi.fn(),
}));
vi.mock("../ui/lib/host.js", () => host);
vi.mock("../ui/lib/api.js", () => ({ api }));

import { getData, patch } from "../ui/lib/store.js";
import { reorderQueue } from "../ui/lib/actions.js";
import {
  autoScrollDelta,
  createQueuePointerDrag,
  dropTargetIdAtY,
  followTranslate,
  canDragQueueRow,
  createFrontClampHint,
  FRONT_CLAMPED_HINT,
  lockedFrontSongId,
  planPinSongToFront,
  planPointerMotion,
  planReorder,
  planReorderResult,
  planReorderToIndex,
  resolvePlayheadLock,
  FRONT_CLAMPED_PLAYING,
  FRONT_CLAMPED_PAUSED,
  FRONT_MOVED_TO_FIRST,
  rowSlotsFromBoxes,
  scrollAdjustedSlots,
  settleDurationMs,
  settleTranslate,
  shiftMapForMove,
  useHtml5RowDrag,
} from "../ui/lib/queueDrag.js";

const SONGS = [
  { id: 1, title: "a" },
  { id: 2, title: "b" },
  { id: 3, title: "c" },
];

const ROW_BOXES = [
  { id: 1, top: 0, bottom: 80 },
  { id: 2, top: 80, bottom: 160 },
  { id: 3, top: 160, bottom: 240 },
];

const SLOTS = rowSlotsFromBoxes(ROW_BOXES);

describe("planReorder and drop target", () => {
  it("moves a row to the drop target index without dropping others", () => {
    expect(planReorder([1, 2, 3], 1, 3)).toEqual([2, 1, 3]);
    expect(planReorder([1, 2, 3], 3, 1)).toEqual([3, 1, 2]);
    expect(planReorder([1, 2, 3], 1, 1)).toBeNull();
    expect(planReorder([1, 2, 3], 9, 2)).toBeNull();
  });

  it("picks the row under the pointer, or the nearest end", () => {
    expect(dropTargetIdAtY(ROW_BOXES, 20)).toBe(1);
    expect(dropTargetIdAtY(ROW_BOXES, 120)).toBe(2);
    expect(dropTargetIdAtY(ROW_BOXES, 200)).toBe(3);
    expect(dropTargetIdAtY(ROW_BOXES, -10)).toBe(1);
    expect(dropTargetIdAtY(ROW_BOXES, 400)).toBe(3);
  });

  it("disables HTML5 drag on the mobile sheet and on coarse pointers", () => {
    expect(useHtml5RowDrag({ pointerFine: true, mobile: false })).toBe(true);
    expect(useHtml5RowDrag({ pointerFine: true, mobile: true })).toBe(false);
    expect(useHtml5RowDrag({ pointerFine: false, mobile: true })).toBe(false);
    expect(useHtml5RowDrag({ pointerFine: false, mobile: false })).toBe(false);
  });
});

describe("pointer drag motion", () => {
  it("opens a gap by shifting the others and lets the lifted row settle into the new slot", () => {
    const down = planPointerMotion({
      slots: SLOTS,
      fromId: 1,
      startX: 10,
      startY: 20,
      x: 10,
      y: 200,
    });
    expect(down.toIndex).toBe(2);
    expect(down.nextIds).toEqual([2, 3, 1]);
    expect(down.follow).toEqual({ x: 0, y: 180 });
    expect(shiftMapForMove(SLOTS, 1, 2).filter((s) => !s.isDragged).map((s) => [s.id, s.y])).toEqual([
      [2, -80],
      [3, -80],
    ]);
    expect(settleTranslate(SLOTS, 1, 2)).toEqual({ x: 0, y: 160 });

    const up = planPointerMotion({
      slots: SLOTS,
      fromId: 3,
      startX: 10,
      startY: 200,
      x: 10,
      y: 20,
    });
    expect(up.toIndex).toBe(0);
    expect(up.nextIds).toEqual([3, 1, 2]);
    expect(up.settle).toEqual({ x: 0, y: -160 });
    expect(shiftMapForMove(SLOTS, 3, 0).filter((s) => !s.isDragged).map((s) => [s.id, s.y])).toEqual([
      [1, 80],
      [2, 80],
    ]);
  });

  it("keeps a mid-list drop visually aligned with the committed order", () => {
    const mid = planPointerMotion({
      slots: SLOTS,
      fromId: 1,
      startX: 10,
      startY: 20,
      x: 10,
      y: 180,
    });
    expect(mid.toIndex).toBe(1);
    expect(mid.nextIds).toEqual([2, 1, 3]);
    expect(planReorderToIndex([1, 2, 3], 1, 0)).toBeNull();
  });

  it("follows the pointer after the list scrolls, and clamps horizontal travel", () => {
    expect(followTranslate(10, 20, 10, 80, { scrollDelta: 24 })).toEqual({ x: 0, y: 84 });
    expect(followTranslate(10, 20, 200, 20, { maxX: 56 }).x).toBe(56);
    const shifted = scrollAdjustedSlots(SLOTS, 24);
    expect(shifted[0].top).toBe(-24);
    expect(shifted[2].bottom).toBe(216);
  });

  it("auto-scrolls only at the viewport edge and stops at bounds", () => {
    const base = {
      viewTop: 100,
      viewBottom: 500,
      scrollHeight: 800,
      clientHeight: 400,
      edge: 40,
      step: 14,
    };
    expect(autoScrollDelta({ ...base, pointerY: 300, scrollTop: 40 })).toBe(0);
    expect(autoScrollDelta({ ...base, pointerY: 110, scrollTop: 40 })).toBeLessThan(0);
    expect(autoScrollDelta({ ...base, pointerY: 110, scrollTop: 0 })).toBe(0);
    expect(autoScrollDelta({ ...base, pointerY: 490, scrollTop: 40 })).toBeGreaterThan(0);
    expect(autoScrollDelta({ ...base, pointerY: 490, scrollTop: 400 })).toBe(0);
  });

  it("shortens settle time when reduced motion is preferred", () => {
    expect(settleDurationMs(false)).toBe(180);
    expect(settleDurationMs(true)).toBe(0);
  });
});

describe("pointer drag end -> save -> refresh readback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let saved: number[] | null = null;
    api.queueReorder.mockImplementation(async (ids: number[]) => {
      saved = ids.slice();
      return { ok: true };
    });
    api.queue.mockImplementation(async () => ({
      ok: true,
      playlistId: 8,
      playlistName: "播客",
      songs: (saved || [1, 2, 3]).map((id) => SONGS.find((s) => s.id === id)),
    }));
    patch({ queueSongs: SONGS.slice(), queueMeta: { playlistId: 8, playlistName: "播客" } });
  });

  it("commits on touch pointerup, persists, and rereads the new waitlist order without touching the host queue", async () => {
    const moves: { follow: { y: number }; toIndex: number }[] = [];
    const onSettle = vi.fn(async (motion: { nextIds: number[] | null }) => {
      expect(api.queueReorder).not.toHaveBeenCalled();
      expect(motion.nextIds).toEqual([2, 3, 1]);
    });
    const commit = vi.fn(async (nextIds: number[]) => {
      expect(onSettle).toHaveBeenCalledTimes(1);
      await reorderQueue(nextIds);
    });
    const drag = createQueuePointerDrag({
      getRows: () => ROW_BOXES,
      getScrollTop: () => 0,
      commit,
      onDragMove: (motion) => moves.push({ follow: motion.follow, toIndex: motion.toIndex }),
      onSettle,
      threshold: 8,
    });

    drag.onPointerDown({ pointerId: 7, clientX: 10, clientY: 20, pointerType: "touch" }, 1);
    expect(drag.isActive()).toBe(false);
    drag.onPointerMove({ pointerId: 7, clientX: 10, clientY: 24 });
    expect(drag.isActive()).toBe(false);
    drag.onPointerMove({ pointerId: 7, clientX: 10, clientY: 200 });
    expect(drag.isActive()).toBe(true);
    expect(moves.some((m) => m.follow.y === 180 && m.toIndex === 2)).toBe(true);
    await drag.onPointerUp({ pointerId: 7, clientX: 10, clientY: 200 });
    expect(drag.isActive()).toBe(false);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith([2, 3, 1]);
    expect(api.queueReorder).toHaveBeenCalledWith([2, 3, 1]);
    expect(api.queue).toHaveBeenCalled();
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([2, 3, 1]);
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
    expect(host.addToHostQueue).not.toHaveBeenCalled();
    expect(host.setPlayMode).not.toHaveBeenCalled();
    expect(host.play).not.toHaveBeenCalled();
  });

  it("does not save when the pointer is released before the drag threshold", async () => {
    const commit = vi.fn();
    const drag = createQueuePointerDrag({ getRows: () => ROW_BOXES, commit, threshold: 8 });
    drag.onPointerDown({ pointerId: 1, clientX: 10, clientY: 20 }, 1);
    drag.onPointerMove({ pointerId: 1, clientX: 10, clientY: 24 });
    await drag.onPointerUp({ pointerId: 1, clientX: 10, clientY: 24 });
    expect(commit).not.toHaveBeenCalled();
    expect(api.queueReorder).not.toHaveBeenCalled();
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([1, 2, 3]);
  });

  it("does not commit if cancelled while settling", async () => {
    const commit = vi.fn();
    let drag: ReturnType<typeof createQueuePointerDrag>;
    drag = createQueuePointerDrag({
      getRows: () => ROW_BOXES,
      commit,
      onSettle: async () => {
        drag.cancel();
      },
      threshold: 8,
    });
    drag.onPointerDown({ pointerId: 4, clientX: 10, clientY: 20 }, 1);
    drag.onPointerMove({ pointerId: 4, clientX: 10, clientY: 200 });
    await drag.onPointerUp({ pointerId: 4, clientX: 10, clientY: 200 });
    expect(commit).not.toHaveBeenCalled();
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([1, 2, 3]);
  });

  it("cleans up on pointercancel without saving", async () => {
    const commit = vi.fn();
    const onDragEnd = vi.fn();
    const drag = createQueuePointerDrag({
      getRows: () => ROW_BOXES,
      commit,
      onDragEnd,
      threshold: 8,
    });
    drag.onPointerDown({ pointerId: 3, clientX: 10, clientY: 20 }, 1);
    drag.onPointerMove({ pointerId: 3, clientX: 10, clientY: 200 });
    expect(drag.isActive()).toBe(true);
    drag.cancel();
    expect(drag.isActive()).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalled();
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([1, 2, 3]);
  });

  it("rolls back the optimistic order when save fails", async () => {
    api.queueReorder.mockResolvedValue({ ok: false, error: "boom" });
    const next = planReorderToIndex(
      (getData().queueSongs || []).map((s: { id: number }) => s.id),
      1,
      2
    );
    await reorderQueue(next as number[]);
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([1, 2, 3]);
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
  });
});


describe("front row lock while playing or paused", () => {
  const session = { podcastPlaylistId: 2934, sourcePlaylistId: 2934 };

  it("locks only for plugin「播客」sessions while playing or paused", () => {
    const ids = [1, 2, 3];
    expect(lockedFrontSongId({ songIds: ids, currentSongId: 1, phase: "playing", ...session })).toBe(1);
    expect(lockedFrontSongId({ songIds: ids, currentSongId: 1, phase: "paused", ...session })).toBe(1);
    expect(lockedFrontSongId({ songIds: ids, currentSongId: 1, phase: "ended", ...session })).toBeNull();
    expect(lockedFrontSongId({ songIds: ids, currentSongId: 1, phase: "idle", ...session })).toBeNull();
    expect(
      lockedFrontSongId({
        songIds: ids,
        currentSongId: 1,
        phase: "playing",
        podcastPlaylistId: 2934,
        sourcePlaylistId: 99,
      })
    ).toBeNull();
    expect(lockedFrontSongId({ songIds: ids, currentSongId: 9, phase: "playing", ...session })).toBeNull();
  });

  it("locks and flags repair when current is in-list but not first", () => {
    const r = resolvePlayheadLock({
      songIds: [2, 1, 3],
      currentSongId: 1,
      phase: "playing",
      ...session,
    });
    expect(r.lockedSongId).toBe(1);
    expect(r.needsRepair).toBe(true);
    expect(planPinSongToFront([2, 1, 3], 1)).toEqual([1, 2, 3]);
  });

  it("exposes explicit clamp copy for playing and paused", () => {
    expect(FRONT_CLAMPED_PLAYING).toMatch(/正在播放/);
    expect(FRONT_CLAMPED_PAUSED).toMatch(/第一位/);
    expect(FRONT_MOVED_TO_FIRST).toBe("已排到第一位");
  });

  it("refuses to drag the locked first row", () => {
    expect(canDragQueueRow(1, 1)).toBe(false);
    expect(canDragQueueRow(2, 1)).toBe(true);
    expect(planReorderResult([1, 2, 3], 1, 3, 1)).toEqual({
      next: null,
      clampedToNext: false,
      blocked: true,
    });
    expect(planReorder([1, 2, 3], 1, 3, 1)).toBeNull();
    expect(planReorderToIndex([1, 2, 3], 1, 2, 1)).toBeNull();
  });

  it("clamps a later row aimed at the locked first into next place", () => {
    expect(planReorderResult([1, 2, 3], 3, 1, 1)).toEqual({
      next: [1, 3, 2],
      clampedToNext: true,
      blocked: false,
    });
    expect(planReorder([1, 2, 3], 3, 1, 1)).toEqual([1, 3, 2]);
    expect(planReorderToIndex([1, 2, 3], 3, 0, 1)).toEqual([1, 3, 2]);
  });

  it("reports a clamp with no change when the row is already next", () => {
    expect(planReorderResult([1, 2, 3], 2, 1, 1)).toEqual({
      next: null,
      clampedToNext: true,
      blocked: false,
    });
  });

  it("protects index 0 when playhead is locked mid-list", () => {
    expect(planReorderResult([2, 1, 3], 3, 2, 1)).toEqual({
      next: [2, 3, 1],
      clampedToNext: true,
      blocked: false,
    });
  });

  it("does not clamp when the first row is unlocked", () => {
    expect(planReorderResult([1, 2, 3], 3, 1, null)).toEqual({
      next: [3, 1, 2],
      clampedToNext: false,
      blocked: false,
    });
    expect(planReorder([1, 2, 3], 3, 1)).toEqual([3, 1, 2]);
    expect(planReorderToIndex([1, 2, 3], 3, 0)).toEqual([3, 1, 2]);
  });

  it("clamps pointer motion aimed above the locked first row", () => {
    const motion = planPointerMotion({
      slots: SLOTS,
      fromId: 3,
      startX: 10,
      startY: 200,
      x: 10,
      y: 10,
      lockedSongId: 1,
    });
    expect(motion.toIndex).toBe(1);
    expect(motion.nextIds).toEqual([1, 3, 2]);
    expect(motion.clampedToNext).toBe(true);
  });

  it("does not start a pointer drag on the locked first row", () => {
    const commit = vi.fn();
    const drag = createQueuePointerDrag({
      getRows: () => ROW_BOXES,
      commit,
      threshold: 8,
      lockedSongId: 1,
    });
    drag.onPointerDown({ pointerId: 1, clientX: 10, clientY: 20 }, 1);
    drag.onPointerMove({ pointerId: 1, clientX: 10, clientY: 200 });
    expect(drag.isActive()).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("emits a one-shot muted hint when a drop is clamped behind the front lock", () => {
    const hint = createFrontClampHint();
    expect(hint.take(false)).toBeNull();
    expect(hint.take(true)).toBe(FRONT_CLAMPED_HINT);
    expect(hint.take(true)).toBeNull();
    expect(hint.wasShown()).toBe(true);
  });

  it("does not start playback when unlocking and moving a row to first", async () => {
    patch({
      queueSongs: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
        { id: 3, title: "c" },
      ],
      queueMeta: { playlistId: 8, playlistName: "播客" },
    });
    api.queueReorder.mockResolvedValue({ ok: true, songIds: [3, 1, 2] });
    api.queue.mockResolvedValue({
      ok: true,
      playlistId: 8,
      playlistName: "播客",
      songs: [
        { id: 3, title: "c" },
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
    });
    const next = planReorder([1, 2, 3], 3, 1, null);
    expect(next).toEqual([3, 1, 2]);
    await reorderQueue(next as number[]);
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([3, 1, 2]);
    expect(host.replaceQueueAndPlay).not.toHaveBeenCalled();
    expect(host.play).not.toHaveBeenCalled();
  });
});
