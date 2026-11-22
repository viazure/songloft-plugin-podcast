/**
 * Subscription refresh: fetch RSS → update episode index only.
 * Does NOT songs.create, does NOT touch the fixed「播客」playlist / listen-later.
 */

import { episodeDedupKey } from "./dedup";
import { mergeEpisodeIndex } from "./episodeIndex";
import { retainedRangeText } from "./historyCap";
import { feedIdFromUrl, normalizeFeedUrl } from "./hash";
import { fetchRss, type RssEpisode, type RssChannel } from "./rss";
import {
  appendLog,
  clampMaxEpisodes,
  defaultHistoryIndexFields,
  episodeIdentityKey,
  findByUrl,
  getSubscription,
  loadSettings,
  loadSubscriptions,
  MAX_AUTO_WINDOW,
  MAX_HISTORY_INDEX,
  removeSubscription,
  removeSubscriptions,
  sanitizeReason,
  upsertSubscription,
  type EpisodeSummary,
  type Subscription,
} from "./store";
import { refreshScheduler } from "./schedule";

const historyIndexLocks = new Set<string>();

/* ---------- refresh jobs: full coalesce + per-channel + mutation queue ---------- */

type FullRefreshResult = {
  ok: boolean;
  results: Array<{ id: string; title: string; ok: boolean; reason?: string }>;
};

type ChannelSlot = {
  promise: Promise<RefreshResult>;
  resolve: (r: RefreshResult) => void;
};

type FullJob = {
  promise: Promise<FullRefreshResult>;
  pendingIds: string[];
  /** Channels whose refreshSubscription promise has not settled yet. */
  activeIds: Set<string>;
  completedIds: Set<string>;
  snapshotIds: Set<string>;
  channelSlots: Map<string, ChannelSlot>;
  deps: RefreshDeps;
};

let fullJob: FullJob | null = null;
const oneJobs = new Map<string, Promise<RefreshResult>>();

type MutationItem = {
  run: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};
const mutationQueue: MutationItem[] = [];
let mutationRunning = false;
let drainingMutations: Promise<void> | null = null;

let fullStartArm: Promise<void> | null = null;

export function isRefreshJobBusy(): boolean {
  return !!(fullJob || fullStartArm || oneJobs.size > 0 || mutationRunning || mutationQueue.length > 0);
}

export function __resetHistoryIndexLocksForTests(): void {
  historyIndexLocks.clear();
  fullJob = null;
  oneJobs.clear();
  mutationQueue.length = 0;
  mutationRunning = false;
  drainingMutations = null;
  fullStartArm = null;
}

export function __resetRefreshJobsForTests(): void {
  __resetHistoryIndexLocksForTests();
}

function ensureChannelSlot(job: FullJob, id: string): ChannelSlot {
  let slot = job.channelSlots.get(id);
  if (!slot) {
    let resolve!: (r: RefreshResult) => void;
    const promise = new Promise<RefreshResult>((r) => {
      resolve = r;
    });
    slot = { promise, resolve };
    job.channelSlots.set(id, slot);
  }
  return slot;
}

async function drainMutations(): Promise<void> {
  if (drainingMutations) return drainingMutations;
  drainingMutations = (async () => {
    while (mutationQueue.length) {
      const item = mutationQueue.shift()!;
      mutationRunning = true;
      try {
        item.resolve(await item.run());
      } catch (e) {
        item.reject(e);
      } finally {
        mutationRunning = false;
      }
    }
  })().finally(() => {
    drainingMutations = null;
  });
  return drainingMutations;
}

function kickMutationsIfIdle(): void {
  if (!fullJob && !fullStartArm && oneJobs.size === 0 && mutationQueue.length) {
    void drainMutations();
  }
}

/** Add/update/delete/OPML — wait in line; never return skipped_busy. */
export function runStoreMutation<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    mutationQueue.push({
      run: () => fn(),
      resolve: (v) => resolve(v as T),
      reject,
    });
    if (!fullJob && !fullStartArm) kickMutationsIfIdle();
    else if (fullJob && fullJob.activeIds.size === 0) void drainMutations();
  });
}

/** Default full-refresh parallelism. Low to limit xyzfm-style IP ACL 403s. */
export const DEFAULT_REFRESH_CONCURRENCY = 2;
/** Hard cap — never unbounded. */
export const MAX_REFRESH_CONCURRENCY = 4;

export function clampRefreshConcurrency(value: unknown, fallback = DEFAULT_REFRESH_CONCURRENCY): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(MAX_REFRESH_CONCURRENCY, Math.floor(n)));
}

export interface RefreshDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  maxEpisodes?: number;
  /** RSS wait budget override (tests). Default RSS_FETCH_TIMEOUT_MS in rss.ts. */
  fetchTimeoutMs?: number;
  fetchDelay?: (ms: number) => Promise<void>;
  /**
   * Full-refresh parallelism. Default {@link DEFAULT_REFRESH_CONCURRENCY}, clamped to
   * 1..{@link MAX_REFRESH_CONCURRENCY}. Not a settings-page switch — override via deps
   * (tests / callers). Do not pass Infinity.
   */
  concurrency?: number;
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

function refreshIndexNote(
  historyIndexed: boolean,
  merged: {
    truncated: boolean;
    capped?: boolean;
    retainedRange?: Parameters<typeof retainedRangeText>[0];
  },
  maxEpisodes: number
): string {
  if (historyIndexed) {
    const range = retainedRangeText(merged.retainedRange);
    if (merged.capped) {
      return range ? `（深索引已封顶${range}）` : "（深索引已达上限）";
    }
    return range || "";
  }
  return merged.truncated ? `（已达索引上限，仅保留最近 ${maxEpisodes} 集）` : "";
}

export async function validateFeedUrl(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; channel: RssChannel } | { ok: false; reason: string }> {
  const result = await fetchRss(url, fetchImpl);
  if (!result.ok) return result;
  return { ok: true, channel: result.channel };
}

/**
 * Backfill missing channel description (and sparse title/author/cover) from the
 * live feed without merging episodes or touching refresh schedule timestamps.
 * Older subscriptions predate description persistence; opening the channel page
 * should still surface the show blurb when the feed has one.
 */
export async function ensureChannelDescription(
  subId: string,
  deps: RefreshDeps = {}
): Promise<Subscription | null> {
  return runStoreMutation(async () => {
    const sub = await getSubscription(subId);
    if (!sub) return null;
    if (typeof sub.description === "string" && sub.description.trim()) return sub;

    const parsed = await fetchRss(sub.url, deps.fetchImpl || fetch, rssFetchOpts(deps));
    if (!parsed.ok) return sub;

    const ch = parsed.channel;
    const description =
      typeof ch.description === "string" && ch.description.trim() ? ch.description.trim() : null;
    const author = sub.author || ch.author || null;
    const coverUrl = sub.coverUrl || ch.coverUrl || null;
    const title = (ch.title && ch.title.trim()) || sub.title;
    if (
      !description &&
      author === sub.author &&
      coverUrl === sub.coverUrl &&
      title === sub.title
    ) {
      return sub;
    }

    const now = (deps.now || Date.now)();
    const next: Subscription = {
      ...sub,
      title,
      author,
      coverUrl,
      description: description || sub.description || null,
      updatedAt: now,
    };
    await upsertSubscription(next);
    return next;
  });
}

function rssFetchOpts(deps: RefreshDeps): { timeoutMs?: number; delay?: (ms: number) => Promise<void> } {
  const opts: { timeoutMs?: number; delay?: (ms: number) => Promise<void> } = {};
  if (typeof deps.fetchTimeoutMs === "number" && deps.fetchTimeoutMs > 0) {
    opts.timeoutMs = deps.fetchTimeoutMs;
  }
  if (deps.fetchDelay) opts.delay = deps.fetchDelay;
  return opts;
}

export async function refreshSubscription(
  subId: string,
  deps: RefreshDeps = {}
): Promise<RefreshResult> {
  const now = (deps.now || Date.now)();
  const settings = await loadSettings();
  // Same clamp as settings storage: auto window can never exceed MAX_AUTO_WINDOW.
  const maxEpisodes = clampMaxEpisodes(deps.maxEpisodes ?? settings.maxEpisodes);
  const sub = await getSubscription(subId);
  if (!sub) return { ok: false, reason: "订阅不存在" };

  // fetchRss deadline settles this await (success or timeout). Per-channel
  // oneJobs / full-job slots MUST be released in the caller's finally when this
  // returns — even though the host HTTP may still occupy a connection.
  const parsed = await fetchRss(sub.url, deps.fetchImpl || fetch, rssFetchOpts(deps));
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
  const incoming = toSummaries(sub.id, sub.url, channel.episodes);
  const merged = mergeEpisodeIndex(sub.episodes, incoming, {
    mode: "window",
    windowSize: maxEpisodes,
    cap: sub.historyIndexed ? MAX_HISTORY_INDEX : MAX_AUTO_WINDOW,
    keepPrevious: !!sub.historyIndexed,
    pinnedEarliestKey: sub.historyEarliestDedupKey,
    pinnedEarliestConfirmed: sub.historyEarliestConfirmed,
  });

  const next: Subscription = {
    ...defaultHistoryIndexFields(),
    ...sub,
    title: channel.title,
    author: channel.author,
    description: channel.description || null,
    coverUrl: channel.coverUrl,
    updatedAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastSkippedNonAudio: channel.skippedNonAudio,
    episodeCount: merged.episodes.length,
    truncated: merged.truncated,
    feedEpisodeCount: merged.feedCount,
    historyIndexed: !!sub.historyIndexed,
    historyIndexStatus: sub.historyIndexStatus || "idle",
    historyIndexError: sub.historyIndexError || null,
    historyIndexAt: sub.historyIndexAt || null,
    historyIndexCapped: sub.historyIndexed ? merged.capped : false,
    historyEarliestDedupKey: sub.historyIndexed
      ? merged.earliestDedupKey || sub.historyEarliestDedupKey
      : sub.historyEarliestDedupKey,
    historyEarliestConfirmed: sub.historyIndexed
      ? merged.earliestConfirmed
      : sub.historyEarliestConfirmed,
    episodes: merged.episodes,
  };
  await upsertSubscription(next);
  await appendLog(
    "info",
    `已刷新「${channel.title}」：${merged.episodes.length} 集` +
      refreshIndexNote(sub.historyIndexed, merged, maxEpisodes) +
      (channel.skippedNonAudio ? `；跳过非音频 ${channel.skippedNonAudio}` : "")
  );
  return {
    ok: true,
    subscription: next,
    skippedNonAudio: channel.skippedNonAudio,
    truncated: merged.truncated,
  };
}

export async function indexSubscriptionHistory(
  id: string,
  deps: RefreshDeps = {}
): Promise<
  | {
      ok: true;
      subscription: Subscription;
      indexedCount: number;
      feedAvailableCount: number;
      truncated: boolean;
      capped: boolean;
      sourceLimited: boolean;
      skippedNonAudio: number;
      earliestConfirmed: boolean;
      cap: number;
    }
  | {
      ok: false;
      reason: string;
      alreadyRunning?: boolean;
      subscription?: Subscription;
    }
> {
  if (!id) return { ok: false, reason: "订阅不存在" };
  if (historyIndexLocks.has(id)) {
    const existing = await getSubscription(id);
    return {
      ok: false,
      reason: "already_running",
      alreadyRunning: true,
      subscription: existing,
    };
  }

  historyIndexLocks.add(id);
  try {
    const sub = await getSubscription(id);
    if (!sub) return { ok: false, reason: "订阅不存在" };

    const now0 = (deps.now || Date.now)();
    const running: Subscription = {
      ...sub,
      historyIndexStatus: "running",
      historyIndexError: null,
      historyIndexAt: now0,
      updatedAt: now0,
    };
    await upsertSubscription(running);

    const parsed = await fetchRss(sub.url, deps.fetchImpl || fetch, rssFetchOpts(deps));
    if (!parsed.ok) {
      const failed: Subscription = {
        ...running,
        historyIndexStatus: "error",
        historyIndexError: sanitizeReason(parsed.reason),
        updatedAt: (deps.now || Date.now)(),
      };
      await upsertSubscription(failed);
      await appendLog("error", `深索引失败「${sub.title}」: ${parsed.reason}`);
      return { ok: false, reason: parsed.reason, subscription: failed };
    }

    const channel = parsed.channel;
    const incoming = toSummaries(sub.id, sub.url, channel.episodes);
    const merged = mergeEpisodeIndex(sub.episodes, incoming, {
      mode: "history",
      windowSize: MAX_HISTORY_INDEX,
      cap: MAX_HISTORY_INDEX,
      keepPrevious: true,
      pinnedEarliestKey: sub.historyEarliestDedupKey,
      pinnedEarliestConfirmed: sub.historyEarliestConfirmed,
    });

    const now = (deps.now || Date.now)();
    const next: Subscription = {
      ...defaultHistoryIndexFields(),
      ...sub,
      title: channel.title,
      author: channel.author,
      description: channel.description || null,
      coverUrl: channel.coverUrl,
      updatedAt: now,
      lastSuccessAt: now,
      lastError: null,
      lastSkippedNonAudio: channel.skippedNonAudio,
      episodeCount: merged.episodes.length,
      truncated: merged.truncated,
      feedEpisodeCount: merged.feedCount,
      historyIndexed: true,
      historyIndexStatus: "success",
      historyIndexError: null,
      historyIndexAt: now,
      historyIndexCapped: merged.capped,
      historyEarliestDedupKey: merged.earliestDedupKey || sub.historyEarliestDedupKey,
      historyEarliestConfirmed: merged.earliestConfirmed,
      episodes: merged.episodes,
    };
    await upsertSubscription(next);
    await appendLog(
      "info",
      `深索引「${channel.title}」：${merged.episodes.length} 集` +
        refreshIndexNote(true, merged, MAX_HISTORY_INDEX) +
        (channel.skippedNonAudio ? `；跳过非音频 ${channel.skippedNonAudio}` : "")
    );

    return {
      ok: true,
      subscription: next,
      indexedCount: merged.episodes.length,
      feedAvailableCount: merged.feedCount,
      truncated: merged.truncated,
      capped: merged.capped,
      sourceLimited: !merged.capped,
      skippedNonAudio: channel.skippedNonAudio,
      earliestConfirmed: merged.earliestConfirmed,
      cap: MAX_HISTORY_INDEX,
    };
  } finally {
    historyIndexLocks.delete(id);
  }
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
    description: validated.channel.description || null,
    coverUrl: validated.channel.coverUrl,
    createdAt: now,
    updatedAt: now,
    lastSuccessAt: null,
    lastError: null,
    lastSkippedNonAudio: 0,
    episodeCount: 0,
    truncated: false,
    ...defaultHistoryIndexFields(),
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
  return runStoreMutation(() => addSubscriptionUnlocked(urlRaw, deps));
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
      description: validated.channel.description || null,
      coverUrl: validated.channel.coverUrl,
      updatedAt: now,
      lastError: null,
      episodes: [],
      episodeCount: 0,
      ...defaultHistoryIndexFields(),
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
    description: validated.channel.description || null,
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
  return runStoreMutation(() => updateSubscriptionUrlUnlocked(id, urlRaw, deps));
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
  return runStoreMutation(() => deleteSubscriptionUnlocked(id));
}

async function deleteSubscriptionsUnlocked(ids: string[]): Promise<{
  ok: boolean;
  reason?: string;
  tip?: string;
  removed?: Subscription[];
  removedCount?: number;
}> {
  const unique = Array.from(
    new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean))
  );
  if (!unique.length) return { ok: false, reason: "需要 ids" };
  const { removed } = await removeSubscriptions(unique);
  if (!removed.length) return { ok: false, reason: "没有匹配的订阅" };
  await appendLog("info", `已批量删除 ${removed.length} 条订阅`);
  return {
    ok: true,
    tip: `已删除 ${removed.length} 条订阅；播放列表与收听进度未自动清除。`,
    removed,
    removedCount: removed.length,
  };
}

export async function deleteSubscriptions(
  ids: string[]
): Promise<{
  ok: boolean;
  reason?: string;
  tip?: string;
  removed?: Subscription[];
  removedCount?: number;
  skipped?: boolean;
}> {
  return runStoreMutation(() => deleteSubscriptionsUnlocked(ids));
}

/**
 * Limited-concurrency full pass.
 *
 * Concurrency slots are released when the per-channel refresh promise *settles*
 * (ok / fail / RSS deadline from knife 4). We do **not** wait for a late host HTTP
 * that may still occupy a connection after fetchWithDeadline abandons waiting.
 * Knife 5 and any future pool must use that same settle point — never the TCP teardown.
 *
 * Failures are isolated: one channel's error/timeout does not cancel siblings.
 * Mutations only run while activeIds is empty (same safety as sequential knife 2+3).
 */
async function processFullJob(job: FullJob): Promise<FullRefreshResult> {
  const byId = new Map<string, FullRefreshResult["results"][number]>();
  let allOk = true;
  const concurrency = clampRefreshConcurrency(
    job.deps.concurrency,
    DEFAULT_REFRESH_CONCURRENCY
  );
  const running = new Set<Promise<void>>();

  const record = (id: string, result: RefreshResult) => {
    if (!result.ok) {
      allOk = false;
      byId.set(id, {
        id,
        title: (result.subscription && result.subscription.title) || id,
        ok: false,
        reason: result.reason,
      });
    } else {
      byId.set(id, { id, title: result.subscription.title, ok: true });
    }
  };

  const runOne = async (id: string): Promise<void> => {
    job.activeIds.add(id);
    const slot = ensureChannelSlot(job, id);
    let result: RefreshResult;
    try {
      try {
        const existing = oneJobs.get(id);
        if (existing) {
          result = await existing;
        } else {
          // Slot release = settle of this promise (incl. RSS timeout).
          const p = refreshSubscription(id, job.deps);
          oneJobs.set(id, p);
          try {
            result = await p;
          } finally {
            oneJobs.delete(id);
          }
        }
      } catch (e) {
        result = { ok: false, reason: String(e ?? "刷新失败") };
      }
      slot.resolve(result);
      job.completedIds.add(id);
      record(id, result);
    } finally {
      job.activeIds.delete(id);
    }
  };

  try {
    while (job.pendingIds.length > 0 || running.size > 0) {
      if (job.activeIds.size === 0) {
        await drainMutations();
      }
      while (job.pendingIds.length > 0 && running.size < concurrency) {
        const id = job.pendingIds.shift()!;
        const p = runOne(id).finally(() => {
          running.delete(p);
        });
        running.add(p);
      }
      if (running.size === 0) break;
      await Promise.race(running);
    }
    await drainMutations();
    const results: FullRefreshResult["results"] = [];
    for (const id of job.snapshotIds) {
      const row = byId.get(id);
      if (row) results.push(row);
    }
    return { ok: allOk, results };
  } finally {
    for (const [cid, slot] of job.channelSlots) {
      if (!job.completedIds.has(cid)) {
        slot.resolve({ ok: false, reason: "未在本轮刷新" });
      }
    }
    if (fullJob === job) fullJob = null;
    kickMutationsIfIdle();
  }
}

function beginFullJob(deps: RefreshDeps, ids: string[]): FullJob {
  const job: FullJob = {
    promise: null as unknown as Promise<FullRefreshResult>,
    pendingIds: [...ids],
    activeIds: new Set(),
    completedIds: new Set(),
    snapshotIds: new Set(ids),
    channelSlots: new Map(),
    deps,
  };
  job.promise = processFullJob(job);
  fullJob = job;
  return job;
}

export async function refreshAll(deps: RefreshDeps = {}): Promise<
  FullRefreshResult & { started?: boolean; joined?: boolean }
> {
  if (fullStartArm) await fullStartArm;
  if (fullJob) {
    const r = await fullJob.promise;
    return { ...r, started: true, joined: true };
  }
  const list = await loadSubscriptions();
  const ids = list.map((s) => s.id);
  const job = beginFullJob(deps, ids);
  const r = await job.promise;
  return { ...r, started: true, joined: false };
}

export async function runScheduledRefreshAll(): Promise<void> {
  const result = await refreshAll({});
  await refreshScheduler.noteAttemptFinished(!!result.ok);
}

export async function runManualRefreshAll(): Promise<
  | { skipped: false; ok: boolean; results: FullRefreshResult["results"]; joined?: boolean; started?: boolean }
> {
  const result = await refreshAll({});
  if (result.ok && !result.joined) await refreshScheduler.noteSuccess();
  return { skipped: false, ok: result.ok, results: result.results, joined: result.joined, started: result.started };
}

/**
 * Accept a manual refresh without holding the HTTP handler for the full RSS pass.
 * Duplicate calls join the in-flight full job (started: true) instead of 409 skipped_busy.
 */
export function startManualRefreshAll(): { skipped: false; started: true; joined?: boolean } {
  if (fullJob || fullStartArm) return { skipped: false, started: true, joined: true };
  fullStartArm = (async () => {
    try {
      if (fullJob) return;
      const list = await loadSubscriptions();
      if (fullJob) return;
      beginFullJob({}, list.map((s) => s.id));
    } catch (e) {
      try {
        await appendLog("error", `手动刷新异常: ${sanitizeReason(e)}`);
      } catch {
        /* ignore */
      }
    } finally {
      fullStartArm = null;
      kickMutationsIfIdle();
    }
  })();
  return { skipped: false, started: true, joined: false };
}

export async function runManualRefreshOne(id: string): Promise<
  | { skipped: false; result: RefreshResult; joined?: boolean }
  | { skipped: true; reason: "skipped_busy" }
> {
  if (!id) return { skipped: false, result: { ok: false, reason: "订阅不存在" } };

  if (fullStartArm) await fullStartArm;

  // Coalesce with standalone in-flight.
  const existingOne = oneJobs.get(id);
  if (existingOne) {
    const result = await existingOne;
    return { skipped: false, result, joined: true };
  }

  const job = fullJob;
  if (job) {
    if (job.activeIds.has(id) || job.pendingIds.includes(id)) {
      if (!job.activeIds.has(id)) {
        // Jump unstarted channel to the front of the pending queue.
        job.pendingIds = [id, ...job.pendingIds.filter((x) => x !== id)];
      }
      const result = await ensureChannelSlot(job, id).promise;
      return { skipped: false, result, joined: true };
    }
    // Already finished in this full pass (or not in snapshot): allow a fresh one.
  }

  const p = refreshSubscription(id, {});
  oneJobs.set(id, p);
  try {
    const result = await p;
    if (result.ok) await refreshScheduler.noteSuccess();
    return { skipped: false, result, joined: false };
  } finally {
    oneJobs.delete(id);
    kickMutationsIfIdle();
  }
}
