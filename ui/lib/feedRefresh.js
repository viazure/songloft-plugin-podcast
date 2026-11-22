/**
 * Deduped subscription refresh shared by page-open and toolbar buttons.
 * Emits busy so toolbar / channel / menu refresh controls share one spinner.
 */

let fullInFlight = null;
let oneInFlight = null;
let remoteBusy = false;
const listeners = new Set();

export const REFRESH_BUSY_TOAST = "正在刷新，请稍候。";
export const REFRESH_STILL_RUNNING_TOAST = "刷新仍在进行，稍后下拉查看。";
export const REFRESH_HINT_TEXT = "正在刷新…";
export const REFRESH_MENU_BUSY_LABEL = "正在刷新…";
export const REFRESH_MENU_IDLE_LABEL = "刷新";

export function isFeedRefreshing() {
  return !!(fullInFlight || oneInFlight || remoteBusy);
}

/** @param {(busy: boolean) => void} fn */
export function onFeedRefreshState(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  try {
    fn(isFeedRefreshing());
  } catch (_) {
    /* ignore */
  }
  return () => listeners.delete(fn);
}

function emit() {
  const busy = isFeedRefreshing();
  for (const fn of listeners) {
    try {
      fn(busy);
    } catch (_) {
      /* ignore */
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSkippedBusy(errOrResult) {
  if (errOrResult == null) return false;
  if (typeof errOrResult === "string") return /skipped_busy/i.test(errOrResult);
  if (typeof errOrResult !== "object") return /skipped_busy/i.test(String(errOrResult));
  if (errOrResult.skipped === true) return true;
  if (errOrResult.error === "skipped_busy" || errOrResult.reason === "skipped_busy") return true;
  const msg = String(errOrResult.message || errOrResult.error || errOrResult.reason || "");
  return /skipped_busy/i.test(msg);
}

/** Never surface raw reason codes like skipped_busy. */
export function humanizeRefreshFailure(errOrResult, fallback = "刷新失败") {
  if (isSkippedBusy(errOrResult)) return REFRESH_BUSY_TOAST;
  if (errOrResult == null) return fallback;
  if (typeof errOrResult === "string") {
    const s = errOrResult.replace(/^Error:\s*/i, "").trim();
    if (!s || /skipped_busy/i.test(s)) return fallback;
    return s;
  }
  const raw = String(
    errOrResult.message || errOrResult.error || errOrResult.reason || ""
  ).replace(/^Error:\s*/i, "").trim();
  if (!raw || /skipped_busy/i.test(raw)) return fallback;
  return raw;
}

export function wrapRefreshCall(promiseFactory) {
  return (async () => {
    try {
      return await promiseFactory();
    } catch (e) {
      if (isSkippedBusy(e)) return { ok: false, skipped: true, error: "skipped_busy" };
      throw e;
    }
  })();
}

/**
 * Wait until the plugin reports refresh is no longer busy.
 * Used when POST /api/refresh returns immediately with `{ started: true }`.
 */
export async function waitUntilFeedRefreshIdle(api, opts = {}) {
  const pollMs = typeof opts.pollMs === "number" && opts.pollMs > 0 ? opts.pollMs : 350;
  const timeoutMs =
    typeof opts.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 180000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let status = null;
    try {
      status = await api.status();
    } catch (_) {
      status = null;
    }
    const busy = !!(status && status.refreshBusy === true);
    if (busy !== remoteBusy) {
      remoteBusy = busy;
      emit();
    }
    if (!busy) return { timedOut: false };
    await delay(pollMs);
  }
  if (remoteBusy) {
    remoteBusy = false;
    emit();
  }
  return { timedOut: true };
}

/** Adopt server-side busy into the shared UI spinner until idle. */
export async function trackRemoteRefreshBusy(api, opts = {}) {
  remoteBusy = true;
  emit();
  try {
    return await waitUntilFeedRefreshIdle(api, opts);
  } finally {
    remoteBusy = false;
    emit();
  }
}

/**
 * @param {{
 *   refreshAll: () => Promise<any>,
 *   afterRefresh?: (result: any) => Promise<void>|void,
 * }} deps
 */
export function runFeedRefresh(deps) {
  if (fullInFlight || oneInFlight) return Promise.resolve({ noop: true });
  const refreshAll = deps && deps.refreshAll;
  const afterRefresh = deps && deps.afterRefresh;
  if (typeof refreshAll !== "function") {
    return Promise.reject(new Error("refreshAll required"));
  }

  let settle;
  const gate = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  fullInFlight = gate;
  emit();
  (async () => {
    try {
      const result = await wrapRefreshCall(refreshAll);
      if (typeof afterRefresh === "function") {
        await afterRefresh(result);
      }
      settle.resolve(result);
    } catch (e) {
      settle.reject(e);
    } finally {
      fullInFlight = null;
      emit();
    }
  })();
  return gate;
}

/**
 * Single-subscription refresh under the same busy banner.
 * @param {{ refreshOne: () => Promise<any>, afterRefresh?: (result: any) => Promise<void>|void }} deps
 */
export function runFeedRefreshOne(deps) {
  if (fullInFlight || oneInFlight) return Promise.resolve({ noop: true });
  const refreshOne = deps && deps.refreshOne;
  const afterRefresh = deps && deps.afterRefresh;
  if (typeof refreshOne !== "function") {
    return Promise.reject(new Error("refreshOne required"));
  }

  let settle;
  const gate = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  oneInFlight = gate;
  emit();
  (async () => {
    try {
      const result = await wrapRefreshCall(refreshOne);
      if (typeof afterRefresh === "function") {
        await afterRefresh(result);
      }
      settle.resolve(result);
    } catch (e) {
      settle.reject(e);
    } finally {
      oneInFlight = null;
      emit();
    }
  })();
  return gate;
}

function readRefreshIconSize(btn) {
  const slot = btn.querySelector && btn.querySelector("[data-size], .ico, .q-spinner");
  if (slot) {
    const raw =
      (typeof slot.getAttribute === "function" && slot.getAttribute("data-size")) ||
      (typeof slot.getAttribute === "function" && slot.getAttribute("style")) ||
      "";
    const fromData = Number(raw);
    if (Number.isFinite(fromData) && fromData > 0) return fromData;
    const m = /width:\s*(\d+)/.exec(String(raw));
    if (m) return Number(m[1]) || 16;
  }
  return 16;
}

/**
 * Busy = circular .q-spinner. Idle = restore previous icon markup.
 * Does not disable the control — extra clicks are silent no-ops in handlers.
 * @param {HTMLElement|null|undefined} btn
 */
export function applyRefreshButtonBusy(btn, busy) {
  if (!btn) return;
  if (busy) {
    btn.setAttribute("aria-busy", "true");
    if (btn.classList.contains("is-refreshing") && btn.querySelector && btn.querySelector(".q-spinner")) {
      return;
    }
    btn.classList.add("is-refreshing");
    if (btn.dataset && btn.dataset.refreshIdleHtml == null) {
      btn.dataset.refreshIdleHtml = btn.innerHTML || "";
    }
    const size = readRefreshIconSize(btn);
    const spinner =
      `<span class="q-spinner" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
    const label = btn.querySelector && btn.querySelector("[data-refresh-label]");
    const iconSlot =
      (btn.querySelector && (btn.querySelector("[data-icon]") || btn.querySelector(".ico"))) || null;
    if (label && iconSlot) {
      iconSlot.outerHTML = spinner;
    } else if (label) {
      btn.insertAdjacentHTML("afterbegin", spinner);
    } else {
      btn.innerHTML = spinner;
    }
  } else {
    btn.removeAttribute("aria-busy");
    btn.classList.remove("is-refreshing");
    if (btn.dataset && btn.dataset.refreshIdleHtml != null) {
      btn.innerHTML = btn.dataset.refreshIdleHtml;
      delete btn.dataset.refreshIdleHtml;
    }
  }
}

/** Update subscription-menu refresh rows to match shared busy. */
export function applyRefreshMenuBusy(root, busy) {
  const scope = root && root.querySelectorAll ? root : typeof document !== "undefined" ? document : null;
  if (!scope || !scope.querySelectorAll) return;
  const text = busy ? REFRESH_MENU_BUSY_LABEL : REFRESH_MENU_IDLE_LABEL;
  scope.querySelectorAll('[data-more-act="refresh"]').forEach((el) => {
    el.setAttribute("aria-busy", busy ? "true" : "false");
    el.setAttribute("title", text);
    if (busy) el.classList.add("is-refreshing");
    else el.classList.remove("is-refreshing");
    const label = el.querySelector("[data-refresh-label]") || el.querySelector("span:last-child");
    if (label) label.textContent = text;
    else if (!el.querySelector(".ico") && !el.querySelector("[data-icon]")) {
      el.textContent = text;
    }
  });
}

export function applyRefreshHint(el, busy) {
  if (!el) return;
  el.hidden = !busy;
  if (busy) el.textContent = REFRESH_HINT_TEXT;
}

/** Test-only. */
export function __resetFeedRefreshForTests() {
  fullInFlight = null;
  oneInFlight = null;
  remoteBusy = false;
  listeners.clear();
}

