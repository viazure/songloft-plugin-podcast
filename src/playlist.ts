/**
 * Per-subscription playlist upsert with cover-refresh (clear + add).
 * SDK has no playlists.replaceSongs — same degradation as Last.fm Loved.
 */

export const ADD_CHUNK = 200;
export const REPLACE_STRATEGY = "clear+add" as const;
/** Note for Review / UI: preferred replaceSongs unavailable on current SDK. */
export const REPLACE_NOTE =
  "SDK 无 playlists.replaceSongs；本刀用 removeSongs + addSongs 覆盖歌单（与 Loved 同语义）";

export type PlaylistsApi = {
  list(): Promise<Playlist[]>;
  create(input: { name: string; type?: "normal" | "radio"; description?: string }): Promise<Playlist>;
  getSongs(
    playlistId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<Song[]>;
  addSongs(playlistId: number, songIds: number[]): Promise<{ added: number; skipped: number }>;
  removeSongs(playlistId: number, songIds: number[]): Promise<void>;
  delete(id: number): Promise<void>;
  update?(id: number, fields: { name?: string; description?: string; coverUrl?: string }): Promise<Playlist>;
};

async function findPlaylistByName(api: PlaylistsApi, name: string): Promise<Playlist | null> {
  const list = await api.list();
  const hit = (list || []).find((p) => p && p.name === name);
  return hit || null;
}

async function clearPlaylistSongs(api: PlaylistsApi, playlistId: number): Promise<number> {
  const songs = await api.getSongs(playlistId);
  const ids = (songs || []).map((s) => s.id).filter((id) => typeof id === "number");
  if (!ids.length) return 0;
  for (let i = 0; i < ids.length; i += ADD_CHUNK) {
    await api.removeSongs(playlistId, ids.slice(i, i + ADD_CHUNK));
  }
  return ids.length;
}

async function addInChunks(api: PlaylistsApi, playlistId: number, songIds: number[]): Promise<void> {
  for (let i = 0; i < songIds.length; i += ADD_CHUNK) {
    await api.addSongs(playlistId, songIds.slice(i, i + ADD_CHUNK));
  }
}

/** Unique playlist name: base, then " (播客)", then " (播客2)"… skipping reserved ids. */
export function allocatePlaylistName(
  channelTitle: string,
  existingNames: string[],
  _reservedId?: number | null
): string {
  const base = (channelTitle || "播客").trim() || "播客";
  const list = existingNames;
  const hasOther = (name: string) => list.some((n) => n === name);

  if (!hasOther(base)) return base;
  const suffix1 = `${base} (播客)`;
  if (!hasOther(suffix1)) return suffix1;
  for (let i = 2; i < 100; i++) {
    const cand = `${base} (播客${i})`;
    if (!hasOther(cand)) return cand;
  }
  return `${base} (播客${Date.now() % 10000})`;
}

/**
 * Resolve a unique name, allowing the playlist with `keepPlaylistId` to keep its name.
 */
export async function resolveUniquePlaylistName(
  api: PlaylistsApi,
  channelTitle: string,
  keepPlaylistId?: number | null
): Promise<string> {
  const list = await api.list();
  const names = (list || [])
    .filter((p) => p && (keepPlaylistId == null || p.id !== keepPlaylistId))
    .map((p) => p.name);
  return allocatePlaylistName(channelTitle, names, keepPlaylistId);
}

export async function replacePlaylistSongs(
  api: PlaylistsApi,
  playlistId: number,
  songIds: number[]
): Promise<void> {
  await clearPlaylistSongs(api, playlistId);
  if (songIds.length) await addInChunks(api, playlistId, songIds);
}

/**
 * Ensure playlist exists (by stored id or name), then cover-replace songs.
 */
export async function upsertSubscriptionPlaylist(
  api: PlaylistsApi,
  opts: {
    channelTitle: string;
    description?: string;
    songIds: number[];
    previousPlaylistId?: number | null;
    previousPlaylistName?: string | null;
  }
): Promise<{ playlistId: number; playlistName: string; created: boolean; playlistIdChanged: boolean }> {
  const prevId = opts.previousPlaylistId ?? null;
  let existing: Playlist | null = null;
  if (prevId != null) {
    // Propagate lookup errors: transient list failures must not create duplicate playlists.
    const all = await api.list();
    existing = (all || []).find((p) => p.id === prevId) || null;
  }
  if (!existing && opts.previousPlaylistName) {
    existing = await findPlaylistByName(api, opts.previousPlaylistName);
  }

  if (existing) {
    const playlistId = existing.id;
    const playlistName = existing.name;
    // clear+add only. Never delete the existing playlist or swap IDs on transient failure.
    await replacePlaylistSongs(api, playlistId, opts.songIds);
    return { playlistId, playlistName, created: false, playlistIdChanged: false };
  }

  const name = await resolveUniquePlaylistName(api, opts.channelTitle, null);
  const created = await api.create({
    name,
    type: "normal",
    description: opts.description || `播客订阅：${opts.channelTitle}`,
  });
  if (opts.songIds.length) await addInChunks(api, created.id, opts.songIds);
  return {
    playlistId: created.id,
    playlistName: created.name,
    created: true,
    playlistIdChanged: false,
  };
}

/** Optional: empty a playlist without deleting it (manual clear after unsubscribe). */
export async function clearPlaylistOnly(api: PlaylistsApi, playlistId: number): Promise<number> {
  return clearPlaylistSongs(api, playlistId);
}
