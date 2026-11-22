import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { feedIdFromUrl } from "../src/hash";
import {
  __resetHistoryIndexLocksForTests,
  clampRefreshConcurrency,
  DEFAULT_REFRESH_CONCURRENCY,
  MAX_REFRESH_CONCURRENCY,
  isRefreshJobBusy,
  refreshAll,
} from "../src/refresh";
import { defaultHistoryIndexFields, upsertSubscription } from "../src/store";
import { RSS_FETCH_TIMEOUT_REASON } from "../src/rss";

const SAMPLE = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Ok</title>
  <item><title>E</title><guid>g1</guid>
  <enclosure url="https://cdn.example.com/e.mp3" type="audio/mpeg"/></item>
</channel></rss>`;

function installStorage() {
  const bag: Record<string, unknown> = {};
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
}

async function seed(url: string, title: string) {
  const id = feedIdFromUrl(url);
  await upsertSubscription({
    id,
    url,
    title,
    author: null,
    coverUrl: null,
    createdAt: 1,
    updatedAt: 1,
    lastSuccessAt: null,
    lastError: null,
    lastSkippedNonAudio: 0,
    episodeCount: 0,
    truncated: false,
    ...defaultHistoryIndexFields(),
    episodes: [],
  });
  return id;
}

describe("clampRefreshConcurrency", () => {
  it("defaults to 2 and caps at MAX", () => {
    expect(DEFAULT_REFRESH_CONCURRENCY).toBe(2);
    expect(clampRefreshConcurrency(undefined)).toBe(2);
    expect(clampRefreshConcurrency(0)).toBe(1);
    expect(clampRefreshConcurrency(99)).toBe(MAX_REFRESH_CONCURRENCY);
    expect(clampRefreshConcurrency(3)).toBe(3);
  });
});

describe("refreshAll limited concurrency", () => {
  beforeEach(() => {
    installStorage();
    __resetHistoryIndexLocksForTests();
  });

  afterEach(() => {
    __resetHistoryIndexLocksForTests();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("runs two channels in parallel at default concurrency", async () => {
    await seed("https://example.com/a.xml", "A");
    await seed("https://example.com/b.xml", "B");
    const started: string[] = [];
    const gateA = (() => {
      let release!: () => void;
      const promise = new Promise<void>((r) => {
        release = r;
      });
      return { release, promise };
    })();
    const gateB = (() => {
      let release!: () => void;
      const promise = new Promise<void>((r) => {
        release = r;
      });
      return { release, promise };
    })();

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("a.xml")) {
        started.push("A");
        await gateA.promise;
      } else {
        started.push("B");
        await gateB.promise;
      }
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const pending = refreshAll({ fetchImpl }); // default concurrency 2
    for (let i = 0; i < 40 && started.length < 2; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(started.sort()).toEqual(["A", "B"]);
    expect(isRefreshJobBusy()).toBe(true);
    gateA.release();
    gateB.release();
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(isRefreshJobBusy()).toBe(false);
  });

  it("with concurrency 1, second channel waits for the first to settle", async () => {
    await seed("https://example.com/a.xml", "A");
    await seed("https://example.com/b.xml", "B");
    const started: string[] = [];
    let releaseA!: () => void;
    const gateA = new Promise<void>((r) => {
      releaseA = r;
    });

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("a.xml")) {
        started.push("A");
        await gateA;
      } else {
        started.push("B");
      }
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const pending = refreshAll({ fetchImpl, concurrency: 1 });
    for (let i = 0; i < 40 && !started.includes("A"); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(started).toEqual(["A"]);
    releaseA();
    const result = await pending;
    expect(started).toEqual(["A", "B"]);
    expect(result.ok).toBe(true);
  });

  it("one timed-out channel releases its slot; sibling still succeeds", async () => {
    const idHang = await seed("https://example.com/hang.xml", "Hang");
    const idOk = await seed("https://example.com/ok.xml", "Ok");
    const delays: Array<() => void> = [];

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("hang.xml")) {
        return new Promise<Response>(() => {
          /* never */
        });
      }
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const delay = (_ms: number) =>
      new Promise<void>((resolve) => {
        delays.push(resolve);
      });

    const pending = refreshAll({
      fetchImpl: fetchImpl as typeof fetch,
      fetchTimeoutMs: 1,
      fetchDelay: delay,
      concurrency: 2,
    });

    for (let i = 0; i < 40 && delays.length < 1; i += 1) {
      await Promise.resolve();
    }
    expect(delays.length).toBeGreaterThanOrEqual(1);
    // Let the ok channel win its fetch-vs-deadline race first (do not fire yet).
    await new Promise((r) => setTimeout(r, 20));
    // Now abandon the hung channel — leftover delays are harmless once ok settled.
    for (const d of [...delays]) d();

    const result = await pending;
    expect(isRefreshJobBusy()).toBe(false);
    const hang = result.results.find((r) => r.id === idHang);
    const ok = result.results.find((r) => r.id === idOk);
    expect(hang?.ok).toBe(false);
    expect(hang?.reason).toBe(RSS_FETCH_TIMEOUT_REASON);
    expect(ok?.ok).toBe(true);
  });
});
