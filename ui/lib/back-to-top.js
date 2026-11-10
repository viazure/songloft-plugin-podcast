/**
 * Back-to-top floating button.
 *
 * Works for both the window scroller and each `.scroll-body` container, and
 * remembers which scroller was last active so the button scrolls the one the
 * user is actually looking at.
 */

import { $ } from "./dom.js";
import { icon } from "./icons.js";

const THRESHOLD = 480;

let activeScroller = null;

function scrollers() {
  // The window plus every list container that can scroll on its own.
  return [window, ...Array.from(document.querySelectorAll(".scroll-body"))];
}

function scrollTopOf(target) {
  if (target === window) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return target.scrollTop || 0;
}

function syncButton() {
  const btn = $("btnBackToTop");
  if (!btn) return;
  const target = activeScroller || window;
  btn.classList.toggle("show", scrollTopOf(target) > THRESHOLD);
}

export function bindBackToTop() {
  const btn = $("btnBackToTop");
  if (!btn) {
    return;
  }
  if (!btn.querySelector(".ico")) btn.innerHTML = icon("arrowUp", 18);

  for (const target of scrollers()) {
    target.addEventListener(
      "scroll",
      () => {
        activeScroller = target;
        syncButton();
      },
      { passive: true }
    );
  }
  window.addEventListener("resize", syncButton, { passive: true });

  btn.addEventListener("click", () => {
    const target = activeScroller || window;
    try {
      if (target === window) window.scrollTo({ top: 0, behavior: "smooth" });
      else target.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      if (target === window) window.scrollTo(0, 0);
      else target.scrollTop = 0;
    }
    btn.classList.remove("show");
  });

  syncButton();
}

/** Re-arm listeners after a view replaced its list container. */
export function refreshBackToTopTargets() {
  for (const target of scrollers()) {
    if (target === window) continue;
    if (target.dataset.fabBound === "1") continue;
    target.dataset.fabBound = "1";
    target.addEventListener(
      "scroll",
      () => {
        activeScroller = target;
        syncButton();
      },
      { passive: true }
    );
  }
  syncButton();
}
