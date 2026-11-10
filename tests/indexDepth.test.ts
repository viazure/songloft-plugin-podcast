import { beforeEach, describe, expect, it } from "vitest";
import { addSubscription, refreshSubscription } from "../src/refresh";
import {
  clampMaxEpisodes,
  DEFAULT_MAX_EPISODES,
  loadSettings,
  MAX_EPISODE_INDEX,
  saveSettings,
  loadSubscriptions,
} from "../src/store";

/**
 * Index depth contract:
 *  - one hard cap (`MAX_EPISODE_INDEX`) governs the settings input, settings
 *    storage, refresh slicing and the storage normaliser;
 *  - the default stays lower than the cap;
 *  - exceeding the cap is clamped, never an error;
 *  - 「已截断」 means "feed had more than we keep", not a failure.
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

/** Build an RSS doc with `n` audio episodes, newest first. */
function rssWith(count: number): string {
  const items = Array.from({ length: count }, (_, i) => {
    const seq = count - i;
    return `    <item>
      <title>Ep ${seq}</title>
      <guid>g-${seq}</guid>
      <pubDate>Mon, 0${(i % 9) + 1} Jan 2023 0${i % 9}:00:00 GMT</pubDate>
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

describe("clampMaxEpisodes", () => {
  it("clamps to the hard cap instead of erroring", () => {
    expect(clampMaxEpisodes(10000)).toBe(MAX_EPISODE_INDEX);
    expect(clampMaxEpisodes(-5)).toBe(1);
    expect(clampMaxEpisodes(0)).toBe(1);
  });

  it("rounds and keeps valid values untouched", () => {
    expect(clampMaxEpisodes(30)).toBe(30);
    expect(clampMaxEpisodes(30.4)).toBe(30);
    expect(clampMaxEpisodes(30.6)).toBe(31);
    expect(clampMaxEpisodes(MAX_EPISODE_INDEX)).toBe(MAX_EPISODE_INDEX);
  });

  it("falls back for non-numeric input", () => {
    expect(clampMaxEpisodes("abc")).toBe(DEFAULT_MAX_EPISODES);
    expect(clampMaxEpisodes(undefined)).toBe(DEFAULT_MAX_EPISODES);
    expect(clampMaxEpisodes(null)).toBe(DEFAULT_MAX_EPISODES);
  });

  it("default stays below the cap", () => {
    expect(DEFAULT_MAX_EPISODES).toBeLessThan(MAX_EPISODE_INDEX);
    expect(DEFAULT_MAX_EPISODES).toBe(50);
    expect(MAX_EPISODE_INDEX).toBe(200);
  });
});

describe("settings persistence clamps to the cap", () => {
  beforeEach(() => installStorage());

  it("stores a clamped value when the caller asks for more than the cap", async () => {
    const saved = await saveSettings({ maxEpisodes: 9999 });
    expect(saved.maxEpisodes).toBe(MAX_EPISODE_INDEX);

    const reloaded = await loadSettings();
    expect(reloaded.maxEpisodes).toBe(MAX_EPISODE_INDEX);
  });

  it("clamps legacy rows on read", async () => {
    installStorage({ settings: { maxEpisodes: 500 }, } as unknown as Bag);
    const s = await loadSettings();
    expect(s.maxEpisodes).toBe(MAX_EPISODE_INDEX);
  });

  it("keeps a sane default when the field is absent", async () => {
    const s = await loadSettings();
    expect(s.maxEpisodes).toBe(DEFAULT_MAX_EPISODES);
  });
});

describe("refresh honours the index depth on every path", () => {
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

    // Lower the depth, refresh again (this is the same code path used by the
    // settings card, the toolbar refresh and the channel dialog refresh).
    await saveSettings({ maxEpisodes: 2 });
    const again = await refreshSubscription(added.subscription.id, { fetchImpl: fetchOf(10) });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.subscription.episodes.length).toBe(2);
    expect(again.truncated).toBe(true);
  });

  it("clamps an explicit deps.maxEpisodes above the cap", async () => {
    installStorage();
    const added = await addSubscription("https://example.com/deep.xml", {
      fetchImpl: fetchOf(10),
      maxEpisodes: 100000,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    // Feed only has 10, so the cap is not the limiter here — assert the value
    // was not rejected outright.
    expect(added.subscription.episodes.length).toBe(10);
    expect(added.truncated).toBe(false);
  });

  it("never keeps more than the hard cap even if the feed is huge", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 99999 });
    const added = await addSubscription("https://example.com/huge.xml", {
      fetchImpl: fetchOf(MAX_EPISODE_INDEX + 40),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes.length).toBe(MAX_EPISODE_INDEX);
    expect(added.truncated).toBe(true);
  });

  it("storage normaliser keeps the same ceiling", async () => {
    // Simulate a legacy row written when the cap was higher.
    const many = Array.from({ length: MAX_EPISODE_INDEX + 25 }, (_, i) => ({
      title: `Ep ${i}`,
      guid: `g-${i}`,
      guidSource: "rss",
      pubDate: null,
      pubDateMs: null,
      durationSec: null,
      coverUrl: null,
      enclosureUrl: `https://cdn.example.com/${i}.mp3`,
      dedupKey: `d-${i}`,
    }));
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
    expect(subs[0].episodes.length).toBe(MAX_EPISODE_INDEX);
  });
});
