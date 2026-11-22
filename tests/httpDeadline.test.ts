import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  HttpDeadlineError,
  attachIssued,
  fetchWithDeadline,
  isIssuedError,
  isTimeoutError,
  playAttemptFromUnknown,
} from "../src/httpDeadline";

/** Strip line/block comments so prose about AbortController is not a hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function collectFiles(dir: string, exts: string[], out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      collectFiles(full, exts, out);
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

describe("error classification", () => {
  it("does not treat AbortController is not defined as a timeout or issued play", () => {
    const err = new Error("AbortController is not defined");
    expect(isTimeoutError(err)).toBe(false);
    expect(isIssuedError(err)).toBe(false);
    const attempt = playAttemptFromUnknown(err);
    expect(attempt.playIssued).toBe(false);
    expect(attempt.uncertain).toBe(false);
    expect(attempt.error).toContain("AbortController is not defined");
    expect(attempt.error).not.toContain("已向音箱发出");
  });

  it("marks deadline errors as issued only when the flag says so", () => {
    const issued = new HttpDeadlineError("请求超时", true);
    const attempt = playAttemptFromUnknown(issued);
    expect(attempt.playIssued).toBe(true);
    expect(attempt.uncertain).toBe(true);
    expect(attempt.error).toBe("请求超时");

    const local = new HttpDeadlineError("请求超时", false);
    const localAttempt = playAttemptFromUnknown(local);
    expect(localAttempt.playIssued).toBe(false);
    expect(localAttempt.uncertain).toBe(false);
  });
});

describe("fetchWithDeadline", () => {
  const originalAbort = globalThis.AbortController;

  afterEach(() => {
    if (originalAbort) {
      (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController = originalAbort;
    } else {
      delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    }
  });

  it("works when AbortController is missing and does not construct one", async () => {
    delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    const fetchImpl = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
    const res = await fetchWithDeadline("http://example.test/play", { method: "POST" }, { fetchImpl, timeoutMs: 50 });
    expect(res.ok).toBe(true);
    expect(typeof (globalThis as { AbortController?: unknown }).AbortController).toBe("undefined");
  });

  it("throws a local error with issued=false if the caller never starts fetch", () => {
    const err = attachIssued(new Error("host url missing"), false);
    const attempt = playAttemptFromUnknown(err);
    expect(attempt.playIssued).toBe(false);
    expect(attempt.uncertain).toBe(false);
    expect(attempt.error).toBe("host url missing");
  });

  it("times out after fetch is issued, without cancelling, and ignores a late result", async () => {
    delete (globalThis as unknown as { AbortController?: typeof AbortController }).AbortController;
    let resolveFetch: ((res: Response) => void) | undefined;
    let rejected = false;
    const fetchImpl = () =>
      new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve;
        void reject;
      });
    const waits: Array<() => void> = [];
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        void ms;
        waits.push(resolve);
      });

    const pending = fetchWithDeadline("http://example.test/play", { method: "POST" }, { fetchImpl, timeoutMs: 8, delay });
    pending.catch(() => {
      rejected = true;
    });
    expect(resolveFetch).toBeTypeOf("function");
    // Deadline fires after fetch was invoked.
    expect(waits).toHaveLength(1);
    waits[0]();
    await expect(pending).rejects.toMatchObject({ name: "HttpDeadlineError", issued: true, timeout: true });
    expect(rejected).toBe(true);

    // Late fulfillment must not become an unhandled rejection or throw now.
    resolveFetch!(new Response("late", { status: 200 }));
    await new Promise((r) => setTimeout(r, 10));
  });
});

describe("no AbortController anywhere in source or the built bundle", () => {
  const root = process.cwd();

  it("never constructs an AbortController in src/ or ui/", () => {
    const files = [
      ...collectFiles(resolve(root, "src"), [".ts"]),
      ...collectFiles(resolve(root, "ui"), [".js"]),
    ];
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((file) =>
      /new\s+AbortController\s*\(/.test(stripComments(readFileSync(file, "utf8")))
    );
    expect(offenders).toEqual([]);
  });

  it("does not ship an AbortController construction in the bundled UI", () => {
    const bundle = readFileSync(resolve(root, "static/js/app.js"), "utf8");
    expect(/new\s+AbortController\s*\(/.test(stripComments(bundle))).toBe(false);
  });

  it("does not pass a signal into the QuickJS fetch wrapper", () => {
    const source = readFileSync(resolve(root, "src/httpDeadline.ts"), "utf8");
    expect(source).not.toMatch(/[^.]signal\s*:/);
    expect(source).toContain("delete rest.signal");
  });
});
