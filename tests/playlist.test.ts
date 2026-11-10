import { describe, expect, it } from "vitest";
import { allocatePlaylistName } from "../src/playlist";

describe("allocatePlaylistName (unique fixed-queue naming)", () => {
  it("returns preferred when free", () => {
    expect(allocatePlaylistName("播客", [])).toBe("播客");
  });

  it("suffixes when taken", () => {
    expect(allocatePlaylistName("播客", ["播客"])).toBe("播客 (插件)");
  });
});
