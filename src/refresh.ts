import { episodeDedupKey } from "./dedup";
import { feedIdFromUrl, normalizeFeedUrl } from "./hash";
import { upsertSubscriptionPlaylist, clearPlaylistOnly, REPLACE_NOTE, type PlaylistsApi } from "./playlist";
import { fetchRss, type RssEpisode, type RssChannel } from "./rss";
import {
  appendLog,
  findByUrl,
  getSubscription,
  loadSettings,
  loadSubscriptions,
  removeSubscription,
  sanitizeReason,
  upsertSubscription,
  type EpisodeSummary,
  type Subscription,
} from "./store";
import { refreshScheduler } from "./schedule";

export { REPLACE_NOTE };

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
};

export interface RefreshDeps {
  songsApi: SongsApi;
  playlistsApi: PlaylistsApi;
  fetchImpl?: typeof fetch;
  now?: () => number;
  maxEpisodes?: number;
}

export interface RefreshOk {
  ok: true;
  subscription: Subscription;
  createdSongs: number;
  playlistId: number;
  playlistName: string;
  skippedNonAudio: number;
  truncated: boolean;
}

export interface RefreshFail {
  ok: false;
  skipped?: boolean;
  reason: string;
  subscription?: Subscription;
}

export type RefreshResult = RefreshOk | RefreshFail;

function episodeToCreateInput(
  feedId: string,
  channel: RssChannel,
  ep: RssEpisode,
  albumName: string
) {
  const dedupKey = episodeDedupKey(feedId, ep.guid, ep.enclosure.url);
  const artist = channel.author || channel.title || "Podcast";
  const input: {
    url: string;
    title: string;
    artist: string;
    album: string;
    coverUrl?: string;
    duration?: number;
    dedupKey: string;
    sourceData: string;
  } = {
    url: ep.enclosure.url,
    title: ep.title,
    artist,
    album: albumName,
    dedupKey,
    sourceData: JSON.stringify({
      feedId,
      guid: ep.guid,
      pubDate: ep.pubDate,
      enclosureType: ep.enclosure.type,
    }),
  };
  if (ep.coverUrl) input.coverUrl = ep.coverUrl;
  else if (channel.coverUrl) input.coverUrl = channel.coverUrl;
  if (ep.durationSec != null && ep.durationSec > 0) input.duration = ep.durationSec;
  return input;
}

function toSummaries(
  feedId: string,
  eps: RssEpisode[],
  songByDedup: Map<string, number>
): EpisodeSummary[] {
  return eps.map((ep) => {
    const dedupKey = episodeDedupKey(feedId, ep.guid, ep.enclosure.url);
    const summary: EpisodeSummary = {
      title: ep.title,
      guid: ep.guid,
      pubDate: ep.pubDate,
      pubDateMs: ep.pubDateMs,
      durationSec: ep.durationSec,
      coverUrl: ep.coverUrl,
      enclosureUrl: ep.enclosure.url,
      dedupKey,
    };
    const sid = songByDedup.get(dedupKey);
    if (typeof sid === "number") summary.songId = sid;
    return summary;
  });
}

/**
 * Validate URL by fetching + parsing; does not persist.
 */
export async function validateFeedUrl(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; channel: RssChannel } | { ok: false; reason: string }> {
  const result = await fetchRss(url, fetchImpl);
  if (!result.ok) return result;
  return { ok: true, channel: result.channel };
}

/**
 * Refresh one subscription: fetch → create remotes → replace playlist → persist.
 */
export async function refreshSubscription(
  subId: string,
  deps: RefreshDeps
): Promise<RefreshResult> {
  const now = (deps.now || Date.now)();
  const settings = await loadSettings();
  const maxEpisodes = deps.maxEpisodes ?? settings.maxEpisodes;
  const sub = await getSubscription(subId);
  if (!sub) return { ok: false, reason: "订阅不存在" };

  const parsed = await fetchRss(sub.url, deps.fetchImpl || fetch);
  if (!parsed.ok) {
    const next: Subscription = {
      ...sub,
      updatedAt: now,
      lastError: sanitizeReason(parsed.reason),
    };
    await upsertSubscription(next);
    await appendLog("error", `刷新失败 ${sub.title}: ${parsed.reason}`);
    return { ok: false, reason: parsed.reason, subscription: next };
  }

  const channel = parsed.channel;
  const truncated = channel.episodes.length > maxEpisodes;
  const slice = channel.episodes.slice(0, maxEpisodes);
  const inputs = slice.map((ep) => episodeToCreateInput(sub.id, channel, ep, channel.title));

  let created: Song[] = [];
  const songByDedup = new Map<string, number>();
  try {
    // Host dedups by dedupKey; chunk to avoid oversized payloads.
    const CHUNK = 40;
    for (let i = 0; i < inputs.length; i += CHUNK) {
      const sliceInputs = inputs.slice(i, i + CHUNK);
      const batch = await deps.songsApi.create(sliceInputs);
      if (!Array.isArray(batch)) continue;
      created = created.concat(batch);
      for (let j = 0; j < batch.length; j++) {
        const song = batch[j];
        const key =
          (typeof song.dedup_key === "string" && song.dedup_key) ||
          sliceInputs[j]?.dedupKey ||
          "";
        if (key && typeof song.id === "number") songByDedup.set(key, song.id);
      }
    }
  } catch (e) {
    const reason = sanitizeReason(e);
    const next: Subscription = { ...sub, updatedAt: now, lastError: reason };
    await upsertSubscription(next);
    await appendLog("error", `入库失败 ${sub.title}: ${reason}`);
    return { ok: false, reason, subscription: next };
  }
  // Prefer order of feed slice for playlist
  const songIds: number[] = [];
  for (const ep of slice) {
    const key = episodeDedupKey(sub.id, ep.guid, ep.enclosure.url);
    const id = songByDedup.get(key);
    if (typeof id === "number") songIds.push(id);
  }
  // Fallback: use returned order if mapping incomplete
  if (songIds.length === 0 && created.length) {
    for (const s of created) {
      if (typeof s.id === "number") songIds.push(s.id);
    }
  }

  let playlistId = sub.playlistId;
  let playlistName = sub.playlistName || channel.title;
  let createdPl = false;
  try {
    const upsert = await upsertSubscriptionPlaylist(deps.playlistsApi, {
      channelTitle: channel.title,
      description: `播客：${channel.title}`,
      songIds,
      previousPlaylistId: sub.playlistId,
      previousPlaylistName: sub.playlistName,
    });
    playlistId = upsert.playlistId;
    playlistName = upsert.playlistName;
    createdPl = upsert.created;
  } catch (e) {
    const reason = sanitizeReason(`歌单更新失败：${e}`);
    const next: Subscription = {
      ...sub,
      title: channel.title,
      author: channel.author,
      coverUrl: channel.coverUrl,
      updatedAt: now,
      lastError: reason,
      lastSkippedNonAudio: channel.skippedNonAudio,
      episodeCount: slice.length,
      episodes: toSummaries(sub.id, slice, songByDedup),
    };
    await upsertSubscription(next);
    await appendLog("error", `${channel.title}: ${reason}`);
    return { ok: false, reason, subscription: next };
  }

  const next: Subscription = {
    ...sub,
    title: channel.title,
    author: channel.author,
    coverUrl: channel.coverUrl,
    playlistId,
    playlistName,
    updatedAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastSkippedNonAudio: channel.skippedNonAudio,
    episodeCount: slice.length,
    episodes: toSummaries(sub.id, slice, songByDedup),
  };
  await upsertSubscription(next);
  await appendLog(
    "info",
    `已刷新「${channel.title}」：${slice.length} 集 → 歌单「${playlistName}」` +
      (createdPl ? "（新建）" : "") +
      (channel.skippedNonAudio ? `；跳过非音频 ${channel.skippedNonAudio}` : "")
  );
  return {
    ok: true,
    subscription: next,
    createdSongs: created.length,
    playlistId: playlistId!,
    playlistName: playlistName!,
    skippedNonAudio: channel.skippedNonAudio,
    truncated,
  };
}

/**
 * Add subscription: validate, persist, immediate refresh.
 */
async function addSubscriptionUnlocked(
  urlRaw: string,
  deps: RefreshDeps
): Promise<RefreshResult & { already?: boolean }> {
  const url = normalizeFeedUrl(urlRaw);
  if (!url) return { ok: false, reason: "URL 为空" };
  const list = await loadSubscriptions();
  const existing = findByUrl(list, url);
  if (existing) {
    const r = await refreshSubscription(existing.id, deps);
    return { ...r, already: true };
  }

  const validated = await validateFeedUrl(url, deps.fetchImpl || fetch);
  if (!validated.ok) return { ok: false, reason: validated.reason };

  const now = (deps.now || Date.now)();
  const id = feedIdFromUrl(url);
  const stub: Subscription = {
    id,
    url,
    title: validated.channel.title,
    author: validated.channel.author,
    coverUrl: validated.channel.coverUrl,
    playlistId: null,
    playlistName: null,
    createdAt: now,
    updatedAt: now,
    lastSuccessAt: null,
    lastError: null,
    lastSkippedNonAudio: 0,
    episodeCount: 0,
    episodes: [],
  };
  await upsertSubscription(stub);
  await appendLog("info", `已添加订阅「${stub.title}」`);
  return refreshSubscription(id, deps);
}

/** Add subscription under exclusive lock (shared with refresh / mutate). */
export async function addSubscription(
  urlRaw: string,
  deps: RefreshDeps
): Promise<RefreshResult & { already?: boolean }> {
  const gate = await refreshScheduler.runExclusive(() => addSubscriptionUnlocked(urlRaw, deps));
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

/**
 * Update subscription URL (re-validate + refresh). Keeps same id if URL host-path changes → new id.
 * Architect: 增/删/改 — we replace url in place when possible; if feedId changes, migrate.
 */
async function updateSubscriptionUrlUnlocked(
  id: string,
  urlRaw: string,
  deps: RefreshDeps
): Promise<RefreshResult> {
  const url = normalizeFeedUrl(urlRaw);
  if (!url) return { ok: false, reason: "URL 为空" };
  const sub = await getSubscription(id);
  if (!sub) return { ok: false, reason: "订阅不存在" };

  const list = await loadSubscriptions();
  const conflict = findByUrl(list, url);
  if (conflict && conflict.id !== id) {
    return {
      ok: false,
      reason: `该 URL 已被订阅「${conflict.title}」占用`,
      subscription: sub,
    };
  }

  const validated = await validateFeedUrl(url, deps.fetchImpl || fetch);
  if (!validated.ok) return { ok: false, reason: validated.reason };

  const newId = feedIdFromUrl(url);
  const now = (deps.now || Date.now)();
  if (newId !== sub.id) {
    // URL identity changed: remove old management row, insert new (keep playlist link).
    await removeSubscription(sub.id);
    const migrated: Subscription = {
      ...sub,
      id: newId,
      url,
      title: validated.channel.title,
      author: validated.channel.author,
      coverUrl: validated.channel.coverUrl,
      updatedAt: now,
      lastError: null,
    };
    await upsertSubscription(migrated);
    await appendLog("info", `已改订阅 URL「${sub.title}」→「${migrated.title}」`);
    return refreshSubscription(newId, deps);
  }

  const patched: Subscription = {
    ...sub,
    url,
    title: validated.channel.title,
    author: validated.channel.author,
    coverUrl: validated.channel.coverUrl,
    updatedAt: now,
    lastError: null,
  };
  await upsertSubscription(patched);
  return refreshSubscription(id, deps);
}

/** Update subscription URL under exclusive lock. */
export async function updateSubscriptionUrl(
  id: string,
  urlRaw: string,
  deps: RefreshDeps
): Promise<RefreshResult> {
  const gate = await refreshScheduler.runExclusive(() =>
    updateSubscriptionUrlUnlocked(id, urlRaw, deps)
  );
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

/**
 * Delete management entry only; optionally clear playlist songs (keep playlist + remotes).
 */
async function deleteSubscriptionUnlocked(
  id: string,
  opts: { clearPlaylist?: boolean; playlistsApi?: PlaylistsApi } = {}
): Promise<{
  ok: boolean;
  reason?: string;
  tip?: string;
  removed?: Subscription;
}> {
  const { removed } = await removeSubscription(id);
  if (!removed) return { ok: false, reason: "订阅不存在" };
  let tip = "已移除订阅管理项；歌单与远程曲仍保留。可在 Songloft 中手动删歌单/曲。";
  if (opts.clearPlaylist && opts.playlistsApi && removed.playlistId != null) {
    try {
      const n = await clearPlaylistOnly(opts.playlistsApi, removed.playlistId);
      tip = `已移除订阅管理项，并清空歌单「${removed.playlistName || removed.playlistId}」内 ${n} 首（歌单与远程曲文件仍保留）。`;
    } catch (e) {
      tip = `已移除订阅管理项；清空歌单失败：${sanitizeReason(e)}。歌单与远程曲仍保留。`;
    }
  }
  await appendLog("info", `已删除订阅「${removed.title}」`);
  return { ok: true, tip, removed };
}

/** Delete subscription management row under exclusive lock. */
export async function deleteSubscription(
  id: string,
  opts: { clearPlaylist?: boolean; playlistsApi?: PlaylistsApi } = {}
): Promise<{ ok: boolean; reason?: string; tip?: string; removed?: Subscription; skipped?: boolean }> {
  const gate = await refreshScheduler.runExclusive(() => deleteSubscriptionUnlocked(id, opts));
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

export async function refreshAll(deps: RefreshDeps): Promise<{
  ok: boolean;
  results: Array<{ id: string; title: string; ok: boolean; reason?: string }>;
}> {
  const list = await loadSubscriptions();
  const results: Array<{ id: string; title: string; ok: boolean; reason?: string }> = [];
  let allOk = true;
  for (const sub of list) {
    const r = await refreshSubscription(sub.id, deps);
    if (!r.ok) {
      allOk = false;
      results.push({ id: sub.id, title: sub.title, ok: false, reason: r.reason });
    } else {
      results.push({ id: sub.id, title: r.subscription.title, ok: true });
    }
  }
  return { ok: allOk, results };
}

export function defaultDeps(): RefreshDeps {
  return {
    songsApi: songloft.songs,
    playlistsApi: songloft.playlists,
  };
}

/** Exclusive refresh-all for scheduler / manual. */
export async function runScheduledRefreshAll(): Promise<void> {
  const gate = await refreshScheduler.runExclusive(async () => {
    const result = await refreshAll(defaultDeps());
    return result;
  });
  if (gate.skipped) {
    await appendLog("warn", "定时刷新跳过：busy");
    return;
  }
  const result = gate.result;
  await refreshScheduler.noteAttemptFinished(!!result.ok);
}

export async function runManualRefreshAll(): Promise<
  | { skipped: true; reason: "skipped_busy" }
  | { skipped: false; ok: boolean; results: Array<{ id: string; title: string; ok: boolean; reason?: string }> }
> {
  const gate = await refreshScheduler.runExclusive(async () => refreshAll(defaultDeps()));
  if (gate.skipped) return { skipped: true, reason: "skipped_busy" };
  if (gate.result.ok) await refreshScheduler.noteSuccess();
  // manual failure does not disarm schedule; still push due if enabled via noteAttemptFinished only on scheduled
  return { skipped: false, ...gate.result };
}

export async function runManualRefreshOne(id: string): Promise<
  | { skipped: true; reason: "skipped_busy" }
  | { skipped: false; result: RefreshResult }
> {
  const gate = await refreshScheduler.runExclusive(async () =>
    refreshSubscription(id, defaultDeps())
  );
  if (gate.skipped) return { skipped: true, reason: "skipped_busy" };
  if (gate.result.ok) await refreshScheduler.noteSuccess();
  return { skipped: false, result: gate.result };
}
