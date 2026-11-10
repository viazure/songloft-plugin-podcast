/**
 * Subscription refresh: fetch RSS → update episode index only.
 * Does NOT songs.create, does NOT touch the fixed「播客」playlist / listen-later.
 */

import { episodeDedupKey } from "./dedup";
import { feedIdFromUrl, normalizeFeedUrl } from "./hash";
import { fetchRss, type RssEpisode, type RssChannel } from "./rss";
import {
  appendLog,
  clampMaxEpisodes,
  episodeIdentityKey,
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

export interface RefreshDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  maxEpisodes?: number;
}

export interface RefreshOk {
  ok: true;
  subscription: Subscription;
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

function toSummaries(feedId: string, feedUrl: string, eps: RssEpisode[]): EpisodeSummary[] {
  return eps.map((ep) => {
    const identity = episodeIdentityKey(feedUrl, ep.guid, ep.enclosure.url);
    return {
      title: ep.title,
      guid: ep.guid,
      guidSource: identity.guidSource,
      pubDate: ep.pubDate,
      pubDateMs: ep.pubDateMs,
      durationSec: ep.durationSec,
      coverUrl: ep.coverUrl,
      enclosureUrl: ep.enclosure.url,
      dedupKey: episodeDedupKey(feedId, ep.guid, ep.enclosure.url),
      description: ep.description || null,
    };
  });
}

/** Merge new summaries with previous songId cache by dedupKey. */
function mergeSongIds(prev: EpisodeSummary[], next: EpisodeSummary[]): EpisodeSummary[] {
  const map = new Map<string, number>();
  for (const ep of prev) {
    if (typeof ep.songId === "number") map.set(ep.dedupKey, ep.songId);
  }
  return next.map((ep) => {
    const sid = map.get(ep.dedupKey);
    return typeof sid === "number" ? { ...ep, songId: sid } : ep;
  });
}

export async function validateFeedUrl(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; channel: RssChannel } | { ok: false; reason: string }> {
  const result = await fetchRss(url, fetchImpl);
  if (!result.ok) return result;
  return { ok: true, channel: result.channel };
}

export async function refreshSubscription(
  subId: string,
  deps: RefreshDeps = {}
): Promise<RefreshResult> {
  const now = (deps.now || Date.now)();
  const settings = await loadSettings();
  // Same clamp as settings storage: index depth can never exceed the hard cap.
  const maxEpisodes = clampMaxEpisodes(deps.maxEpisodes ?? settings.maxEpisodes);
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
  const summaries = mergeSongIds(sub.episodes, toSummaries(sub.id, sub.url, slice));

  const next: Subscription = {
    ...sub,
    title: channel.title,
    author: channel.author,
    coverUrl: channel.coverUrl,
    updatedAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastSkippedNonAudio: channel.skippedNonAudio,
    episodeCount: slice.length,
    truncated,
    episodes: summaries,
  };
  await upsertSubscription(next);
  await appendLog(
    "info",
    `已刷新「${channel.title}」：${slice.length} 集` +
      (truncated ? `（已达索引上限，仅保留最近 ${maxEpisodes} 集）` : "") +
      (channel.skippedNonAudio ? `；跳过非音频 ${channel.skippedNonAudio}` : "")
  );
  return {
    ok: true,
    subscription: next,
    skippedNonAudio: channel.skippedNonAudio,
    truncated,
  };
}

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
    createdAt: now,
    updatedAt: now,
    lastSuccessAt: null,
    lastError: null,
    lastSkippedNonAudio: 0,
    episodeCount: 0,
    truncated: false,
    episodes: [],
  };
  await upsertSubscription(stub);
  await appendLog("info", `已添加订阅「${stub.title}」`);
  return refreshSubscription(id, deps);
}

export async function addSubscription(
  urlRaw: string,
  deps: RefreshDeps = {}
): Promise<RefreshResult & { already?: boolean }> {
  const gate = await refreshScheduler.runExclusive(() => addSubscriptionUnlocked(urlRaw, deps));
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

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
      episodes: [],
      episodeCount: 0,
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

export async function updateSubscriptionUrl(
  id: string,
  urlRaw: string,
  deps: RefreshDeps = {}
): Promise<RefreshResult> {
  const gate = await refreshScheduler.runExclusive(() =>
    updateSubscriptionUrlUnlocked(id, urlRaw, deps)
  );
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

async function deleteSubscriptionUnlocked(id: string): Promise<{
  ok: boolean;
  reason?: string;
  tip?: string;
  removed?: Subscription;
}> {
  const { removed } = await removeSubscription(id);
  if (!removed) return { ok: false, reason: "订阅不存在" };
  await appendLog("info", `已删除订阅「${removed.title}」`);
  return {
    ok: true,
    tip: "已移除订阅；播放列表与收听进度未自动清除。",
    removed,
  };
}

export async function deleteSubscription(
  id: string
): Promise<{ ok: boolean; reason?: string; tip?: string; removed?: Subscription; skipped?: boolean }> {
  const gate = await refreshScheduler.runExclusive(() => deleteSubscriptionUnlocked(id));
  if (gate.skipped) return { ok: false, reason: "skipped_busy", skipped: true };
  return gate.result;
}

export async function refreshAll(deps: RefreshDeps = {}): Promise<{
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

export async function runScheduledRefreshAll(): Promise<void> {
  const gate = await refreshScheduler.runExclusive(async () => refreshAll({}));
  if (gate.skipped) {
    await appendLog("warn", "定时刷新跳过：busy");
    return;
  }
  await refreshScheduler.noteAttemptFinished(!!gate.result.ok);
}

export async function runManualRefreshAll(): Promise<
  | { skipped: true; reason: "skipped_busy" }
  | { skipped: false; ok: boolean; results: Array<{ id: string; title: string; ok: boolean; reason?: string }> }
> {
  const gate = await refreshScheduler.runExclusive(async () => refreshAll({}));
  if (gate.skipped) return { skipped: true, reason: "skipped_busy" };
  if (gate.result.ok) await refreshScheduler.noteSuccess();
  return { skipped: false, ...gate.result };
}

export async function runManualRefreshOne(id: string): Promise<
  | { skipped: true; reason: "skipped_busy" }
  | { skipped: false; result: RefreshResult }
> {
  const gate = await refreshScheduler.runExclusive(async () => refreshSubscription(id, {}));
  if (gate.skipped) return { skipped: true, reason: "skipped_busy" };
  if (gate.result.ok) await refreshScheduler.noteSuccess();
  return { skipped: false, result: gate.result };
}
