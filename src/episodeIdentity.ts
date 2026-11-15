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

import { episodeIdentityKey, findEpisodeMeta, isPlaceholderTitle, loadSubscriptions, lookupSongMapping, rememberSongMapping } from "./store";
import { normalizeFeedUrl } from "./hash";
import { pickEpisodeAndChannelCovers, usableCoverUrl } from "./coverUrl";

export type ResolvedEpisodeIdentity = {
  feedUrl: string;
  guid: string;
  title?: string;
  showTitle?: string;
  coverUrl?: string | null;
  /** Display-only fallback; never stored as the episode cover field. */
  channelCoverUrl?: string | null;
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
      ...pickEpisodeAndChannelCovers(ep.coverUrl, sub.coverUrl),
      durationSec: ep.durationSec,
      subscriptionId: sub.id,
      dedupKey: ep.dedupKey,
      source: "index",
    };
  }
  return null;
}

function sameIdentity(
  feedUrl: string,
  guid: string,
  otherFeed: string,
  otherGuid: string
): boolean {
  return (
    (normalizeFeedUrl(feedUrl) || feedUrl) === (normalizeFeedUrl(otherFeed) || otherFeed) &&
    String(guid || "").trim() === String(otherGuid || "").trim()
  );
}

/**
 * Mapping is only the SoT key. Fill title / show / cover from source_data or
 * the subscription index so history writes do not land as Untitled.
 */
async function enrichIdentity(
  songId: number,
  feedUrl: string,
  guid: string
): Promise<Partial<ResolvedEpisodeIdentity>> {
  const meta: Partial<ResolvedEpisodeIdentity> = {};

  try {
    if (typeof songloft.songs?.getById === "function") {
      const song = await songloft.songs.getById(songId);
      const id = identityFromSourceData(
        song && ((song as { source_data?: unknown }).source_data ?? null)
      );
      if (id && sameIdentity(feedUrl, guid, id.feedUrl, id.guid)) {
        const sd = parseSourceData((song as { source_data?: unknown }).source_data);
        const title = typeof song?.title === "string" ? song.title : "";
        if (!isPlaceholderTitle(title)) meta.title = title.trim();
        const showTitle =
          (sd && asNonEmptyString(sd.showTitle)) ||
          (typeof song?.artist === "string" ? song.artist : "") ||
          (typeof song?.album === "string" ? song.album : "") ||
          "";
        if (showTitle) meta.showTitle = showTitle;
        const cover =
          usableCoverUrl((sd && asNonEmptyString(sd.coverUrl)) || song?.cover_url) || null;
        if (cover) meta.coverUrl = cover;
        if (typeof song?.duration === "number" && song.duration > 0) meta.durationSec = song.duration;
        const feedId = sd && asNonEmptyString(sd.feedId);
        if (feedId) meta.subscriptionId = feedId;
      }
    }
  } catch {
    /* songs.read may be unavailable in tests */
  }

  if (isPlaceholderTitle(meta.title) || !meta.showTitle) {
    try {
      const fromSubs = findEpisodeMeta(await loadSubscriptions(), feedUrl, guid);
      if (fromSubs) {
        if (isPlaceholderTitle(meta.title) && fromSubs.title) meta.title = fromSubs.title;
        if (!meta.showTitle && fromSubs.showTitle) meta.showTitle = fromSubs.showTitle;
        if (!meta.coverUrl && fromSubs.coverUrl) meta.coverUrl = usableCoverUrl(fromSubs.coverUrl) || null;
        if ((meta.durationSec == null || meta.durationSec <= 0) && fromSubs.durationSec) {
          meta.durationSec = fromSubs.durationSec;
        }
        if (!meta.subscriptionId && fromSubs.subscriptionId) meta.subscriptionId = fromSubs.subscriptionId;
        if (!meta.dedupKey && fromSubs.dedupKey) meta.dedupKey = fromSubs.dedupKey;
      }
    } catch {
      /* best-effort */
    }
  }

  if (isPlaceholderTitle(meta.title) || !meta.showTitle) {
    const fromIndex = await identityFromIndex(songId);
    if (fromIndex && sameIdentity(feedUrl, guid, fromIndex.feedUrl, fromIndex.guid)) {
      if (isPlaceholderTitle(meta.title) && fromIndex.title && !isPlaceholderTitle(fromIndex.title)) {
        meta.title = fromIndex.title;
      }
      if (!meta.showTitle && fromIndex.showTitle) meta.showTitle = fromIndex.showTitle;
      if (!meta.coverUrl && fromIndex.coverUrl) meta.coverUrl = fromIndex.coverUrl;
      if ((meta.durationSec == null || meta.durationSec <= 0) && fromIndex.durationSec) {
        meta.durationSec = fromIndex.durationSec;
      }
      if (!meta.subscriptionId && fromIndex.subscriptionId) meta.subscriptionId = fromIndex.subscriptionId;
      if (!meta.dedupKey && fromIndex.dedupKey) meta.dedupKey = fromIndex.dedupKey;
    }
  }

  return meta;
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
    const meta = await enrichIdentity(songId, mapped.feedUrl, mapped.guid);
    return {
      feedUrl: mapped.feedUrl,
      guid: mapped.guid,
      source: "mapping",
      ...meta,
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
            usableCoverUrl((sd && asNonEmptyString(sd.coverUrl)) || song?.cover_url) || null,
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
