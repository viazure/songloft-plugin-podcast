/**
 * Speaker-cast helpers.
 *
 * 「播客」is the real playback queue, so a cast is never a separate snapshot
 * table: the server moves the chosen episode to the front of that same playlist
 * and asks the speaker to play it from index 0 in order. The UI only needs the
 * target episode and the current list order for optimistic repainting.
 */

export function queueSongIds(queueSongs) {
  return (Array.isArray(queueSongs) ? queueSongs : [])
    .map((s) => Number(s && (s.id != null ? s.id : s.songId)))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/**
 * Order of the queue after the target is moved to the front (what the speaker
 * will play). Returns the untouched list for an invalid id.
 */
export function queueIdsWithFront(queueSongs, songId) {
  const ids = queueSongIds(queueSongs);
  const tid = Number(songId);
  if (!Number.isFinite(tid) || tid <= 0) return ids;
  return [tid, ...ids.filter((id) => id !== tid)];
}

/**
 * @param {{
 *   songId?: number,
 *   forceSingle?: boolean,
 *   queueSongs?: Array<{id?: number, songId?: number}>,
 * }} [input]
 * @returns {{ kind: "one" | "queue", songId: number, songIds: number[] } | null}
 */
export function resolveSpeakerCastPlan({ songId, forceSingle, queueSongs } = {}) {
  const id = Number(songId);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (forceSingle) return { kind: "one", songId: id, songIds: [id] };
  return { kind: "queue", songId: id, songIds: queueIdsWithFront(queueSongs, id) };
}

/**
 * Body for POST /api/cast/miot-playlist.
 * The server always starts at the front of「播客」, so startIndex is only sent
 * when a caller explicitly asks for a different anchor.
 */
export function buildCastMiotPlaylistBody({ deviceId, songIds, startIndex, songId } = {}) {
  const body = {};
  if (Array.isArray(songIds) && songIds.length) {
    body.songIds = songIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }
  if (startIndex != null && startIndex !== "") {
    const idx = Number(startIndex);
    if (Number.isFinite(idx) && idx >= 0) body.startIndex = idx;
  }
  const sid = Number(songId);
  if (Number.isFinite(sid) && sid > 0) body.songId = sid;
  if (typeof deviceId === "string" && deviceId.trim()) body.deviceId = deviceId;
  return body;
}
