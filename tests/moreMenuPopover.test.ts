import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "static/css/app.css"), "utf8");

function ruleBody(src: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "\\s*\\{([^}]+)\\}");
  const m = src.match(re);
  return m ? m[1] : "";
}

function classList() {
  const set = new Set<string>();
  return {
    add(c: string) {
      set.add(c);
    },
    remove(c: string) {
      set.delete(c);
    },
    contains(c: string) {
      return set.has(c);
    },
  };
}

type Rect = { left: number; right: number; top: number; bottom: number; width?: number; height?: number };

function installPopoverDom(opts: {
  rect: Rect;
  menuWidth?: number;
  menuHeight?: number;
  innerWidth?: number;
  innerHeight?: number;
  clip?: Rect & { overflow?: string };
}) {
  const menu: any = {
    classList: classList(),
    offsetWidth: opts.menuWidth ?? 148,
    offsetHeight: opts.menuHeight ?? 160,
  };
  const wrap: any = {
    classList: classList(),
    parentElement: null,
    querySelector(sel: string) {
      return sel === ".more-menu" ? menu : null;
    },
    getBoundingClientRect() {
      const r = opts.rect;
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width ?? r.right - r.left,
        height: r.height ?? r.bottom - r.top,
      };
    },
  };
  let clipEl: any = null;
  if (opts.clip) {
    const c = opts.clip;
    clipEl = {
      parentElement: null,
      getBoundingClientRect() {
        return {
          left: c.left,
          right: c.right,
          top: c.top ?? 0,
          bottom: c.bottom ?? opts.innerHeight ?? 800,
          width: c.width ?? c.right - c.left,
          height: c.height ?? (c.bottom ?? opts.innerHeight ?? 800) - (c.top ?? 0),
        };
      },
    };
    wrap.parentElement = clipEl;
  }
  const doc = {
    body: {},
    documentElement: {},
    querySelectorAll() {
      return wrap.classList.contains("open") || wrap.classList.contains("is-open") ? [wrap] : [];
    },
  };
  const innerWidth = opts.innerWidth ?? 390;
  const innerHeight = opts.innerHeight ?? 800;
  const overflow = opts.clip?.overflow ?? "auto";
  const visible = { overflow: "visible", overflowX: "visible", overflowY: "visible" };
  const clipping = { overflow, overflowX: overflow, overflowY: overflow };
  (globalThis as any).document = doc;
  (globalThis as any).window = {
    innerWidth,
    innerHeight,
    getComputedStyle(node: any) {
      return node === clipEl ? clipping : visible;
    },
  };
  return { wrap, menu, innerWidth, innerHeight, clipEl };
}

function menuBox(wrap: any, menu: any) {
  const rect = wrap.getBoundingClientRect();
  const width = menu.offsetWidth;
  const left = menu.classList.contains("more-menu--start") ? rect.left : rect.right - width;
  return { left, right: left + width };
}

afterEach(() => {
  vi.resetModules();
  delete (globalThis as any).document;
  delete (globalThis as any).window;
});

describe("more-menu popover alignment", () => {
  it("defaults to right alignment and flips start without a leftover --down class", () => {
    const base = ruleBody(css, ".more-menu");
    expect(base).toMatch(/left:\s*auto/);
    expect(base).toMatch(/right:\s*0/);
    expect(base).not.toMatch(/left:\s*0/);
    const up = ruleBody(css, ".more-menu.more-menu--up");
    expect(up).toMatch(/top:\s*auto/);
    expect(up).toMatch(/bottom:\s*calc\(100%\s*\+\s*6px\)/);
    expect(up).not.toMatch(/left:\s*0/);
    const start = ruleBody(css, ".more-menu.more-menu--start");
    expect(start).toMatch(/left:\s*0/);
    expect(start).toMatch(/right:\s*auto/);
    expect(css).not.toMatch(/\.more-menu--down/);
  });

  it("keeps a right-edge trigger's menu inside the viewport", async () => {
    const rect = { left: 358, right: 390, top: 120, bottom: 152 };
    const { wrap, menu, innerWidth } = installPopoverDom({ rect });
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(wrap.classList.contains("open")).toBe(true);
    expect(menu.classList.contains("more-menu--start")).toBe(false);
    const box = menuBox(wrap, menu);
    expect(box.right).toBeLessThanOrEqual(innerWidth);
    expect(box.left).toBeGreaterThanOrEqual(12);
  });

  it("opens rightward when the left side would overflow, without crossing the left edge", async () => {
    const rect = { left: 8, right: 40, top: 120, bottom: 152 };
    const { wrap, menu } = installPopoverDom({ rect });
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(menu.classList.contains("more-menu--start")).toBe(true);
    const box = menuBox(wrap, menu);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.left).toBe(rect.left);
  });

  it("still flips upward near the bottom when there is room above", async () => {
    const menuHeight = 160;
    const innerHeight = 800;
    const rect = { left: 300, right: 332, top: 700, bottom: 740 };
    const { wrap, menu } = installPopoverDom({ rect, menuHeight, innerHeight });
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(menu.classList.contains("more-menu--up")).toBe(true);
    expect(menu.classList.contains("more-menu--start")).toBe(false);
  });

  it("stays downward when there is room below the trigger", async () => {
    const rect = { left: 300, right: 332, top: 80, bottom: 112 };
    const { wrap, menu } = installPopoverDom({ rect });
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(menu.classList.contains("more-menu--up")).toBe(false);
  });

  it("flips upward when a clipping ancestor would crop the menu even if the viewport has room below", async () => {
    const menuHeight = 160;
    const innerHeight = 800;
    const clip = { left: 0, right: 390, top: 80, bottom: 400, overflow: "auto" };
    const rect = { left: 300, right: 332, top: 300, bottom: 332 };
    const { wrap, menu } = installPopoverDom({ rect, menuHeight, innerHeight, clip });
    // Viewport still has plenty of space below; only the scroll area is tight.
    expect(innerHeight - rect.bottom).toBeGreaterThan(menuHeight + 12);
    expect(clip.bottom - rect.bottom).toBeLessThan(menuHeight + 12);
    expect(rect.top - clip.top).toBeGreaterThan(menuHeight + 12);
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(menu.classList.contains("more-menu--up")).toBe(true);
  });

  it("flips start when a padded overflow ancestor would clip a left-opening history menu", async () => {
    // Desktop history row: 「…」 sits mid-left inside a padded .scroll-body.
    // Viewport left is 0, so the old window-only check would not flip.
    const innerWidth = 1280;
    const clip = { left: 240, right: 960, top: 80, bottom: 760, overflow: "auto" };
    const rect = { left: 256, right: 288, top: 140, bottom: 172 };
    const menuWidth = 148;
    const { wrap, menu } = installPopoverDom({ rect, menuWidth, innerWidth, clip });
    expect(rect.right - menuWidth).toBeGreaterThanOrEqual(12);
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(wrap);
    expect(menu.classList.contains("more-menu--start")).toBe(true);
    const box = menuBox(wrap, menu);
    expect(box.left).toBeGreaterThanOrEqual(clip.left);
    expect(box.right).toBeLessThanOrEqual(clip.right);
  });

  it("picks the side with more room when both edges of a clipping ancestor overflow", async () => {
    const innerWidth = 1280;
    const clip = { left: 100, right: 200, top: 80, bottom: 760, overflow: "hidden" };
    const menuWidth = 148;
    const moreRight = { left: 130, right: 162, top: 140, bottom: 172 };
    const rightDom = installPopoverDom({ rect: moreRight, menuWidth, innerWidth, clip });
    const { togglePopover } = await import("../ui/lib/modal.js");
    togglePopover(rightDom.wrap);
    expect(rightDom.menu.classList.contains("more-menu--start")).toBe(true);

    vi.resetModules();
    const moreLeft = { left: 168, right: 200, top: 140, bottom: 172 };
    const leftDom = installPopoverDom({ rect: moreLeft, menuWidth, innerWidth, clip });
    const again = await import("../ui/lib/modal.js");
    again.togglePopover(leftDom.wrap);
    expect(leftDom.menu.classList.contains("more-menu--start")).toBe(false);
  });
});
