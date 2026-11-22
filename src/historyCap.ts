/**
 * History-index safety cap helpers.
 * Kept in a store-free module so `normalizeSub` can apply the same rule
 * without an import cycle through episodeIndex.ts.
 *
 * When a deep index would exceed the local ceiling: keep the pinned
 * earliest episode plus the newest (cap - 1) episodes, and drop the middle.
 * Never silently drop the first episode just because it is the oldest.
 */

export type CapEpisode = {
  dedupKey?: string | null;
  guid?: string | null;
  enclosureUrl?: string | null;
  pubDateMs?: number | null;
  title?: string | null;
  pubDate?: string | null;
};

export function episodeKey(ep: CapEpisode): string {
  return ep.dedupKey || `${ep.guid || ""}::${ep.enclosureUrl || ""}`;
}

export function sortNewest<T extends CapEpisode>(a: T, b: T): number {
  return (b.pubDateMs ?? 0) - (a.pubDateMs ?? 0);
}

export function pickEarliestFromFeed<T extends CapEpisode>(
  incomingInDocOrder: T[] | null | undefined
): { episode: T | null; confirmed: boolean; source: "min-date" | "feed-last" | "unknown" } {
  const list = Array.isArray(incomingInDocOrder) ? incomingInDocOrder : [];
  if (!list.length) return { episode: null, confirmed: false, source: "unknown" };
  const dated = list.filter((ep) => typeof ep.pubDateMs === "number" && Number.isFinite(ep.pubDateMs));
  if (dated.length) {
    let best = dated[0];
    for (const ep of dated) {
      if ((ep.pubDateMs as number) < (best.pubDateMs as number)) best = ep;
    }
    return { episode: best, confirmed: true, source: "min-date" };
  }
  return { episode: list[list.length - 1], confirmed: true, source: "feed-last" };
}

export type RetainedRange<T extends CapEpisode> = { newest: T; oldest: T };

export type HistoryCapResult<T extends CapEpisode> = {
  episodes: T[];
  capped: boolean;
  earliestKept: boolean;
  earliest: T | null;
  retainedRange: RetainedRange<T> | null;
};

export function retainedRangeOf<T extends CapEpisode>(eps: T[]): RetainedRange<T> | null {
  if (!eps.length) return null;
  return { newest: eps[0], oldest: eps[eps.length - 1] };
}

export function retainedRangeText(range: RetainedRange<CapEpisode> | null | undefined): string {
  if (!range || !range.newest || !range.oldest) return "";
  const a = episodeLabel(range.newest);
  const b = episodeLabel(range.oldest);
  if (!a && !b) return "";
  if (a === b) return `（已保留《${a}》）`;
  return `（已保留从《${a}》到《${b}》）`;
}

function episodeLabel(ep: CapEpisode): string {
  const t = typeof ep.title === "string" ? ep.title.trim() : "";
  return t || (typeof ep.pubDate === "string" ? ep.pubDate : "") || "";
}

/**
 * Apply the history safety ceiling. Callers must pass the pin from the first
 * successful deep index when they have one. If the pin cannot be found, we
 * keep the newest `cap` rows and report that the first episode is unconfirmed.
 */
export function applyHistorySafetyCap<T extends CapEpisode>(
  episodes: T[] | null | undefined,
  cap: number,
  pinned?: { key?: string | null; episode?: T | null; confirmed?: boolean } | null
): HistoryCapResult<T> {
  const list = Array.isArray(episodes) ? episodes.slice() : [];
  const safeCap = Math.max(1, Math.floor(Number(cap) || 1));
  const pinKey =
    (pinned?.key && String(pinned.key)) || (pinned?.episode ? episodeKey(pinned.episode) : "");
  let earliest: T | null = pinKey ? list.find((ep) => episodeKey(ep) === pinKey) || null : null;
  if (!earliest && pinned?.episode) {
    const key = episodeKey(pinned.episode);
    earliest = list.find((ep) => episodeKey(ep) === key) || null;
  }
  const confirmed = !!earliest && pinned?.confirmed !== false;

  if (list.length <= safeCap) {
    const sorted = list.sort(sortNewest);
    return {
      episodes: sorted,
      capped: false,
      earliestKept: confirmed,
      earliest: earliest || null,
      retainedRange: retainedRangeOf(sorted),
    };
  }

  if (earliest) {
    const key = episodeKey(earliest);
    const newest = list
      .filter((ep) => episodeKey(ep) !== key)
      .sort(sortNewest)
      .slice(0, safeCap - 1);
    const episodesOut = [...newest, earliest].sort(sortNewest);
    return {
      episodes: episodesOut,
      capped: true,
      earliestKept: confirmed,
      earliest,
      retainedRange: retainedRangeOf(episodesOut),
    };
  }

  const newestOnly = list.sort(sortNewest).slice(0, safeCap);
  return {
    episodes: newestOnly,
    capped: true,
    earliestKept: false,
    earliest: null,
    retainedRange: retainedRangeOf(newestOnly),
  };
}