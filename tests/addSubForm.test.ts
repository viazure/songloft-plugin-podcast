import { describe, expect, it } from "vitest";
import {
  closeAddSubForm,
  isAddSubCardOpen,
  openAddSubForm,
  resetOpmlImport,
} from "../ui/lib/addSubForm.js";
import * as fs from "node:fs";
import * as path from "node:path";

function fakeEl(init: Record<string, unknown> = {}) {
  const attrs = new Map<string, string>();
  const classList = {
    values: new Set<string>(),
    contains(name: string) {
      return classList.values.has(name);
    },
    toggle(name: string, on?: boolean) {
      if (on) classList.values.add(name);
      else classList.values.delete(name);
    },
  };
  return {
    ...init,
    classList,
    hasAttribute(name: string) {
      return attrs.has(name);
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
  };
}

describe("add subscription cancel/close", () => {
  it("closes the card, clears fields, and can open again", () => {
    const card = fakeEl();
    const feedUrl = { value: "https://example.com/a.xml" };
    const opmlText = { value: "<opml/>" };
    const opmlFile = { value: "x.opml" };
    const opmlSummary = { textContent: "新增 1" };
    const importBtn = { disabled: false };
    const pending = { opmlText: "<opml/>" };

    openAddSubForm({ card });
    expect(isAddSubCardOpen(card)).toBe(true);

    closeAddSubForm(
      { card, feedUrl, opmlText, opmlFile, opmlSummary, importBtn },
      pending
    );
    expect(isAddSubCardOpen(card)).toBe(false);
    expect(feedUrl.value).toBe("");
    expect(opmlText.value).toBe("");
    expect(opmlFile.value).toBe("");
    expect(opmlSummary.textContent).toBe("");
    expect(importBtn.disabled).toBe(true);
    expect(pending.opmlText).toBeNull();

    openAddSubForm({ card });
    expect(isAddSubCardOpen(card)).toBe(true);
    closeAddSubForm({ card, feedUrl, importBtn }, pending);
    expect(isAddSubCardOpen(card)).toBe(false);
  });

  it("OPML cancel resets import only and leaves the card open", () => {
    const card = fakeEl();
    openAddSubForm({ card });
    const opmlText = { value: "<opml/>" };
    const opmlFile = { value: "x.opml" };
    const opmlSummary = { textContent: "新增 1" };
    const importBtn = { disabled: false };
    const pending = { opmlText: "<opml/>" };
    resetOpmlImport({ opmlText, opmlFile, opmlSummary, importBtn }, pending);
    expect(isAddSubCardOpen(card)).toBe(true);
    expect(opmlText.value).toBe("");
    expect(opmlFile.value).toBe("");
    expect(opmlSummary.textContent).toBe("");
    expect(importBtn.disabled).toBe(true);
    expect(pending.opmlText).toBeNull();
  });

  it("wires main cancel/close to dismiss and OPML cancel to reset only", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "ui/views/subs.js"), "utf8");
    const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");
    expect(html).toMatch(/id="btnCancelAddSub"/);
    expect(html).toMatch(/id="btnCloseAddSub"[^>]*title="取消"/);
    expect(html).toMatch(/aria-label="取消"/);
    expect(src).toMatch(/btnCancelAddSub/);
    expect(src).toMatch(/btnCloseAddSub/);
    expect(src).toMatch(/btnOpmlCancel/);
    expect(src).toMatch(/resetOpmlImport/);
    const cancelBlock = src.slice(src.indexOf('btnOpmlCancel"'));
    expect(cancelBlock).toMatch(/resetOpmlImport/);
    expect(cancelBlock.slice(0, 400)).not.toMatch(/closeAddSubCard\(\)/);
  });
});
