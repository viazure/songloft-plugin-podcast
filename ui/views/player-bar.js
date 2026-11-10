/** Bottom player bar: compact on mobile, expanded on demand. */

import { $ } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { fmtSec, absoluteCoverUrl } from "../lib/format.js";
import * as Host from "../lib/host.js";
import * as Playback from "../lib/playback.js";
import { getData } from "../lib/store.js";
import { flushProgress, togglePlayPause, castToSpeaker, notify } from "../lib/actions.js";
import { subscribe } from "../lib/store.js";

/** True only while the user is actively dragging the seek thumb. */
let seeking = false;
let uiTickTimer = null;
let lastHostSyncAt = 0;
let scrubCommitToken = 0;

/* ------------------------------------------------------------------ */
/* cover resolution                                                    */
/* ------------------------------------------------------------------ */

/**
 * Cover urls keyed by song id.
 *
 * Two things used to make the player cover vanish:
 *  - `applyHostState` builds a new `current` from the host payload, which has no
 *    cover url, so switching tracks could carry the *previous* episode's cover
 *    (or none at all);
 *  - podcast cover art is often large and slow (measured >8s for a 690KB jpeg),
 *    so a single failed/slow load looked like a permanently missing cover.
 *
 * So covers are resolved by song id from any listing we have seen, then rendered
 * with a retry, and only fall back to the placeholder when nothing is known.
 */
const coverCache = new Map();

/** Remember a cover for a song id (called from queue / recent / favorites). */
export function rememberCover(songId, url) {
  const abs = absoluteCoverUrl(url);
  if (songId == null || !abs) return;
  const key = Number(songId);
  if (!Number.isFinite(key)) return;
  if (coverCache.get(key) !== abs) coverCache.set(key, abs);
}

function primeCoverCache() {
  const data = getData();
  for (const s of data.queueSongs || []) rememberCover(s.id, s.coverUrl || s.cover_url);
  for (const ep of data.recent || []) rememberCover(ep.songId, ep.coverUrl);
  for (const ep of data.favorites || []) rememberCover(ep.songId, ep.coverUrl);
  for (const ep of data.episodes || []) rememberCover(ep.songId, ep.coverUrl);
}

/** Best-known cover for the currently playing song. */
function resolveCover(cur) {
  if (!cur) return "";
  const songId = cur.songId != null ? Number(cur.songId) : null;
  if (songId != null && coverCache.has(songId)) return coverCache.get(songId);

  const fromCurrent = absoluteCoverUrl(cur.coverUrl);
  if (fromCurrent) {
    if (songId != null) coverCache.set(songId, fromCurrent);
    return fromCurrent;
  }

  const song = (getData().queueSongs || []).find((x) => x.id === songId);
  const fromQueue = absoluteCoverUrl(song && (song.coverUrl || song.cover_url));
  if (fromQueue) {
    if (songId != null) coverCache.set(songId, fromQueue);
    return fromQueue;
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

let coverSongId = null;
let coverRetryTimer = null;

function placeholderCover() {
  const el = document.createElement("div");
  el.id = "playerCover";
  el.className = "player__cover placeholder";
  el.textContent = "";
  return el;
}

/**
 * Render the cover for one song.
 *
 * - Same song + no url keeps whatever is displayed (data momentarily missing).
 * - A new song with no url shows the neutral placeholder instead of a stale image.
 * - A failed load retries once before giving up, because podcast CDNs are slow.
 */
function setCover(url, songId) {
  const abs = absoluteCoverUrl(url);
  const sameSong = songId != null && Number(songId) === coverSongId;
  if (songId != null) coverSongId = Number(songId);

  if (!abs) {
    if (sameSong) return;
    const existing = $("playerCover");
    if (existing && existing.tagName === "IMG") existing.replaceWith(placeholderCover());
    return;
  }

  const existing = $("playerCover");
  if (existing && existing.tagName === "IMG") {
    if (existing.getAttribute("src") !== abs) {
      mountCover(abs, existing);
    }
    return;
  }
  mountCover(abs, existing);
}

function mountCover(abs, existing) {
  const img = document.createElement("img");
  img.id = "playerCover";
  img.className = "player__cover";
  img.alt = "";
  img.decoding = "async";
  img.loading = "eager";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => onCoverError(abs, img);
  img.src = abs;
  if (existing) existing.replaceWith(img);
}

function onCoverError(abs, img) {
  if (!img || !img.isConnected) return;
  img.replaceWith(placeholderCover());
  // One retry: podcast CDNs are frequently slow or flap; a single miss should not
  // leave the player permanently without artwork.
  if (coverRetryTimer) clearTimeout(coverRetryTimer);
  coverRetryTimer = setTimeout(() => {
    if (coverSongId == null) return;
    const current = Playback.get().current;
    if (!current || Number(current.songId) !== coverSongId) return;
    const retryUrl = coverCache.get(coverSongId);
    if (!retryUrl) return;
    const node = $("playerCover");
    if (node && node.tagName === "IMG") return; // already recovered
    mountCover(retryUrl, node);
  }, 2500);
}

function resetCover() {
  coverSongId = null;
  if (coverRetryTimer) {
    clearTimeout(coverRetryTimer);
    coverRetryTimer = null;
  }
  const existing = $("playerCover");
  if (existing && existing.tagName === "IMG") existing.replaceWith(placeholderCover());
}

/** Keep the cache warm as listings refresh. */
export function bindCoverCache() {
  subscribe(() => primeCoverCache());
  primeCoverCache();
}

function setProgressUi(pos, dur) {
  const posEl = $("playerPos");
  const durEl = $("playerDur");
  const seek = $("playerSeek");
  const line = $("playerLine");
  const ratio = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
  const pct = `${(ratio * 100).toFixed(2)}%`;
  if (line) line.style.setProperty("--p", pct);
  if (posEl) posEl.textContent = fmtSec(pos);
  if (durEl) durEl.textContent = dur > 0 ? fmtSec(dur) : "—";
  if (seek) {
    seek.disabled = !(dur > 0);
    if (!seeking) seek.value = String(Math.round(ratio * 1000));
  }
}

/** Keep the compact line + time labels moving even when the host is quiet. */
function ensureUiTick(phase) {
  if (phase === "playing") {
    if (uiTickTimer != null) return;
    uiTickTimer = setInterval(async () => {
      if (seeking) return;
      const snap = Playback.get();
      if (snap.phase !== "playing") {
        clearInterval(uiTickTimer);
        uiTickTimer = null;
        return;
      }
      // Host events are sparse; periodically re-read so duration/position stay honest.
      const now = Date.now();
      if (now - lastHostSyncAt > 2000) {
        lastHostSyncAt = now;
        try {
          Playback.applyHostState(await Host.getState());
          return; // applyHostState re-renders via onChange
        } catch (_) {
          /* fall through to local clock */
        }
      }
      const dur =
        typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
      setProgressUi(Playback.livePositionSec(snap), dur);
    }, 250);
    return;
  }
  if (uiTickTimer != null) {
    clearInterval(uiTickTimer);
    uiTickTimer = null;
  }
}

export function renderPlayerBar(snap) {
  const bar = $("playerBar");
  if (!bar) return;

  const cur = snap.current;
  const titleEl = $("playerTitle");
  const subEl = $("playerSub");
  const playBtn = $("btnPlayPause");

  const dur = typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
  // One source for time label, range thumb, and compact line — extrapolated while playing.
  const pos = seeking
    ? (() => {
        const seek = $("playerSeek");
        return dur > 0 && seek ? (Number(seek.value) / 1000) * dur : Playback.livePositionSec(snap);
      })()
    : Playback.livePositionSec(snap);

  if (!cur) {
    bar.classList.add("is-empty");
    titleEl.textContent = "尚未播放";
    subEl.textContent = "";
    seeking = false;
    setProgressUi(0, 0);
    ensureUiTick("idle");
    playBtn.innerHTML = icon("play", 20);
    playBtn.title = "播放";
    resetCover();
    $("btnPlayerCast").disabled = true;
    return;
  }

  bar.classList.remove("is-empty");
  titleEl.textContent = cur.title || "未命名";
  const bits = [];
  if (cur.showTitle) bits.push(cur.showTitle);
  if (snap.error) bits.push(snap.error);
  else if (snap.hostHint) bits.push(snap.hostHint);
  subEl.textContent = bits.join(" · ");

  setProgressUi(pos, dur);
  ensureUiTick(snap.phase);

  if (snap.phase === "playing") {
    playBtn.innerHTML = icon("pause", 20);
    playBtn.title = "暂停";
  } else {
    playBtn.innerHTML = icon("play", 20);
    playBtn.title = snap.phase === "paused" || snap.phase === "ended" ? "继续" : "播放";
  }

  const song = getData().queueSongs.find((x) => x.id === cur.songId);
  setCover(resolveCover(cur) || (song && (song.coverUrl || song.cover_url)), cur.songId);
  $("btnPlayerCast").disabled = cur.songId == null;
}

export function bindPlayerBar() {
  const seek = $("playerSeek");
  if (seek) {
    const endScrub = () => {
      seeking = false;
    };
    const commit = async () => {
      // pointerup + change both fire on some platforms — honour only the first.
      const token = ++scrubCommitToken;
      const snap = Playback.get();
      const dur = snap.durationSec;
      if (!(dur > 0)) {
        endScrub();
        return;
      }
      const next = (Number(seek.value) / 1000) * dur;
      // Optimistic UI: keep thumb/time on the scrubbed spot until host confirms.
      Playback.setPhase(snap.phase === "playing" ? "playing" : snap.phase || "paused", {
        positionSec: next,
      });
      endScrub();
      try {
        await Host.seek(next);
        if (token !== scrubCommitToken) return;
        Playback.applyHostState(await Host.getState());
        // Explicit scrub: allow position to rewind (server mode=seek).
        await flushProgress({ seek: true });
      } catch (e) {
        if (token !== scrubCommitToken) return;
        notify(String(e), "err");
        try {
          Playback.applyHostState(await Host.getState());
        } catch (_) {
          /* ignore */
        }
      }
    };
    seek.addEventListener("pointerdown", (ev) => {
      seeking = true;
      try {
        seek.setPointerCapture(ev.pointerId);
      } catch (_) {
        /* some hosts reject capture on range inputs */
      }
    });
    seek.addEventListener("pointerup", commit);
    seek.addEventListener("pointercancel", endScrub);
    seek.addEventListener("lostpointercapture", () => {
      // If capture ends without a change event, do not leave seeking stuck.
      if (seeking) endScrub();
    });
    seek.addEventListener("change", commit);
    seek.addEventListener("input", () => {
      seeking = true;
      const snap = Playback.get();
      const dur =
        typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
      if (!(dur > 0)) return;
      const pos = (Number(seek.value) / 1000) * dur;
      // Keep the compact line in lockstep with the thumb while dragging.
      setProgressUi(pos, dur);
    });
  }

  $("btnPlayPause").addEventListener("click", () => togglePlayPause());

  $("btnSeekBack").addEventListener("click", async () => {
    const snap = Playback.get();
    try {
      await Host.seek(Math.max(0, (snap.positionSec || 0) - 15));
      Playback.applyHostState(await Host.getState());
      await flushProgress({ seek: true });
    } catch (e) {
      notify(String(e), "err");
    }
  });

  $("btnSeekFwd").addEventListener("click", async () => {
    const snap = Playback.get();
    const dur = snap.durationSec;
    const next =
      dur && dur > 0
        ? Math.min(dur, (snap.positionSec || 0) + 15)
        : (snap.positionSec || 0) + 15;
    try {
      await Host.seek(next);
      Playback.applyHostState(await Host.getState());
      await flushProgress({ seek: true });
    } catch (e) {
      notify(String(e), "err");
    }
  });

  $("btnPlayerCast").addEventListener("click", () => {    const cur = Playback.get().current;
    if (!cur || cur.songId == null) {
      notify("没有正在播放的单集", "warn");
      return;
    }
    castToSpeaker(cur.songId);
  });

  // Tap the meta block to toggle between compact and expanded controls on
  // mobile; there is no separate chevron button any more.
  const meta = $("playerMeta");
  if (meta) {
    meta.addEventListener("click", () => {
      const bar = $("playerBar");
      if (bar.classList.contains("is-collapsed")) bar.classList.remove("is-collapsed");
      bar.classList.toggle("is-expanded");
      meta.setAttribute(
        "title",
        bar.classList.contains("is-expanded") ? "收起播放控制" : "展开播放控制"
      );
    });
  }
}
