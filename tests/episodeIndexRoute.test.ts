import { afterEach, describe, expect, it } from "vitest";
import { addSubscription, indexSubscriptionHistory, __resetHistoryIndexLocksForTests } from "../src/refresh";
import { handleHTTP } from "../src/router";
import { saveSettings } from "../src/store";
import type { HTTPRequest } from "@songloft/plugin-sdk";

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
      <enclosure url="https://cdn.example.com/${seq}.mp3" type="audio/mpeg"/>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Deep Feed</title>${items}</channel></rss>`;
}

function fetchOf(count: number) {
  const body = rssWith(count);
  return async () =>
    new Response(body, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
}

function req(method: string, path: string, query = "", body: Record<string, unknown> = {}): HTTPRequest {
  return {
    method,
    path,
    headers: {},
    body: body as unknown as HTTPRequest["body"],
    query,
  };
}

function parse(res: { body?: string | Uint8Array; statusCode?: number }) {
  const raw = res.body;
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  return { status: res.statusCode, json: JSON.parse(text || "{}") };
}

describe("episode index routes", () => {
  afterEach(() => {
    __resetHistoryIndexLocksForTests();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("pages episodes and reports channel context, then indexes history for that id only", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 3 });
    const added = await addSubscription("https://example.com/deep.xml", { fetchImpl: fetchOf(9) });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const id = added.subscription.id;

    const page = parse(
      await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "offset=0&limit=2"))
    );
    expect(page.status).toBe(200);
    expect(page.json.ok).toBe(true);
    expect(page.json.title).toBe("Deep Feed");
    expect(page.json.total).toBe(3);
    expect(page.json.episodes).toHaveLength(2);
    expect(page.json.hasMore).toBe(true);
    expect(page.json.nextOffset).toBe(2);
    expect(page.json.historyIndexed).toBe(false);

    const second = parse(
      await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "offset=2&limit=2"))
    );
    expect(second.json.episodes).toHaveLength(1);
    expect(second.json.hasMore).toBe(false);
    expect(second.json.title).toBe("Deep Feed");

    const indexed = await indexSubscriptionHistory(id, { fetchImpl: fetchOf(9) });
    expect(indexed.ok).toBe(true);

    const all = parse(await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "")));
    expect(all.json.total).toBe(9);
    expect(all.json.episodes).toHaveLength(9);
    expect(all.json.historyIndexed).toBe(true);
    expect(all.json.historyIndexStatus).toBe("success");
    expect(all.json.feedEpisodeCount).toBe(9);

    const previousFetch = globalThis.fetch;
    globalThis.fetch = fetchOf(9) as typeof fetch;
    try {
      const viaRoute = parse(await handleHTTP(req("POST", `/api/subscriptions/${id}/index-history`)));
      expect(viaRoute.status).toBe(200);
      expect(viaRoute.json.ok).toBe(true);
      expect(viaRoute.json.indexedCount).toBe(9);
      expect(viaRoute.json.sourceLimited).toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("returns 404 for an unknown channel and does not invent episodes", async () => {
    installStorage();
    const missing = parse(await handleHTTP(req("POST", "/api/subscriptions/nope/index-history")));
    expect(missing.status).toBe(404);
    expect(missing.json.ok).toBe(false);
  });
});


describe("episode list can pass the auto window", () => {
  afterEach(() => {
    __resetHistoryIndexLocksForTests();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("returns every indexed episode without a 200 clamp and pages with hasMore", async () => {
    installStorage();
    await saveSettings({ maxEpisodes: 50 });
    const added = await addSubscription("https://example.com/deep.xml", { fetchImpl: fetchOf(230) });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const id = added.subscription.id;
    const indexed = await indexSubscriptionHistory(id, { fetchImpl: fetchOf(230) });
    expect(indexed.ok).toBe(true);

    const all = parse(await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "")));
    expect(all.json.total).toBe(230);
    expect(all.json.episodes).toHaveLength(230);
    expect(all.json.hasMore).toBe(false);
    expect(all.json.episodes[229].guid).toBe("g-1");
    expect(all.json.historyIndexLimit).toBe(2000);
    expect(all.json.capped).toBe(false);

    const page = parse(
      await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "offset=0&limit=20"))
    );
    expect(page.json.episodes).toHaveLength(20);
    expect(page.json.hasMore).toBe(true);
    const last = parse(
      await handleHTTP(req("GET", `/api/subscriptions/${id}/episodes`, "offset=220&limit=20"))
    );
    expect(last.json.episodes).toHaveLength(10);
    expect(last.json.hasMore).toBe(false);
    expect(last.json.episodes[9].guid).toBe("g-1");
  });

  it("settings still advertise the auto window, not the history cap", async () => {
    installStorage();
    const settings = parse(await handleHTTP(req("GET", "/api/settings", "")));
    expect(settings.json.ok).toBe(true);
    expect(settings.json.maxEpisodesLimit).toBe(200);
    expect(settings.json.maxEpisodesLimit).not.toBe(2000);
  });
});
