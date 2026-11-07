import { describe, expect, it, vi } from "vitest";
import {
  RefreshScheduler,
  normalizeIntervalHours,
  computeNextDueAt,
  DEFAULT_REFRESH_SCHEDULE,
} from "../src/schedule";

describe("normalizeIntervalHours", () => {
  it("defaults to 6", () => {
    expect(normalizeIntervalHours(6)).toBe(6);
    expect(normalizeIntervalHours(12)).toBe(12);
    expect(normalizeIntervalHours(99)).toBe(6);
    expect(DEFAULT_REFRESH_SCHEDULE.enabled).toBe(false);
    expect(DEFAULT_REFRESH_SCHEDULE.intervalHours).toBe(6);
  });
});

describe("RefreshScheduler", () => {
  it("enable arms future due without immediate fire", async () => {
    let now = 1_000_000;
    const timers: Array<{ ms: number; fn: () => void }> = [];
    const sched = new RefreshScheduler({
      now: () => now,
      setTimeout: (fn, ms) => {
        timers.push({ ms, fn });
        return timers.length as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => {},
    });
    const tick = vi.fn(async () => {});
    sched.setOnTick(tick);
    await sched.applyState({ enabled: true, intervalHours: 6 }, { persist: false });
    const st = sched.getState();
    expect(st.nextDueAt).toBe(computeNextDueAt(now, 6));
    expect(timers).toHaveLength(1);
    expect(tick).not.toHaveBeenCalled();
  });

  it("runExclusive skips when busy", async () => {
    const sched = new RefreshScheduler();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const p1 = sched.runExclusive(async () => {
      await gate;
      return 1;
    });
    const p2 = sched.runExclusive(async () => 2);
    const second = await p2;
    expect(second).toEqual({ skipped: true, reason: "skipped_busy" });
    release();
    const first = await p1;
    expect(first).toEqual({ skipped: false, result: 1 });
  });
});
