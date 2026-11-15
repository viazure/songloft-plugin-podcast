/**
 * Pure helpers for "play this episode, then let the host continue through the
 * 「播客」list". Side effects (host calls, toasts, confirms) stay in actions.js.
 */

export const PLAY_THROUGH_LABEL = "从这一集开始，按播放列表顺序继续";
export const SET_QUEUE_UNAVAILABLE =
  "宿主不支持整表播放。请在 Songloft 客户端内打开本插件，或升级宿主后再试。";
export const PLAY_FROM_START_TITLE = "从列表开头播放";
export const PLAY_FROM_START_MESSAGE =
  "将用「播客」列表替换当前正在播放的内容，并从第一首开始。播完一集后会自动继续下一集。";
export const PLAY_FROM_START_OK = "开始播放";
export const SINGLE_MODE_TITLE = "改为顺序播放？";
export const SINGLE_MODE_MESSAGE =
  "当前是单曲模式，播完这一集后不会自动继续下一集。改为顺序播放后，会按「播客」列表继续。";
export const SINGLE_MODE_OK = "改为顺序播放";

/** Prefer songId, then the host playlist row's `id`. */
export function episodeSongId(ep) {
  if (!ep) return null;
  const raw = ep.songId != null && ep.songId !== "" ? ep.songId : ep.id;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function playButtonLabel({ isCurrent, phase, pending } = {}) {
  if (pending) return "正在加入…";
  if (isCurrent && phase === "playing") return "暂停";
  if (isCurrent) return "继续";
  return PLAY_THROUGH_LABEL;
}

/** Prepared, non-pending song ids in list order. Does not truncate. */
export function readyQueueSongIds(songs) {
  const ids = [];
  for (const song of Array.isArray(songs) ? songs : []) {
    if (!song || song.pending) continue;
    const id = episodeSongId(song);
    if (id != null) ids.push(id);
  }
  return ids;
}

/**
 * Full ready-id list for setQueue, plus the start index of `targetId`.
 * If the target is not yet in the list, it is appended (not prepended / sliced).
 */
export function queueIdsForStart(songs, targetId) {
  const ids = readyQueueSongIds(songs);
  const tid = targetId == null || targetId === "" ? null : Number(targetId);
  if (tid == null || !Number.isFinite(tid)) {
    return { ids, startIndex: 0 };
  }
  let startIndex = ids.indexOf(tid);
  if (startIndex < 0) {
    ids.push(tid);
    startIndex = ids.length - 1;
  }
  return { ids, startIndex };
}

export function isSinglePlayMode(mode) {
  return mode === "single" || mode === "singlePlay";
}

export function readPlayMode(state) {
  if (!state) return null;
  const mode = state.play_mode != null ? state.play_mode : state.playMode;
  return mode == null || mode === "" ? null : String(mode);
}

function extractQueueIds(state) {
  if (!state) return null;
  const raw =
    state.queue ||
    state.songs ||
    state.song_ids ||
    state.songIds ||
    (state.playlist && (state.playlist.songs || state.playlist.song_ids));
  if (!Array.isArray(raw)) return null;
  const ids = [];
  for (const item of raw) {
    if (typeof item === "number" && Number.isFinite(item)) {
      ids.push(item);
      continue;
    }
    if (item && (item.id != null || item.songId != null)) {
      const n = Number(item.id != null ? item.id : item.songId);
      if (Number.isFinite(n)) ids.push(n);
    }
  }
  return ids;
}

/**
 * True only when the host queue is visibly the same song ids in the same order.
 * If the host state does not expose the queue, return false so the caller
 * re-applies setQueue instead of guessing.
 */
export function hostQueueMatches(state, ids) {
  const want = (Array.isArray(ids) ? ids : []).map(Number);
  if (!want.length) return false;
  const queueIds = extractQueueIds(state);
  if (!queueIds || queueIds.length !== want.length) return false;
  return queueIds.every((id, i) => id === want[i]);
}
