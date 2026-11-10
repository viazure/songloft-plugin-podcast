import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../src/store", () => ({
  getSubscription: vi.fn(async (id: string) => {
    if (id !== "feed1") return null;
    return {
      id: "feed1",
      url: "https://example.com/feed.xml",
      title: "Demo",
      episodes: [
        {
          guid: "ep-1",
          title: "One",
          enclosureUrl: "https://cdn.example.com/a.mp3",
          dedupKey: "d1",
        },
      ],
    };
  }),
  loadSubscriptions: vi.fn(async () => [
    {
      id: "feed1",
      url: "https://example.com/feed.xml",
      title: "Demo",
      episodes: [
        {
          guid: "ep-1",
          title: "One",
          enclosureUrl: "https://cdn.example.com/a.mp3",
          dedupKey: "d1",
        },
      ],
    },
  ]),
}));

import { playbackHeaders, resolvePodcastAudioUrl } from "../src/musicUrl";

describe("resolvePodcastAudioUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enclosureUrl with User-Agent / Referer", async () => {
    const r = await resolvePodcastAudioUrl({
      enclosureUrl: "https://cdn.example.com/ep.mp3",
      feedId: "feed1",
      guid: "ep-1",
    });
    expect(r.url).toBe("https://cdn.example.com/ep.mp3");
    expect(r.headers["User-Agent"]).toMatch(/SongloftPodcast/);
    expect(r.headers.Referer).toBe("https://cdn.example.com/");
  });

  it("falls back to subscription index when enclosureUrl missing", async () => {
    const r = await resolvePodcastAudioUrl({
      feedId: "feed1",
      guid: "ep-1",
    });
    expect(r.url).toBe("https://cdn.example.com/a.mp3");
  });

  it("throws when nothing resolvable", async () => {
    await expect(resolvePodcastAudioUrl({ feedId: "nope", guid: "x" })).rejects.toThrow(
      /enclosureUrl/
    );
  });
});

describe("playbackHeaders", () => {
  it("always sets User-Agent", () => {
    expect(playbackHeaders()["User-Agent"]).toMatch(/SongloftPodcast/);
  });
});
