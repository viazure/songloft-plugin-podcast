/**
 * Queue list filters — pure, host-free helpers.
 *
 * The podcast queue lives in the host playlist, while play progress lives in
 * plugin storage. This module joins the two so callers stay declarative.
 */

export type QueueSongLite = {
  id: number;
  progress?: { completed?: boolean } | null;
};

export type ProgressLite = {
  lastSongId?: number | null;
  completed?: boolean;
};

/**
 * Song ids considered "already played".
 *
 * A song counts as played when either its joined progress row is completed,
 * or any progress entry points at it via `lastSongId` and is completed.
 */
export function pickPlayedSongIds(
  songs: QueueSongLite[],
  progressList: ProgressLite[] = []
): number[] {
  const completedSongIds = new Set<number>();
  for (const p of progressList) {
    if (!p || p.completed !== true) continue;
    const id = p.lastSongId;
    if (typeof id === "number" && Number.isFinite(id)) completedSongIds.add(id);
  }

  const out: number[] = [];
  const seen = new Set<number>();
  for (const s of songs || []) {
    if (!s || typeof s.id !== "number" || seen.has(s.id)) continue;
    seen.add(s.id);
    if (s.progress && s.progress.completed === true) out.push(s.id);
    else if (completedSongIds.has(s.id)) out.push(s.id);
  }
  return out;
}
