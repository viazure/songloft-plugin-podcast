/**
 * Host resolves remote songs via POST /api/music/url (same path as bili).
 * Podcast enclosures often need a browser-like User-Agent.
 */

import { createMusicUrlHandler } from "@songloft/plugin-sdk";
import { normalizeFeedUrl } from "./hash";
import { getSubscription, loadSubscriptions } from "./store";

export const PODCAST_UA =
  "SongloftPodcast/0.2 (+https://github.com/viazure/songloft-plugin-podcast; like iTunes)";

export type PodcastSourceData = {
  enclosureUrl?: string;
  feedId?: string;
  feedUrl?: string;
  guid?: string;
  guidSource?: string;
  pubDate?: string | null;
};

export function playbackHeaders(enclosureUrl?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": PODCAST_UA,
    Accept: "*/*",
  };
  if (enclosureUrl) {
    try {
      const u = new URL(enclosureUrl);
      headers.Referer = `${u.protocol}//${u.host}/`;
    } catch {
      /* ignore */
    }
  }
  return headers;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function resolvePodcastAudioUrl(
  sourceData: Record<string, unknown> | PodcastSourceData
): Promise<{ url: string; headers: Record<string, string> }> {
  let enclosureUrl = asString((sourceData as PodcastSourceData).enclosureUrl);

  if (!enclosureUrl) {
    const feedId = asString((sourceData as PodcastSourceData).feedId);
    const feedUrl = asString((sourceData as PodcastSourceData).feedUrl);
    const guid = asString((sourceData as PodcastSourceData).guid);

    let sub = feedId ? await getSubscription(feedId) : null;
    if (!sub && feedUrl) {
      const want = normalizeFeedUrl(feedUrl);
      const all = await loadSubscriptions();
      sub = all.find((s) => normalizeFeedUrl(s.url) === want) || null;
    }
    if (sub && guid) {
      const ep = sub.episodes.find((e) => e.guid === guid || e.enclosureUrl === guid);
      if (ep?.enclosureUrl) enclosureUrl = ep.enclosureUrl;
    }
  }

  if (!enclosureUrl) {
    throw new Error("source_data 缺少 enclosureUrl，且无法从订阅索引还原");
  }
  if (!/^https?:\/\//i.test(enclosureUrl)) {
    throw new Error("enclosureUrl 不是 http(s) 地址");
  }

  return { url: enclosureUrl, headers: playbackHeaders(enclosureUrl) };
}

export const musicUrlHandler = createMusicUrlHandler({
  resolveUrl: resolvePodcastAudioUrl,
});
