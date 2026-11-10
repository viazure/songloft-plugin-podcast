import { describe, it, expect } from "vitest";
import { pickPlayedSongIds } from "../src/queueFilters";

describe("pickPlayedSongIds", () => {
  it("uses per-song progress completion", () => {
    const ids = pickPlayedSongIds([
      { id: 1, progress: { completed: true } },
      { id: 2, progress: { completed: false } },
      { id: 3, progress: null },
    ]);
    expect(ids).toEqual([1]);
  });

  it("also honours completed progress rows keyed by lastSongId", () => {
    const ids = pickPlayedSongIds(
      [{ id: 7 }, { id: 8 }, { id: 9 }],
      [
        { lastSongId: 8, completed: true },
        { lastSongId: 9, completed: false },
        { lastSongId: null, completed: true },
      ]
    );
    expect(ids).toEqual([8]);
  });

  it("de-duplicates and preserves queue order", () => {
    const ids = pickPlayedSongIds(
      [
        { id: 5, progress: { completed: true } },
        { id: 2, progress: { completed: true } },
        { id: 5, progress: { completed: true } },
      ],
      [{ lastSongId: 2, completed: true }]
    );
    expect(ids).toEqual([5, 2]);
  });

  it("returns nothing for an empty queue", () => {
    expect(pickPlayedSongIds([], [{ lastSongId: 1, completed: true }])).toEqual([]);
  });
});
