import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPLETED_NEAR_END_SEC,
  getProgress,
  isEpisodeCompleted,
  lookupSongMapping,
  rememberSongMapping,
  removeHistoryEntries,
  removeSongMappingsForEpisodes,
  recordHistory,
  loadHistory,
  loadAllProgress,
  upsertProgress,
  withStorageLock,
  episodeStorageKey,
  __resetStorageLocksForTests,
} from "../src/store";
import { identityFromSourceData, resolveEpisodeIdentity } from "../src/episodeIdentity";
import {
  __resetPlayEventStateForTests,
  handlePlayEvent,
} from "../src/playEvents";

type Bag = Record<string, unknown>;

function installStorage() {
  __resetStorageLocksForTests();
  const bag: Bag = {};
  const songs: Record<number, unknown> = {};
  bag.__songs = songs;
  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
    songs: {
      async getById(id: number) {
        return (songs[id] as object) || null;
      },
    },
    log: {
      info() {},
      warn(msg: string) {
        bag.__lastWarn = msg;
      },
    },
  };
  return bag;
}

describe("progress accounting (P0)", () => {
  beforeEach(() => installStorage());

  it("advances position with max merge and never rewinds by default", async () => {
    await upsertProgress({
      feedUrl: "https://ex.com/f.xml",
      guid: "g1",
      positionSec: 100,
      durationSec: 600,
    });
    await upsertProgress({
      feedUrl: "https://ex.com/f.xml",
      guid: "g1",
      positionSec: 40,
    });
    const p = await getProgress("https://ex.com/f.xml", "g1");
    expect(p?.positionSec).toBe(100);
  });

  it("seek mode allows rewind and clears sticky completed away from tail", async () => {
    await upsertProgress({
      feedUrl: "https://ex.com/f.xml",
      guid: "g1",
      positionSec: 590,
      durationSec: 600,
      completed: true,
    });
    await upsertProgress(
      {
        feedUrl: "https://ex.com/f.xml",
        guid: "g1",
        positionSec: 30,
        durationSec: 600,
      },
      { mode: "seek" }
    );
    const p = await getProgress("https://ex.com/f.xml", "g1");
    expect(p?.positionSec).toBe(30);
    expect(p?.completed).toBe(false);
  });

  it("serialises concurrent upserts so the highest position wins", async () => {
    const feedUrl = "https://ex.com/f.xml";
    const guid = "race";
    await Promise.all([
      upsertProgress({ feedUrl, guid, positionSec: 10 }),
      upsertProgress({ feedUrl, guid, positionSec: 55 }),
      upsertProgress({ feedUrl, guid, positionSec: 22 }),
    ]);
    const p = await getProgress(feedUrl, guid);
    expect(p?.positionSec).toBe(55);
  });

  it("withStorageLock runs critical sections one at a time", async () => {
    const order: number[] = [];
    await Promise.all([
      withStorageLock("t", async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 20));
        order.push(2);
      }),
      withStorageLock("t", async () => {
        order.push(3);
        order.push(4);
      }),
    ]);
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("isEpisodeCompleted uses the 3s near-end threshold", () => {
    expect(isEpisodeCompleted(0, 100, true)).toBe(true);
    expect(isEpisodeCompleted(97, 100, false)).toBe(true);
    expect(isEpisodeCompleted(96, 100, false)).toBe(false);
    expect(COMPLETED_NEAR_END_SEC).toBe(3);
  });
});

describe("song mapping + identity (A')", () => {
  beforeEach(() => installStorage());

  it("remembers and looks up songId → feedUrl+guid", async () => {
    await rememberSongMapping(42, "https://Ex.com/feed.xml", "guid-a");
    const hit = await lookupSongMapping(42);
    expect(hit).toMatchObject({
      feedUrl: "https://ex.com/feed.xml",
      guid: "guid-a",
    });
  });

  it("identityFromSourceData requires both feedUrl and guid", () => {
    expect(identityFromSourceData({ feedUrl: "https://a/x.xml", guid: "g" })).toEqual({
      feedUrl: "https://a/x.xml",
      guid: "g",
    });
    expect(identityFromSourceData({ feedUrl: "https://a/x.xml" })).toBeNull();
    expect(identityFromSourceData({ title: "Nope" })).toBeNull();
    expect(identityFromSourceData("{not json")).toBeNull();
  });

  it("refuses to invent keys from title alone", () => {
    expect(identityFromSourceData(JSON.stringify({ title: "Some Episode" }))).toBeNull();
  });
});

describe("history batch delete", () => {
  beforeEach(() => installStorage());

  it("removes selected rows and optional mappings", async () => {
    await recordHistory({
      feedUrl: "https://a/f.xml",
      guid: "1",
      title: "A",
      playedAt: 100,
    });
    await recordHistory({
      feedUrl: "https://a/f.xml",
      guid: "2",
      title: "B",
      playedAt: 200,
    });
    await rememberSongMapping(7, "https://a/f.xml", "1");
    await rememberSongMapping(8, "https://a/f.xml", "2");

    const left = await removeHistoryEntries([{ feedUrl: "https://a/f.xml", guid: "1" }], {
      pruneMappings: true,
    });
    expect(left.map((h) => h.guid)).toEqual(["2"]);
    expect(await lookupSongMapping(7)).toBeNull();
    expect(await lookupSongMapping(8)).not.toBeNull();
  });

  it("removeSongMappingsForEpisodes targets episode keys only", async () => {
    await rememberSongMapping(1, "https://a/f.xml", "x");
    await rememberSongMapping(2, "https://a/f.xml", "y");
    const n = await removeSongMappingsForEpisodes([
      episodeStorageKey("https://a/f.xml", "x"),
    ]);
    expect(n).toBe(1);
    expect(await lookupSongMapping(1)).toBeNull();
    expect(await lookupSongMapping(2)?.guid).toBe("y");
  });
});

describe("play events (P1)", () => {
  let bag: Bag;

  beforeEach(() => {
    bag = installStorage();
    __resetPlayEventStateForTests();
    const songs = bag.__songs as Record<number, unknown>;
    songs[99] = {
      id: 99,
      title: "Ep",
      artist: "Show",
      source_data: JSON.stringify({
        feedUrl: "https://pod.example/feed.xml",
        guid: "ep-99",
        enclosureUrl: "https://cdn/a.mp3",
      }),
    };
  });

  it("resolves identity from source_data", async () => {
    const id = await resolveEpisodeIdentity(99);
    expect(id).toMatchObject({
      feedUrl: "https://pod.example/feed.xml",
      guid: "ep-99",
      source: "source_data",
    });
  });

  it("records history on play when source_data resolves", async () => {
    await handlePlayEvent({
      type: "play",
      song: { id: 99, title: "Ep", artist: "Show" },
      source: "songloft-player",
      timestamp: 1000,
    });
    expect(bag.__lastWarn).toBeUndefined();
    const list = await loadHistory();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ guid: "ep-99", title: "Ep" });
    expect(await lookupSongMapping(99)?.guid).toBe("ep-99");
  });

  it("marks completed on finish", async () => {
    await handlePlayEvent({
      type: "play",
      song: { id: 99, title: "Ep", artist: "Show" },
      source: "songloft-player",
      timestamp: 1000,
    });
    await handlePlayEvent({
      type: "finish",
      song: { id: 99, title: "Ep", artist: "Show" },
      source: "songloft-player",
      timestamp: 5000,
    });
    const p = await getProgress("https://pod.example/feed.xml", "ep-99");
    expect(p?.completed).toBe(true);
  });

  it("dedupes short-time duplicate play events", async () => {
    await handlePlayEvent({
      type: "play",
      song: { id: 99, title: "Ep", artist: "Show" },
      source: "songloft-player",
      timestamp: 1000,
    });
    await handlePlayEvent({
      type: "play",
      song: { id: 99, title: "Ep", artist: "Show" },
      source: "songloft-player",
      timestamp: 1200,
    });
    const list = await loadHistory();
    expect(list).toHaveLength(1);
    expect(list[0].playedAt).toBe(1000);
  });

  it("writes nothing when identity cannot be resolved", async () => {
    await handlePlayEvent({
      type: "play",
      song: { id: 404, title: "Unknown", artist: "X" },
      source: "songloft-player",
      timestamp: 1,
    });
    expect(await loadHistory()).toEqual([]);
    expect(await loadAllProgress()).toEqual([]);
  });
});
