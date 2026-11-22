import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("tab loads stay independent of feed refresh", () => {
  const history = fs.readFileSync(path.join(process.cwd(), "ui/views/history.js"), "utf8");
  const queue = fs.readFileSync(path.join(process.cwd(), "ui/views/queue.js"), "utf8");
  const main = fs.readFileSync(path.join(process.cwd(), "ui/main.js"), "utf8");
  const recent = fs.readFileSync(path.join(process.cwd(), "ui/views/recent.js"), "utf8");

  it("paints cached history before awaiting reload", () => {
    const fn = history.slice(history.indexOf("export async function loadHistoryView"));
    const renderAt = fn.indexOf("renderHistory()");
    const reloadAt = fn.indexOf("reloadHistory()");
    expect(renderAt).toBeGreaterThanOrEqual(0);
    expect(reloadAt).toBeGreaterThan(renderAt);
  });

  it("paints cached queue before a panel refresh reload", () => {
    expect(queue).toMatch(/act === "refresh"\) \{\s*renderQueue\(\);\s*await reloadQueue\(\);/s);
  });

  it("starts feed refresh only when cold/stale and not on every tab switch", () => {
    expect(main).toMatch(/bootFeedRefreshStarted/);
    expect(main).toMatch(/startConditionalFeedRefresh/);
    expect(main).toMatch(/needsInitialFeedRefresh/);
    expect(main).toMatch(/shouldBackgroundFeedRefresh/);
    expect(main).toMatch(/isScheduleFeedFresh|shouldBootFeedRefresh/);
    expect(main).toMatch(/quietBusy:\s*true/);
    expect(main).toMatch(/loadUiCache/);
    expect(main).not.toMatch(/startBootFeedRefreshOnce/);
    const switchTab = main.slice(main.indexOf("function switchTab"), main.indexOf("function bindNav"));
    expect(switchTab).not.toMatch(/requestFeedRefresh|refreshAll/);
  });

  it("wires the recent refresh button to the shared busy emitter", () => {
    expect(recent).toMatch(/onFeedRefreshState\(\(busy\) => \{[\s\S]*applyRefreshButtonBusy\(btn, busy\)/);
    expect(recent).toMatch(/requestFeedRefresh/);
  });
});
