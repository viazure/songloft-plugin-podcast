import { describe, expect, it } from "vitest";
import {
  MAX_EPISODE_PAGE,
  mergeEpisodeIndex,
  mergeSongIds,
  pageEpisodes,
  parseStaleHistoryIndex,
} from "../src/episodeIndex";
import { MAX_HISTORY_INDEX, type EpisodeSummary } from "../src/store";

function ep(id: number, extra: Partial<EpisodeSummary> = {}): EpisodeSummary {
  return {
    title: `Ep ${id}`,
    guid: `g-${id}`,
    guidSource: "rss",
    pubDate: null,
    pubDateMs: id * 1000,
    durationSec: 60,
    coverUrl: null,
    enclosureUrl: `https://cdn.example.com/${id}.mp3`,
    dedupKey: `d-${id}`,
    description: null,
    ...extra,
  };
}

describe("mergeEpisodeIndex", () => {
  const incoming = [ep(5), ep(4), ep(3), ep(2), ep(1)];

  it("keeps only the newest window and copies songIds during auto index", () => {
    const prev = [ep(5, { songId: 99, title: "old title" }), ep(4)];
    const merged = mergeEpisodeIndex(prev, incoming, { mode: "window", windowSize: 3 });
    expect(merged.feedCount).toBe(5);
    expect(merged.truncated).toBe(true);
    expect(merged.episodes.map((e) => e.guid)).toEqual(["g-5", "g-4", "g-3"]);
    expect(merged.episodes[0].songId).toBe(99);
    expect(merged.episodes[0].title).toBe("Ep 5");
    expect(merged.capped).toBe(false);
  });

  it("is idempotent and keeps older rows after a history index", () => {
    const first = mergeEpisodeIndex([], incoming, {
      mode: "history",
      windowSize: 50,
      cap: 10,
    });
    expect(first.episodes).toHaveLength(5);
    const again = mergeEpisodeIndex(first.episodes, incoming, {
      mode: "history",
      windowSize: 50,
      cap: 10,
    });
    expect(again.episodes.map((e) => e.guid)).toEqual(first.episodes.map((e) => e.guid));
  });

  it("does not drop a deep index on a later shallow auto refresh", () => {
    const deep = mergeEpisodeIndex([], incoming, { mode: "history", windowSize: 50, cap: 10 });
    const next = mergeEpisodeIndex(deep.episodes, incoming, {
      mode: "window",
      windowSize: 2,
      keepPrevious: true,
      cap: 10,
      pinnedEarliestKey: deep.earliestDedupKey,
      pinnedEarliestConfirmed: deep.earliestConfirmed,
    });
    expect(next.episodes.map((e) => e.guid)).toEqual(["g-5", "g-4", "g-3", "g-2", "g-1"]);
  });

  it("when over the cap, keeps the pinned earliest plus the newest cap-1", () => {
    const many = Array.from({ length: 15 }, (_, i) => ep(15 - i));
    const merged = mergeEpisodeIndex([], many, {
      mode: "history",
      windowSize: 50,
      cap: 10,
    });
    const guids = merged.episodes.map((e) => e.guid);
    expect(merged.episodes).toHaveLength(10);
    expect(merged.capped).toBe(true);
    expect(merged.earliestKept).toBe(true);
    expect(guids[0]).toBe("g-15");
    expect(guids).toContain("g-1");
    expect(guids).not.toContain("g-2");
    expect(merged.earliestDedupKey).toBe("d-1");
  });

  it("defaults the history cap to MAX_HISTORY_INDEX, not the auto window", () => {
    const many = Array.from({ length: 230 }, (_, i) => ep(230 - i));
    const merged = mergeEpisodeIndex([], many, { mode: "history", windowSize: 50 });
    expect(merged.episodes).toHaveLength(230);
    expect(merged.capped).toBe(false);
    expect(merged.episodes.some((e) => e.guid === "g-1")).toBe(true);
    expect(MAX_HISTORY_INDEX).toBe(2000);
  });
});

describe("pageEpisodes", () => {
  const rows = [1, 2, 3, 4, 5];

  it("pages without dropping earlier items", () => {
    expect(pageEpisodes(rows, 0, 2)).toMatchObject({
      items: [1, 2],
      total: 5,
      hasMore: true,
      nextOffset: 2,
    });
    expect(pageEpisodes(rows, 2, 2)).toMatchObject({
      items: [3, 4],
      hasMore: true,
      nextOffset: 4,
    });
    expect(pageEpisodes(rows, 4, 2)).toMatchObject({
      items: [5],
      hasMore: false,
      nextOffset: 5,
    });
  });

  it("returns the full list when no limit is given, even past 200", () => {
    const many = Array.from({ length: 230 }, (_, i) => i + 1);
    const all = pageEpisodes(many, 0);
    expect(all.items).toHaveLength(230);
    expect(all.hasMore).toBe(false);
    expect(all.items[229]).toBe(230);
    expect(MAX_EPISODE_PAGE).toBe(100);
    const first = pageEpisodes(many, 0, 500);
    expect(first.items).toHaveLength(MAX_EPISODE_PAGE);
    expect(first.hasMore).toBe(true);
    const last = pageEpisodes(many, 200, 100);
    expect(last.items).toHaveLength(30);
    expect(last.hasMore).toBe(false);
    expect(last.items[29]).toBe(230);
  });
});

describe("mergeSongIds and stale status", () => {
  it("copies songId by dedupKey", () => {
    const next = mergeSongIds([ep(1, { songId: 7 })], [ep(1), ep(2)]);
    expect(next[0].songId).toBe(7);
    expect(next[1].songId).toBeUndefined();
  });

  it("clears a stuck running status after it goes stale", () => {
    const fresh = parseStaleHistoryIndex("running", Date.now(), Date.now(), 1000);
    expect(fresh.status).toBe("running");
    const stale = parseStaleHistoryIndex("running", Date.now() - 5000, Date.now(), 1000);
    expect(stale.status).toBe("error");
    expect(stale.error).toMatch(/重试/);
  });
});