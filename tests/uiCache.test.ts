import { describe, expect, it } from "vitest";
import {
  FEED_CACHE_TTL_MS,
  UI_CACHE_KEY,
  UI_CACHE_LIST_CAPS,
  cacheFromStoreData,
  hasValidListCache,
  isScheduleFeedFresh,
  loadUiCache,
  mergeListsForPersist,
  needsInitialFeedRefresh,
  retainNonEmptyLists,
  saveUiCache,
  shouldBackgroundFeedRefresh,
  shouldBootFeedRefresh,
  slimCacheItem,
  slimCacheList,
} from "../ui/lib/uiCache.js";

function memoryStore(initial: Record<string, string> = {}) {
  const bag = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    setItem(key: string, value: string) {
      bag[key] = String(value);
    },
    bag,
  };
}

describe("uiCache feed refresh policy", () => {
  it("needs initial RSS refresh only when there is no readable list cache", () => {
    expect(needsInitialFeedRefresh(null)).toBe(true);
    expect(needsInitialFeedRefresh({})).toBe(true);
    expect(needsInitialFeedRefresh({ recent: [] })).toBe(true);
    expect(needsInitialFeedRefresh({ recent: [{ title: "a" }] })).toBe(false);
    expect(hasValidListCache({ subs: [{ id: "1" }] })).toBe(true);
  });

  it("allows background refresh when cache exists but feed stamp is missing or stale", () => {
    const fresh = { recent: [{ title: "a" }], feedSyncedAt: 1_000_000 };
    expect(shouldBackgroundFeedRefresh(fresh, 1_000_000 + 1000)).toBe(false);
    expect(shouldBackgroundFeedRefresh(fresh, 1_000_000 + FEED_CACHE_TTL_MS + 1)).toBe(true);
    expect(shouldBackgroundFeedRefresh({ recent: [{ title: "a" }] }, 2_000_000)).toBe(true);
    expect(shouldBackgroundFeedRefresh(null)).toBe(false);
  });

  it("treats schedule lastSuccessAt within intervalHours as fresh (reuses 6/12/24h window)", () => {
    const now = Date.UTC(2026, 0, 15);
    expect(isScheduleFeedFresh(now - 1000, 6, now)).toBe(true);
    expect(isScheduleFeedFresh(now - 6 * 3600 * 1000 - 1, 6, now)).toBe(false);
    expect(isScheduleFeedFresh(now - 7 * 3600 * 1000, 12, now)).toBe(true);
    expect(isScheduleFeedFresh(null, 6, now)).toBe(false);
    expect(isScheduleFeedFresh(0, 6, now)).toBe(false);
  });

  it("boot refresh skips when schedule success is fresh even without UI cache", () => {
    const now = Date.UTC(2026, 0, 15);
    const schedule = { lastSuccessAt: now - 60_000, intervalHours: 6 };
    expect(shouldBootFeedRefresh(null, schedule, now)).toBe(false);
    expect(shouldBootFeedRefresh({ recent: [] }, schedule, now)).toBe(false);
    // Stale success → cold cache still needs refresh
    expect(
      shouldBootFeedRefresh(null, { lastSuccessAt: now - 7 * 3600 * 1000, intervalHours: 6 }, now)
    ).toBe(true);
    // No schedule: fall back to local stamp
    const localFresh = { recent: [{ title: "a" }], feedSyncedAt: now - 1000 };
    expect(shouldBootFeedRefresh(localFresh, null, now)).toBe(false);
    const localStale = {
      recent: [{ title: "a" }],
      feedSyncedAt: now - FEED_CACHE_TTL_MS - 1,
    };
    expect(shouldBootFeedRefresh(localStale, null, now)).toBe(true);
  });

  it("round-trips non-sensitive chrome through storage", () => {
    const store = memoryStore();
    const payload = cacheFromStoreData(
      {
        recent: [{ title: "ep" }],
        history: [],
        favorites: [],
        subs: [{ id: "s1" }],
        queueSongs: [{ id: 9 }],
        queueMeta: { playlistId: 1, playlistName: "播客" },
      },
      { activeTab: "history", queueOpen: true, scrolls: { recentList: 40 } }
    );
    saveUiCache({ ...payload, feedSyncedAt: 42 }, store as unknown as Storage, 99);
    const loaded = loadUiCache(store as unknown as Storage);
    expect(loaded?.recent).toEqual([{ title: "ep" }]);
    expect(loaded?.activeTab).toBe("history");
    expect(loaded?.queueOpen).toBe(true);
    expect(loaded?.scrolls).toEqual({ recentList: 40 });
    expect(loaded?.feedSyncedAt).toBe(42);
    expect(store.bag[UI_CACHE_KEY]).toBeTruthy();
    expect(JSON.stringify(loaded)).not.toMatch(/token|secret|password|deviceId/i);
  });

  it("does not persist an empty list over a previously useful one", () => {
    const store = memoryStore();
    saveUiCache({ recent: [{ title: "keep" }], feedSyncedAt: 1 }, store as unknown as Storage, 1);
    saveUiCache({ recent: [], history: [{ title: "h" }] }, store as unknown as Storage, 2);
    const loaded = loadUiCache(store as unknown as Storage);
    expect(loaded?.recent).toEqual([{ title: "keep" }]);
    expect(loaded?.history).toEqual([{ title: "h" }]);
  });

  it("retains in-memory non-empty lists when a soft reload returns blanks", () => {
    const { patch, changed } = retainNonEmptyLists(
      { recent: [], queueSongs: [], queueMeta: null },
      {
        recent: [{ title: "cached" }],
        queueSongs: [{ id: 1 }],
        queueMeta: { playlistId: 2 },
      }
    );
    expect(changed).toBe(true);
    expect(patch.recent).toEqual([{ title: "cached" }]);
    expect(patch.queueSongs).toEqual([{ id: 1 }]);
    expect(patch.queueMeta).toEqual({ playlistId: 2 });
  });

  it("slims showNote bodies and caps list length", () => {
    expect(slimCacheItem({ title: "a", showNote: { html: "<p>x</p>" } })).toEqual({
      title: "a",
      hasShowNote: true,
    });
    const many = Array.from({ length: UI_CACHE_LIST_CAPS.recent + 5 }, (_, i) => ({ title: String(i) }));
    expect(slimCacheList(many, UI_CACHE_LIST_CAPS.recent)).toHaveLength(UI_CACHE_LIST_CAPS.recent);
  });

  it("mergeListsForPersist keeps previous queueMeta when next is null", () => {
    const merged = mergeListsForPersist(
      { queueSongs: [{ id: 1 }], queueMeta: null },
      { queueSongs: [{ id: 1 }], queueMeta: { playlistId: 9 } }
    );
    expect(merged.queueMeta).toEqual({ playlistId: 9 });
  });
});
