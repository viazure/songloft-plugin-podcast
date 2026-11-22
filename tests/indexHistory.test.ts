import { afterEach, describe, expect, it } from "vitest";
import {
  __resetHistoryIndexLocksForTests,
  addSubscription,
  indexSubscriptionHistory,
  refreshSubscription,
} from "../src/refresh";
import {
  loadAllProgress,
  loadSubscriptions,
  MAX_HISTORY_INDEX,
  saveSettings,
  upsertProgress,
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

function rssWith(count: number, title = "Deep Feed"): string {
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
    <title>${title}</title>
    <itunes:author>Desk</itunes:author>
    <itunes:image href="https://cdn.example.com/c.jpg"/>
${items}
  </channel>
</rss>`;
}

function fetchOf(count: number, title?: string) {
  const body = rssWith(count, title);
  return async () =>
    new Response(body, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
}

describe("indexSubscriptionHistory", () => {
  afterEach(() => {
    __resetHistoryIndexLocksForTests();
  });

  it("indexes the full feed for one channel, stays idempotent, and keeps progress", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 2 });
    const added = await addSubscription("https://example.com/deep.xml", { fetchImpl: fetchOf(8) });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes).toHaveLength(2);

    await upsertProgress({
      feedUrl: added.subscription.url,
      guid: "g-8",
      positionSec: 15,
      durationSec: 600,
      completed: false,
      lastSongId: null,
    });

    const first = await indexSubscriptionHistory(added.subscription.id, { fetchImpl: fetchOf(8) });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.indexedCount).toBe(8);
    expect(first.feedAvailableCount).toBe(8);
    expect(first.sourceLimited).toBe(true);
    expect(first.capped).toBe(false);
    expect(first.subscription.historyIndexed).toBe(true);
    expect(first.subscription.historyIndexStatus).toBe("success");
    expect(first.subscription.episodes.map((e) => e.guid)).toContain("g-1");

    const again = await indexSubscriptionHistory(added.subscription.id, { fetchImpl: fetchOf(8) });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.indexedCount).toBe(8);

    const refresh = await refreshSubscription(added.subscription.id, { fetchImpl: fetchOf(8) });
    expect(refresh.ok).toBe(true);
    if (!refresh.ok) return;
    expect(refresh.subscription.episodes).toHaveLength(8);

    const progress = await loadAllProgress();
    expect(progress.some((p) => p.guid === "g-8" && p.positionSec === 15)).toBe(true);
  });

  it("does not start a second job or touch another channel", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 2 });
    const a = await addSubscription("https://example.com/a.xml", {
      fetchImpl: fetchOf(6, "Show A"),
    });
    const b = await addSubscription("https://example.com/b.xml", {
      fetchImpl: fetchOf(6, "Show B"),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    let release!: (value: Response) => void;
    const held = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchImpl = async () => held;
    const pending = indexSubscriptionHistory(a.subscription.id, { fetchImpl });
    const conflict = await indexSubscriptionHistory(a.subscription.id, { fetchImpl: fetchOf(6, "Show A") });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.alreadyRunning).toBe(true);
    expect(conflict.reason).toBe("already_running");

    release(
      new Response(rssWith(6, "Show A"), {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      })
    );
    const done = await pending;
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.indexedCount).toBe(6);

    const list = await loadSubscriptions();
    const other = list.find((s) => s.id === b.subscription.id);
    expect(other?.episodes).toHaveLength(2);
    expect(other?.historyIndexed).toBeFalsy();
  });
});


function rssChrono(count: number, title = "Deep Feed", withDates = true): string {
  const items = Array.from({ length: count }, (_, i) => {
    const seq = count - i;
    const date = withDates
      ? `      <pubDate>${new Date(Date.UTC(2020, 0, 1, 0, 0, seq)).toUTCString()}</pubDate>\n`
      : "";
    return `    <item>
      <title>Ep ${seq}</title>
      <guid>g-${seq}</guid>
${date}      <itunes:duration>600</itunes:duration>
      <enclosure url="https://cdn.example.com/${seq}.mp3" type="audio/mpeg"/>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${title}</title>
    <itunes:author>Desk</itunes:author>
    <itunes:image href="https://cdn.example.com/c.jpg"/>
${items}
  </channel>
</rss>`;
}

function fetchChrono(count: number, title?: string, withDates = true) {
  const body = rssChrono(count, title, withDates);
  return async () =>
    new Response(body, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
}

describe("history index contract", () => {
  afterEach(() => {
    __resetHistoryIndexLocksForTests();
  });

  it("indexes a 230-episode feed through to the first episode and refresh only adds new ones", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 50 });
    const added = await addSubscription("https://example.com/banat.xml", {
      fetchImpl: fetchChrono(230, "半拿铁"),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.subscription.episodes).toHaveLength(50);
    expect(added.subscription.episodes.some((e) => e.guid === "g-1")).toBe(false);

    const first = await indexSubscriptionHistory(added.subscription.id, {
      fetchImpl: fetchChrono(230, "半拿铁"),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.indexedCount).toBe(230);
    expect(first.capped).toBe(false);
    expect(first.sourceLimited).toBe(true);
    expect(first.subscription.episodes.some((e) => e.guid === "g-1")).toBe(true);
    expect(first.subscription.historyEarliestConfirmed).toBe(true);
    expect(first.subscription.episodes[first.subscription.episodes.length - 1].guid).toBe("g-1");

    const refreshed = await refreshSubscription(added.subscription.id, {
      fetchImpl: fetchChrono(231, "半拿铁"),
    });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    const guids = refreshed.subscription.episodes.map((e) => e.guid);
    expect(guids).toContain("g-231");
    expect(guids).toContain("g-1");
    expect(refreshed.subscription.episodes).toHaveLength(231);
  });

  it("when the feed exceeds the history cap, keeps the earliest episode and says so honestly", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 50 });
    const added = await addSubscription("https://example.com/huge.xml", {
      fetchImpl: fetchChrono(50),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const indexed = await indexSubscriptionHistory(added.subscription.id, {
      fetchImpl: fetchChrono(MAX_HISTORY_INDEX + 5),
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;
    const guids = new Set(indexed.subscription.episodes.map((e) => e.guid));
    expect(indexed.capped).toBe(true);
    expect(indexed.sourceLimited).toBe(false);
    expect(indexed.indexedCount).toBe(MAX_HISTORY_INDEX);
    expect(indexed.feedAvailableCount).toBe(MAX_HISTORY_INDEX + 5);
    expect(indexed.earliestConfirmed).toBe(true);
    expect(guids.has("g-1")).toBe(true);
    expect(guids.has(`g-${MAX_HISTORY_INDEX + 5}`)).toBe(true);
    expect(guids.has("g-2")).toBe(false);
  });

  it("pins the last item of a dateless RSS document as the earliest episode", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 2 });
    const added = await addSubscription("https://example.com/nodate.xml", {
      fetchImpl: fetchChrono(8, "No Date", false),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const indexed = await indexSubscriptionHistory(added.subscription.id, {
      fetchImpl: fetchChrono(8, "No Date", false),
    });
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) return;
    expect(indexed.subscription.historyEarliestConfirmed).toBe(true);
    expect(indexed.subscription.episodes.some((e) => e.guid === "g-1")).toBe(true);
    expect(indexed.subscription.historyEarliestDedupKey).toBeTruthy();
  });
});
