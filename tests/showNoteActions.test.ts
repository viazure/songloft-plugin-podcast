import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EPISODE_ACTION_GAP_PX,
  EPISODE_ACTION_MIN_HIT_PX,
  EPISODE_ACTION_ORDER,
  episodeActionsLayout,
  shownoteFootActions,
  SHOWNNOTE_FOOT_CLASS,
} from "../ui/lib/shownoteActions.js";

describe("shownoteFootActions", () => {
  it("keeps play / queue / cast / favorite order and close:true on add", () => {
    const actions = shownoteFootActions({ favorited: false });
    expect(actions.map((a) => a.key)).toEqual(EPISODE_ACTION_ORDER);
    expect(actions.map((a) => a.iconName)).toEqual(["play", "listPlus", "speaker", "star"]);
    expect(actions.every((a) => a.close === true)).toBe(true);
    const play = actions.find((a) => a.key === "play");
    expect(play?.label).toBe("播放");
    expect(play?.shortLabel).toBe("播放");
    expect(play?.ariaLabel).toBe("播放这一集");
    expect(play?.title).toBe("播放这一集");
    const add = actions.find((a) => a.key === "queue");
    expect(add?.label).toBe("加入「播客」列表");
    expect(add?.shortLabel).toBe("加入列表");
    expect(add?.ariaLabel).toBe("加入「播客」列表");
    expect(add?.title).toBe("加入「播客」列表");
    expect(add?.close).toBe(true);
  });

  it("uses queue-playback copy when opened from the queue", () => {
    const play = shownoteFootActions({ favorited: false }, { fromWaitlist: true }).find((a) => a.key === "play");
    expect(play?.ariaLabel).toBe("从这一集开始，顺序播完「播客」列表");
    expect(play?.title).toBe("从这一集开始，顺序播完「播客」列表");
    expect(String(play?.ariaLabel)).not.toContain("待听");
  });

  it("uses short visible labels and full aria/title, including favorited 已收藏", () => {
    const actions = shownoteFootActions({ favorited: true });
    const fav = actions.find((a) => a.key === "favorite");
    expect(fav?.shortLabel).toBe("已收藏");
    expect(fav?.label).toBe("取消收藏");
    expect(fav?.ariaLabel).toBe("取消收藏");
    expect(fav?.title).toBe("取消收藏");
    expect(fav?.ariaPressed).toBe(true);

    const idle = shownoteFootActions({}).find((a) => a.key === "favorite");
    expect(idle?.shortLabel).toBe("收藏");
    expect(idle?.ariaPressed).toBe(false);
  });
});

describe("episodeActionsLayout (CSS model, not measured UI)", () => {
  const widths = [320, 360, 390];

  it("keeps >=44x44 cells and 8px gaps at 320/360/390 and 200% zoom", () => {
    for (const width of widths) {
      for (const zoom of [1, 2]) {
        const layout = episodeActionsLayout(width, { zoom });
        expect(layout.gap).toBe(EPISODE_ACTION_GAP_PX);
        expect(layout.cellMinHeight).toBe(EPISODE_ACTION_MIN_HIT_PX);
        expect(layout.rows).toBe(2);
        expect(layout.cols).toBe(2);
        expect(layout.hitAreaOk, `${width}css @${zoom}x cell=${layout.cellWidth}`).toBe(true);
      }
    }
  });

  it("prefers a single row of four full labels on a wide desktop viewport", () => {
    const layout = episodeActionsLayout(1100, { zoom: 1 });
    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(4);
    expect(layout.hitAreaOk).toBe(true);
  });
});

describe("shownote CSS contract", () => {
  const css = readFileSync(resolve(process.cwd(), "static/css/app.css"), "utf8");

  it("scopes 44x44 / 8px / safe-area / 2x2 wrap to the episode-action foot", () => {
    expect(css).toContain(`#appModalFoot.${SHOWNNOTE_FOOT_CLASS}`);
    expect(css).toMatch(
      /#appModalFoot\.modal__foot--episode-actions\s*\{[^}]*gap:\s*8px/s
    );
    expect(css).toMatch(
      /#appModalFoot\.modal__foot--episode-actions\s+\.btn\s*\{[^}]*min-height:\s*44px/s
    );
    expect(css).toMatch(
      /#appModalFoot\.modal__foot--episode-actions\s+\.btn\s*\{[^}]*min-width:\s*44px/s
    );
    expect(css).toMatch(
      /#appModalFoot\.modal__foot--episode-actions[^}]*safe-area-inset-bottom/s
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*#appModalFoot\.modal__foot--episode-actions\s+\.btn\s*\{[\s\S]*flex:\s*1 0 calc\(50% - 4px\)/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*#appModalFoot\.modal__foot--episode-actions\s+\.btn-label-full\s*\{[\s\S]*display:\s*none/
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*#appModalFoot\.modal__foot--episode-actions\s+\.btn-label-short\s*\{[\s\S]*display:\s*inline/
    );
    expect(css).toMatch(/button:focus-visible/);
  });
});
