/**
 * On-demand remote song preparation (songs.create). Does not download media.
 *
 * Like bili: leave url empty; put enclosure in sourceData so the host resolves
 * playback via POST /api/music/url (with User-Agent / Referer headers).
 */

import { episodeDedupKey } from "./dedup";
import { normalizeFeedUrl } from "./hash";
import {
  appendLog,
  episodeIdentityKey,
  getSubscription,
  sanitizeReason,
  upsertSubscription,
  type EpisodeSummary,
  type Subscription,
} from "./store";

export type SongsApi = {
  create(
    songs: Array<{
      url?: string;
      title: string;
      artist?: string;
      album?: string;
      coverUrl?: string;
      duration?: number;
      dedupKey?: string;
      sourceData?: string;
    }>
  ): Promise<Song[]>;
  getById?(id: number): Promise<Song | null>;
  delete?(id: number): Promise<void>;
};

export type PrepareOk = {
  ok: true;
  songId: number;
  created: boolean;
  episode: EpisodeSummary;
  subscription: Subscription;
};

export type PrepareFail = {
  ok: false;
  reason: string;
  code: "not_found" | "no_enclosure" | "create_failed";
};

export type PrepareResult = PrepareOk | PrepareFail;

function findEpisode(
  sub: Subscription,
  opts: { guid?: string; dedupKey?: string; enclosureUrl?: string }
): EpisodeSummary | null {
  const guid = opts.guid != null ? String(opts.guid) : "";
  const dedupKey = opts.dedupKey != null ? String(opts.dedupKey) : "";
  const enc = opts.enclosureUrl != null ? String(opts.enclosureUrl).trim() : "";
  return (
    sub.episodes.find((ep) => {
      if (dedupKey && ep.dedupKey === dedupKey) return true;
      if (guid) {
        const id = episodeIdentityKey(sub.url, ep.guid, ep.enclosureUrl);
        if (id.guid === guid || ep.guid === guid) return true;
      }
      if (enc && ep.enclosureUrl === enc) return true;
      return false;
    }) || null
  );
}

function parseSourceData(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function songHasResolvableSource(song: Song | null | undefined, enclosureUrl: string): boolean {
  if (!song) return false;
  const sd = parseSourceData((song as Song & { source_data?: string }).source_data);
  const enc = sd && typeof sd.enclosureUrl === "string" ? sd.enclosureUrl.trim() : "";
  if (enc && enc === enclosureUrl) return true;
  // Legacy songs: feedUrl+guid still resolvable via music/url store lookup.
  if (sd && typeof sd.feedUrl === "string" && typeof sd.guid === "string") return true;
  return false;
}

function toCreateInput(sub: Subscription, ep: EpisodeSummary) {
  const dedupKey = ep.dedupKey || episodeDedupKey(sub.id, ep.guid, ep.enclosureUrl);
  const identity = episodeIdentityKey(sub.url, ep.guid, ep.enclosureUrl);
  const input: {
    title: string;
    artist: string;
    album: string;
    coverUrl?: string;
    duration?: number;
    dedupKey: string;
    sourceData: string;
  } = {
    // No direct url — host must call /api/music/url (bili pattern).
    title: ep.title,
    artist: sub.author || sub.title || "Podcast",
    album: sub.title,
    dedupKey,
    sourceData: JSON.stringify({
      enclosureUrl: ep.enclosureUrl,
      feedId: sub.id,
      feedUrl: normalizeFeedUrl(sub.url),
      guid: identity.guid,
      guidSource: ep.guidSource || identity.guidSource,
      pubDate: ep.pubDate,
      coverUrl: ep.coverUrl || sub.coverUrl || null,
      // Keep a short note so queue UI can show ShowNote even if feed index is stale.
      showNote: ep.description ? String(ep.description).slice(0, 4000) : null,
    }),
  };
  if (ep.coverUrl) input.coverUrl = ep.coverUrl;
  else if (sub.coverUrl) input.coverUrl = sub.coverUrl;
  if (ep.durationSec != null && ep.durationSec > 0) input.duration = ep.durationSec;
  return input;
}

/**
 * Prepare one episode: songs.create → cache songId on subscription episode index.
 */
export async function prepareEpisode(
  opts: {
    subscriptionId: string;
    guid?: string;
    dedupKey?: string;
    enclosureUrl?: string;
  },
  songsApi: SongsApi
): Promise<PrepareResult> {
  const sub = await getSubscription(opts.subscriptionId);
  if (!sub) return { ok: false, reason: "订阅不存在", code: "not_found" };

  const ep = findEpisode(sub, opts);
  if (!ep) return { ok: false, reason: "剧集不存在", code: "not_found" };
  if (!ep.enclosureUrl) return { ok: false, reason: "缺少音频地址", code: "no_enclosure" };

  if (typeof ep.songId === "number" && Number.isFinite(ep.songId)) {
    let reusable = true;
    if (typeof songsApi.getById === "function") {
      try {
        const existing = await songsApi.getById(ep.songId);
        reusable = songHasResolvableSource(existing, ep.enclosureUrl);
        if (!reusable && typeof songsApi.delete === "function") {
          try {
            await songsApi.delete(ep.songId);
          } catch {
            /* ignore stale delete */
          }
        }
      } catch {
        reusable = false;
      }
    }
    if (reusable) {
      return { ok: true, songId: ep.songId, created: false, episode: ep, subscription: sub };
    }
  }

  try {
    const input = toCreateInput(sub, ep);
    // Host-side dedup bump so stale url-only rows are not reused; episode.dedupKey stays stable.
    const hostDedupKey = `${input.dedupKey}:v2`;
    const batch = await songsApi.create([{ ...input, dedupKey: hostDedupKey }]);
    const song = Array.isArray(batch) ? batch[0] : null;
    const songId = song && typeof song.id === "number" ? song.id : null;
    if (songId == null) {
      return { ok: false, reason: "入库未返回 songId", code: "create_failed" };
    }

    const episodes = sub.episodes.map((e) =>
      e.dedupKey === ep.dedupKey || e.guid === ep.guid ? { ...e, songId, dedupKey: input.dedupKey } : e
    );
    const next: Subscription = { ...sub, episodes, updatedAt: Date.now() };
    await upsertSubscription(next);
    const updatedEp = episodes.find((e) => e.dedupKey === input.dedupKey) || {
      ...ep,
      songId,
      dedupKey: input.dedupKey,
    };
    return {
      ok: true,
      songId,
      created: true,
      episode: updatedEp,
      subscription: next,
    };
  } catch (e) {
    const reason = sanitizeReason(e);
    await appendLog("error", `准备音频失败 ${sub.title}/${ep.title}: ${reason}`);
    return { ok: false, reason, code: "create_failed" };
  }
}

/** Prepare many episodes; continues on individual failures. */
export async function prepareEpisodes(
  items: Array<{
    subscriptionId: string;
    guid?: string;
    dedupKey?: string;
    enclosureUrl?: string;
  }>,
  songsApi: SongsApi
): Promise<{
  ok: boolean;
  results: Array<PrepareResult & { subscriptionId: string }>;
  songIds: number[];
}> {
  const results: Array<PrepareResult & { subscriptionId: string }> = [];
  const songIds: number[] = [];
  let allOk = true;
  for (const item of items) {
    const r = await prepareEpisode(item, songsApi);
    results.push({ ...r, subscriptionId: item.subscriptionId });
    if (r.ok) songIds.push(r.songId);
    else allOk = false;
  }
  return { ok: allOk, results, songIds };
}
