/**
 * Modal + confirm + popover primitives.
 *
 * Every dialog in the plugin goes through here so the visuals, button classes
 * and keyboard behaviour stay identical (native `confirm()` / `alert()` are
 * never used).
 */

import { escapeHtml } from "./dom.js";
import { icon } from "./icons.js";

let modalRoot = null;
let modalResolve = null;

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
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  dialog.classList.remove("modal--wide", "modal--sheet");
  const done = modalResolve;
  modalResolve = null;
  if (done) done(result);
}

/**
 * Open a modal.
 *
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string|Node} [opts.body]   HTML string or DOM node
 * @param {Array<{label:string, kind?:string, iconName?:string, value?:any, onClick?:Function, close?:boolean}>} [opts.actions]
 * @param {"default"|"wide"|"sheet"} [opts.size]
 * @param {boolean} [opts.dismissible]
 * @returns {Promise<any>} resolves with the clicked action value (or undefined)
 */
export function openModal(opts = {}) {
  const dialog = ensureModalRoot();
  const titleEl = dialog.querySelector("#appModalTitle");
  const bodyEl = dialog.querySelector("#appModalBody");
  const footEl = dialog.querySelector("#appModalFoot");

  dialog.classList.toggle("modal--wide", opts.size === "wide");
  dialog.classList.toggle("modal--sheet", opts.size === "sheet");

  titleEl.innerHTML = opts.title ? escapeHtml(opts.title) : "";
  titleEl.style.display = opts.title ? "" : "none";

  bodyEl.innerHTML = "";
  if (opts.body instanceof Node) bodyEl.appendChild(opts.body);
  else if (typeof opts.body === "string") bodyEl.innerHTML = opts.body;

  footEl.innerHTML = "";
  const actions = opts.actions || [{ label: "关闭", value: undefined, close: true }];
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
    btn.innerHTML = (action.iconName ? icon(action.iconName, 15) : "") + `<span>${escapeHtml(action.label)}</span>`;
    btn.addEventListener("click", async () => {
      if (action.onClick) {
        const keepOpen = await action.onClick();
        if (keepOpen === true) return;
      }
      const shouldClose = action.close !== false;
      if (shouldClose) closeModal(action.value);
    });    footEl.appendChild(btn);
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

/** Toggle a `.more-wrap` popover, flipping it upward near the viewport bottom. */
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

/**
 * Keep the menu inside the viewport.
 *
 * The episode rows are short cards, so a menu opening downward at the bottom of
 * the list used to be clipped by the scroll container (reported as "操作区显示
 * 不完整"). Flip it up when the space below is smaller than the menu.
 */
function positionPopover(wrap) {
  const menu = wrap.querySelector(".more-menu");
  if (!menu) return;
  menu.classList.remove("more-menu--up");
  const rect = wrap.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const menuHeight = menu.offsetHeight || 160;
  if (spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12) {
    menu.classList.add("more-menu--up");
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
