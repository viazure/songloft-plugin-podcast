/**
 * Optimistic queue-mutation model.
 *
 * The view patches the list first and shows feedback, then calls the API and
 * rolls back on failure. The two hazards that need a model (not a DOM) are:
 *
 *  1. **Restore fidelity** — a rollback must put back exactly what the user saw,
 *     including the previous `queueMeta`.
 *  2. **Stale responses** — a slow `reloadQueue()` / periodic sync that started
 *     before a newer mutation must not overwrite the newer local state.
 *
 * Generation tokens solve (2): every mutation takes the next token, and any
 * response carrying an older token is ignored.
 */

/** Monotonic write generation. */
export function createQueueWriteTracker() {
  let gen = 0;
  let pending = 0;
  return {
    /** Take ownership of the queue for a new mutation. */
    begin() {
      gen += 1;
      pending += 1;
      return gen;
    },
    /** Mark a mutation finished. Safe if already idle. */
    end() {
      if (pending > 0) pending -= 1;
    },
    /** True while at least one mutation has begun and not yet ended. */
    isPending() {
      return pending > 0;
    },
    /** True when `token` is still the newest mutation. */
    isCurrent(token) {
      return token === gen;
    },
    current() {
      return gen;
    },
  };
}

/**
 * Snapshot the state a rollback has to restore.
 * @param {{ queueSongs?: Array<object>, queueMeta?: object|null }} data
 */
export function snapshotQueue(data) {
  const songs = data && Array.isArray(data.queueSongs) ? data.queueSongs : [];
  return { queueSongs: songs.slice(), queueMeta: (data && data.queueMeta) || null };
}

/**
 * Rows left after removing `songIds`, preserving order.
 * @param {Array<{id:number}>} songs
 * @param {number[]} songIds
 */
export function withoutSongs(songs, songIds) {
  const drop = new Set((songIds || []).map(Number).filter(Number.isFinite));
  return (Array.isArray(songs) ? songs : []).filter((s) => !drop.has(Number(s && s.id)));
}

/** Rows considered「已听完」for「移除已播放」, mirroring the server-side filter. */
export function playedSongs(songs) {
  return (Array.isArray(songs) ? songs : []).filter((s) => s && s.progress && s.progress.completed);
}

/**
 * Decide what a rollback should do.
 *
 * @param {{ before: {queueSongs: object[], queueMeta: object|null},
 *           token: number, tracker: ReturnType<typeof createQueueWriteTracker> }} input
 * @returns {{ patch: {queueSongs: object[], queueMeta: object|null} | null, discarded: boolean }}
 *   `patch: null` means "a newer mutation owns the list; do not touch it".
 */
export function rollbackPlan(input) {
  const { before, token, tracker } = input || {};
  if (!tracker || !tracker.isCurrent(token)) return { patch: null, discarded: true };
  return {
    patch: { queueSongs: (before && before.queueSongs) || [], queueMeta: (before && before.queueMeta) || null },
    discarded: false,
  };
}

/**
 * Should a `reloadQueue` response be applied?
 * @param {number} token  generation captured when the read started
 * @param {ReturnType<typeof createQueueWriteTracker>} tracker
 */
export function shouldApplyQueueResponse(token, tracker) {
  return !!tracker && tracker.isCurrent(token);
}

/**
 * Reorder `songs` to match `orderedIds`, keeping unknown or leftover rows
 * at the end in their original order so a partial id list cannot drop items.
 * @param {Array<{id:number}>} songs
 * @param {number[]} orderedIds
 */
export function reorderSongs(songs, orderedIds) {
  const list = Array.isArray(songs) ? songs : [];
  const byId = new Map();
  for (const song of list) {
    const id = Number(song && song.id);
    if (Number.isFinite(id) && !byId.has(id)) byId.set(id, song);
  }
  const next = [];
  const seen = new Set();
  for (const raw of Array.isArray(orderedIds) ? orderedIds : []) {
    const id = Number(raw);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const song = byId.get(id);
    if (!song) continue;
    next.push(song);
    seen.add(id);
  }
  for (const song of list) {
    const id = Number(song && song.id);
    if (!seen.has(id)) {
      next.push(song);
      if (Number.isFinite(id)) seen.add(id);
    }
  }
  return next;
}

/**
 * Build a local row for an episode that is being pinned but is not yet in
 * `queueSongs`. Uses the prepared host song id, not a pending placeholder.
 * @param {object|null|undefined} episode
 * @param {number} songId
 */
export function buildOptimisticPinnedSong(episode, songId) {
  const id = Number(songId);
  const cover = (episode && (episode.coverUrl || episode.cover_url)) || "";
  return {
    id,
    title: (episode && episode.title) || "",
    artist: (episode && (episode.showTitle || episode.artist)) || "",
    album: (episode && (episode.showTitle || episode.album)) || "",
    coverUrl: cover || null,
    cover_url: cover,
    feedUrl: (episode && episode.feedUrl) || null,
    guid: (episode && episode.guid) || null,
    subscriptionId: (episode && episode.subscriptionId) || null,
    duration: episode && (episode.durationSec != null ? episode.durationSec : episode.duration),
    favorited: !!(episode && episode.favorited),
    progress: (episode && episode.progress) || null,
  };
}

/**
 * Optimistic「置顶」: move known rows to `orderedIds`, and if the target
 * (the first id) is not in the list yet, insert a local row for it at front.
 * @param {Array<object>} songs
 * @param {number[]} orderedIds
 * @param {object|null|undefined} episode
 */
export function pinQueueSongsLocally(songs, orderedIds, episode) {
  const list = Array.isArray(songs) ? songs.slice() : [];
  const ids = (Array.isArray(orderedIds) ? orderedIds : []).map(Number).filter(Number.isFinite);
  const targetId = ids.length ? ids[0] : NaN;
  let nextList = list;
  if (Number.isFinite(targetId) && !list.some((s) => Number(s && s.id) === targetId)) {
    nextList = [buildOptimisticPinnedSong(episode, targetId), ...list];
  }
  return reorderSongs(nextList, ids.length ? ids : nextList.map((s) => s && s.id));
}

function episodeIdentity(ep) {
  const feed = String((ep && ep.feedUrl) || "").trim().replace(/\/+$/, "").toLowerCase();
  const guid = String((ep && ep.guid) || "").trim();
  if (feed && guid) return `${feed}::${guid}`;
  return String((ep && ep.dedupKey) || "").trim();
}

/** Temporary id for a row that is still being added. Not a host song id. */
export function pendingSongId(ep) {
  const key = episodeIdentity(ep) || String((ep && ep.title) || "episode");
  return `pending:${key}`;
}

export function isPendingQueueSong(song) {
  return !!(song && song.pending);
}

function sameEpisode(song, ep) {
  if (!song || !ep) return false;
  if (song.id && song.id === pendingSongId(ep)) return true;
  const a = episodeIdentity(song);
  const b = episodeIdentity(ep);
  return !!a && a === b;
}

/** True when this episode already has a loading row in the local list. */
export function hasPendingSong(songs, ep) {
  return (Array.isArray(songs) ? songs : []).some(
    (song) => isPendingQueueSong(song) && sameEpisode(song, ep)
  );
}

/**
 * Append a loading placeholder for `ep` at the end. Idempotent: if the
 * episode is already in the list (pending or real), the array is unchanged.
 * The placeholder is not a host song and must not be treated as「已加入」.
 */
export function appendPendingSong(songs, ep) {
  const list = Array.isArray(songs) ? songs.slice() : [];
  if (!ep) return list;
  if (list.some((song) => sameEpisode(song, ep))) return list;
  list.push({
    id: pendingSongId(ep),
    pending: true,
    title: ep.title || "",
    artist: ep.showTitle || "",
    album: ep.showTitle || "",
    coverUrl: ep.coverUrl || null,
    feedUrl: ep.feedUrl || "",
    guid: ep.guid || "",
    duration: ep.durationSec ?? null,
    favorited: !!ep.favorited,
  });
  return list;
}
