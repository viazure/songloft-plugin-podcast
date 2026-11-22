/**
 * Modal + confirm + popover primitives.
 *
 * Every dialog in the plugin goes through here so the visuals, button classes
 * and keyboard behaviour stay identical (native `confirm()` / `alert()` are
 * never used).
 */

import { escapeHtml } from "./dom.js";
import { icon } from "./icons.js";
import { setToastMount } from "./toast.js";

let modalRoot = null;
let modalResolve = null;
let modalOnClose = null;

function ensureModalRoot() {
  if (modalRoot && modalRoot.isConnected) return modalRoot;
  const dialog = document.createElement("dialog");
  dialog.id = "appModal";
  dialog.className = "modal";
  dialog.innerHTML =
    '<div class="modal__panel">' +
    '<div class="modal__head"><div class="modal__title" id="appModalTitle"></div>' +
    '<button type="button" class="icon-btn" id="appModalClose" aria-label="关闭"></button></div>' +
    '<div class="modal__body" id="appModalBody"></div>' +
    '<div class="modal__foot" id="appModalFoot"></div>' +
    "</div>";
  document.body.appendChild(dialog);
  dialog.querySelector("#appModalClose").innerHTML = icon("x", 16);
  dialog.querySelector("#appModalClose").addEventListener("click", () => closeModal());
  dialog.addEventListener("cancel", (ev) => {
    ev.preventDefault();
    closeModal();
  });
  dialog.addEventListener("click", (ev) => {
    if (ev.target === dialog) closeModal();
  });
  modalRoot = dialog;
  return dialog;
}

export function closeModal(result) {
  const dialog = modalRoot;
  if (!dialog) return;
  // Leave top layer first conceptually: park toast back on body before/while closing.
  setToastMount(null);
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  dialog.classList.remove("modal--wide", "modal--sheet");
  const foot = dialog.querySelector("#appModalFoot");
  if (foot) {
    foot.className = "modal__foot";
    foot.style.display = "";
  }
  const head = dialog.querySelector(".modal__head");
  if (head) head.classList.remove("modal__head--nav");
  const done = modalResolve;
  const onClose = modalOnClose;
  modalResolve = null;
  modalOnClose = null;
  if (typeof onClose === "function") onClose(result);
  if (done) done(result);
}

/**
 * Open a modal.
 *
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string|Node} [opts.body]   HTML string or DOM node
 * @param {Array<{label:string, shortLabel?:string, ariaLabel?:string, title?:string, ariaPressed?:boolean, kind?:string, iconName?:string, value?:any, onClick?:Function, close?:boolean}>} [opts.actions]
 * @param {"default"|"wide"|"sheet"} [opts.size]
 * @param {boolean} [opts.dismissible]
 * @param {string} [opts.footClass]  extra class on #appModalFoot (e.g. episode actions)
 * @param {string} [opts.closeIcon]  icon name for the head dismiss control (default "x")
 * @param {string} [opts.closeLabel] aria/title for the head dismiss control
 * @param {boolean} [opts.closeLeading] place dismiss control before the title (back nav)
 * @param {Function} [opts.onClose] called from closeModal after the dialog hides
 * @returns {Promise<any>} resolves with the clicked action value (or undefined)
 */
export function openModal(opts = {}) {
  const dialog = ensureModalRoot();
  const headEl = dialog.querySelector(".modal__head");
  const titleEl = dialog.querySelector("#appModalTitle");
  const closeBtn = dialog.querySelector("#appModalClose");
  const bodyEl = dialog.querySelector("#appModalBody");
  const footEl = dialog.querySelector("#appModalFoot");

  dialog.classList.toggle("modal--wide", opts.size === "wide");
  dialog.classList.toggle("modal--sheet", opts.size === "sheet");

  modalOnClose = typeof opts.onClose === "function" ? opts.onClose : null;

  const closeLabel = opts.closeLabel || "关闭";
  const closeIcon = opts.closeIcon || "x";
  closeBtn.innerHTML = icon(closeIcon, 16);
  closeBtn.setAttribute("aria-label", closeLabel);
  closeBtn.title = closeLabel;
  if (opts.closeLeading) {
    headEl.classList.add("modal__head--nav");
    if (closeBtn.nextElementSibling !== titleEl) headEl.insertBefore(closeBtn, titleEl);
  } else {
    headEl.classList.remove("modal__head--nav");
    if (titleEl.nextElementSibling !== closeBtn) headEl.appendChild(closeBtn);
  }

  titleEl.innerHTML = opts.title ? escapeHtml(opts.title) : "";
  titleEl.style.display = opts.title ? "" : "none";

  bodyEl.innerHTML = "";
  if (opts.body instanceof Node) bodyEl.appendChild(opts.body);
  else if (typeof opts.body === "string") bodyEl.innerHTML = opts.body;

  footEl.className = "modal__foot" + (opts.footClass ? ` ${opts.footClass}` : "");
  footEl.innerHTML = "";
  const actions = Array.isArray(opts.actions)
    ? opts.actions
    : [{ label: "关闭", value: undefined, close: true }];
  footEl.style.display = actions.length ? "" : "none";
  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    const kind = action.kind || "ghost";
    btn.className =
      kind === "primary"
        ? "btn btn--primary"
        : kind === "danger"
          ? "btn btn--danger"
          : kind === "tonal"
            ? "btn btn--tonal"
            : "btn btn--ghost";
    const fullName = action.ariaLabel || action.label;
    btn.setAttribute("aria-label", fullName);
    btn.title = action.title || fullName;
    if (action.ariaPressed != null) {
      btn.setAttribute("aria-pressed", action.ariaPressed ? "true" : "false");
    }
    const iconHtml = action.iconName ? icon(action.iconName, 15) : "";
    if (action.shortLabel) {
      btn.innerHTML =
        iconHtml +
        `<span class="btn-label-full">${escapeHtml(action.label)}</span>` +
        `<span class="btn-label-short">${escapeHtml(action.shortLabel)}</span>`;
    } else {
      btn.innerHTML = iconHtml + `<span>${escapeHtml(action.label)}</span>`;
    }
    btn.addEventListener("click", async () => {
      if (action.onClick) {
        const keepOpen = await action.onClick();
        if (keepOpen === true) return;
      }
      const shouldClose = action.close !== false;
      if (shouldClose) closeModal(action.value);
    });
    footEl.appendChild(btn);
  }

  if (opts.dismissible === false) {
    dialog.querySelector("#appModalClose").style.display = "none";
    dialog.dataset.persistent = "1";
  } else {
    dialog.querySelector("#appModalClose").style.display = "";
    delete dialog.dataset.persistent;
  }

  const promise = new Promise((resolve) => {
    modalResolve = resolve;
  });

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "open");
  // Native dialog top layer hides body-level toast; mount into #appModal instead.
  setToastMount(dialog);

  return promise;
}

/**
 * Yes/No confirmation dialog.
 * @returns {Promise<boolean>}
 */
export async function uiConfirm(opts = {}) {
  const result = await openModal({
    title: opts.title || "请确认",
    body: `<p>${escapeHtml(opts.message || "")}</p>`,
    size: opts.size,
    actions: [
      {
        label: opts.cancelText || "取消",
        kind: "ghost",
        value: false,
        close: true,
      },
      {
        label: opts.okText || "确定",
        kind: opts.danger ? "danger" : "primary",
        value: true,
        close: true,
      },
    ],
    dismissible: true,
  });
  return result === true;
}

/* ------------------------------------------------------------------ */
/* Popover menus (the small「更多」dropdowns)                          */
/* ------------------------------------------------------------------ */

let openPopover = null;

/** Close any open popover. */
export function closePopovers(except) {
  document.querySelectorAll(".more-wrap.open, .more-wrap.is-open").forEach((wrap) => {
    if (except && wrap === except) return;
    wrap.classList.remove("open");
    wrap.classList.remove("is-open");
  });
  openPopover = null;
}

/** Toggle a `.more-wrap` popover, flipping it to stay inside the viewport. */
export function togglePopover(wrap) {
  if (!wrap) return;
  const wasOpen = wrap.classList.contains("open");
  closePopovers(wrap);
  if (wasOpen) {
    wrap.classList.remove("open");
    openPopover = null;
    return;
  }
  wrap.classList.add("open");
  openPopover = wrap;
  positionPopover(wrap);
}

function isClippingOverflow(value) {
  return value === "auto" || value === "hidden" || value === "scroll" || value === "overlay" || value === "clip";
}

/** Nearest ancestor whose overflow clips descendants, typically `.scroll-body`. */
function nearestClippingAncestor(el) {
  let node = el && el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(node) : null;
    if (
      style &&
      (isClippingOverflow(style.overflow) ||
        isClippingOverflow(style.overflowX) ||
        isClippingOverflow(style.overflowY))
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Intersection of the viewport and the nearest clipping ancestor, if any. */
function clipBounds(wrap) {
  const view = { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  const clip = nearestClippingAncestor(wrap);
  if (!clip || typeof clip.getBoundingClientRect !== "function") return view;
  const r = clip.getBoundingClientRect();
  return {
    left: Math.max(view.left, r.left),
    right: Math.min(view.right, r.right),
    top: Math.max(view.top, r.top),
    bottom: Math.min(view.bottom, r.bottom),
  };
}

/**
 * Keep the menu inside the intersection of the viewport and the nearest
 * clipping ancestor (typically `.scroll-body` / a section scroller).
 *
 * The episode rows are short cards, so a menu opening downward at the bottom of
 * the list used to be clipped by the scroll container (reported as "操作区显示
 * 不完整"). Flip it up when the space below the trigger, measured against that
 * intersection, is smaller than the menu (leaving a 12px gutter) and there is
 * enough room above.
 *
 * Horizontally the menu is right-aligned with the 「…」 trigger. If opening
 * to the left would cross the viewport or a clipping ancestor's left edge,
 * flip it to --start. When both sides overflow, pick the side with more room.
 */
function positionPopover(wrap) {
  const menu = wrap.querySelector(".more-menu");
  if (!menu) return;
  menu.classList.remove("more-menu--up");
  menu.classList.remove("more-menu--start");
  const rect = wrap.getBoundingClientRect();
  const menuHeight = menu.offsetHeight || 160;
  const clip = clipBounds(wrap);
  const spaceBelow = clip.bottom - rect.bottom;
  const spaceAbove = rect.top - clip.top;
  if (spaceBelow < menuHeight + 12 && spaceAbove > menuHeight + 12) {
    menu.classList.add("more-menu--up");
  }
  const menuWidth = menu.offsetWidth || 148;
  const overflowsLeft = rect.right - menuWidth < clip.left + 12;
  const overflowsRight = rect.left + menuWidth > clip.right - 12;
  if (overflowsLeft && overflowsRight) {
    const spaceLeft = rect.right - clip.left;
    const spaceRight = clip.right - rect.left;
    if (spaceRight > spaceLeft) menu.classList.add("more-menu--start");
  } else if (overflowsLeft) {
    menu.classList.add("more-menu--start");
  }
}

/** Wire global dismissal once. */
export function bindPopoverDismiss() {
  document.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element)) return;
    if (ev.target.closest(".more-wrap") || ev.target.closest("#appModal")) return;
    closePopovers();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closePopovers();
  });
}
