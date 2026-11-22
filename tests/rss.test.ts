import { describe, expect, it } from "vitest";
import {
  parseDuration,
  parseRssXml,
  fetchRss,
  RSS_FETCH_TIMEOUT_REASON,
} from "../src/rss";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Demo Podcast</title>
    <itunes:author>Demo Author</itunes:author>
    <description>A demo feed</description>
    <itunes:image href="https://cdn.example.com/cover.jpg"/>
    <item>
      <title>Episode Two</title>
      <guid>ep-2</guid>
      <pubDate>Mon, 02 Jan 2023 10:00:00 GMT</pubDate>
      <itunes:duration>1:02:03</itunes:duration>
      <enclosure url="https://cdn.example.com/ep2.mp3" type="audio/mpeg" length="123"/>
    </item>
    <item>
      <title>Episode One</title>
      <guid isPermaLink="false">ep-1</guid>
      <pubDate>Sun, 01 Jan 2023 10:00:00 GMT</pubDate>
      <itunes:duration>90</itunes:duration>
      <enclosure url="https://cdn.example.com/ep1.m4a" type="audio/mp4"/>
    </item>
    <item>
      <title>Video only</title>
      <enclosure url="https://cdn.example.com/v.mp4" type="video/mp4"/>
    </item>
  </channel>
</rss>`;

describe("parseDuration", () => {
  it("parses HH:MM:SS and seconds", () => {
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("12:30")).toBe(750);
    expect(parseDuration("")).toBeNull();
  });
});

describe("parseRssXml", () => {
  it("parses channel + audio episodes newest-first; skips video", () => {
    const r = parseRssXml(SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.channel.title).toBe("Demo Podcast");
    expect(r.channel.author).toBe("Demo Author");
    expect(r.channel.coverUrl).toBe("https://cdn.example.com/cover.jpg");
    expect(r.channel.episodes).toHaveLength(2);
    expect(r.channel.episodes[0].title).toBe("Episode Two");
    expect(r.channel.episodes[0].guid).toBe("ep-2");
    expect(r.channel.episodes[0].durationSec).toBe(3723);
    expect(r.channel.episodes[1].durationSec).toBe(90);
    expect(r.channel.skippedNonAudio).toBe(1);
  });

  it("fails on empty / html / no enclosure", () => {
    expect(parseRssXml("").ok).toBe(false);
    expect(parseRssXml("<!DOCTYPE html><html></html>").ok).toBe(false);
    const noEnc = parseRssXml(`<rss><channel><title>X</title><item><title>a</title></item></channel></rss>`);
    expect(noEnc.ok).toBe(false);
  });

  it("classifies CDN/IP ACL 403 HTML separately from generic HTML", () => {
    const acl = `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>denied by IP ACL = not in whitelist</p></body></html>`;
    const fancy = `<!doctype html><html lang="zh-CN"><head><title>403 · 无法访问</title></head><body><h1>无法访问</h1></body></html>`;
    const login = `<!DOCTYPE html><html><head><title>Sign in</title></head><body><form><input type="password" name="password" /></form></body></html>`;
    const r1 = parseRssXml(acl);
    const r2 = parseRssXml(fancy);
    const r3 = parseRssXml(login);
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(r3.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toMatch(/源站拒绝访问|CDN\/IP/);
    if (!r2.ok) expect(r2.reason).toMatch(/源站拒绝访问|CDN\/IP/);
    if (!r3.ok) expect(r3.reason).toMatch(/可能需要登录或 URL 不对/);
  });

  it("accepts audio by extension when type missing", () => {
    const xml = `<rss><channel><title>X</title>
      <item><title>a</title><enclosure url="https://x.com/a.mp3"/></item>
    </channel></rss>`;
    const r = parseRssXml(xml);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.channel.episodes[0].enclosure.url).toContain("a.mp3");
  });
});

describe("fetchRss", () => {
  it("returns readable reason for bad URL", async () => {
    const r = await fetchRss("not-a-url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/URL/);
  });

  it("maps HTTP 403 to a source-denied reason", async () => {
    const fetchImpl = async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as Response;
    const r = await fetchRss("https://example.test/feed.xml", fetchImpl as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/403.*源站拒绝访问/);
  });

  it("parses via mock fetch", async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        text: async () => SAMPLE,
      }) as Response;
    const r = await fetchRss("https://example.com/feed.xml", fetchImpl as typeof fetch);
    expect(r.ok).toBe(true);
  });

  it("HTTP error is readable", async () => {
    const fetchImpl = async () =>
      ({
        ok: false,
        status: 404,
        text: async () => "missing",
      }) as Response;
    const r = await fetchRss("https://example.com/feed.xml", fetchImpl as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/404/);
  });

  it("abandons a hung fetch with human timeout copy (no raw codes)", async () => {
    let resolveFetch!: (v: Response) => void;
    const fetchImpl = () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    let fireDeadline!: () => void;
    const delay = (_ms: number) =>
      new Promise<void>((resolve) => {
        fireDeadline = resolve;
      });

    const pending = fetchRss("https://example.com/feed.xml", fetchImpl as typeof fetch, {
      timeoutMs: 1,
      delay,
    });
    // Let fetchWithDeadline arm the delay race.
    await Promise.resolve();
    await Promise.resolve();
    expect(typeof fireDeadline).toBe("function");
    fireDeadline();
    const r = await pending;
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe(RSS_FETCH_TIMEOUT_REASON);
      expect(r.reason).not.toMatch(/HttpDeadline|skipped_busy|AbortController|timeoutMs/i);
    }
    // Late fulfillment must not throw / change the settled result.
    resolveFetch!({
      ok: true,
      status: 200,
      text: async () => SAMPLE,
    } as Response);
    await new Promise((res) => setTimeout(res, 10));
  });

  it("abandons a hung body read with the same human timeout copy", async () => {
    let resolveText!: (v: string) => void;
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((resolve) => {
            resolveText = resolve;
          }),
      }) as Response;

    let fireDeadline!: () => void;
    let delayCalls = 0;
    const delay = (_ms: number) =>
      new Promise<void>((resolve) => {
        delayCalls += 1;
        // First delay (headers): leave pending so fetch wins the race.
        // Second delay (body): expose resolve so the test can fire the deadline.
        if (delayCalls >= 2) fireDeadline = resolve;
      });

    const pending = fetchRss("https://example.com/feed.xml", fetchImpl as typeof fetch, {
      timeoutMs: 1,
      delay,
    });
    for (let i = 0; i < 20 && typeof fireDeadline !== "function"; i += 1) {
      await Promise.resolve();
    }
    expect(typeof fireDeadline).toBe("function");
    fireDeadline();
    const r = await pending;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(RSS_FETCH_TIMEOUT_REASON);
    resolveText!(SAMPLE);
    await new Promise((res) => setTimeout(res, 10));
  });
});

describe("CDATA regression (synthetic fixtures only)", () => {
  it("preserves channel/item title, author, guid, description and duration", () => {
    const r = parseRssXml(`<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
      <title><![CDATA[测试频道 & 杂谈]]></title><itunes:author><![CDATA[测试作者]]></itunes:author>
      <description><![CDATA[<p>频道介绍</p>]]></description>
      <item><title><![CDATA[中文剧集 😀]]></title><guid><![CDATA[episode-1]]></guid>
      <description><![CDATA[<b>剧集介绍</b>]]></description>
      <itunes:duration><![CDATA[01:02:03]]></itunes:duration>
      <enclosure url="https://example.test/one.m4a" type="audio/mp4"/></item>
    </channel></rss>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.channel.title).toBe("测试频道 & 杂谈");
    expect(r.channel.author).toBe("测试作者");
    expect(r.channel.description).toBe("频道介绍");
    expect(r.channel.episodes[0]).toMatchObject({title:"中文剧集 😀",guid:"episode-1",durationSec:3723});
    expect(r.channel.episodes[0].description).toContain("剧集介绍");
  });

  it("preserves escaped angle brackets as literal text", () => {
    const r = parseRssXml(`<rss><channel><title>频道 &lt;测试&gt;</title>
      <item><title>剧集 &lt;一&gt;</title><enclosure url="https://example.test/a.mp3" type="audio/mpeg"/></item>
      </channel></rss>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.channel.title).toBe("频道 <测试>");
    expect(r.channel.episodes[0].title).toBe("剧集 <一>");
  });
});


describe("channel description fields", () => {
  it("reads itunes:summary when channel description is absent", () => {
    const r = parseRssXml(`<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
      <title>Only Summary</title>
      <itunes:summary><![CDATA[频道简介来自 summary]]></itunes:summary>
      <item><title>Ep</title><enclosure url="https://example.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.channel.description).toBe("频道简介来自 summary");
  });

  it("does not treat item description as the channel blurb", () => {
    const r = parseRssXml(`<rss><channel><title>No Channel Desc</title>
      <item><title>Ep</title><description>只属于剧集</description>
      <enclosure url="https://example.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.channel.description).toBeNull();
    expect(r.channel.episodes[0].description).toContain("只属于剧集");
  });
});
