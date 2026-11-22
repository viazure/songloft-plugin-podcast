/**
 * Decide how to start client playback from the host's authoritative getState.
 *
 * The「播客」playlist is the playback queue, so a play always targets row 0 of
 * that order. Session identity comes only from current_song.id, current_time,
 * is_playing, queue, current_index, and source_playlist_id (snake_case, with
 * camelCase fallbacks). Matching intended ids, a local songId, or a generation
 * is not enough to treat the host session as ours.
 */

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickBoolean(...values) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return null;
}

function extractQueueIds(state) {
  if (!state) return [];
  const raw =
    state.queue ||
    state.songs ||
    state.song_ids ||
    state.songIds ||
    (state.playlist && (state.playlist.songs || state.playlist.song_ids));
  if (!Array.isArray(raw)) return [];
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
 * @param {object|null|undefined} state
 * @returns {{
 *   available: boolean,
 *   currentId: number|null,
 *   currentTime: number|null,
 *   isPlaying: boolean|null,
 *   queue: number[],
 *   currentIndex: number|null,
 *   sourcePlaylistId: number|null,
 * }}
 */
export function readHostPlayback(state) {
  if (!state || typeof state !== "object") {
    return {
      available: false,
      currentId: null,
      currentTime: null,
      isPlaying: null,
      queue: [],
      currentIndex: null,
      sourcePlaylistId: null,
    };
  }
  const song = state.current_song != null ? state.current_song : state.currentSong;
  const currentId = song && song.id != null ? pickNumber(song.id) : null;
  return {
    available: true,
    currentId,
    currentTime: pickNumber(state.current_time, state.currentTime),
    isPlaying: pickBoolean(state.is_playing, state.isPlaying),
    queue: extractQueueIds(state),
    currentIndex: pickNumber(state.current_index, state.currentIndex),
    sourcePlaylistId: pickNumber(state.source_playlist_id, state.sourcePlaylistId),
  };
}

export const REPLACE_PLAYBACK_TITLE = "替换当前播放？";
export const REPLACE_PLAYBACK_MESSAGE =
  "当前正在播放其他内容，或无法确认现在播的是哪一集。确定后会先把这一集移到「播客」列表第一位，再替换当前播放；取消则保持现在的播放和列表顺序不变。";
export const REPLACE_PLAYBACK_OK = "调整列表并播放";

function normalizeIds(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/** Target first, then the remaining rows in list order; start index is always 0. */
function frontOrderedIds(intendedIds, targetSongId) {
  const tid = Number(targetSongId);
  const ids = normalizeIds(intendedIds).filter((id) => id !== tid);
  if (Number.isFinite(tid) && tid > 0) ids.unshift(tid);
  return ids;
}

/** The host is current on `targetSongId` and it is the first queue row. */
function isFrontEpisode(host, targetSongId) {
  if (!host || !host.available || host.currentId == null) return false;
  if (Number(host.currentId) !== Number(targetSongId)) return false;
  if (host.currentIndex != null) {
    if (host.currentIndex !== 0) return false;
    if (host.queue.length) return Number(host.queue[0]) === Number(targetSongId);
    return true;
  }
  if (host.queue.length) return Number(host.queue[0]) === Number(targetSongId);
  return true;
}

function isIdle(host) {
  if (!host || !host.available) return false;
  return (
    host.currentId == null &&
    (!host.queue || host.queue.length === 0) &&
    host.isPlaying !== true
  );
}

/** The host says it is playing from our own「播客」playlist id. */
function sameSourcePlaylist(host, podcastPlaylistId) {
  if (!host || !host.available) return false;
  const want = Number(podcastPlaylistId);
  if (!Number.isFinite(want) || want <= 0) return false;
  return host.sourcePlaylistId != null && Number(host.sourcePlaylistId) === want;
}

/**
 * @param {{
 *   host: ReturnType<typeof readHostPlayback>|null,
 *   targetSongId: number,
 *   intendedIds: number[],
 *   podcastPlaylistId?: number|null,
 * }} input
 * @returns {{
 *   type: "noop-playing"|"resume"|"set-queue"|"confirm-replace",
 *   ids: number[],
 *   startIndex: 0,
 *   playMode: "order",
 *   reason?: string,
 * }}
 */
export function decidePlayAction({ host, targetSongId, intendedIds, podcastPlaylistId } = {}) {
  const ids = frontOrderedIds(intendedIds, targetSongId);
  const base = { ids, startIndex: 0, playMode: "order" };

  if (!host || !host.available) {
    return { type: "confirm-replace", ...base, reason: "unknown" };
  }
  if (isIdle(host)) {
    return { type: "set-queue", ...base };
  }
  if (isFrontEpisode(host, targetSongId)) {
    if (host.isPlaying === true) return { type: "noop-playing", ...base };
    if (host.isPlaying === false) return { type: "resume", ...base };
    return { type: "confirm-replace", ...base, reason: "unknown-playing-state" };
  }
  // Already this episode, but not the first row: re-anchor it at the front.
  if (host.currentId != null && Number(host.currentId) === Number(targetSongId)) {
    if (sameSourcePlaylist(host, podcastPlaylistId)) return { type: "set-queue", ...base };
    return { type: "confirm-replace", ...base, reason: "not-in-front" };
  }
  // A different episode, but the host says it is playing our own「播客」queue:
  // re-anchoring that same playlist needs no extra confirmation.
  if (host.currentId != null && sameSourcePlaylist(host, podcastPlaylistId)) {
    return { type: "set-queue", ...base };
  }
  return {
    type: "confirm-replace",
    ...base,
    reason: host.currentId != null ? "different-source" : "unknown",
  };
}
