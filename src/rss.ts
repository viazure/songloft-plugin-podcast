/**
 * Minimal RSS 2.0 / Atom-ish podcast feed parser (no DOM).
 * Focus: channel title/author/image + items with audio enclosure.
 */

export interface RssEnclosure {
  url: string;
  type: string;
  length?: number;
}

export interface RssEpisode {
  title: string;
  guid: string | null;
  pubDate: string | null;
  pubDateMs: number | null;
  durationSec: number | null;
  coverUrl: string | null;
  enclosure: RssEnclosure;
  description: string | null;
}

export interface RssChannel {
  title: string;
  author: string | null;
  link: string | null;
  description: string | null;
  coverUrl: string | null;
  episodes: RssEpisode[];
  /** Count of items skipped for non-audio / missing enclosure. */
  skippedNonAudio: number;
  /** Count of items with no usable enclosure at all. */
  skippedNoEnclosure: number;
}

export interface ParseRssOk {
  ok: true;
  channel: RssChannel;
}

export interface ParseRssFail {
  ok: false;
  reason: string;
}

export type ParseRssResult = ParseRssOk | ParseRssFail;

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** First matching tag body (non-greedy). */
function tagBody(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function tagAttr(tagOpen: string, attr: string): string | null {
  const re = new RegExp(`\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const m = tagOpen.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function firstTagOpen(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>`, "i");
  const m = xml.match(re);
  return m ? m[0] : null;
}

function textField(block: string, names: string[]): string | null {
  for (const name of names) {
    const body = tagBody(block, name);
    if (body != null) {
      const t = stripTags(body);
      if (t) return t;
    }
  }
  return null;
}

/** itunes:duration → seconds. Accepts HH:MM:SS / MM:SS / raw seconds. */
export function parseDuration(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Math.round(Number(s));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  return null;
}

export function parsePubDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

function isAudioType(type: string, url: string): boolean {
  const t = (type || "").toLowerCase().trim();
  if (t.startsWith("audio/")) return true;
  if (t === "audio") return true;
  // Some feeds omit type or use application/octet-stream — sniff extension.
  const u = url.toLowerCase().split("?")[0];
  if (/\.(mp3|m4a|aac|ogg|opus|flac|wav|mp4)$/i.test(u)) {
    // mp4 may be video; only accept when type says audio or extension is clearly audio
    if (u.endsWith(".mp4") && t.startsWith("video/")) return false;
    if (u.endsWith(".mp4") && !t.startsWith("audio/") && t !== "" && t !== "application/octet-stream") {
      return false;
    }
    return !t.startsWith("video/");
  }
  return false;
}

function isVideoType(type: string, url: string): boolean {
  const t = (type || "").toLowerCase().trim();
  if (t.startsWith("video/")) return true;
  const u = url.toLowerCase().split("?")[0];
  if (/\.(mp4|m4v|webm|mov)$/i.test(u) && !t.startsWith("audio/")) return true;
  return false;
}

interface RawEnclosure {
  url: string;
  type: string;
  length?: number;
}

function parseEnclosures(itemXml: string): RawEnclosure[] {
  const out: RawEnclosure[] = [];
  const re = /<enclosure\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemXml))) {
    const open = m[0];
    const url = tagAttr(open, "url");
    if (!url) continue;
    const type = tagAttr(open, "type") || "";
    const lengthRaw = tagAttr(open, "length");
    const length = lengthRaw && /^\d+$/.test(lengthRaw) ? Number(lengthRaw) : undefined;
    out.push({ url: decodeEntities(url.trim()), type: type.trim(), length });
  }
  // Media RSS fallback
  const mr = /<media:content\b([^>]*)\/?>/gi;
  while ((m = mr.exec(itemXml))) {
    const open = m[0];
    const url = tagAttr(open, "url");
    if (!url) continue;
    const type = tagAttr(open, "type") || "";
    const medium = (tagAttr(open, "medium") || "").toLowerCase();
    const effectiveType = type || (medium === "audio" ? "audio/mpeg" : medium === "video" ? "video/mp4" : "");
    out.push({ url: decodeEntities(url.trim()), type: effectiveType });
  }
  return out;
}

function pickAudioEnclosure(itemXml: string): {
  enclosure: RawEnclosure | null;
  skippedVideo: boolean;
  skippedNone: boolean;
} {
  const all = parseEnclosures(itemXml);
  if (!all.length) return { enclosure: null, skippedVideo: false, skippedNone: true };
  const audio = all.find((e) => isAudioType(e.type, e.url));
  if (audio) return { enclosure: audio, skippedVideo: false, skippedNone: false };
  const onlyVideo = all.every((e) => isVideoType(e.type, e.url));
  return { enclosure: null, skippedVideo: onlyVideo, skippedNone: !onlyVideo };
}

function extractImage(block: string): string | null {
  // <itunes:image href="..."/>
  const itunesOpen = firstTagOpen(block, "itunes:image");
  if (itunesOpen) {
    const href = tagAttr(itunesOpen, "href");
    if (href) return decodeEntities(href.trim());
  }
  // <image><url>...</url></image>
  const imageBlock = tagBody(block, "image");
  if (imageBlock) {
    const url = textField(imageBlock, ["url"]);
    if (url) return url;
  }
  const mediaThumb = firstTagOpen(block, "media:thumbnail");
  if (mediaThumb) {
    const u = tagAttr(mediaThumb, "url");
    if (u) return decodeEntities(u.trim());
  }
  return null;
}

function splitItems(xml: string): string[] {
  const items: string[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) items.push(m[0]);
  if (items.length) return items;
  // Atom entries
  const re2 = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((m = re2.exec(xml))) items.push(m[0]);
  return items;
}

function parseItem(itemXml: string, channelCover: string | null): {
  episode: RssEpisode | null;
  skippedVideo: boolean;
  skippedNone: boolean;
} {
  const pick = pickAudioEnclosure(itemXml);
  if (!pick.enclosure) {
    return { episode: null, skippedVideo: pick.skippedVideo, skippedNone: pick.skippedNone };
  }
  const title = textField(itemXml, ["title"]) || "Untitled episode";
  let guid = textField(itemXml, ["guid", "id"]);
  if (guid) guid = guid.trim();
  else guid = null;
  const pubDate = textField(itemXml, ["pubDate", "published", "updated"]);
  const durationRaw = textField(itemXml, ["itunes:duration"]);
  const cover = extractImage(itemXml) || channelCover;
  const description = textField(itemXml, ["description", "summary", "content:encoded", "content"]);
  return {
    episode: {
      title,
      guid,
      pubDate,
      pubDateMs: parsePubDate(pubDate),
      durationSec: parseDuration(durationRaw),
      coverUrl: cover,
      enclosure: {
        url: pick.enclosure.url,
        type: pick.enclosure.type || "audio/mpeg",
        length: pick.enclosure.length,
      },
      description,
    },
    skippedVideo: false,
    skippedNone: false,
  };
}

/**
 * Parse RSS/Atom XML text into channel + audio episodes.
 */
export function parseRssXml(xmlRaw: string): ParseRssResult {
  const xml = String(xmlRaw || "").trim();
  if (!xml) return { ok: false, reason: "空响应：不是有效的 RSS" };
  // Obvious HTML login / error pages
  if (/^<!DOCTYPE html/i.test(xml) || /<html[\s>]/i.test(xml)) {
    return { ok: false, reason: "返回了 HTML 页面，不是 RSS（可能需要登录或 URL 不对）" };
  }
  const channelBlock =
    tagBody(xml, "channel") ||
    tagBody(xml, "feed") ||
    null;
  if (!channelBlock && !/<item\b/i.test(xml) && !/<entry\b/i.test(xml)) {
    return { ok: false, reason: "无法识别 RSS channel/feed" };
  }
  const scope = channelBlock || xml;
  const title = textField(scope, ["title"]);
  if (!title) {
    return { ok: false, reason: "RSS 缺少 channel title" };
  }
  const author =
    textField(scope, ["itunes:author", "author", "managingEditor", "dc:creator"]) || null;
  const link = textField(scope, ["link"]) || null;
  const description = textField(scope, ["description", "subtitle", "summary"]) || null;
  const coverUrl = extractImage(scope);
  const itemBlocks = splitItems(xml);
  const episodes: RssEpisode[] = [];
  let skippedNonAudio = 0;
  let skippedNoEnclosure = 0;
  for (const block of itemBlocks) {
    const parsed = parseItem(block, coverUrl);
    if (parsed.episode) {
      episodes.push(parsed.episode);
    } else if (parsed.skippedVideo) {
      skippedNonAudio += 1;
    } else if (parsed.skippedNone) {
      skippedNoEnclosure += 1;
    } else {
      skippedNonAudio += 1;
    }
  }
  if (!episodes.length) {
    return {
      ok: false,
      reason:
        skippedNonAudio > 0
          ? `未找到可播的音频 enclosure（已跳过 ${skippedNonAudio} 条视频/非音频）`
          : "未找到带 enclosure 的剧集",
    };
  }
  // Newest first when pubDate known
  episodes.sort((a, b) => {
    const am = a.pubDateMs ?? 0;
    const bm = b.pubDateMs ?? 0;
    return bm - am;
  });
  return {
    ok: true,
    channel: {
      title,
      author,
      link,
      description,
      coverUrl,
      episodes,
      skippedNonAudio,
      skippedNoEnclosure,
    },
  };
}

export async function fetchRss(url: string, fetchImpl: typeof fetch = fetch): Promise<ParseRssResult> {
  const trimmed = String(url || "").trim();
  if (!trimmed) return { ok: false, reason: "URL 为空" };
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return { ok: false, reason: "URL 格式无效" };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, reason: "仅支持 http/https RSS" };
  }
  let res: Response;
  try {
    res = await fetchImpl(trimmed, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "SongloftPodcastPlugin/0.1",
      },
    });
  } catch (e) {
    return { ok: false, reason: `网络错误：${String(e ?? "fetch failed")}` };
  }
  if (!res.ok) {
    return { ok: false, reason: `HTTP ${res.status}：无法拉取 RSS` };
  }
  let text: string;
  try {
    text = await res.text();
  } catch (e) {
    return { ok: false, reason: `读取响应失败：${String(e)}` };
  }
  return parseRssXml(text);
}
