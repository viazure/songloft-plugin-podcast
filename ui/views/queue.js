/**
 * 「播放列表」view.
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
  castToSpeaker,
  clearQueue,
  notify,
  reloadQueue,
  removePlayed,
  removeSongs,
  reorderQueue,
  replaceQueueAndPlay,
  toggleFavorite,
} from "../lib/actions.js";
import { closePopovers, togglePopover, uiConfirm } from "../lib/modal.js";
import { bindRowInteractions } from "./row-events.js";

const selectState = { mode: false, ids: new Set() };
let dragId = null;

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
  const label = open ? "隐藏播放列表" : "显示播放列表";
  const btnTop = $("btnToggleQueue");
  if (btnTop) {
    btnTop.setAttribute("aria-pressed", open ? "true" : "false");
    btnTop.setAttribute("title", label);
    btnTop.setAttribute("aria-label", label);
    setButtonIcon(btnTop, open ? "panelRightClose" : "panelRight", 17);
  }
  const btnInline = $("btnToggleQueueInline");
  if (btnInline) {
    btnInline.setAttribute("aria-pressed", open ? "true" : "false");
    btnInline.setAttribute("title", label);
    btnInline.setAttribute("aria-label", label);
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

  if (!songs.length) {
    box.innerHTML = '<div class="empty">播放列表为空。在「更新」里加入单集。</div>';
    syncSelectUi();
    return;
  }

  box.innerHTML = songs
    .map((s, idx) => {
      const selected = selectState.ids.has(s.id);
      const lead = selectState.mode
        ? `<input type="checkbox" class="sel-box" data-sel="${s.id}" ${
            selected ? "checked" : ""
          } aria-label="选择" />`
        : `<span class="drag-handle" title="拖拽排序" aria-hidden="true">${icon("gripVertical", 16)}</span>`;

      const more = moreMenuHtml(
        [
          { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove",
            label: "从播放列表移除",
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
          extraClass: "q-row",
          leadHtml: lead,
          actions: [
            {
              act: "fav",
              iconName: "star",
              title: "收藏",
              cls: "icon-btn--star",
              attrs:
                `aria-pressed="${s.favorited ? "true" : "false"}" ` +
                (s.feedUrl && s.guid ? "" : "disabled"),
            },
          ],
          moreHtml: selectState.mode ? "" : more,
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
    remove: async (ep, idx) => {
      const id = songs[idx] && songs[idx].id;
      if (id == null) return;
      await removeSongs([id]);
    },
    cast: async (ep, idx) => {
      const song = songs[idx];
      if (!song) return;
      await castToSpeaker(song.id);
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
  syncSelectUi();
}

function wireDragAndDrop(box) {
  box.querySelectorAll("[data-row]").forEach((row) => {
    const songId = Number(row.getAttribute("data-song-id"));
    row.setAttribute("draggable", "true");

    // Buttons inside a draggable row must stay clickable.
    row.querySelectorAll(".actions-row, button, a, input").forEach((el) => {
      el.addEventListener("mousedown", () => {
        row.draggable = false;
      });
      el.addEventListener("mouseup", () => {
        row.draggable = true;
      });
      el.addEventListener("mouseleave", () => {
        row.draggable = true;
      });
    });

    row.addEventListener("dragstart", (ev) => {
      dragId = songId;
      row.classList.add("dragging");
      try {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(songId));
      } catch (_) {
        /* older webviews */
      }
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      row.draggable = true;
      box.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      dragId = null;
    });

    row.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      row.classList.add("drag-over");
      try {
        ev.dataTransfer.dropEffect = "move";
      } catch (_) {
        /* ignore */
      }
    });

    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));

    row.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      row.classList.remove("drag-over");
      const toId = Number(row.getAttribute("data-song-id"));
      const fromId = dragId != null ? dragId : Number(ev.dataTransfer.getData("text/plain"));
      await applyOrder(fromId, toId);
    });
  });
}

async function applyOrder(fromId, toId) {
  if (fromId == null || toId == null || fromId === toId) return;
  const ids = (getData().queueSongs || []).map((s) => s.id);
  const from = ids.indexOf(fromId);
  if (from < 0 || ids.indexOf(toId) < 0) return;
  const next = ids.slice();
  const [moved] = next.splice(from, 1);
  const insertAt = next.indexOf(toId);
  if (insertAt < 0) return;
  next.splice(insertAt, 0, moved);
  await reorderQueue(next);
}

export function bindQueuePanel() {
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
  const btnInline = $("btnToggleQueueInline");
  if (btnInline) btnInline.addEventListener("click", () => toggleQueue());

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
        else if (act === "refresh") await reloadQueue();
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
        message: `从播放列表删除选中的 ${ids.length} 首？`,
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
