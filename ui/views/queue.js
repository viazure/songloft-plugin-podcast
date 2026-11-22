/**
 * 「播客」queue view (the real playback queue).
 *
 * Desktop: right column card. Mobile: bottom sheet toggled from the app header.
 * Panel-level operations live in the 「更多」icon menu; rows keep only play and
 * a per-row 更多 menu (details / cast / remove).
 */

import { $, setHidden } from "../lib/dom.js";
import { icon, setButtonIcon } from "../lib/icons.js";
import { getData, patch } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import {
  castQueueToSpeaker,
  clearQueue,
  notify,
  onEnsureQueueVisible,
  onQueueViewChange,
  reloadQueue,
  removePlayed,
  removeSongs,
  reorderQueue,
  replaceQueueAndPlay,
  setQueuePinRunner,
  toggleFavorite,
} from "../lib/actions.js";
import { closePopovers, togglePopover, uiConfirm } from "../lib/modal.js";
import { bindRowInteractions } from "./row-events.js";
import * as Playback from "../lib/playback.js";
import {
  autoScrollDelta,
  createQueuePointerDrag,
  FRONT_LOCKED_LABEL,
  FRONT_MOVED_TO_FIRST,
  createFrontClampHint,
  planPinSongToFront,
  planPinToFrontMotion,
  planReorderResult,
  resolvePlayheadLock,
  rowSlotsFromBoxes,
  settleDurationMs,
  useHtml5RowDrag,
} from "../lib/queueDrag.js";

const selectState = { mode: false, ids: new Set() };
let dragId = null;
let pointerDrag = null;
const frontClampHint = createFrontClampHint();
let playheadRepairInFlight = false;

function resolveCurrentPlayhead() {
  const data = getData();
  const songs = data.queueSongs || [];
  const meta = data.queueMeta;
  const snap = Playback.get();
  return resolvePlayheadLock({
    songIds: songs.map((s) => s && s.id),
    currentSongId: Playback.currentSongId(snap),
    phase: snap && snap.phase,
    podcastPlaylistId: meta && meta.playlistId,
    sourcePlaylistId: snap && snap.sourcePlaylistId,
  });
}

function currentFrontLock() {
  return resolveCurrentPlayhead().lockedSongId;
}

function maybeHintFrontClamp(clamped) {
  const phase = resolveCurrentPlayhead().phase;
  const msg = frontClampHint.take(clamped, phase);
  if (msg) notify(msg, "warn");
}

function maybeHintMovedToFirst(beforeIds, nextIds, fromId) {
  if (currentFrontLock()) return;
  const from = Number(fromId);
  const before = (Array.isArray(beforeIds) ? beforeIds : []).map(Number);
  const next = (Array.isArray(nextIds) ? nextIds : []).map(Number);
  if (!Number.isFinite(from) || !next.length) return;
  if (next[0] === from && before[0] !== from) {
    notify(FRONT_MOVED_TO_FIRST, "ok");
  }
}

async function maybeRepairPlayheadOrder() {
  if (playheadRepairInFlight) return;
  if (pointerDrag && pointerDrag.isActive()) return;
  const resolved = resolveCurrentPlayhead();
  if (!resolved.needsRepair || resolved.lockedSongId == null) return;
  const ids = (getData().queueSongs || []).map((s) => s && s.id);
  const next = planPinSongToFront(ids, resolved.lockedSongId);
  if (!next) return;
  playheadRepairInFlight = true;
  try {
    await reorderQueue(next);
  } catch (_) {
    /* repair is best-effort */
  } finally {
    playheadRepairInFlight = false;
  }
}

function isMobile() {
  return window.matchMedia("(max-width: 720px)").matches;
}

export function setQueueOpen(open) {
  const panel = $("queuePanel");
  if (!panel) return;
  const next = !!open;
  if (isMobile()) {
    panel.classList.toggle("is-open", next);
  } else {
    panel.classList.toggle("is-collapsed", !next);
  }
  // Keep the layout grid in step with the collapsed state on desktop.
  const layout = $("layout");
  if (layout) layout.classList.toggle("queue-hidden", !next && !isMobile());
  patch({ queueOpen: next });
  syncQueueToggleButtons(next);
}

/** Both toggles read the same state: label, tooltip and icon must agree. */
function syncQueueToggleButtons(open) {
  const label = open ? "隐藏「播客」列表" : "显示「播客」列表";
  const btnTop = $("btnToggleQueue");
  if (btnTop) {
    btnTop.setAttribute("aria-pressed", open ? "true" : "false");
    btnTop.setAttribute("title", label);
    btnTop.setAttribute("aria-label", label);
    setButtonIcon(btnTop, "listMusic", 17);
  }
}

export function toggleQueue() {
  setQueueOpen(!getData().queueOpen);
}

function syncSelectUi() {
  const bar = $("queueSelectBar");
  const del = $("btnQueueDeleteSelected");
  setHidden(bar, !selectState.mode);
  if (del) del.disabled = selectState.ids.size === 0;
}

function setSelectMode(on) {
  selectState.mode = !!on;
  if (!on) selectState.ids.clear();
  syncSelectUi();
  renderQueue();
}

export function renderQueue() {
  if (pointerDrag && pointerDrag.isActive()) return;
  const data = getData();
  const songs = data.queueSongs || [];
  const meta = data.queueMeta;

  const metaEl = $("queueMeta");
  if (metaEl) {
    metaEl.textContent = meta
      ? `${meta.playlistName} · ${songs.length} 首`
      : "固定宿主歌单";
  }

  const box = $("queueList");
  if (!box) return;

  const replaceBtn = document.querySelector('[data-queue-act="replace"]');
  if (replaceBtn) replaceBtn.disabled = !songs.length;

  box.classList.remove("is-skeleton");
  if (!songs.length) {
    if (box.dataset.bootPending === "1") {
      syncSelectUi();
      return;
    }
    box.innerHTML = '<div class="empty">「播客」列表为空。在「更新」里加入单集，点播放时会从这一集开始顺序播完。</div>';
    syncSelectUi();
    return;
  }
  delete box.dataset.bootPending;

  box.innerHTML = songs
    .map((s, idx) => {
      const pending = !!s.pending;
      const selected = selectState.ids.has(s.id);
      const lockedId = currentFrontLock();
      const frontLocked = !pending && lockedId != null && Number(s.id) === Number(lockedId);
      const lead = pending
        ? `<span class="q-pending-lead" aria-hidden="true"></span>`
        : selectState.mode
        ? `<input type="checkbox" class="sel-box" data-sel="${s.id}" ${
            selected ? "checked" : ""
          } aria-label="选择" />`
        : frontLocked
        ? `<span class="drag-handle drag-handle--locked" title="${FRONT_LOCKED_LABEL}" aria-label="${FRONT_LOCKED_LABEL}">${icon("gripVertical", 16)}</span>`
        : `<span class="drag-handle" title="拖拽排序" aria-hidden="true">${icon("gripVertical", 16)}</span>`;

      const more = pending
        ? ""
        : moreMenuHtml(
        [
          { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove",
            label: "移出列表",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`,
          },
        ],
        "queue-" + idx
      );

      const row = episodeRowHtml(
        {
          ...s,
          songId: s.id,
          durationSec: s.duration,
          showTitle: s.artist || s.album || "",
        },
        idx,
        {
          showDate: false,
          extraClass: frontLocked ? "q-row is-front-locked" : "q-row",
          pending,
          fromWaitlist: true,
          leadHtml: lead,
          actions: [
            {
              act: "fav",
              iconName: "star",
              title: "收藏",
              cls: "icon-btn--star",
              attrs:
                `aria-pressed="${s.favorited ? "true" : "false"}" ` +
                (pending || !(s.feedUrl && s.guid) ? "disabled" : ""),
            },
          ],
          moreHtml: pending || selectState.mode ? "" : more,
        }
      );
      return row;
    })
    .join("");

  if (selectState.mode) {
    box.querySelectorAll("input[data-sel]").forEach((input) => {
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.addEventListener("change", () => {
        const id = Number(input.getAttribute("data-sel"));
        if (input.checked) selectState.ids.add(id);
        else selectState.ids.delete(id);
        syncSelectUi();
      });
    });
    box.querySelectorAll("[data-row]").forEach((row) => {
      row.addEventListener("click", (ev) => {
        if (ev.target instanceof Element && ev.target.closest("input")) return;
        const input = row.querySelector("input[data-sel]");
        if (!input) return;
        input.checked = !input.checked;
        const id = Number(input.getAttribute("data-sel"));
        if (input.checked) selectState.ids.add(id);
        else selectState.ids.delete(id);
        syncSelectUi();
      });
    });
    syncSelectUi();
    return;
  }

  bindRowInteractions(box, songs, {
    playOpts: { fromWaitlist: true },
    remove: async (ep, idx) => {
      const id = songs[idx] && songs[idx].id;
      if (id == null) return;
      await removeSongs([id]);
    },
    cast: async (ep, idx) => {
      const song = songs[idx];
      if (!song) return;
      const songIds = songs
        .map((s) => Number(s && s.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      await castQueueToSpeaker({ songIds, songId: song.id });
    },
    fav: async (ep, idx, btn) => {
      const song = songs[idx];
      if (!song || !song.feedUrl || !song.guid) return;
      await toggleFavorite(
        {
          feedUrl: song.feedUrl,
          guid: song.guid,
          title: song.title,
          showTitle: song.album || song.artist || "",
          coverUrl: song.coverUrl || song.cover_url,
          subscriptionId: song.subscriptionId,
          durationSec: song.duration,
          favorited: song.favorited,
        },
        btn
      );
    },
  });

  wireDragAndDrop(box);
  syncQueueFrontLock();
  syncSelectUi();
}

function clearDragMarks(box) {
  box.querySelectorAll("[data-row]").forEach((row) => {
    row.classList.remove(
      "dragging",
      "drag-over",
      "is-lifted",
      "is-shifting",
      "is-settling",
      "is-drop-after-front"
    );
    row.style.transform = "";
  });
}

function markDropAfterFront(box, on) {
  const songs = getData().queueSongs || [];
  const second = songs[1];
  box.querySelectorAll("[data-row]").forEach((row) => {
    const id = Number(row.getAttribute("data-song-id"));
    row.classList.toggle("is-drop-after-front", !!(on && second && id === Number(second.id)));
  });
}

function rowBoxes(box) {
  return Array.from(box.querySelectorAll("[data-row]")).map((row) => {
    const rect = row.getBoundingClientRect();
    return {
      id: Number(row.getAttribute("data-song-id")),
      top: rect.top,
      bottom: rect.bottom,
    };
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function motionTransform(x, y) {
  return "translate(" + (Number(x) || 0) + "px, " + (Number(y) || 0) + "px)";
}

function paintPointerMotion(box, fromId, motion, settling) {
  if (!motion) return;
  const shifts = motion.shifts || [];
  markDropAfterFront(box, !!(motion.clampedToNext || (currentFrontLock() && motion.toIndex === 1)));
  box.querySelectorAll("[data-row]").forEach((row) => {
    const id = Number(row.getAttribute("data-song-id"));
    if (id === fromId) {
      const t = settling ? motion.settle : motion.follow;
      row.classList.add("is-lifted");
      row.classList.toggle("is-settling", !!settling);
      row.classList.remove("is-shifting", "drag-over", "dragging");
      row.style.transform = motionTransform(t && t.x, t && t.y);
      return;
    }
    const shift = shifts.find((s) => s.id === id);
    row.classList.add("is-shifting");
    row.classList.remove("is-lifted", "is-settling", "drag-over");
    row.style.transform = motionTransform(0, shift ? shift.y : 0);
  });
}

function waitForRowSettle(row, reduced) {
  const ms = settleDurationMs(reduced);
  if (!ms || !row) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      row.removeEventListener("transitionend", onEnd);
      resolve();
    };
    const onEnd = (ev) => {
      if (!ev || ev.propertyName === "transform") finish();
    };
    row.addEventListener("transitionend", onEnd);
    setTimeout(finish, ms + 40);
  });
}

function wirePointerReorder(box) {
  let lastPointer = null;
  let scrollRaf = 0;

  function stopAutoScroll() {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  }

  function tickAutoScroll() {
    if (!pointerDrag || !pointerDrag.isActive() || !lastPointer) {
      stopAutoScroll();
      return;
    }
    scrollRaf = requestAnimationFrame(() => {
      if (!pointerDrag || !pointerDrag.isActive() || !lastPointer) {
        stopAutoScroll();
        return;
      }
      const view = box.getBoundingClientRect();
      const delta = autoScrollDelta({
        pointerY: lastPointer.clientY,
        viewTop: view.top,
        viewBottom: view.bottom,
        scrollTop: box.scrollTop,
        scrollHeight: box.scrollHeight,
        clientHeight: box.clientHeight,
      });
      if (delta) {
        box.scrollTop += delta;
        pointerDrag.onPointerMove(lastPointer);
      }
      tickAutoScroll();
    });
  }

  pointerDrag = createQueuePointerDrag({
    getRows: () => rowBoxes(box),
    getScrollTop: () => box.scrollTop,
    threshold: 8,
    getLockedSongId: currentFrontLock,
    onDragStart(fromId) {
      frontClampHint.reset();
      const row = box.querySelector('[data-song-id="' + fromId + '"]');
      if (row) row.classList.add("is-lifted");
      tickAutoScroll();
    },
    onDragMove(motion) {
      if (!motion) return;
      paintPointerMotion(box, motion.fromId, motion, false);
    },
    async onSettle(motion) {
      stopAutoScroll();
      if (!motion) return;
      const lifted =
        box.querySelector('[data-song-id="' + motion.fromId + '"]') ||
        box.querySelector(".q-row.is-lifted");
      const reduced = prefersReducedMotion();
      paintPointerMotion(box, motion.fromId, motion, false);
      if (lifted) lifted.getBoundingClientRect();
      paintPointerMotion(box, motion.fromId, motion, true);
      await waitForRowSettle(lifted, reduced);
      maybeHintFrontClamp(motion && motion.clampedToNext);
    },
    onDragEnd(info) {
      stopAutoScroll();
      lastPointer = null;
      if (!(info && info.keepPaint)) clearDragMarks(box);
    },
    commit: applyOrderIds,
  });

  box.querySelectorAll("[data-row] .drag-handle").forEach((handle) => {
    const row = handle.closest("[data-row]");
    const songId = Number(row && row.getAttribute("data-song-id"));
    if (!Number.isFinite(songId)) return;
    handle.addEventListener("pointerdown", (ev) => {
      // This path is only wired when HTML5 DnD is off, so accept every pointer type
      // (some mobile webviews report mouse, or a narrow desktop window has no HTML5 path).
      lastPointer = ev;
      pointerDrag.onPointerDown(ev, songId);
      try {
        handle.setPointerCapture(ev.pointerId);
      } catch (_) {
        /* capture is best-effort */
      }
    });
    handle.addEventListener("pointermove", (ev) => {
      lastPointer = ev;
      pointerDrag.onPointerMove(ev);
    });
    handle.addEventListener("pointerup", (ev) => {
      lastPointer = ev;
      pointerDrag.onPointerUp(ev);
    });
    handle.addEventListener("pointercancel", () => {
      lastPointer = null;
      stopAutoScroll();
      pointerDrag.cancel();
    });
  });
}

function wireHtml5Reorder(box) {
  const lockedId = currentFrontLock();
  box.querySelectorAll("[data-row]").forEach((row) => {
    const songId = Number(row.getAttribute("data-song-id"));
    const locked = lockedId != null && songId === Number(lockedId);
    row.setAttribute("draggable", locked ? "false" : "true");
    if (locked) row.draggable = false;

    // Buttons inside a draggable row must stay clickable.
    row.querySelectorAll(".actions-row, button, a, input").forEach((el) => {
      el.addEventListener("mousedown", () => {
        row.draggable = false;
      });
      el.addEventListener("mouseup", () => {
        if (!locked) row.draggable = true;
      });
      el.addEventListener("mouseleave", () => {
        if (!locked) row.draggable = true;
      });
    });

    if (locked) {
      row.addEventListener("dragstart", (ev) => {
        ev.preventDefault();
      });
    } else {
      row.addEventListener("dragstart", (ev) => {
        frontClampHint.reset();
        dragId = songId;
        row.classList.add("dragging");
        try {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", String(songId));
        } catch (_) {
          /* older webviews */
        }
      });
    }

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      if (!locked) row.draggable = true;
      box.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      markDropAfterFront(box, false);
      dragId = null;
    });

    row.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      const overLocked = lockedId != null && songId === Number(lockedId);
      if (overLocked) {
        row.classList.remove("drag-over");
        markDropAfterFront(box, true);
      } else {
        markDropAfterFront(box, false);
        row.classList.add("drag-over");
      }
      try {
        ev.dataTransfer.dropEffect = overLocked ? "none" : "move";
      } catch (_) {
        /* ignore */
      }
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
      if (lockedId != null && songId === Number(lockedId)) markDropAfterFront(box, false);
    });

    row.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      row.classList.remove("drag-over");
      markDropAfterFront(box, false);
      const toId = Number(row.getAttribute("data-song-id"));
      const fromId = dragId != null ? dragId : Number(ev.dataTransfer.getData("text/plain"));
      await applyOrder(fromId, toId);
    });
  });
}

function wireDragAndDrop(box) {
  const html5 = useHtml5RowDrag({
    pointerFine: window.matchMedia("(pointer: fine)").matches,
    mobile: isMobile(),
  });
  if (html5) {
    pointerDrag = null;
    wireHtml5Reorder(box);
  } else {
    box.querySelectorAll("[data-row]").forEach((row) => {
      row.setAttribute("draggable", "false");
    });
    wirePointerReorder(box);
  }
}

async function applyOrder(fromId, toId) {
  const ids = (getData().queueSongs || []).map((s) => s.id);
  const result = planReorderResult(ids, fromId, toId, currentFrontLock());
  if (result.blocked) return;
  maybeHintFrontClamp(result.clampedToNext);
  if (!result.next) return;
  maybeHintMovedToFirst(ids, result.next, fromId);
  await reorderQueue(result.next);
}

async function applyOrderIds(nextIds) {
  const before = (getData().queueSongs || []).map((s) => s.id);
  let next = (Array.isArray(nextIds) ? nextIds : []).map(Number).filter(Number.isFinite);
  if (!next.length) return;
  const locked = currentFrontLock();
  if (locked && next[0] !== locked) {
    const seen = new Set();
    const fixed = [];
    for (const id of [locked, ...next]) {
      if (seen.has(id)) continue;
      seen.add(id);
      fixed.push(id);
    }
    next = fixed;
    maybeHintFrontClamp(true);
  } else {
    maybeHintMovedToFirst(before, next, next[0]);
  }
  await reorderQueue(next);
}

function scrollQueueListToTop() {
  const box = $("queueList");
  if (box) box.scrollTop = 0;
}

function flashPinnedRow(songId) {
  const box = $("queueList");
  if (!box) return;
  const row =
    box.querySelector('[data-song-id="' + Number(songId) + '"]') ||
    box.querySelector("[data-row]");
  if (!row) return;
  row.classList.remove("is-pin-flash");
  void row.offsetWidth;
  row.classList.add("is-pin-flash");
}

/**
 * Animate an existing row flying to index 0, using the same settle language
 * as drag-reorder, then the caller re-renders the new order.
 */
async function animatePinToFront(songId) {
  const box = $("queueList");
  if (!box) return;
  const id = Number(songId);
  const row = Number.isFinite(id) ? box.querySelector('[data-song-id="' + id + '"]') : null;
  if (!row) return;
  const reduced = prefersReducedMotion();
  const slots = rowSlotsFromBoxes(rowBoxes(box));
  const motion = planPinToFrontMotion(slots, id);
  if (motion.kind !== "move") return;
  row.classList.add("is-lifted");
  paintPointerMotion(box, id, motion, false);
  row.getBoundingClientRect();
  paintPointerMotion(box, id, motion, true);
  await waitForRowSettle(row, reduced);
  clearDragMarks(box);
}

function syncQueueFrontLock() {
  const box = $("queueList");
  if (!box || (pointerDrag && pointerDrag.isActive())) return;
  const lockedId = currentFrontLock();
  const html5 = useHtml5RowDrag({
    pointerFine: window.matchMedia("(pointer: fine)").matches,
    mobile: isMobile(),
  });
  box.querySelectorAll("[data-row]").forEach((row) => {
    const songId = Number(row.getAttribute("data-song-id"));
    const locked = lockedId != null && songId === Number(lockedId);
    row.classList.toggle("is-front-locked", locked);
    if (html5) {
      row.setAttribute("draggable", locked ? "false" : "true");
      row.draggable = !locked;
    }
    const handle = row.querySelector(".drag-handle");
    if (!handle) return;
    handle.classList.toggle("drag-handle--locked", locked);
    if (locked) {
      handle.setAttribute("title", FRONT_LOCKED_LABEL);
      handle.setAttribute("aria-label", FRONT_LOCKED_LABEL);
      handle.removeAttribute("aria-hidden");
    } else {
      handle.setAttribute("title", "拖拽排序");
      handle.setAttribute("aria-hidden", "true");
      handle.removeAttribute("aria-label");
    }
  });
}

export function bindQueuePanel() {
  onQueueViewChange(() => renderQueue());
  Playback.onChange(() => {
    syncQueueFrontLock();
    void maybeRepairPlayheadOrder();
  });
  onEnsureQueueVisible(() => setQueueOpen(true));
  setQueuePinRunner(async (phase, songId) => {
    if (phase === "before") {
      await animatePinToFront(songId);
      return;
    }
    if (phase === "after") {
      scrollQueueListToTop();
      flashPinnedRow(songId);
    }
  });
  const panel = $("queuePanel");
  const backdrop = $("queueBackdrop");
  if (backdrop) backdrop.addEventListener("click", () => setQueueOpen(false));

  const grab = $("queueGrab");
  if (grab) {
    grab.addEventListener("click", () => {
      if (isMobile()) setQueueOpen(false);
    });
  }

  const btnTop = $("btnToggleQueue");
  if (btnTop) btnTop.addEventListener("click", () => toggleQueue());

  const menuBtn = $("btnQueueMenu");
  if (menuBtn) {
    menuBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      togglePopover(menuBtn.closest(".more-wrap"));
    });
  }

  if (panel) {
    panel.querySelectorAll("[data-queue-act]").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        closePopovers();
        const act = btn.getAttribute("data-queue-act");
        if (act === "select") setSelectMode(!selectState.mode);
        else if (act === "remove-played") await removePlayed();
        else if (act === "cast-all") await castQueueToSpeaker();
        else if (act === "refresh") {
          renderQueue();
          await reloadQueue();
          renderQueue();
        }
        else if (act === "replace") await replaceQueueAndPlay();
        else if (act === "clear") await clearQueue();
      });
    });
  }

  const cancel = $("btnQueueSelectCancel");
  if (cancel) cancel.addEventListener("click", () => setSelectMode(false));

  const del = $("btnQueueDeleteSelected");
  if (del) {
    del.addEventListener("click", async () => {
      const ids = Array.from(selectState.ids);
      if (!ids.length) return;
      const ok = await uiConfirm({
        title: "删除所选",
        message: `从「播客」列表删除选中的 ${ids.length} 首？`,
        okText: "删除",
        danger: true,
      });
      if (!ok) return;
      const r = await removeSongs(ids);
      if (r && r.ok !== false) {
        notify(`已删除 ${ids.length} 首`, "ok");
        setSelectMode(false);
      }
    });
  }

  // Desktop keeps the panel visible; mobile starts closed.
  if (isMobile()) setQueueOpen(false);
  else setQueueOpen(true);

  // Keep state sane when the viewport crosses the mobile breakpoint.
  let wasMobile = isMobile();
  window.addEventListener(
    "resize",
    () => {
      const nowMobile = isMobile();
      if (nowMobile === wasMobile) return;
      wasMobile = nowMobile;
      setQueueOpen(!nowMobile);
    },
    { passive: true }
  );
}

export function isSelectMode() {
  return selectState.mode;
}
