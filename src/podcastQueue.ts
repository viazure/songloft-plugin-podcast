/**
 * Fixed host playlist「播客」= the only podcast play queue / listen-later.
 * type=normal (remote songs). Not per-subscription playlists.
 */

import {
  DEFAULT_PODCAST_PLAYLIST_NAME,
  loadSettings,
  saveSettings,
} from "./store";

export const ADD_CHUNK = 200;

export type PlaylistsApi = {
  list(): Promise<Playlist[]>;
  create(input: { name: string; type?: "normal" | "radio"; description?: string }): Promise<Playlist>;
  getSongs(
    playlistId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<Song[]>;
  addSongs(playlistId: number, songIds: number[]): Promise<{ added: number; skipped: number }>;
  removeSongs(playlistId: number, songIds: number[]): Promise<void>;
  /** Full ordered id list; length must match playlist size (host contract). */
  reorder(playlistId: number, songIds: number[]): Promise<void>;
};

export type QueueHandle = {
  playlistId: number;
  playlistName: string;
  created: boolean;
};

function playlistRow(p: Playlist): { id: number; name: string } {
  return { id: p.id, name: p.name };
}

/**
 * Ensure the fixed podcast playlist exists; persist id/name in settings.
 * If preferred name is taken by another playlist, use "播客 (插件)" then numbered suffixes.
 */
export async function ensurePodcastPlaylist(api: PlaylistsApi): Promise<QueueHandle> {
  const settings = await loadSettings();
  const preferred = settings.podcastPlaylistName || DEFAULT_PODCAST_PLAYLIST_NAME;

  if (settings.podcastPlaylistId != null) {
    const all = await api.list();
    const hit = (all || []).find((p) => p && p.id === settings.podcastPlaylistId);
    if (hit) {
      return { playlistId: hit.id, playlistName: hit.name, created: false };
    }
  }

  const all = await api.list();
  const byName = (all || []).find((p) => p && p.name === preferred);
  if (byName) {
    await saveSettings({
      podcastPlaylistId: byName.id,
      podcastPlaylistName: byName.name,
    });
    return { playlistId: byName.id, playlistName: byName.name, created: false };
  }

  const name = allocateUniqueName(
    preferred,
    (all || []).map((p) => p.name)
  );
  const created = await api.create({
    name,
    type: "normal",
    description: "Songloft 播客插件播放列表（待听）",
  });
  await saveSettings({
    podcastPlaylistId: created.id,
    podcastPlaylistName: created.name,
  });
  return { playlistId: created.id, playlistName: created.name, created: true };
}

export function allocateUniqueName(preferred: string, existingNames: string[]): string {
  const base = (preferred || DEFAULT_PODCAST_PLAYLIST_NAME).trim() || DEFAULT_PODCAST_PLAYLIST_NAME;
  const has = (n: string) => existingNames.some((x) => x === n);
  if (!has(base)) return base;
  const alt = `${base} (插件)`;
  if (!has(alt)) return alt;
  for (let i = 2; i < 100; i++) {
    const cand = `${base} (插件${i})`;
    if (!has(cand)) return cand;
  }
  return `${base} (插件${Date.now() % 10000})`;
}

async function addInChunks(
  api: PlaylistsApi,
  playlistId: number,
  songIds: number[]
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  for (let i = 0; i < songIds.length; i += ADD_CHUNK) {
    const r = await api.addSongs(playlistId, songIds.slice(i, i + ADD_CHUNK));
    added += r.added || 0;
    skipped += r.skipped || 0;
  }
  return { added, skipped };
}

/** Append song ids to the fixed queue (host dedupes). Does not play. */
export async function appendToPodcastQueue(
  api: PlaylistsApi,
  songIds: number[]
): Promise<{ playlistId: number; playlistName: string; added: number; skipped: number }> {
  const unique = [...new Set(songIds.filter((id) => typeof id === "number" && Number.isFinite(id)))];
  const handle = await ensurePodcastPlaylist(api);
  if (!unique.length) {
    return { playlistId: handle.playlistId, playlistName: handle.playlistName, added: 0, skipped: 0 };
  }
  const r = await addInChunks(api, handle.playlistId, unique);
  return {
    playlistId: handle.playlistId,
    playlistName: handle.playlistName,
    added: r.added,
    skipped: r.skipped,
  };
}

export async function removeFromPodcastQueue(
  api: PlaylistsApi,
  songIds: number[]
): Promise<{ playlistId: number; playlistName: string; removed: number }> {
  const handle = await ensurePodcastPlaylist(api);
  const unique = [...new Set(songIds.filter((id) => typeof id === "number" && Number.isFinite(id)))];
  if (!unique.length) {
    return { playlistId: handle.playlistId, playlistName: handle.playlistName, removed: 0 };
  }
  // One call for the whole set: the host takes an id array, and chunking turned a
  // 29-track clear into 29 round trips (which is why clearing felt slow).
  await api.removeSongs(handle.playlistId, unique);
  return {
    playlistId: handle.playlistId,
    playlistName: handle.playlistName,
    removed: unique.length,
  };
}

/** Clear all songs from the fixed podcast playlist (keeps the playlist itself). */
export async function clearPodcastQueue(
  api: PlaylistsApi
): Promise<{ playlistId: number; playlistName: string; removed: number }> {
  const listed = await listPodcastQueue(api);
  const ids = listed.songs.map((s) => s.id).filter((id) => typeof id === "number");
  if (!ids.length) {
    return { playlistId: listed.playlistId, playlistName: listed.playlistName, removed: 0 };
  }
  return removeFromPodcastQueue(api, ids);
}

export async function listPodcastQueue(
  api: PlaylistsApi
): Promise<{ playlistId: number; playlistName: string; songs: Song[] }> {
  const handle = await ensurePodcastPlaylist(api);
  const songs = await api.getSongs(handle.playlistId);
  return {
    playlistId: handle.playlistId,
    playlistName: handle.playlistName,
    songs: songs || [],
  };
}

/**
 * Move one song up (-1) or down (+1) in the fixed queue via full reorder.
 */
export async function moveInPodcastQueue(
  api: PlaylistsApi,
  songId: number,
  direction: -1 | 1
): Promise<{ playlistId: number; playlistName: string; songIds: number[]; moved: boolean }> {
  const listed = await listPodcastQueue(api);
  const ids = listed.songs.map((s) => s.id);
  const idx = ids.indexOf(songId);
  if (idx < 0) {
    return {
      playlistId: listed.playlistId,
      playlistName: listed.playlistName,
      songIds: ids,
      moved: false,
    };
  }
  const j = idx + direction;
  if (j < 0 || j >= ids.length) {
    return {
      playlistId: listed.playlistId,
      playlistName: listed.playlistName,
      songIds: ids,
      moved: false,
    };
  }
  const next = ids.slice();
  const tmp = next[idx];
  next[idx] = next[j];
  next[j] = tmp;
  await api.reorder(listed.playlistId, next);
  return {
    playlistId: listed.playlistId,
    playlistName: listed.playlistName,
    songIds: next,
    moved: true,
  };
}

/** Replace full order of the fixed podcast playlist. */
export async function reorderPodcastQueue(
  api: PlaylistsApi,
  songIds: number[]
): Promise<{ playlistId: number; playlistName: string; songIds: number[] }> {
  const listed = await listPodcastQueue(api);
  const current = listed.songs.map((s) => s.id);
  const next = songIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && current.includes(id));
  // Keep any missing ids at the end to avoid accidental drops.
  for (const id of current) {
    if (!next.includes(id)) next.push(id);
  }
  if (next.length !== current.length) {
    throw new Error("排序列表与播放列表长度不一致");
  }
  await api.reorder(listed.playlistId, next);
  return {
    playlistId: listed.playlistId,
    playlistName: listed.playlistName,
    songIds: next,
  };
}

export function summarizePlaylist(p: Playlist): { id: number; name: string } {
  return playlistRow(p);
}
