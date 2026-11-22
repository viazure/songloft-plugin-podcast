/** 「更新」tab（页内标题「最近更新」）: 订阅频道新上架的单集，不是收听记录. */

import { $, escapeHtml } from "../lib/dom.js";
import { dateGroupKey } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { notify, onQueueChange, reloadRecent, reloadSubs } from "../lib/actions.js";
import { api } from "../lib/api.js";
import {
  REFRESH_BUSY_TOAST,
  REFRESH_STILL_RUNNING_TOAST,
  applyRefreshButtonBusy,
  applyRefreshHint,
  humanizeRefreshFailure,
  isFeedRefreshing,
  isSkippedBusy,
  onFeedRefreshState,
  runFeedRefresh,
  trackRemoteRefreshBusy,
  waitUntilFeedRefreshIdle,
  wrapRefreshCall,
} from "../lib/feedRefresh.js";
import { markFeedSynced } from "../lib/uiCache.js";
import {
  buildQueueIndex,
  queueButtonAttrs,
  queueButtonState,
  queueMenuAttrs,
  repaintQueueButtons,
} from "../lib/queueMembership.js";
import { bindRowInteractions } from "./row-events.js";

/**
 * Stable signature of the「最近更新」list. Queue membership is intentionally
 * left out: those buttons are repainted in place, and a periodic sync must
 * not rebuild the whole DOM (and flash covers) just because the queue moved.
 */
export function recentListSignature(items) {
  if (!Array.isArray(items) || !items.length) return "empty";
  return items
    .map((ep) => {
      const prog = (ep && ep.progress) || {};
      return [
        (ep && ep.feedUrl) || "",
        (ep && ep.guid) || "",
        (ep && ep.title) || "",
        (ep && ep.favorited) ? "1" : "0",
        (ep && ep.coverUrl) || "",
        prog.completed ? "1" : "0",
        prog.positionSec || 0,
        (ep && (ep.pubDateMs || ep.pubDate)) || "",
      ].join("\t");
    })
    .join("\n");
}

function actionsFor(ep, idx, index) {
  const queueState = queueButtonState(ep, index);
  return moreMenuHtml(
    [
      {
        key: "queue",
        label: queueState.label,
        iconName: queueState.iconName,
        attrs: queueMenuAttrs(ep, index, idx),
      },
      { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
    ],
    "recent-" + idx
  );
}

export function renderRecent() {
  const box = $("recentList");
  if (!box) return;
  const items = getData().recent || [];
  const sig = recentListSignature(items);
  if (box.dataset.renderSig === sig) return;
  box.dataset.renderSig = sig;
  box.classList.remove("is-skeleton");
  if (!items.length) {
    // Boot may still be fetching cache; avoid flashing the permanent empty copy.
    if (box.dataset.bootPending === "1") return;
    box.innerHTML = '<div class="empty">还没有更新。先在「订阅」里添加频道。</div>';
    return;
  }
  delete box.dataset.bootPending;
  const queueIndex = buildQueueIndex(getData().queueSongs);

  const groups = new Map();
  items.forEach((ep, idx) => {
    const ms = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : 0);
    const key = dateGroupKey(ms);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ep, idx });
  });

  box.innerHTML = Array.from(groups.entries())
    .map(([label, rows]) => {
      const cards = rows
        .map(({ ep, idx }) => {
          const queueState = queueButtonState(ep, queueIndex);
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
              {
                act: "fav",
                iconName: "star",
                title: "收藏",
                cls: "icon-btn--star",
                attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`,
              },
            ],
            moreHtml: actionsFor(ep, idx, queueIndex),
          });
        })
        .join("");
      return (
        `<div class="date-group">` +
        `<div class="date-label">${escapeHtml(label)}</div>` +
        cards +
        `</div>`
      );
    })
    .join("");

  bindRowInteractions(box, items);
}

/**
 * Keep「加入播放列表」/「已在播放列表」in step with the queue without re-rendering
 * the list (a full render would collapse open menus and jump the scroll).
 */
let unbindQueueRepaint = null;
export function bindRecentQueueState() {
  if (unbindQueueRepaint) return;
  unbindQueueRepaint = onQueueChange((index) => {
    const box = $("recentList");
    if (!box) return;
    repaintQueueButtons(box, index);
  });
}

/** Shared feed refresh used by the toolbar and the once-per-page-open boot path. */
export function requestFeedRefresh({ quietBusy = false } = {}) {
  if (isFeedRefreshing()) return Promise.resolve({ noop: true });
  return runFeedRefresh({
    refreshAll: () => wrapRefreshCall(() => api.refreshAll()),
    afterRefresh: async (r) => {
      if (!r || r.noop) return;
      if (!r.ok && (r.skipped || isSkippedBusy(r))) {
        // Looked idle at click time but server lock was held.
        if (!quietBusy) notify(REFRESH_BUSY_TOAST, "warn");
        await trackRemoteRefreshBusy(api);
        return;
      }
      if (r.started) {
        const wait = await waitUntilFeedRefreshIdle(api);
        if (wait.timedOut) {
          if (!quietBusy) notify(REFRESH_STILL_RUNNING_TOAST, "warn");
          return;
        }
      }
      await reloadRecent();
      await reloadSubs();
      markFeedSynced();
      // No success toast when feeds are already up to date / async accept has no "added" count.
      if (!quietBusy && r.ok === false && !r.started && !isSkippedBusy(r)) {
        notify(humanizeRefreshFailure(r, "部分刷新失败"), "warn");
      }
    },
  });
}

/** Wire the recent toolbar (refresh only; the old「全部加入」was removed). */
export function bindRecentToolbar() {
  const btn = $("btnRecentRefresh");
  const hint = $("recentRefreshHint");
  if (!btn) return;

  onFeedRefreshState((busy) => {
    applyRefreshButtonBusy(btn, busy);
    applyRefreshHint(hint, busy);
  });

  btn.addEventListener("click", async () => {
    if (isFeedRefreshing()) return;
    try {
      const r = await requestFeedRefresh({ quietBusy: false });
      if (r && r.noop) return;
      renderRecent();
    } catch (e) {
      if (isSkippedBusy(e)) {
        notify(REFRESH_BUSY_TOAST, "warn");
        void trackRemoteRefreshBusy(api);
        return;
      }
      notify(humanizeRefreshFailure(e), "err");
    }
  });
}

export { actionsFor };
