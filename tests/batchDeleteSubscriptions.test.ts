import { describe, expect, it } from "vitest";
import { deleteSubscriptions } from "../src/refresh";
import {
  defaultHistoryIndexFields,
  loadSubscriptions,
  saveSubscriptions,
  type Subscription,
} from "../src/store";

type Bag = Record<string, unknown>;

function installStorage(initial: Bag = {}) {
  const bag: Bag = { ...initial };
  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
    log: { info() {}, warn() {}, error() {} },
  };
  return bag;
}

function stub(id: string, url: string, title: string): Subscription {
  const now = Date.now();
  return {
    id,
    url,
    title,
    author: null,
    coverUrl: null,
    createdAt: now,
    updatedAt: now,
    lastSuccessAt: null,
    lastError: null,
    lastSkippedNonAudio: 0,
    episodeCount: 0,
    truncated: false,
    ...defaultHistoryIndexFields(),
    episodes: [],
  };
}

describe("deleteSubscriptions batch", () => {
  it("removes only selected ids and keeps the rest", async () => {
    installStorage();
    await saveSubscriptions([
      stub("a", "https://a.example/feed.xml", "A"),
      stub("b", "https://b.example/feed.xml", "B"),
      stub("c", "https://c.example/feed.xml", "C"),
    ]);
    const r = await deleteSubscriptions(["a", "c", "missing"]);
    expect(r.ok).toBe(true);
    expect(r.removedCount).toBe(2);
    expect((r.removed || []).map((x) => x.id).sort()).toEqual(["a", "c"]);
    const left = await loadSubscriptions();
    expect(left.map((x) => x.id)).toEqual(["b"]);
    expect(r.tip).toMatch(/播放列表与收听进度未自动清除/);
  });

  it("fails when none match", async () => {
    installStorage();
    await saveSubscriptions([stub("a", "https://a.example/feed.xml", "A")]);
    const r = await deleteSubscriptions(["nope"]);
    expect(r.ok).toBe(false);
    expect(await loadSubscriptions()).toHaveLength(1);
  });

  it("rejects empty ids", async () => {
    installStorage();
    await saveSubscriptions([stub("a", "https://a.example/feed.xml", "A")]);
    const r = await deleteSubscriptions([]);
    expect(r.ok).toBe(false);
    expect(await loadSubscriptions()).toHaveLength(1);
  });
});