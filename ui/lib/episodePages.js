/**
 * Client helpers for the channel episode list: paging and history-index copy.
 * Does not talk to the host or mutate waitlist / progress / favorites.
 */

export const EPISODE_PAGE_SIZE = 20;

/** Single rendered/request page ceiling. Decoupled from the history safety cap. */
export const MAX_EPISODE_PAGE = 100;

/** Confirm before dumping a large indexed list into the waitlist. */
export const ADD_ALL_CONFIRM_THRESHOLD = 50;

export const DEFAULT_HISTORY_INDEX_LIMIT = 2000;

/** Toast after history index finishes with nothing more to pull. */
export const HISTORY_INDEX_COMPLETE_TOAST = "已按源里现有节目收录，更早的无法找回。";

/** Toast when a channel refresh finds no newer episodes. */
export const REFRESH_UP_TO_DATE_TOAST = "已是最新";

export function pageEpisodes(episodes, offset = 0, limit = EPISODE_PAGE_SIZE) {
  const list = Array.isArray(episodes) ? episodes : [];
  const off = Math.max(0, Math.floor(Number(offset) || 0));
  const hasLimit = limit != null && limit !== "" && Number.isFinite(Number(limit));
  const remaining = Math.max(0, list.length - off);
  const lim = hasLimit
    ? Math.max(1, Math.min(MAX_EPISODE_PAGE, Math.floor(Number(limit) || EPISODE_PAGE_SIZE)))
    : remaining;
  const items = list.slice(off, off + lim);
  return {
    items,
    offset: off,
    limit: hasLimit ? lim : items.length,
    total: list.length,
    hasMore: off + items.length < list.length,
    nextOffset: off + items.length,
    shown: Math.min(off + items.length, list.length),
  };
}

/** Keep already-rendered rows when the full list is replaced after an index/refresh. */
export function preservedRenderCount({ previousShown, previousSubId, nextSubId, nextTotal } = {}) {
  if (previousSubId && nextSubId && String(previousSubId) !== String(nextSubId)) return 0;
  const shown = Math.max(0, Math.floor(Number(previousShown) || 0));
  const total = Math.max(0, Math.floor(Number(nextTotal) || 0));
  if (!shown) return 0;
  return Math.min(shown, total);
}

export function shouldConfirmAddAll(count) {
  return (Number(count) || 0) > ADD_ALL_CONFIRM_THRESHOLD;
}

export function addAllConfirmCopy(count, cap = DEFAULT_HISTORY_INDEX_LIMIT) {
  const n = Number(count) || 0;
  const limit = Number(cap) || DEFAULT_HISTORY_INDEX_LIMIT;
  return `将把 ${n} 集全部加入「播客」列表（追加到末尾，不会改动正在播放的顺序）。数量较多（本地最多可索引 ${limit} 集），确定要一次加入整表吗？取消则不会加入。`;
}

function episodeLabel(ep) {
  if (!ep) return "";
  const t = typeof ep.title === "string" ? ep.title.trim() : "";
  return t || (typeof ep.pubDate === "string" ? ep.pubDate : "") || "";
}

export function retainedRangeCopy(range) {
  if (!range || !range.newest || !range.oldest) return "";
  const a = episodeLabel(range.newest);
  const b = episodeLabel(range.oldest);
  if (!a && !b) return "";
  if (a === b) return `（已保留《${a}》）`;
  return `（已保留从《${a}》到《${b}》）`;
}

/**
 * Inline status under the channel actions.
 * Successful uncapped index stays blank here (the completion toast carries the tip).
 */
export function historyIndexCopy(info = {}) {
  const status = info.status || "idle";
  const indexed = Number(info.indexedCount) || 0;
  const feed = Number(info.feedAvailableCount) || 0;
  const cap = Number(info.cap) || DEFAULT_HISTORY_INDEX_LIMIT;
  if (status === "running") {
    return { tone: "busy", text: "正在索引该频道的历史节目…" };
  }
  if (status === "error") {
    return { tone: "err", text: info.error ? `索引失败：${info.error}` : "索引失败，可以重试" };
  }
  if (status === "success" && info.capped) {
    if (info.earliestKept === true || info.earliestConfirmed === true) {
      return {
        tone: "ok",
        text: `源中共 ${feed} 集，本地安全上限 ${cap}，已保留最近 ${Math.max(0, cap - 1)} 集和最早一集，中间未收录`,
      };
    }
    return {
      tone: "ok",
      text: `源中共 ${feed} 集，本地安全上限 ${cap}，未能确认第一期，已保留最近 ${indexed} 集${retainedRangeCopy(info.retainedRange)}`,
    };
  }
  if (status === "success") {
    // Persistable success must not paint a long banner between actions and the list.
    return { tone: "ok", text: "" };
  }
  if (info.truncated) {
    return {
      tone: "muted",
      text: `当前保留最近 ${indexed} 集，更早的可点索引历史。`,
    };
  }
  return { tone: "muted", text: "" };
}
