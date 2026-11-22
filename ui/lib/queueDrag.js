/**
 * Waitlist reorder helpers. These only plan the persisted「播客」list order;
 * they never rebuild the host's now-playing queue.
 */

/**
 * Move `fromId` to the current index of `toId`.
 * @param {number[]} ids
 * @param {number} fromId
 * @param {number} toId
 * @returns {number[]|null} next order, or null when there is nothing to change
 */

export const FRONT_LOCKED_LABEL = "正在播放，不能拖动排序";
/** @deprecated use FRONT_CLAMPED_PLAYING / FRONT_CLAMPED_PAUSED */
export const FRONT_CLAMPED_HINT = "正在播放，已排到下一首。";
export const FRONT_CLAMPED_PLAYING = "正在播放，已排到下一首。";
export const FRONT_CLAMPED_PAUSED = "当前一集仍在第一位，已排到下一首。";
export const FRONT_MOVED_TO_FIRST = "已排到第一位";

/**
 * Explicit (non-muted) clamp tip; one message per drag gesture.
 */
export function createFrontClampHint() {
  let hinted = false;
  return {
    /** @returns {string|null} */
    take(clamped, phase) {
      if (!clamped || hinted) return null;
      hinted = true;
      return phase === "paused" ? FRONT_CLAMPED_PAUSED : FRONT_CLAMPED_PLAYING;
    },
    wasShown() {
      return hinted;
    },
    reset() {
      hinted = false;
    },
  };
}

/**
 * Lock the playhead only for a plugin-owned「播客」session:
 * phase playing|paused, current song in this list, and host sourcePlaylistId
 * matches the podcast playlist id (e.g. 2934 on this host).
 *
 * If the current song is in the list but not at index 0, still lock (so others
 * cannot take first) and report needsRepair so the UI can pin it back.
 *
 * @returns {{ lockedSongId: number|null, needsRepair: boolean, phase: string|null }}
 */
export function resolvePlayheadLock({
  songIds,
  currentSongId,
  phase,
  podcastPlaylistId,
  sourcePlaylistId,
} = {}) {
  const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
  const cur = Number(currentSongId);
  const ph = phase || null;
  if (ph !== "playing" && ph !== "paused") {
    return { lockedSongId: null, needsRepair: false, phase: ph };
  }
  if (!Number.isFinite(cur) || cur <= 0) {
    return { lockedSongId: null, needsRepair: false, phase: ph };
  }
  const want = Number(podcastPlaylistId);
  const have = Number(sourcePlaylistId);
  if (!Number.isFinite(want) || want <= 0) {
    return { lockedSongId: null, needsRepair: false, phase: ph };
  }
  if (!Number.isFinite(have) || have !== want) {
    return { lockedSongId: null, needsRepair: false, phase: ph };
  }
  const idx = ids.indexOf(cur);
  if (idx < 0) {
    return { lockedSongId: null, needsRepair: false, phase: ph };
  }
  return { lockedSongId: cur, needsRepair: idx !== 0, phase: ph };
}

/**
 * Backward-compatible lock id helper.
 * @returns {number|null}
 */
export function lockedFrontSongId(opts = {}) {
  return resolvePlayheadLock(opts).lockedSongId;
}

/** Move `songId` to index 0; null when already first or missing. */
export function planPinSongToFront(ids, songId) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
  const id = Number(songId);
  const from = list.indexOf(id);
  if (from < 0 || from === 0) return null;
  const next = list.slice();
  next.splice(from, 1);
  next.unshift(id);
  return next;
}

function normalizeLockedId(lockedSongId) {
  const locked = Number(lockedSongId);
  return Number.isFinite(locked) && locked > 0 ? locked : null;
}

export function canDragQueueRow(fromId, lockedSongId) {
  const from = Number(fromId);
  if (!Number.isFinite(from)) return false;
  const locked = normalizeLockedId(lockedSongId);
  return !(locked && from === locked);
}

/**
 * @returns {{ next: number[]|null, clampedToNext: boolean, blocked: boolean }}
 */
export function planReorderResult(ids, fromId, toId, lockedSongId) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
  const from = Number(fromId);
  const to = Number(toId);
  const locked = normalizeLockedId(lockedSongId);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
    return { next: null, clampedToNext: false, blocked: false };
  }
  if (locked && from === locked) {
    return { next: null, clampedToNext: false, blocked: true };
  }
  const fromIndex = list.indexOf(from);
  if (fromIndex < 0 || list.indexOf(to) < 0) {
    return { next: null, clampedToNext: false, blocked: false };
  }
  const next = list.slice();
  const [moved] = next.splice(fromIndex, 1);
  let insertAt = next.indexOf(to);
  if (insertAt < 0) return { next: null, clampedToNext: false, blocked: false };
  let clampedToNext = false;
  if (locked) {
    // Protect index 0 whenever a playhead lock is active (including desync repair).
    if (to === locked) {
      insertAt = Math.min(Math.max(1, next.indexOf(locked) + 1), next.length);
      clampedToNext = true;
    }
    if (insertAt < 1) {
      insertAt = Math.min(1, next.length);
      clampedToNext = true;
    }
  }
  next.splice(insertAt, 0, moved);
  if (next.length === list.length && next.every((id, i) => id === list[i])) {
    return { next: null, clampedToNext, blocked: false };
  }
  return { next, clampedToNext, blocked: false };
}

export function planReorder(ids, fromId, toId, lockedSongId) {
  return planReorderResult(ids, fromId, toId, lockedSongId).next;
}

/**
 * Row id under `clientY`, or the nearest row if the pointer is outside the list.
 * @param {{ id: number, top: number, bottom: number }[]} rows
 * @param {number} clientY
 * @returns {number|null}
 */
export function dropTargetIdAtY(rows, clientY) {
  if (!Array.isArray(rows) || !rows.length || !Number.isFinite(clientY)) return null;
  for (const row of rows) {
    const top = Number(row && row.top);
    const bottom = Number(row && row.bottom);
    const id = Number(row && row.id);
    if (!Number.isFinite(id) || !Number.isFinite(top) || !Number.isFinite(bottom)) continue;
    if (clientY >= top && clientY <= bottom) return id;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (clientY < Number(first.top)) return Number(first.id);
  return Number(last.id);
}

/** Desktop mouse keeps HTML5 drag; touch / mobile sheet uses pointer events. */
export function useHtml5RowDrag({ pointerFine = false, mobile = false } = {}) {
  return !!pointerFine && !mobile;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convert bounding boxes to slots whose stride includes list gap.
 * @param {{ id: number, top: number, bottom: number }[]} boxes
 */
export function rowSlotsFromBoxes(boxes) {
  const list = (Array.isArray(boxes) ? boxes : [])
    .map((b) => ({
      id: Number(b && b.id),
      top: Number(b && b.top),
      bottom: Number(b && b.bottom),
    }))
    .filter((b) => Number.isFinite(b.id) && Number.isFinite(b.top) && Number.isFinite(b.bottom));
  return list.map((b, i) => {
    const height = b.bottom - b.top;
    const stride =
      i < list.length - 1
        ? list[i + 1].top - b.top
        : i > 0
          ? b.top - list[i - 1].top
          : height;
    return { ...b, height, slot: stride > 0 ? stride : height };
  });
}

/** Client-space adjustment when the list scrolls during a drag. */
export function scrollAdjustedSlots(slots, scrollDelta) {
  const delta = Number(scrollDelta) || 0;
  return (Array.isArray(slots) ? slots : []).map((s) => ({
    ...s,
    top: s.top - delta,
    bottom: s.bottom - delta,
  }));
}

export function followTranslate(startX, startY, x, y, { maxX = 56, scrollDelta = 0 } = {}) {
  return {
    x: clamp((Number(x) || 0) - (Number(startX) || 0), -maxX, maxX),
    y: (Number(y) || 0) - (Number(startY) || 0) + (Number(scrollDelta) || 0),
  };
}

export function targetIndexForCenter(slots, fromId, centerY, lockedSongId) {
  const list = Array.isArray(slots) ? slots : [];
  const fromIndex = list.findIndex((s) => s.id === Number(fromId));
  if (fromIndex < 0 || !Number.isFinite(centerY)) return Math.max(0, fromIndex);
  let insert = 0;
  for (const s of list) {
    if (s.id === Number(fromId)) continue;
    if (centerY > s.top + s.height / 2) insert += 1;
  }
  if (normalizeLockedId(lockedSongId) && insert < 1) insert = 1;
  return insert;
}

export function planReorderToIndex(ids, fromId, toIndex, lockedSongId) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
  const from = Number(fromId);
  const fromIndex = list.indexOf(from);
  if (fromIndex < 0) return null;
  const locked = normalizeLockedId(lockedSongId);
  if (locked && from === locked) return null;
  let dest = clamp(Math.round(Number(toIndex)), 0, Math.max(0, list.length - 1));
  if (locked && dest < 1) dest = Math.min(1, Math.max(0, list.length - 1));
  if (dest === fromIndex) return null;
  const next = list.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(dest, 0, moved);
  if (next.every((id, i) => id === list[i])) return null;
  return next;
}

export function shiftMapForMove(slots, fromId, toIndex) {
  const list = Array.isArray(slots) ? slots : [];
  const fromIndex = list.findIndex((s) => s.id === Number(fromId));
  if (fromIndex < 0) return [];
  const dest = clamp(Math.round(Number(toIndex)), 0, Math.max(0, list.length - 1));
  const lifted = list[fromIndex].slot;
  return list.map((s, i) => {
    if (i === fromIndex) return { id: s.id, y: 0, isDragged: true };
    let y = 0;
    if (fromIndex < dest && i > fromIndex && i <= dest) y = -lifted;
    else if (dest < fromIndex && i >= dest && i < fromIndex) y = lifted;
    return { id: s.id, y, isDragged: false };
  });
}

export function settleTranslate(slots, fromId, toIndex) {
  const list = Array.isArray(slots) ? slots : [];
  const fromIndex = list.findIndex((s) => s.id === Number(fromId));
  if (fromIndex < 0 || !list.length) return { x: 0, y: 0 };
  const dest = clamp(Math.round(Number(toIndex)), 0, list.length - 1);
  const originTop = list[fromIndex].top;
  const ids = list.map((s) => s.id);
  const order = planReorderToIndex(ids, fromId, dest) || ids;
  let top = list[0].top;
  for (const id of order) {
    if (id === Number(fromId)) break;
    const row = list.find((s) => s.id === id);
    top += row ? row.slot : 0;
  }
  return { x: 0, y: top - originTop };
}

export function planPointerMotion({
  slots,
  fromId,
  startX,
  startY,
  x,
  y,
  maxX = 56,
  scrollDelta = 0,
  lockedSongId,
} = {}) {
  const follow = followTranslate(startX, startY, x, y, { maxX, scrollDelta });
  const from = (Array.isArray(slots) ? slots : []).find((s) => s.id === Number(fromId));
  const centerY = from ? from.top + from.height / 2 + follow.y : Number(y) || 0;
  const rawIndex = targetIndexForCenter(slots, fromId, centerY);
  const toIndex = targetIndexForCenter(slots, fromId, centerY, lockedSongId);
  const clampedToNext = !!(normalizeLockedId(lockedSongId) && rawIndex < 1 && toIndex >= 1);
  const shifts = shiftMapForMove(slots, fromId, toIndex);
  const settle = settleTranslate(slots, fromId, toIndex);
  const nextIds = planReorderToIndex(
    (Array.isArray(slots) ? slots : []).map((s) => s.id),
    fromId,
    toIndex,
    lockedSongId
  );
  return { fromId: Number(fromId), follow, toIndex, shifts, settle, nextIds, clampedToNext };
}

/**
 * Programmatic list scroll when the pointer sits on a viewport edge.
 * Returns the applied scrollTop delta, or 0 at bounds / away from edges.
 */
export function autoScrollDelta({
  pointerY,
  viewTop,
  viewBottom,
  scrollTop,
  scrollHeight,
  clientHeight,
  edge = 40,
  step = 14,
} = {}) {
  const maxScroll = Math.max(0, (Number(scrollHeight) || 0) - (Number(clientHeight) || 0));
  const top = Number(scrollTop) || 0;
  if (maxScroll <= 0 || !Number.isFinite(pointerY)) return 0;
  const edgeSize = Math.max(1, Number(edge) || 40);
  const maxStep = Math.max(1, Number(step) || 14);
  let delta = 0;
  if (pointerY < viewTop + edgeSize) {
    const t = (viewTop + edgeSize - pointerY) / edgeSize;
    delta = -Math.ceil(maxStep * clamp(t, 0.25, 1));
  } else if (pointerY > viewBottom - edgeSize) {
    const t = (pointerY - (viewBottom - edgeSize)) / edgeSize;
    delta = Math.ceil(maxStep * clamp(t, 0.25, 1));
  }
  if (!delta) return 0;
  const next = clamp(top + delta, 0, maxScroll);
  return next - top;
}

export function settleDurationMs(reducedMotion) {
  return reducedMotion ? 0 : 180;
}

/**
 * Motion plan for pinning one existing row to index 0. Same language as a
 * drag-settle so the queue panel shows a visible list-internal move.
 * @param {Array<{id:number,top:number,bottom:number,height?:number,slot?:number}>} slots
 * @param {number} songId
 */
export function planPinToFrontMotion(slots, songId) {
  const list = Array.isArray(slots) ? slots : [];
  const fromId = Number(songId);
  const fromIndex = list.findIndex((s) => s.id === fromId);
  if (fromIndex < 0) return { kind: "insert", fromId, fromIndex: -1, toIndex: 0 };
  if (fromIndex === 0) {
    return {
      kind: "already-first",
      fromId,
      fromIndex: 0,
      toIndex: 0,
      follow: { x: 0, y: 0 },
      shifts: [],
      settle: { x: 0, y: 0 },
    };
  }
  return {
    kind: "move",
    fromId,
    fromIndex,
    toIndex: 0,
    follow: { x: 0, y: 0 },
    shifts: shiftMapForMove(list, fromId, 0),
    settle: settleTranslate(list, fromId, 0),
  };
}

/**
 * Pointer-driven row drag for touch (and any case where HTML5 DnD never fires drop).
 * `commit` receives the next id list, or is skipped when the order is unchanged.
 * @param {{
 *   getRows?: () => { id: number, top: number, bottom: number }[],
 *   getScrollTop?: () => number,
 *   commit?: (nextIds: number[]) => (void|Promise<void>),
 *   onDragStart?: (fromId: number) => void,
 *   onDragMove?: (motion: ReturnType<typeof planPointerMotion>) => void,
 *   onSettle?: (motion: ReturnType<typeof planPointerMotion>) => (void|Promise<void>),
 *   onDragEnd?: (info?: { keepPaint?: boolean }) => void,
 *   threshold?: number,
 *   maxX?: number,
 * }} [opts]
 */
export function createQueuePointerDrag(opts = {}) {
  const threshold = Number.isFinite(Number(opts.threshold)) ? Number(opts.threshold) : 8;
  let session = null;
  let restSlots = null;
  let restScrollTop = 0;

  function scrollTopNow() {
    return typeof opts.getScrollTop === "function" ? Number(opts.getScrollTop()) || 0 : 0;
  }

  function currentSlots() {
    if (restSlots) return scrollAdjustedSlots(restSlots, scrollTopNow() - restScrollTop);
    return rowSlotsFromBoxes(typeof opts.getRows === "function" ? opts.getRows() || [] : []);
  }

  function motionAt(x, y) {
    if (!session) return null;
    const locked =
      typeof opts.getLockedSongId === "function" ? opts.getLockedSongId() : opts.lockedSongId;
    return planPointerMotion({
      slots: currentSlots(),
      fromId: session.fromId,
      startX: session.startX,
      startY: session.startY,
      x,
      y,
      maxX: opts.maxX,
      scrollDelta: scrollTopNow() - restScrollTop,
      lockedSongId: locked,
    });
  }

  function clear(info) {
    const had = session;
    session = null;
    restSlots = null;
    restScrollTop = 0;
    if (had && had.started && typeof opts.onDragEnd === "function") opts.onDragEnd(info || {});
  }

  return {
    isActive() {
      return !!(session && (session.started || session.settling));
    },
    onPointerDown(ev, fromId) {
      const id = Number(fromId);
      if (!Number.isFinite(id) || !ev) return;
      const locked =
        typeof opts.getLockedSongId === "function" ? opts.getLockedSongId() : opts.lockedSongId;
      if (!canDragQueueRow(id, locked)) return;
      session = {
        fromId: id,
        pointerId: ev.pointerId,
        startX: ev.clientX ?? 0,
        startY: ev.clientY ?? 0,
        lastX: ev.clientX ?? 0,
        lastY: ev.clientY ?? 0,
        started: false,
        settling: false,
      };
    },
    onPointerMove(ev) {
      if (!session || (ev && ev.pointerId != null && ev.pointerId !== session.pointerId)) return;
      const x = ev && ev.clientX != null ? ev.clientX : session.lastX;
      const y = ev && ev.clientY != null ? ev.clientY : session.lastY;
      session.lastX = x;
      session.lastY = y;
      if (!session.started) {
        if (Math.hypot(x - session.startX, y - session.startY) < threshold) return;
        session.started = true;
        restSlots = currentSlots();
        restScrollTop = scrollTopNow();
        if (typeof opts.onDragStart === "function") opts.onDragStart(session.fromId);
      }
      if (session.settling) return;
      const motion = motionAt(x, y);
      if (motion && typeof opts.onDragMove === "function") opts.onDragMove(motion);
    },
    async onPointerUp(ev) {
      if (!session || (ev && ev.pointerId != null && ev.pointerId !== session.pointerId)) return;
      const x = ev && ev.clientX != null ? ev.clientX : session.lastX;
      const y = ev && ev.clientY != null ? ev.clientY : session.lastY;
      if (!session.started) {
        clear();
        return;
      }
      session.settling = true;
      const mine = session;
      const motion = motionAt(x, y);
      if (typeof opts.onSettle === "function") await opts.onSettle(motion);
      if (session !== mine) return;
      const nextIds = motion && motion.nextIds;
      clear({ keepPaint: !!nextIds });
      if (nextIds && typeof opts.commit === "function") await opts.commit(nextIds);
    },
    cancel() {
      clear();
    },
  };
}