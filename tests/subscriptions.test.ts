import { beforeEach, describe, expect, it, vi } from "vitest";
import { episodeDedupKey } from "../src/dedup";

const SAMPLE = `<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>News Daily</title>
    <itunes:author>Desk</itunes:author>
    <itunes:image href="https://cdn.example.com/c.jpg"/>
    <item>
      <title>Morning</title>
      <guid>g-morning</guid>
      <pubDate>Mon, 02 Jan 2023 08:00:00 GMT</pubDate>
      <itunes:duration>600</itunes:duration>
      <enclosure url="https://cdn.example.com/morning.mp3" type="audio/mpeg"/>
    </item>
    <item>
      <title>Night</title>
      <guid>g-night</guid>
      <pubDate>Sun, 01 Jan 2023 20:00:00 GMT</pubDate>
      <enclosure url="https://cdn.example.com/night.mp3" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`;

type Bag = Record<string, unknown>;

function installSongloftMock() {
  const bag: Bag = {};
  const songsDb: Array<{
    id: number;
    dedup_key: string;
    title: string;
    url: string;
  }> = [];
  let songSeq = 1;
  const playlists: Array<{ id: number; name: string; songs: number[] }> = [];
  let plSeq = 1;

  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
      async remove(key: string) {
        delete bag[key];
      },
    },
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    songs: {
      async create(inputs: Array<{ url?: string; title: string; dedupKey?: string }>) {
        const out = [];
        for (const input of inputs) {
          const key = input.dedupKey || "";
          let hit = songsDb.find((s) => s.dedup_key === key);
          if (!hit) {
            hit = {
              id: songSeq++,
              dedup_key: key,
              title: input.title,
              url: input.url || "",
            };
            songsDb.push(hit);
          }
          out.push({
            id: hit.id,
            type: "remote",
            title: hit.title,
            artist: "",
            album: "",
            year: 0,
            genre: "",
            duration: 0,
            file_path: "",
            url: hit.url,
            cover_url: "",
            file_size: 0,
            format: "",
            bit_rate: 0,
            sample_rate: 0,
            is_live: false,
            is_video: false,
            dedup_key: hit.dedup_key,
            added_at: "",
            updated_at: "",
          });
        }
        return out;
      },
    },
    playlists: {
      async list() {
        return playlists.map((p) => ({
          id: p.id,
          type: "normal",
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
      async create(input: { name: string }) {
        const id = plSeq++;
        playlists.push({ id, name: input.name, songs: [] });
        return {
          id,
          type: "normal",
          name: input.name,
          description: "",
          cover_url: "",
          labels: [],
          song_count: 0,
          created_at: "",
          updated_at: "",
          sort_by: "position",
          sort_order: "asc",
        };
      },
      async getSongs(playlistId: number) {
        const p = playlists.find((x) => x.id === playlistId);
        return (p?.songs || []).map((id) => ({
          id,
          type: "remote",
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
      async addSongs(playlistId: number, songIds: number[]) {
        const p = playlists.find((x) => x.id === playlistId);
        if (!p) throw new Error("missing playlist");
        let added = 0;
        for (const id of songIds) {
          if (!p.songs.includes(id)) {
            p.songs.push(id);
            added++;
          }
        }
        return { added, skipped: songIds.length - added };
      },
      async removeSongs(playlistId: number, songIds: number[]) {
        const p = playlists.find((x) => x.id === playlistId);
        if (!p) throw new Error("missing playlist");
        const drop = new Set(songIds);
        p.songs = p.songs.filter((id) => !drop.has(id));
      },
      async delete(id: number) {
        const i = playlists.findIndex((p) => p.id === id);
        if (i >= 0) playlists.splice(i, 1);
      },
    },
  };

  return { bag, songsDb, playlists };
}

describe("subscription CRUD + refresh replace", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("add → refresh upserts remotes with dedup_key; second refresh replaces playlist", async () => {
    const mock = installSongloftMock();
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        text: async () => SAMPLE,
      }) as Response;

    const { addSubscription, refreshSubscription, deleteSubscription } = await import("../src/refresh");
    const store = await import("../src/store");

    const deps = {
      songsApi: (globalThis as any).songloft.songs,
      playlistsApi: (globalThis as any).songloft.playlists,
      fetchImpl: fetchImpl as typeof fetch,
      now: () => 1_700_000_000_000,
    };

    const added = await addSubscription("https://example.com/news.xml", deps);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.title).toBe("News Daily");
    expect(added.createdSongs).toBe(2);
    expect(mock.playlists).toHaveLength(1);
    expect(mock.playlists[0].name).toBe("News Daily");
    expect(mock.playlists[0].songs).toHaveLength(2);

    const feedId = added.subscription.id;
    expect(mock.songsDb[0].dedup_key).toBe(episodeDedupKey(feedId, "g-morning", "https://cdn.example.com/morning.mp3"));

    // Second refresh should not duplicate songs (same dedup), and replace playlist set.
    const again = await refreshSubscription(feedId, deps);
    expect(again.ok).toBe(true);
    expect(mock.songsDb).toHaveLength(2);
    expect(mock.playlists[0].songs).toHaveLength(2);

    const del = await deleteSubscription(feedId, { clearPlaylist: false });
    expect(del.ok).toBe(true);
    expect(del.tip).toMatch(/保留/);
    const left = await store.loadSubscriptions();
    expect(left).toHaveLength(0);
    // playlist + songs remain
    expect(mock.playlists).toHaveLength(1);
    expect(mock.songsDb).toHaveLength(2);
  });

  it("rejects bad feed on add", async () => {
    installSongloftMock();
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        text: async () => "<html>login</html>",
      }) as Response;
    const { addSubscription } = await import("../src/refresh");
    const r = await addSubscription("https://example.com/x.xml", {
      songsApi: (globalThis as any).songloft.songs,
      playlistsApi: (globalThis as any).songloft.playlists,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/HTML|RSS/i);
  });
});
