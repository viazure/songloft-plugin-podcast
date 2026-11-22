import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "../ui/lib/clipboard.js";
import * as fs from "node:fs";
import * as path from "node:path";

function installFakeDocument(execResult = true) {
  const removed: unknown[] = [];
  const ta = {
    value: "",
    style: { cssText: "" },
    setAttribute() {},
    focus() {},
    select() {},
    setSelectionRange() {},
  };
  const body = {
    appendChild(node: unknown) {
      return node;
    },
    removeChild(node: unknown) {
      removed.push(node);
      return node;
    },
  };
  const doc = {
    body,
    createElement(tag: string) {
      expect(tag).toBe("textarea");
      return ta;
    },
    execCommand(cmd: string) {
      expect(cmd).toBe("copy");
      return execResult;
    },
  };
  (globalThis as unknown as { document: unknown }).document = doc;
  return { ta, removed, doc };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe("copyText", () => {
  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("https://keychange.xyz/episodes/feed.xml")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://keychange.xyz/episodes/feed.xml");
  });

  it("falls back to execCommand when clipboard.writeText rejects", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    const { ta, removed } = installFakeDocument(true);
    await expect(copyText("https://example.com/feed.xml")).resolves.toBe(true);
    expect(ta.value).toBe("https://example.com/feed.xml");
    expect(removed).toHaveLength(1);
  });

  it("is wired into channel dialog and subscription menu copy actions", () => {
    const dialog = fs.readFileSync(path.join(process.cwd(), "ui/views/channel-dialog.js"), "utf8");
    const subs = fs.readFileSync(path.join(process.cwd(), "ui/views/subs.js"), "utf8");
    expect(dialog).toMatch(/import \{ copyText \} from "\.\.\/lib\/clipboard\.js"/);
    expect(dialog).toMatch(/copyText\(String\(state\.url/);
    expect(subs).toMatch(/import \{ copyText \} from "\.\.\/lib\/clipboard\.js"/);
    expect(subs).toMatch(/act === "copy-url"[\s\S]*copyText\(String\(sub\.url/);
    expect(subs).not.toMatch(/navigator\.clipboard\.writeText\(String\(sub\.url/);
    expect(dialog).not.toMatch(/navigator\.clipboard\.writeText\(String\(state\.url/);
  });
});
