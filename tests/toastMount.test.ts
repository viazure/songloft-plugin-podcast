import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

function installDom() {
  const body = {
    children: [] as unknown[],
    appendChild(node: any) {
      this.children.push(node);
      node.parentElement = this;
      node.isConnected = true;
      return node;
    },
  };
  const doc = {
    body,
    createElement(tag: string) {
      const node: any = {
        tagName: tag.toUpperCase(),
        id: "",
        className: "",
        textContent: "",
        parentElement: null,
        isConnected: false,
        classList: {
          _set: new Set<string>(),
          add(c: string) {
            this._set.add(c);
          },
          remove(c: string) {
            this._set.delete(c);
          },
          contains(c: string) {
            return this._set.has(c);
          },
        },
        setAttribute() {},
      };
      return node;
    },
    getElementById() {
      return null;
    },
  };
  (globalThis as any).document = doc;
  return { doc, body };
}

afterEach(() => {
  vi.resetModules();
  delete (globalThis as any).document;
});

describe("toast mount host", () => {
  it("mounts on body by default and reparents into the modal host when asked", async () => {
    const { body } = installDom();
    const { toast, setToastMount } = await import("../ui/lib/toast.js");
    toast("已复制源地址", "ok");
    const node = body.children[0] as any;
    expect(node.id).toBe("toast");
    expect(node.parentElement).toBe(body);

    const modal: any = {
      isConnected: true,
      children: [] as unknown[],
      appendChild(child: any) {
        this.children.push(child);
        child.parentElement = this;
        child.isConnected = true;
        return child;
      },
    };
    setToastMount(modal);
    expect(node.parentElement).toBe(modal);
    expect(modal.children).toContain(node);

    setToastMount(null);
    expect(node.parentElement).toBe(body);
  });

  it("wires modal open/close to setToastMount(#appModal)", () => {
    const modalSrc = fs.readFileSync(path.join(process.cwd(), "ui/lib/modal.js"), "utf8");
    const toastSrc = fs.readFileSync(path.join(process.cwd(), "ui/lib/toast.js"), "utf8");
    expect(toastSrc).toMatch(/export function setToastMount/);
    expect(modalSrc).toMatch(/import \{ setToastMount \} from "\.\/toast\.js"/);
    expect(modalSrc).toMatch(/setToastMount\(dialog\)/);
    expect(modalSrc).toMatch(/setToastMount\(null\)/);
    expect(modalSrc.indexOf("setToastMount(null)")).toBeLessThan(modalSrc.indexOf("dialog.close"));
  });
});
