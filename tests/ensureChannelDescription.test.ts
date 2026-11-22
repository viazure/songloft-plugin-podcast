import { afterEach, describe, expect, it } from "vitest";
import { ensureChannelDescription, __resetRefreshJobsForTests } from "../src/refresh";
import {
  defaultHistoryIndexFields,
  getSubscription,
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

function stub(partial: Partial<Subscription> & Pick<Subscription, "id" | "url" | "title">): Subscription {
  const now = Date.now();
  return {
    author: null,
    description: null,
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
    ...partial,
  };
}

function feedXml(desc: string | null) {
  const descTag = desc == null ? "" : `<description><![CDATA[${desc}]]></description>`;
  return `<?xml version="1.0"?><rss version="2.0"><channel>
    <title>Show</title><itunes:author xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">Host</itunes:author>
    ${descTag}
    <item><title>Ep 1</title><guid>g1</guid>
    <enclosure url="https://cdn.example.com/1.mp3" type="audio/mpeg"/></item>
  </channel></rss>`;
}

afterEach(() => {
  __resetRefreshJobsForTests();
  delete (globalThis as unknown as { songloft?: unknown }).songloft;
});

describe("ensureChannelDescription", () => {
  it("backfills missing description from the live feed without touching lastSuccessAt", async () => {
    installStorage();
    const before = stub({
      id: "abc",
      url: "https://example.com/show.xml",
      title: "Old Title",
      lastSuccessAt: 12345,
    });
    await saveSubscriptions([before]);
    const fetchImpl = async () =>
      new Response(feedXml("冷门好歌与访谈"), {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    const next = await ensureChannelDescription("abc", { fetchImpl: fetchImpl as typeof fetch });
    expect(next).not.toBeNull();
    expect(next!.description).toBe("冷门好歌与访谈");
    expect(next!.author).toBe("Host");
    expect(next!.lastSuccessAt).toBe(12345);
    const stored = await getSubscription("abc");
    expect(stored?.description).toBe("冷门好歌与访谈");
  });

  it("is a no-op when description is already present", async () => {
    installStorage();
    await saveSubscriptions([
      stub({
        id: "abc",
        url: "https://example.com/show.xml",
        title: "Show",
        description: "已有简介",
      }),
    ]);
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response(feedXml("新简介"), { status: 200 });
    };
    const next = await ensureChannelDescription("abc", { fetchImpl: fetchImpl as typeof fetch });
    expect(calls).toBe(0);
    expect(next?.description).toBe("已有简介");
  });
});
