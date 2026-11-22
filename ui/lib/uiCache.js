/**
 * Non-sensitive UI cache so a host remount can restore lists/chrome without
 * an unconditional feed refresh. Never store tokens, device secrets, or .env.
 */

export const UI_CACHE_KEY = "songloft.podcast.uiCache.v1";
/**
 * Soft TTL for local feedSyncedAt when schedule.lastSuccessAt is unknown.
 * Mirrors src/schedule.ts DEFAULT_REFRESH_SCHEDULE.intervalHours (6h) — not a new knob.
 */
export const FEED_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Cap list lengths so localStorage stays within typical quota. */
export const UI_CACHE_LIST_CAPS = {
  recent: 80,
  history: 120,
  favorites: 120,
  subs: 200,
  queueSongs: 400,
};

const LIST_KEYS = ["recent", "history", "favorites", "subs", "queueSongs"];

const EMPTY = () => ({
  version: 1,
  savedAt: 0,
  feedSyncedAt: 0,
  activeTab: "recent",
  queueOpen: false,
  scrolls: {},
  recent: [],
  history: [],
  favorites: [],
  subs: [],
  queueSongs: [],
  queueMeta: null,
});

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch (_) {
    return null;
  }
}

/** Drop bulky note bodies; keep a flag so rows can still show the affordance. */
export function slimCacheItem(item) {
  if (!item || typeof item !== "object") return item;
  if (!Object.prototype.hasOwnProperty.call(item, "showNote")) return item;
  const { showNote, ...rest } = item;
  if (showNote == null) return rest;
  return { ...rest, hasShowNote: true };
}

export function slimCacheList(list, cap) {
  if (!Array.isArray(list)) return [];
  const limit = typeof cap === "number" && cap > 0 ? cap : list.length;
  return list.slice(0, limit).map(slimCacheItem);
}

/**
 * When persisting, do not let a blank list wipe a previously useful one.
 * Intentional clears still win later once the live store is empty *and* the
 * caller passes an explicit empty after a successful reload in-session; boot
 * soft-reloads use retainNonEmptyLists on the in-memory store instead.
 */
export function mergeListsForPersist(partial, previous) {
  const prev = previous && typeof previous === "object" ? previous : {};
  const src = partial && typeof partial === "object" ? partial : {};
  const out = { ...src };
  for (const key of LIST_KEYS) {
    const next = src[key];
    const old = prev[key];
    if (Array.isArray(next) && next.length === 0 && Array.isArray(old) && old.length > 0) {
      out[key] = old;
    }
  }
  if (
    (src.queueMeta == null || src.queueMeta === undefined) &&
    prev.queueMeta != null
  ) {
    out.queueMeta = prev.queueMeta;
  }
  return out;
}

/**
 * After a soft reload, keep prior non-empty lists when the response is blank.
 * Failures should already leave the store alone; this covers ok+[] flashes.
 */
export function retainNonEmptyLists(current, previous) {
  const cur = current && typeof current === "object" ? current : {};
  const prev = previous && typeof previous === "object" ? previous : {};
  const patch = {};
  let changed = false;
  for (const key of LIST_KEYS) {
    const now = cur[key];
    const old = prev[key];
    if (Array.isArray(now) && now.length === 0 && Array.isArray(old) && old.length > 0) {
      patch[key] = old;
      changed = true;
    }
  }
  if (
    (cur.queueMeta == null || cur.queueMeta === undefined) &&
    prev.queueMeta != null &&
    Array.isArray(prev.queueSongs) &&
    prev.queueSongs.length > 0
  ) {
    patch.queueMeta = prev.queueMeta;
    changed = true;
  }
  return { patch, changed };
}

export function hasValidListCache(cache) {
  if (!cache || typeof cache !== "object") return false;
  const lists = [cache.recent, cache.history, cache.favorites, cache.subs, cache.queueSongs];
  return lists.some((list) => Array.isArray(list) && list.length > 0);
}

/**
 * Initial RSS refresh only when there is no readable list cache.
 * Stale-but-present cache uses background refresh instead (see shouldBackgroundFeedRefresh).
 */
export function needsInitialFeedRefresh(cache) {
  return !hasValidListCache(cache);
}

export function shouldBackgroundFeedRefresh(cache, now = Date.now(), ttlMs = FEED_CACHE_TTL_MS) {
  if (!hasValidListCache(cache)) return false;
  const synced = Number(cache.feedSyncedAt) || 0;
  if (!synced) return true;
  return now - synced >= ttlMs;
}

/**
 * True when schedule.lastSuccessAt is still inside the configured interval window.
 * Reuses RefreshScheduler fields (intervalHours 6|12|24 + lastSuccessAt); no new settings UI.
 */
export function isScheduleFeedFresh(lastSuccessAt, intervalHours = 6, now = Date.now()) {
  const last = Number(lastSuccessAt);
  if (!Number.isFinite(last) || last <= 0) return false;
  let hours = Number(intervalHours);
  if (!Number.isFinite(hours) || hours <= 0) hours = 6;
  if (hours !== 6 && hours !== 12 && hours !== 24) hours = 6;
  return now - last < hours * 60 * 60 * 1000;
}

/**
 * Whether boot should kick a quiet full RSS refresh.
 * Prefer server lastSuccessAt + intervalHours; fall back to local feedSyncedAt TTL.
 * Manual toolbar refresh ignores this and always runs.
 */
export function shouldBootFeedRefresh(cache, schedule = null, now = Date.now()) {
  if (schedule && isScheduleFeedFresh(schedule.lastSuccessAt, schedule.intervalHours, now)) {
    return false;
  }
  if (needsInitialFeedRefresh(cache)) return true;
  return shouldBackgroundFeedRefresh(cache, now);
}

export function loadUiCache(store = storage()) {
  if (!store) return null;
  try {
    const raw = store.getItem(UI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { ...EMPTY(), ...parsed, version: 1 };
  } catch (_) {
    return null;
  }
}

export function saveUiCache(partial, store = storage(), now = Date.now()) {
  if (!store) return null;
  const prev = loadUiCache(store) || EMPTY();
  const merged = mergeListsForPersist(partial || {}, prev);
  const next = {
    ...prev,
    ...merged,
    version: 1,
    savedAt: now,
    recent: slimCacheList(merged.recent != null ? merged.recent : prev.recent, UI_CACHE_LIST_CAPS.recent),
    history: slimCacheList(merged.history != null ? merged.history : prev.history, UI_CACHE_LIST_CAPS.history),
    favorites: slimCacheList(
      merged.favorites != null ? merged.favorites : prev.favorites,
      UI_CACHE_LIST_CAPS.favorites
    ),
    subs: slimCacheList(merged.subs != null ? merged.subs : prev.subs, UI_CACHE_LIST_CAPS.subs),
    queueSongs: slimCacheList(
      merged.queueSongs != null ? merged.queueSongs : prev.queueSongs,
      UI_CACHE_LIST_CAPS.queueSongs
    ),
  };
  try {
    store.setItem(UI_CACHE_KEY, JSON.stringify(next));
    return next;
  } catch (_) {
    // Quota or private mode — try a tighter recent-only payload once.
    try {
      const tight = {
        ...next,
        history: slimCacheList(next.history, 40),
        favorites: slimCacheList(next.favorites, 40),
        queueSongs: slimCacheList(next.queueSongs, 80),
      };
      store.setItem(UI_CACHE_KEY, JSON.stringify(tight));
      return tight;
    } catch (_) {
      return null;
    }
  }
}

export function markFeedSynced(at = Date.now(), store = storage()) {
  return saveUiCache({ feedSyncedAt: at }, store, at);
}

export function cacheFromStoreData(data, chrome = {}) {
  const d = data || {};
  return {
    recent: Array.isArray(d.recent) ? d.recent : [],
    history: Array.isArray(d.history) ? d.history : [],
    favorites: Array.isArray(d.favorites) ? d.favorites : [],
    subs: Array.isArray(d.subs) ? d.subs : [],
    queueSongs: Array.isArray(d.queueSongs) ? d.queueSongs : [],
    queueMeta: d.queueMeta || null,
    activeTab: chrome.activeTab || "recent",
    queueOpen: !!chrome.queueOpen,
    scrolls: chrome.scrolls && typeof chrome.scrolls === "object" ? chrome.scrolls : {},
  };
}
