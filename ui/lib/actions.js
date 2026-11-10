/**
 * Playback + mutation actions shared by all views.
 *
 * Views never talk to the host player directly: they call these helpers, which
 * keep `PlaybackState` and the data store in sync.
 */

import { api } from "./api.js";
import * as Host from "./host.js";
import * as Playback from "./playback.js";
import { getData, patch } from "./store.js";
import { toast, clearToast } from "./toast.js";
import { openModal, uiConfirm, closeModal } from "./modal.js";
import { escapeHtml } from "./dom.js";

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
  try {
    const r = await api.queue();
    if (!r.ok) {
      patch({ queueSongs: [], queueMeta: null });
      return getData();
    }
    patch({
      queueSongs: r.songs || [],
      queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName },
    });
  } catch (e) {
    patch({ queueSongs: [], queueMeta: null });
    notify("读取播放列表失败（需宿主 playlists 权限）", "warn");
  }
  return getData();
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

async function resumeCurrentIfSame(songId) {
  const snap = Playback.get();
  if (
    songId != null &&
    snap.current &&
    snap.current.songId === songId &&
    ["paused", "ended", "playing"].includes(snap.phase)
  ) {
    await Host.play();
    const st = await Host.getState();
    Playback.applyHostState(st);
    return true;
  }
  return false;
}

/**
 * Play an episode (or resume the current one).
 * @param {object} ep
 * @param {{forcePrepare?: boolean, resume?: boolean}} [opts]
 */
export async function playEpisode(ep, opts = {}) {
  if (!caps.available || !caps.hasPlayer) {
    notify("宿主播放器不可用", "warn");
    return;
  }

  let songId = ep.songId;
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
    if (songId && !opts.forcePrepare && (await resumeCurrentIfSame(songId))) {
      notify("继续播放当前单集", "ok");
      return;
    }

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

    const snap0 = Playback.get();
    let resumeAt = 0;
    const wantResume =
      opts.resume === true ||
      (snap0.current &&
        snap0.current.songId === songId &&
        snap0.positionSec > 5 &&
        snap0.phase !== "ended");
    if (wantResume) {
      if (snap0.progressCapable && snap0.positionSec > 5 && snap0.current?.songId === songId) {
        resumeAt = snap0.positionSec;
      } else if (ctx.feedUrl && ctx.guid && ctx.guidSource !== "enclosure") {
        try {
          const pr = await api.getProgressOne(ctx.feedUrl, ctx.guid);
          if (pr && pr.ok && pr.progress && pr.progress.positionSec > 5 && !pr.progress.completed) {
            resumeAt = pr.progress.positionSec;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }

    // Start playback first, then append to the fixed playlist in the background.
    Playback.beginPlayRequest({ ...ctx, songId });
    await Host.play(songId);
    notify(`正在播放「${ctx.title || "当前单集"}」`, "ok");

    const ok = await syncPlayStateAfterRequest(songId);
    if (!ok) {
      Playback.playFailed("播放未确认成功（宿主未回报该曲状态）");
      notify("播放未确认成功。请确认在 Songloft 客户端内打开。", "err");
      return;
    }

    if (resumeAt > 5) {
      let seekOk = false;
      try {
        const st = await Host.getState();
        if (st && st.current_song && st.current_song.id === songId) {
          if (typeof st.current_time !== "number") {
            Playback.setProgressCapable(false);
          } else {
            await Host.seek(resumeAt);
            const st2 = await Host.getState();
            Playback.applyHostState(st2);
            seekOk =
              st2 &&
              typeof st2.current_time === "number" &&
              Math.abs(st2.current_time - resumeAt) < 15;
          }
        }
      } catch (_) {
        seekOk = false;
      }
      notify(seekOk ? "已从上次位置继续收听" : "未能可靠续听，已从片头附近开始", seekOk ? "ok" : "warn");
    }

    if (ctx.feedUrl && ctx.guid) {
      // P0: bridge host songId → SoT key before any background play event.
      rememberMapping(songId, ctx.feedUrl, ctx.guid);
      api
        .saveProgress({
          feedUrl: ctx.feedUrl,
          guid: ctx.guid,
          lastSongId: songId,
          lastPlayedAt: Date.now(),
        })
        .catch(() => {});
      // History is its own record: it answers "what did I listen to", while
      // progress answers "where was I". Omit positionSec so we never rewind.
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
          // Only refresh the history tab if it is the one on screen.
          if (document.querySelector("#tab-history:not(.hidden)")) {
            reloadHistory().then(() => {
              if (typeof onHistoryChange === "function") onHistoryChange();
            });
          }
        })
        .catch(() => {});
    }

    if (!getData().queueSongs.some((s) => s.id === songId)) {
      api
        .queueAddIds([songId])
        .then((r) => {
          if (r && r.ok && (r.added || 0) > 0) {
            notify("已加入「播客」播放列表", "ok");
          }
          return reloadQueue();
        })
        .catch(() => {
          notify("未能自动加入播放列表，可手动「加入播放列表」", "warn");
        });
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
      if (await resumeCurrentIfSame(cur.songId)) return;
      await playEpisode({ ...cur, songId: cur.songId }, { resume: true });
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

export async function addToQueue(ep) {
  try {
    const r = await api.queueAdd({
      subscriptionId: ep.subscriptionId,
      guid: ep.guid,
      dedupKey: ep.dedupKey,
    });
    if (!r.ok) {
      notify(r.error || "加入播放列表失败（准备音频）", "err");
      return;
    }
    const name = r.playlistName || "播客";
    const bits = [];
    if (r.added > 0) bits.push(`已将《${shortTitle(ep.title)}》加入播放列表「${name}」`);
    else if (r.skipped > 0) bits.push(`《${shortTitle(ep.title)}》已在播放列表「${name}」中`);
    else bits.push(`未能加入播放列表「${name}」`);
    notify(bits.join(""), r.added > 0 ? "ok" : "warn");
    await reloadQueue();
  } catch (e) {
    notify(String(e), "err");
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
      `<p>一键投放通过「智能音箱」插件（entryPath <code>miot</code>）把单集 URL 推给音箱。</p>` +
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

    notify("正在投放到小爱音箱…", "muted");
    const r = await api.castMiot(id, opts.deviceId);
    if (r && r.ok) {
      notify(`已投放到${r.deviceName ? `「${r.deviceName}」` : "小爱音箱"}`, "ok");
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
    notify((r && r.error) || "投放失败", "err");
  } catch (e) {
    notify(String((e && e.message) || e), "err");
  }
}

/**
 * Push the whole「播客」playlist to the speaker.
 *
 * Unlike `castToSpeaker` (one stream, no next-track handling), this hands MIoT a
 * playlist id so the device owns the queue and can auto-advance.
 */
export async function castQueueToSpeaker(opts = {}) {
  const data = getData();
  if (!data.queueSongs.length) {
    notify("播放列表为空，先添加几集再投放", "warn");
    return;
  }
  try {
    notify(`正在把 ${data.queueSongs.length} 集推送到音箱…`, "muted");
    const r = await api.castMiotPlaylist(null, opts.deviceId);
    if (r && r.ok) {
      notify(
        `已投放到${r.deviceName ? `「${r.deviceName}」` : "小爱音箱"}：${r.count} 集排队播放`,
        "ok"
      );
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
    notify((r && r.error) || "投放失败", "err");
  } catch (e) {
    notify(String((e && e.message) || e), "err");
  }
}

/* ------------------------------------------------------------------ */
/* queue mutations                                                     */
/* ------------------------------------------------------------------ */

export async function removeSongs(songIds) {
  if (!songIds || !songIds.length) return { ok: false };
  const before = getData().queueSongs || [];
  const drop = new Set(songIds.map(Number));
  try {
    const r = await api.queueRemove(songIds);
    if (!r.ok) {
      notify(r.error || "移除失败", "err");
      return r;
    }
    // Drop the rows locally first so the list responds instantly.
    patch({
      queueSongs: before.filter((s) => !drop.has(s.id)),
      queueMeta: getData().queueMeta,
    });
    await reloadQueue();
    return r;
  } catch (e) {
    notify(String(e), "err");
    return { ok: false, error: String(e) };
  }
}

export async function clearQueue() {
  const data = getData();
  if (!data.queueSongs.length) {
    notify("播放列表已空", "muted");
    return;
  }
  const ok = await uiConfirm({
    title: "清空播放列表",
    message: `将清空固定歌单「${data.queueMeta ? data.queueMeta.playlistName : "播客"}」中的 ${
      data.queueSongs.length
    } 首，不会删除远程音频文件。`,
    okText: "清空",
    danger: true,
  });
  if (!ok) return;
  try {
    const r = await api.queueClear();
    if (!r.ok) {
      notify(r.error || "清空失败", "err");
      return;
    }
    // Repaint immediately: `reloadQueue` re-reads every song via `songs.getById`,
    // which on a long list made the UI look frozen for a second or two.
    patch({ queueSongs: [], queueMeta: getData().queueMeta });
    notify(`已清空 ${r.removed} 首`, "ok");
    await reloadQueue();
  } catch (e) {
    notify(String(e), "err");
  }
}

export async function removePlayed() {
  try {
    const r = await api.queueRemovePlayed();
    if (!r.ok) {
      notify(r.error || "移除已播放失败", "err");
      return;
    }
    if (!r.removed) {
      notify("没有已听完的节目", "muted");
      return;
    }
    notify(`已移除 ${r.removed} 首已听完的节目`, "ok");
    await reloadQueue();
  } catch (e) {
    notify(String(e), "err");
  }
}

export async function replaceQueueAndPlay() {
  const data = getData();
  if (!data.queueSongs.length) {
    notify("播放列表为空", "warn");
    return;
  }
  const ok = await uiConfirm({
    title: "替换并播放",
    message: "将用「播客」歌单替换宿主当前播放队列并开始播放，现有队列会被覆盖。",
    okText: "替换并播放",
  });
  if (!ok) return;
  try {
    await Host.replaceQueueAndPlay(
      data.queueSongs.map((s) => s.id),
      0
    );
    notify("已替换宿主队列并开始播放", "ok");
  } catch (e) {
    notify(String(e), "err");
  }
}

export async function reorderQueue(songIds) {
  try {
    const r = await api.queueReorder(songIds);
    if (!r.ok) notify(r.error || "排序失败", "err");
    await reloadQueue();
  } catch (e) {
    notify(String(e), "err");
  }
}

export { episodePayload, notify };
