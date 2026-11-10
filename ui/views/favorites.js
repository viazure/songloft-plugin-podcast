/** 「收藏」view with instant client-side search. */

import { $, escapeHtml } from "../lib/dom.js";
import { matchesQuery } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { bindRowInteractions } from "./row-events.js";
import { reloadFavorites, toggleFavorite } from "../lib/actions.js";

let query = "";

function filtered(items) {
  if (!query.trim()) return items;
  return items.filter(
    (ep) => matchesQuery(ep.title, query) || matchesQuery(ep.showTitle, query)
  );
}

export function renderFavorites() {
  const box = $("favList");
  if (!box) return;
  const all = getData().favorites || [];
  if (!all.length) {
    box.innerHTML = '<div class="empty">还没有收藏。在「更新」里点星标即可。</div>';
    syncClearButton();
    return;
  }

  const items = filtered(all);
  if (!items.length) {
    box.innerHTML = `<div class="empty">没有匹配「${escapeHtml(query)}」的收藏。</div>`;
    syncClearButton();
    return;
  }

  box.innerHTML = items
    .map((ep, idx) => {
      const more = moreMenuHtml(
        [
          { key: "queue", label: "加入播放列表", iconName: "listPlus", attrs: `data-idx="${idx}"` },
          { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
          { key: "unfav", label: "取消收藏", iconName: "star", danger: true, attrs: `data-idx="${idx}"` },
        ],
        "fav-" + idx
      );
      return episodeRowHtml(ep, idx, {
        showDate: false,
        channelLink: true,
        actions: [{ act: "queue", iconName: "listPlus", title: "加入播放列表" }],
        moreHtml: more,
      });
    })
    .join("");

  bindRowInteractions(box, items, {
    unfav: async (ep) => {
      await toggleFavorite({ ...ep, favorited: true }, null);
      await reloadFavorites();
      renderFavorites();
    },
  });
  syncClearButton();
}

function syncClearButton() {
  const clear = $("favSearchClear");
  if (clear) clear.classList.toggle("hidden", !query.trim());
}

export function bindFavoritesToolbar() {
  const input = $("favSearch");
  const clear = $("favSearchClear");
  if (!input) return;
  input.addEventListener("input", () => {
    query = input.value;
    renderFavorites();
  });
  if (clear) {
    clear.addEventListener("click", () => {
      query = "";
      input.value = "";
      renderFavorites();
      input.focus();
    });
  }
}

export function getFavoritesQuery() {
  return query;
}
