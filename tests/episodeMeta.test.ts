import { describe, expect, it } from "vitest";
import {
  enrichHistoryEntry,
  findEpisodeMeta,
  isPlaceholderTitle,
} from "../ui/lib/episodeMeta.js";

const FEED = "https://feed.xyzfm.space/m3dda867gh7j";
const GUID = "6aa41efc492687f6aad88f7f";
const TITLE = "No.233 单口｜手机为什么要折叠？Apple 为什么要「跟风」？";

const subs = [
  {
    id: "san",
    url: FEED,
    title: "三五环",
    episodes: [
      {
        title: TITLE,
        guid: GUID,
        coverUrl: "https://cdn/ep.jpg",
        durationSec: 3600,
        dedupKey: "dk",
      },
    ],
  },
];

describe("episodeMeta", () => {
  it("treats empty and Untitled as placeholders, not a real title", () => {
    expect(isPlaceholderTitle("")).toBe(true);
    expect(isPlaceholderTitle("  ")).toBe(true);
    expect(isPlaceholderTitle("Untitled")).toBe(true);
    expect(isPlaceholderTitle(TITLE)).toBe(false);
  });

  it("finds display fields by feedUrl+guid, including a normalised feed URL", () => {
    const meta = findEpisodeMeta(subs, FEED + "/", GUID);
    expect(meta).toMatchObject({
      title: TITLE,
      showTitle: "三五环",
      coverUrl: "https://cdn/ep.jpg",
      durationSec: 3600,
    });
  });

  it("fills an Untitled history row without mutating the original", () => {
    const entry = {
      feedUrl: FEED,
      guid: GUID,
      title: "Untitled",
      showTitle: "",
      coverUrl: null,
    };
    const next = enrichHistoryEntry(entry, subs);
    expect(next.title).toBe(TITLE);
    expect(next.showTitle).toBe("三五环");
    expect(next.coverUrl).toBe("https://cdn/ep.jpg");
    expect(entry.title).toBe("Untitled");
  });

  it("leaves a real title alone and does nothing without a match", () => {
    const kept = enrichHistoryEntry(
      { feedUrl: FEED, guid: GUID, title: "Already good", showTitle: "X" },
      subs
    );
    expect(kept.title).toBe("Already good");
    expect(kept.showTitle).toBe("X");
    const miss = enrichHistoryEntry(
      { feedUrl: FEED, guid: "nope", title: "Untitled", showTitle: "" },
      subs
    );
    expect(miss.title).toBe("Untitled");
  });
});
