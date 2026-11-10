/** 「历史」tab（页内标题「收听历史」）: 你听过的记录，不是频道新上架. */

import { $, escapeHtml, setHidden } from "../lib/dom.js";
import { matchesQuery } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { setButtonIcon } from "../lib/icons.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { bindRowInteractions } from "./row-events.js";
import {
  batchDeleteHistoryItems,
  clearPlayHistory,
  reloadHistory,
  removeHistoryItem,
  setHistoryChangeHandler,
  notify,
} from "../lib/actions.js";

/**
 * "已听完" matches the list badge / progress SoT:
 * sticky `completed`, or position within COMPLETED_NEAR_END_SEC (3s) of duration.
 */
const COMPLETED_NEAR_END_SEC = 3;

let query = "";
/** @type {"all" | "completed"} */
let filter = "all";
const selectState = { mode: false, keys: new Set() };

function entryKey(entry) {
  return `${entry.feedUrl}::${entry.guid}`;
}

function isCompletedEntry(entry) {
  if (entry && entry.completed) return true;
  const pos = Number(entry && entry.positionSec) || 0;
  const dur = Number(entry && entry.durationSec) || 0;
  return dur > 0 && pos >= dur - COMPLETED_NEAR_END_SEC;
}

function filtered(items) {
  let list = items || [];
  if (filter === "completed") list = list.filter(isCompletedEntry);
  if (query.trim()) {
    list = list.filter(
      (h) => matchesQuery(h.title, query) || matchesQuery(h.showTitle, query)
    );
  }
  return list;
}

/**
 * History rows are `HistoryEntry` shaped, not `Episode` shaped. Normalise the
 * few fields the shared row renderer reads, and surface the played-at time in
 * the date slot so the list reads as a timeline.
 */
function toRowItem(entry) {
  return {
    ...entry,
    // `progress` drives the badge; history keeps the highest position reached.
    progress: {
      positionSec: entry.positionSec || 0,
      durationSec: entry.durationSec || null,
      completed: isCompletedEntry(entry),
    },
    // Reuse the date column for "played at".
    pubDateMs: entry.playedAt || null,
    pubDate: null,
  };
}

function syncSelectUi() {
  const bar = $("historySelectBar");
  const del = $("btnHistoryDeleteSelected");
  const count = $("historySelectCount");
  const toggle = $("btnHistorySelect");
  setHidden(bar, !selectState.mode);
  if (del) del.disabled = selectState.keys.size === 0;
  if (count) {
    count.textContent = selectState.mode
      ? selectState.keys.size
        ? `已选 ${selectState.keys.size} 条`
        : "点选条目"
      : "";
  }
  if (toggle) {
    toggle.classList.toggle("is-on", selectState.mode);
    toggle.setAttribute("aria-pressed", selectState.mode ? "true" : "false");
    toggle.title = selectState.mode ? "退出多选" : "多选";
    setButtonIcon(toggle, "listChecks", 16);
  }
}

function setSelectMode(on) {
  selectState.mode = !!on;
  if (!on) selectState.keys.clear();
  syncSelectUi();
  renderHistory();
}

function syncSearchClear() {
  const clear = $("historySearchClear");
  if (clear) clear.classList.toggle("hidden", !query.trim());
}

export function renderHistory() {
  const box = $("historyList");
  if (!box) return;
  const all = getData().history || [];
  if (!all.length) {
    box.innerHTML = '<div class="empty">还没有收听记录</div>';
    syncSelectUi();
    return;
  }

  const items = filtered(all);
  if (!items.length) {
    box.innerHTML = `<div class="empty">${
      filter === "completed" && !query.trim()
        ? "没有已听完的记录"
        : "没有匹配的记录"
    }</div>`;
    syncSelectUi();
    return;
  }

  const rows = items.map(toRowItem);

  box.innerHTML = rows
    .map((entry, idx) => {
      const key = entryKey(entry);
      const lead = selectState.mode
        ? `<input type="checkbox" class="sel-box" data-sel-key="${escapeHtml(key)}" ${
            selectState.keys.has(key) ? "checked" : ""
          } aria-label="选择" />`
        : "";

      const more = moreMenuHtml(
        [
          { key: "queue", label: "加入播放列表", iconName: "listPlus", attrs: `data-idx="${idx}"` },
          { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove-history",
            label: "从历史中移除",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`,
          },
        ],
        "history-" + idx
      );
      return episodeRowHtml(entry, idx, {
        // Show "played at" rather than the episode's publish date.
        showDate: true,
        channelLink: true,
        leadHtml: lead,
        actions: selectState.mode
          ? []
          : [
              {
                act: "fav",
                iconName: "star",
                title: "收藏",
                cls: "icon-btn--star",
                attrs: `aria-pressed="${entry.favorited ? "true" : "false"}"`,
              },
            ],
        moreHtml: selectState.mode ? "" : more,
      });
    })
    .join("");

  if (selectState.mode) {
    box.querySelectorAll("input[data-sel-key]").forEach((input) => {
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-sel-key");
        if (!key) return;
        if (input.checked) selectState.keys.add(key);
        else selectState.keys.delete(key);
        syncSelectUi();
      });
    });
    box.querySelectorAll("[data-row]").forEach((row) => {
      row.addEventListener("click", (ev) => {
        if (ev.target instanceof Element && ev.target.closest("input")) return;
        const input = row.querySelector("input[data-sel-key]");
        if (!input) return;
        input.checked = !input.checked;
        const key = input.getAttribute("data-sel-key");
        if (!key) return;
        if (input.checked) selectState.keys.add(key);
        else selectState.keys.delete(key);
        syncSelectUi();
      });
    });
    syncSelectUi();
    return;
  }

  bindRowInteractions(box, rows, {
    "remove-history": async (entry, idx) => {
      const target = rows[idx];
      if (!target) return;
      const ok = await removeHistoryItem(target);
      if (ok) {
        notify("已从历史中移除", "ok");
        renderHistory();
      }
    },
  });
  syncSelectUi();
}

export function bindHistoryToolbar() {
  const clear = $("btnClearHistory");
  if (clear) {
    clear.addEventListener("click", async () => {
      const ok = await clearPlayHistory();
      if (ok) {
        setSelectMode(false);
        renderHistory();
      }
    });
  }

  const input = $("historySearch");
  const searchClear = $("historySearchClear");
  if (input) {
    input.addEventListener("input", () => {
      query = input.value;
      syncSearchClear();
      renderHistory();
    });
  }
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      query = "";
      if (input) input.value = "";
      syncSearchClear();
      renderHistory();
    });
  }

  const completedOnly = $("historyCompletedOnly");
  if (completedOnly) {
    completedOnly.checked = filter === "completed";
    completedOnly.setAttribute("aria-checked", completedOnly.checked ? "true" : "false");
    completedOnly.addEventListener("change", () => {
      filter = completedOnly.checked ? "completed" : "all";
      completedOnly.setAttribute("aria-checked", completedOnly.checked ? "true" : "false");
      renderHistory();
    });
  }

  const selectBtn = $("btnHistorySelect");
  if (selectBtn) {
    selectBtn.addEventListener("click", () => setSelectMode(!selectState.mode));
  }
  const cancel = $("btnHistorySelectCancel");
  if (cancel) cancel.addEventListener("click", () => setSelectMode(false));

  const del = $("btnHistoryDeleteSelected");
  if (del) {
    del.addEventListener("click", async () => {
      const all = getData().history || [];
      const selected = all.filter((h) => selectState.keys.has(entryKey(h)));
      if (!selected.length) return;
      const ok = await batchDeleteHistoryItems(selected);
      if (ok) {
        setSelectMode(false);
        renderHistory();
      }
    });
  }

  // Playback writes history; repaint when that happens and this tab is visible.
  setHistoryChangeHandler(() => {
    if (!$("tab-history") || $("tab-history").classList.contains("hidden")) return;
    renderHistory();
  });
}

/** Called when switching to the tab. */
export async function loadHistoryView() {
  await reloadHistory();
  renderHistory();
}
