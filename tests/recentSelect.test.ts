import { describe, expect, it } from "vitest";
import { selectRecentRows } from "../src/recentSelect";

type Ep = { title: string; pubDateMs: number | null };

function source(id: string, updatedAt: number, episodes: Ep[]) {
  return { id, url: `https://example.com/${id}.xml`, title: id, updatedAt, episodes };
}

const sortMsOf = (ep: Ep, sub: { updatedAt: number }) => ep.pubDateMs ?? sub.updatedAt;

describe("selectRecentRows", () => {
  it("returns the newest N across all subscriptions, newest first", () => {
    const subs = [
      source("a", 1, [
        { title: "a-old", pubDateMs: 100 },
        { title: "a-new", pubDateMs: 900 },
      ]),
      source("b", 2, [
        { title: "b-mid", pubDateMs: 500 },
        { title: "b-newest", pubDateMs: 1000 },
      ]),
    ];
    const rows = selectRecentRows(subs, 3, sortMsOf);
    expect(rows.map((r) => r.episode.title)).toEqual(["b-newest", "a-new", "b-mid"]);
    expect(rows.every((r) => r.feedUrl.startsWith("https://example.com/"))).toBe(true);
  });

  it("matches a full sort + slice on the same fixtures", () => {
    const subs = [
      source("a", 7, Array.from({ length: 50 }, (_, i) => ({ title: `a${i}`, pubDateMs: i * 10 }))),
      source("b", 3, Array.from({ length: 50 }, (_, i) => ({ title: `b${i}`, pubDateMs: i * 10 + 5 }))),
      source("c", 99, Array.from({ length: 50 }, (_, i) => ({ title: `c${i}`, pubDateMs: null }))),
    ];
    const all = [];
    for (const s of subs) for (const ep of s.episodes) all.push({ ep, s, sortMs: sortMsOf(ep, s) });
    const expected = all
      .map((x, order) => ({ ...x, order }))
      .sort((a, b) => (b.sortMs - a.sortMs) || (a.order - b.order))
      .slice(0, 40)
      .map((x) => x.ep.title);

    const actual = selectRecentRows(subs, 40, sortMsOf).map((r) => r.episode.title);
    expect(actual).toEqual(expected);
  });

  it("keeps tie-breaking stable by discovery order (earlier subscription wins)", () => {
    const subs = [
      source("first", 0, [{ title: "first-tie", pubDateMs: 500 }]),
      source("second", 0, [{ title: "second-tie", pubDateMs: 500 }]),
    ];
    const rows = selectRecentRows(subs, 5, sortMsOf);
    expect(rows.map((r) => r.episode.title)).toEqual(["first-tie", "second-tie"]);
  });

  it("carries the subscription identity needed by the response", () => {
    const rows = selectRecentRows([source("abc", 1, [{ title: "e", pubDateMs: 5 }])], 1, sortMsOf);
    expect(rows[0]).toMatchObject({
      subscriptionId: "abc",
      feedUrl: "https://example.com/abc.xml",
      showTitle: "abc",
    });
  });

  it("handles empty, zero-limit and malformed input without throwing", () => {
    expect(selectRecentRows([], 40, sortMsOf)).toEqual([]);
    expect(selectRecentRows([source("a", 1, [{ title: "e", pubDateMs: 1 }])], 0, sortMsOf)).toEqual(
      []
    );
    expect(
      selectRecentRows(
        [{ id: "x", url: "u", title: "t", updatedAt: 0, episodes: undefined as unknown as Ep[] }],
        5,
        sortMsOf
      )
    ).toEqual([]);
  });

  it("keeps only `limit` rows even when a subscription is deep", () => {
    const deep = source(
      "deep",
      0,
      Array.from({ length: 200 }, (_, i) => ({ title: `e${i}`, pubDateMs: i }))
    );
    const rows = selectRecentRows([deep], 40, sortMsOf);
    expect(rows).toHaveLength(40);
    expect(rows[0].episode.title).toBe("e199");
    expect(rows[39].episode.title).toBe("e160");
  });
});
