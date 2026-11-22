import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("refresh busy UX copy and wiring", () => {
  const root = process.cwd();
  const feed = fs.readFileSync(path.join(root, "ui/lib/feedRefresh.js"), "utf8");
  const recent = fs.readFileSync(path.join(root, "ui/views/recent.js"), "utf8");
  const channel = fs.readFileSync(path.join(root, "ui/views/channel-dialog.js"), "utf8");
  const subs = fs.readFileSync(path.join(root, "ui/views/subs.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "static/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "static/css/app.css"), "utf8");

  it("uses one shared busy toast and never surfaces skipped_busy", () => {
    expect(feed).toMatch(/REFRESH_BUSY_TOAST = "正在刷新，请稍候。"/);
    expect(feed).toMatch(/REFRESH_STILL_RUNNING_TOAST = "刷新仍在进行，稍后下拉查看。"/);
    expect(feed).not.toMatch(/忙碌中，请稍后/);
    expect(recent).not.toMatch(/忙碌中，请稍后/);
    expect(recent).not.toMatch(/notify\(String\(e\)/);
    expect(channel).toMatch(/humanizeRefreshFailure/);
    expect(channel).toMatch(/isSkippedBusy\(e\)/);
    expect(feed).not.toMatch(/Error: skipped_busy/);
    expect(recent).not.toMatch(/Error: skipped_busy/);
  });

  it("keeps refresh controls clickable with spinner / menu label busy affordances", () => {
    expect(feed).toMatch(/noop: true/);
    expect(feed).toMatch(/applyRefreshButtonBusy/);
    expect(feed).not.toMatch(/btn\.disabled = !!busy/);
    expect(css).not.toMatch(/\.icon-btn\.is-refreshing\s*\{[^}]*pointer-events:\s*none/s);
    expect(html).toMatch(/id="recentRefreshHint"/);
    expect(recent).toMatch(/applyRefreshHint/);
    expect(recent).toMatch(/if \(isFeedRefreshing\(\)\) return/);
    expect(channel).toMatch(/runFeedRefreshOne/);
    expect(subs).toMatch(/REFRESH_MENU_BUSY_LABEL/);
    expect(subs).toMatch(/applyRefreshMenuBusy/);
    expect(subs).toMatch(/runFeedRefreshOne/);
  });
});

