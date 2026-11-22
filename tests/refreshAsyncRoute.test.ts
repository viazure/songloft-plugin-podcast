import { afterEach, describe, expect, it, vi } from "vitest";
import { handleHTTP } from "../src/router";
import { refreshScheduler } from "../src/schedule";
import {
  __resetHistoryIndexLocksForTests,
  isRefreshJobBusy,
} from "../src/refresh";
import { feedIdFromUrl } from "../src/hash";
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
    playlists: {
      async list() {
        return [];
      },
    },
  };
  return bag;
}

function req(method: string, path: string, query = ""): HTTPRequest {
  return {
    method,
    path,
    headers: {},
    body: {} as unknown as HTTPRequest["body"],
    query,
  };
}

function parse(res: { body?: string | Uint8Array; statusCode?: number }) {
  const raw = res.body;
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  return { status: res.statusCode, json: JSON.parse(text || "{}") };
}

describe("async POST /api/refresh", () => {
  afterEach(async () => {
    __resetHistoryIndexLocksForTests();
    for (let i = 0; i < 80 && (isRefreshJobBusy() || refreshScheduler.isBusy()); i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
    vi.unstubAllGlobals();
  });

  it("returns started without waiting for the RSS pass, and exposes refreshBusy", async () => {
    installStorage({ subscriptions: [] });
    const refresh = parse(await handleHTTP(req("POST", "/api/refresh")));
    expect(refresh.status).toBe(200);
    expect(refresh.json.ok).toBe(true);
    expect(refresh.json.started).toBe(true);
    expect(refresh.json.results).toBeUndefined();

    // With an empty subscription list the background job finishes quickly;
    // status must still include the busy flag field.
    const status = parse(await handleHTTP(req("GET", "/api/status")));
    expect(status.json.ok).toBe(true);
    expect(typeof status.json.refreshBusy).toBe("boolean");
  });

  it("joins a second refresh into the in-flight full job instead of 409", async () => {
    const id = feedIdFromUrl("https://example.com/slow.xml");
    installStorage({
      subscriptions: [
        {
          id,
          url: "https://example.com/slow.xml",
          title: "Slow",
          author: null,
          coverUrl: null,
          createdAt: 1,
          updatedAt: 1,
          lastSuccessAt: null,
          lastError: null,
          lastSkippedNonAudio: 0,
          episodeCount: 0,
          truncated: false,
          historyIndexed: false,
          historyIndexStatus: "idle",
          historyIndexError: null,
          historyIndexAt: null,
          feedEpisodeCount: 0,
          historyIndexCapped: false,
          historyEarliestDedupKey: null,
          historyEarliestConfirmed: false,
          episodes: [],
        },
      ],
    });

    let release!: () => void;
    const hold = new Promise<void>((r) => {
      release = r;
    });
    const SAMPLE = `<?xml version="1.0"?><rss version="2.0"><channel><title>Slow</title>
      <item><title>E</title><guid>g1</guid>
      <enclosure url="https://cdn.example.com/e.mp3" type="audio/mpeg"/></item>
    </channel></rss>`;
    vi.stubGlobal("fetch", async () => {
      await hold;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    });

    const first = parse(await handleHTTP(req("POST", "/api/refresh")));
    expect(first.status).toBe(200);
    expect(first.json.ok).toBe(true);
    expect(first.json.started).toBe(true);
    expect(first.json.joined).toBe(false);

    // Wait until the background arm has marked busy / started the job.
    for (let i = 0; i < 50 && !isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(isRefreshJobBusy()).toBe(true);

    const second = parse(await handleHTTP(req("POST", "/api/refresh")));
    expect(second.status).toBe(200);
    expect(second.json.ok).toBe(true);
    expect(second.json.started).toBe(true);
    expect(second.json.joined).toBe(true);

    const status = parse(await handleHTTP(req("GET", "/api/status")));
    expect(status.json.refreshBusy).toBe(true);

    release();
    for (let i = 0; i < 80 && isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
  });

  it("lets history load while a long refresh is in flight", async () => {
    installStorage({
      subscriptions: [],
      play_history: [
        {
          feedUrl: "https://example.com/a.xml",
          guid: "g1",
          title: "One",
          showTitle: "Show",
          playedAt: 1,
          positionSec: 10,
          durationSec: 100,
          completed: false,
        },
      ],
      favorites: [],
    });

    let release!: () => void;
    const hold = new Promise<void>((r) => {
      release = r;
    });
    const blocked = refreshScheduler.runExclusive(async () => {
      await hold;
      return true;
    });

    // Simulate the accept path already holding the gate (long RSS). History must not share it.
    const history = parse(await handleHTTP(req("GET", "/api/history")));
    expect(history.status).toBe(200);
    expect(history.json.ok).toBe(true);
    expect(history.json.history).toHaveLength(1);

    release();
    await blocked;
  });
});
