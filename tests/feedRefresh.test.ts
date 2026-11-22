import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_BUSY_TOAST,
  __resetFeedRefreshForTests,
  applyRefreshButtonBusy,
  humanizeRefreshFailure,
  isFeedRefreshing,
  isSkippedBusy,
  onFeedRefreshState,
  runFeedRefresh,
  runFeedRefreshOne,
  waitUntilFeedRefreshIdle,
} from "../ui/lib/feedRefresh.js";

afterEach(() => {
  __resetFeedRefreshForTests();
});

describe("runFeedRefresh", () => {
  it("returns noop when a refresh is already in flight instead of starting another", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const refreshAll = vi.fn(async () => {
      await gate;
      return { ok: true, started: true };
    });
    const p1 = runFeedRefresh({ refreshAll });
    const p2 = runFeedRefresh({ refreshAll });
    expect(isFeedRefreshing()).toBe(true);
    expect(refreshAll).toHaveBeenCalledTimes(1);
    await expect(p2).resolves.toEqual({ noop: true });
    release();
    await p1;
    expect(isFeedRefreshing()).toBe(false);
  });

  it("clears busy after refreshAll throws a real error", async () => {
    const states: boolean[] = [];
    const stop = onFeedRefreshState((busy) => states.push(busy));
    await expect(
      runFeedRefresh({
        refreshAll: async () => {
          throw new Error("network down");
        },
      })
    ).rejects.toThrow(/network down/);
    stop();
    expect(isFeedRefreshing()).toBe(false);
    expect(states).toContain(true);
    expect(states[states.length - 1]).toBe(false);
  });

  it("maps skipped_busy throws into a skipped result instead of rejecting", async () => {
    const result = await runFeedRefresh({
      refreshAll: async () => {
        throw new Error("skipped_busy");
      },
    });
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(isSkippedBusy(result)).toBe(true);
    expect(humanizeRefreshFailure(result)).toBe(REFRESH_BUSY_TOAST);
    expect(humanizeRefreshFailure(result)).not.toMatch(/skipped_busy/);
  });

  it("waits for refreshBusy to clear when the accept path returns started", async () => {
    let busy = true;
    const api = {
      status: vi.fn(async () => {
        const snapshot = { refreshBusy: busy };
        busy = false;
        return snapshot;
      }),
    };
    const after = vi.fn(async () => undefined);
    await runFeedRefresh({
      refreshAll: async () => ({ ok: true, started: true }),
      afterRefresh: async (r) => {
        const wait = await waitUntilFeedRefreshIdle(api, { pollMs: 1, timeoutMs: 1000 });
        expect(wait.timedOut).toBe(false);
        await after(r);
      },
    });
    expect(after).toHaveBeenCalledTimes(1);
    expect(api.status.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("shares busy across full refresh and single refresh", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const p1 = runFeedRefresh({
      refreshAll: async () => {
        await gate;
        return { ok: true, started: true };
      },
    });
    const one = await runFeedRefreshOne({
      refreshOne: async () => ({ ok: true }),
    });
    expect(one).toEqual({ noop: true });
    release();
    await p1;
  });
});

describe("applyRefreshButtonBusy", () => {
  it("swaps the icon for a .q-spinner while busy without disabling the control", () => {
    const idleHtml =
      '<span data-icon="rotateCcw" data-size="16" class="ico" style="width:16px;height:16px"></span>';
    const classes = new Set<string>();
    const attrs = new Map<string, string>();
    const dataset: Record<string, string> = {};
    const btn = {
      disabled: false,
      innerHTML: idleHtml,
      dataset,
      classList: {
        add: (name: string) => {
          classes.add(name);
        },
        remove: (name: string) => {
          classes.delete(name);
        },
        contains: (name: string) => classes.has(name),
      },
      setAttribute: (name: string, value: string) => {
        attrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        attrs.delete(name);
      },
      getAttribute: (name: string) => (attrs.has(name) ? attrs.get(name)! : null),
      hasAttribute: (name: string) => attrs.has(name),
      querySelector: (sel: string) => {
        if (sel.includes("q-spinner")) {
          return String(btn.innerHTML).includes("q-spinner") ? {} : null;
        }
        if (sel.includes("data-size") || sel.includes(".ico") || sel.includes("data-icon")) {
          if (!String(btn.innerHTML).includes("rotateCcw") && !String(btn.innerHTML).includes("data-size")) {
            return null;
          }
          return {
            getAttribute: (name: string) => {
              if (name === "data-size") return "16";
              if (name === "style") return "width:16px;height:16px";
              return null;
            },
          };
        }
        return null;
      },
    };
    applyRefreshButtonBusy(btn as unknown as HTMLElement, true);
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(btn.classList.contains("is-refreshing")).toBe(true);
    expect(String(btn.innerHTML)).toMatch(/q-spinner/);
    applyRefreshButtonBusy(btn as unknown as HTMLElement, false);
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute("aria-busy")).toBe(false);
    expect(String(btn.innerHTML)).toMatch(/rotateCcw/);
  });
});

describe("skipped_busy copy", () => {
  it("never exposes the raw reason code in humanized text", () => {
    expect(isSkippedBusy(new Error("skipped_busy"))).toBe(true);
    expect(isSkippedBusy({ ok: false, skipped: true, error: "skipped_busy" })).toBe(true);
    expect(humanizeRefreshFailure(new Error("Error: skipped_busy"))).toBe(REFRESH_BUSY_TOAST);
    expect(humanizeRefreshFailure(new Error("skipped_busy"))).not.toMatch(/skipped_busy/);
    expect(REFRESH_BUSY_TOAST).toBe("正在刷新，请稍候。");
    expect(REFRESH_BUSY_TOAST).not.toMatch(/忙碌中/);
  });
});
