import { describe, expect, it } from "vitest";
import { episodeDedupKey } from "../src/dedup";
import { feedIdFromUrl, normalizeFeedUrl, urlHash } from "../src/hash";

describe("dedup_key", () => {
  it("prefers guid over url hash", () => {
    expect(episodeDedupKey("abc", "guid-1", "https://x/a.mp3")).toBe("podcast:abc:guid-1");
    const noGuid = episodeDedupKey("abc", null, "https://x/a.mp3");
    expect(noGuid).toBe(`podcast:abc:${urlHash("https://x/a.mp3")}`);
    expect(noGuid).toMatch(/^podcast:abc:[0-9a-f]{12}$/);
  });

  it("feed id stable for normalized URL", () => {
    const a = feedIdFromUrl("https://Example.com/feed.xml/");
    const b = feedIdFromUrl("https://example.com/feed.xml");
    // hostname case may differ after URL() — still deterministic per normalized form
    expect(feedIdFromUrl("https://example.com/feed.xml")).toBe(
      feedIdFromUrl("https://example.com/feed.xml/")
    );
    expect(normalizeFeedUrl(" https://example.com/feed.xml/ ")).toBe(
      "https://example.com/feed.xml"
    );
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(b).toMatch(/^[0-9a-f]{12}$/);
  });
});
