import { beforeEach, describe, expect, it } from "vitest";
import {
  allocateUniqueName,
  appendToPodcastQueue,
  ensurePodcastPlaylist,
  listPodcastQueue,
  clearPodcastQueue,
  moveInPodcastQueue,
  removeFromPodcastQueue,
  type PlaylistsApi,
} from "../src/podcastQueue";

type Bag = Record<string, unknown>;

function installSongloftMock() {
  const bag: Bag = {};
  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
  };
  return bag;
}

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
        title: `s${id}`,
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
      let skipped = 0;
      for (const id of songIds) {
        if (!p.songs.includes(id)) {
          p.songs.push(id);
          added++;
        } else skipped++;
      }
      return { added, skipped };
    },
    async removeSongs(playlistId, songIds) {
      const p = state.find((x) => x.id === playlistId);
      if (!p) return;
      p.songs = p.songs.filter((id) => !songIds.includes(id));
    },
    async reorder(playlistId, songIds) {
      const p = state.find((x) => x.id === playlistId);
      if (!p) throw new Error("missing");
      if (songIds.length !== p.songs.length) throw new Error("length mismatch");
      p.songs = [...songIds];
    },
  };
  return api;
}

describe("podcastQueue", () => {
  beforeEach(() => {
    installSongloftMock();
  });

  it("allocateUniqueName avoids collisions", () => {
    expect(allocateUniqueName("播客", [])).toBe("播客");
    expect(allocateUniqueName("播客", ["播客"])).toBe("播客 (插件)");
    expect(allocateUniqueName("播客", ["播客", "播客 (插件)"])).toBe("播客 (插件2)");
  });

  it("ensure creates fixed playlist once and reuses id", async () => {
    const api = mockApi([]);
    const a = await ensurePodcastPlaylist(api);
    expect(a.created).toBe(true);
    expect(a.playlistName).toBe("播客");
    const b = await ensurePodcastPlaylist(api);
    expect(b.created).toBe(false);
    expect(b.playlistId).toBe(a.playlistId);
    expect(api.state.length).toBe(1);
  });

  it("append dedupes and remove works", async () => {
    const api = mockApi([]);
    const r1 = await appendToPodcastQueue(api, [1, 2, 2]);
    expect(r1.added).toBe(2);
    const r2 = await appendToPodcastQueue(api, [2, 3]);
    expect(r2.added).toBe(1);
    expect(r2.skipped).toBe(1);
    const listed = await listPodcastQueue(api);
    expect(listed.songs.map((s) => s.id)).toEqual([1, 2, 3]);
    await removeFromPodcastQueue(api, [2]);
    const listed2 = await listPodcastQueue(api);
    expect(listed2.songs.map((s) => s.id)).toEqual([1, 3]);
  });

  it("moveInPodcastQueue reorders via host reorder", async () => {
    const api = mockApi([]);
    await appendToPodcastQueue(api, [1, 2, 3]);
    const up = await moveInPodcastQueue(api, 3, -1);
    expect(up.moved).toBe(true);
    expect(up.songIds).toEqual([1, 3, 2]);
    const listed = await listPodcastQueue(api);
    expect(listed.songs.map((s) => s.id)).toEqual([1, 3, 2]);
  });

  it("clearPodcastQueue removes all songs in a single host call", async () => {
    const api = mockApi([]);
    const calls: number[][] = [];
    const original = api.removeSongs.bind(api);
    api.removeSongs = async (playlistId, songIds) => {
      calls.push(songIds.slice());
      return original(playlistId, songIds);
    };

    await appendToPodcastQueue(api, [1, 2, 3]);
    const cleared = await clearPodcastQueue(api);

    expect(cleared.removed).toBe(3);
    expect(calls).toEqual([[1, 2, 3]]);
    const listed = await listPodcastQueue(api);
    expect(listed.songs).toEqual([]);
  });
});
