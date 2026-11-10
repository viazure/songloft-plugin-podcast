import { beforeEach, describe, expect, it } from "vitest";
import { addSubscription, refreshSubscription } from "../src/refresh";
import { prepareEpisode } from "../src/prepare";
import { loadSubscriptions, upsertProgress, getProgress } from "../src/store";
import { appendToPodcastQueue, type PlaylistsApi } from "../src/podcastQueue";

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

function installMocks() {
  const bag: Bag = {};
  const songsDb: Array<{
    id: number;
    dedup_key: string;
    title: string;
    url: string;
    source_data?: string;
  }> = [];
  let songSeq = 1;
  const playlists: Array<{ id: number; name: string; songs: number[] }> = [];
  let plSeq = 1;

  const playlistsApi: PlaylistsApi = {
    async list() {
      return playlists.map((p) => ({
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
      const id = plSeq++;
      playlists.push({ id, name: input.name, songs: [] });
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
      const p = playlists.find((x) => x.id === playlistId);
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
      const p = playlists.find((x) => x.id === playlistId);
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
      const p = playlists.find((x) => x.id === playlistId);
      if (!p) return;
      p.songs = p.songs.filter((id) => !songIds.includes(id));
    },
    async reorder(playlistId, songIds) {
      const p = playlists.find((x) => x.id === playlistId);
      if (!p) throw new Error("missing");
      p.songs = [...songIds];
    },
  };

  const songsApi = {
    async create(
      inputs: Array<{ url?: string; title: string; dedupKey?: string; sourceData?: string }>
    ) {
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
            source_data: input.sourceData || "",
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
          source_data: hit.source_data || "",
          added_at: "",
          updated_at: "",
        });
      }
      return out;
    },
    async getById(id: number) {
      const hit = songsDb.find((s) => s.id === id);
      if (!hit) return null;
      return {
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
        source_data: hit.source_data || "",
        added_at: "",
        updated_at: "",
      };
    },
  };

  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
    log: { info: () => {}, warn: () => {}, error: () => {} },
    songs: songsApi,
    playlists: playlistsApi,
  };

  return { bag, songsDb, playlists, songsApi, playlistsApi };
}

describe("subscription refresh + prepare + queue", () => {
  beforeEach(() => {
    installMocks();
  });

  it("refresh updates index without creating songs or playlists", async () => {
    const ctx = installMocks();
    const fetchImpl = async () =>
      new Response(SAMPLE, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
    const added = await addSubscription("https://example.com/feed.xml", { fetchImpl });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(2);
    expect(added.subscription.episodes.every((e) => e.songId == null)).toBe(true);
    expect(ctx.songsDb.length).toBe(0);
    expect(ctx.playlists.length).toBe(0);

    const again = await refreshSubscription(added.subscription.id, { fetchImpl });
    expect(again.ok).toBe(true);
    expect(ctx.songsDb.length).toBe(0);
  });

  it("prepare creates songId once; queue append uses fixed playlist", async () => {
    const ctx = installMocks();
    const fetchImpl = async () =>
      new Response(SAMPLE, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
    const added = await addSubscription("https://example.com/feed.xml", { fetchImpl });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const ep = added.subscription.episodes[0];
    const prep = await prepareEpisode(
      { subscriptionId: added.subscription.id, dedupKey: ep.dedupKey },
      ctx.songsApi
    );
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.songId).toBeGreaterThan(0);
    expect(ctx.songsDb.length).toBe(1);

    const prep2 = await prepareEpisode(
      { subscriptionId: added.subscription.id, dedupKey: ep.dedupKey },
      ctx.songsApi
    );
    expect(prep2.ok).toBe(true);
    if (!prep2.ok) return;
    expect(prep2.created).toBe(false);
    expect(ctx.songsDb.length).toBe(1);

    const q = await appendToPodcastQueue(ctx.playlistsApi, [prep.songId]);
    expect(q.playlistName).toBe("播客");
    expect(q.added).toBe(1);
    expect(ctx.playlists[0].songs).toEqual([prep.songId]);
  });

  it("progress upsert is independent of queue", async () => {
    await upsertProgress({
      feedUrl: "https://example.com/feed.xml",
      guid: "g-morning",
      positionSec: 12,
      durationSec: 600,
      lastPlayedAt: Date.now(),
    });
    const p = await getProgress("https://example.com/feed.xml", "g-morning");
    expect(p?.positionSec).toBe(12);
    expect(p?.completed).toBe(false);
    const subs = await loadSubscriptions();
    expect(subs.length).toBe(0);
  });

  it("refresh does not clear progress records", async () => {
    const fetchImpl = async () =>
      new Response(SAMPLE, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
    const added = await addSubscription("https://example.com/feed.xml", { fetchImpl });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    await upsertProgress({
      feedUrl: added.subscription.url,
      guid: "g-morning",
      positionSec: 99,
      completed: false,
    });
    const r = await refreshSubscription(added.subscription.id, { fetchImpl });
    expect(r.ok).toBe(true);
    const p = await getProgress(added.subscription.url, "g-morning");
    expect(p?.positionSec).toBe(99);
  });
});
