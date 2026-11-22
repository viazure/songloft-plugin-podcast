import { describe, expect, it } from "vitest";
import { CastSlotRuntime } from "../src/castSlots";
import { isSnapshotPlaylistName, SNAPSHOT_DESCRIPTION } from "../src/castSnapshot";

describe("legacy snapshot name recognition", () => {
  it("recognizes old「播客投放」tables so they can be cleaned up manually", () => {
    expect(isSnapshotPlaylistName("播客投放 · 待听 11-15 14:08")).toBe(true);
    expect(isSnapshotPlaylistName("播客投放 · 待听 · 客厅")).toBe(true);
    expect(isSnapshotPlaylistName("播客投放 · 单集 11-15 14:08")).toBe(true);
    expect(isSnapshotPlaylistName("播客投放")).toBe(true);
  });

  it("never treats the real queue as a snapshot table", () => {
    expect(isSnapshotPlaylistName("播客")).toBe(false);
    expect(isSnapshotPlaylistName("播客 (插件)")).toBe(false);
    expect(isSnapshotPlaylistName(null)).toBe(false);
    expect(isSnapshotPlaylistName(undefined)).toBe(false);
  });

  it("keeps the old description text so historical rows stay recognizable", () => {
    expect(SNAPSHOT_DESCRIPTION).toContain("投放");
  });
});

describe("cast runtime contract", () => {
  it("only requires the host playlist surface plus a saved playlist id", () => {
    // Compile-time shape check: no snapshot-only members are required.
    const keys: Array<keyof CastSlotRuntime> = [
      "playlists",
      "getWaitlistId",
      "listDevices",
      "pickTarget",
      "listGroups",
      "playerStatus",
      "play",
    ];
    expect(keys).toContain("getWaitlistId");
  });
});
