import { describe, expect, it } from "vitest";
import { parseDuration, parseRssXml, fetchRss } from "../src/rss";

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
