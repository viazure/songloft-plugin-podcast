import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { feedIdFromUrl } from "../src/hash";
import {
  __resetHistoryIndexLocksForTests,
  isRefreshJobBusy,
  refreshAll,
  runManualRefreshOne,
  runStoreMutation,
  startManualRefreshAll,
} from "../src/refresh";
import { defaultHistoryIndexFields, loadSubscriptions, upsertSubscription } from "../src/store";

const SAMPLE = `<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>News Daily</title>
    <item>
      <title>Morning</title>
      <guid>g-morning</guid>
      <enclosure url="https://cdn.example.com/morning.mp3" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`;

type Gate = { release: () => void; promise: Promise<void>; hits: number };

function makeGate(): Gate {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { release, promise, hits: 0 };
}

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
  return bag;
}

async function seedSub(url: string, title: string) {
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

describe("refresh jobs coalesce + per-channel lock", () => {
  beforeEach(() => {
    installStorage();
    __resetHistoryIndexLocksForTests();
  });

  afterEach(() => {
    __resetHistoryIndexLocksForTests();
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).fetch;
  });

  it("duplicate refreshAll joins the same full job", async () => {
    const id = await seedSub("https://example.com/a.xml", "A");
    const gate = makeGate();
    const fetchImpl = async () => {
      gate.hits += 1;
      await gate.promise;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const p1 = refreshAll({ fetchImpl });
    for (let i = 0; i < 40 && !isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    const p2 = refreshAll({ fetchImpl });
    expect(isRefreshJobBusy()).toBe(true);
    gate.release();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.joined).toBeFalsy();
    expect(r2.joined).toBe(true);
    expect(gate.hits).toBe(1);
    expect(r1.results.map((x) => x.id)).toEqual([id]);
  });

  it("startManualRefreshAll second call joins without 409", async () => {
    await seedSub("https://example.com/b.xml", "B");
    const gate = makeGate();
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
      gate.hits += 1;
      await gate.promise;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    }) as typeof fetch;

    const first = startManualRefreshAll();
    expect(first.started).toBe(true);
    expect(first.joined).toBeFalsy();
    for (let i = 0; i < 40 && !isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    const second = startManualRefreshAll();
    expect(second.started).toBe(true);
    expect(second.joined).toBe(true);
    expect(isRefreshJobBusy()).toBe(true);
    gate.release();
    for (let i = 0; i < 80 && isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(gate.hits).toBe(1);
  });

  it("single refresh jumps unstarted channel in full queue and coalesces", async () => {
    const idA = await seedSub("https://example.com/a.xml", "A");
    const idB = await seedSub("https://example.com/b.xml", "B");
    const order: string[] = [];
    const gateA = makeGate();
    const gateB = makeGate();

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("a.xml")) {
        order.push("fetchA");
        await gateA.promise;
      } else {
        order.push("fetchB");
        await gateB.promise;
      }
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    // concurrency 1 keeps B pending so jump-to-front is observable
    const fullP = refreshAll({ fetchImpl, concurrency: 1 });
    for (let i = 0; i < 40 && !order.includes("fetchA"); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(order).toEqual(["fetchA"]);

    const oneP = runManualRefreshOne(idB);
    // Allow jump to take effect before releasing A.
    await new Promise((r) => setTimeout(r, 15));
    gateA.release();
    for (let i = 0; i < 40 && !order.includes("fetchB"); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(order).toEqual(["fetchA", "fetchB"]);
    gateB.release();

    const [fullR, oneR] = await Promise.all([fullP, oneP]);
    expect(fullR.ok).toBe(true);
    expect(oneR.skipped).toBe(false);
    if (!oneR.skipped) {
      expect(oneR.joined).toBe(true);
      expect(oneR.result.ok).toBe(true);
    }
    expect(fullR.results.map((x) => x.id)).toEqual([idA, idB]);
  });

  it("after a channel finishes in full pass, a new single refresh is allowed", async () => {
    const idA = await seedSub("https://example.com/a.xml", "A");
    const idB = await seedSub("https://example.com/b.xml", "B");
    const hits = { a: 0, b: 0 };
    const gateB = makeGate();

    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("a.xml")) {
        hits.a += 1;
        return new Response(SAMPLE, {
          status: 200,
          headers: { "Content-Type": "application/rss+xml" },
        });
      }
      hits.b += 1;
      await gateB.promise;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };
    // runManualRefreshOne uses global fetch for a fresh one-shot.
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchImpl as typeof fetch;

    const fullP = refreshAll({ fetchImpl });
    for (let i = 0; i < 40 && hits.a < 1; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    for (let i = 0; i < 40 && hits.b < 1; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(hits.a).toBe(1);
    expect(hits.b).toBe(1);

    // A already done in this pass; B still in-flight → fresh single for A allowed.
    const one = await runManualRefreshOne(idA);
    expect(one.skipped).toBe(false);
    if (!one.skipped) {
      expect(one.joined).toBeFalsy();
      expect(one.result.ok).toBe(true);
    }
    expect(hits.a).toBe(2);

    gateB.release();
    const fullR = await fullP;
    expect(fullR.ok).toBe(true);
    expect(fullR.results.map((x) => x.id)).toEqual([idA, idB]);
  });

  it("store mutation waits during refresh and never returns skipped_busy", async () => {
    await seedSub("https://example.com/hold.xml", "Hold");
    const gate = makeGate();
    const fetchImpl = async () => {
      await gate.promise;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const refreshP = refreshAll({ fetchImpl });
    for (let i = 0; i < 40 && !isRefreshJobBusy(); i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }

    let mutDone = false;
    const mutP = runStoreMutation(async () => {
      mutDone = true;
      return "ok";
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(mutDone).toBe(false);

    gate.release();
    const [refreshR, mutR] = await Promise.all([refreshP, mutP]);
    expect(refreshR.ok).toBe(true);
    expect(mutR).toBe("ok");
    expect(mutDone).toBe(true);
  });

  it("full pass uses subscription snapshot from start", async () => {
    const idA = await seedSub("https://example.com/a.xml", "A");
    const gateA = makeGate();
    const seen: string[] = [];

    const fetchImpl = async (input: RequestInfo | URL) => {
      seen.push(String(input));
      if (String(input).includes("a.xml")) await gateA.promise;
      return new Response(SAMPLE, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    const fullP = refreshAll({ fetchImpl });
    for (let i = 0; i < 40 && !seen.length; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }

    // Mid-pass: queue an add. It must wait; current round keeps the start snapshot.
    const mutP = runStoreMutation(async () => {
      await seedSub("https://example.com/new.xml", "New");
      return true;
    });
    await new Promise((r) => setTimeout(r, 15));
    gateA.release();
    const [fullR] = await Promise.all([fullP, mutP]);
    expect(fullR.results.map((x) => x.id)).toEqual([idA]);
    expect(seen.every((u) => !u.includes("new.xml"))).toBe(true);
    expect((await loadSubscriptions()).length).toBe(2);
  });
});