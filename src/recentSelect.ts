/**
 * Bounded selection of the newest episodes across every subscription.
 *
 * `recentEpisodes()` used to materialise one object per stored episode for all
 * subscriptions and then sort the whole array just to keep the newest 40. With a
 * deep index that is thousands of allocations plus an O(n log n) sort on every
 * `/api/home` call — and the home tab re-reads it on every refresh.
 *
 * This module keeps only the top `limit` rows: it scans every episode once and
 * maintains a small array, replacing the current worst row when a candidate is
 * newer. The observable contract is unchanged (same rows, same order).
 *
 * Ties break on discovery order to match `Array.prototype.sort` stability on the
 * previous implementation: earlier subscription, then earlier episode wins.
 */

export interface RecentRow<T> {
  feedUrl: string;
  subscriptionId: string;
  showTitle: string;
  episode: T;
  /** Primary ordering key; `pubDateMs` when known, else the subscription's updatedAt. */
  sortMs: number;
}

export interface RecentSource<T> {
  id: string;
  url: string;
  title: string;
  updatedAt: number;
  episodes: T[];
}

interface Candidate<T> {
  row: RecentRow<T>;
  /** Global discovery index, used only to keep tie-breaking stable. */
  order: number;
}

/** True when `a` should rank ahead of `b` (newer first, then earlier discovery). */
function ranksBefore<T>(a: Candidate<T>, b: Candidate<T>): boolean {
  if (a.row.sortMs !== b.row.sortMs) return a.row.sortMs > b.row.sortMs;
  return a.order < b.order;
}

/**
 * @param sources subscriptions in storage order
 * @param limit how many rows the caller needs (>= 1)
 * @param sortMsOf resolves an episode's sort key
 */
export function selectRecentRows<T>(
  sources: RecentSource<T>[],
  limit: number,
  sortMsOf: (episode: T, source: RecentSource<T>) => number
): RecentRow<T>[] {
  const cap = Math.max(0, Math.floor(limit) || 0);
  if (cap === 0 || !Array.isArray(sources) || sources.length === 0) return [];

  /** Newest-last is not required; `worstAt` finds the row to evict. */
  const top: Candidate<T>[] = [];
  let worstAt = 0;
  let order = 0;

  const findWorst = (): number => {
    let at = 0;
    for (let i = 1; i < top.length; i++) {
      if (ranksBefore(top[at], top[i])) at = i; // top[i] is worse
    }
    return at;
  };

  for (const source of sources) {
    const episodes = Array.isArray(source.episodes) ? source.episodes : [];
    for (const episode of episodes) {
      const candidate: Candidate<T> = {
        order,
        row: {
          feedUrl: source.url,
          subscriptionId: source.id,
          showTitle: source.title,
          episode,
          sortMs: sortMsOf(episode, source),
        },
      };
      order += 1;

      if (top.length < cap) {
        top.push(candidate);
        if (top.length === cap) worstAt = findWorst();
        continue;
      }
      // Only touch the array when the candidate would actually displace a row.
      if (!ranksBefore(candidate, top[worstAt])) continue;
      top[worstAt] = candidate;
      worstAt = findWorst();
    }
  }

  top.sort((a, b) => (ranksBefore(a, b) ? -1 : ranksBefore(b, a) ? 1 : 0));
  return top.map((c) => c.row);
}
