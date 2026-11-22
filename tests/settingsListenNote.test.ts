import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("settings listen-history note", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");
  const settingsSrc = fs.readFileSync(path.join(process.cwd(), "ui/views/settings.js"), "utf8");

  it("drops the settings-only 收听记录 explanation card without removing the history tab", () => {
    expect(html).not.toMatch(/id="playEventsNote"/);
    expect(html).not.toMatch(/<h2>收听记录<\/h2>/);
    expect(html).not.toMatch(/按节目 feed \+ 单集 guid/);
    expect(html).toMatch(/data-tab="history"/);
    expect(html).toMatch(/id="tab-history"/);
    expect(html).toMatch(/id="historyList"/);
    expect(html).toMatch(/<h2>订阅索引<\/h2>/);
    expect(html).toMatch(/<h2>定时刷新<\/h2>/);
    expect(settingsSrc).not.toMatch(/playEventsNote/);
    expect(settingsSrc).not.toMatch(/playEventsActive/);
    expect(settingsSrc).not.toMatch(/feed \+ 单集 guid/);
  });
});
