/**
 * Podcast plugin UI entry point.
 *
 * Responsibilities are intentionally narrow: boot the host bridge, hydrate
 * static chrome, wire tab routing and delegate to the view modules.
 */

import { $, setHidden } from "./lib/dom.js";
import { hydrateIconSlots } from "./lib/icons.js";
import { bindPopoverDismiss } from "./lib/modal.js";
import { toast } from "./lib/toast.js";
import * as Host from "./lib/host.js";
import * as Playback from "./lib/playback.js";
import { bindBackToTop, refreshBackToTopTargets } from "./lib/back-to-top.js";
import { startDataSync } from "./lib/sync.js";
import * as actions from "./lib/actions.js";
import { getData, patch } from "./lib/store.js";
import {
  createSkeletonGate,
  episodeSkeletonHtml,
  SKELETON_DELAY_MS,
} from "./lib/skeletonGate.js";
import {
  cacheFromStoreData,
  hasValidListCache,
  isScheduleFeedFresh,
  loadUiCache,
  markFeedSynced,
  needsInitialFeedRefresh,
  retainNonEmptyLists,
  saveUiCache,
  shouldBackgroundFeedRefresh,
  shouldBootFeedRefresh,
} from "./lib/uiCache.js";
import { api } from "./lib/api.js";

import { renderRecent, bindRecentToolbar, bindRecentQueueState, requestFeedRefresh } from "./views/recent.js";
import { renderFavorites, bindFavoritesToolbar, bindFavoritesQueueState } from "./views/favorites.js";
import { renderSubs, bindSubsToolbar } from "./views/subs.js";
import { bindQueuePanel, renderQueue, setQueueOpen } from "./views/queue.js";
import { bindSettings, loadLog, loadSettings, loadCastDevices } from "./views/settings.js";
import {
  renderHistory,
  bindHistoryToolbar,
  bindHistoryQueueState,
  loadHistoryView,
} from "./views/history.js";
import { paintRows } from "./lib/rows.js";

/** Nav order: 更新 | 收藏 | 历史 | 订阅 | 设置（`recent` = Updates feed）. */
const TABS = ["recent", "favorites", "history", "subs", "settings"];
let activeTab = "recent";
/** Prevents tab switches from re-triggering the one-shot cold-start feed refresh. */
let bootFeedRefreshStarted = false;

const SCROLL_IDS = ["recentList", "historyList", "queueList", "subList"];

function readScrolls() {
  const scrolls = {};
  for (const id of SCROLL_IDS) {
    const el = $(id);
    if (el) scrolls[id] = el.scrollTop || 0;
  }
  return scrolls;
}

function applyScrolls(scrolls) {
  if (!scrolls || typeof scrolls !== "object") return;
  for (const id of SCROLL_IDS) {
    const el = $(id);
    const top = Number(scrolls[id]);
    if (el && Number.isFinite(top)) el.scrollTop = top;
  }
}

function persistUiCache(extra = {}) {
  saveUiCache({
    ...cacheFromStoreData(getData(), {
      activeTab,
      queueOpen: !!getData().queueOpen,
      scrolls: readScrolls(),
    }),
    ...extra,
  });
}

function switchTab(name) {
  if (!TABS.includes(name) || name === activeTab) {
    if (TABS.includes(name)) {
      document.querySelectorAll(".nav button").forEach((btn) => {
        btn.setAttribute("aria-current", btn.getAttribute("data-tab") === name ? "page" : "false");
      });
    }
    return;
  }
  activeTab = name;
  TABS.forEach((tab) => setHidden($("tab-" + tab), tab !== name));
  document.querySelectorAll(".nav button").forEach((btn) => {
    const isActive = btn.getAttribute("data-tab") === name;
    if (isActive) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  if (name === "favorites") renderFavorites();
  if (name === "history") loadHistoryView();
  if (name === "subs") renderSubs();
  if (name === "settings") {
    loadSettings();
    loadCastDevices();
    loadLog();
  }
  if (name === "recent") renderRecent();
  refreshBackToTopTargets();
  persistUiCache();
}

function bindNav() {
  document.querySelectorAll(".nav button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });
}

function renderAll() {
  paintRows(Playback.get());
  renderQueue();
  if (activeTab === "recent") renderRecent();
  if (activeTab === "history") renderHistory();
  if (activeTab === "favorites") renderFavorites();
  if (activeTab === "subs") renderSubs();
}

/**
 * Re-read host data and repaint. Used by the periodic/focus sync so a page left
 * open in another window still shows the queue and progress written elsewhere.
 */
async function refreshFromHost() {
  const snapshotBeforeReload = {
    recent: (getData().recent || []).slice(),
    history: (getData().history || []).slice(),
    favorites: (getData().favorites || []).slice(),
    subs: (getData().subs || []).slice(),
    queueSongs: (getData().queueSongs || []).slice(),
    queueMeta: getData().queueMeta || null,
  };
  await Promise.allSettled([
    actions.reloadQueue(),
    actions.reloadRecent(),
    actions.reloadFavorites(),
    actions.reloadHistory(),
  ]);
  const retained = retainNonEmptyLists(getData(), snapshotBeforeReload);
  if (retained.changed) patch(retained.patch);
  renderAll();
  persistUiCache();
}

function startEntrySkeletons() {
  const targets = [
    {
      id: "recentList",
      hasContent: () => (getData().recent || []).length > 0,
    },
    {
      id: "historyList",
      hasContent: () => (getData().history || []).length > 0,
    },
    {
      id: "queueList",
      hasContent: () => (getData().queueSongs || []).length > 0,
    },
  ];
  return targets.map((t) => {
    const gate = createSkeletonGate({
      delayMs: SKELETON_DELAY_MS,
      hasContent: t.hasContent,
      show: () => {
        const el = $(t.id);
        if (!el || t.hasContent()) return;
        el.classList.add("is-skeleton");
        el.innerHTML = episodeSkeletonHtml(t.id === "queueList" ? 5 : 6);
      },
    });
    gate.start();
    return gate;
  });
}

function hydrateFromUiCache(cache) {
  if (!hasValidListCache(cache)) return false;
  patch({
    recent: cache.recent || [],
    history: cache.history || [],
    favorites: cache.favorites || [],
    subs: cache.subs || [],
    queueSongs: cache.queueSongs || [],
    queueMeta: cache.queueMeta || null,
    queueOpen: !!cache.queueOpen,
  });
  return true;
}

/**
 * Open-plugin auto full refresh: only when the feed is past the schedule window.
 * Reuses schedule.lastSuccessAt + intervalHours (fallback: local feedSyncedAt / 6h TTL).
 * Never blocks first paint (TB-1 cache lists already hydrated). Manual refresh is unchanged.
 */
function startConditionalFeedRefresh(cache) {
  if (bootFeedRefreshStarted) return;
  bootFeedRefreshStarted = true;

  // Local-fresh with lists: skip entirely — no status GET, no POST /api/refresh.
  const localDue =
    needsInitialFeedRefresh(cache) || shouldBackgroundFeedRefresh(cache);
  if (!localDue) return;

  void (async () => {
    let schedule = null;
    try {
      const status = await api.status();
      schedule = status && status.schedule ? status.schedule : null;
    } catch (_) {
      schedule = null;
    }

    // Server success still inside intervalHours → skip RSS (only paid a status read).
    if (isScheduleFeedFresh(schedule && schedule.lastSuccessAt, schedule && schedule.intervalHours)) {
      if (schedule && schedule.lastSuccessAt) {
        markFeedSynced(schedule.lastSuccessAt);
        persistUiCache({ feedSyncedAt: schedule.lastSuccessAt });
      }
      return;
    }

    if (!shouldBootFeedRefresh(cache, schedule)) return;

    // Quiet busy: spinner +「正在刷新…」 still follow; no red toast on auto failure.
    try {
      await requestFeedRefresh({ quietBusy: true });
      markFeedSynced();
      persistUiCache({ feedSyncedAt: Date.now() });
      if (activeTab === "recent") renderRecent();
      if (activeTab === "subs") renderSubs();
    } catch (_) {
      /* best-effort; cached lists stay interactive */
    }
  })();
}

async function init() {
  // Bind UI first so a failing host call can never leave a dead page.
  hydrateIconSlots(document);
  bindPopoverDismiss();
  bindNav();
  bindRecentToolbar();
  bindRecentQueueState();
  bindFavoritesToolbar();
  bindFavoritesQueueState();
  bindHistoryToolbar();
  bindHistoryQueueState();
  bindSubsToolbar();
  bindQueuePanel();
  bindSettings();
  bindBackToTop();

  const cached = loadUiCache();
  const hadCache = hydrateFromUiCache(cached);

  for (const id of ["recentList", "historyList", "queueList"]) {
    const el = $(id);
    if (el && !hadCache) el.dataset.bootPending = "1";
  }
  // Skeleton only when there is nothing readable yet.
  const skeletonGates = hadCache ? [] : startEntrySkeletons();

  if (hadCache) {
    if (cached.activeTab && TABS.includes(cached.activeTab)) {
      activeTab = "recent";
      switchTab(cached.activeTab);
    }
    setQueueOpen(!!cached.queueOpen);
    renderAll();
    applyScrolls(cached.scrolls);
  } else {
    renderAll();
  }

  Playback.setProgressCapable(true);
  Playback.onChange((snap) => {
    paintRows(snap);
    refreshBackToTopTargets();
  });


  const caps = await Host.getCapabilities();
  actions.setCapabilities(caps);
  if (caps.available && caps.hasPlayer) {
    actions.startProgressTracking();
    try {
      Playback.applyHostState(await Host.getState());
    } catch (_) {
      /* host may not be ready yet; state changes will catch up */
    }
  } else {
    toast("未检测到宿主播放器；列表仍可浏览", "warn");
  }

  // Soft re-read of plugin storage (not an RSS refresh). Independent per list.
  // With a usable cache, keep the painted lists and refresh in the background so
  // remounts do not flash an empty 「最近更新」 while /api/home is in flight.
  const loads = [
    ["订阅更新", actions.reloadRecent],
    ["收藏", actions.reloadFavorites],
    ["收听历史", actions.reloadHistory],
    ["订阅列表", actions.reloadSubs],
    ["播放列表", actions.reloadQueue],
  ];

  const snapshotBeforeReload = {
    recent: (getData().recent || []).slice(),
    history: (getData().history || []).slice(),
    favorites: (getData().favorites || []).slice(),
    subs: (getData().subs || []).slice(),
    queueSongs: (getData().queueSongs || []).slice(),
    queueMeta: getData().queueMeta || null,
  };

  async function finishSoftReload(results) {
    const failed = results
      .map((r, i) => (r.status === "rejected" ? loads[i][0] : null))
      .filter(Boolean);
    if (failed.length && !hadCache) toast(`未能加载：${failed.join("、")}`, "err");

    const retained = retainNonEmptyLists(getData(), snapshotBeforeReload);
    if (retained.changed) patch(retained.patch);

    skeletonGates.forEach((g) => g.stop());
    for (const id of ["recentList", "historyList", "queueList"]) {
      const el = $(id);
      if (el) delete el.dataset.bootPending;
    }
    renderAll();
    if (hadCache && cached && cached.scrolls) applyScrolls(cached.scrolls);
    persistUiCache(cached && cached.feedSyncedAt ? { feedSyncedAt: cached.feedSyncedAt } : {});
  }

  if (hadCache) {
    Promise.allSettled(loads.map(([, fn]) => fn()))
      .then((results) => finishSoftReload(results))
      .catch(() => {
        skeletonGates.forEach((g) => g.stop());
      });
  } else {
    const results = await Promise.allSettled(loads.map(([, fn]) => fn()));
    await finishSoftReload(results);
  }

  // RSS refresh only when schedule/local stamp is stale — never on every mount; never blocks first paint.
  startConditionalFeedRefresh(cached);

  startDataSync(refreshFromHost);

  setTimeout(() => {
    refreshFromHost().catch(() => {});
  }, 1500);

  try {
    const wanted = new URLSearchParams(location.search).get("tab");
    if (wanted && TABS.includes(wanted)) switchTab(wanted);
  } catch (_) {
    /* ignore */
  }

  window.addEventListener("pagehide", () => persistUiCache());
}

init().catch((e) => {
  // Last-resort guard: never leave the page blank without explaining why.
  toast("界面初始化失败：" + ((e && e.message) || e), "err");
});
