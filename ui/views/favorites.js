/** 「收藏」view with instant client-side search. */

import { $, escapeHtml } from "../lib/dom.js";
import { matchesQuery } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import {
  buildQueueIndex,
  queueButtonAttrs,
  queueButtonState,
  queueMenuAttrs,
  repaintQueueButtons,
} from "../lib/queueMembership.js";
import { bindRowInteractions } from "./row-events.js";
import { onQueueChange, reloadFavorites, toggleFavorite } from "../lib/actions.js";

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
  const queueIndex = buildQueueIndex(getData().queueSongs);

  box.innerHTML = items
    .map((ep, idx) => {
      const queueState = queueButtonState(ep, queueIndex);
      const more = moreMenuHtml(
        [
          {
            key: "queue",
            label: queueState.label,
            iconName: queueState.iconName,
            attrs: queueMenuAttrs(ep, queueIndex, idx),
          },
          { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
          { key: "unfav", label: "取消收藏", iconName: "star", danger: true, attrs: `data-idx="${idx}"` },
        ],
        "fav-" + idx
      );
      return episodeRowHtml(ep, idx, {
        showDate: false,
        channelLink: true,
        actions: [
          {
            act: "queue",
            iconName: queueState.iconName,
            title: queueState.label,
            cls: queueState.inQueue ? "is-in-queue" : "",
            attrs: queueButtonAttrs(ep, queueIndex),
          },
        ],
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

/** In-place queue button state (no re-render). */
let unbindQueueRepaint = null;
export function bindFavoritesQueueState() {
  if (unbindQueueRepaint) return;
  unbindQueueRepaint = onQueueChange((index) => {
    const box = $("favList");
    if (!box) return;
    repaintQueueButtons(box, index);
  });
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
