import { describe, expect, it } from "vitest";
import {
  ADD_ALL_CONFIRM_THRESHOLD,
  DEFAULT_HISTORY_INDEX_LIMIT,
  EPISODE_PAGE_SIZE,
  HISTORY_INDEX_COMPLETE_TOAST,
  MAX_EPISODE_PAGE,
  REFRESH_UP_TO_DATE_TOAST,
  addAllConfirmCopy,
  historyIndexCopy,
  pageEpisodes,
  preservedRenderCount,
  shouldConfirmAddAll,
} from "../ui/lib/episodePages.js";
import * as fs from "node:fs";
import * as path from "node:path";

describe("episodePages", () => {
  it("uses a stable page size and reports leftover rows", () => {
    expect(EPISODE_PAGE_SIZE).toBe(20);
    const page = pageEpisodes(Array.from({ length: 45 }, (_, i) => i), 20);
    expect(page.items).toHaveLength(20);
    expect(page.hasMore).toBe(true);
    expect(page.shown).toBe(40);
  });

  it("can page through more than 200 client-side rows and does not clamp to 2000", () => {
    const page = pageEpisodes(Array.from({ length: 230 }, (_, i) => i), 210, 20);
    expect(page.items).toHaveLength(20);
    expect(page.hasMore).toBe(false);
    expect(page.shown).toBe(230);
    expect(page.items[19]).toBe(229);
    const oversized = pageEpisodes(Array.from({ length: 230 }, (_, i) => i), 0, 2000);
    expect(oversized.items).toHaveLength(MAX_EPISODE_PAGE);
    expect(MAX_EPISODE_PAGE).toBe(100);
    expect(MAX_EPISODE_PAGE).toBeLessThan(DEFAULT_HISTORY_INDEX_LIMIT);
  });

  it("keeps the already-shown window for the same channel and resets on a different one", () => {
    expect(
      preservedRenderCount({ previousShown: 40, previousSubId: "a", nextSubId: "a", nextTotal: 80 })
    ).toBe(40);
    expect(
      preservedRenderCount({ previousShown: 40, previousSubId: "a", nextSubId: "a", nextTotal: 12 })
    ).toBe(12);
    expect(
      preservedRenderCount({ previousShown: 40, previousSubId: "a", nextSubId: "b", nextTotal: 80 })
    ).toBe(0);
  });

  it("keeps success quiet in the status strip and reserves urgent copy for capped/running/error", () => {
    const limited = historyIndexCopy({ status: "success", indexedCount: 12, feedAvailableCount: 12 });
    expect(limited.tone).toBe("ok");
    expect(limited.text).toBe("");
    expect(HISTORY_INDEX_COMPLETE_TOAST).toMatch(/已按源里现有节目收录/);
    expect(HISTORY_INDEX_COMPLETE_TOAST).toMatch(/更早的无法找回/);
    expect(HISTORY_INDEX_COMPLETE_TOAST).not.toMatch(/源当前露出/);
    expect(HISTORY_INDEX_COMPLETE_TOAST).not.toMatch(/该 RSS/);
    expect(REFRESH_UP_TO_DATE_TOAST).toBe("已是最新");
    const capped = historyIndexCopy({
      status: "success",
      indexedCount: 2000,
      feedAvailableCount: 2300,
      capped: true,
      cap: 2000,
      earliestConfirmed: true,
    });
    expect(capped.text).toMatch(/本地安全上限 2000/);
    expect(capped.text).toMatch(/最早一集/);
    expect(capped.text).toMatch(/中间未收录/);
    expect(capped.text).not.toMatch(/源当前露出/);
    expect(capped.text).not.toMatch(/该 RSS/);
    const unconfirmed = historyIndexCopy({
      status: "success",
      indexedCount: 2000,
      feedAvailableCount: 2300,
      capped: true,
      cap: 2000,
      earliestConfirmed: false,
      retainedRange: { newest: { title: "Ep 2300" }, oldest: { title: "Ep 301" } },
    });
    expect(unconfirmed.text).toMatch(/未能确认第一期/);
    expect(unconfirmed.text).toMatch(/Ep 2300/);
    expect(historyIndexCopy({ status: "error", error: "网络错误" }).text).toMatch(/网络错误/);
    expect(historyIndexCopy({ status: "running" }).text).toMatch(/正在索引该频道的历史节目/);
    expect(historyIndexCopy({ status: "running" }).text).not.toMatch(/露出/);
    expect(historyIndexCopy({ truncated: true, indexedCount: 20 }).text).toBe(
      "当前保留最近 20 集，更早的可点索引历史。"
    );
    expect(historyIndexCopy({ indexedCount: 20 }).text).toBe("");
  });

  it("asks for confirmation before adding a large show to the waitlist", () => {
    expect(ADD_ALL_CONFIRM_THRESHOLD).toBe(50);
    expect(shouldConfirmAddAll(50)).toBe(false);
    expect(shouldConfirmAddAll(51)).toBe(true);
    expect(shouldConfirmAddAll(2000)).toBe(true);
    expect(addAllConfirmCopy(2000, 2000)).toMatch(/2000 集全部加入/);
    expect(addAllConfirmCopy(2000, 2000)).toMatch(/取消则不会加入/);
  });
});

describe("waitlist toggle markup", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");

  it("keeps a single header entry with the list icon and no covering queue fab", () => {
    expect(html.match(/id="btnToggleQueue"/g)?.length).toBe(1);
    expect(html).not.toMatch(/btnToggleQueueInline/);
    expect(html).toMatch(/id="btnToggleQueue"[\s\S]{0,240}data-icon="listMusic"/);
    expect(html).not.toMatch(/id="btnToggleQueue"[\s\S]{0,240}data-icon="panelRight/);
    expect(html).toMatch(/id="btnBackToTop"/);
    expect(html).not.toMatch(/id="btnBackToTop"[\s\S]{0,200}待听/);
    expect(html).toMatch(/aria-label="「播客」列表"/);
    expect(html).not.toMatch(/待听列表/);
  });

  it("keeps the settings slider at the auto window, not the history cap", () => {
    expect(html).toMatch(/id="maxEpisodes"[^>]*max="200"/);
    expect(html).not.toMatch(/id="maxEpisodes"[^>]*max="2000"/);
    expect(html).toMatch(/不是历史索引上限/);
  });
});