import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_OPML_BYTES,
  decodeXmlEntities,
  parseAttributesCaseSensitive,
  parseOpml,
  previewOpmlAgainstExisting,
} from "../src/opml";

const xy = readFileSync("tests/fixtures/subscriptions.opml", "utf8");
const moon = readFileSync("tests/fixtures/moonfm-test-only.opml", "utf8");

describe("opml attribute / entity helpers", () => {
  it("decodes XML entities once and leaves HTML-only names intact", () => {
    expect(decodeXmlEntities("a &amp; b &lt;c&gt;")).toBe("a & b <c>");
    expect(decodeXmlEntities("x &nbsp; y")).toBe("x &nbsp; y");
    expect(decodeXmlEntities("&#65;&#x42;")).toBe("AB");
  });

  it("parses attributes case-sensitively (xmlurl ≠ xmlUrl)", () => {
    const attrs = parseAttributesCaseSensitive(
      ` text="T" type="rss" xmlUrl="https://a.example/feed" xmlurl="https://b.example/feed" `
    );
    expect(attrs.xmlUrl).toBe("https://a.example/feed");
    expect(attrs.xmlurl).toBe("https://b.example/feed");
    expect(attrs.text).toBe("T");
  });
});

describe("Architect sample offline parse", () => {
  it("Xiaoyuzhou subscriptions.opml → 32 candidates; titles from title", () => {
    const r = parseOpml(xy);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(32);
    expect(r.documentTitle).toMatch(/Xiaoyuzhou/i);
    const first = r.candidates[0];
    expect(first.title).toBe("半拿铁 | 商业沉浮录");
    // text is long blurb, must NOT win over title
    expect(first.title).not.toMatch(/商业不枯燥/);
    expect(r.warnings.some((w) => w.code === "bad_date")).toBe(true);
  });

  it("Moon FM sample → 20 candidates; trim padded title; dirty htmlUrl warns", () => {
    const r = parseOpml(moon);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(20);
    const padded = r.candidates.find((c) => c.feedUrl.includes("reread.typlog.io"));
    expect(padded?.title).toBe("一派·再读");
    const warned = r.candidates.filter((c) =>
      c.warnings.some((w) => w.code === "bad_htmlUrl")
    );
    expect(warned.length).toBeGreaterThanOrEqual(3);
    // dirty htmlUrl must not drop the subscription
    expect(r.candidates.some((c) => c.feedUrl.includes("proxy.wavpub.com/caffebreve"))).toBe(
      true
    );
  });
});

describe("OPML contract edge cases", () => {
  it("recurses nested folders into folderPath", () => {
    const xml = `<?xml version="1.0"?>
<opml version="2.0"><head><title>N</title></head><body>
  <outline text="Tech">
    <outline text="Dev">
      <outline text="Show A" type="rss" xmlUrl="https://example.com/a.xml"/>
    </outline>
  </outline>
</body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].folderPath).toEqual(["Tech", "Dev"]);
    expect(r.candidates[0].title).toBe("Show A");
  });

  it("accepts RSS/rss type values; rejects xmlurl lowercase attribute name", () => {
    const okXml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline text="A" type="RSS" xmlUrl="https://example.com/a.xml"/>
      <outline text="B" type="rss" xmlUrl="https://example.com/b.xml"/>
    </body></opml>`;
    const ok = parseOpml(okXml);
    expect(ok.ok && ok.candidates).toHaveLength(2);

    const bad = parseOpml(`<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline text="C" type="rss" xmlurl="https://example.com/c.xml"/>
    </body></opml>`);
    expect(bad.ok).toBe(true);
    if (!bad.ok) return;
    expect(bad.candidates).toHaveLength(0);
    expect(bad.skipped[0].reasons.some((r) => r.code === "missing_xmlUrl")).toBe(true);
  });

  it("missing required fields skipped with diagnostics; missing type does not guess RSS", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline type="rss" xmlUrl="https://example.com/no-text.xml"/>
      <outline text="NoType" xmlUrl="https://example.com/no-type.xml"/>
      <outline text="NoUrl" type="rss"/>
    </body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(0);
    expect(r.skipped).toHaveLength(3);
    const codes = r.skipped.flatMap((s) => s.reasons.map((x) => x.code));
    expect(codes).toContain("missing_text");
    expect(codes).toContain("missing_type");
    expect(codes).toContain("missing_xmlUrl");
  });

  it("preserves query order / %xx / single &amp; decode; no double decode", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline text="Sig" type="rss"
        xmlUrl="https://cdn.example.com/feed.xml?token=a%2Fb&amp;z=1&amp;a=2"/>
    </body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates[0].feedUrl).toBe(
      "https://cdn.example.com/feed.xml?token=a%2Fb&z=1&a=2"
    );
  });

  it("rejects DOCTYPE / ENTITY whole-file", () => {
    const dtd = `<?xml version="1.0"?><!DOCTYPE opml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<opml version="2.0"><head><title>t</title></head><body>
  <outline text="A" type="rss" xmlUrl="https://example.com/a.xml"/>
</body></opml>`;
    const r = parseOpml(dtd);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/DOCTYPE|ENTITY/);
  });

  it("rejects oversized payload by product limit", () => {
    const huge = "x".repeat(MAX_OPML_BYTES + 10);
    const r = parseOpml(huge);
    expect(r.ok).toBe(false);
  });

  it("rejects username/password and non-http schemes in xmlUrl", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline text="A" type="rss" xmlUrl="https://user:pass@example.com/a.xml"/>
      <outline text="B" type="rss" xmlUrl="file:///tmp/x.xml"/>
      <outline text="C" type="rss" xmlUrl="https://ok.example/c.xml"/>
    </body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].feedUrl).toContain("ok.example");
  });

  it("does not expand include/link", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <include url="https://evil.example/x.opml"/>
      <outline text="A" type="rss" xmlUrl="https://example.com/a.xml"/>
    </body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(1);
    expect(r.warnings.some((w) => w.code === "ignored_include")).toBe(true);
  });
});

describe("preview + import (stubs only, no network)", () => {
  function installSongloftMock() {
    const bag: Record<string, unknown> = {};
    (globalThis as unknown as { songloft: unknown }).songloft = {
      storage: {
        async get(key: string) {
          return bag[key];
        },
        async set(key: string, value: unknown) {
          bag[key] = value;
        },
        async remove(key: string) {
          delete bag[key];
        },
      },
      log: { info: () => {}, warn: () => {}, error: () => {} },
      songs: { create: async () => [] },
      playlists: {
        list: async () => [],
        create: async () => ({ id: 1 }),
        getSongs: async () => [],
        addSongs: async () => ({ added: 0, skipped: 0 }),
        removeSongs: async () => {},
        delete: async () => {},
      },
    };
    return bag;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it("preview classifies new vs existing; second import adds zero", async () => {
    installSongloftMock();
    const fetchSpy = vi.fn(async () => {
      throw new Error("network should not be called");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runOpmlPreview, runOpmlImport } = await import("../src/opmlImport");
    const store = await import("../src/store");

    const mini = `<?xml version="1.0"?><opml version="2.0"><head><title>Mini</title></head><body>
      <outline text="One" title="One Show" type="rss" xmlUrl="https://example.com/one.xml"/>
      <outline text="Two" title="Two Show" type="rss" xmlUrl="https://example.com/two.xml"/>
    </body></opml>`;

    const prev1 = await runOpmlPreview(mini);
    expect(prev1.ok).toBe(true);
    if (!prev1.ok) return;
    expect(prev1.preview.summary.neu).toBe(2);

    const imp1 = await runOpmlImport(mini, { now: () => 1_700_000_000_000 });
    expect(imp1.ok).toBe(true);
    expect(imp1.added).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();

    const list = await store.loadSubscriptions();
    expect(list).toHaveLength(2);
    expect(list[0].episodeCount).toBe(0);
    expect(list[0].playlistId).toBeNull();

    const prev2 = await runOpmlPreview(mini);
    expect(prev2.ok && prev2.preview.summary.neu).toBe(0);
    expect(prev2.ok && prev2.preview.summary.duplicate).toBe(2);

    const imp2 = await runOpmlImport(mini, { now: () => 1_700_000_000_100 });
    expect(imp2.ok).toBe(true);
    expect(imp2.added).toBe(0);
    expect((await store.loadSubscriptions()).length).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("in-file duplicates count once as candidate", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
      <outline text="A" type="rss" xmlUrl="https://example.com/a.xml"/>
      <outline text="A2" type="rss" xmlUrl="https://example.com/a.xml"/>
      <outline text="A3" type="rss" xmlUrl="https://EXAMPLE.com/a.xml/"/>
    </body></opml>`;
    const r = parseOpml(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(1);
    expect(r.skipped.length).toBeGreaterThanOrEqual(2);
    const preview = previewOpmlAgainstExisting(r, []);
    expect(preview.summary.neu).toBe(1);
    expect(preview.summary.duplicate).toBeGreaterThanOrEqual(2);
  });

  it("busy refresh mutex yields skipped_busy on import", async () => {
    installSongloftMock();
    const { refreshScheduler } = await import("../src/schedule");
    const { runOpmlImport } = await import("../src/opmlImport");

    let release!: () => void;
    const hold = new Promise<void>((r) => {
      release = r;
    });
    const gate = refreshScheduler.runExclusive(async () => {
      await hold;
      return "held";
    });
    try {
      const mini = `<?xml version="1.0"?><opml version="2.0"><head><title>t</title></head><body>
        <outline text="A" type="rss" xmlUrl="https://example.com/a.xml"/>
      </body></opml>`;
      const r = await runOpmlImport(mini);
      expect(r.ok).toBe(false);
      expect(r.skipped).toBe(true);
      expect(r.reason).toBe("skipped_busy");
    } finally {
      release();
      await gate;
    }
  });
});
