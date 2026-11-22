import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("subscription refresh entry points", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");
  const subs = fs.readFileSync(path.join(process.cwd(), "ui/views/subs.js"), "utf8");
  const recent = fs.readFileSync(path.join(process.cwd(), "ui/views/recent.js"), "utf8");
  const feedRefresh = fs.readFileSync(path.join(process.cwd(), "ui/lib/feedRefresh.js"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "static/css/app.css"), "utf8");
  const channel = fs.readFileSync(path.join(process.cwd(), "ui/views/channel-dialog.js"), "utf8");

  it("removes the subscriptions toolbar refresh-all control", () => {
    expect(html).not.toMatch(/id="btnRefreshAll"/);
    expect(html).not.toMatch(/title="刷新全部"/);
    expect(subs).not.toMatch(/btnRefreshAll/);
    expect(subs).not.toMatch(/\brunFeedRefresh\(/);
    expect(subs).toMatch(/runFeedRefreshOne/);
    expect(subs).not.toMatch(/applyRefreshButtonBusy/);
  });

  it("keeps per-subscription refresh, channel refresh, and recent refresh", () => {
    expect(subs).toMatch(/api\.refreshOne/);
    expect(subs).toMatch(/REFRESH_MENU_IDLE_LABEL/);
    expect(subs).toMatch(/REFRESH_MENU_BUSY_LABEL/);
    expect(channel).toMatch(/channelRefresh/);
    expect(channel).toMatch(/api\.refreshOne/);
    expect(html).toMatch(/id="btnRecentRefresh"/);
    expect(recent).toMatch(/btnRecentRefresh/);
    expect(recent).toMatch(/applyRefreshButtonBusy\(btn, busy\)/);
  });

  it("uses .q-spinner for refresh busy instead of spinning the Lucide icon", () => {
    expect(feedRefresh).toMatch(/class="q-spinner"/);
    expect(feedRefresh).toMatch(/refreshIdleHtml/);
    expect(feedRefresh).not.toMatch(/classList\.toggle\("is-refreshing"/);
    expect(css).toMatch(/\.q-spinner/);
    expect(css).not.toMatch(/\.icon-btn\.is-refreshing \.ico/);
    expect(css).not.toMatch(/\.icon-btn\.is-refreshing svg/);
  });
});
