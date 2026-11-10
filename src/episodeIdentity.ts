/**
 * Resolve a host songId to the plugin SoT key (feedUrl + guid).
 *
 * Order (Architect A'):
 *  1. song_mapping written on play / queue / prepare
 *  2. songs.getById → source_data.{feedUrl,guid}
 *  3. subscription episode index by songId (auxiliary only)
 *
 * Never fuzzy-match on title. If nothing resolves, callers must not write
 * progress or history.
 */

import { episodeIdentityKey, loadSubscriptions, lookupSongMapping, rememberSongMapping } from "./store";
import { normalizeFeedUrl } from "./hash";

export type ResolvedEpisodeIdentity = {
  feedUrl: string;
  guid: string;
  title?: string;
  showTitle?: string;
  coverUrl?: string | null;
  durationSec?: number | null;
  subscriptionId?: string;
  dedupKey?: string;
  source: "mapping" | "source_data" | "index";
};

function parseSourceData(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function asNonEmptyString(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

/**
 * Extract feedUrl+guid from a song's source_data. Returns null when either
 * half is missing — partial data must not produce dirty progress keys.
 */
export function identityFromSourceData(raw: unknown): { feedUrl: string; guid: string } | null {
  const sd = parseSourceData(raw);
  if (!sd) return null;
  const feedUrl = normalizeFeedUrl(asNonEmptyString(sd.feedUrl));
  const guid = asNonEmptyString(sd.guid);
  if (!feedUrl || !guid) return null;
  return { feedUrl, guid };
}

async function identityFromIndex(songId: number): Promise<ResolvedEpisodeIdentity | null> {
  const subs = await loadSubscriptions();
  for (const sub of subs) {
    const ep = sub.episodes.find((e) => e.songId === songId);
    if (!ep) continue;
    const id = episodeIdentityKey(sub.url, ep.guid, ep.enclosureUrl);
    if (!id.guid) continue;
    return {
      feedUrl: normalizeFeedUrl(sub.url) || sub.url,
      guid: id.guid,
      title: ep.title,
      showTitle: sub.title,
      coverUrl: ep.coverUrl || sub.coverUrl,
      durationSec: ep.durationSec,
      subscriptionId: sub.id,
      dedupKey: ep.dedupKey,
      source: "index",
    };
  }
  return null;
}

/**
 * Resolve songId → {feedUrl,guid}. Optionally persist a mapping when the key
 * came from source_data / index so later events stay cheap.
 */
export async function resolveEpisodeIdentity(
  songId: number,
  opts?: { remember?: boolean }
): Promise<ResolvedEpisodeIdentity | null> {
  if (!Number.isFinite(songId) || songId <= 0) return null;

  const mapped = await lookupSongMapping(songId);
  if (mapped) {
    return {
      feedUrl: mapped.feedUrl,
      guid: mapped.guid,
      source: "mapping",
    };
  }

  let fromSource: ResolvedEpisodeIdentity | null = null;
  try {
    if (typeof songloft.songs?.getById === "function") {
      const song = await songloft.songs.getById(songId);
      const id = identityFromSourceData(
        song && ((song as { source_data?: unknown }).source_data ?? null)
      );
      if (id) {
        const sd = parseSourceData((song as { source_data?: unknown }).source_data);
        fromSource = {
          ...id,
          title: typeof song?.title === "string" ? song.title : undefined,
          showTitle:
            (sd && asNonEmptyString(sd.showTitle)) ||
            (typeof song?.artist === "string" ? song.artist : "") ||
            (typeof song?.album === "string" ? song.album : "") ||
            undefined,
          coverUrl:
            (sd && asNonEmptyString(sd.coverUrl)) ||
            (typeof song?.cover_url === "string" ? song.cover_url : null) ||
            null,
          durationSec:
            typeof song?.duration === "number" && song.duration > 0 ? song.duration : null,
          subscriptionId: (sd && asNonEmptyString(sd.feedId)) || undefined,
          source: "source_data",
        };
      }
    }
  } catch {
    /* songs.read may be unavailable in tests */
  }

  if (fromSource) {
    if (opts?.remember !== false) {
      await rememberSongMapping(songId, fromSource.feedUrl, fromSource.guid).catch(() => {});
    }
    return fromSource;
  }

  const fromIndex = await identityFromIndex(songId);
  if (fromIndex) {
    if (opts?.remember !== false) {
      await rememberSongMapping(songId, fromIndex.feedUrl, fromIndex.guid).catch(() => {});
    }
    return fromIndex;
  }

  return null;
}
