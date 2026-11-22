import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("subscription directory cards", () => {
  const root = process.cwd();
  const subs = fs.readFileSync(path.join(root, "ui/views/subs.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "static/css/app.css"), "utf8");

  it("keeps cover, title, optional author and a trailing more menu only", () => {
    expect(subs).toMatch(/sub-card__title/);
    expect(subs).toMatch(/sub-card__author/);
    expect(subs).toMatch(/moreMenuHtml\(/);
    expect(subs).toMatch(/索引历史/);
    expect(subs).toMatch(/复制源地址/);
    expect(subs).toMatch(/取消订阅/);
    expect(subs).not.toMatch(/data-sub-act="eps"/);
    expect(subs).not.toMatch(/>剧集</);
    expect(subs).not.toMatch(/上次成功/);
    expect(subs).not.toMatch(/含历史索引/);
    expect(subs).not.toMatch(/可索引历史/);
    expect(subs).not.toMatch(/sub-card__url/);
    expect(subs).not.toMatch(/queue-show/);
    expect(subs).not.toMatch(/未知作者/);
  });

  it("opens the channel page from the whole card, not a separate episodes button", () => {
    expect(subs).toMatch(/openEpisodes\(sub\.id\)/);
    expect(subs).toMatch(/card\.addEventListener\("click"/);
    expect(subs).toMatch(/ev\.target\.closest\("\.more-wrap, input"\)/);
  });

  it("uses a compact one-row card layout on desktop and single column on phones", () => {
    expect(css).toMatch(/\.sub-card\s*\{[^}]*align-items:\s*center/s);
    expect(css).toMatch(/\.sub-card__title\s*\{[^}]*-webkit-line-clamp:\s*1/s);
    expect(css).toMatch(/\.sub-card__author/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[^}]*\.sub-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });
});
