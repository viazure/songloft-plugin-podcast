import { describe, expect, it } from "vitest";
import {
  allocatePlaylistName,
  upsertSubscriptionPlaylist,
  replacePlaylistSongs,
  REPLACE_STRATEGY,
  type PlaylistsApi,
} from "../src/playlist";

function mockApi(initial: Array<{ id: number; name: string; songs: number[] }>): PlaylistsApi & {
  state: typeof initial;
} {
  const state = initial.map((p) => ({ ...p, songs: [...p.songs] }));
  let nextId = 100;
  const api: PlaylistsApi & { state: typeof state } = {
    state,
    async list() {
      return state.map((p) => ({
        id: p.id,
        type: "normal" as const,
        name: p.name,
        description: "",
        cover_url: "",
        labels: [],
        song_count: p.songs.length,
        created_at: "",
        updated_at: "",
        sort_by: "position",
        sort_order: "asc",
      }));
    },
    async create(input) {
      const id = nextId++;
      state.push({ id, name: input.name, songs: [] });
      return {
        id,
        type: "normal",
        name: input.name,
        description: input.description || "",
        cover_url: "",
        labels: [],
        song_count: 0,
        created_at: "",
        updated_at: "",
        sort_by: "position",
        sort_order: "asc",
      };
    },
    async getSongs(playlistId) {
      const p = state.find((x) => x.id === playlistId);
      return (p?.songs || []).map((id) => ({
        id,
        type: "remote" as const,
        title: "",
        artist: "",
        album: "",
        year: 0,
        genre: "",
        duration: 0,
        file_path: "",
        url: "",
        cover_url: "",
        file_size: 0,
        format: "",
        bit_rate: 0,
        sample_rate: 0,
        is_live: false,
        is_video: false,
        added_at: "",
        updated_at: "",
      }));
    },
    async addSongs(playlistId, songIds) {
      const p = state.find((x) => x.id === playlistId);
      if (!p) throw new Error("missing");
      let added = 0;
      for (const id of songIds) {
        if (!p.songs.includes(id)) {
          p.songs.push(id);
          added++;
        }
      }
      return { added, skipped: songIds.length - added };
    },
    async removeSongs(playlistId, songIds) {
      const p = state.find((x) => x.id === playlistId);
      if (!p) throw new Error("missing");
      const drop = new Set(songIds);
      p.songs = p.songs.filter((id) => !drop.has(id));
    },
    async delete(id) {
      const i = state.findIndex((x) => x.id === id);
      if (i >= 0) state.splice(i, 1);
    },
  };
  return api;
}

describe("allocatePlaylistName", () => {
  it("adds short suffix on conflict", () => {
    expect(allocatePlaylistName("News", [])).toBe("News");
    expect(allocatePlaylistName("News", ["News"])).toBe("News (播客)");
    expect(allocatePlaylistName("News", ["News", "News (播客)"])).toBe("News (播客2)");
  });
});

describe("replace semantics", () => {
  it("uses clear+add strategy", () => {
    expect(REPLACE_STRATEGY).toBe("clear+add");
  });

  it("replacePlaylistSongs covers set", async () => {
    const api = mockApi([{ id: 1, name: "News", songs: [1, 2, 3] }]);
    await replacePlaylistSongs(api, 1, [9, 8]);
    expect(api.state[0].songs).toEqual([9, 8]);
  });

  it("upsert creates then replaces", async () => {
    const api = mockApi([]);
    const a = await upsertSubscriptionPlaylist(api, {
      channelTitle: "Demo",
      songIds: [1, 2],
    });
    expect(a.created).toBe(true);
    expect(api.state[0].songs).toEqual([1, 2]);
    const b = await upsertSubscriptionPlaylist(api, {
      channelTitle: "Demo",
      songIds: [3],
      previousPlaylistId: a.playlistId,
      previousPlaylistName: a.playlistName,
    });
    expect(b.created).toBe(false);
    expect(b.playlistId).toBe(a.playlistId);
    expect(api.state[0].songs).toEqual([3]);
  });
});
