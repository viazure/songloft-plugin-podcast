import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  adoptLegacySlots,
  emptyLedger,
  loadCastLedger,
  normalizeLedger,
  saveCastLedger,
  selectCanonicalSlot,
  type CastSlot,
} from "../src/castLedger";

function slot(partial: Partial<CastSlot> & { playlistId: number }): CastSlot {
  return {
    targetKey: partial.targetKey || "device:acc1:dev1",
    name: partial.name || `表 ${partial.playlistId}`,
    description: partial.description || "插件投放列表，供音箱播放使用",
    songFingerprint: partial.songFingerprint || "1,2",
    generation: partial.generation || 1,
    role: partial.role || "idle",
    playIssued: partial.playIssued === true,
    trust: partial.trust || "ours",
    kind: partial.kind || "list",
    createdAt: partial.createdAt || 1,
    updatedAt: partial.updatedAt || 1,
    ...partial,
  };
}

describe("selectCanonicalSlot", () => {
  it("prefers the newest current owned table and never picks by name or external trust", () => {
    const slots = [
      slot({ playlistId: 10, role: "current", updatedAt: 5, generation: 3, name: "播客投放" }),
      slot({ playlistId: 11, role: "current", updatedAt: 9, generation: 2, name: "别的名字" }),
      slot({ playlistId: 12, role: "idle", updatedAt: 20, generation: 9, name: "播客投放" }),
      slot({ playlistId: 13, role: "current", updatedAt: 9, generation: 2, trust: "external" }),
    ];
    expect(selectCanonicalSlot(slots)?.playlistId).toBe(11);
  });

  it("falls back to the newest owned idle table when no current exists, then lowest id on ties", () => {
    const slots = [
      slot({ playlistId: 21, role: "idle", updatedAt: 4, generation: 2 }),
      slot({ playlistId: 8, role: "idle", updatedAt: 4, generation: 2 }),
      slot({ playlistId: 30, role: "idle", updatedAt: 3, generation: 8, trust: "external" }),
    ];
    expect(selectCanonicalSlot(slots)?.playlistId).toBe(8);
  });

  it("returns null when there is no owned table, even if names look familiar", () => {
    expect(
      selectCanonicalSlot([
        slot({ playlistId: 5, trust: "external", role: "current", name: "播客投放" }),
      ])
    ).toBeNull();
  });
});

describe("legacy ledger adoption", () => {
  it("keeps one owned id and lists the rest as leftovers without inventing new ids", () => {
    const adopted = adoptLegacySlots(
      [
        slot({ playlistId: 11, role: "current", updatedAt: 8, targetKey: "device:acc1:devA" }),
        slot({ playlistId: 12, role: "idle", updatedAt: 7, targetKey: "device:acc1:devA" }),
        slot({ playlistId: 13, role: "current", updatedAt: 2, trust: "external", targetKey: "device:acc1:devB" }),
      ],
      { "device:acc1:devA": 4, "device:acc1:devB": 9 }
    );
    expect(adopted.version).toBe(2);
    expect(adopted.playlist?.playlistId).toBe(11);
    expect(adopted.leftovers.map((r) => r.playlistId)).toEqual([12, 13]);
    expect(adopted.generation).toBe(9);
  });

  it("normalizes a v1 storage payload the same way", () => {
    const ledger = normalizeLedger({
      version: 1,
      slots: [slot({ playlistId: 4, role: "current", updatedAt: 3 })],
      generations: { "device:acc1:dev1": 3 },
    });
    expect(ledger.playlist?.playlistId).toBe(4);
    expect(ledger.leftovers).toEqual([]);
    expect(ledger.generation).toBe(3);
  });
});

describe("ledger persistence", () => {
  beforeEach(() => {
    const bag: Record<string, unknown> = {};
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
  });
  afterEach(() => {
    delete (globalThis as unknown as { songloft?: unknown }).songloft;
  });

  it("round-trips a v2 ledger and adopts v1 on load", async () => {
    const v2 = emptyLedger();
    v2.generation = 5;
    v2.playlist = {
      playlistId: 9,
      name: "播客投放",
      description: "插件投放列表，供音箱播放使用",
      songFingerprint: "1,2",
      generation: 5,
      playIssued: true,
      trust: "ours",
      kind: "list",
      createdAt: 10,
      updatedAt: 11,
    };
    await saveCastLedger(v2);
    const loaded = await loadCastLedger();
    expect(loaded.playlist?.playlistId).toBe(9);
    expect(loaded.generation).toBe(5);
  });
});