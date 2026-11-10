import { describe, it, expect } from "vitest";
import { sanitizeShowNoteHtml, isSafeShowNoteUrl } from "../src/rss";

/** Anything that could execute must be gone; only allowlisted markup survives. */
describe("sanitizeShowNoteHtml (XSS)", () => {
  it("keeps harmless formatting", () => {
    const out = sanitizeShowNoteHtml("<p>hello <strong>world</strong></p>");
    expect(out).toBe("<p>hello <strong>world</strong></p>");
  });

  it("removes script tags together with their body", () => {
    const out = sanitizeShowNoteHtml('<p>a</p><script>alert("x")</script><p>b</p>');
    expect(out).toBe("<p>a</p><p>b</p>");
    expect(out).not.toContain("alert");
  });

  it("removes event handler attributes", () => {
    const payloads = [
      '<img src="https://a.example/x.png" onerror="alert(1)">',
      "<p onclick='alert(1)'>x</p>",
      '<a href="https://a.example" onmouseover="alert(1)">x</a>',
    ];
    for (const p of payloads) {
      const out = sanitizeShowNoteHtml(p);
      expect(out.toLowerCase()).not.toContain("onerror");
      expect(out.toLowerCase()).not.toContain("onclick");
      expect(out.toLowerCase()).not.toContain("onmouseover");
      expect(out).not.toContain("alert");
    }
  });

  it("rejects javascript: / data: / vbscript: urls", () => {
    const payloads = [
      '<a href="javascript:alert(1)">x</a>',
      '<a href="JaVaScRiPt:alert(1)">x</a>',
      '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>',
      '<a href="vbscript:msgbox(1)">x</a>',
      '<a href="file:///etc/passwd">x</a>',
      '<a href=" javascript:alert(1)">x</a>',
    ];
    for (const p of payloads) {
      const out = sanitizeShowNoteHtml(p);
      expect(out).not.toMatch(/javascript:/i);
      expect(out).not.toMatch(/vbscript:/i);
      expect(out).not.toMatch(/data:text\/html/i);
      expect(out).not.toMatch(/file:/i);
      // The anchor is degraded to a span, text preserved.
      expect(out).toContain("<span>x</span>");
    }
  });

  it("rejects non-http image sources", () => {
    expect(sanitizeShowNoteHtml('<img src="javascript:alert(1)">')).toBe("");
    expect(sanitizeShowNoteHtml('<img src="//evil.example/a.png">')).toBe("");
    expect(sanitizeShowNoteHtml('<img src="data:image/svg+xml;base64,XX">')).toBe("");
  });

  it("keeps safe images and links with hardened rel", () => {
    const out = sanitizeShowNoteHtml(
      '<p><img src="https://cdn.example/a.png" alt="cover"><a href="https://example.com/ep">link</a></p>'
    );
    expect(out).toContain('<img src="https://cdn.example/a.png" alt="cover" loading="lazy" />');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("strips iframe / object / embed / svg / style", () => {
    const out = sanitizeShowNoteHtml(
      '<iframe src="https://evil"></iframe><object data="x"></object><embed src="x">' +
        "<style>body{background:url(javascript:alert(1))}</style>" +
        '<svg onload="alert(1)"><script>alert(1)</script></svg><p>ok</p>'
    );
    expect(out).toBe("<p>ok</p>");
  });

  it("escapes stray angle brackets so they never form tags", () => {
    const out = sanitizeShowNoteHtml("<p>5 < 6 &amp;&amp; 7 > 6</p>");
    expect(out).toContain("&lt;");
    expect(out).toContain("&gt;");
    // Only the two allowlisted <p> / </p> tags remain; text brackets are inert.
    expect(out.replace(/<\/?p>/g, "").includes("<")).toBe(false);
  });

  it("drops unknown tags but keeps their text", () => {
    const out = sanitizeShowNoteHtml("<marquee>hi</marquee><p>there</p>");
    expect(out).not.toContain("marquee");
    expect(out).toContain("hi");
    expect(out).toContain("<p>there</p>");
  });

  it("is idempotent", () => {
    const once = sanitizeShowNoteHtml('<p onclick="x()">a<img src="https://a/b.png" onerror="y()"></p>');
    expect(sanitizeShowNoteHtml(once)).toBe(once);
  });

  it("handles CDATA and HTML comments", () => {
    const out = sanitizeShowNoteHtml("<![CDATA[<p>cdata</p>]]><!-- <script>x</script> -->");
    expect(out).toContain("<p>cdata</p>");
    expect(out).not.toContain("script");
  });

  it("handles an empty / null-ish input", () => {
    expect(sanitizeShowNoteHtml("")).toBe("");
    expect(sanitizeShowNoteHtml(null as unknown as string)).toBe("");
    expect(sanitizeShowNoteHtml(undefined as unknown as string)).toBe("");
  });
});

describe("isSafeShowNoteUrl", () => {
  it("accepts only absolute http(s)", () => {
    expect(isSafeShowNoteUrl("https://a.example/x")).toBe(true);
    expect(isSafeShowNoteUrl("http://a.example/x?a=1&b=2")).toBe(true);
    expect(isSafeShowNoteUrl("//a.example/x")).toBe(false);
    expect(isSafeShowNoteUrl("/relative")).toBe(false);
    expect(isSafeShowNoteUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeShowNoteUrl("https://a.example/\"><script>")).toBe(false);
    expect(isSafeShowNoteUrl("")).toBe(false);
  });
});
