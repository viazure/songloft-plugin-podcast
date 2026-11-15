import { describe, expect, it } from "vitest";
import { recentListSignature } from "../ui/views/recent.js";

const ep = (over = {}) => ({
  feedUrl: "https://feed.example/show",
  guid: "g-1",
  title: "一期",
  favorited: false,
  coverUrl: "https://img.example/a.jpg",
  pubDateMs: 1,
  progress: { positionSec: 0, completed: false },
  ...over,
});

describe("recentListSignature", () => {
  it("is empty for a missing or blank list", () => {
    expect(recentListSignature([])).toBe("empty");
    expect(recentListSignature(null)).toBe("empty");
  });

  it("stays stable when only queue-related fields change", () => {
    const a = recentListSignature([ep(), ep({ guid: "g-2", title: "二期" })]);
    const b = recentListSignature([
      ep({ inQueue: true, songId: 11 }),
      ep({ guid: "g-2", title: "二期", songId: 12 }),
    ]);
    expect(a).toBe(b);
  });

  it("changes when title, favorite, cover, progress or identity changes", () => {
    const base = recentListSignature([ep()]);
    expect(recentListSignature([ep({ title: "改了" })])).not.toBe(base);
    expect(recentListSignature([ep({ favorited: true })])).not.toBe(base);
    expect(recentListSignature([ep({ coverUrl: "https://img.example/b.jpg" })])).not.toBe(base);
    expect(recentListSignature([ep({ progress: { positionSec: 30, completed: false } })])).not.toBe(
      base
    );
    expect(recentListSignature([ep({ guid: "other" })])).not.toBe(base);
    expect(recentListSignature([ep(), ep({ guid: "g-2" })])).not.toBe(base);
  });
});
