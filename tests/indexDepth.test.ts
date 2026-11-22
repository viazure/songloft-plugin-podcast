import { beforeEach, describe, expect, it } from "vitest";
import { addSubscription, refreshSubscription } from "../src/refresh";
import {
  clampMaxEpisodes,
  DEFAULT_MAX_EPISODES,
  loadSettings,
  MAX_AUTO_WINDOW,
  MAX_HISTORY_INDEX,
  saveSettings,
  loadSubscriptions,
} from "../src/store";

/**
 * Split caps:
 *  - settings / auto refresh use MAX_AUTO_WINDOW (200);
 *  - explicit history index uses MAX_HISTORY_INDEX (2000);
 *  - the default stays lower than the auto window;
 *  - exceeding the auto window is clamped, never an error.
 */

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

function rssWith(count: number): string {
  const items = Array.from({ length: count }, (_, i) => {
    const seq = count - i;
    const d = new Date(Date.UTC(2020, 0, 1, 0, 0, seq));
    return `    <item>
      <title>Ep ${seq}</title>
      <guid>g-${seq}</guid>
      <pubDate>${d.toUTCString()}</pubDate>
      <itunes:duration>600</itunes:duration>
      <enclosure url="https://cdn.example.com/${seq}.mp3" type="audio/mpeg"/>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Deep Feed</title>
    <itunes:author>Desk</itunes:author>
    <itunes:image href="https://cdn.example.com/c.jpg"/>
${items}
  </channel>
</rss>`;
}

function fetchOf(count: number) {
  const body = rssWith(count);
  return async () =>
    new Response(body, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
}

function episodeRow(i: number) {
  return {
    title: `Ep ${i}`,
    guid: `g-${i}`,
    guidSource: "rss",
    pubDate: null,
    pubDateMs: i * 1000,
    durationSec: null,
    coverUrl: null,
    enclosureUrl: `https://cdn.example.com/${i}.mp3`,
    dedupKey: `d-${i}`,
  };
}

describe("clampMaxEpisodes", () => {
  it("clamps to the auto window instead of erroring or following the history cap", () => {
    expect(clampMaxEpisodes(10000)).toBe(MAX_AUTO_WINDOW);
    expect(clampMaxEpisodes(MAX_HISTORY_INDEX)).toBe(MAX_AUTO_WINDOW);
    expect(clampMaxEpisodes(-5)).toBe(1);
    expect(clampMaxEpisodes(0)).toBe(1);
  });

  it("rounds and keeps valid values untouched", () => {
    expect(clampMaxEpisodes(30)).toBe(30);
    expect(clampMaxEpisodes(30.4)).toBe(30);
    expect(clampMaxEpisodes(30.6)).toBe(31);
    expect(clampMaxEpisodes(MAX_AUTO_WINDOW)).toBe(MAX_AUTO_WINDOW);
  });

  it("falls back for non-numeric input", () => {
    expect(clampMaxEpisodes("abc")).toBe(DEFAULT_MAX_EPISODES);
    expect(clampMaxEpisodes(undefined)).toBe(DEFAULT_MAX_EPISODES);
    expect(clampMaxEpisodes(null)).toBe(DEFAULT_MAX_EPISODES);
  });

  it("default stays below the auto window, and the history cap stays separate", () => {
    expect(DEFAULT_MAX_EPISODES).toBeLessThan(MAX_AUTO_WINDOW);
    expect(DEFAULT_MAX_EPISODES).toBe(50);
    expect(MAX_AUTO_WINDOW).toBe(200);
    expect(MAX_HISTORY_INDEX).toBe(2000);
    expect(MAX_AUTO_WINDOW).toBeLessThan(MAX_HISTORY_INDEX);
  });
});

describe("settings persistence clamps to the auto window", () => {
  beforeEach(() => installStorage());

  it("stores a clamped value when the caller asks for more than the auto window", async () => {
    const saved = await saveSettings({ maxEpisodes: 9999 });
    expect(saved.maxEpisodes).toBe(MAX_AUTO_WINDOW);

    const reloaded = await loadSettings();
    expect(reloaded.maxEpisodes).toBe(MAX_AUTO_WINDOW);
  });

  it("clamps legacy rows on read, including a 2000-era value", async () => {
    installStorage({ settings: { maxEpisodes: 2000 } } as unknown as Bag);
    const s = await loadSettings();
    expect(s.maxEpisodes).toBe(MAX_AUTO_WINDOW);
  });

  it("keeps a sane default when the field is absent", async () => {
    const s = await loadSettings();
    expect(s.maxEpisodes).toBe(DEFAULT_MAX_EPISODES);
  });
});

describe("refresh honours the auto window on shallow channels", () => {
  it("truncates to N and flags it when the feed is longer", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 3 });

    const added = await addSubscription("https://example.com/deep.xml", {
      fetchImpl: fetchOf(10),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(3);
    expect(added.subscription.episodeCount).toBe(3);
    expect(added.truncated).toBe(true);
    expect(added.subscription.historyIndexed).toBeFalsy();

    const subs = await loadSubscriptions();
    expect(subs[0].episodes.length).toBe(3);
    expect(subs[0].truncated).toBe(true);
  });

  it("does not flag a feed that fits", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 10 });

    const added = await addSubscription("https://example.com/short.xml", {
      fetchImpl: fetchOf(4),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(4);
    expect(added.truncated).toBe(false);
  });

  it("applies the same depth to a manual re-refresh after the setting changes", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 8 });
    const added = await addSubscription("https://example.com/deep.xml", {
      fetchImpl: fetchOf(10),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(8);

    await saveSettings({ maxEpisodes: 2 });
    const again = await refreshSubscription(added.subscription.id, { fetchImpl: fetchOf(10) });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.subscription.episodes.length).toBe(2);
    expect(again.truncated).toBe(true);
  });

  it("clamps an explicit deps.maxEpisodes above the auto window", async () => {
    installStorage();
    const added = await addSubscription("https://example.com/deep.xml", {
      fetchImpl: fetchOf(10),
      maxEpisodes: 100000,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(10);
    expect(added.truncated).toBe(false);
  });

  it("never keeps more than the auto window on a shallow add, even if the feed is huge", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 99999 });
    const added = await addSubscription("https://example.com/huge.xml", {
      fetchImpl: fetchOf(MAX_AUTO_WINDOW + 40),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(MAX_AUTO_WINDOW);
    expect(added.truncated).toBe(true);
    expect(added.subscription.episodes.some((e) => e.guid === "g-1")).toBe(false);
  });
});

describe("storage normaliser uses the split caps", () => {
  it("trims an unmarked shallow channel to the auto window", async () => {
    const many = Array.from({ length: MAX_AUTO_WINDOW + 25 }, (_, i) => episodeRow(MAX_AUTO_WINDOW + 25 - i));
    installStorage({
      subscriptions: [
        {
          id: "legacy",
          url: "https://example.com/legacy.xml",
          title: "Legacy",
          author: null,
          coverUrl: null,
          createdAt: 1,
          updatedAt: 1,
          lastSuccessAt: null,
          lastError: null,
          lastSkippedNonAudio: 0,
          episodeCount: many.length,
          truncated: true,
          episodes: many,
        },
      ],
    });

    const subs = await loadSubscriptions();
    expect(subs[0].episodes.length).toBe(MAX_AUTO_WINDOW);
    expect(subs[0].historyIndexed).toBe(false);
  });

  it("does not trim a marked deep index back to the auto window", async () => {
    const many = Array.from({ length: 230 }, (_, i) => episodeRow(230 - i));
    installStorage({
      subscriptions: [
        {
          id: "deep",
          url: "https://example.com/deep.xml",
          title: "Deep",
          author: null,
          coverUrl: null,
          createdAt: 1,
          updatedAt: 1,
          lastSuccessAt: null,
          lastError: null,
          lastSkippedNonAudio: 0,
          episodeCount: many.length,
          truncated: false,
          historyIndexed: true,
          historyIndexStatus: "success",
          historyEarliestDedupKey: "d-1",
          historyEarliestConfirmed: true,
          episodes: many,
        },
      ],
    });

    const subs = await loadSubscriptions();
    expect(subs[0].episodes.length).toBe(230);
    expect(subs[0].episodes.some((e) => e.guid === "g-1")).toBe(true);
  });

  it("on a marked deep index over the history cap, keeps the pin and the newest 1999", async () => {
    const many = Array.from({ length: MAX_HISTORY_INDEX + 25 }, (_, i) =>
      episodeRow(MAX_HISTORY_INDEX + 25 - i)
    );
    installStorage({
      subscriptions: [
        {
          id: "huge",
          url: "https://example.com/huge.xml",
          title: "Huge",
          author: null,
          coverUrl: null,
          createdAt: 1,
          updatedAt: 1,
          lastSuccessAt: null,
          lastError: null,
          lastSkippedNonAudio: 0,
          episodeCount: many.length,
          truncated: true,
          historyIndexed: true,
          historyIndexStatus: "success",
          historyEarliestDedupKey: "d-1",
          historyEarliestConfirmed: true,
          episodes: many,
        },
      ],
    });

    const subs = await loadSubscriptions();
    const guids = new Set(subs[0].episodes.map((e) => e.guid));
    expect(subs[0].episodes.length).toBe(MAX_HISTORY_INDEX);
    expect(guids.has("g-1")).toBe(true);
    expect(guids.has(`g-${MAX_HISTORY_INDEX + 25}`)).toBe(true);
    expect(guids.has("g-2")).toBe(false);
    expect(subs[0].historyIndexCapped).toBe(true);
    expect(subs[0].historyEarliestConfirmed).toBe(true);
  });
});