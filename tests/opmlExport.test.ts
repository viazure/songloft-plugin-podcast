import { describe, it, expect } from "vitest";
import { buildOpml, escapeXmlAttr, opmlExportFilename } from "../src/opmlExport";
import { parseOpml } from "../src/opml";

describe("opmlExport", () => {
  it("escapes the five predefined XML entities", () => {
    expect(escapeXmlAttr(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });

  it("emits one flat outline per feed and skips duplicates", () => {
    const xml = buildOpml(
      [
        { title: "Show & Tell", url: "https://example.com/a.xml" },
        { title: "Dub", url: "https://example.com/a.xml" },
        { title: "", url: "https://example.com/b.xml" },
        { title: "No url", url: "" },
      ],
      { title: "My <Subs>", dateCreated: new Date("2026-11-09T00:00:00Z") }
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<title>My &lt;Subs&gt;</title>");
    expect(xml).toContain('text="Show &amp; Tell"');
    expect(xml).toContain('xmlUrl="https://example.com/b.xml"');
    expect(xml).toContain('text="https://example.com/b.xml"');
    expect(xml.match(/<outline /g)?.length).toBe(2);
  });

  it("round-trips through the importer", () => {
    const xml = buildOpml([
      { title: "A", url: "https://a.example/feed" },
      { title: "B & C", url: "https://b.example/feed?x=1&y=2" },
    ]);
    const parsed = parseOpml(xml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.candidates.map((c) => c.feedUrl)).toEqual([
      "https://a.example/feed",
      "https://b.example/feed?x=1&y=2",
    ]);
    expect(parsed.candidates[1].title).toBe("B & C");
  });

  it("builds a stable filename", () => {
    expect(opmlExportFilename(new Date(2026, 0, 5))).toBe("songloft-podcasts-20260105.opml");
  });
});
