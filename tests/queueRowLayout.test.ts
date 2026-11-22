import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { episodeRowHtml, moreMenuHtml } from "../ui/lib/rows.js";

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "\\s*\\{([^}]+)\\}");
  const m = css.match(re);
  return m ? m[1] : "";
}

describe("waitlist card layout contract", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "static/css/app.css"), "utf8");

  it("keeps title/meta in the head and actions on their own following row", () => {
    const html = episodeRowHtml(
      {
        songId: 7,
        title: "这一集的标题有点长，用来占两行",
        showTitle: "当前节目",
        durationSec: 3600,
        progress: { durationSec: 3600, positionSec: 120 },
      },
      0,
      {
        showDate: false,
        extraClass: "q-row",
        fromWaitlist: true,
        leadHtml: `<span class="drag-handle" title="拖拽排序"></span>`,
        actions: [{ act: "fav", iconName: "star", title: "收藏", cls: "icon-btn--star" }],
        moreHtml: moreMenuHtml([{ key: "remove", label: "移出列表", iconName: "trash" }], "queue-0"),
      }
    );

    expect(html).toContain('class="ep-row q-row"');
    expect(html).toContain("ep-head q-head");
    expect(html).toContain("drag-handle");
    expect(html).toContain("meta-line");
    expect(html).toContain("data-prog-slot");
    expect(html).toContain("actions-row");
    expect(html).toContain("data-play-btn");
    expect(html).toContain('data-act="fav"');
    expect(html).toContain("more-wrap");

    const headOpen = html.indexOf('<div class="ep-head q-head">');
    const actionsOpen = html.indexOf('<div class="actions-row">');
    const metaAt = html.indexOf('<div class="meta-line">');
    expect(headOpen).toBeGreaterThan(-1);
    expect(actionsOpen).toBeGreaterThan(headOpen);
    expect(metaAt).toBeGreaterThan(headOpen);
    expect(metaAt).toBeLessThan(actionsOpen);

    const beforeActions = html.slice(headOpen, actionsOpen);
    const headCloses = (beforeActions.match(/<\/div>/g) || []).length;
    const headOpens = (beforeActions.match(/<div/g) || []).length;
    expect(headOpens).toBe(headCloses);
    expect(beforeActions).not.toContain("actions-row");
    expect(html.slice(actionsOpen)).not.toContain("meta-line");
  });

  it("stacks queue actions below the head without absolute, negative margin, or shrinking the head", () => {
    const row = ruleBody(css, ".q-row");
    const head = ruleBody(css, ".q-row .ep-head");
    const actions = ruleBody(css, ".q-row .actions-row");

    expect(row).toMatch(/display:\s*flex/);
    expect(row).toMatch(/flex-direction:\s*column/);
    expect(row).not.toMatch(/min-height:\s*calc\(\s*var\(--cover-size\)/);
    expect(head).toMatch(/flex:\s*0 0 auto/);
    expect(actions).toMatch(/flex:\s*0 0 auto/);
    expect(actions).toMatch(/position:\s*static/);
    expect(actions).not.toMatch(/position:\s*absolute/);
    expect(actions).not.toMatch(/margin-[a-z]+:\s*-/);
    expect(actions).not.toMatch(/grid-column:/);
    expect(head).not.toMatch(/flex:\s*1 1 auto/);
    expect(css).toMatch(/\.drag-handle[\s\S]{0,200}touch-action:\s*none/);
  });
});