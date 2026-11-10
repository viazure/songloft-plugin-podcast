import { beforeEach, describe, expect, it } from "vitest";
import {
  clearHistory,
  loadHistory,
  MAX_HISTORY,
  recordHistory,
  removeHistoryEntry,
  touchHistoryProgress,
} from "../src/store";

type Bag = Record<string, unknown>;

function installStorage() {
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

function entry(n: number, at = 1000 + n) {
  return {
    feedUrl: `https://example.com/feed${n}.xml`,
    guid: `guid-${n}`,
    title: `Ep ${n}`,
    showTitle: `Show ${n}`,
    playedAt: at,
    positionSec: 0,
  };
}

describe("play history", () => {
  beforeEach(() => installStorage());

  it("records an entry and reads it back", async () => {
    const list = await recordHistory(entry(1));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Ep 1", showTitle: "Show 1" });

    const loaded = await loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].guid).toBe("guid-1");
  });

  it("keeps the newest first", async () => {
    await recordHistory(entry(1, 100));
    await recordHistory(entry(2, 300));
    await recordHistory(entry(3, 200));

    const loaded = await loadHistory();
    expect(loaded.map((h) => h.guid)).toEqual(["guid-2", "guid-3", "guid-1"]);
  });

  it("replaying an episode moves it to the top instead of duplicating", async () => {
    await recordHistory(entry(1, 100));
    await recordHistory(entry(2, 200));
    await recordHistory({ ...entry(1, 300) });

    const loaded = await loadHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].guid).toBe("guid-1");
    expect(loaded[0].playedAt).toBe(300);
  });

  it("keeps metadata when a later record omits it", async () => {
    await recordHistory({ ...entry(1), coverUrl: "https://cdn/x.jpg", durationSec: 600 });
    await recordHistory({ feedUrl: entry(1).feedUrl, guid: "guid-1", playedAt: 2000 });

    const [first] = await loadHistory();
    expect(first.coverUrl).toBe("https://cdn/x.jpg");
    expect(first.durationSec).toBe(600);
  });

  it("caps the list at MAX_HISTORY", async () => {
    for (let i = 0; i < MAX_HISTORY + 25; i++) {
      await recordHistory(entry(i, 1000 + i));
    }
    const loaded = await loadHistory();
    expect(loaded).toHaveLength(MAX_HISTORY);
    // Newest kept.
    expect(loaded[0].guid).toBe(`guid-${MAX_HISTORY + 24}`);
  });

  it("ignores entries without identity", async () => {
    expect(await recordHistory({ feedUrl: "", guid: "", title: "x" })).toHaveLength(0);
    expect(await recordHistory({ feedUrl: "https://a", guid: "", title: "x" })).toHaveLength(0);
  });

  it("updates progress fields without reordering", async () => {
    await recordHistory(entry(1, 100));
    await recordHistory(entry(2, 200));

    await touchHistoryProgress(entry(1).feedUrl, "guid-1", {
      positionSec: 42,
      completed: false,
    });

    const loaded = await loadHistory();
    expect(loaded.map((h) => h.guid)).toEqual(["guid-2", "guid-1"]);
    const target = loaded.find((h) => h.guid === "guid-1");
    expect(target?.positionSec).toBe(42);
    expect(target?.completed).toBe(false);
  });

  it("touch on an unknown episode does not create a row", async () => {
    await touchHistoryProgress("https://nope.example/f.xml", "missing", { positionSec: 10 });
    expect(await loadHistory()).toEqual([]);
  });

  it("removes one entry", async () => {
    await recordHistory(entry(1, 100));
    await recordHistory(entry(2, 200));

    const left = await removeHistoryEntry(entry(1).feedUrl, "guid-1");
    expect(left.map((h) => h.guid)).toEqual(["guid-2"]);
    expect(await loadHistory()).toHaveLength(1);
  });

  it("clears everything", async () => {
    await recordHistory(entry(1, 100));
    await recordHistory(entry(2, 200));
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });

  it("drops malformed stored rows instead of throwing", async () => {
    const bag = installStorage();
    bag.play_history = [
      { feedUrl: "", guid: "x" },
      { feedUrl: "https://ok.example/f.xml", guid: "g", title: "Kept", playedAt: 5 },
      "not an object",
    ];
    const loaded = await loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("Kept");
  });

  it("normalises feed urls so the same feed matches", async () => {
    await recordHistory({ ...entry(1), feedUrl: "https://Example.com/feed.xml" });
    await recordHistory({ ...entry(1), feedUrl: "https://example.com/feed.xml", playedAt: 2000 });
    const loaded = await loadHistory();
    expect(loaded).toHaveLength(1);
  });
});
