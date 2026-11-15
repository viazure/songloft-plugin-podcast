/**
 * Display-time episode metadata from the subscription index.
 *
 * History rows written via the song-mapping short path can land as "Untitled"
 * with no show title. The plugin store now backfills those on load; this helper
 * lets the history view do the same from already-loaded `subs` so a UI refresh
 * shows the real title before the plugin runtime is reloaded.
 */

export function isPlaceholderTitle(title) {
  const t = String(title || "").trim();
  return !t || t === "Untitled";
}

function normalizeFeedUrl(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return t;
  }
}

function episodeStorageKey(feedUrl, guid) {
  return `${normalizeFeedUrl(feedUrl)}::${String(guid || "").trim()}`;
}

/**
 * Look up display fields from subscriptions by feedUrl+guid.
 * Channel artwork is not returned as coverUrl.
 * @param {Array<{url?: string, title?: string, id?: string, episodes?: Array<object>}>} subs
 * @param {string} feedUrl
 * @param {string} guid
 */
export function findEpisodeMeta(subs, feedUrl, guid) {
  const key = episodeStorageKey(feedUrl, guid);
  if (!guid || key.startsWith("::")) return null;
  for (const sub of Array.isArray(subs) ? subs : []) {
    if (!sub) continue;
    const subUrl = sub.url || sub.feedUrl || "";
    for (const ep of sub.episodes || []) {
      if (!ep) continue;
      const epGuid = String(ep.guid || "").trim();
      if (!epGuid) continue;
      if (episodeStorageKey(subUrl, epGuid) !== key) continue;
      const title = !isPlaceholderTitle(ep.title) ? String(ep.title).trim() : undefined;
      return {
        title,
        showTitle: sub.title && String(sub.title).trim() ? String(sub.title).trim() : undefined,
        coverUrl: typeof ep.coverUrl === "string" && ep.coverUrl ? ep.coverUrl : null,
        durationSec: ep.durationSec ?? null,
        subscriptionId: sub.id,
        dedupKey: ep.dedupKey,
      };
    }
  }
  return null;
}

/**
 * Fill placeholder title / missing show title / cover from the subscription index.
 * Does not mutate the original entry.
 * @param {object} entry
 * @param {Array<object>} subs
 */
export function enrichHistoryEntry(entry, subs) {
  if (!entry) return entry;
  const meta = findEpisodeMeta(subs, entry.feedUrl, entry.guid);
  if (!meta) return entry;
  const next = { ...entry };
  if (isPlaceholderTitle(next.title) && meta.title) next.title = meta.title;
  if (!(next.showTitle && String(next.showTitle).trim()) && meta.showTitle) {
    next.showTitle = meta.showTitle;
  }
  if (!next.coverUrl && meta.coverUrl) next.coverUrl = meta.coverUrl;
  if ((next.durationSec == null || next.durationSec <= 0) && meta.durationSec) {
    next.durationSec = meta.durationSec;
  }
  return next;
}
