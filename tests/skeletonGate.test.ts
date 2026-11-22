import { describe, expect, it, vi } from "vitest";
import {
  SKELETON_DELAY_MS,
  createSkeletonGate,
  episodeSkeletonHtml,
} from "../ui/lib/skeletonGate.js";

describe("skeletonGate", () => {
  it("documents the engineering anti-flash delay (no design-spec threshold found)", () => {
    expect(SKELETON_DELAY_MS).toBe(200);
  });

  it("does not flash skeleton when content arrives before the delay", () => {
    const timers: Array<{ ms: number; fn: () => void }> = [];
    let has = false;
    const show = vi.fn();
    const gate = createSkeletonGate({
      delayMs: 200,
      hasContent: () => has,
      show,
      setTimeout: ((fn: () => void, ms: number) => {
        timers.push({ fn, ms });
        return timers.length;
      }) as unknown as typeof setTimeout,
      clearTimeout: ((id: number) => {
        const idx = id - 1;
        if (timers[idx]) timers[idx].fn = () => undefined;
      }) as unknown as typeof clearTimeout,
    });
    gate.start();
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(200);
    has = true;
    gate.stop();
    timers[0].fn();
    expect(show).not.toHaveBeenCalled();
    expect(gate.wasShown()).toBe(false);
  });

  it("shows skeleton only after the delay when still empty", () => {
    const timers: Array<{ ms: number; fn: () => void }> = [];
    const show = vi.fn();
    const gate = createSkeletonGate({
      delayMs: 200,
      hasContent: () => false,
      show,
      setTimeout: ((fn: () => void, ms: number) => {
        timers.push({ fn, ms });
        return 1;
      }) as unknown as typeof setTimeout,
      clearTimeout: vi.fn() as unknown as typeof clearTimeout,
    });
    gate.start();
    timers[0].fn();
    expect(show).toHaveBeenCalledTimes(1);
    expect(gate.wasShown()).toBe(true);
  });

  it("renders compact skeleton markup", () => {
    const html = episodeSkeletonHtml(2);
    expect(html.match(/class="ep-skel"/g)?.length).toBe(2);
    expect(html).toMatch(/ep-skel__cover/);
    expect(html).toMatch(/ep-skel__line--short/);
  });
});
