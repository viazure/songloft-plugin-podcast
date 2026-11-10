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

import { bindPlayerBar, renderPlayerBar, bindCoverCache } from "./views/player-bar.js";
import { renderRecent, bindRecentToolbar } from "./views/recent.js";
import { renderFavorites, bindFavoritesToolbar } from "./views/favorites.js";
import { renderSubs, bindSubsToolbar } from "./views/subs.js";
import { bindQueuePanel, renderQueue } from "./views/queue.js";
import { bindSettings, loadLog, loadSettings, loadCastDevices } from "./views/settings.js";
import { renderHistory, bindHistoryToolbar, loadHistoryView } from "./views/history.js";
import { paintRows } from "./lib/rows.js";

/** Nav order: 更新 | 收藏 | 历史 | 订阅 | 设置（`recent` = Updates feed）. */
const TABS = ["recent", "favorites", "history", "subs", "settings"];
let activeTab = "recent";

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
}

function bindNav() {
  document.querySelectorAll(".nav button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });
}

function renderAll() {
  renderPlayerBar(Playback.get());
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
  await Promise.allSettled([
    actions.reloadQueue(),
    actions.reloadRecent(),
    actions.reloadFavorites(),
    actions.reloadHistory(),
  ]);
  renderAll();
}

async function init() {
  // Bind UI first so a failing host call can never leave a dead page.
  hydrateIconSlots(document);
  bindPopoverDismiss();
  bindNav();
  bindPlayerBar();
  bindCoverCache();
  bindRecentToolbar();
  bindFavoritesToolbar();
  bindHistoryToolbar();
  bindSubsToolbar();
  bindQueuePanel();
  bindSettings();
  bindBackToTop();

  // Render placeholders immediately; data fills in when the host answers.
  renderAll();

  Playback.setProgressCapable(true);
  Playback.onChange((snap) => {
    renderPlayerBar(snap);
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

  // Each list loads independently so one failure cannot blank the page.
  const loads = [
    ["订阅更新", actions.reloadRecent],
    ["收藏", actions.reloadFavorites],
    ["收听历史", actions.reloadHistory],
    ["订阅列表", actions.reloadSubs],
    ["播放列表", actions.reloadQueue],
  ];
  const results = await Promise.allSettled(loads.map(([, fn]) => fn()));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? loads[i][0] : null))
    .filter(Boolean);
  if (failed.length) toast(`未能加载：${failed.join("、")}`, "err");

  renderAll();

  // Keep an open page in step with writes made from another window/device.
  // Storage is already shared host-side; this just re-reads it.
  startDataSync(refreshFromHost);

  // Progress writes may land after another window's read, so refresh once more
  // shortly after boot.
  setTimeout(() => {
    refreshFromHost().catch(() => {});
  }, 1500);

  // Deep-link style: allow ?tab=subs while developing.
  try {
    const wanted = new URLSearchParams(location.search).get("tab");
    if (wanted && TABS.includes(wanted)) switchTab(wanted);
  } catch (_) {
    /* ignore */
  }
}

init().catch((e) => {
  // Last-resort guard: never leave the page blank without explaining why.
  toast("界面初始化失败：" + ((e && e.message) || e), "err");
});
