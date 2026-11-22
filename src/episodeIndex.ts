/**
 * Episode index merge, paging, and history-index status.
 * Auto-refresh stays a newest-window slice unless the user asked this
 * channel to keep a deeper history index. Progress / favorites / waitlist
 * are stored elsewhere and are never written here.
 */

import {
  applyHistorySafetyCap,
  episodeKey,
  pickEarliestFromFeed,
  retainedRangeOf,
  sortNewest,
  type HistoryCapResult,
} from "./historyCap";
import { MAX_AUTO_WINDOW, MAX_HISTORY_INDEX, type EpisodeSummary } from "./store";

export type HistoryIndexStatus = "idle" | "running" | "success" | "error";

/** Frontend-style page size. Decoupled from the history safety cap. */
export const DEFAULT_EPISODE_PAGE = 20;

/** Single-response page ceiling when a limit is requested. Not the history cap. */
export const MAX_EPISODE_PAGE = 100;

export function mergeSongIds(prev: EpisodeSummary[], next: EpisodeSummary[]): EpisodeSummary[] {
  const map = new Map<string, number>();
  for (const ep of Array.isArray(prev) ? prev : []) {
    if (typeof ep.songId === "number") map.set(ep.dedupKey, ep.songId);
  }
  return (Array.isArray(next) ? next : []).map((ep) => {
    const sid = map.get(ep.dedupKey);
    return typeof sid === "number" ? { ...ep, songId: sid } : ep;
  });
}

export type MergeEpisodeIndexOpts = {
  mode: "window" | "history";
  windowSize: number;
  cap?: number;
  keepPrevious?: boolean;
  pinnedEarliestKey?: string | null;
  pinnedEarliestConfirmed?: boolean;
};

export type MergeEpisodeIndexResult = {
  episodes: EpisodeSummary[];
  truncated: boolean;
  feedCount: number;
  keptPrevious: number;
  capped: boolean;
  earliestKept: boolean;
  earliestConfirmed: boolean;
  earliestDedupKey: string | null;
  retainedRange: HistoryCapResult<EpisodeSummary>["retainedRange"];
};

export function mergeEpisodeIndex(
  prev: EpisodeSummary[] | null | undefined,
  incoming: EpisodeSummary[] | null | undefined,
  opts: MergeEpisodeIndexOpts
): MergeEpisodeIndexResult {
  const keepPrevious = !!(opts.keepPrevious || opts.mode === "history");
  const defaultCap = keepPrevious ? MAX_HISTORY_INDEX : MAX_AUTO_WINDOW;
  const cap = Number.isFinite(Number(opts.cap)) ? Math.max(1, Number(opts.cap)) : defaultCap;
  const windowSize = Math.max(1, Math.min(Number(opts.windowSize) || 1, keepPrevious ? cap : Math.min(cap, MAX_AUTO_WINDOW)));
  const prevList = Array.isArray(prev) ? prev : [];
  const incomingDocOrder = Array.isArray(incoming) ? incoming.slice() : [];
  const incomingList = incomingDocOrder.slice().sort(sortNewest);
  const feedCount = incomingList.length;

  const emptyExtra = {
    capped: false,
    earliestKept: false,
    earliestConfirmed: false,
    earliestDedupKey: null as string | null,
    retainedRange: null as MergeEpisodeIndexResult["retainedRange"],
  };

  if (!keepPrevious) {
    const slice = incomingList.slice(0, windowSize);
    return {
      episodes: mergeSongIds(prevList, slice),
      truncated: feedCount > slice.length,
      feedCount,
      keptPrevious: 0,
      ...emptyExtra,
    };
  }

  const byKey = new Map<string, EpisodeSummary>();
  for (const ep of prevList) byKey.set(episodeKey(ep), ep);
  for (const ep of incomingList) {
    const key = episodeKey(ep);
    const old = byKey.get(key);
    if (old) {
      byKey.set(key, {
        ...ep,
        songId: typeof ep.songId === "number" ? ep.songId : old.songId,
      });
    } else {
      byKey.set(key, ep);
    }
  }

  let pinKey = opts.pinnedEarliestKey || null;
  let pinConfirmed = !!pinKey && opts.pinnedEarliestConfirmed !== false;
  let pinEpisode: EpisodeSummary | null = pinKey ? byKey.get(pinKey) || null : null;
  if (!pinEpisode) {
    const picked = pickEarliestFromFeed(incomingDocOrder);
    if (picked.episode) {
      pinEpisode = byKey.get(episodeKey(picked.episode)) || picked.episode;
      pinKey = episodeKey(pinEpisode);
      pinConfirmed = picked.confirmed;
    } else {
      pinKey = null;
      pinConfirmed = false;
    }
  }

  const cappedResult = applyHistorySafetyCap(Array.from(byKey.values()), cap, {
    key: pinKey,
    episode: pinEpisode,
    confirmed: pinConfirmed,
  });
  const keptPrevious = prevList.filter((ep) =>
    cappedResult.episodes.some((row) => episodeKey(row) === episodeKey(ep))
  ).length;
  const earliestDedupKey = cappedResult.earliest ? episodeKey(cappedResult.earliest) : pinKey;

  return {
    episodes: mergeSongIds(prevList, cappedResult.episodes),
    truncated: feedCount > cappedResult.episodes.length || cappedResult.capped,
    feedCount,
    keptPrevious,
    capped: cappedResult.capped,
    earliestKept: cappedResult.earliestKept,
    earliestConfirmed: cappedResult.earliestKept,
    earliestDedupKey: earliestDedupKey || null,
    retainedRange: cappedResult.retainedRange || retainedRangeOf(cappedResult.episodes),
  };
}

export function pageEpisodes<T>(
  episodes: T[] | null | undefined,
  offset = 0,
  limit?: number | null
): {
  items: T[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextOffset: number;
} {
  const list = Array.isArray(episodes) ? episodes : [];
  const off = Math.max(0, Math.floor(Number(offset) || 0));
  const hasLimit = limit != null && limit !== "" && Number.isFinite(Number(limit));
  const remaining = Math.max(0, list.length - off);
  const lim = hasLimit
    ? Math.max(1, Math.min(MAX_EPISODE_PAGE, Math.floor(Number(limit))))
    : remaining;
  const items = list.slice(off, off + lim);
  return {
    items,
    offset: off,
    limit: hasLimit ? lim : items.length,
    total: list.length,
    hasMore: off + items.length < list.length,
    nextOffset: off + items.length,
  };
}

export function parseStaleHistoryIndex(
  status: HistoryIndexStatus | string | null | undefined,
  at: number | null | undefined,
  now = Date.now(),
  staleMs = 15 * 60 * 1000
): { status: HistoryIndexStatus; error: string | null } {
  if (status !== "running") {
    const next: HistoryIndexStatus =
      status === "success" || status === "error" || status === "idle" ? status : "idle";
    return { status: next, error: null };
  }
  const ts = Number(at);
  if (!Number.isFinite(ts) || now - ts > staleMs) {
    return { status: "error", error: "上次索引未完成，可以重试" };
  }
  return { status: "running", error: null };
}