import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { feedIdFromUrl } from "../src/hash";
import {
  __resetHistoryIndexLocksForTests,
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

describe("RSS deadline in refreshAll", () => {
  beforeEach(() => {
    installStorage();
    __resetHistoryIndexLocksForTests();
  });

  afterEach(() => {
    __resetHistoryIndexLocksForTests();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("one hung feed times out; the next channel still refreshes and slots clear", async () => {
    const idHang = await seed("https://example.com/hang.xml", "Hang");
    const idOk = await seed("https://example.com/ok.xml", "Ok");

    let fireHangDeadline!: () => void;
    const hangDelays: Array<() => void> = [];

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("hang.xml")) {
        return new Promise<Response>(() => {
          /* never settles — deadline must abandon */
        });
      }
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    // Shared delay: each fetchWithDeadline arms one; fire the hang channel's.
    const delay = (_ms: number) =>
      new Promise<void>((resolve) => {
        hangDelays.push(resolve);
        fireHangDeadline = resolve;
      });

    const pending = refreshAll({
      fetchImpl: fetchImpl as typeof fetch,
      fetchTimeoutMs: 1,
      fetchDelay: delay,
    });

    for (let i = 0; i < 40 && hangDelays.length < 1; i += 1) {
      await Promise.resolve();
    }
    expect(hangDelays.length).toBeGreaterThanOrEqual(1);
    expect(isRefreshJobBusy()).toBe(true);

    // Fire the first armed deadline (hang channel).
    hangDelays[0]();

    const result = await pending;
    expect(isRefreshJobBusy()).toBe(false);
    expect(result.results).toHaveLength(2);
    const hang = result.results.find((r) => r.id === idHang);
    const ok = result.results.find((r) => r.id === idOk);
    expect(hang?.ok).toBe(false);
    expect(hang?.reason).toBe(RSS_FETCH_TIMEOUT_REASON);
    expect(ok?.ok).toBe(true);
    // Full batch is not ok because one channel failed, but it did finish.
    expect(result.ok).toBe(false);
  });
});
