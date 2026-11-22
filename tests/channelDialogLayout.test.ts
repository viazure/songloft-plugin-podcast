import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HISTORY_INDEX_COMPLETE_TOAST,
  REFRESH_UP_TO_DATE_TOAST,
  historyIndexCopy,
} from "../ui/lib/episodePages.js";

describe("channel dialog narrow layout", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "static/css/app.css"), "utf8");
  const dialogSrc = fs.readFileSync(path.join(process.cwd(), "ui/views/channel-dialog.js"), "utf8");
  const modalSrc = fs.readFileSync(path.join(process.cwd(), "ui/lib/modal.js"), "utf8");

  it("keeps desktop action chips non-shrinking and packs three actions on one phone row", () => {
    expect(css).toMatch(/\.channel-dialog__head\s*\{[^}]*flex-direction:\s*column/s);
    expect(css).toMatch(
      /\.channel-dialog__actions\s*>\s*\.chip-btn[^}]*white-space:\s*nowrap/s
    );
    expect(css).toMatch(
      /\.channel-dialog__actions\s*>\s*\.chip-btn[^}]*flex:\s*0\s+0\s+auto/s
    );
    expect(css).toMatch(
      /\.channel-dialog__actions\s*>\s*\.chip-btn[^}]*min-width:\s*auto/s
    );
    expect(css).toMatch(
      /\.channel-dialog__actions\s*>\s*\.chip-btn[^}]*width:\s*max-content/s
    );
    // Phone: one row for refresh / index / add-all; list fills leftover height.
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.channel-dialog__actions\s*\{[^}]*flex-wrap:\s*nowrap/s
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.channel-dialog__actions\s*>\s*\.chip-btn[\s\S]*?flex:\s*1\s+1\s+0/s
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.channel-dialog__actions\s*>\s*#channelAddAll[^}]*flex:\s*1\s+1\s+100%/s
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.channel-dialog\s*\{[^}]*height:\s*100%/s
    );
    expect(dialogSrc).toMatch(/channelRefresh/);
    expect(dialogSrc).toMatch(/索引历史/);
    expect(dialogSrc).toMatch(/全部加入/);
  });

  it("uses a leading back control with channel hero and no footer close action", () => {
    expect(dialogSrc).toMatch(/actions:\s*\[\s*\]/);
    expect(dialogSrc).toMatch(/closeIcon:\s*"arrowLeft"/);
    expect(dialogSrc).toMatch(/closeLabel:\s*"返回"/);
    expect(dialogSrc).toMatch(/closeLeading:\s*true/);
    expect(dialogSrc).toMatch(/onClose:\s*\(\)\s*=>/);
    expect(dialogSrc).toMatch(/resetChannelState\(\)/);
    expect(dialogSrc).toMatch(/stopRefreshUi/);
    expect(dialogSrc).toMatch(/closeChannelDialog/);
    expect(dialogSrc).toMatch(/setModalTitle\(state\.title/);
    expect(dialogSrc).toMatch(/channel-dialog__hero/);
    expect(dialogSrc).toMatch(/channelHeroTitle/);
    expect(dialogSrc).toMatch(/channelHeroCount/);
    expect(dialogSrc).toMatch(/已显示 \$\{state\.rendered\} \/ \$\{state\.total\} 集/);
    expect(dialogSrc).toMatch(/channelDescMore/);
    expect(dialogSrc).toMatch(/channelAboutExtra/);
    expect(dialogSrc).toMatch(/上次刷新成功/);
    expect(dialogSrc).toMatch(/hasDesc/);
    expect(dialogSrc).toMatch(/moreBtn\.hidden\s*=\s*!hasDesc/);
    expect(dialogSrc).toMatch(/copyText\(/);
    expect(dialogSrc).toMatch(/class="channel-dialog__more"/);
    expect(dialogSrc).not.toMatch(/btn btn--ghost btn--sm channel-dialog__more/);
    expect(dialogSrc).not.toMatch(/id="channelTitle"/);
    expect(dialogSrc).not.toMatch(/label:\s*"关闭"/);
    expect(modalSrc).toMatch(/opts\.closeLeading/);
    expect(modalSrc).toMatch(/modal__head--nav/);
    expect(modalSrc).toMatch(/modalOnClose/);
    expect(css).toMatch(/\.modal__head--nav/);
    expect(css).toMatch(/\.channel-dialog__hero/);
    expect(css).toMatch(/\.channel-dialog__desc/);
    expect(css).toMatch(/\.channel-dialog__more[^{]*\{[^}]*background:\s*none/s);
    expect(css).toMatch(/\.channel-dialog__url[^{]*\{[^}]*user-select:\s*all/s);
  });

  it("keeps success copy out of the top status strip and does not park a persistent source-scope hint", () => {
    expect(historyIndexCopy({ status: "success", indexedCount: 20, feedAvailableCount: 20 }).text).toBe(
      ""
    );
    expect(historyIndexCopy({ truncated: true, indexedCount: 20 }).text).toBe(
      "当前保留最近 20 集，更早的可点索引历史。"
    );
    expect(historyIndexCopy({ indexedCount: 20 }).text).toBe("");
    expect(dialogSrc).toMatch(/HISTORY_INDEX_COMPLETE_TOAST/);
    expect(dialogSrc).toMatch(/REFRESH_UP_TO_DATE_TOAST/);
    expect(dialogSrc).not.toMatch(/SOURCE_SCOPE_HINT/);
    expect(dialogSrc).not.toMatch(/channelSourceHint/);
    expect(dialogSrc).toMatch(/paintFootVisibility/);
    expect(dialogSrc).toMatch(
      /id="channelEpList"[\s\S]{0,500}id="channelIndexStatus"/
    );
    expect(dialogSrc).toMatch(/channel-dialog__foot[\s\S]*channelIndexStatus/);
    expect(dialogSrc).not.toMatch(/源当前露出的已全部收录/);
    expect(dialogSrc).not.toMatch(/仅含源中现有节目/);
    expect(HISTORY_INDEX_COMPLETE_TOAST).toBe("已按源里现有节目收录，更早的无法找回。");
    expect(REFRESH_UP_TO_DATE_TOAST).toBe("已是最新");
  });
});
