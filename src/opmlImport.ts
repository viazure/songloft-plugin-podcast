/**
 * OPML import submit: persist new subscription stubs only.
 * Does NOT fetch RSS / refresh / play — Architect: 提交与刷新分离.
 */

import { feedIdFromUrl, normalizeFeedUrl } from "./hash";
import { parseOpml, previewOpmlAgainstExisting, type OpmlPreviewResult } from "./opml";
import { refreshScheduler } from "./schedule";
import {
  appendLog,
  findByUrl,
  loadSubscriptions,
  upsertSubscription,
  type Subscription,
} from "./store";

export interface OpmlImportItemResult {
  feedUrl: string;
  title: string;
  status: "added" | "duplicate_existing" | "duplicate_in_file" | "invalid" | "error";
  id?: string;
  error?: string;
}

export interface OpmlImportResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  preview: OpmlPreviewResult | null;
  results: OpmlImportItemResult[];
  added: number;
  documentTitle: string | null;
}

export async function previewOpmlText(opmlText: string): Promise<
  | { ok: true; preview: OpmlPreviewResult; parseStats: ReturnType<typeof parseOpml> }
  | { ok: false; reason: string }
> {
  const parsed = parseOpml(opmlText);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const existing = await loadSubscriptions();
  const preview = previewOpmlAgainstExisting(
    parsed,
    existing.map((s) => ({ url: s.url, title: s.title }))
  );
  return { ok: true, preview, parseStats: parsed };
}

async function importOpmlUnlocked(opmlText: string, nowMs: number): Promise<OpmlImportResult> {
  const parsed = parseOpml(opmlText);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: parsed.reason,
      preview: null,
      results: [],
      added: 0,
      documentTitle: null,
    };
  }
  let list = await loadSubscriptions();
  const preview = previewOpmlAgainstExisting(
    parsed,
    list.map((s) => ({ url: s.url, title: s.title }))
  );

  const results: OpmlImportItemResult[] = [];
  let added = 0;

  for (const item of preview.items) {
    if (item.status === "invalid") {
      results.push({
        feedUrl: item.feedUrl || "",
        title: item.title || "",
        status: "invalid",
        error: item.errors.map((e) => e.message).join("；") || "无效条目",
      });
      continue;
    }
    if (item.status === "duplicate_in_file") {
      results.push({
        feedUrl: item.feedUrl || "",
        title: item.title || "",
        status: "duplicate_in_file",
      });
      continue;
    }
    if (item.status === "duplicate_existing") {
      results.push({
        feedUrl: item.feedUrl || "",
        title: item.title || item.existingTitle || "",
        status: "duplicate_existing",
      });
      continue;
    }

    // new
    const feedUrl = item.feedUrl || "";
    const title = item.title || feedUrl;
    const url = normalizeFeedUrl(feedUrl);
    if (!url) {
      results.push({ feedUrl, title, status: "error", error: "URL 为空" });
      continue;
    }
    // Re-check against latest list (same-batch safety)
    const conflict = findByUrl(list, url);
    if (conflict) {
      results.push({
        feedUrl,
        title: conflict.title,
        status: "duplicate_existing",
        id: conflict.id,
      });
      continue;
    }
    try {
      const id = feedIdFromUrl(url);
      const stub: Subscription = {
        id,
        url,
        title,
        author: null,
        coverUrl: null,
        playlistId: null,
        playlistName: null,
        createdAt: nowMs,
        updatedAt: nowMs,
        lastSuccessAt: null,
        lastError: null,
        lastSkippedNonAudio: 0,
        episodeCount: 0,
        episodes: [],
      };
      list = await upsertSubscription(stub);
      added += 1;
      results.push({ feedUrl, title, status: "added", id });
    } catch (e) {
      results.push({
        feedUrl,
        title,
        status: "error",
        error: String(e ?? "写入失败"),
      });
    }
  }

  if (added > 0) {
    await appendLog(
      "info",
      `OPML 导入新增 ${added} 条订阅（未自动刷新；可随后「刷新全部」）`
    );
  }

  return {
    ok: true,
    preview,
    results,
    added,
    documentTitle: parsed.documentTitle,
  };
}

/** Preview is read-only and does not take the refresh mutex. */
export async function runOpmlPreview(opmlText: string) {
  return previewOpmlText(opmlText);
}

/** Confirm import under exclusive lock; cancel = simply do not call. */
export async function runOpmlImport(
  opmlText: string,
  opts?: { now?: () => number }
): Promise<OpmlImportResult> {
  const now = (opts?.now || Date.now)();
  const gate = await refreshScheduler.runExclusive(() => importOpmlUnlocked(opmlText, now));
  if (gate.skipped) {
    return {
      ok: false,
      skipped: true,
      reason: "skipped_busy",
      preview: null,
      results: [],
      added: 0,
      documentTitle: null,
    };
  }
  return gate.result;
}
