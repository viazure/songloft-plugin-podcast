/** 「更新」tab（页内标题「最近更新」）: 订阅频道新上架的单集，不是收听记录. */

import { $, escapeHtml } from "../lib/dom.js";
import { dateGroupKey } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { notify, reloadRecent, reloadSubs } from "../lib/actions.js";
import { api } from "../lib/api.js";
import { bindRowInteractions } from "./row-events.js";

function actionsFor(ep, idx) {
  return moreMenuHtml(
    [
      { key: "queue", label: "加入播放列表", iconName: "listPlus", attrs: `data-idx="${idx}"` },
      { key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` },
    ],
    "recent-" + idx
  );
}

export function renderRecent() {
  const box = $("recentList");
  if (!box) return;
  const items = getData().recent || [];
  if (!items.length) {
    box.innerHTML = '<div class="empty">还没有更新。先在「订阅」里添加频道。</div>';
    return;
  }

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
        .map(({ ep, idx }) =>
          episodeRowHtml(ep, idx, {
            showDate: false,
            channelLink: true,
            actions: [
              {
                act: "queue",
                iconName: "listPlus",
                title: "加入播放列表",
              },
              {
                act: "fav",
                iconName: "star",
                title: "收藏",
                cls: "icon-btn--star",
                attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`,
              },
            ],
            moreHtml: actionsFor(ep, idx),
          })
        )
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

/** Wire the recent toolbar (refresh only; the old「全部加入」was removed). */
export function bindRecentToolbar() {
  const btn = $("btnRecentRefresh");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const r = await api.refreshAll();
      if (!r.ok && r.skipped) notify("忙碌中，请稍后", "warn");
      else notify(r.ok ? "已刷新" : "部分刷新失败", r.ok ? "ok" : "warn");
      await reloadRecent();
      await reloadSubs();
    } catch (e) {
      notify(String(e), "err");
    } finally {
      btn.disabled = false;
    }
  });
}

export { actionsFor };
