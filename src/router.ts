import { createRouter, jsonResponse } from "@songloft/plugin-sdk";
import type { HTTPRequest, HTTPResponse } from "@songloft/plugin-sdk";
import {
  addSubscription,
  deleteSubscription,
  runManualRefreshAll,
  runManualRefreshOne,
  updateSubscriptionUrl,
} from "./refresh";
import { runOpmlImport, runOpmlPreview } from "./opmlImport";
import {
  appendLog,
  episodeIdentityKey,
  getProgress,
  getSubscription,
  loadAllProgress,
  loadFavorites,
  loadHistory,
  loadLog,
  loadSettings,
  loadSubscriptions,
  MAX_EPISODE_INDEX,
  publicEpisode,
  publicSubscription,
  recordHistory,
  removeHistoryEntry,
  removeHistoryEntries,
  clearHistory,
  rememberSongMapping,
  saveRefreshSchedule,
  saveSettings,
  toggleFavorite,
  touchHistoryProgress,
  upsertProgress,
  type EpisodeSummary,
} from "./store";
import { resolveEpisodeIdentity } from "./episodeIdentity";
import { isPlayEventsSubscribed } from "./playEvents";
import { refreshScheduler, normalizeIntervalHours } from "./schedule";
import { prepareEpisode, prepareEpisodes } from "./prepare";
import {
  appendToPodcastQueue,
  clearPodcastQueue,
  listPodcastQueue,
  moveInPodcastQueue,
  removeFromPodcastQueue,
  reorderPodcastQueue,
} from "./podcastQueue";
import { pickPlayedSongIds } from "./queueFilters";
import { buildOpml, opmlExportFilename } from "./opmlExport";
import { castPlaylistToMiot, castSongToMiot, isPodcastSong, listMiotDevices } from "./castMiot";
import { normalizeFeedUrl } from "./hash";
import { musicUrlHandler } from "./musicUrl";

const router = createRouter();

/** Host on-demand playback / download URL resolve (required for plugin-sourced remote songs). */
router.post("/api/music/url", musicUrlHandler);

function readJson(req: HTTPRequest): Record<string, unknown> {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "object") return body as Record<string, unknown>;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function readOpmlText(body: Record<string, unknown>): string {
  if (typeof body.opml === "string") return body.opml;
  if (typeof body.text === "string") return body.text;
  if (typeof body.xml === "string") return body.xml;
  return "";
}

function findProgress(
  progressList: Awaited<ReturnType<typeof loadAllProgress>>,
  feedUrl: string,
  guid: string
) {
  const norm = normalizeFeedUrl(feedUrl);
  return (
    progressList.find(
      (p) => p.guid === guid && (p.feedUrl === feedUrl || normalizeFeedUrl(p.feedUrl) === norm)
    ) || null
  );
}

function favoriteKey(feedUrl: string, guid: string): string {
  return `${normalizeFeedUrl(feedUrl)}::${guid}`;
}

async function recentEpisodes(limit: number) {
  const subs = await loadSubscriptions();
  const progressList = await loadAllProgress();
  const favorites = await loadFavorites();
  const favKeys = new Set(favorites.map((f) => favoriteKey(f.feedUrl, f.guid)));
  type Row = {
    feedUrl: string;
    subscriptionId: string;
    showTitle: string;
    episode: EpisodeSummary;
    sortMs: number;
  };
  const rows: Row[] = [];
  for (const sub of subs) {
    for (const ep of sub.episodes) {
      rows.push({
        feedUrl: sub.url,
        subscriptionId: sub.id,
        showTitle: sub.title,
        episode: ep,
        sortMs: ep.pubDateMs ?? sub.updatedAt,
      });
    }
  }
  rows.sort((a, b) => b.sortMs - a.sortMs);
  return rows.slice(0, limit).map((r) => {
    const id = episodeIdentityKey(r.feedUrl, r.episode.guid, r.episode.enclosureUrl);
    const prog = findProgress(progressList, r.feedUrl, id.guid);
    return {
      subscriptionId: r.subscriptionId,
      showTitle: r.showTitle,
      favorited: favKeys.has(favoriteKey(r.feedUrl, id.guid)),
      ...publicEpisode(r.feedUrl, r.episode, prog),
    };
  });
}

function parseSongSourceData(raw: unknown): Record<string, unknown> | null {
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

/** Persist songId→{feedUrl,guid} after prepare / queue so play events can resolve the SoT key. */
async function rememberPreparedMapping(
  songId: number | null | undefined,
  feedUrl: string,
  guid: string | null | undefined
): Promise<void> {
  if (songId == null || !Number.isFinite(songId) || !feedUrl || !guid) return;
  await rememberSongMapping(songId, feedUrl, String(guid)).catch(() => {});
}

router.get("/api/status", async () => {
  const subs = await loadSubscriptions();
  const schedule = refreshScheduler.getState();
  const settings = await loadSettings();
  return jsonResponse({
    ok: true,
    subscriptionCount: subs.length,
    maxEpisodes: settings.maxEpisodes,
    podcastPlaylistId: settings.podcastPlaylistId,
    podcastPlaylistName: settings.podcastPlaylistName,
    /** True when onInit successfully subscribed to songloft.events.onPlayEvent. */
    playEventsActive: isPlayEventsSubscribed(),
    playPathNote:
      "songs.create(sourceData) → 宿主调 /api/music/url → player.play(songId)；固定歌单「播客」= 播放列表",
    schedule: {
      enabled: !!schedule.enabled,
      intervalHours: schedule.intervalHours,
      lastSuccessAt: schedule.lastSuccessAt,
      nextDueAt: schedule.nextDueAt,
    },
  });
});

router.get("/api/home", async () => {
  const settings = await loadSettings();
  const recent = await recentEpisodes(40);
  const progress = await loadAllProgress();
  const inProgress = progress
    .filter((p) => !p.completed && p.positionSec > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);
  let queue: { playlistId: number; playlistName: string; songCount: number } | null = null;
  try {
    const q = await listPodcastQueue(songloft.playlists);
    queue = {
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      songCount: q.songs.length,
    };
  } catch {
    queue = {
      playlistId: settings.podcastPlaylistId ?? -1,
      playlistName: settings.podcastPlaylistName,
      songCount: -1,
    };
  }
  return jsonResponse({
    ok: true,
    queue,
    recent,
    resumeCandidates: inProgress,
  });
});

router.get("/api/settings", async () => {
  const settings = await loadSettings();
  const schedule = refreshScheduler.getState();
  return jsonResponse({
    ok: true,
    maxEpisodes: settings.maxEpisodes,
    maxEpisodesLimit: MAX_EPISODE_INDEX,
    podcastPlaylistId: settings.podcastPlaylistId,
    podcastPlaylistName: settings.podcastPlaylistName,
    castAction: settings.castAction,
    scheduleEnabled: !!schedule.enabled,
    scheduleIntervalHours: schedule.intervalHours,
    scheduleLastSuccessAt: schedule.lastSuccessAt,
    scheduleNextDueAt: schedule.nextDueAt,
    /**
     * With `events` + successful onPlayEvent subscribe, host-bar / other-entry
     * plays are also written to play_history. Without it, only the plugin page
     * records history — the UI must not pretend every source is covered.
     */
    playEventsActive: isPlayEventsSubscribed(),
  });
});

router.post("/api/settings", async (req) => {
  const body = readJson(req);
  const patch: { maxEpisodes?: number; castAction?: string } = {};
  if (typeof body.maxEpisodes === "number" || typeof body.maxEpisodes === "string") {
    const n = Number(body.maxEpisodes);
    if (Number.isFinite(n)) patch.maxEpisodes = n;
  }
  if (typeof body.castAction === "string" && body.castAction.trim()) {
    patch.castAction = body.castAction.trim();
  }
  const settings = Object.keys(patch).length ? await saveSettings(patch) : await loadSettings();

  const schedulePatch: { enabled?: boolean; intervalHours?: number } = {};
  if (typeof body.scheduleEnabled === "boolean") schedulePatch.enabled = body.scheduleEnabled;
  if (
    typeof body.scheduleIntervalHours === "number" ||
    typeof body.scheduleIntervalHours === "string"
  ) {
    schedulePatch.intervalHours = normalizeIntervalHours(body.scheduleIntervalHours);
  }
  let schedule = refreshScheduler.getState();
  if (schedulePatch.enabled !== undefined || schedulePatch.intervalHours !== undefined) {
    schedule = await refreshScheduler.applyState(schedulePatch, { rearm: true, persist: false });
    await saveRefreshSchedule(schedule);
  }
  await appendLog("info", "settings saved");
  return jsonResponse({
    ok: true,
    maxEpisodes: settings.maxEpisodes,
    maxEpisodesLimit: MAX_EPISODE_INDEX,
    podcastPlaylistId: settings.podcastPlaylistId,
    podcastPlaylistName: settings.podcastPlaylistName,
    castAction: settings.castAction,
    scheduleEnabled: !!schedule.enabled,
    scheduleIntervalHours: schedule.intervalHours,
    scheduleLastSuccessAt: schedule.lastSuccessAt,
    scheduleNextDueAt: schedule.nextDueAt,
    playEventsActive: isPlayEventsSubscribed(),
  });
});

router.get("/api/subscriptions", async () => {
  const list = await loadSubscriptions();
  return jsonResponse({
    ok: true,
    subscriptions: list.map(publicSubscription),
  });
});

router.post("/api/subscriptions", async (req) => {
  const body = readJson(req);
  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) return jsonResponse({ ok: false, error: "需要 RSS URL" }, 400);
  const result = await addSubscription(url, {});
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.reason,
        already: !!(result as { already?: boolean }).already,
        skipped: !result.ok && result.skipped,
      },
      result.reason === "skipped_busy" ? 409 : 400
    );
  }
  return jsonResponse({
    ok: true,
    already: !!(result as { already?: boolean }).already,
    subscription: publicSubscription(result.subscription),
    skippedNonAudio: result.skippedNonAudio,
    truncated: result.truncated,
  });
});

router.get("/api/subscriptions/:id", async (_req, params) => {
  const id = params.id || "";
  const sub = await getSubscription(id);
  if (!sub) return jsonResponse({ ok: false, error: "订阅不存在" }, 404);
  return jsonResponse({ ok: true, subscription: publicSubscription(sub) });
});

router.get("/api/subscriptions/:id/episodes", async (_req, params) => {
  const id = params.id || "";
  const sub = await getSubscription(id);
  if (!sub) return jsonResponse({ ok: false, error: "订阅不存在" }, 404);
  const progressList = await loadAllProgress();
  const favorites = await loadFavorites();
  const favKeys = new Set(favorites.map((f) => favoriteKey(f.feedUrl, f.guid)));
  const episodes = sub.episodes.map((ep) => {
    const identity = episodeIdentityKey(sub.url, ep.guid, ep.enclosureUrl);
    const prog = findProgress(progressList, sub.url, identity.guid);
    return {
      subscriptionId: sub.id,
      showTitle: sub.title,
      favorited: favKeys.has(favoriteKey(sub.url, identity.guid)),
      ...publicEpisode(sub.url, ep, prog),
    };
  });
  return jsonResponse({
    ok: true,
    id: sub.id,
    title: sub.title,
    episodes,
  });
});

router.put("/api/subscriptions/:id", async (req, params) => {
  const id = params.id || "";
  const body = readJson(req);
  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) return jsonResponse({ ok: false, error: "需要 RSS URL" }, 400);
  const result = await updateSubscriptionUrl(id, url, {});
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.reason,
        skipped: result.skipped,
        subscription: result.subscription ? publicSubscription(result.subscription) : undefined,
      },
      result.reason === "skipped_busy" ? 409 : 400
    );
  }
  return jsonResponse({
    ok: true,
    subscription: publicSubscription(result.subscription),
  });
});

router.delete("/api/subscriptions/:id", async (_req, params) => {
  const id = params.id || "";
  const result = await deleteSubscription(id);
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: result.reason, skipped: result.skipped },
      result.skipped ? 409 : 404
    );
  }
  return jsonResponse({
    ok: true,
    tip: result.tip,
    removed: result.removed ? publicSubscription(result.removed) : null,
  });
});

router.post("/api/subscriptions/:id/refresh", async (_req, params) => {
  const id = params.id || "";
  const run = await runManualRefreshOne(id);
  if (run.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  const result = run.result;
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.reason,
        subscription: result.subscription ? publicSubscription(result.subscription) : undefined,
      },
      400
    );
  }
  return jsonResponse({
    ok: true,
    subscription: publicSubscription(result.subscription),
    skippedNonAudio: result.skippedNonAudio,
    truncated: result.truncated,
  });
});

router.post("/api/refresh", async () => {
  const run = await runManualRefreshAll();
  if (run.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  return jsonResponse({
    ok: run.ok,
    results: run.results,
  });
});

router.post("/api/episodes/prepare", async (req) => {
  const body = readJson(req);
  const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : "";
  if (!subscriptionId) return jsonResponse({ ok: false, error: "需要 subscriptionId" }, 400);
  const result = await prepareEpisode(
    {
      subscriptionId,
      guid: typeof body.guid === "string" ? body.guid : undefined,
      dedupKey: typeof body.dedupKey === "string" ? body.dedupKey : undefined,
      enclosureUrl: typeof body.enclosureUrl === "string" ? body.enclosureUrl : undefined,
    },
    songloft.songs
  );
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: result.reason, code: result.code },
      result.code === "not_found" ? 404 : 400
    );
  }
  const epPublic = publicEpisode(result.subscription.url, result.episode);
  await rememberPreparedMapping(result.songId, result.subscription.url, epPublic.guid);
  return jsonResponse({
    ok: true,
    songId: result.songId,
    created: result.created,
    episode: epPublic,
  });
});

router.post("/api/queue/add", async (req) => {
  const body = readJson(req);
  const items = Array.isArray(body.items) ? body.items : null;
  const single =
    typeof body.subscriptionId === "string"
      ? [
          {
            subscriptionId: body.subscriptionId,
            guid: typeof body.guid === "string" ? body.guid : undefined,
            dedupKey: typeof body.dedupKey === "string" ? body.dedupKey : undefined,
            enclosureUrl: typeof body.enclosureUrl === "string" ? body.enclosureUrl : undefined,
          },
        ]
      : null;
  const list = (items || single || []) as Array<{
    subscriptionId: string;
    guid?: string;
    dedupKey?: string;
    enclosureUrl?: string;
  }>;
  if (!list.length) return jsonResponse({ ok: false, error: "需要 items 或 subscriptionId" }, 400);

  const prepared = await prepareEpisodes(list, songloft.songs);
  if (!prepared.songIds.length) {
    return jsonResponse(
      { ok: false, error: "准备音频失败", results: prepared.results },
      400
    );
  }
  for (const r of prepared.results) {
    if (!r.ok) continue;
    const guid = episodeIdentityKey(r.subscription.url, r.episode.guid, r.episode.enclosureUrl).guid;
    await rememberPreparedMapping(r.songId, r.subscription.url, guid);
  }
  try {
    const q = await appendToPodcastQueue(songloft.playlists, prepared.songIds);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      added: q.added,
      skipped: q.skipped,
      songIds: prepared.songIds,
      prepareFailures: prepared.results.filter((r) => !r.ok).length,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "加入播放列表失败") }, 500);
  }
});

router.post("/api/queue/add-show", async (req) => {
  const body = readJson(req);
  const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : "";
  if (!subscriptionId) return jsonResponse({ ok: false, error: "需要 subscriptionId" }, 400);
  const sub = await getSubscription(subscriptionId);
  if (!sub) return jsonResponse({ ok: false, error: "订阅不存在" }, 404);
  const items = sub.episodes.map((ep) => ({
    subscriptionId,
    dedupKey: ep.dedupKey,
    guid: episodeIdentityKey(sub.url, ep.guid, ep.enclosureUrl).guid,
  }));
  const prepared = await prepareEpisodes(items, songloft.songs);
  if (!prepared.songIds.length) {
    return jsonResponse({ ok: false, error: "准备音频失败", results: prepared.results }, 400);
  }
  for (const r of prepared.results) {
    if (!r.ok) continue;
    const guid = episodeIdentityKey(r.subscription.url, r.episode.guid, r.episode.enclosureUrl).guid;
    await rememberPreparedMapping(r.songId, r.subscription.url, guid);
  }
  try {
    const q = await appendToPodcastQueue(songloft.playlists, prepared.songIds);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      added: q.added,
      skipped: q.skipped,
      songIds: prepared.songIds,
      prepareFailures: prepared.results.filter((r) => !r.ok).length,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "加入播放列表失败") }, 500);
  }
});

function pickAbsoluteCover(
  candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const u = typeof c === "string" ? c.trim() : "";
    if (!u) continue;
    if (/^https?:\/\//i.test(u)) return u;
  }
  return null;
}

async function buildQueueListing() {
  const q = await listPodcastQueue(songloft.playlists);
  const progressList = await loadAllProgress();
  const favorites = await loadFavorites();
  const favKeys = new Set(favorites.map((f) => favoriteKey(f.feedUrl, f.guid)));
  const subs = await loadSubscriptions();
  const songs = [];
  for (const s of q.songs) {
    let feedUrl = "";
    let guid = "";
    let showNote: string | null = null;
    let subscriptionId = "";
    let coverFromSource: string | null = null;
    let epCover: string | null = null;
    let subCover: string | null = null;
    let durationSec: number | null =
      typeof s.duration === "number" && s.duration > 0 ? s.duration : null;

    try {
      const full = await songloft.songs.getById(s.id);
      const sd = parseSongSourceData(full && (full as { source_data?: string }).source_data);
      if (sd) {
        feedUrl = typeof sd.feedUrl === "string" ? sd.feedUrl : "";
        guid = typeof sd.guid === "string" ? sd.guid : "";
        subscriptionId = typeof sd.feedId === "string" ? sd.feedId : "";
        if (typeof sd.coverUrl === "string" && sd.coverUrl.trim()) coverFromSource = sd.coverUrl.trim();
        if (typeof sd.showNote === "string" && sd.showNote.trim()) showNote = sd.showNote;
      }
    } catch {
      /* ignore */
    }

    // Prefer matching by songId across all subscriptions (robust if source_data incomplete).
    let matchedEp: EpisodeSummary | null = null;
    let matchedSub = subscriptionId ? subs.find((x) => x.id === subscriptionId) || null : null;
    if (!matchedSub && feedUrl) {
      matchedSub = subs.find((x) => normalizeFeedUrl(x.url) === normalizeFeedUrl(feedUrl)) || null;
    }
    if (matchedSub) {
      matchedEp =
        matchedSub.episodes.find((e) => e.songId === s.id) ||
        (guid
          ? matchedSub.episodes.find((e) => {
              const id = episodeIdentityKey(matchedSub!.url, e.guid, e.enclosureUrl);
              return id.guid === guid || e.guid === guid || e.enclosureUrl === guid;
            }) || null
          : null);
    }
    if (!matchedEp) {
      for (const sub of subs) {
        const hit = sub.episodes.find((e) => e.songId === s.id);
        if (hit) {
          matchedSub = sub;
          matchedEp = hit;
          break;
        }
      }
    }
    if (matchedSub) {
      subscriptionId = matchedSub.id;
      feedUrl = feedUrl || matchedSub.url;
      subCover = matchedSub.coverUrl;
    }
    if (matchedEp) {
      guid = guid || episodeIdentityKey(matchedSub!.url, matchedEp.guid, matchedEp.enclosureUrl).guid;
      if (matchedEp.description) showNote = matchedEp.description;
      epCover = matchedEp.coverUrl;
      if (matchedEp.durationSec != null && matchedEp.durationSec > 0) {
        durationSec = matchedEp.durationSec;
      }
    }

    const coverUrl = pickAbsoluteCover([epCover, coverFromSource, subCover, s.cover_url]);

    const prog = feedUrl && guid ? findProgress(progressList, feedUrl, guid) : null;
    songs.push({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: durationSec ?? s.duration,
      cover_url: coverUrl || "",
      coverUrl: coverUrl,
      feedUrl: feedUrl || null,
      guid: guid || null,
      subscriptionId: subscriptionId || null,
      showNote,
      hasShowNote: !!(
        showNote &&
        (showNote.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || /<img\b/i.test(showNote))
      ),
      favorited: feedUrl && guid ? favKeys.has(favoriteKey(feedUrl, guid)) : false,
      progress: prog
        ? {
            positionSec: prog.positionSec,
            durationSec: prog.durationSec ?? durationSec,
            completed: prog.completed,
          }
        : null,
    });
  }
  return { playlistId: q.playlistId, playlistName: q.playlistName, songs };
}

router.get("/api/queue", async () => {
  try {
    const listing = await buildQueueListing();
    return jsonResponse({ ok: true, ...listing });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "读取播放列表失败") }, 500);
  }
});

router.post("/api/queue/remove", async (req) => {
  const body = readJson(req);
  const songIds = Array.isArray(body.songIds)
    ? body.songIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : typeof body.songId === "number" || typeof body.songId === "string"
      ? [Number(body.songId)].filter((n) => Number.isFinite(n))
      : [];
  if (!songIds.length) return jsonResponse({ ok: false, error: "需要 songIds" }, 400);
  try {
    const q = await removeFromPodcastQueue(songloft.playlists, songIds);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      removed: q.removed,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "移除失败") }, 500);
  }
});

router.post("/api/queue/move", async (req) => {
  const body = readJson(req);
  const songId = Number(body.songId);
  const direction = body.direction === "up" || body.direction === -1 ? -1 : 1;
  if (!Number.isFinite(songId)) return jsonResponse({ ok: false, error: "需要 songId" }, 400);
  try {
    const q = await moveInPodcastQueue(songloft.playlists, songId, direction as -1 | 1);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      songIds: q.songIds,
      moved: q.moved,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "重排失败") }, 500);
  }
});

router.post("/api/queue/reorder", async (req) => {
  const body = readJson(req);
  const songIds = Array.isArray(body.songIds)
    ? body.songIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  if (!songIds.length) return jsonResponse({ ok: false, error: "需要 songIds" }, 400);
  try {
    const q = await reorderPodcastQueue(songloft.playlists, songIds);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      songIds: q.songIds,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "排序失败") }, 500);
  }
});

router.post("/api/queue/clear", async () => {
  try {
    const q = await clearPodcastQueue(songloft.playlists);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      removed: q.removed,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "清空失败") }, 500);
  }
});

/** Remove every song whose episode progress is marked completed. */
router.post("/api/queue/remove-played", async () => {
  try {
    const listing = await buildQueueListing();
    const playedIds = pickPlayedSongIds(
      listing.songs.map((s) => ({ id: s.id, progress: s.progress })),
      []
    );
    if (!playedIds.length) {
      return jsonResponse({
        ok: true,
        removedIds: [],
        removed: 0,
        remaining: listing.songs.length,
        playlistId: listing.playlistId,
        playlistName: listing.playlistName,
      });
    }
    const removed = await removeFromPodcastQueue(songloft.playlists, playedIds);
    return jsonResponse({
      ok: true,
      removedIds: playedIds,
      removed: removed.removed,
      remaining: Math.max(0, listing.songs.length - removed.removed),
      playlistId: removed.playlistId,
      playlistName: removed.playlistName,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "移除已播放失败") }, 500);
  }
});

/** Append known song ids without re-preparing episodes. */
router.post("/api/queue/add-ids", async (req) => {
  const body = readJson(req);
  const songIds = Array.isArray(body.songIds)
    ? body.songIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  if (!songIds.length) return jsonResponse({ ok: false, error: "需要 songIds" }, 400);
  // Best-effort: resolve identity so later host play events can write progress.
  for (const id of songIds) {
    await resolveEpisodeIdentity(id, { remember: true }).catch(() => null);
  }
  try {
    const q = await appendToPodcastQueue(songloft.playlists, songIds);
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      added: q.added,
      skipped: q.skipped,
      songIds,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "加入失败") }, 500);
  }
});

router.get("/api/favorites", async () => {
  const favorites = await loadFavorites();
  const progressList = await loadAllProgress();
  const subs = await loadSubscriptions();
  const items = favorites.map((f) => {
    const prog = findProgress(progressList, f.feedUrl, f.guid);
    const sub =
      (f.subscriptionId && subs.find((s) => s.id === f.subscriptionId)) ||
      subs.find((s) => normalizeFeedUrl(s.url) === normalizeFeedUrl(f.feedUrl)) ||
      null;
    const ep =
      sub?.episodes.find((e) => {
        const id = episodeIdentityKey(sub.url, e.guid, e.enclosureUrl);
        return id.guid === f.guid || e.guid === f.guid;
      }) || null;
    return {
      ...f,
      favorited: true,
      showNote: ep?.description || null,
      hasShowNote: !!(ep?.description && ep.description.trim()),
      songId: ep?.songId ?? null,
      guidSource: ep?.guidSource || "rss",
      progress: prog
        ? {
            positionSec: prog.positionSec,
            durationSec: prog.durationSec,
            completed: prog.completed,
          }
        : null,
    };
  });
  return jsonResponse({ ok: true, favorites: items });
});

router.post("/api/favorites/toggle", async (req) => {
  const body = readJson(req);
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const guid = typeof body.guid === "string" ? body.guid : "";
  if (!feedUrl || !guid) return jsonResponse({ ok: false, error: "需要 feedUrl 与 guid" }, 400);
  const result = await toggleFavorite({
    feedUrl,
    guid,
    title: typeof body.title === "string" ? body.title : undefined,
    showTitle: typeof body.showTitle === "string" ? body.showTitle : undefined,
    coverUrl: typeof body.coverUrl === "string" ? body.coverUrl : null,
    dedupKey: typeof body.dedupKey === "string" ? body.dedupKey : undefined,
    subscriptionId: typeof body.subscriptionId === "string" ? body.subscriptionId : undefined,
    durationSec: typeof body.durationSec === "number" ? body.durationSec : null,
  });
  return jsonResponse({ ok: true, favorited: result.favorited, count: result.favorites.length });
});

router.get("/api/progress", async () => {
  const list = await loadAllProgress();
  return jsonResponse({ ok: true, progress: list });
});

router.post("/api/progress", async (req) => {
  const body = readJson(req);
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const guid = typeof body.guid === "string" ? body.guid : "";
  if (!feedUrl || !guid) return jsonResponse({ ok: false, error: "需要 feedUrl 与 guid" }, 400);
  const mode = body.seek === true || body.mode === "seek" ? ("seek" as const) : ("max" as const);
  const saved = await upsertProgress(
    {
      feedUrl,
      guid,
      positionSec: typeof body.positionSec === "number" ? body.positionSec : undefined,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
      completed: typeof body.completed === "boolean" ? body.completed : undefined,
      lastSongId: typeof body.lastSongId === "number" ? body.lastSongId : undefined,
      lastPlayedAt: typeof body.lastPlayedAt === "number" ? body.lastPlayedAt : undefined,
    },
    { mode }
  );
  if (typeof body.lastSongId === "number" && Number.isFinite(body.lastSongId)) {
    await rememberPreparedMapping(body.lastSongId, feedUrl, guid);
  }
  // Keep the parallel history row's progress in step (no reorder, no new entry).
  await touchHistoryProgress(feedUrl, guid, {
    positionSec: typeof body.positionSec === "number" ? body.positionSec : undefined,
    durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
    completed: typeof body.completed === "boolean" ? body.completed : undefined,
    mode,
  }).catch(() => {});
  return jsonResponse({ ok: true, progress: saved });
});

router.get("/api/progress/one", async (req) => {
  const q = String(req.url || req.path || "");
  const feedUrl = decodeURIComponent((/feedUrl=([^&]+)/.exec(q) || [])[1] || "");
  const guid = decodeURIComponent((/guid=([^&]+)/.exec(q) || [])[1] || "");
  if (!feedUrl || !guid) return jsonResponse({ ok: false, error: "需要 feedUrl 与 guid" }, 400);
  const p = await getProgress(feedUrl, guid);
  return jsonResponse({ ok: true, progress: p });
});

/* ------------------------------------------------------------------ */
/* play history                                                        */
/* ------------------------------------------------------------------ */

router.get("/api/history", async () => {
  const list = await loadHistory();
  const favorites = await loadFavorites();
  const favKeys = new Set(favorites.map((f) => favoriteKey(f.feedUrl, f.guid)));
  // Enrich with live favourite state so the list's star button is accurate.
  const items = list.map((h) => ({
    ...h,
    favorited: favKeys.has(favoriteKey(h.feedUrl, h.guid)),
  }));
  return jsonResponse({ ok: true, history: items });
});

router.post("/api/history", async (req) => {
  const body = readJson(req);
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const guid = typeof body.guid === "string" ? body.guid : "";
  if (!feedUrl || !guid) return jsonResponse({ ok: false, error: "需要 feedUrl 与 guid" }, 400);
  try {
    const history = await recordHistory({
      feedUrl,
      guid,
      title: typeof body.title === "string" ? body.title : undefined,
      showTitle: typeof body.showTitle === "string" ? body.showTitle : undefined,
      coverUrl: typeof body.coverUrl === "string" ? body.coverUrl : undefined,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
      songId: typeof body.songId === "number" ? body.songId : undefined,
      subscriptionId: typeof body.subscriptionId === "string" ? body.subscriptionId : undefined,
      dedupKey: typeof body.dedupKey === "string" ? body.dedupKey : undefined,
      positionSec: typeof body.positionSec === "number" ? body.positionSec : undefined,
    });
    return jsonResponse({ ok: true, count: history.length });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e ?? "写入历史失败") }, 500);
  }
});

router.post("/api/history/remove", async (req) => {
  const body = readJson(req);
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const guid = typeof body.guid === "string" ? body.guid : "";
  if (!feedUrl || !guid) return jsonResponse({ ok: false, error: "需要 feedUrl 与 guid" }, 400);
  const history = await removeHistoryEntry(feedUrl, guid);
  return jsonResponse({ ok: true, count: history.length });
});

router.post("/api/history/batch-delete", async (req) => {
  const body = readJson(req);
  const raw = Array.isArray(body.items) ? body.items : [];
  const items = raw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const feedUrl = typeof o.feedUrl === "string" ? o.feedUrl : "";
      const guid = typeof o.guid === "string" ? o.guid : "";
      return feedUrl && guid ? { feedUrl, guid } : null;
    })
    .filter((x): x is { feedUrl: string; guid: string } => !!x);
  if (!items.length) return jsonResponse({ ok: false, error: "需要 items[{feedUrl,guid}]" }, 400);
  const pruneMappings = body.pruneMappings !== false;
  const history = await removeHistoryEntries(items, { pruneMappings });
  return jsonResponse({ ok: true, removed: items.length, count: history.length });
});

router.post("/api/history/clear", async () => {
  await clearHistory();
  return jsonResponse({ ok: true });
});

/** Explicit songId→episode bridge (P0). Prefer calling on play / queue from the UI. */
router.post("/api/song-mapping", async (req) => {
  const body = readJson(req);
  const songId = typeof body.songId === "number" ? body.songId : Number(body.songId);
  const feedUrl = typeof body.feedUrl === "string" ? body.feedUrl : "";
  const guid = typeof body.guid === "string" ? body.guid : "";
  if (!Number.isFinite(songId) || songId <= 0 || !feedUrl || !guid) {
    return jsonResponse({ ok: false, error: "需要 songId、feedUrl、guid" }, 400);
  }
  const ref = await rememberSongMapping(songId, feedUrl, guid);
  return jsonResponse({ ok: true, mapping: ref });
});

router.get("/api/songs/:id/identity", async (_req, params) => {
  const songId = Number(params.id);
  if (!Number.isFinite(songId) || songId <= 0) {
    return jsonResponse({ ok: false, error: "无效 songId" }, 400);
  }
  const id = await resolveEpisodeIdentity(songId, { remember: true });
  if (!id) return jsonResponse({ ok: true, identity: null });
  return jsonResponse({
    ok: true,
    identity: { feedUrl: id.feedUrl, guid: id.guid, source: id.source },
  });
});

router.post("/api/opml/preview", async (req) => {
  const body = readJson(req);
  const text = readOpmlText(body);
  if (!text.trim()) return jsonResponse({ ok: false, error: "需要 OPML 文本" }, 400);
  const result = await runOpmlPreview(text);
  if (!result.ok) return jsonResponse({ ok: false, error: result.reason }, 400);
  return jsonResponse({
    ok: true,
    documentTitle: result.preview.documentTitle,
    summary: result.preview.summary,
    items: result.preview.items,
    fileWarnings: result.preview.fileWarnings,
    stats: result.parseStats.ok ? result.parseStats.stats : undefined,
  });
});

router.post("/api/opml/import", async (req) => {
  const body = readJson(req);
  const text = readOpmlText(body);
  if (!text.trim()) return jsonResponse({ ok: false, error: "需要 OPML 文本" }, 400);
  const result = await runOpmlImport(text);
  if (result.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  if (!result.ok) {
    return jsonResponse({ ok: false, error: result.reason || "导入失败" }, 400);
  }
  return jsonResponse({
    ok: true,
    added: result.added,
    documentTitle: result.documentTitle,
    summary: result.preview?.summary,
    results: result.results,
    tip: result.added
      ? `已新增 ${result.added} 条订阅（未自动刷新，可点「刷新全部」）`
      : "没有新增（均为重复或无效）",
  });
});

router.get("/api/log", async () => {
  const log = await loadLog();
  return jsonResponse({ ok: true, log });
});

/** Export subscriptions as OPML 2.0 (flat outline list). */
router.get("/api/opml/export", async () => {
  const subs = await loadSubscriptions();
  const opml = buildOpml(subs);
  return jsonResponse({
    ok: true,
    count: subs.length,
    filename: opmlExportFilename(),
    opml,
  });
});

/**
 * Hand one song to the MIoT speaker plugin (single-stream push).
 *
 * Only songs created by this plugin are accepted so the button can never push an
 * unrelated library track to a speaker.
 */
router.post("/api/cast/miot", async (req) => {
  const body = readJson(req);
  const songId = Number(body.songId);
  if (!Number.isFinite(songId) || songId <= 0) {
    return jsonResponse({ ok: false, reason: "cast_failed", error: "需要 songId" }, 400);
  }

  type SongRow = { id?: number; source_data?: unknown; title?: string; artist?: string };
  let song: SongRow | null = null;
  try {
    song = ((await songloft.songs.getById(songId)) as unknown as SongRow) || null;
  } catch (e) {
    return jsonResponse(
      { ok: false, reason: "cast_failed", error: String(e ?? "读取歌曲失败") },
      404
    );
  }
  if (!song) {
    return jsonResponse({ ok: false, reason: "cast_failed", error: "歌曲不存在" }, 404);
  }
  if (!isPodcastSong(song)) {
    return jsonResponse(
      { ok: false, reason: "not_podcast_song", error: "只有播客单集可以投放到音箱" },
      400
    );
  }

  const result = await castSongToMiot(songId, { deviceId: body.deviceId });
  if (!result.ok) {
    const soft =
      result.reason === "miot_unavailable" ||
      result.reason === "miot_no_device" ||
      result.reason === "miot_device_offline";
    return jsonResponse(
      {
        ok: false,
        reason: result.reason,
        error: result.error,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        online: result.online,
      },
      soft ? 424 : 502
    );
  }
  await appendLog("info", `cast to miot ok songId=${songId} device=${result.deviceId}`);
  return jsonResponse({
    ok: true,
    songId,
    title: song.title || "",
    deviceId: result.deviceId,
    deviceName: result.deviceName,
  });
});

/**
 * Push the whole「播客」playlist to the speaker.
 *
 * MIoT owns its own queue, so this hands it a playlist id instead of one stream —
 * that is what makes next/previous and auto-advance work on the device.
 */
router.post("/api/cast/miot-playlist", async (req) => {
  const body = readJson(req);
  try {
    const q = await listPodcastQueue(songloft.playlists);
    if (!q.songs.length) {
      return jsonResponse({ ok: false, reason: "cast_failed", error: "播放列表为空" }, 400);
    }
    const result = await castPlaylistToMiot(q.playlistId, {
      deviceId: typeof body.deviceId === "string" ? body.deviceId : undefined,
      startIndex: Number(body.startIndex) || 0,
    });
    if (!result.ok) {
      const soft =
        result.reason === "miot_unavailable" ||
        result.reason === "miot_no_device" ||
        result.reason === "miot_device_offline";
      return jsonResponse(
        {
          ok: false,
          reason: result.reason,
          error: result.error,
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          online: result.online,
        },
        soft ? 424 : 502
      );
    }
    await appendLog(
      "info",
      `cast playlist to miot ok playlistId=${q.playlistId} device=${result.deviceId}`
    );
    return jsonResponse({
      ok: true,
      playlistId: q.playlistId,
      playlistName: q.playlistName,
      count: q.songs.length,
      deviceId: result.deviceId,
      deviceName: result.deviceName,
    });
  } catch (e) {
    return jsonResponse({ ok: false, reason: "cast_failed", error: String(e ?? "投放失败") }, 500);
  }
});

/** Probe whether the MIoT plugin exposes any speaker device. */
router.get("/api/cast/status", async () => {
  const devices = await listMiotDevices();
  return jsonResponse({
    ok: true,
    available: devices.some((d) => d.online),
    deviceCount: devices.length,
    devices,
  });
});

export async function handleHTTP(req: HTTPRequest): Promise<HTTPResponse> {
  return await router.handle(req);
}
