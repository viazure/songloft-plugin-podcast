/**
 * Legacy「播客投放」snapshot naming.
 *
 * New casts no longer copy the queue into a separate table: they move the
 * episode to the front of the persistent「播客」playlist and play that same
 * playlist. What remains here is only the name recognition the settings page
 * needs so older snapshot tables can still be listed for manual cleanup.
 */

import { CAST_PLAYLIST_DESCRIPTION } from "./castLedger";

export const SNAPSHOT_NAME_PREFIX = "播客投放";
/** Description older versions gave their snapshot tables. */
export const SNAPSHOT_DESCRIPTION = CAST_PLAYLIST_DESCRIPTION;

export type SnapshotKind = "one" | "list";

export type SnapshotPlaylistsApi = {
  list(): Promise<Array<{ id: number; name: string; description?: string }>>;
  create(input: { name: string; type?: "normal" | "radio"; description?: string }): Promise<{
    id: number;
    name: string;
    description?: string;
  }>;
  addSongs(playlistId: number, songIds: number[]): Promise<{ added: number; skipped: number }>;
  delete(id: number): Promise<void>;
  /** Full reorder of a playlist; required to move an episode to the front. */
  reorder?(playlistId: number, songIds: number[]): Promise<void>;
  replaceSongs?(playlistId: number, songIds: number[]): Promise<void>;
  removeSongs?(playlistId: number, songIds: number[]): Promise<void>;
  getSongs?(playlistId: number, options?: { limit?: number; offset?: number }): Promise<Array<{ id?: number }>>;
  getById?(id: number): Promise<{ id: number; name: string; description?: string } | null>;
};

/**
 * Matches the prefix older versions used for snapshot tables (including the
 *「待听」variants), so those tables still show up in the manual cleanup list.
 */
export function isSnapshotPlaylistName(name: string | null | undefined): boolean {
  return typeof name === "string" && name.startsWith(SNAPSHOT_NAME_PREFIX);
}
