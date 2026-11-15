/**
 * History-row cover chain: valid episode URL → valid channel URL → letter.
 * Isolated from the shared coverHtml used by other tabs.
 */

import { escapeHtml } from "./dom.js";
import { absoluteCoverUrl, colorFromString } from "./format.js";

export const HISTORY_COVER_TIMEOUT_MS = 8000;
export const HISTORY_COVER_ROOT_MARGIN = "80px";

/**
 * @param {string | null | undefined} feedUrl
 * @param {Array<{ url?: string, feedUrl?: string, coverUrl?: string | null }>} subs
 */
export function channelCoverFromSubs(feedUrl, subs) {
  const target = normalizeFeedLookup(feedUrl);
  if (!target || !Array.isArray(subs)) return null;
  for (const sub of subs) {
    const u = normalizeFeedLookup(sub && (sub.url || sub.feedUrl));
    if (u && u === target) {
      const abs = absoluteCoverUrl(sub.coverUrl);
      return abs || null;
    }
  }
  return null;
}

function normalizeFeedLookup(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Prefer the channel title, then the episode title, then "?". */
export function letterPlaceholderSource(showTitle, title) {
  const show = String(showTitle || "").trim();
  if (show) return show;
  const ep = String(title || "").trim();
  if (ep) return ep;
  return "?";
}

/**
 * Deduplicated absolute URLs, episode first, then channel. Channel is never
 * written into the episode field — it is only a display candidate.
 *
 * @param {{ coverUrl?: string | null, channelCoverUrl?: string | null }} input
 * @returns {string[]}
 */
export function historyCoverCandidates(input) {
  const out = [];
  const seen = new Set();
  for (const raw of [input && input.coverUrl, input && input.channelCoverUrl]) {
    const abs = absoluteCoverUrl(raw);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

export function historyCoverHtml(entry, opts = {}) {
  const candidates = historyCoverCandidates({
    coverUrl: entry && entry.coverUrl,
    channelCoverUrl: opts.channelCoverUrl,
  });
  const letterSrc = letterPlaceholderSource(entry && entry.showTitle, entry && entry.title);
  const letter = letterSrc.trim().charAt(0).toUpperCase() || "?";
  const color = colorFromString(letterSrc === "?" ? "" : letterSrc);
  const ph =
    `<div class="cover-ph" style="background:${color}" aria-hidden="true">` +
    `${escapeHtml(letter)}</div>`;
  if (!candidates.length) return ph;
  return (
    `<img class="ep-cover" src="${escapeHtml(candidates[0])}" alt="" loading="lazy" ` +
    `data-history-cover="1" ` +
    `data-cover-candidates="${escapeHtml(JSON.stringify(candidates))}" ` +
    `data-cover-letter="${escapeHtml(letter)}" ` +
    `data-cover-color="${escapeHtml(color)}" />`
  );
}

/**
 * Pure session for load / error / timeout / stale-generation / cancel.
 * The view layer applies the returned action to the DOM.
 *
 * @param {{ candidates: string[], generation: number, timeoutMs?: number }} input
 */
export function createHistoryCoverSession(input) {
  const list = uniqueAbsolute(input.candidates || []);
  return {
    candidates: list,
    generation: input.generation,
    index: 0,
    cancelled: false,
    timeoutMs: input.timeoutMs || HISTORY_COVER_TIMEOUT_MS,
  };
}

function uniqueAbsolute(urls) {
  const out = [];
  const seen = new Set();
  for (const raw of urls) {
    const abs = absoluteCoverUrl(raw);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

/**
 * @param {ReturnType<typeof createHistoryCoverSession>} session
 * @param {{ type: string, generation?: number }} event
 */
export function historyCoverReduce(session, event) {
  if (!session || session.cancelled) {
    return { session, action: { type: "ignore" } };
  }
  if (event.generation != null && event.generation !== session.generation) {
    return { session, action: { type: "ignore" } };
  }
  if (event.type === "cancel") {
    return { session: { ...session, cancelled: true }, action: { type: "cleanup" } };
  }
  if (event.type === "load") {
    return { session: { ...session, cancelled: true }, action: { type: "keep" } };
  }
  if (event.type === "error" || event.type === "timeout") {
    const next = session.index + 1;
    if (next >= session.candidates.length) {
      return {
        session: { ...session, cancelled: true, index: next },
        action: { type: "placeholder" },
      };
    }
    return {
      session: { ...session, index: next },
      action: { type: "set-src", url: session.candidates[next] },
    };
  }
  return { session, action: { type: "ignore" } };
}

/**
 * Snapshot of an <img> at bind time or right after `src` is changed.
 * Cached-and-decoded images may never fire `load` again. A lazy image that
 * has not intersected the viewport must stay pending — even if complete,
 * naturalWidth is 0, and currentSrc is already set. Do not treat
 * complete && naturalWidth===0 as broken; a zero-width image is settled
 * by load / decode / error / timeout only after it is eligible to load.
 *
 * Eligible means the image has intersected the viewport, or it is not lazy.
 *
 * @param {HTMLImageElement} img
 * @param {{ eligible?: boolean }} [opts]
 * @returns {"loaded" | "pending"}
 */
export function historyCoverImageState(img, opts = {}) {
  if (!img) return "pending";
  if ((Number(img.naturalWidth) || 0) > 0) return "loaded";
  if (!isCoverEligibleToLoad(img, opts)) return "pending";
  // Eligible but no positive naturalWidth: still pending. The binder may
  // settle via decode() / load / error / timeout. Never "broken" here.
  return "pending";
}

function isLazyCoverLoading(img) {
  const loading =
    img && img.loading != null
      ? img.loading
      : img && typeof img.getAttribute === "function"
        ? img.getAttribute("loading")
        : "";
  return String(loading || "").toLowerCase() === "lazy";
}

function isCoverEligibleToLoad(img, opts) {
  if (opts && opts.eligible === true) return true;
  if (opts && opts.eligible === false) return false;
  return !isLazyCoverLoading(img);
}

/**
 * Bind fail-over on rendered history cover images. Returns a disposer that
 * clears timers and ignores late callbacks. Safe when `root` is missing.
 *
 * @param {ParentNode | null} root
 * @param {{ timeoutMs?: number, rootMargin?: string }} [opts]
 */
export function bindHistoryCoverRoot(root, opts = {}) {
  const timeoutMs = opts.timeoutMs || HISTORY_COVER_TIMEOUT_MS;
  const rootMargin = opts.rootMargin || HISTORY_COVER_ROOT_MARGIN;
  if (!root || typeof root.querySelectorAll !== "function") return () => {};
  const cleanups = [];
  const waiters = new WeakMap();
  const Observer = typeof IntersectionObserver === "function" ? IntersectionObserver : null;
  const observer = Observer
    ? new Observer(
        (entries) => {
          for (const entry of entries) {
            if (!entry || !entry.isIntersecting || !entry.target) continue;
            const fn = waiters.get(entry.target);
            if (!fn) continue;
            waiters.delete(entry.target);
            try {
              observer.unobserve(entry.target);
            } catch {
              /* ignore */
            }
            try {
              fn();
            } catch {
              /* intersection callback must not throw */
            }
          }
        },
        { rootMargin }
      )
    : null;

  root.querySelectorAll("[data-history-cover]").forEach((img) => {
    cleanups.push(attachHistoryCover(img, timeoutMs, { observer, waiters }));
  });
  return () => {
    if (observer) {
      try {
        observer.disconnect();
      } catch {
        /* disposer must not throw */
      }
    }
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* disposer must not throw */
      }
    }
  };
}

function attachHistoryCover(img, timeoutMs, io) {
  let candidates = [];
  try {
    candidates = uniqueAbsolute(JSON.parse(img.getAttribute("data-cover-candidates") || "[]"));
  } catch {
    candidates = uniqueAbsolute([img.getAttribute("src")]);
  }
  const generation = Date.now() + Math.random();
  img.setAttribute("data-cover-gen", String(generation));
  let session = {
    candidates,
    generation,
    index: 0,
    cancelled: false,
    timeoutMs,
  };

  let timer = null;
  const stopTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  let eligible = !isLazyCoverLoading(img);
  let decodeToken = 0;

  const apply = (event) => {
    const result = historyCoverReduce(session, event);
    session = result.session;
    const action = result.action;
    if (action.type === "ignore" || action.type === "keep") {
      if (action.type === "keep") stopTimer();
      return;
    }
    if (action.type === "cleanup") {
      stopTimer();
      return;
    }
    if (action.type === "set-src") {
      stopTimer();
      if (img && img.getAttribute("data-cover-gen") === String(generation)) {
        img.src = action.url;
        settleOrArm();
      }
      return;
    }
    if (action.type === "placeholder") {
      stopTimer();
      replaceWithPlaceholder(img, generation);
    }
  };

  const onLoad = () => apply({ type: "load", generation });
  const onError = () => apply({ type: "error", generation });
  const armTimeout = () => {
    stopTimer();
    timer = setTimeout(() => apply({ type: "timeout", generation }), timeoutMs);
  };

  const settleOrArm = () => {
    if (session.cancelled) return;
    decodeToken += 1;
    const token = decodeToken;
    const state = historyCoverImageState(img, { eligible });
    if (state === "loaded") {
      apply({ type: "load", generation });
      return;
    }
    if (!eligible) {
      stopTimer();
      return;
    }
    // Eligible and not yet loaded. Cache-hit SVG (complete, naturalWidth 0,
    // load may not fire) is settled with one decode(). Never call decode
    // on off-screen lazy images — those return earlier while ineligible.
    if (img.complete && typeof img.decode === "function") {
      let pending;
      try {
        pending = img.decode();
      } catch {
        apply({ type: "error", generation });
        return;
      }
      if (pending && typeof pending.then === "function") {
        pending.then(
          () => {
            if (token !== decodeToken || session.cancelled) return;
            apply({ type: "load", generation });
          },
          () => {
            if (token !== decodeToken || session.cancelled) return;
            apply({ type: "error", generation });
          }
        );
      }
    }
    armTimeout();
  };

  const markEligible = () => {
    if (session.cancelled || eligible) return;
    eligible = true;
    settleOrArm();
  };

  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);

  if (!eligible && io && io.observer && io.waiters) {
    io.waiters.set(img, markEligible);
    try {
      io.observer.observe(img);
    } catch {
      // Stay pending until load/error; do not arm a bind-time timeout.
    }
  } else if (eligible) {
    settleOrArm();
  }
  // No IntersectionObserver: lazy covers stay pending until load/error.

  return () => {
    decodeToken += 1;
    if (io && io.waiters) io.waiters.delete(img);
    if (io && io.observer) {
      try {
        io.observer.unobserve(img);
      } catch {
        /* ignore */
      }
    }
    apply({ type: "cancel", generation });
    img.removeEventListener("load", onLoad);
    img.removeEventListener("error", onError);
  };
}

function replaceWithPlaceholder(img, generation) {
  if (!img || !img.parentNode) return;
  if (img.getAttribute("data-cover-gen") !== String(generation)) return;
  const letter = img.getAttribute("data-cover-letter") || "?";
  const color = img.getAttribute("data-cover-color") || colorFromString("");
  const ph = (img.ownerDocument || document).createElement("div");
  ph.className = "cover-ph";
  ph.setAttribute("aria-hidden", "true");
  ph.style.background = color;
  ph.textContent = letter;
  img.replaceWith(ph);
}
