import type { RefreshScheduleState } from "./schedule";
import { DEFAULT_REFRESH_SCHEDULE, normalizeIntervalHours } from "./schedule";
import { feedIdFromUrl, normalizeFeedUrl } from "./hash";

/**
 * Hard cap on how many episodes we keep per subscription, in *every* path:
 * the settings input, settings validation, `refresh` slicing and the storage
 * normaliser all read this one constant. Raising it here is the only place to
 * change the ceiling.
 */
export const MAX_EPISODE_INDEX = 200;

/** Default index depth. Deliberately lower than the cap. */
export const DEFAULT_MAX_EPISODES = 50;

/** Coerce any user/legacy value into the valid 1..MAX_EPISODE_INDEX range. */
export function clampMaxEpisodes(value: unknown, fallback = DEFAULT_MAX_EPISODES): number {
  // `null` / `""` mean "unset", not "zero" — fall back to the default instead of
  // collapsing to 1.
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 1) return 1;
  if (rounded > MAX_EPISODE_INDEX) return MAX_EPISODE_INDEX;
  return rounded;
}

export type GuidSource = "rss" | "enclosure";

/**
 * ShowNote is by far the largest part of the stored index (measured ~88% of the
 * subscriptions file). Capping at 6k characters keeps ~90% of episodes intact
 * while making a deep index affordable: at depth 200 across 29 feeds the file
 * lands around 10 MB instead of 26 MB.
 */
export const MAX_SHOW_NOTE_CHARS = 6000;

export interface EpisodeSummary {
  title: string;
  guid: string | null;
  /** How episode identity was derived; enclosure-based resume is not guaranteed across URL changes. */
  guidSource: GuidSource;
  pubDate: string | null;
  pubDateMs: number | null;
  durationSec: number | null;
  coverUrl: string | null;
  enclosureUrl: string;
  dedupKey: string;
  /** Plain-text show notes from RSS (content:encoded / description). */
  description?: string | null;
  songId?: number;
}

export interface FavoriteEpisode {
  feedUrl: string;
  guid: string;
  title: string;
  showTitle: string;
  coverUrl: string | null;
  dedupKey: string;
  subscriptionId: string;
  durationSec: number | null;
  favoritedAt: number;
}

export interface Subscription {
  id: string;
  url: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  createdAt: number;
  updatedAt: number;
  lastSuccessAt: number | null;
  lastError: string | null;
  lastSkippedNonAudio: number;
  episodeCount: number;
  truncated: boolean;
  /** Recent episode index (capped). */
  episodes: EpisodeSummary[];
}

export interface PluginSettings {
  maxEpisodes: number;
  /** Persisted id of the fixed host playlist「播客」. */
  podcastPlaylistId: number | null;
  podcastPlaylistName: string;
  /** Inter-plugin action name used to hand a song to the MIoT plugin. */
  castAction: string;
}

export interface EpisodeProgress {
  feedUrl: string;
  guid: string;
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
  updatedAt: number;
  lastSongId: number | null;
  lastPlayedAt: number | null;
}

/**
 * One entry in the playback history.
 *
 * Progress answers "where was I"; history answers "what did I listen to".
 * They are deliberately separate: progress is keyed per episode and is
 * overwritten in place, so it can never represent repeated listens or an
 * ordered feed.
 */
export interface HistoryEntry {
  feedUrl: string;
  guid: string;
  title: string;
  showTitle: string;
  coverUrl: string | null;
  durationSec: number | null;
  songId: number | null;
  subscriptionId: string;
  dedupKey: string;
  /** Last time this episode started playing. */
  playedAt: number;
  /** Highest position reached, for the progress badge in the list. */
  positionSec: number;
  completed: boolean;
}

const SUBS_KEY = "subscriptions";
const SETTINGS_KEY = "settings";
const SCHEDULE_KEY = "refresh_schedule";
const LOG_KEY = "recent_log";
const PROGRESS_KEY = "progress";
const FAVORITES_KEY = "favorites";
const HISTORY_KEY = "play_history";
/** songId → { feedUrl, guid }. Short-lived bridge; SoT keys stay feedUrl+guid. */
const SONG_MAPPING_KEY = "song_mapping";
const MAX_LOG = 40;
const MAX_FAVORITES = 200;
/** Newest-first playback history. Small on purpose: it is a browsing aid. */
export const MAX_HISTORY = 200;
/** Cap songId→episode bridges; stale ids are pruned opportunistically. */
export const MAX_SONG_MAPPINGS = 500;
/**
 * Same threshold as the live UI badge (`pos >= dur - 3`): within 3s of the end
 * counts as completed when duration is known.
 */
export const COMPLETED_NEAR_END_SEC = 3;
export const DEFAULT_PODCAST_PLAYLIST_NAME = "播客";

export const DEFAULT_CAST_ACTION = "play";

/** How incoming positionSec merges with the stored value. */
export type ProgressWriteMode = "max" | "seek";

export interface SongEpisodeRef {
  feedUrl: string;
  guid: string;
  updatedAt: number;
}

/**
 * Serialise read-modify-write against one storage JSON blob so parallel
 * writers cannot clobber each other.
 */
const storageChains = new Map<string, Promise<unknown>>();

export function withStorageLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = storageChains.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  storageChains.set(
    key,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

/** Test-only: drop in-flight lock chains so cases do not share stale queues. */
export function __resetStorageLocksForTests(): void {
  storageChains.clear();
}

/** Canonical progress / history / mapping key: normalize(feedUrl)::guid */
export function episodeStorageKey(feedUrl: string, guid: string): string {
  return `${normalizeFeedUrl(feedUrl)}::${guid}`;
}

/** True when the sticky flag is set, or live position is within COMPLETED_NEAR_END_SEC of duration. */
export function isEpisodeCompleted(
  positionSec: number,
  durationSec: number | null | undefined,
  completedFlag?: boolean
): boolean {
  if (completedFlag === true) return true;
  const pos = Number(positionSec) || 0;
  const dur = typeof durationSec === "number" && Number.isFinite(durationSec) ? durationSec : 0;
  return dur > 0 && pos >= dur - COMPLETED_NEAR_END_SEC;
}

const DEFAULT_SETTINGS: PluginSettings = {
  maxEpisodes: DEFAULT_MAX_EPISODES,
  podcastPlaylistId: null,
  podcastPlaylistName: DEFAULT_PODCAST_PLAYLIST_NAME,
  castAction: DEFAULT_CAST_ACTION,
};

function asObject(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function numOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeReason(raw: unknown): string {
  let s = String(raw ?? "").trim();
  // Strip query strings that may contain tokens.
  s = s.replace(/https?:\/\/[^\s]+/gi, (url) => {
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    } catch {
      return "[url]";
    }
  });
  if (!s) return "未知错误";
  if (s.length > 200) s = s.slice(0, 200) + "…";
  return s;
}

export function episodeIdentityKey(feedUrl: string, guid: string | null, enclosureUrl: string): {
  guid: string;
  guidSource: GuidSource;
} {
  const g = typeof guid === "string" ? guid.trim() : "";
  if (g) return { guid: g, guidSource: "rss" };
  const enc = String(enclosureUrl || "").trim();
  return { guid: enc || "unknown", guidSource: "enclosure" };
}

function normalizeEpisode(raw: unknown): EpisodeSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "";
  const enclosureUrl = typeof o.enclosureUrl === "string" ? o.enclosureUrl : "";
  const dedupKey = typeof o.dedupKey === "string" ? o.dedupKey : "";
  if (!enclosureUrl && !dedupKey) return null;
  const guidRaw = typeof o.guid === "string" ? o.guid : null;
  const identity = episodeIdentityKey("", guidRaw, enclosureUrl);
  const guidSource: GuidSource =
    o.guidSource === "enclosure" || o.guidSource === "rss" ? o.guidSource : identity.guidSource;
  const ep: EpisodeSummary = {
    title: title || "Untitled",
    guid: guidRaw,
    guidSource,
    pubDate: typeof o.pubDate === "string" ? o.pubDate : null,
    pubDateMs: typeof o.pubDateMs === "number" && Number.isFinite(o.pubDateMs) ? o.pubDateMs : null,
    durationSec:
      typeof o.durationSec === "number" && Number.isFinite(o.durationSec) ? o.durationSec : null,
    coverUrl: typeof o.coverUrl === "string" ? o.coverUrl : null,
    enclosureUrl,
    dedupKey,
  };
  if (typeof o.description === "string" && o.description.trim()) {
    ep.description =
      o.description.length > MAX_SHOW_NOTE_CHARS
        ? o.description.slice(0, MAX_SHOW_NOTE_CHARS) + "…"
        : o.description;
  } else {
    ep.description = null;
  }
  if (typeof o.songId === "number" && Number.isFinite(o.songId)) ep.songId = o.songId;
  return ep;
}

function favoriteKey(feedUrl: string, guid: string): string {
  return `${normalizeFeedUrl(feedUrl)}::${guid}`;
}

function normalizeFavorite(raw: unknown): FavoriteEpisode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedUrl = typeof o.feedUrl === "string" ? o.feedUrl : "";
  const guid = typeof o.guid === "string" ? o.guid : "";
  if (!feedUrl || !guid) return null;
  return {
    feedUrl,
    guid,
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : "Untitled",
    showTitle: typeof o.showTitle === "string" ? o.showTitle : "",
    coverUrl: typeof o.coverUrl === "string" ? o.coverUrl : null,
    dedupKey: typeof o.dedupKey === "string" ? o.dedupKey : "",
    subscriptionId: typeof o.subscriptionId === "string" ? o.subscriptionId : "",
    durationSec:
      typeof o.durationSec === "number" && Number.isFinite(o.durationSec) ? o.durationSec : null,
    favoritedAt: numOr(o.favoritedAt, Date.now()),
  };
}

export async function loadFavorites(): Promise<FavoriteEpisode[]> {
  try {
    const raw = await songloft.storage.get(FAVORITES_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return (data.map(normalizeFavorite).filter(Boolean) as FavoriteEpisode[])
      .sort((a, b) => b.favoritedAt - a.favoritedAt)
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export async function saveFavorites(list: FavoriteEpisode[]): Promise<FavoriteEpisode[]> {
  const next = list
    .slice()
    .sort((a, b) => b.favoritedAt - a.favoritedAt)
    .slice(0, MAX_FAVORITES);
  await songloft.storage.set(FAVORITES_KEY, next);
  return next;
}

export async function isFavorited(feedUrl: string, guid: string): Promise<boolean> {
  const list = await loadFavorites();
  const key = favoriteKey(feedUrl, guid);
  return list.some((f) => favoriteKey(f.feedUrl, f.guid) === key);
}

export async function toggleFavorite(input: {
  feedUrl: string;
  guid: string;
  title?: string;
  showTitle?: string;
  coverUrl?: string | null;
  dedupKey?: string;
  subscriptionId?: string;
  durationSec?: number | null;
}): Promise<{ favorited: boolean; favorites: FavoriteEpisode[] }> {
  const feedUrl = String(input.feedUrl || "").trim();
  const guid = String(input.guid || "").trim();
  if (!feedUrl || !guid) {
    return { favorited: false, favorites: await loadFavorites() };
  }
  const list = await loadFavorites();
  const key = favoriteKey(feedUrl, guid);
  const idx = list.findIndex((f) => favoriteKey(f.feedUrl, f.guid) === key);
  if (idx >= 0) {
    list.splice(idx, 1);
    const favorites = await saveFavorites(list);
    return { favorited: false, favorites };
  }
  list.unshift({
    feedUrl,
    guid,
    title: input.title || "Untitled",
    showTitle: input.showTitle || "",
    coverUrl: input.coverUrl ?? null,
    dedupKey: input.dedupKey || "",
    subscriptionId: input.subscriptionId || "",
    durationSec: input.durationSec ?? null,
    favoritedAt: Date.now(),
  });
  const favorites = await saveFavorites(list);
  return { favorited: true, favorites };
}

/* ------------------------------------------------------------------ */
/* play history                                                        */
/* ------------------------------------------------------------------ */

function normalizeHistoryEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedUrl = typeof o.feedUrl === "string" ? o.feedUrl.trim() : "";
  const guid = typeof o.guid === "string" ? o.guid.trim() : "";
  if (!feedUrl || !guid) return null;
  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : d;
  return {
    feedUrl: normalizeFeedUrl(feedUrl) || feedUrl,
    guid,
    title: typeof o.title === "string" && o.title.trim() ? o.title : "Untitled",
    showTitle: typeof o.showTitle === "string" ? o.showTitle : "",
    coverUrl: typeof o.coverUrl === "string" && o.coverUrl ? o.coverUrl : null,
    durationSec:
      typeof o.durationSec === "number" && Number.isFinite(o.durationSec) && o.durationSec > 0
        ? o.durationSec
        : null,
    songId: typeof o.songId === "number" && Number.isFinite(o.songId) ? o.songId : null,
    subscriptionId: typeof o.subscriptionId === "string" ? o.subscriptionId : "",
    dedupKey: typeof o.dedupKey === "string" ? o.dedupKey : "",
    playedAt: num(o.playedAt, 0),
    positionSec: Math.max(0, num(o.positionSec, 0)),
    completed: o.completed === true,
  };
}

async function loadHistoryUnlocked(): Promise<HistoryEntry[]> {
  try {
    const raw = await songloft.storage.get(HISTORY_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return (data.map(normalizeHistoryEntry).filter(Boolean) as HistoryEntry[])
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return withStorageLock(HISTORY_KEY, () => loadHistoryUnlocked());
}

async function saveHistoryUnlocked(list: HistoryEntry[]): Promise<HistoryEntry[]> {
  const seen = new Set<string>();
  const next: HistoryEntry[] = [];
  for (const item of list.slice().sort((a, b) => b.playedAt - a.playedAt)) {
    const key = episodeStorageKey(item.feedUrl, item.guid);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
    if (next.length >= MAX_HISTORY) break;
  }
  await songloft.storage.set(HISTORY_KEY, next);
  return next;
}

/**
 * Record that an episode started playing (or advanced).
 *
 * Repeated plays move the existing entry to the top instead of duplicating it —
 * the list reads as "recently listened", not as a raw event log.
 * positionSec merges with Math.max so a play-start of 0 cannot rewind progress.
 */
export async function recordHistory(
  input: Partial<HistoryEntry> & { feedUrl: string; guid: string }
): Promise<HistoryEntry[]> {
  const feedUrl = String(input.feedUrl || "").trim();
  const guid = String(input.guid || "").trim();
  if (!feedUrl || !guid) return loadHistory();

  return withStorageLock(HISTORY_KEY, async () => {
    const list = await loadHistoryUnlocked();
    const key = episodeStorageKey(feedUrl, guid);
    const existing = list.find((h) => episodeStorageKey(h.feedUrl, h.guid) === key);
    const now = Date.now();
    const incomingPos =
      input.positionSec !== undefined ? Math.max(0, Number(input.positionSec) || 0) : null;
    const positionSec =
      incomingPos == null
        ? (existing && existing.positionSec) || 0
        : Math.max((existing && existing.positionSec) || 0, incomingPos);
    const durationSec =
      input.durationSec !== undefined
        ? input.durationSec
        : (existing && existing.durationSec) || null;
    const completedFlag =
      input.completed !== undefined ? !!input.completed : (existing && existing.completed) || false;

    const entry: HistoryEntry = {
      feedUrl: normalizeFeedUrl(feedUrl) || feedUrl,
      guid,
      title: input.title || (existing && existing.title) || "Untitled",
      showTitle: input.showTitle || (existing && existing.showTitle) || "",
      coverUrl:
        input.coverUrl !== undefined ? input.coverUrl : (existing && existing.coverUrl) || null,
      durationSec,
      songId: input.songId !== undefined ? input.songId : (existing && existing.songId) || null,
      subscriptionId: input.subscriptionId || (existing && existing.subscriptionId) || "",
      dedupKey: input.dedupKey || (existing && existing.dedupKey) || "",
      playedAt: input.playedAt !== undefined ? input.playedAt : now,
      positionSec,
      completed: isEpisodeCompleted(positionSec, durationSec, completedFlag),
    };

    const rest = list.filter((h) => episodeStorageKey(h.feedUrl, h.guid) !== key);
    return saveHistoryUnlocked([entry, ...rest]);
  });
}

/** Update the progress fields of an existing history row (no reordering). */
export async function touchHistoryProgress(
  feedUrl: string,
  guid: string,
  patch: {
    positionSec?: number;
    durationSec?: number | null;
    completed?: boolean;
    mode?: ProgressWriteMode;
  }
): Promise<void> {
  if (!feedUrl || !guid) return;
  await withStorageLock(HISTORY_KEY, async () => {
    const list = await loadHistoryUnlocked();
    const key = episodeStorageKey(feedUrl, guid);
    let changed = false;
    const mode: ProgressWriteMode = patch.mode === "seek" ? "seek" : "max";
    const next = list.map((h) => {
      if (episodeStorageKey(h.feedUrl, h.guid) !== key) return h;
      changed = true;
      let positionSec = h.positionSec;
      if (patch.positionSec !== undefined) {
        const incoming = Math.max(0, Number(patch.positionSec) || 0);
        positionSec = mode === "seek" ? incoming : Math.max(h.positionSec, incoming);
      }
      const durationSec = patch.durationSec !== undefined ? patch.durationSec : h.durationSec;
      const completedFlag =
        patch.completed !== undefined
          ? !!patch.completed
          : mode === "seek"
            ? isEpisodeCompleted(positionSec, durationSec, false)
            : h.completed;
      return {
        ...h,
        positionSec,
        durationSec,
        completed: isEpisodeCompleted(positionSec, durationSec, completedFlag),
      };
    });
    if (changed) await saveHistoryUnlocked(next);
  });
}

export async function clearHistory(): Promise<void> {
  await withStorageLock(HISTORY_KEY, () => saveHistoryUnlocked([]));
}

export async function removeHistoryEntry(feedUrl: string, guid: string): Promise<HistoryEntry[]> {
  return withStorageLock(HISTORY_KEY, async () => {
    const list = await loadHistoryUnlocked();
    const key = episodeStorageKey(feedUrl, guid);
    return saveHistoryUnlocked(list.filter((h) => episodeStorageKey(h.feedUrl, h.guid) !== key));
  });
}

/** Delete many history rows in one locked write. Optionally drop matching song mappings. */
export async function removeHistoryEntries(
  items: Array<{ feedUrl: string; guid: string }>,
  opts?: { pruneMappings?: boolean }
): Promise<HistoryEntry[]> {
  const keys = new Set(
    items
      .map((it) => {
        const feedUrl = String(it.feedUrl || "").trim();
        const guid = String(it.guid || "").trim();
        return feedUrl && guid ? episodeStorageKey(feedUrl, guid) : "";
      })
      .filter(Boolean)
  );
  if (!keys.size) return loadHistory();

  const next = await withStorageLock(HISTORY_KEY, async () => {
    const list = await loadHistoryUnlocked();
    return saveHistoryUnlocked(
      list.filter((h) => !keys.has(episodeStorageKey(h.feedUrl, h.guid)))
    );
  });

  if (opts?.pruneMappings) {
    await removeSongMappingsForEpisodes([...keys]).catch(() => {});
  }
  return next;
}

function normalizeSub(raw: unknown): Subscription | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url : "";
  if (!url) return null;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : feedIdFromUrl(url);
  const episodes = Array.isArray(o.episodes)
    ? (o.episodes.map(normalizeEpisode).filter(Boolean) as EpisodeSummary[]).slice(0, MAX_EPISODE_INDEX)
    : [];
  return {
    id,
    url,
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : url,
    author: typeof o.author === "string" ? o.author : null,
    coverUrl: typeof o.coverUrl === "string" ? o.coverUrl : null,
    createdAt: numOr(o.createdAt, Date.now()),
    updatedAt: numOr(o.updatedAt, Date.now()),
    lastSuccessAt:
      typeof o.lastSuccessAt === "number" && Number.isFinite(o.lastSuccessAt)
        ? o.lastSuccessAt
        : null,
    lastError: typeof o.lastError === "string" && o.lastError ? sanitizeReason(o.lastError) : null,
    lastSkippedNonAudio: numOr(o.lastSkippedNonAudio, 0),
    episodeCount: numOr(o.episodeCount, episodes.length),
    truncated: o.truncated === true,
    episodes,
  };
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    const raw = await songloft.storage.get(SUBS_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSub).filter((x): x is Subscription => !!x);
  } catch {
    return [];
  }
}

export async function saveSubscriptions(list: Subscription[]): Promise<Subscription[]> {
  await songloft.storage.set(SUBS_KEY, list);
  return list;
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const list = await loadSubscriptions();
  return list.find((s) => s.id === id) || null;
}

export async function upsertSubscription(sub: Subscription): Promise<Subscription[]> {
  const list = await loadSubscriptions();
  const i = list.findIndex((s) => s.id === sub.id);
  if (i >= 0) list[i] = sub;
  else list.push(sub);
  return saveSubscriptions(list);
}

export async function removeSubscription(id: string): Promise<{
  removed: Subscription | null;
  list: Subscription[];
}> {
  const list = await loadSubscriptions();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { removed: null, list };
  const removed = list[i];
  list.splice(i, 1);
  await saveSubscriptions(list);
  return { removed, list };
}

export function findByUrl(list: Subscription[], url: string): Subscription | null {
  const norm = normalizeFeedUrl(url);
  return (
    list.find((s) => normalizeFeedUrl(s.url) === norm || s.url.trim() === url.trim()) || null
  );
}

export async function loadSettings(): Promise<PluginSettings> {
  try {
    const raw = await songloft.storage.get(SETTINGS_KEY);
    const data = asObject(raw);
    // Legacy rows may hold values above the current cap; clamp on read so the
    // whole app sees the same effective depth.
    const max = clampMaxEpisodes(data.maxEpisodes, DEFAULT_MAX_EPISODES);
    const playlistId =
      typeof data.podcastPlaylistId === "number" && Number.isFinite(data.podcastPlaylistId)
        ? data.podcastPlaylistId
        : null;
    const playlistName =
      typeof data.podcastPlaylistName === "string" && data.podcastPlaylistName.trim()
        ? data.podcastPlaylistName.trim()
        : DEFAULT_PODCAST_PLAYLIST_NAME;
    const castAction =
      typeof data.castAction === "string" && data.castAction.trim()
        ? data.castAction.trim()
        : DEFAULT_CAST_ACTION;
    return {
      maxEpisodes: max,
      podcastPlaylistId: playlistId,
      podcastPlaylistName: playlistName,
      castAction,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial: Partial<PluginSettings>): Promise<PluginSettings> {
  const cur = await loadSettings();
  const max =
    partial.maxEpisodes !== undefined
      ? clampMaxEpisodes(partial.maxEpisodes, cur.maxEpisodes)
      : cur.maxEpisodes;
  const next: PluginSettings = {
    maxEpisodes: max,
    podcastPlaylistId:
      partial.podcastPlaylistId !== undefined ? partial.podcastPlaylistId : cur.podcastPlaylistId,
    podcastPlaylistName:
      partial.podcastPlaylistName !== undefined && String(partial.podcastPlaylistName).trim()
        ? String(partial.podcastPlaylistName).trim()
        : cur.podcastPlaylistName,
    castAction:
      partial.castAction !== undefined && String(partial.castAction).trim()
        ? String(partial.castAction).trim().slice(0, 64)
        : cur.castAction,
  };
  await songloft.storage.set(SETTINGS_KEY, next);
  return next;
}

export async function loadRefreshSchedule(): Promise<RefreshScheduleState> {
  try {
    const raw = await songloft.storage.get(SCHEDULE_KEY);
    const data = asObject(raw);
    return {
      enabled: data.enabled === true,
      intervalHours: normalizeIntervalHours(data.intervalHours),
      lastSuccessAt:
        typeof data.lastSuccessAt === "number" && Number.isFinite(data.lastSuccessAt)
          ? data.lastSuccessAt
          : null,
      nextDueAt:
        typeof data.nextDueAt === "number" && Number.isFinite(data.nextDueAt)
          ? data.nextDueAt
          : null,
    };
  } catch {
    return { ...DEFAULT_REFRESH_SCHEDULE };
  }
}

export async function saveRefreshSchedule(
  partial: Partial<RefreshScheduleState>
): Promise<RefreshScheduleState> {
  const cur = await loadRefreshSchedule();
  const next: RefreshScheduleState = {
    enabled: partial.enabled !== undefined ? !!partial.enabled : cur.enabled,
    intervalHours: normalizeIntervalHours(
      partial.intervalHours !== undefined ? partial.intervalHours : cur.intervalHours
    ),
    lastSuccessAt:
      partial.lastSuccessAt !== undefined
        ? partial.lastSuccessAt == null || !Number.isFinite(partial.lastSuccessAt as number)
          ? null
          : (partial.lastSuccessAt as number)
        : cur.lastSuccessAt,
    nextDueAt:
      partial.nextDueAt !== undefined
        ? partial.nextDueAt == null || !Number.isFinite(partial.nextDueAt as number)
          ? null
          : (partial.nextDueAt as number)
        : cur.nextDueAt,
  };
  await songloft.storage.set(SCHEDULE_KEY, next);
  return next;
}

export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

export async function loadLog(): Promise<LogEntry[]> {
  try {
    const raw = await songloft.storage.get(LOG_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return data
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const message = typeof o.message === "string" ? o.message : "";
        if (!message) return null;
        const level =
          o.level === "error" || o.level === "warn" || o.level === "info" ? o.level : "info";
        return {
          ts: typeof o.ts === "number" ? o.ts : Date.now(),
          level,
          message: sanitizeReason(message),
        } as LogEntry;
      })
      .filter((x): x is LogEntry => !!x)
      .slice(-MAX_LOG);
  } catch {
    return [];
  }
}

export async function appendLog(
  level: "info" | "warn" | "error",
  message: string
): Promise<void> {
  const list = await loadLog();
  list.push({ ts: Date.now(), level, message: sanitizeReason(message) });
  const next = list.slice(-MAX_LOG);
  await songloft.storage.set(LOG_KEY, next);
}

function normalizeProgress(raw: unknown): EpisodeProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedUrl = typeof o.feedUrl === "string" ? o.feedUrl : "";
  const guid = typeof o.guid === "string" ? o.guid : "";
  if (!feedUrl || !guid) return null;
  const positionSec = Math.max(0, numOr(o.positionSec, 0));
  const durationSec =
    typeof o.durationSec === "number" && Number.isFinite(o.durationSec) ? o.durationSec : null;
  return {
    feedUrl,
    guid,
    positionSec,
    durationSec,
    completed: isEpisodeCompleted(positionSec, durationSec, o.completed === true),
    updatedAt: numOr(o.updatedAt, Date.now()),
    lastSongId:
      typeof o.lastSongId === "number" && Number.isFinite(o.lastSongId) ? o.lastSongId : null,
    lastPlayedAt:
      typeof o.lastPlayedAt === "number" && Number.isFinite(o.lastPlayedAt)
        ? o.lastPlayedAt
        : null,
  };
}

async function loadProgressMapUnlocked(): Promise<Record<string, EpisodeProgress>> {
  try {
    const raw = await songloft.storage.get(PROGRESS_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out: Record<string, EpisodeProgress> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const p = normalizeProgress(v);
      if (p) out[k] = p;
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadAllProgress(): Promise<EpisodeProgress[]> {
  return withStorageLock(PROGRESS_KEY, async () => {
    const map = await loadProgressMapUnlocked();
    return Object.values(map);
  });
}

export async function getProgress(
  feedUrl: string,
  guid: string
): Promise<EpisodeProgress | null> {
  return withStorageLock(PROGRESS_KEY, async () => {
    const map = await loadProgressMapUnlocked();
    return map[episodeStorageKey(feedUrl, guid)] || null;
  });
}

/**
 * Upsert episode progress keyed by feedUrl+guid.
 *
 * Default mode `"max"` only advances positionSec (short-time duplicate events
 * keep the highest position). Pass `mode: "seek"` after an explicit user seek
 * to allow rewinding and to recompute completed from the new position.
 */
export async function upsertProgress(
  partial: Partial<EpisodeProgress> & { feedUrl: string; guid: string },
  opts?: { mode?: ProgressWriteMode }
): Promise<EpisodeProgress> {
  const mode: ProgressWriteMode = opts?.mode === "seek" ? "seek" : "max";
  return withStorageLock(PROGRESS_KEY, async () => {
    const map = await loadProgressMapUnlocked();
    const key = episodeStorageKey(partial.feedUrl, partial.guid);
    const cur = map[key];

    let positionSec = cur?.positionSec ?? 0;
    if (partial.positionSec !== undefined) {
      const incoming = Math.max(0, Number(partial.positionSec) || 0);
      positionSec = mode === "seek" ? incoming : Math.max(positionSec, incoming);
    }

    const durationSec =
      partial.durationSec !== undefined ? partial.durationSec : (cur?.durationSec ?? null);

    let completedFlag =
      partial.completed !== undefined ? !!partial.completed : (cur?.completed ?? false);
    if (mode === "seek" && partial.completed === undefined) {
      // Seeking away from the tail clears a stale completed mark.
      completedFlag = false;
    }

    const next: EpisodeProgress = {
      feedUrl: normalizeFeedUrl(partial.feedUrl) || partial.feedUrl,
      guid: partial.guid,
      positionSec,
      durationSec,
      completed: isEpisodeCompleted(positionSec, durationSec, completedFlag),
      updatedAt: Date.now(),
      lastSongId:
        partial.lastSongId !== undefined ? partial.lastSongId : (cur?.lastSongId ?? null),
      lastPlayedAt:
        partial.lastPlayedAt !== undefined ? partial.lastPlayedAt : (cur?.lastPlayedAt ?? null),
    };
    map[key] = next;
    await songloft.storage.set(PROGRESS_KEY, map);
    return next;
  });
}

/* ------------------------------------------------------------------ */
/* songId → {feedUrl,guid} mapping                                     */
/* ------------------------------------------------------------------ */

function normalizeSongRef(raw: unknown): SongEpisodeRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedUrl = typeof o.feedUrl === "string" ? normalizeFeedUrl(o.feedUrl) || o.feedUrl.trim() : "";
  const guid = typeof o.guid === "string" ? o.guid.trim() : "";
  if (!feedUrl || !guid) return null;
  return {
    feedUrl,
    guid,
    updatedAt: numOr(o.updatedAt, Date.now()),
  };
}

async function loadSongMappingUnlocked(): Promise<Record<string, SongEpisodeRef>> {
  try {
    const raw = await songloft.storage.get(SONG_MAPPING_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out: Record<string, SongEpisodeRef> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const ref = normalizeSongRef(v);
      if (ref) out[k] = ref;
    }
    return out;
  } catch {
    return {};
  }
}

async function saveSongMappingUnlocked(map: Record<string, SongEpisodeRef>): Promise<void> {
  const entries = Object.entries(map).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  const trimmed: Record<string, SongEpisodeRef> = {};
  for (const [k, v] of entries.slice(0, MAX_SONG_MAPPINGS)) trimmed[k] = v;
  await songloft.storage.set(SONG_MAPPING_KEY, trimmed);
}

export async function lookupSongMapping(songId: number): Promise<SongEpisodeRef | null> {
  if (!Number.isFinite(songId)) return null;
  return withStorageLock(SONG_MAPPING_KEY, async () => {
    const map = await loadSongMappingUnlocked();
    return map[String(songId)] || null;
  });
}

export async function rememberSongMapping(
  songId: number,
  feedUrl: string,
  guid: string
): Promise<SongEpisodeRef | null> {
  if (!Number.isFinite(songId) || songId <= 0) return null;
  const feed = String(feedUrl || "").trim();
  const g = String(guid || "").trim();
  if (!feed || !g) return null;
  return withStorageLock(SONG_MAPPING_KEY, async () => {
    const map = await loadSongMappingUnlocked();
    const ref: SongEpisodeRef = {
      feedUrl: normalizeFeedUrl(feed) || feed,
      guid: g,
      updatedAt: Date.now(),
    };
    map[String(songId)] = ref;
    await saveSongMappingUnlocked(map);
    return ref;
  });
}

/** Drop mappings that point at the given episode keys (normalize(feed)::guid). */
export async function removeSongMappingsForEpisodes(episodeKeys: string[]): Promise<number> {
  const drop = new Set(episodeKeys.filter(Boolean));
  if (!drop.size) return 0;
  return withStorageLock(SONG_MAPPING_KEY, async () => {
    const map = await loadSongMappingUnlocked();
    let removed = 0;
    for (const [songId, ref] of Object.entries(map)) {
      if (drop.has(episodeStorageKey(ref.feedUrl, ref.guid))) {
        delete map[songId];
        removed += 1;
      }
    }
    if (removed) await saveSongMappingUnlocked(map);
    return removed;
  });
}

export function publicSubscription(s: Subscription) {
  return {
    id: s.id,
    url: s.url,
    title: s.title,
    author: s.author,
    coverUrl: s.coverUrl,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lastSuccessAt: s.lastSuccessAt,
    lastError: s.lastError,
    lastSkippedNonAudio: s.lastSkippedNonAudio,
    episodeCount: s.episodeCount,
    truncated: s.truncated,
  };
}

export function publicEpisode(feedUrl: string, ep: EpisodeSummary, progress?: EpisodeProgress | null) {
  const identity = episodeIdentityKey(feedUrl, ep.guid, ep.enclosureUrl);
  return {
    feedUrl,
    title: ep.title,
    guid: ep.guid ?? identity.guid,
    guidSource: ep.guidSource || identity.guidSource,
    pubDate: ep.pubDate,
    pubDateMs: ep.pubDateMs,
    durationSec: ep.durationSec,
    coverUrl: ep.coverUrl,
    dedupKey: ep.dedupKey,
    songId: ep.songId ?? null,
    hasEnclosure: !!ep.enclosureUrl,
    showNote: ep.description || null,
    hasShowNote: !!(
      ep.description &&
      ep.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    ),
    progress: progress
      ? {
          positionSec: progress.positionSec,
          durationSec: progress.durationSec,
          completed: progress.completed,
          lastPlayedAt: progress.lastPlayedAt,
          updatedAt: progress.updatedAt,
        }
      : null,
  };
}
