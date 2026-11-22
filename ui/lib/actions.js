/**
 * Playback + mutation actions shared by all views.
 *
 * Views never talk to the host player directly: they call these helpers, which
 * keep `PlaybackState` and the data store in sync.
 */

import { api } from "./api.js";
import { resolveSpeakerCastPlan } from "./castPlan.js";
import * as Host from "./host.js";
import * as Playback from "./playback.js";
import { getData, patch } from "./store.js";
import { toast, clearToast } from "./toast.js";
import { openModal, uiConfirm, closeModal } from "./modal.js";
import { escapeHtml } from "./dom.js";
import { buildQueueIndex, isInPodcastQueue as isEpInQueue } from "./queueMembership.js";
import {
  appendPendingSong,
  createQueueWriteTracker,
  hasPendingSong,
  pinQueueSongsLocally,
  playedSongs,
  reorderSongs,
  rollbackPlan,
  shouldApplyQueueResponse,
  snapshotQueue,
  withoutSongs,
} from "./queueOptimistic.js";
import {
  SET_QUEUE_UNAVAILABLE,
  SINGLE_MODE_MESSAGE,
  SINGLE_MODE_OK,
  SINGLE_MODE_TITLE,
  PLAY_FROM_START_MESSAGE,
  PLAY_FROM_START_OK,
  PLAY_FROM_START_TITLE,
  episodeSongId,
  isSinglePlayMode,
  queueIdsForStart,
  readPlayMode,
} from "./playThrough.js";
import {
  REPLACE_PLAYBACK_MESSAGE,
  REPLACE_PLAYBACK_OK,
  REPLACE_PLAYBACK_TITLE,
  decidePlayAction,
  readHostPlayback,
} from "./playSession.js";

/**
 * Every user-visible mutation reports back through `notify`, so playback and
 * queue changes are never silent. Only duplicated identical messages within a
 * very short window are collapsed.
 */
const recentToasts = new Map();
const TOAST_DEDUPE_MS = 1200;

let caps = { available: false, hasPlayer: false };
let lastProgressFlush = 0;

export function setCapabilities(next) {
  caps = next;
}

export function getCapabilities() {
  return caps;
}

/** Trim long episode titles so a toast stays one short line. */
function shortTitle(title, max = 18) {
  const t = String(title || "").trim();
  if (!t) return "该单集";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function notify(text, kind) {
  const msg = String(text == null ? "" : text).trim();
  if (!msg) return;
  const now = Date.now();
  const lastAt = recentToasts.get(msg) || 0;
  if (now - lastAt < TOAST_DEDUPE_MS) return;
  recentToasts.set(msg, now);
  if (recentToasts.size > 40) {
    for (const [key, at] of recentToasts) {
      if (now - at > TOAST_DEDUPE_MS * 4) recentToasts.delete(key);
    }
  }
  toast(msg, kind);
}

/* ------------------------------------------------------------------ */
/* progress                                                            */
/* ------------------------------------------------------------------ */

/**
 * Persist current position. Default merges with Math.max on the server.
 * Pass `{ seek: true }` after an explicit scrub so rewinds stick.
 */
export async function flushProgress(opts = {}) {
  const snap = Playback.get();
  const cur = snap.current;
  if (!cur || !cur.feedUrl || !cur.guid) return;
  lastProgressFlush = Date.now();
  try {
    await api.saveProgress({
      feedUrl: cur.feedUrl,
      guid: cur.guid,
      positionSec: snap.positionSec,
      durationSec: snap.durationSec,
      completed: snap.phase === "ended",
      lastSongId: cur.songId || undefined,
      lastPlayedAt: cur.songId ? Date.now() : undefined,
      seek: opts.seek === true,
    });
  } catch (_) {
    /* progress is best-effort */
  }
}

function rememberMapping(songId, feedUrl, guid) {
  if (!songId || !feedUrl || !guid) return;
  api.rememberSongMapping(songId, feedUrl, guid).catch(() => {});
}

export function startProgressTracking() {
  if (!caps.available || !caps.hasPlayer) return () => {};
  let off = null;
  try {
    off = Host.onStateChange((st) => {
      Playback.applyHostState(st);
      const snap = Playback.get();
      const cur = snap.current;
      if (!cur || !cur.feedUrl || !cur.guid) return;
      const now = Date.now();
      if (now - lastProgressFlush < 4000) return;
      lastProgressFlush = now;
      api
        .saveProgress({
          feedUrl: cur.feedUrl,
          guid: cur.guid,
          positionSec: typeof st.current_time === "number" ? st.current_time : snap.positionSec,
          durationSec:
            typeof st.duration === "number" && st.duration > 0 ? st.duration : snap.durationSec,
          completed: snap.phase === "ended",
          lastSongId: cur.songId || undefined,
          lastPlayedAt: cur.songId ? Date.now() : undefined,
        })
        .catch(() => {});
    });
  } catch (e) {
    notify("无法订阅播放状态：" + e, "warn");
  }
  return () => {
    try {
      if (off) off();
    } catch (_) {
      /* ignore */
    }
  };
}

/* ------------------------------------------------------------------ */
/* reload helpers                                                      */
/* ------------------------------------------------------------------ */

export async function reloadQueue() {
  if (queueWrites.isPending()) return getData();
  const token = queueWrites.current();
  try {
    const r = await api.queue();
    if (queueWrites.isPending() || !shouldApplyQueueResponse(token, queueWrites)) {
      return getData();
    }
    if (!r.ok) {
      patch({ queueSongs: [], queueMeta: null });
      repaintQueueButtonsNow();
      notifyQueueViews();
      return getData();
    }
    patch({
      queueSongs: r.songs || [],
      queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName },
    });
    repaintQueueButtonsNow();
    notifyQueueViews();
  } catch (e) {
    if (queueWrites.isPending() || !shouldApplyQueueResponse(token, queueWrites)) {
      return getData();
    }
    patch({ queueSongs: [], queueMeta: null });
    repaintQueueButtonsNow();
    notifyQueueViews();
    notify("读取播放列表失败（需宿主 playlists 权限）", "warn");
  }
  return getData();
}

/**
 * Views that render「加入播放列表」buttons register here so the button state can
 * follow the queue without a full re-render (and therefore without the list
 * jumping under the user). Returns a disposer.
 */
const queueRepainters = new Set();
const queueViewListeners = new Set();

export function onQueueChange(fn) {
  if (typeof fn !== "function") return () => {};
  queueRepainters.add(fn);
  return () => queueRepainters.delete(fn);
}

/** The queue panel registers here so mutations can re-render the list immediately. */
export function onQueueViewChange(fn) {
  if (typeof fn !== "function") return () => {};
  queueViewListeners.add(fn);
  return () => queueViewListeners.delete(fn);
}

function notifyQueueViews() {
  for (const fn of queueViewListeners) {
    try {
      fn();
    } catch (_) {
      /* ignore */
    }
  }
}

const queueRevealers = new Set();

/** The queue panel may register here; play/add must not call it (keep open/closed). */
export function onEnsureQueueVisible(fn) {
  if (typeof fn !== "function") return () => {};
  queueRevealers.add(fn);
  return () => queueRevealers.delete(fn);
}

function ensureQueueVisible() {
  for (const fn of queueRevealers) {
    try {
      fn();
    } catch (_) {
      /* ignore */
    }
  }
}

/** The queue panel registers the pin animation (move-to-front transition). */
let queuePinRunner = null;

/** @param {(phase: "before"|"after", songId: number) => (void|Promise<void>)} fn */
export function setQueuePinRunner(fn) {
  queuePinRunner = typeof fn === "function" ? fn : null;
}

async function runQueuePinPhase(phase, songId) {
  if (typeof queuePinRunner !== "function") return;
  try {
    await queuePinRunner(phase, songId);
  } catch (_) {
    /* animation must not block playback */
  }
}

/** True when the play-front payload actually has the target at row 0. */
export function playFrontTargetIsFirst(result, songId) {
  if (!result || result.ok === false) return false;
  const ids = Array.isArray(result.songIds) ? result.songIds.map(Number) : [];
  return ids.length > 0 && ids[0] === Number(songId);
}

const PLAY_FRONT_FAIL =
  "未能把这一集写到「播客」列表第一位。当前播放顺序未改，稍后可刷新列表核对。";

/**
 * Persist the optimistic pin after playback has been issued.
 * Never apply a server list whose first id is not the target.
 */
async function persistPlayFrontAfterStart({ songId, episode, gen, playlistIdRef }) {
  try {
    const moved = await api.queuePlayFront(songId);
    if (!playFrontTargetIsFirst(moved, songId)) {
      notify(
        moved && moved.error
          ? `${PLAY_FRONT_FAIL}（${String(moved.error)}）`
          : PLAY_FRONT_FAIL,
        "err"
      );
      return;
    }
    if (Number.isFinite(Number(moved.playlistId))) {
      const playlistId = Number(moved.playlistId);
      if (playlistIdRef) playlistIdRef.value = playlistId;
      if (moved.playlistName) {
        const data = getData();
        patch({
          queueMeta: {
            playlistId,
            playlistName: moved.playlistName,
          },
          queueSongs: data.queueSongs,
        });
      }
    }
    // Confirmed first id matches; sync metadata without clobbering the pin.
    applyQueueOrderLocally(
      moved.songIds.map(Number).filter(Number.isFinite),
      episode
    );
    await reloadQueueIfCurrent(gen);
  } catch (e) {
    notify(`${PLAY_FRONT_FAIL}（${String((e && e.message) || e)}）`, "err");
  } finally {
    queueWrites.end();
  }
}

export async function reloadRecent() {
  const home = await api.home();
  if (!home || !home.ok) return getData();
  patch({ recent: home.recent || [] });
  return getData();
}

export async function reloadSubs() {
  const r = await api.listSubscriptions();
  if (r && r.ok) patch({ subs: r.subscriptions || [] });
  return getData();
}

export async function reloadFavorites() {
  try {
    const r = await api.favorites();
    if (!r || !r.ok) return getData();
    patch({
      favorites: (r.favorites || []).map((f) => ({
        ...f,
        showTitle: f.showTitle || "",
        hasShowNote: !!f.hasShowNote,
        showNote: f.showNote || null,
        favorited: true,
      })),
    });
  } catch (_) {
    /* leave the previous list in place */
  }
  return getData();
}

export async function reloadEpisodes(id) {
  const r = await api.getEpisodes(id);
  if (!r || !r.ok) return { ok: false, error: (r && r.error) || "加载剧集失败" };
  const items = (r.episodes || []).map((ep) => ({ ...ep, subscriptionId: id, showTitle: r.title }));
  patch({ episodes: items, activeShowId: id });
  return { ok: true, title: r.title || id, items };
}

export async function reloadHistory() {
  try {
    const r = await api.history();
    if (!r || !r.ok) return getData();
    patch({
      history: (r.history || []).map((h) => ({
        ...h,
        // History rows carry the same shape the row renderer expects.
        songId: h.songId,
        durationSec: h.durationSec,
        progress: {
          positionSec: h.positionSec || 0,
          durationSec: h.durationSec || null,
          completed: !!h.completed,
        },
      })),
    });
  } catch (_) {
    /* keep the previous list */
  }
  return getData();
}

/** Registered by the history view so playback can repaint it. */
let onHistoryChange = null;
export function setHistoryChangeHandler(fn) {
  onHistoryChange = fn;
}

export async function clearPlayHistory() {
  const ok = await uiConfirm({
    title: "清空收听历史",
    message: "将删除全部历史记录。播放进度与收藏不会受影响。",
    okText: "清空",
    danger: true,
  });
  if (!ok) return false;
  try {
    await api.clearHistory();
    patch({ history: [] });
    notify("已清空收听历史", "ok");
    return true;
  } catch (e) {
    notify(String(e), "err");
    return false;
  }
}

export async function removeHistoryItem(entry) {
  try {
    await api.removeHistory(entry.feedUrl, entry.guid);
    patch({
      history: (getData().history || []).filter(
        (h) => !(h.feedUrl === entry.feedUrl && h.guid === entry.guid)
      ),
    });
    return true;
  } catch (e) {
    notify(String(e), "err");
    return false;
  }
}

export async function batchDeleteHistoryItems(entries) {
  const items = (entries || [])
    .map((e) => ({ feedUrl: e.feedUrl, guid: e.guid }))
    .filter((e) => e.feedUrl && e.guid);
  if (!items.length) return false;
  const ok = await uiConfirm({
    title: "删除所选历史",
    message: `将从收听历史删除 ${items.length} 条记录。播放进度不受影响。`,
    okText: "删除",
    danger: true,
  });
  if (!ok) return false;
  try {
    await api.batchDeleteHistory(items, true);
    const drop = new Set(items.map((i) => `${i.feedUrl}::${i.guid}`));
    patch({
      history: (getData().history || []).filter((h) => !drop.has(`${h.feedUrl}::${h.guid}`)),
    });
    notify(`已删除 ${items.length} 条历史`, "ok");
    return true;
  } catch (e) {
    notify(String(e), "err");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* play / queue / favorite                                             */
/* ------------------------------------------------------------------ */

function episodePayload(ep) {
  return {
    subscriptionId: ep.subscriptionId,
    feedUrl: ep.feedUrl,
    guid: ep.guid,
    dedupKey: ep.dedupKey,
    enclosureUrl: ep.enclosureUrl,
    title: ep.title,
    showTitle: ep.showTitle || "",
    durationSec: ep.durationSec,
    guidSource: ep.guidSource,
    songId: ep.songId,
    coverUrl: ep.coverUrl || null,
  };
}

async function syncPlayStateAfterRequest(songId) {
  for (let i = 0; i < 10; i++) {
    try {
      const st = await Host.getState();
      Playback.applyHostState(st);
      const snap = Playback.get();
      if (["playing", "paused", "ended"].includes(snap.phase)) return true;
      if (st && st.current_song && st.current_song.id === songId) {
        Playback.setPhase(st.is_playing ? "playing" : "paused", {
          error: null,
          positionSec: typeof st.current_time === "number" ? st.current_time : 0,
          durationSec: typeof st.duration === "number" && st.duration > 0 ? st.duration : null,
          hostHint: st.is_playing ? null : "已选中当前集，等待出声…",
        });
        return true;
      }
    } catch (_) {
      /* keep polling */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function confirmReplacePlayback() {
  return uiConfirm({
    title: REPLACE_PLAYBACK_TITLE,
    message: REPLACE_PLAYBACK_MESSAGE,
    okText: REPLACE_PLAYBACK_OK,
  });
}

/**
 * If the host is in single-track mode, ask to switch to sequential `order`
 * (play through the list, then stop; not loop / autoAdvance). Returns false
 * when the user declines, so the caller can abort instead of silently playing
 * one episode.
 * @returns {Promise<boolean>}
 */
export async function ensureSequentialPlayMode() {
  let st;
  try {
    st = await Host.getState();
  } catch {
    return true;
  }
  if (!isSinglePlayMode(readPlayMode(st))) return true;
  const ok = await uiConfirm({
    title: SINGLE_MODE_TITLE,
    message: SINGLE_MODE_MESSAGE,
    okText: SINGLE_MODE_OK,
  });
  if (!ok) return false;
  try {
    await Host.setPlayMode("order");
  } catch (e) {
    notify(String((e && e.message) || e), "err");
  }
  return true;
}

/**
 * Play an episode from the real「播客」queue.
 *
 * 「播客」is the playback queue itself: the chosen episode is moved to row 0
 * first, then the host gets `setQueue` with that whole order and startIndex 0.
 * List rows (`{ fromWaitlist: true }`) and rows outside the list behave the
 * same — there is no "only this episode" path and no separate listen-later copy.
 *
 * Cancelling a replacement confirm leaves both the music and the queue order
 * untouched; the move only happens after the user agrees.
 *
 * @param {object} ep
 * @param {{forcePrepare?: boolean, fromWaitlist?: boolean}} [opts]
 */
export async function playEpisode(ep, opts = {}) {
  if (!caps.available || !caps.hasPlayer) {
    notify("宿主播放器不可用", "warn");
    return;
  }
  if (!Host.hasSetQueue()) {
    notify(SET_QUEUE_UNAVAILABLE, "err");
    return;
  }
  if (typeof api.queuePlayFront !== "function") {
    notify("当前插件版本无法调整「播客」列表顺序，请刷新页面后重试", "err");
    return;
  }

  let songId = episodeSongId(ep);
  const ctx = {
    subscriptionId: ep.subscriptionId || "",
    feedUrl: ep.feedUrl || "",
    guid: ep.guid || "",
    title: ep.title || "",
    showTitle: ep.showTitle || "",
    songId: songId || null,
    durationSec: ep.durationSec || null,
    guidSource: ep.guidSource || "rss",
    coverUrl: ep.coverUrl || null,
  };

  try {
    if (!songId || opts.forcePrepare) {
      if (!ep.subscriptionId) {
        notify("缺少订阅信息，无法准备音频", "err");
        return;
      }
      Playback.beginPrepare(ctx);
      const prep = await api.prepare({
        subscriptionId: ep.subscriptionId,
        guid: ep.guid,
        dedupKey: ep.dedupKey,
      });
      if (!prep.ok) {
        Playback.prepareFailed(prep.error || "准备音频失败");
        notify(prep.error || "准备音频失败", "err");
        return;
      }
      songId = prep.songId;
      ctx.songId = songId;
    }

    const queueSongs = getData().queueSongs || [];
    const queueMeta = getData().queueMeta || null;
    // Target first, then the rest of「播客」in order. Start index is always 0.
    const intendedIds = queueIdsForStart(queueSongs, songId).ids;
    if (!intendedIds.length) {
      notify("没有可播放的内容", "warn");
      return;
    }

    let hostState = null;
    try {
      hostState = await Host.getState();
    } catch (_) {
      hostState = null;
    }
    const decision = decidePlayAction({
      host: readHostPlayback(hostState),
      targetSongId: songId,
      intendedIds,
      podcastPlaylistId: queueMeta ? queueMeta.playlistId : null,
    });

    if (decision.type === "noop-playing") {
      notify("正在播放这一集，且已在「播客」列表第一位，无需重新开始", "ok");
      return;
    }
    if (decision.type === "resume") {
      await Host.play();
      try {
        Playback.applyHostState(await Host.getState());
      } catch (_) {
        /* onStateChange will catch up */
      }
      notify("继续播放当前单集", "ok");
      return;
    }
    if (decision.type === "confirm-replace") {
      // Cancelling must not touch the music or the queue order.
      const ok = await confirmReplacePlayback();
      if (!ok) return;
    }

    const modeOk = await ensureSequentialPlayMode();
    if (modeOk === false) return;

    // Optimistic pin + play first; persist「播客」order in the background after
    // the play request has been issued. Cancelled confirms never reach here.
    let orderIds = decision.ids;
    let playlistId = queueMeta ? queueMeta.playlistId : null;
    const persistGen = beginQueueWrite();

    // Play/pin must not force-open the queue panel: keep whatever open/closed
    // state the user already has (same contract as addToQueue).
    await runQueuePinPhase("before", songId);
    applyQueueOrderLocally(orderIds, { ...ctx, songId, title: ctx.title, showTitle: ctx.showTitle });
    await runQueuePinPhase("after", songId);

    Playback.beginPlayRequest({ ...ctx, songId });
    try {
      await Host.replaceQueueAndPlay(orderIds, 0, {
        sourcePlaylistId: playlistId == null ? undefined : playlistId,
      });
    } catch (e) {
      Playback.playFailed(String((e && e.message) || e));
      notify(
        `播放请求失败：${String((e && e.message) || e)}。列表已在本页提前放到第一位，正在同步到「播客」列表。`,
        "err"
      );
      void persistPlayFrontAfterStart({
        songId,
        episode: { ...ctx, songId },
        gen: persistGen,
        playlistIdRef: { value: playlistId },
      });
      return;
    }
    try {
      await Host.setPlayMode("order");
    } catch (_) {
      /* older hosts may lack setPlayMode */
    }
    notify(`正在按「播客」列表顺序播放「${ctx.title || "当前单集"}」`, "ok");
    void persistPlayFrontAfterStart({
      songId,
      episode: { ...ctx, songId },
      gen: persistGen,
      playlistIdRef: { value: playlistId },
    });

    const ok = await syncPlayStateAfterRequest(songId);
    if (!ok) {
      Playback.playFailed("播放未确认成功（宿主未回报该曲状态）");
      notify("播放未确认成功。请确认在 Songloft 客户端内打开。", "err");
      return;
    }

    if (ctx.feedUrl && ctx.guid) {
      rememberMapping(songId, ctx.feedUrl, ctx.guid);
      api
        .saveProgress({
          feedUrl: ctx.feedUrl,
          guid: ctx.guid,
          lastSongId: songId,
          lastPlayedAt: Date.now(),
        })
        .catch(() => {});
      api
        .recordHistory({
          feedUrl: ctx.feedUrl,
          guid: ctx.guid,
          title: ctx.title,
          showTitle: ctx.showTitle,
          coverUrl: ctx.coverUrl,
          durationSec: ctx.durationSec || null,
          songId,
          subscriptionId: ctx.subscriptionId,
          dedupKey: ep.dedupKey || "",
        })
        .then(() => {
          if (document.querySelector("#tab-history:not(.hidden)")) {
            reloadHistory().then(() => {
              if (typeof onHistoryChange === "function") onHistoryChange();
            });
          }
        })
        .catch(() => {});
    }
  } catch (e) {
    Playback.playFailed(String((e && e.message) || e));
    notify(String((e && e.message) || e), "err");
  }
}

/** Pause if the current song is playing, otherwise resume / start it. */
export async function togglePlayPause() {
  const snap = Playback.get();
  const cur = snap.current;
  try {
    if (snap.phase === "playing") {
      await Host.pause();
      try {
        Playback.applyHostState(await Host.getState());
      } catch (_) {
        /* onStateChange will catch up */
      }
      await flushProgress();
      return;
    }
    if (cur && cur.songId) {
      await playEpisode({ ...cur, songId: cur.songId }, { fromWaitlist: true });
      return;
    }
    const first = getData().queueSongs[0];
    if (!first) {
      notify("没有可播放的内容", "warn");
      return;
    }
    await playEpisode({
      title: first.title,
      songId: first.id,
      showTitle: first.album || "",
      feedUrl: first.feedUrl || "",
      guid: first.guid || "",
      subscriptionId: first.subscriptionId || "",
      coverUrl: first.coverUrl || first.cover_url || null,
      durationSec: first.duration || null,
    });
  } catch (e) {
    notify(String(e), "err");
  }
}

export async function addToQueue(ep, btn, opts = {}) {
  const quiet = !!opts.quiet;
  const data = getData();
  const index = buildQueueIndex(data.queueSongs);
  if (isEpInQueue(ep, index)) {
    if (!quiet) notify(`《${shortTitle(ep.title)}》已经在「播客」列表里`, "warn");
    return { ok: true, already: true };
  }
  if (hasPendingSong(data.queueSongs, ep)) {
    if (!quiet) {
      notify(`正在加入《${shortTitle(ep.title)}》…`, "muted");
    }
    return { ok: false, pending: true };
  }
  if (btn) {
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
  }
  const gen = beginQueueWrite();
  const before = snapshotQueue(data);
  patch({
    queueSongs: appendPendingSong(before.queueSongs, ep),
    queueMeta: before.queueMeta,
  });
  notifyQueueViews();
  // Stay on the caller's view; success toast is enough. Play/cast still opens the panel.
  try {
    const r = await api.queueAdd({
      subscriptionId: ep.subscriptionId,
      guid: ep.guid,
      dedupKey: ep.dedupKey,
    });
    if (!r.ok) {
      rollbackQueue(before, gen);
      notify(r.error || "加入「播客」列表失败（准备音频）", "err");
      return { ok: false };
    }
    const name = r.playlistName || "播客";
    if (!quiet) {
      const bits = [];
      if (r.added > 0) bits.push(`已将《${shortTitle(ep.title)}》加入「播客」列表末尾`);
      else if (r.skipped > 0) bits.push(`《${shortTitle(ep.title)}》已经在「播客」列表里`);
      else bits.push("未能加入「播客」列表");
      notify(bits.join(""), r.added > 0 ? "ok" : "warn");
    }
    await reloadQueueIfCurrent(gen);
    return { ok: true, already: (r.skipped || 0) > 0, added: (r.added || 0) > 0 };
  } catch (e) {
    rollbackQueue(before, gen);
    notify(String(e), "err");
    return { ok: false };
  } finally {
    queueWrites.end();
    if (btn) {
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
    }
  }
}

export async function toggleFavorite(ep, btn) {
  if (!ep.feedUrl || !ep.guid) {
    notify("缺少剧集身份，无法收藏", "warn");
    return;
  }
  try {
    const r = await api.toggleFavorite({
      feedUrl: ep.feedUrl,
      guid: ep.guid,
      title: ep.title,
      showTitle: ep.showTitle || "",
      coverUrl: ep.coverUrl || null,
      dedupKey: ep.dedupKey || "",
      subscriptionId: ep.subscriptionId || "",
      durationSec: ep.durationSec ?? null,
    });
    if (!r.ok) {
      notify(r.error || "收藏失败", "err");
      return;
    }
    ep.favorited = !!r.favorited;
    if (btn) btn.setAttribute("aria-pressed", ep.favorited ? "true" : "false");
    notify(ep.favorited ? "已收藏" : "已取消收藏", "ok");
    await reloadFavorites();
  } catch (e) {
    notify(String(e), "err");
  }
}

/* ------------------------------------------------------------------ */
/* cast to MIoT speaker                                                */
/* ------------------------------------------------------------------ */

/**
 * Absolute URL of a sibling plugin's page in this host, so the guide can send
 * the user straight there instead of describing the route in prose.
 */
function pluginPageUrl(entryPath) {
  try {
    const { origin } = window.location;
    return `${origin}/api/v1/jsplugin/${encodeURIComponent(entryPath)}/`;
  } catch (_) {
    return null;
  }
}

function castUnavailableDialog(reason, errorText) {
  const offline = reason === "miot_device_offline";
  const noDevice = reason === "miot_no_device";
  const miotUrl = pluginPageUrl("miot");

  let body;
  if (offline) {
    body =
      `<p>${escapeHtml(errorText || "音箱当前离线。")}</p>` +
      `<p>音箱离线时无法接收播放指令。请确认它已通电、连上同一网络，` +
      `然后在小爱 App 或「智能音箱」插件页看到「在线」后再试。</p>`;
  } else if (noDevice) {
    body =
      `<p>「智能音箱」插件里还没读到设备。</p>` +
      `<p>请打开插件页，登录小米账号；设备出现在列表后，点一下选中它。</p>` +
      (errorText ? `<p class="muted">${escapeHtml(errorText)}</p>` : "");
  } else {
    body =
      `<p>投放通过「智能音箱」插件（entryPath <code>miot</code>）让小爱音箱播放「播客」歌单。</p>` +
      `<p class="muted">请先在 Songloft 的插件市场安装，并确认该插件已启用。</p>` +
      (errorText ? `<p class="muted">${escapeHtml(errorText)}</p>` : "");
  }

  return openModal({
    title: offline ? "音箱离线" : noDevice ? "没有可用设备" : "需要「智能音箱」插件",
    body,
    size: "default",
    actions: [
      ...(miotUrl
        ? [
            {
              label: "打开插件页",
              kind: "primary",
              iconName: "speaker",
              close: false,
              onClick: () => {
                const opened = window.open(miotUrl, "_blank", "noopener");
                if (!opened) {
                  notify(`请手动打开：${miotUrl}`, "warn");
                }
                return false;
              },
            },
          ]
        : []),
      {
        label: "去设置",
        kind: "tonal",
        close: false,
        onClick: () => {
          closeModal();
          const btn = document.querySelector('.nav button[data-tab="settings"]');
          if (btn) btn.click();
          return false;
        },
      },
      { label: "知道了", kind: "ghost", close: true },
    ],
  });
}

/**
 * Cast one song to the MIoT speaker.
 * @param {number|null} songId
 * @param {{prepareIfMissing?: object}} [opts]
 */
export async function castToSpeaker(songId, opts = {}) {
  let id = songId;
  try {
    if (id == null && opts.prepareIfMissing) {
      const ep = opts.prepareIfMissing;
      if (!ep.subscriptionId) {
        notify("该集尚未入库，无法投放", "warn");
        return;
      }
      const prep = await api.prepare({
        subscriptionId: ep.subscriptionId,
        guid: ep.guid,
        dedupKey: ep.dedupKey,
      });
      if (!prep.ok) {
        notify(prep.error || "准备音频失败", "err");
        return;
      }
      id = prep.songId;
    }
    if (id == null) {
      notify("没有可投放的单集", "warn");
      return;
    }

    // Both the "settings test cast" and a normal cast play the same persistent
    // 「播客」queue: the server moves this episode to row 0 and starts there.
    const plan = resolveSpeakerCastPlan({
      songId: id,
      forceSingle: opts.forceSingle,
      queueSongs: getData().queueSongs,
    });
    if (!plan) {
      notify("没有可投放的单集", "warn");
      return;
    }
    await castQueueToSpeaker({
      deviceId: opts.deviceId,
      songIds: plan.songIds,
      songId: plan.songId,
    });
  } catch (e) {
    notify(String((e && e.message) || e), "err");
  }
}

/**
 * Play「播客」on the speaker, starting at the chosen episode.
 *
 * The server moves that episode to the front of the persistent「播客」playlist
 * (identified only by the id this plugin saved) and asks MIoT to play it in
 * order from index 0. No separate snapshot table is created or refilled, and a
 * failure or concurrency never produces a spare one.
 *
 * The order change happens before the play request, so it can stand even when
 * casting fails; the copy says so instead of promising otherwise.
 */
export async function castQueueToSpeaker(opts = {}) {
  const data = getData();
  const songIds = (
    Array.isArray(opts.songIds) && opts.songIds.length
      ? opts.songIds
      : (data.queueSongs || []).map((s) => s && s.id)
  )
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!songIds.length) {
    notify("「播客」列表为空，先添加几集再投放", "warn");
    return;
  }
  const songId =
    Number.isFinite(Number(opts.songId)) && Number(opts.songId) > 0
      ? Number(opts.songId)
      : songIds[0];
  try {
    notify("正在把这一集移到「播客」第一位并投放…", "muted");
    const r = await api.castMiotPlaylist({
      deviceId: opts.deviceId,
      songIds,
      songId,
    });
    if (r && r.ok) {
      notify(
        `已投放到${r.deviceName ? `「${r.deviceName}」` : "小爱音箱"}：从这一集按「播客」列表顺序播放`,
        "ok"
      );
      await reloadQueue();
      return;
    }
    if (
      r &&
      (r.reason === "miot_unavailable" ||
        r.reason === "miot_no_device" ||
        r.reason === "miot_device_offline")
    ) {
      clearToast();
      await castUnavailableDialog(r.reason, r.error);
      return;
    }
    // Failure copy must be honest: the list may already be reordered.
    const orderNote = r && r.orderChanged === false
      ? "「播客」列表顺序未改变。"
      : "「播客」列表顺序会在播放请求之前调整，可能已经改成从这一集开始。";
    notify(`${(r && r.error) || "投放失败"} ${orderNote}`.trim(), "err");
    if (r && r.orderChanged !== false) reloadQueue().catch(() => {});
  } catch (e) {
    notify(
      `投放失败：${String((e && e.message) || e)}。「播客」列表顺序可能在请求前已调整。`,
      "err"
    );
    reloadQueue().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* queue mutations                                                     */
/* ------------------------------------------------------------------ */

/**
 * The queue has two racing writers: an optimistic local patch and the
 * `reloadQueue()` that follows it (plus the periodic 20s sync). A generation
 * token makes an older response lose instead of clobbering newer local state.
 * See `queueOptimistic.js` for the model and its tests.
 */
const queueWrites = createQueueWriteTracker();

function beginQueueWrite() {
  return queueWrites.begin();
}

function isStaleQueueWrite(gen) {
  return !queueWrites.isCurrent(gen);
}

/** Index the current queue and let the registered views repaint their buttons. */
function repaintQueueButtonsNow() {
  const index = buildQueueIndex(getData().queueSongs);
  for (const fn of queueRepainters) {
    try {
      fn(index);
    } catch (_) {
      /* ignore */
    }
  }
}

/** Re-read the queue only if no newer mutation has taken over. */
async function reloadQueueIfCurrent(gen) {
  if (isStaleQueueWrite(gen)) return;
  try {
    const r = await api.queue();
    if (!r || !r.ok || !shouldApplyQueueResponse(gen, queueWrites)) return;
    patch({
      queueSongs: r.songs || [],
      queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName },
    });
    repaintQueueButtonsNow();
    notifyQueueViews();
  } catch (_) {
    /* keep the optimistic list; the periodic sync will catch up */
  }
}

/**
 * Reflect the server's new「播客」order locally, without a full re-read.
 *
 * Only rows already known locally are reordered: an episode that was inserted
 * by the move is not in `queueSongs` yet, and inventing a row without its
 * episode data would make the panel show a broken item. The periodic sync (or
 * opening the panel) fills that in.
 */
function applyQueueOrderLocally(ids, episode) {
  const data = getData();
  const songs = data.queueSongs || [];
  const next = pinQueueSongsLocally(songs, ids, episode);
  patch({ queueSongs: next, queueMeta: data.queueMeta });
  repaintQueueButtonsNow();
  notifyQueueViews();
  return next;
}

/**
 * Restore the pre-mutation list unless a newer mutation now owns it.
 * @returns {boolean} true when the rollback was applied
 */
function rollbackQueue(before, gen) {
  const plan = rollbackPlan({ before, token: gen, tracker: queueWrites });
  if (!plan.patch) return false;
  patch(plan.patch);
  repaintQueueButtonsNow();
  notifyQueueViews();
  return true;
}

/**
 * Remove songs from the fixed「播客」playlist.
 *
 * Order matters for perceived speed: patch the list and tell the user first,
 * then call the API, and restore the exact previous array if the call fails.
 *
 * @param {number[]} songIds
 * @returns {Promise<{ ok: boolean, error?: string, removed?: number }>}
 */
export async function removeSongs(songIds) {
  const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
  if (!ids.length) return { ok: false };
  const gen = beginQueueWrite();
  const before = snapshotQueue(getData());
  const survivors = withoutSongs(before.queueSongs, ids);
  const removedCount = before.queueSongs.length - survivors.length;

  patch({ queueSongs: survivors, queueMeta: before.queueMeta });
  repaintQueueButtonsNow();
  notifyQueueViews();
  notify(`已从播放列表移除 ${removedCount} 首`, "ok");

  try {
    const r = await api.queueRemove(ids);
    if (!r || !r.ok) {
      rollbackQueue(before, gen);
      notify((r && r.error) || "移除失败，已恢复列表", "err");
      return r || { ok: false, error: "移除失败" };
    }
    await reloadQueueIfCurrent(gen);
    return r;
  } catch (e) {
    rollbackQueue(before, gen);
    notify("移除失败，已恢复列表", "err");
    return { ok: false, error: String(e) };
  } finally {
    queueWrites.end();
  }
}

export async function clearQueue() {
  const data = getData();
  if (!data.queueSongs.length) {
    notify("「播客」列表已空", "muted");
    return;
  }
  const ok = await uiConfirm({
    title: "清空「播客」列表",
    message: `将清空「播客」列表中的 ${data.queueSongs.length} 首，不会删除远程音频文件，也不会删除这张歌单。`,
    okText: "清空",
    danger: true,
  });
  if (!ok) return;
  const gen = beginQueueWrite();
  const before = snapshotQueue(getData());
  try {
    const r = await api.queueClear();
    if (!r.ok) {
      notify(r.error || "清空失败", "err");
      return;
    }
    // Repaint immediately: `reloadQueue` re-reads every song via `songs.getById`,
    // which on a long list made the UI look frozen for a second or two.
    patch({ queueSongs: [], queueMeta: before.queueMeta });
    notify(`已清空 ${r.removed} 首`, "ok");
    repaintQueueButtonsNow();
    notifyQueueViews();
    await reloadQueueIfCurrent(gen);
  } catch (e) {
    rollbackQueue(before, gen);
    notify(String(e), "err");
  } finally {
    queueWrites.end();
  }
}

export async function removePlayed() {
  const before = snapshotQueue(getData());
  const played = playedSongs(before.queueSongs);
  if (!played.length) {
    notify("没有已听完的节目", "muted");
    return;
  }
  const gen = beginQueueWrite();
  const drop = new Set(played.map((s) => s.id));
  patch({
    queueSongs: before.queueSongs.filter((s) => !drop.has(s.id)),
    queueMeta: before.queueMeta,
  });
  repaintQueueButtonsNow();
  notifyQueueViews();
  notify(`已移除 ${drop.size} 首已听完的节目`, "ok");

  try {
    const r = await api.queueRemovePlayed();
    if (!r || !r.ok) {
      rollbackQueue(before, gen);
      notify((r && r.error) || "移除已播放失败，已恢复列表", "err");
      return;
    }
    await reloadQueueIfCurrent(gen);
  } catch (e) {
    rollbackQueue(before, gen);
    notify("移除已播放失败，已恢复列表", "err");
  } finally {
    queueWrites.end();
  }
}

export async function replaceQueueAndPlay() {
  const data = getData();
  if (!data.queueSongs.length) {
    notify("「播客」列表为空", "warn");
    return;
  }
  if (!Host.hasSetQueue()) {
    notify(SET_QUEUE_UNAVAILABLE, "err");
    return;
  }
  const ok = await uiConfirm({
    title: PLAY_FROM_START_TITLE,
    message: PLAY_FROM_START_MESSAGE,
    okText: PLAY_FROM_START_OK,
  });
  if (!ok) return;
  try {
    const modeOk = await ensureSequentialPlayMode();
    if (modeOk === false) return;
    const { ids } = queueIdsForStart(getData().queueSongs, null);
    if (!ids.length) {
      notify("「播客」列表里还没有可播放的单集", "warn");
      return;
    }
    const meta = getData().queueMeta;
    await Host.replaceQueueAndPlay(ids, 0, {
      sourcePlaylistId: meta ? meta.playlistId : undefined,
    });
    try {
      await Host.setPlayMode("order");
    } catch (_) {
      /* older hosts may lack setPlayMode */
    }
    const first =
      (getData().queueSongs || []).find((s) => episodeSongId(s) === ids[0]) || getData().queueSongs[0];
    notify(`正在播放「${(first && first.title) || "当前单集"}」`, "ok");
  } catch (e) {
    notify(String(e), "err");
  }
}

export async function reorderQueue(songIds) {
  const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
  if (!ids.length) return;
  const gen = beginQueueWrite();
  const before = snapshotQueue(getData());
  patch({
    queueSongs: reorderSongs(before.queueSongs, ids),
    queueMeta: before.queueMeta,
  });
  notifyQueueViews();
  try {
    const r = await api.queueReorder(ids);
    if (!r || !r.ok) {
      rollbackQueue(before, gen);
      notify((r && r.error) || "排序失败，已恢复列表", "err");
      return;
    }
    await reloadQueueIfCurrent(gen);
  } catch (e) {
    rollbackQueue(before, gen);
    notify("排序失败，已恢复列表", "err");
  } finally {
    queueWrites.end();
  }
}

export { episodePayload, notify };
