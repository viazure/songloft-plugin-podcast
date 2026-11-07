import { createRouter, jsonResponse } from "@songloft/plugin-sdk";
import type { HTTPRequest, HTTPResponse } from "@songloft/plugin-sdk";
import {
  addSubscription,
  deleteSubscription,
  runManualRefreshAll,
  runManualRefreshOne,
  updateSubscriptionUrl,
  REPLACE_NOTE,
  defaultDeps,
} from "./refresh";
import { runOpmlImport, runOpmlPreview } from "./opmlImport";
import {
  appendLog,
  getSubscription,
  loadLog,
  loadSettings,
  loadSubscriptions,
  publicSubscription,
  saveRefreshSchedule,
  saveSettings,
} from "./store";
import { refreshScheduler, normalizeIntervalHours } from "./schedule";

const router = createRouter();

function readJson(req: HTTPRequest): Record<string, unknown> {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "object") return body as Record<string, unknown>;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function readOpmlText(body: Record<string, unknown>): string {
  if (typeof body.opml === "string") return body.opml;
  if (typeof body.text === "string") return body.text;
  if (typeof body.xml === "string") return body.xml;
  return "";
}

router.get("/api/status", async () => {
  const subs = await loadSubscriptions();
  const schedule = refreshScheduler.getState();
  const settings = await loadSettings();
  return jsonResponse({
    ok: true,
    subscriptionCount: subs.length,
    maxEpisodes: settings.maxEpisodes,
    replaceStrategy: "clear+add",
    replaceNote: REPLACE_NOTE,
    playPathNote:
      "剧集已入库为 remote 曲并进入对应歌单；请在 Songloft 客户端打开歌单点播（当前 SDK 无 player.setQueue，本插件不直打 miot）",
    schedule: {
      enabled: !!schedule.enabled,
      intervalHours: schedule.intervalHours,
      lastSuccessAt: schedule.lastSuccessAt,
      nextDueAt: schedule.nextDueAt,
    },
  });
});

router.get("/api/settings", async () => {
  const settings = await loadSettings();
  const schedule = refreshScheduler.getState();
  return jsonResponse({
    ok: true,
    maxEpisodes: settings.maxEpisodes,
    scheduleEnabled: !!schedule.enabled,
    scheduleIntervalHours: schedule.intervalHours,
    scheduleLastSuccessAt: schedule.lastSuccessAt,
    scheduleNextDueAt: schedule.nextDueAt,
    replaceNote: REPLACE_NOTE,
  });
});

router.post("/api/settings", async (req) => {
  const body = readJson(req);
  const patch: { maxEpisodes?: number } = {};
  if (typeof body.maxEpisodes === "number" || typeof body.maxEpisodes === "string") {
    const n = Number(body.maxEpisodes);
    if (Number.isFinite(n)) patch.maxEpisodes = n;
  }
  const settings = Object.keys(patch).length ? await saveSettings(patch) : await loadSettings();

  const schedulePatch: { enabled?: boolean; intervalHours?: number } = {};
  if (typeof body.scheduleEnabled === "boolean") schedulePatch.enabled = body.scheduleEnabled;
  if (
    typeof body.scheduleIntervalHours === "number" ||
    typeof body.scheduleIntervalHours === "string"
  ) {
    schedulePatch.intervalHours = normalizeIntervalHours(body.scheduleIntervalHours);
  }
  let schedule = refreshScheduler.getState();
  if (schedulePatch.enabled !== undefined || schedulePatch.intervalHours !== undefined) {
    schedule = await refreshScheduler.applyState(schedulePatch, { rearm: true, persist: false });
    await saveRefreshSchedule(schedule);
  }
  await appendLog("info", "settings saved");
  return jsonResponse({
    ok: true,
    maxEpisodes: settings.maxEpisodes,
    scheduleEnabled: !!schedule.enabled,
    scheduleIntervalHours: schedule.intervalHours,
    scheduleLastSuccessAt: schedule.lastSuccessAt,
    scheduleNextDueAt: schedule.nextDueAt,
  });
});

router.get("/api/subscriptions", async () => {
  const list = await loadSubscriptions();
  return jsonResponse({
    ok: true,
    subscriptions: list.map(publicSubscription),
  });
});

router.post("/api/subscriptions", async (req) => {
  const body = readJson(req);
  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) return jsonResponse({ ok: false, error: "需要 RSS URL" }, 400);
  const result = await addSubscription(url, defaultDeps());
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: result.reason, already: !!(result as { already?: boolean }).already, skipped: !result.ok && result.skipped },
      result.reason === "skipped_busy" ? 409 : 400
    );
  }
  return jsonResponse({
    ok: true,
    already: !!(result as { already?: boolean }).already,
    subscription: publicSubscription(result.subscription),
    playlistId: result.playlistId,
    playlistName: result.playlistName,
    createdSongs: result.createdSongs,
    skippedNonAudio: result.skippedNonAudio,
    truncated: result.truncated,
  });
});

router.get("/api/subscriptions/:id", async (_req, params) => {
  const id = params.id || "";
  const sub = await getSubscription(id);
  if (!sub) return jsonResponse({ ok: false, error: "订阅不存在" }, 404);
  return jsonResponse({ ok: true, subscription: publicSubscription(sub) });
});

router.get("/api/subscriptions/:id/episodes", async (_req, params) => {
  const id = params.id || "";
  const sub = await getSubscription(id);
  if (!sub) return jsonResponse({ ok: false, error: "订阅不存在" }, 404);
  return jsonResponse({
    ok: true,
    id: sub.id,
    title: sub.title,
    playlistId: sub.playlistId,
    playlistName: sub.playlistName,
    episodes: sub.episodes,
    playTip: sub.playlistName
      ? `在 Songloft 打开歌单「${sub.playlistName}」即可播放`
      : "刷新成功后会生成歌单",
  });
});

router.put("/api/subscriptions/:id", async (req, params) => {
  const id = params.id || "";
  const body = readJson(req);
  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) return jsonResponse({ ok: false, error: "需要 RSS URL" }, 400);
  const result = await updateSubscriptionUrl(id, url, defaultDeps());
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.reason,
        skipped: result.skipped,
        subscription: result.subscription ? publicSubscription(result.subscription) : undefined,
      },
      result.reason === "skipped_busy" ? 409 : 400
    );
  }
  return jsonResponse({
    ok: true,
    subscription: publicSubscription(result.subscription),
    playlistId: result.playlistId,
    playlistName: result.playlistName,
    createdSongs: result.createdSongs,
  });
});

router.delete("/api/subscriptions/:id", async (req, params) => {
  const id = params.id || "";
  const body = readJson(req);
  const q = String(req.url || req.path || "");
  const clearPlaylist =
    body.clearPlaylist === true ||
    /[?&]clearPlaylist=1\b/.test(q) ||
    /[?&]clearPlaylist=true\b/.test(q);
  const result = await deleteSubscription(id, {
    clearPlaylist,
    playlistsApi: songloft.playlists,
  });
  if (!result.ok) return jsonResponse({ ok: false, error: result.reason, skipped: result.skipped }, result.skipped ? 409 : 404);
  return jsonResponse({
    ok: true,
    tip: result.tip,
    removed: result.removed ? publicSubscription(result.removed) : null,
  });
});

router.post("/api/subscriptions/:id/refresh", async (_req, params) => {
  const id = params.id || "";
  const run = await runManualRefreshOne(id);
  if (run.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  const result = run.result;
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: result.reason,
        subscription: result.subscription ? publicSubscription(result.subscription) : undefined,
      },
      400
    );
  }
  return jsonResponse({
    ok: true,
    subscription: publicSubscription(result.subscription),
    playlistId: result.playlistId,
    playlistName: result.playlistName,
    createdSongs: result.createdSongs,
    skippedNonAudio: result.skippedNonAudio,
    truncated: result.truncated,
  });
});

router.post("/api/refresh", async () => {
  const run = await runManualRefreshAll();
  if (run.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  return jsonResponse({
    ok: run.ok,
    results: run.results,
  });
});

/** Offline OPML preview: parse + classify; zero network. */
router.post("/api/opml/preview", async (req) => {
  const body = readJson(req);
  const text = readOpmlText(body);
  if (!text.trim()) return jsonResponse({ ok: false, error: "需要 OPML 文本" }, 400);
  const result = await runOpmlPreview(text);
  if (!result.ok) return jsonResponse({ ok: false, error: result.reason }, 400);
  return jsonResponse({
    ok: true,
    documentTitle: result.preview.documentTitle,
    summary: result.preview.summary,
    items: result.preview.items,
    fileWarnings: result.preview.fileWarnings,
    stats: result.parseStats.ok
      ? result.parseStats.stats
      : undefined,
  });
});

/**
 * Confirm OPML import: add-only stubs, no RSS fetch/refresh.
 * Cancel = client simply skips this call (zero writes).
 */
router.post("/api/opml/import", async (req) => {
  const body = readJson(req);
  const text = readOpmlText(body);
  if (!text.trim()) return jsonResponse({ ok: false, error: "需要 OPML 文本" }, 400);
  const result = await runOpmlImport(text);
  if (result.skipped) {
    return jsonResponse({ ok: false, skipped: true, error: "skipped_busy" }, 409);
  }
  if (!result.ok) {
    return jsonResponse({ ok: false, error: result.reason || "导入失败" }, 400);
  }
  return jsonResponse({
    ok: true,
    added: result.added,
    documentTitle: result.documentTitle,
    summary: result.preview?.summary,
    results: result.results,
    tip: result.added
      ? `已新增 ${result.added} 条订阅（未自动刷新，可点「刷新全部」）`
      : "没有新增（均为重复或无效）",
  });
});

router.get("/api/log", async () => {
  const log = await loadLog();
  return jsonResponse({ ok: true, log });
});

export async function handleHTTP(req: HTTPRequest): Promise<HTTPResponse> {
  return await router.handle(req);
}
