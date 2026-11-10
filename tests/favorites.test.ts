import { beforeEach, describe, expect, it } from "vitest";
import { loadFavorites, toggleFavorite } from "../src/store";

type Bag = Record<string, unknown>;

function installStorage() {
  const bag: Bag = {};
  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
  };
  return bag;
}

describe("favorites", () => {
  beforeEach(() => {
    installStorage();
  });

  it("toggles favorite on and off", async () => {
    const on = await toggleFavorite({
      feedUrl: "https://example.com/feed.xml",
      guid: "g1",
      title: "Ep 1",
      showTitle: "Show",
    });
    expect(on.favorited).toBe(true);
    expect(on.favorites).toHaveLength(1);

    const listed = await loadFavorites();
    expect(listed[0].title).toBe("Ep 1");

    const off = await toggleFavorite({
      feedUrl: "https://example.com/feed.xml",
      guid: "g1",
    });
    expect(off.favorited).toBe(false);
    expect(off.favorites).toHaveLength(0);
  });
});
