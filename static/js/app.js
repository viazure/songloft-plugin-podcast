/* Generated from ui/ by scripts/build-ui.mjs — do not edit. */
"use strict";
(() => {
  // ui/lib/dom.js
  var $ = (id) => document.getElementById(id);
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function setHidden(el2, hidden) {
    if (!el2) return;
    if (hidden) el2.setAttribute("hidden", "");
    else el2.removeAttribute("hidden");
    el2.classList.toggle("hidden", !!hidden);
  }

  // ui/lib/icons.js
  var ICONS = {
    play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
    pause: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>',
    square: '<rect x="5" y="5" width="14" height="14" rx="1"></rect>',
    rewind: '<polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon>',
    forward: '<polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon>',
    listPlus: '<path d="M11 12H3"></path><path d="M16 6H3"></path><path d="M16 18H3"></path><path d="M18 9v6"></path><path d="M21 12h-6"></path>',
    listMusic: '<path d="M21 15V6"></path><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path><path d="M12 12H3"></path><path d="M16 6H3"></path><path d="M12 18H3"></path>',
    fileText: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line><line x1="10" x2="8" y1="9" y2="9"></line>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    arrowLeft: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
    moreHorizontal: '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
    moreVertical: '<circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>',
    clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    rss: '<path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>',
    listChecks: '<path d="m3 17 2 2 4-4"></path><path d="m3 7 2 2 4-4"></path><path d="M13 6h8"></path><path d="M13 12h8"></path><path d="M13 18h8"></path>',
    trash: '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>',
    gripVertical: '<circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
    search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
    arrowUp: '<path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>',
    speaker: '<rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M12 6h.01"></path><circle cx="12" cy="14" r="4"></circle><path d="M12 14h.01"></path>',
    podcast: '<path d="M4.9 19.1a10 10 0 1 1 14.2 0"></path><path d="M7.8 16.2a6 6 0 1 1 8.4 0"></path><circle cx="12" cy="12" r="2"></circle><path d="M12 14v7"></path>',
    chevronDown: '<path d="m6 9 6 6 6-6"></path>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
    panelRight: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M15 3v18"></path>',
    panelRightClose: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M15 3v18"></path><path d="m8 9 3 3-3 3"></path>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><polyline points="12 7 12 12 15 14"></polyline>',
    slidersHorizontal: '<line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    sparkles: '<path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z"></path><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"></path>'
  };
  function icon(name, size) {
    const body = ICONS[name];
    if (!body) return "";
    const s = size || 18;
    return `<span class="ico" style="width:${s}px;height:${s}px" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg></span>`;
  }
  function setButtonIcon(btn, name, size) {
    if (!btn) return;
    btn.innerHTML = icon(name, size || 18);
  }
  function replaceIcon(el2, name, size) {
    if (!el2 || typeof el2.querySelector !== "function") return false;
    if (!ICONS[name]) return false;
    const ico = el2.querySelector(".ico");
    if (!ico) return false;
    let s = size;
    if (s == null) {
      const raw = typeof ico.getAttribute === "function" && ico.getAttribute("style") || "";
      const m = /width:\s*(\d+)/.exec(String(raw));
      s = m ? Number(m[1]) : 18;
    }
    ico.outerHTML = icon(name, s);
    return true;
  }
  function hydrateIconSlots(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-icon]").forEach((el2) => {
      const name = el2.getAttribute("data-icon");
      const size = Number(el2.getAttribute("data-size")) || 16;
      el2.insertAdjacentHTML("afterbegin", icon(name, size));
    });
  }

  // ui/lib/toast.js
  var timer = null;
  var el = null;
  var mountParent = null;
  function resolveMount() {
    if (mountParent && mountParent.isConnected) return mountParent;
    return document.body;
  }
  function ensure() {
    const host = resolveMount();
    if (el && el.isConnected) {
      if (el.parentElement !== host) host.appendChild(el);
      return el;
    }
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    host.appendChild(el);
    return el;
  }
  function setToastMount(parent) {
    mountParent = parent && typeof parent.appendChild === "function" && parent.isConnected ? parent : null;
    if (!el) return;
    const host = resolveMount();
    if (el.isConnected) {
      if (el.parentElement !== host) host.appendChild(el);
    } else if (el.classList.contains("show")) {
      host.appendChild(el);
    }
  }
  var SILENT = /^(继续播放|已开始播放|已继续收听|继续收听|正在加载剧集…)$/;
  function toast(text, kind) {
    const node = ensure();
    const msg = String(text ?? "");
    if (!msg.trim()) {
      node.classList.remove("show");
      return;
    }
    const brief = SILENT.test(msg.trim());
    node.className = `toast show ${kind || "muted"}${brief ? " toast--brief" : ""}`;
    node.textContent = msg;
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => {
        node.classList.remove("show");
      },
      kind === "err" ? 4600 : brief ? 1600 : 2800
    );
  }
  function clearToast() {
    if (el) el.classList.remove("show");
    if (timer) clearTimeout(timer);
  }

  // ui/lib/modal.js
  var modalRoot = null;
  var modalResolve = null;
  var modalOnClose = null;
  function ensureModalRoot() {
    if (modalRoot && modalRoot.isConnected) return modalRoot;
    const dialog = document.createElement("dialog");
    dialog.id = "appModal";
    dialog.className = "modal";
    dialog.innerHTML = '<div class="modal__panel"><div class="modal__head"><div class="modal__title" id="appModalTitle"></div><button type="button" class="icon-btn" id="appModalClose" aria-label="\u5173\u95ED"></button></div><div class="modal__body" id="appModalBody"></div><div class="modal__foot" id="appModalFoot"></div></div>';
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
  function closeModal(result) {
    const dialog = modalRoot;
    if (!dialog) return;
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
  function openModal(opts = {}) {
    const dialog = ensureModalRoot();
    const headEl = dialog.querySelector(".modal__head");
    const titleEl = dialog.querySelector("#appModalTitle");
    const closeBtn = dialog.querySelector("#appModalClose");
    const bodyEl = dialog.querySelector("#appModalBody");
    const footEl = dialog.querySelector("#appModalFoot");
    dialog.classList.toggle("modal--wide", opts.size === "wide");
    dialog.classList.toggle("modal--sheet", opts.size === "sheet");
    modalOnClose = typeof opts.onClose === "function" ? opts.onClose : null;
    const closeLabel = opts.closeLabel || "\u5173\u95ED";
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
    const actions = Array.isArray(opts.actions) ? opts.actions : [{ label: "\u5173\u95ED", value: void 0, close: true }];
    footEl.style.display = actions.length ? "" : "none";
    for (const action of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      const kind = action.kind || "ghost";
      btn.className = kind === "primary" ? "btn btn--primary" : kind === "danger" ? "btn btn--danger" : kind === "tonal" ? "btn btn--tonal" : "btn btn--ghost";
      const fullName = action.ariaLabel || action.label;
      btn.setAttribute("aria-label", fullName);
      btn.title = action.title || fullName;
      if (action.ariaPressed != null) {
        btn.setAttribute("aria-pressed", action.ariaPressed ? "true" : "false");
      }
      const iconHtml = action.iconName ? icon(action.iconName, 15) : "";
      if (action.shortLabel) {
        btn.innerHTML = iconHtml + `<span class="btn-label-full">${escapeHtml(action.label)}</span><span class="btn-label-short">${escapeHtml(action.shortLabel)}</span>`;
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
    setToastMount(dialog);
    return promise;
  }
  async function uiConfirm(opts = {}) {
    const result = await openModal({
      title: opts.title || "\u8BF7\u786E\u8BA4",
      body: `<p>${escapeHtml(opts.message || "")}</p>`,
      size: opts.size,
      actions: [
        {
          label: opts.cancelText || "\u53D6\u6D88",
          kind: "ghost",
          value: false,
          close: true
        },
        {
          label: opts.okText || "\u786E\u5B9A",
          kind: opts.danger ? "danger" : "primary",
          value: true,
          close: true
        }
      ],
      dismissible: true
    });
    return result === true;
  }
  var openPopover = null;
  function closePopovers(except) {
    document.querySelectorAll(".more-wrap.open, .more-wrap.is-open").forEach((wrap) => {
      if (except && wrap === except) return;
      wrap.classList.remove("open");
      wrap.classList.remove("is-open");
    });
    openPopover = null;
  }
  function togglePopover(wrap) {
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
  function nearestClippingAncestor(el2) {
    let node = el2 && el2.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(node) : null;
      if (style && (isClippingOverflow(style.overflow) || isClippingOverflow(style.overflowX) || isClippingOverflow(style.overflowY))) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }
  function clipBounds(wrap) {
    const view = { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const clip = nearestClippingAncestor(wrap);
    if (!clip || typeof clip.getBoundingClientRect !== "function") return view;
    const r = clip.getBoundingClientRect();
    return {
      left: Math.max(view.left, r.left),
      right: Math.min(view.right, r.right),
      top: Math.max(view.top, r.top),
      bottom: Math.min(view.bottom, r.bottom)
    };
  }
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
  function bindPopoverDismiss() {
    document.addEventListener("click", (ev) => {
      if (!(ev.target instanceof Element)) return;
      if (ev.target.closest(".more-wrap") || ev.target.closest("#appModal")) return;
      closePopovers();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closePopovers();
    });
  }

  // ui/lib/host.js
  function pluginRoot() {
    return typeof window !== "undefined" ? window.SongloftPlugin : null;
  }
  function isClient() {
    try {
      const h = pluginRoot() && window.SongloftPlugin.host;
      return !!(h && typeof h.isAvailable === "function" && h.isAvailable());
    } catch {
      return false;
    }
  }
  async function getCapabilities() {
    const root = pluginRoot();
    if (!isClient()) {
      return { available: false, hasPlayer: false, version: null, platform: null, capabilities: [] };
    }
    const playerOk = !!(root && root.player && typeof root.player.play === "function");
    try {
      const info = await root.host.getInfo();
      const caps2 = info && info.capabilities || [];
      return {
        available: true,
        hasPlayer: caps2.includes("player") || playerOk,
        version: info.version || null,
        platform: info.platform || null,
        capabilities: caps2
      };
    } catch {
      return { available: true, hasPlayer: playerOk, version: null, platform: null, capabilities: [] };
    }
  }
  function requirePlayer() {
    const root = pluginRoot();
    if (!isClient() || !root || !root.player || typeof root.player.play !== "function") {
      throw new Error("\u5BBF\u4E3B\u64AD\u653E\u5668\u4E0D\u53EF\u7528\uFF08\u8BF7\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\u672C\u63D2\u4EF6\uFF09");
    }
    return root.player;
  }
  function hasSetQueue() {
    try {
      return typeof requirePlayer().setQueue === "function";
    } catch {
      return false;
    }
  }
  function requireSetQueue() {
    const player = requirePlayer();
    if (typeof player.setQueue !== "function") {
      throw new Error("\u5BBF\u4E3B\u4E0D\u652F\u6301\u6574\u8868\u64AD\u653E\uFF08\u8BF7\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\u672C\u63D2\u4EF6\uFF0C\u6216\u5347\u7EA7\u5BBF\u4E3B\uFF09");
    }
    return player;
  }
  async function play(songId) {
    const player = requirePlayer();
    if (songId == null) return player.play();
    return player.play(Number(songId));
  }
  async function pause() {
    return requirePlayer().pause();
  }
  async function getState() {
    return requirePlayer().getState();
  }
  function onStateChange(cb) {
    return requirePlayer().onStateChange(cb);
  }
  async function replaceQueueAndPlay(songIds, startIndex, opts = {}) {
    const player = requireSetQueue();
    const options = { startIndex: startIndex == null ? 0 : Number(startIndex) };
    const sourceId = opts && opts.sourcePlaylistId;
    if (sourceId != null && sourceId !== "" && Number.isFinite(Number(sourceId))) {
      options.sourcePlaylistId = Number(sourceId);
    }
    return player.setQueue(songIds.map(Number), options);
  }
  async function setPlayMode(mode) {
    const player = requirePlayer();
    if (typeof player.setPlayMode !== "function") {
      throw new Error("\u5BBF\u4E3B\u4E0D\u652F\u6301\u5207\u6362\u64AD\u653E\u6A21\u5F0F");
    }
    return player.setPlayMode(mode);
  }

  // ui/lib/playback.js
  var listeners = /* @__PURE__ */ new Set();
  var state = {
    phase: "idle",
    // idle | preparing | play_request | playing | paused | prepare_error | play_error | ended
    current: null,
    // { subscriptionId, feedUrl, guid, title, showTitle, songId, durationSec, guidSource, coverUrl }
    positionSec: 0,
    durationSec: null,
    error: null,
    hostHint: null,
    progressCapable: true,
    hostSongId: null,
    /** Host getState source_playlist_id; locks only plugin「播客」sessions. */
    sourcePlaylistId: null
  };
  var clock = { wallMs: 0, positionSec: 0, running: false };
  function syncClock(positionSec, running) {
    clock = {
      wallMs: Date.now(),
      positionSec: Math.max(0, Number(positionSec) || 0),
      running: !!running
    };
  }
  function livePositionSec(snap) {
    const s = snap || get();
    const base = typeof s.positionSec === "number" && Number.isFinite(s.positionSec) ? s.positionSec : 0;
    if (!(s.phase === "playing" && clock.running)) return base;
    const elapsed = (Date.now() - clock.wallMs) / 1e3;
    let next = clock.positionSec + Math.max(0, elapsed);
    const dur = typeof s.durationSec === "number" && s.durationSec > 0 ? s.durationSec : null;
    if (dur != null) next = Math.min(next, dur);
    return next;
  }
  function emit() {
    const snap = { ...state, current: state.current ? { ...state.current } : null };
    listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (_) {
      }
    });
  }
  function set(patch2) {
    const phaseChanged = Object.prototype.hasOwnProperty.call(patch2, "phase");
    const posChanged = Object.prototype.hasOwnProperty.call(patch2, "positionSec");
    if (phaseChanged && !posChanged && state.phase === "playing" && patch2.phase !== "playing") {
      patch2 = { ...patch2, positionSec: livePositionSec() };
    }
    Object.assign(state, patch2);
    if (phaseChanged || posChanged) {
      syncClock(state.positionSec, state.phase === "playing");
    }
    emit();
  }
  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function get() {
    return { ...state, current: state.current ? { ...state.current } : null };
  }
  function beginPrepare(episode) {
    set({ phase: "preparing", current: episode, error: null, hostHint: null });
  }
  function prepareFailed(message) {
    set({
      phase: "prepare_error",
      error: message || "\u51C6\u5907\u97F3\u9891\u5931\u8D25",
      current: state.current ? { ...state.current, songId: null } : null
    });
  }
  function beginPlayRequest(episodeWithSongId) {
    set({ phase: "play_request", current: episodeWithSongId, error: null });
  }
  function playFailed(message) {
    set({ phase: "play_error", error: message || "\u64AD\u653E\u5931\u8D25" });
  }
  function setProgressCapable(v) {
    set({ progressCapable: !!v });
  }
  function setPhase(phase, patch2) {
    set({ phase, ...patch2 || {} });
  }
  function applyHostState(hostState) {
    if (!hostState) return;
    {
      const raw = hostState.source_playlist_id != null ? hostState.source_playlist_id : hostState.sourcePlaylistId;
      const n = Number(raw);
      set({ sourcePlaylistId: Number.isFinite(n) && n > 0 ? n : null });
    }
    const playing = !!hostState.is_playing;
    const cur = hostState.current_song;
    const hostSongId = cur && typeof cur.id === "number" ? cur.id : null;
    const t = typeof hostState.current_time === "number" ? hostState.current_time : state.positionSec;
    const d = typeof hostState.duration === "number" && hostState.duration > 0 ? hostState.duration : state.durationSec;
    const matched = !!(state.current && state.current.songId != null && hostSongId != null && hostSongId === state.current.songId);
    let nextCurrent = state.current;
    if (cur && hostSongId != null) {
      if (!nextCurrent || nextCurrent.songId !== hostSongId) {
        nextCurrent = {
          ...nextCurrent || {},
          songId: hostSongId,
          title: cur.title || nextCurrent && nextCurrent.title || "#" + hostSongId,
          showTitle: cur.album || cur.artist || nextCurrent && nextCurrent.showTitle || ""
        };
      }
    }
    if (state.phase === "play_request" || state.phase === "preparing") {
      if (playing) {
        set({
          phase: "playing",
          current: nextCurrent,
          hostSongId,
          positionSec: t,
          durationSec: d,
          error: null,
          hostHint: null
        });
        return;
      }
      if (matched || hostSongId === (state.current && state.current.songId)) {
        set({
          phase: playing ? "playing" : "paused",
          current: nextCurrent,
          hostSongId,
          positionSec: t,
          durationSec: d,
          error: null,
          hostHint: playing ? null : "\u5DF2\u9009\u4E2D\u5F53\u524D\u96C6\uFF0C\u7B49\u5F85\u51FA\u58F0\u2026"
        });
        return;
      }
    }
    const settledPhases = ["playing", "paused", "play_request", "idle", "ended"];
    if (settledPhases.includes(state.phase)) {
      if (playing) {
        set({
          phase: "playing",
          current: nextCurrent,
          hostSongId,
          positionSec: t,
          durationSec: d,
          hostHint: null
        });
      } else if (state.phase === "playing") {
        set({ phase: "paused", current: nextCurrent, hostSongId, positionSec: t, durationSec: d });
      } else if (matched || hostSongId != null) {
        set({
          phase: state.phase === "ended" ? "ended" : "paused",
          current: nextCurrent,
          hostSongId,
          positionSec: t,
          durationSec: d
        });
      } else {
        set({ hostSongId, positionSec: t, durationSec: d });
      }
    } else {
      set({ hostSongId, current: nextCurrent || state.current });
    }
    if (!playing && d != null && d > 0 && t >= d - 1.5 && nextCurrent && hostSongId != null && nextCurrent.songId === hostSongId) {
      set({ phase: "ended", current: nextCurrent, hostSongId, positionSec: d, durationSec: d });
    }
  }
  function currentSongId(snap) {
    const s = snap || get();
    if (s.hostSongId != null) return s.hostSongId;
    if (s.current && s.current.songId != null) return s.current.songId;
    return null;
  }
  var PHASE_LABELS = {
    preparing: "\u51C6\u5907\u4E2D",
    play_request: "\u8BF7\u6C42\u4E2D",
    playing: "\u6B63\u5728\u64AD\u653E",
    paused: "\u5DF2\u6682\u505C",
    prepare_error: "\u51FA\u9519",
    play_error: "\u51FA\u9519",
    ended: "\u5DF2\u542C\u5B8C"
  };
  function phaseLabel(phase) {
    return PHASE_LABELS[phase] || "";
  }
  function liveProgressFor(song, snap) {
    const playingId = currentSongId(snap);
    let prog = song && song.progress ? { ...song.progress } : null;
    if (song && playingId != null && song.id === playingId && snap) {
      const pos = livePositionSec(snap);
      const dur = (typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : prog && prog.durationSec) || song.duration || song.durationSec || null;
      const ended = snap.phase === "ended";
      const atTail = ended || dur > 0 && pos >= dur - 3;
      prog = {
        positionSec: ended && dur > 0 ? dur : pos,
        durationSec: dur,
        completed: atTail
      };
    }
    return prog;
  }

  // ui/lib/back-to-top.js
  var THRESHOLD = 480;
  var activeScroller = null;
  function scrollers() {
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
  function bindBackToTop() {
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
  function refreshBackToTopTargets() {
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

  // ui/lib/sync.js
  var DEFAULT_INTERVAL_MS = 2e4;
  var MIN_GAP_MS = 3e3;
  function hasOpenOverlay() {
    if (document.querySelector("#appModal[open]")) return true;
    if (document.querySelector(".more-wrap.open, .more-wrap.is-open")) return true;
    return false;
  }
  function isTyping() {
    const el2 = document.activeElement;
    if (!el2) return false;
    return el2.tagName === "INPUT" || el2.tagName === "TEXTAREA" || el2.tagName === "SELECT" || el2.isContentEditable === true;
  }
  function isDragging() {
    return !!document.querySelector(".q-row.dragging");
  }
  function startDataSync(refresh, options = {}) {
    const intervalMs = typeof options.intervalMs === "number" && options.intervalMs > 0 ? options.intervalMs : DEFAULT_INTERVAL_MS;
    let lastAt = 0;
    let running = false;
    let stopped = false;
    async function run(bypassGap) {
      if (stopped || running) return;
      if (document.visibilityState !== "visible") return;
      if (hasOpenOverlay() || isTyping() || isDragging()) return;
      const now = Date.now();
      if (!bypassGap && now - lastAt < MIN_GAP_MS) return;
      lastAt = now;
      running = true;
      try {
        await refresh();
      } catch (_) {
      } finally {
        running = false;
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") run(true);
    };
    const onFocus = () => run(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    const timer2 = setInterval(() => run(false), intervalMs);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      clearInterval(timer2);
    };
  }

  // ui/lib/castPlan.js
  function queueSongIds(queueSongs) {
    return (Array.isArray(queueSongs) ? queueSongs : []).map((s) => Number(s && (s.id != null ? s.id : s.songId))).filter((id) => Number.isFinite(id) && id > 0);
  }
  function queueIdsWithFront(queueSongs, songId) {
    const ids = queueSongIds(queueSongs);
    const tid = Number(songId);
    if (!Number.isFinite(tid) || tid <= 0) return ids;
    return [tid, ...ids.filter((id) => id !== tid)];
  }
  function resolveSpeakerCastPlan({ songId, forceSingle, queueSongs } = {}) {
    const id = Number(songId);
    if (!Number.isFinite(id) || id <= 0) return null;
    if (forceSingle) return { kind: "one", songId: id, songIds: [id] };
    return { kind: "queue", songId: id, songIds: queueIdsWithFront(queueSongs, id) };
  }
  function buildCastMiotPlaylistBody({ deviceId, songIds, startIndex, songId } = {}) {
    const body = {};
    if (Array.isArray(songIds) && songIds.length) {
      body.songIds = songIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
    }
    if (startIndex != null && startIndex !== "") {
      const idx = Number(startIndex);
      if (Number.isFinite(idx) && idx >= 0) body.startIndex = idx;
    }
    const sid = Number(songId);
    if (Number.isFinite(sid) && sid > 0) body.songId = sid;
    if (typeof deviceId === "string" && deviceId.trim()) body.deviceId = deviceId;
    return body;
  }

  // ui/lib/api.js
  var bridge = () => typeof window !== "undefined" ? window.SongloftPlugin : null;
  function requireBridge() {
    const b = bridge();
    if (!b) throw new Error("SongloftPlugin \u672A\u6CE8\u5165\uFF08\u8BF7\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\uFF09");
    return b;
  }
  async function get2(path) {
    return requireBridge().apiGet(path);
  }
  async function post(path, body) {
    return requireBridge().apiPost(path, body);
  }
  async function put(path, body) {
    const b = requireBridge();
    if (typeof b.apiPut === "function") return b.apiPut(path, body);
    if (typeof b.apiRequest === "function") return b.apiRequest("PUT", path, body);
    throw new Error("apiPut \u4E0D\u53EF\u7528");
  }
  async function del(path, body) {
    const b = requireBridge();
    if (typeof b.apiDelete === "function") {
      return body != null ? b.apiDelete(path, body) : b.apiDelete(path);
    }
    if (typeof b.apiRequest === "function") return b.apiRequest("DELETE", path, body);
    throw new Error("apiDelete \u4E0D\u53EF\u7528");
  }
  var enc = encodeURIComponent;
  var api = {
    status: () => get2("/api/status"),
    home: () => get2("/api/home"),
    settings: () => get2("/api/settings"),
    saveSettings: (body) => post("/api/settings", body),
    listSubscriptions: () => get2("/api/subscriptions"),
    addSubscription: (url) => post("/api/subscriptions", { url }),
    getEpisodes: async (id, opts = {}) => {
      const singlePage = !!(opts && opts.limit != null && opts.follow !== true);
      const episodes = [];
      let offset = opts && opts.offset != null ? Number(opts.offset) : 0;
      let last = null;
      let guard = 0;
      while (guard++ < 1e3) {
        const q = new URLSearchParams();
        if (offset) q.set("offset", String(offset));
        if (opts && opts.limit != null) q.set("limit", String(opts.limit));
        const qs = q.toString();
        const r = await get2(`/api/subscriptions/${enc(id)}/episodes${qs ? `?${qs}` : ""}`);
        last = r;
        if (!r || !r.ok) return r;
        const batch = Array.isArray(r.episodes) ? r.episodes : [];
        episodes.push(...batch);
        if (singlePage || !r.hasMore) {
          return {
            ...r,
            episodes: singlePage ? batch : episodes,
            total: r.total != null ? r.total : episodes.length,
            offset: singlePage ? r.offset : 0,
            hasMore: singlePage ? !!r.hasMore : false,
            nextOffset: r.nextOffset
          };
        }
        const next = Number(r.nextOffset);
        if (!Number.isFinite(next) || next <= offset || !batch.length) break;
        offset = next;
      }
      return last ? { ...last, episodes, hasMore: false, offset: 0, total: last.total != null ? last.total : episodes.length } : last;
    },
    refreshOne: (id) => post(`/api/subscriptions/${enc(id)}/refresh`, {}),
    indexHistory: (id) => post(`/api/subscriptions/${enc(id)}/index-history`, {}),
    refreshAll: () => post("/api/refresh", {}),
    deleteSubscription: (id) => del(`/api/subscriptions/${enc(id)}`),
    batchDeleteSubscriptions: (ids) => post("/api/subscriptions/batch-delete", { ids }),
    updateSubscriptionUrl: (id, url) => put(`/api/subscriptions/${enc(id)}`, { url }),
    prepare: (body) => post("/api/episodes/prepare", body),
    queue: () => get2("/api/queue"),
    queueAdd: (body) => post("/api/queue/add", body),
    queueAddShow: (subscriptionId) => post("/api/queue/add-show", { subscriptionId }),
    queueRemove: (songIds) => post("/api/queue/remove", { songIds }),
    queueRemovePlayed: () => post("/api/queue/remove-played", {}),
    queueMove: (songId, direction) => post("/api/queue/move", { songId, direction }),
    /** Move one episode to row 0 of「播客」before a play/cast. */
    queuePlayFront: (songId) => post("/api/queue/play-front", { songId }),
    queueReorder: (songIds) => post("/api/queue/reorder", { songIds }),
    queueClear: () => post("/api/queue/clear", {}),
    queueAddIds: (songIds) => post("/api/queue/add-ids", { songIds }),
    favorites: () => get2("/api/favorites"),
    toggleFavorite: (body) => post("/api/favorites/toggle", body),
    history: () => get2("/api/history"),
    recordHistory: (body) => post("/api/history", body),
    removeHistory: (feedUrl, guid) => post("/api/history/remove", { feedUrl, guid }),
    batchDeleteHistory: (items, pruneMappings = true) => post("/api/history/batch-delete", { items, pruneMappings }),
    clearHistory: () => post("/api/history/clear", {}),
    saveProgress: (body) => post("/api/progress", body),
    getProgressOne: (feedUrl, guid) => get2(`/api/progress/one?feedUrl=${enc(feedUrl)}&guid=${enc(guid)}`),
    rememberSongMapping: (songId, feedUrl, guid) => post("/api/song-mapping", { songId, feedUrl, guid }),
    log: () => get2("/api/log"),
    opmlPreview: (text) => post("/api/opml/preview", { opml: text }),
    opmlImport: (text) => post("/api/opml/import", { opml: text }),
    opmlExport: () => get2("/api/opml/export"),
    castMiot: (songId, deviceId) => post("/api/cast/miot", deviceId ? { songId, deviceId } : { songId }),
    /** @param {{ deviceId?: string, songIds?: number[], startIndex?: number, songId?: number }} [opts] */
    castMiotPlaylist: (opts = {}) => post("/api/cast/miot-playlist", buildCastMiotPlaylistBody(opts)),
    castStatus: () => get2("/api/cast/status")
  };

  // ui/lib/store.js
  var listeners2 = /* @__PURE__ */ new Set();
  var data = {
    queueSongs: [],
    queueMeta: null,
    recent: [],
    subs: [],
    favorites: [],
    episodes: [],
    activeShowId: null,
    settings: null,
    history: [],
    queueOpen: false
  };
  function getData() {
    return data;
  }
  function patch(next) {
    Object.assign(data, next);
    listeners2.forEach((fn) => {
      try {
        fn(data);
      } catch (_) {
      }
    });
  }

  // ui/lib/queueMembership.js
  function normalizeFeedKey(url) {
    return String(url || "").trim().replace(/\/+$/, "").toLowerCase();
  }
  function episodeKey(feedUrl, guid) {
    const feed = normalizeFeedKey(feedUrl);
    const g = String(guid || "").trim();
    if (!feed || !g) return "";
    return `${feed}::${g}`;
  }
  function buildQueueIndex(queueSongs) {
    const ids = /* @__PURE__ */ new Set();
    const keys = /* @__PURE__ */ new Set();
    for (const song of Array.isArray(queueSongs) ? queueSongs : []) {
      if (!song || song.pending) continue;
      const id = Number(song.id);
      if (Number.isFinite(id)) ids.add(id);
      const key = episodeKey(song.feedUrl, song.guid);
      if (key) keys.add(key);
    }
    return { ids, keys };
  }
  function isInPodcastQueue(ep, index) {
    if (!ep || !index) return false;
    const rawId = ep.songId;
    const songId = rawId == null || rawId === "" ? null : Number(rawId);
    if (songId != null && Number.isFinite(songId) && index.ids.has(songId)) return true;
    const key = episodeKey(ep.feedUrl, ep.guid);
    return !!key && index.keys.has(key);
  }
  var QUEUE_ADD_LABEL = "\u52A0\u5165\u64AD\u653E\u5217\u8868";
  var QUEUE_IN_LABEL = "\u5DF2\u5728\u64AD\u653E\u5217\u8868";
  var QUEUE_ADD_ICON = "listPlus";
  var QUEUE_IN_ICON = "listChecks";
  function queueButtonState(ep, index) {
    const inQueue = isInPodcastQueue(ep, index);
    return {
      inQueue,
      label: inQueue ? QUEUE_IN_LABEL : QUEUE_ADD_LABEL,
      iconName: inQueue ? QUEUE_IN_ICON : QUEUE_ADD_ICON,
      ariaPressed: inQueue,
      ariaDisabled: inQueue
    };
  }
  function escapeAttr(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function queueButtonAttrs(ep, index) {
    return queueMarkers(ep, index);
  }
  function queueMenuAttrs(ep, index, idx) {
    const bits = [`data-idx="${idx}"`, queueMarkers(ep, index)];
    return bits.join(" ");
  }
  function queueMarkers(ep, index) {
    const state3 = queueButtonState(ep, index);
    const rawId = ep && ep.songId;
    const songId = rawId == null || rawId === "" ? NaN : Number(rawId);
    const key = episodeKey(ep && ep.feedUrl, ep && ep.guid);
    const bits = [
      `aria-pressed="${state3.ariaPressed ? "true" : "false"}"`,
      `aria-disabled="${state3.ariaDisabled ? "true" : "false"}"`,
      `title="${state3.label}"`
    ];
    if (Number.isFinite(songId)) bits.push(`data-queue-song="${songId}"`);
    if (key) bits.push(`data-queue-key="${escapeAttr(key)}"`);
    if (state3.inQueue) bits.push('data-in-queue="1"');
    return bits.join(" ");
  }
  function repaintQueueButtons(root, index) {
    if (!root || typeof root.querySelectorAll !== "function" || !index) return 0;
    let updated = 0;
    root.querySelectorAll("[data-queue-song], [data-queue-key]").forEach((btn) => {
      const songAttr = btn.getAttribute("data-queue-song");
      const keyAttr = btn.getAttribute("data-queue-key") || "";
      const songId = songAttr != null && songAttr !== "" ? Number(songAttr) : null;
      const inQueue = songId != null && Number.isFinite(songId) && index.ids.has(songId) || !!keyAttr && index.keys.has(keyAttr);
      const label = inQueue ? QUEUE_IN_LABEL : QUEUE_ADD_LABEL;
      const iconName = inQueue ? QUEUE_IN_ICON : QUEUE_ADD_ICON;
      btn.setAttribute("aria-pressed", inQueue ? "true" : "false");
      btn.setAttribute("aria-disabled", inQueue ? "true" : "false");
      if (inQueue) btn.setAttribute("data-in-queue", "1");
      else btn.removeAttribute("data-in-queue");
      btn.setAttribute("title", label);
      btn.classList.toggle("is-in-queue", inQueue);
      replaceIcon(btn, iconName);
      const span = btn.querySelector("span:not(.ico)");
      if (span) span.textContent = label;
      updated += 1;
    });
    return updated;
  }

  // ui/lib/queueOptimistic.js
  function createQueueWriteTracker() {
    let gen = 0;
    let pending = 0;
    return {
      /** Take ownership of the queue for a new mutation. */
      begin() {
        gen += 1;
        pending += 1;
        return gen;
      },
      /** Mark a mutation finished. Safe if already idle. */
      end() {
        if (pending > 0) pending -= 1;
      },
      /** True while at least one mutation has begun and not yet ended. */
      isPending() {
        return pending > 0;
      },
      /** True when `token` is still the newest mutation. */
      isCurrent(token) {
        return token === gen;
      },
      current() {
        return gen;
      }
    };
  }
  function snapshotQueue(data2) {
    const songs = data2 && Array.isArray(data2.queueSongs) ? data2.queueSongs : [];
    return { queueSongs: songs.slice(), queueMeta: data2 && data2.queueMeta || null };
  }
  function withoutSongs(songs, songIds) {
    const drop = new Set((songIds || []).map(Number).filter(Number.isFinite));
    return (Array.isArray(songs) ? songs : []).filter((s) => !drop.has(Number(s && s.id)));
  }
  function playedSongs(songs) {
    return (Array.isArray(songs) ? songs : []).filter((s) => s && s.progress && s.progress.completed);
  }
  function rollbackPlan(input) {
    const { before, token, tracker } = input || {};
    if (!tracker || !tracker.isCurrent(token)) return { patch: null, discarded: true };
    return {
      patch: { queueSongs: before && before.queueSongs || [], queueMeta: before && before.queueMeta || null },
      discarded: false
    };
  }
  function shouldApplyQueueResponse(token, tracker) {
    return !!tracker && tracker.isCurrent(token);
  }
  function reorderSongs(songs, orderedIds) {
    const list = Array.isArray(songs) ? songs : [];
    const byId = /* @__PURE__ */ new Map();
    for (const song of list) {
      const id = Number(song && song.id);
      if (Number.isFinite(id) && !byId.has(id)) byId.set(id, song);
    }
    const next = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of Array.isArray(orderedIds) ? orderedIds : []) {
      const id = Number(raw);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      const song = byId.get(id);
      if (!song) continue;
      next.push(song);
      seen.add(id);
    }
    for (const song of list) {
      const id = Number(song && song.id);
      if (!seen.has(id)) {
        next.push(song);
        if (Number.isFinite(id)) seen.add(id);
      }
    }
    return next;
  }
  function buildOptimisticPinnedSong(episode, songId) {
    const id = Number(songId);
    const cover = episode && (episode.coverUrl || episode.cover_url) || "";
    return {
      id,
      title: episode && episode.title || "",
      artist: episode && (episode.showTitle || episode.artist) || "",
      album: episode && (episode.showTitle || episode.album) || "",
      coverUrl: cover || null,
      cover_url: cover,
      feedUrl: episode && episode.feedUrl || null,
      guid: episode && episode.guid || null,
      subscriptionId: episode && episode.subscriptionId || null,
      duration: episode && (episode.durationSec != null ? episode.durationSec : episode.duration),
      favorited: !!(episode && episode.favorited),
      progress: episode && episode.progress || null
    };
  }
  function pinQueueSongsLocally(songs, orderedIds, episode) {
    const list = Array.isArray(songs) ? songs.slice() : [];
    const ids = (Array.isArray(orderedIds) ? orderedIds : []).map(Number).filter(Number.isFinite);
    const targetId = ids.length ? ids[0] : NaN;
    let nextList = list;
    if (Number.isFinite(targetId) && !list.some((s) => Number(s && s.id) === targetId)) {
      nextList = [buildOptimisticPinnedSong(episode, targetId), ...list];
    }
    return reorderSongs(nextList, ids.length ? ids : nextList.map((s) => s && s.id));
  }
  function episodeIdentity(ep) {
    const feed = String(ep && ep.feedUrl || "").trim().replace(/\/+$/, "").toLowerCase();
    const guid = String(ep && ep.guid || "").trim();
    if (feed && guid) return `${feed}::${guid}`;
    return String(ep && ep.dedupKey || "").trim();
  }
  function pendingSongId(ep) {
    const key = episodeIdentity(ep) || String(ep && ep.title || "episode");
    return `pending:${key}`;
  }
  function isPendingQueueSong(song) {
    return !!(song && song.pending);
  }
  function sameEpisode(song, ep) {
    if (!song || !ep) return false;
    if (song.id && song.id === pendingSongId(ep)) return true;
    const a = episodeIdentity(song);
    const b = episodeIdentity(ep);
    return !!a && a === b;
  }
  function hasPendingSong(songs, ep) {
    return (Array.isArray(songs) ? songs : []).some(
      (song) => isPendingQueueSong(song) && sameEpisode(song, ep)
    );
  }
  function appendPendingSong(songs, ep) {
    const list = Array.isArray(songs) ? songs.slice() : [];
    if (!ep) return list;
    if (list.some((song) => sameEpisode(song, ep))) return list;
    list.push({
      id: pendingSongId(ep),
      pending: true,
      title: ep.title || "",
      artist: ep.showTitle || "",
      album: ep.showTitle || "",
      coverUrl: ep.coverUrl || null,
      feedUrl: ep.feedUrl || "",
      guid: ep.guid || "",
      duration: ep.durationSec ?? null,
      favorited: !!ep.favorited
    });
    return list;
  }

  // ui/lib/playThrough.js
  var PLAY_THROUGH_LABEL = "\u4ECE\u8FD9\u4E00\u96C6\u5F00\u59CB\uFF0C\u987A\u5E8F\u64AD\u5B8C\u300C\u64AD\u5BA2\u300D\u5217\u8868";
  var PLAY_ONE_LABEL = "\u64AD\u653E\u8FD9\u4E00\u96C6";
  var SET_QUEUE_UNAVAILABLE = "\u5BBF\u4E3B\u4E0D\u652F\u6301\u6574\u8868\u64AD\u653E\u3002\u8BF7\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\u672C\u63D2\u4EF6\uFF0C\u6216\u5347\u7EA7\u5BBF\u4E3B\u540E\u518D\u8BD5\u3002";
  var PLAY_FROM_START_TITLE = "\u4ECE\u5217\u8868\u5F00\u5934\u64AD\u653E";
  var PLAY_FROM_START_MESSAGE = "\u4F1A\u7528\u300C\u64AD\u5BA2\u300D\u5217\u8868\u66FF\u6362\u5F53\u524D\u6B63\u5728\u64AD\u653E\u7684\u5185\u5BB9\uFF0C\u5E76\u4ECE\u7B2C\u4E00\u9996\u5F00\u59CB\u3002\u6309\u987A\u5E8F\u64AD\u5230\u672B\u5C3E\u540E\u505C\u6B62\uFF0C\u4E0D\u5FAA\u73AF\u3002";
  var PLAY_FROM_START_OK = "\u5F00\u59CB\u64AD\u653E";
  var SINGLE_MODE_TITLE = "\u6539\u4E3A\u987A\u5E8F\u64AD\u653E\uFF1F";
  var SINGLE_MODE_MESSAGE = "\u5F53\u524D\u4E0D\u662F\u987A\u5E8F\u64AD\u653E\u3002\u6539\u4E3A\u987A\u5E8F\u64AD\u653E\u540E\uFF0C\u4F1A\u6309\u300C\u64AD\u5BA2\u300D\u5217\u8868\u64AD\u5230\u672B\u5C3E\u518D\u505C\u6B62\uFF0C\u4E0D\u5FAA\u73AF\u3002";
  var SINGLE_MODE_OK = "\u6539\u4E3A\u987A\u5E8F\u64AD\u653E";
  function episodeSongId(ep) {
    if (!ep) return null;
    const raw = ep.songId != null && ep.songId !== "" ? ep.songId : ep.id;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function playButtonLabel({ isCurrent, phase, pending, fromWaitlist } = {}) {
    if (pending) return "\u6B63\u5728\u52A0\u5165\u2026";
    if (isCurrent && phase === "playing") return "\u6682\u505C";
    if (isCurrent) return "\u7EE7\u7EED";
    return fromWaitlist ? PLAY_THROUGH_LABEL : PLAY_ONE_LABEL;
  }
  function readyQueueSongIds(songs) {
    const ids = [];
    for (const song of Array.isArray(songs) ? songs : []) {
      if (!song || song.pending) continue;
      const id = episodeSongId(song);
      if (id != null) ids.push(id);
    }
    return ids;
  }
  function queueIdsForStart(songs, targetId) {
    const ids = readyQueueSongIds(songs);
    const tid = targetId == null || targetId === "" ? null : Number(targetId);
    if (tid == null || !Number.isFinite(tid)) {
      return { ids, startIndex: 0 };
    }
    const rest = ids.filter((id) => id !== tid);
    return { ids: [tid, ...rest], startIndex: 0 };
  }
  function isSinglePlayMode(mode) {
    return mode === "single" || mode === "singlePlay";
  }
  function readPlayMode(state3) {
    if (!state3) return null;
    const mode = state3.play_mode != null ? state3.play_mode : state3.playMode;
    return mode == null || mode === "" ? null : String(mode);
  }

  // ui/lib/playSession.js
  function pickNumber(...values) {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }
  function pickBoolean(...values) {
    for (const value of values) {
      if (typeof value === "boolean") return value;
    }
    return null;
  }
  function extractQueueIds(state3) {
    if (!state3) return [];
    const raw = state3.queue || state3.songs || state3.song_ids || state3.songIds || state3.playlist && (state3.playlist.songs || state3.playlist.song_ids);
    if (!Array.isArray(raw)) return [];
    const ids = [];
    for (const item of raw) {
      if (typeof item === "number" && Number.isFinite(item)) {
        ids.push(item);
        continue;
      }
      if (item && (item.id != null || item.songId != null)) {
        const n = Number(item.id != null ? item.id : item.songId);
        if (Number.isFinite(n)) ids.push(n);
      }
    }
    return ids;
  }
  function readHostPlayback(state3) {
    if (!state3 || typeof state3 !== "object") {
      return {
        available: false,
        currentId: null,
        currentTime: null,
        isPlaying: null,
        queue: [],
        currentIndex: null,
        sourcePlaylistId: null
      };
    }
    const song = state3.current_song != null ? state3.current_song : state3.currentSong;
    const currentId = song && song.id != null ? pickNumber(song.id) : null;
    return {
      available: true,
      currentId,
      currentTime: pickNumber(state3.current_time, state3.currentTime),
      isPlaying: pickBoolean(state3.is_playing, state3.isPlaying),
      queue: extractQueueIds(state3),
      currentIndex: pickNumber(state3.current_index, state3.currentIndex),
      sourcePlaylistId: pickNumber(state3.source_playlist_id, state3.sourcePlaylistId)
    };
  }
  var REPLACE_PLAYBACK_TITLE = "\u66FF\u6362\u5F53\u524D\u64AD\u653E\uFF1F";
  var REPLACE_PLAYBACK_MESSAGE = "\u5F53\u524D\u6B63\u5728\u64AD\u653E\u5176\u4ED6\u5185\u5BB9\uFF0C\u6216\u65E0\u6CD5\u786E\u8BA4\u73B0\u5728\u64AD\u7684\u662F\u54EA\u4E00\u96C6\u3002\u786E\u5B9A\u540E\u4F1A\u5148\u628A\u8FD9\u4E00\u96C6\u79FB\u5230\u300C\u64AD\u5BA2\u300D\u5217\u8868\u7B2C\u4E00\u4F4D\uFF0C\u518D\u66FF\u6362\u5F53\u524D\u64AD\u653E\uFF1B\u53D6\u6D88\u5219\u4FDD\u6301\u73B0\u5728\u7684\u64AD\u653E\u548C\u5217\u8868\u987A\u5E8F\u4E0D\u53D8\u3002";
  var REPLACE_PLAYBACK_OK = "\u8C03\u6574\u5217\u8868\u5E76\u64AD\u653E";
  function normalizeIds(ids) {
    return (Array.isArray(ids) ? ids : []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }
  function frontOrderedIds(intendedIds, targetSongId) {
    const tid = Number(targetSongId);
    const ids = normalizeIds(intendedIds).filter((id) => id !== tid);
    if (Number.isFinite(tid) && tid > 0) ids.unshift(tid);
    return ids;
  }
  function isFrontEpisode(host, targetSongId) {
    if (!host || !host.available || host.currentId == null) return false;
    if (Number(host.currentId) !== Number(targetSongId)) return false;
    if (host.currentIndex != null) {
      if (host.currentIndex !== 0) return false;
      if (host.queue.length) return Number(host.queue[0]) === Number(targetSongId);
      return true;
    }
    if (host.queue.length) return Number(host.queue[0]) === Number(targetSongId);
    return true;
  }
  function isIdle(host) {
    if (!host || !host.available) return false;
    return host.currentId == null && (!host.queue || host.queue.length === 0) && host.isPlaying !== true;
  }
  function sameSourcePlaylist(host, podcastPlaylistId) {
    if (!host || !host.available) return false;
    const want = Number(podcastPlaylistId);
    if (!Number.isFinite(want) || want <= 0) return false;
    return host.sourcePlaylistId != null && Number(host.sourcePlaylistId) === want;
  }
  function decidePlayAction({ host, targetSongId, intendedIds, podcastPlaylistId } = {}) {
    const ids = frontOrderedIds(intendedIds, targetSongId);
    const base = { ids, startIndex: 0, playMode: "order" };
    if (!host || !host.available) {
      return { type: "confirm-replace", ...base, reason: "unknown" };
    }
    if (isIdle(host)) {
      return { type: "set-queue", ...base };
    }
    if (isFrontEpisode(host, targetSongId)) {
      if (host.isPlaying === true) return { type: "noop-playing", ...base };
      if (host.isPlaying === false) return { type: "resume", ...base };
      return { type: "confirm-replace", ...base, reason: "unknown-playing-state" };
    }
    if (host.currentId != null && Number(host.currentId) === Number(targetSongId)) {
      if (sameSourcePlaylist(host, podcastPlaylistId)) return { type: "set-queue", ...base };
      return { type: "confirm-replace", ...base, reason: "not-in-front" };
    }
    if (host.currentId != null && sameSourcePlaylist(host, podcastPlaylistId)) {
      return { type: "set-queue", ...base };
    }
    return {
      type: "confirm-replace",
      ...base,
      reason: host.currentId != null ? "different-source" : "unknown"
    };
  }

  // ui/lib/actions.js
  var recentToasts = /* @__PURE__ */ new Map();
  var TOAST_DEDUPE_MS = 1200;
  var caps = { available: false, hasPlayer: false };
  var lastProgressFlush = 0;
  function setCapabilities(next) {
    caps = next;
  }
  function shortTitle(title, max = 18) {
    const t = String(title || "").trim();
    if (!t) return "\u8BE5\u5355\u96C6";
    return t.length > max ? t.slice(0, max) + "\u2026" : t;
  }
  function notify(text, kind) {
    const msg = String(text == null ? "" : text).trim();
    if (!msg) return;
    const now = Date.now();
    const lastAt = recentToasts.get(msg) || 0;
    if (now - lastAt < TOAST_DEDUPE_MS) return;
    recentToasts.set(msg, now);
    if (recentToasts.size > 40) {
      for (const [key, at] of recentToasts) {
        if (now - at > TOAST_DEDUPE_MS * 4) recentToasts.delete(key);
      }
    }
    toast(msg, kind);
  }
  async function flushProgress(opts = {}) {
    const snap = get();
    const cur = snap.current;
    if (!cur || !cur.feedUrl || !cur.guid) return;
    lastProgressFlush = Date.now();
    try {
      await api.saveProgress({
        feedUrl: cur.feedUrl,
        guid: cur.guid,
        positionSec: snap.positionSec,
        durationSec: snap.durationSec,
        completed: snap.phase === "ended",
        lastSongId: cur.songId || void 0,
        lastPlayedAt: cur.songId ? Date.now() : void 0,
        seek: opts.seek === true
      });
    } catch (_) {
    }
  }
  function rememberMapping(songId, feedUrl, guid) {
    if (!songId || !feedUrl || !guid) return;
    api.rememberSongMapping(songId, feedUrl, guid).catch(() => {
    });
  }
  function startProgressTracking() {
    if (!caps.available || !caps.hasPlayer) return () => {
    };
    let off = null;
    try {
      off = onStateChange((st) => {
        applyHostState(st);
        const snap = get();
        const cur = snap.current;
        if (!cur || !cur.feedUrl || !cur.guid) return;
        const now = Date.now();
        if (now - lastProgressFlush < 4e3) return;
        lastProgressFlush = now;
        api.saveProgress({
          feedUrl: cur.feedUrl,
          guid: cur.guid,
          positionSec: typeof st.current_time === "number" ? st.current_time : snap.positionSec,
          durationSec: typeof st.duration === "number" && st.duration > 0 ? st.duration : snap.durationSec,
          completed: snap.phase === "ended",
          lastSongId: cur.songId || void 0,
          lastPlayedAt: cur.songId ? Date.now() : void 0
        }).catch(() => {
        });
      });
    } catch (e) {
      notify("\u65E0\u6CD5\u8BA2\u9605\u64AD\u653E\u72B6\u6001\uFF1A" + e, "warn");
    }
    return () => {
      try {
        if (off) off();
      } catch (_) {
      }
    };
  }
  async function reloadQueue() {
    if (queueWrites.isPending()) return getData();
    const token = queueWrites.current();
    try {
      const r = await api.queue();
      if (queueWrites.isPending() || !shouldApplyQueueResponse(token, queueWrites)) {
        return getData();
      }
      if (!r.ok) {
        patch({ queueSongs: [], queueMeta: null });
        repaintQueueButtonsNow();
        notifyQueueViews();
        return getData();
      }
      patch({
        queueSongs: r.songs || [],
        queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName }
      });
      repaintQueueButtonsNow();
      notifyQueueViews();
    } catch (e) {
      if (queueWrites.isPending() || !shouldApplyQueueResponse(token, queueWrites)) {
        return getData();
      }
      patch({ queueSongs: [], queueMeta: null });
      repaintQueueButtonsNow();
      notifyQueueViews();
      notify("\u8BFB\u53D6\u64AD\u653E\u5217\u8868\u5931\u8D25\uFF08\u9700\u5BBF\u4E3B playlists \u6743\u9650\uFF09", "warn");
    }
    return getData();
  }
  var queueRepainters = /* @__PURE__ */ new Set();
  var queueViewListeners = /* @__PURE__ */ new Set();
  function onQueueChange(fn) {
    if (typeof fn !== "function") return () => {
    };
    queueRepainters.add(fn);
    return () => queueRepainters.delete(fn);
  }
  function onQueueViewChange(fn) {
    if (typeof fn !== "function") return () => {
    };
    queueViewListeners.add(fn);
    return () => queueViewListeners.delete(fn);
  }
  function notifyQueueViews() {
    for (const fn of queueViewListeners) {
      try {
        fn();
      } catch (_) {
      }
    }
  }
  var queueRevealers = /* @__PURE__ */ new Set();
  function onEnsureQueueVisible(fn) {
    if (typeof fn !== "function") return () => {
    };
    queueRevealers.add(fn);
    return () => queueRevealers.delete(fn);
  }
  var queuePinRunner = null;
  function setQueuePinRunner(fn) {
    queuePinRunner = typeof fn === "function" ? fn : null;
  }
  async function runQueuePinPhase(phase, songId) {
    if (typeof queuePinRunner !== "function") return;
    try {
      await queuePinRunner(phase, songId);
    } catch (_) {
    }
  }
  function playFrontTargetIsFirst(result, songId) {
    if (!result || result.ok === false) return false;
    const ids = Array.isArray(result.songIds) ? result.songIds.map(Number) : [];
    return ids.length > 0 && ids[0] === Number(songId);
  }
  var PLAY_FRONT_FAIL = "\u672A\u80FD\u628A\u8FD9\u4E00\u96C6\u5199\u5230\u300C\u64AD\u5BA2\u300D\u5217\u8868\u7B2C\u4E00\u4F4D\u3002\u5F53\u524D\u64AD\u653E\u987A\u5E8F\u672A\u6539\uFF0C\u7A0D\u540E\u53EF\u5237\u65B0\u5217\u8868\u6838\u5BF9\u3002";
  async function persistPlayFrontAfterStart({ songId, episode, gen, playlistIdRef }) {
    try {
      const moved = await api.queuePlayFront(songId);
      if (!playFrontTargetIsFirst(moved, songId)) {
        notify(
          moved && moved.error ? `${PLAY_FRONT_FAIL}\uFF08${String(moved.error)}\uFF09` : PLAY_FRONT_FAIL,
          "err"
        );
        return;
      }
      if (Number.isFinite(Number(moved.playlistId))) {
        const playlistId = Number(moved.playlistId);
        if (playlistIdRef) playlistIdRef.value = playlistId;
        if (moved.playlistName) {
          const data2 = getData();
          patch({
            queueMeta: {
              playlistId,
              playlistName: moved.playlistName
            },
            queueSongs: data2.queueSongs
          });
        }
      }
      applyQueueOrderLocally(
        moved.songIds.map(Number).filter(Number.isFinite),
        episode
      );
      await reloadQueueIfCurrent(gen);
    } catch (e) {
      notify(`${PLAY_FRONT_FAIL}\uFF08${String(e && e.message || e)}\uFF09`, "err");
    } finally {
      queueWrites.end();
    }
  }
  async function reloadRecent() {
    const home = await api.home();
    if (!home || !home.ok) return getData();
    patch({ recent: home.recent || [] });
    return getData();
  }
  async function reloadSubs() {
    const r = await api.listSubscriptions();
    if (r && r.ok) patch({ subs: r.subscriptions || [] });
    return getData();
  }
  async function reloadFavorites() {
    try {
      const r = await api.favorites();
      if (!r || !r.ok) return getData();
      patch({
        favorites: (r.favorites || []).map((f) => ({
          ...f,
          showTitle: f.showTitle || "",
          hasShowNote: !!f.hasShowNote,
          showNote: f.showNote || null,
          favorited: true
        }))
      });
    } catch (_) {
    }
    return getData();
  }
  async function reloadHistory() {
    try {
      const r = await api.history();
      if (!r || !r.ok) return getData();
      patch({
        history: (r.history || []).map((h) => ({
          ...h,
          // History rows carry the same shape the row renderer expects.
          songId: h.songId,
          durationSec: h.durationSec,
          progress: {
            positionSec: h.positionSec || 0,
            durationSec: h.durationSec || null,
            completed: !!h.completed
          }
        }))
      });
    } catch (_) {
    }
    return getData();
  }
  var onHistoryChange = null;
  function setHistoryChangeHandler(fn) {
    onHistoryChange = fn;
  }
  async function clearPlayHistory() {
    const ok = await uiConfirm({
      title: "\u6E05\u7A7A\u6536\u542C\u5386\u53F2",
      message: "\u5C06\u5220\u9664\u5168\u90E8\u5386\u53F2\u8BB0\u5F55\u3002\u64AD\u653E\u8FDB\u5EA6\u4E0E\u6536\u85CF\u4E0D\u4F1A\u53D7\u5F71\u54CD\u3002",
      okText: "\u6E05\u7A7A",
      danger: true
    });
    if (!ok) return false;
    try {
      await api.clearHistory();
      patch({ history: [] });
      notify("\u5DF2\u6E05\u7A7A\u6536\u542C\u5386\u53F2", "ok");
      return true;
    } catch (e) {
      notify(String(e), "err");
      return false;
    }
  }
  async function removeHistoryItem(entry) {
    try {
      await api.removeHistory(entry.feedUrl, entry.guid);
      patch({
        history: (getData().history || []).filter(
          (h) => !(h.feedUrl === entry.feedUrl && h.guid === entry.guid)
        )
      });
      return true;
    } catch (e) {
      notify(String(e), "err");
      return false;
    }
  }
  async function batchDeleteHistoryItems(entries) {
    const items = (entries || []).map((e) => ({ feedUrl: e.feedUrl, guid: e.guid })).filter((e) => e.feedUrl && e.guid);
    if (!items.length) return false;
    const ok = await uiConfirm({
      title: "\u5220\u9664\u6240\u9009\u5386\u53F2",
      message: `\u5C06\u4ECE\u6536\u542C\u5386\u53F2\u5220\u9664 ${items.length} \u6761\u8BB0\u5F55\u3002\u64AD\u653E\u8FDB\u5EA6\u4E0D\u53D7\u5F71\u54CD\u3002`,
      okText: "\u5220\u9664",
      danger: true
    });
    if (!ok) return false;
    try {
      await api.batchDeleteHistory(items, true);
      const drop = new Set(items.map((i) => `${i.feedUrl}::${i.guid}`));
      patch({
        history: (getData().history || []).filter((h) => !drop.has(`${h.feedUrl}::${h.guid}`))
      });
      notify(`\u5DF2\u5220\u9664 ${items.length} \u6761\u5386\u53F2`, "ok");
      return true;
    } catch (e) {
      notify(String(e), "err");
      return false;
    }
  }
  function episodePayload(ep) {
    return {
      subscriptionId: ep.subscriptionId,
      feedUrl: ep.feedUrl,
      guid: ep.guid,
      dedupKey: ep.dedupKey,
      enclosureUrl: ep.enclosureUrl,
      title: ep.title,
      showTitle: ep.showTitle || "",
      durationSec: ep.durationSec,
      guidSource: ep.guidSource,
      songId: ep.songId,
      coverUrl: ep.coverUrl || null
    };
  }
  async function syncPlayStateAfterRequest(songId) {
    for (let i = 0; i < 10; i++) {
      try {
        const st = await getState();
        applyHostState(st);
        const snap = get();
        if (["playing", "paused", "ended"].includes(snap.phase)) return true;
        if (st && st.current_song && st.current_song.id === songId) {
          setPhase(st.is_playing ? "playing" : "paused", {
            error: null,
            positionSec: typeof st.current_time === "number" ? st.current_time : 0,
            durationSec: typeof st.duration === "number" && st.duration > 0 ? st.duration : null,
            hostHint: st.is_playing ? null : "\u5DF2\u9009\u4E2D\u5F53\u524D\u96C6\uFF0C\u7B49\u5F85\u51FA\u58F0\u2026"
          });
          return true;
        }
      } catch (_) {
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }
  async function confirmReplacePlayback() {
    return uiConfirm({
      title: REPLACE_PLAYBACK_TITLE,
      message: REPLACE_PLAYBACK_MESSAGE,
      okText: REPLACE_PLAYBACK_OK
    });
  }
  async function ensureSequentialPlayMode() {
    let st;
    try {
      st = await getState();
    } catch {
      return true;
    }
    if (!isSinglePlayMode(readPlayMode(st))) return true;
    const ok = await uiConfirm({
      title: SINGLE_MODE_TITLE,
      message: SINGLE_MODE_MESSAGE,
      okText: SINGLE_MODE_OK
    });
    if (!ok) return false;
    try {
      await setPlayMode("order");
    } catch (e) {
      notify(String(e && e.message || e), "err");
    }
    return true;
  }
  async function playEpisode(ep, opts = {}) {
    if (!caps.available || !caps.hasPlayer) {
      notify("\u5BBF\u4E3B\u64AD\u653E\u5668\u4E0D\u53EF\u7528", "warn");
      return;
    }
    if (!hasSetQueue()) {
      notify(SET_QUEUE_UNAVAILABLE, "err");
      return;
    }
    if (typeof api.queuePlayFront !== "function") {
      notify("\u5F53\u524D\u63D2\u4EF6\u7248\u672C\u65E0\u6CD5\u8C03\u6574\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5", "err");
      return;
    }
    let songId = episodeSongId(ep);
    const ctx = {
      subscriptionId: ep.subscriptionId || "",
      feedUrl: ep.feedUrl || "",
      guid: ep.guid || "",
      title: ep.title || "",
      showTitle: ep.showTitle || "",
      songId: songId || null,
      durationSec: ep.durationSec || null,
      guidSource: ep.guidSource || "rss",
      coverUrl: ep.coverUrl || null
    };
    try {
      if (!songId || opts.forcePrepare) {
        if (!ep.subscriptionId) {
          notify("\u7F3A\u5C11\u8BA2\u9605\u4FE1\u606F\uFF0C\u65E0\u6CD5\u51C6\u5907\u97F3\u9891", "err");
          return;
        }
        beginPrepare(ctx);
        const prep = await api.prepare({
          subscriptionId: ep.subscriptionId,
          guid: ep.guid,
          dedupKey: ep.dedupKey
        });
        if (!prep.ok) {
          prepareFailed(prep.error || "\u51C6\u5907\u97F3\u9891\u5931\u8D25");
          notify(prep.error || "\u51C6\u5907\u97F3\u9891\u5931\u8D25", "err");
          return;
        }
        songId = prep.songId;
        ctx.songId = songId;
      }
      const queueSongs = getData().queueSongs || [];
      const queueMeta = getData().queueMeta || null;
      const intendedIds = queueIdsForStart(queueSongs, songId).ids;
      if (!intendedIds.length) {
        notify("\u6CA1\u6709\u53EF\u64AD\u653E\u7684\u5185\u5BB9", "warn");
        return;
      }
      let hostState = null;
      try {
        hostState = await getState();
      } catch (_) {
        hostState = null;
      }
      const decision = decidePlayAction({
        host: readHostPlayback(hostState),
        targetSongId: songId,
        intendedIds,
        podcastPlaylistId: queueMeta ? queueMeta.playlistId : null
      });
      if (decision.type === "noop-playing") {
        notify("\u6B63\u5728\u64AD\u653E\u8FD9\u4E00\u96C6\uFF0C\u4E14\u5DF2\u5728\u300C\u64AD\u5BA2\u300D\u5217\u8868\u7B2C\u4E00\u4F4D\uFF0C\u65E0\u9700\u91CD\u65B0\u5F00\u59CB", "ok");
        return;
      }
      if (decision.type === "resume") {
        await play();
        try {
          applyHostState(await getState());
        } catch (_) {
        }
        notify("\u7EE7\u7EED\u64AD\u653E\u5F53\u524D\u5355\u96C6", "ok");
        return;
      }
      if (decision.type === "confirm-replace") {
        const ok2 = await confirmReplacePlayback();
        if (!ok2) return;
      }
      const modeOk = await ensureSequentialPlayMode();
      if (modeOk === false) return;
      let orderIds = decision.ids;
      let playlistId = queueMeta ? queueMeta.playlistId : null;
      const persistGen = beginQueueWrite();
      await runQueuePinPhase("before", songId);
      applyQueueOrderLocally(orderIds, { ...ctx, songId, title: ctx.title, showTitle: ctx.showTitle });
      await runQueuePinPhase("after", songId);
      beginPlayRequest({ ...ctx, songId });
      try {
        await replaceQueueAndPlay(orderIds, 0, {
          sourcePlaylistId: playlistId == null ? void 0 : playlistId
        });
      } catch (e) {
        playFailed(String(e && e.message || e));
        notify(
          `\u64AD\u653E\u8BF7\u6C42\u5931\u8D25\uFF1A${String(e && e.message || e)}\u3002\u5217\u8868\u5DF2\u5728\u672C\u9875\u63D0\u524D\u653E\u5230\u7B2C\u4E00\u4F4D\uFF0C\u6B63\u5728\u540C\u6B65\u5230\u300C\u64AD\u5BA2\u300D\u5217\u8868\u3002`,
          "err"
        );
        void persistPlayFrontAfterStart({
          songId,
          episode: { ...ctx, songId },
          gen: persistGen,
          playlistIdRef: { value: playlistId }
        });
        return;
      }
      try {
        await setPlayMode("order");
      } catch (_) {
      }
      notify(`\u6B63\u5728\u6309\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\u64AD\u653E\u300C${ctx.title || "\u5F53\u524D\u5355\u96C6"}\u300D`, "ok");
      void persistPlayFrontAfterStart({
        songId,
        episode: { ...ctx, songId },
        gen: persistGen,
        playlistIdRef: { value: playlistId }
      });
      const ok = await syncPlayStateAfterRequest(songId);
      if (!ok) {
        playFailed("\u64AD\u653E\u672A\u786E\u8BA4\u6210\u529F\uFF08\u5BBF\u4E3B\u672A\u56DE\u62A5\u8BE5\u66F2\u72B6\u6001\uFF09");
        notify("\u64AD\u653E\u672A\u786E\u8BA4\u6210\u529F\u3002\u8BF7\u786E\u8BA4\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\u3002", "err");
        return;
      }
      if (ctx.feedUrl && ctx.guid) {
        rememberMapping(songId, ctx.feedUrl, ctx.guid);
        api.saveProgress({
          feedUrl: ctx.feedUrl,
          guid: ctx.guid,
          lastSongId: songId,
          lastPlayedAt: Date.now()
        }).catch(() => {
        });
        api.recordHistory({
          feedUrl: ctx.feedUrl,
          guid: ctx.guid,
          title: ctx.title,
          showTitle: ctx.showTitle,
          coverUrl: ctx.coverUrl,
          durationSec: ctx.durationSec || null,
          songId,
          subscriptionId: ctx.subscriptionId,
          dedupKey: ep.dedupKey || ""
        }).then(() => {
          if (document.querySelector("#tab-history:not(.hidden)")) {
            reloadHistory().then(() => {
              if (typeof onHistoryChange === "function") onHistoryChange();
            });
          }
        }).catch(() => {
        });
      }
    } catch (e) {
      playFailed(String(e && e.message || e));
      notify(String(e && e.message || e), "err");
    }
  }
  async function addToQueue(ep, btn, opts = {}) {
    const quiet = !!opts.quiet;
    const data2 = getData();
    const index = buildQueueIndex(data2.queueSongs);
    if (isInPodcastQueue(ep, index)) {
      if (!quiet) notify(`\u300A${shortTitle(ep.title)}\u300B\u5DF2\u7ECF\u5728\u300C\u64AD\u5BA2\u300D\u5217\u8868\u91CC`, "warn");
      return { ok: true, already: true };
    }
    if (hasPendingSong(data2.queueSongs, ep)) {
      if (!quiet) {
        notify(`\u6B63\u5728\u52A0\u5165\u300A${shortTitle(ep.title)}\u300B\u2026`, "muted");
      }
      return { ok: false, pending: true };
    }
    if (btn) {
      btn.setAttribute("aria-busy", "true");
      btn.disabled = true;
    }
    const gen = beginQueueWrite();
    const before = snapshotQueue(data2);
    patch({
      queueSongs: appendPendingSong(before.queueSongs, ep),
      queueMeta: before.queueMeta
    });
    notifyQueueViews();
    try {
      const r = await api.queueAdd({
        subscriptionId: ep.subscriptionId,
        guid: ep.guid,
        dedupKey: ep.dedupKey
      });
      if (!r.ok) {
        rollbackQueue(before, gen);
        notify(r.error || "\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868\u5931\u8D25\uFF08\u51C6\u5907\u97F3\u9891\uFF09", "err");
        return { ok: false };
      }
      const name = r.playlistName || "\u64AD\u5BA2";
      if (!quiet) {
        const bits = [];
        if (r.added > 0) bits.push(`\u5DF2\u5C06\u300A${shortTitle(ep.title)}\u300B\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868\u672B\u5C3E`);
        else if (r.skipped > 0) bits.push(`\u300A${shortTitle(ep.title)}\u300B\u5DF2\u7ECF\u5728\u300C\u64AD\u5BA2\u300D\u5217\u8868\u91CC`);
        else bits.push("\u672A\u80FD\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868");
        notify(bits.join(""), r.added > 0 ? "ok" : "warn");
      }
      await reloadQueueIfCurrent(gen);
      return { ok: true, already: (r.skipped || 0) > 0, added: (r.added || 0) > 0 };
    } catch (e) {
      rollbackQueue(before, gen);
      notify(String(e), "err");
      return { ok: false };
    } finally {
      queueWrites.end();
      if (btn) {
        btn.removeAttribute("aria-busy");
        btn.disabled = false;
      }
    }
  }
  async function toggleFavorite(ep, btn) {
    if (!ep.feedUrl || !ep.guid) {
      notify("\u7F3A\u5C11\u5267\u96C6\u8EAB\u4EFD\uFF0C\u65E0\u6CD5\u6536\u85CF", "warn");
      return;
    }
    try {
      const r = await api.toggleFavorite({
        feedUrl: ep.feedUrl,
        guid: ep.guid,
        title: ep.title,
        showTitle: ep.showTitle || "",
        coverUrl: ep.coverUrl || null,
        dedupKey: ep.dedupKey || "",
        subscriptionId: ep.subscriptionId || "",
        durationSec: ep.durationSec ?? null
      });
      if (!r.ok) {
        notify(r.error || "\u6536\u85CF\u5931\u8D25", "err");
        return;
      }
      ep.favorited = !!r.favorited;
      if (btn) btn.setAttribute("aria-pressed", ep.favorited ? "true" : "false");
      notify(ep.favorited ? "\u5DF2\u6536\u85CF" : "\u5DF2\u53D6\u6D88\u6536\u85CF", "ok");
      await reloadFavorites();
    } catch (e) {
      notify(String(e), "err");
    }
  }
  function pluginPageUrl(entryPath) {
    try {
      const { origin } = window.location;
      return `${origin}/api/v1/jsplugin/${encodeURIComponent(entryPath)}/`;
    } catch (_) {
      return null;
    }
  }
  function castUnavailableDialog(reason, errorText) {
    const offline = reason === "miot_device_offline";
    const noDevice = reason === "miot_no_device";
    const miotUrl = pluginPageUrl("miot");
    let body;
    if (offline) {
      body = `<p>${escapeHtml(errorText || "\u97F3\u7BB1\u5F53\u524D\u79BB\u7EBF\u3002")}</p><p>\u97F3\u7BB1\u79BB\u7EBF\u65F6\u65E0\u6CD5\u63A5\u6536\u64AD\u653E\u6307\u4EE4\u3002\u8BF7\u786E\u8BA4\u5B83\u5DF2\u901A\u7535\u3001\u8FDE\u4E0A\u540C\u4E00\u7F51\u7EDC\uFF0C\u7136\u540E\u5728\u5C0F\u7231 App \u6216\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6\u9875\u770B\u5230\u300C\u5728\u7EBF\u300D\u540E\u518D\u8BD5\u3002</p>`;
    } else if (noDevice) {
      body = `<p>\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6\u91CC\u8FD8\u6CA1\u8BFB\u5230\u8BBE\u5907\u3002</p><p>\u8BF7\u6253\u5F00\u63D2\u4EF6\u9875\uFF0C\u767B\u5F55\u5C0F\u7C73\u8D26\u53F7\uFF1B\u8BBE\u5907\u51FA\u73B0\u5728\u5217\u8868\u540E\uFF0C\u70B9\u4E00\u4E0B\u9009\u4E2D\u5B83\u3002</p>` + (errorText ? `<p class="muted">${escapeHtml(errorText)}</p>` : "");
    } else {
      body = `<p>\u6295\u653E\u901A\u8FC7\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6\uFF08entryPath <code>miot</code>\uFF09\u8BA9\u5C0F\u7231\u97F3\u7BB1\u64AD\u653E\u300C\u64AD\u5BA2\u300D\u6B4C\u5355\u3002</p><p class="muted">\u8BF7\u5148\u5728 Songloft \u7684\u63D2\u4EF6\u5E02\u573A\u5B89\u88C5\uFF0C\u5E76\u786E\u8BA4\u8BE5\u63D2\u4EF6\u5DF2\u542F\u7528\u3002</p>` + (errorText ? `<p class="muted">${escapeHtml(errorText)}</p>` : "");
    }
    return openModal({
      title: offline ? "\u97F3\u7BB1\u79BB\u7EBF" : noDevice ? "\u6CA1\u6709\u53EF\u7528\u8BBE\u5907" : "\u9700\u8981\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6",
      body,
      size: "default",
      actions: [
        ...miotUrl ? [
          {
            label: "\u6253\u5F00\u63D2\u4EF6\u9875",
            kind: "primary",
            iconName: "speaker",
            close: false,
            onClick: () => {
              const opened = window.open(miotUrl, "_blank", "noopener");
              if (!opened) {
                notify(`\u8BF7\u624B\u52A8\u6253\u5F00\uFF1A${miotUrl}`, "warn");
              }
              return false;
            }
          }
        ] : [],
        {
          label: "\u53BB\u8BBE\u7F6E",
          kind: "tonal",
          close: false,
          onClick: () => {
            closeModal();
            const btn = document.querySelector('.nav button[data-tab="settings"]');
            if (btn) btn.click();
            return false;
          }
        },
        { label: "\u77E5\u9053\u4E86", kind: "ghost", close: true }
      ]
    });
  }
  async function castToSpeaker(songId, opts = {}) {
    let id = songId;
    try {
      if (id == null && opts.prepareIfMissing) {
        const ep = opts.prepareIfMissing;
        if (!ep.subscriptionId) {
          notify("\u8BE5\u96C6\u5C1A\u672A\u5165\u5E93\uFF0C\u65E0\u6CD5\u6295\u653E", "warn");
          return;
        }
        const prep = await api.prepare({
          subscriptionId: ep.subscriptionId,
          guid: ep.guid,
          dedupKey: ep.dedupKey
        });
        if (!prep.ok) {
          notify(prep.error || "\u51C6\u5907\u97F3\u9891\u5931\u8D25", "err");
          return;
        }
        id = prep.songId;
      }
      if (id == null) {
        notify("\u6CA1\u6709\u53EF\u6295\u653E\u7684\u5355\u96C6", "warn");
        return;
      }
      const plan = resolveSpeakerCastPlan({
        songId: id,
        forceSingle: opts.forceSingle,
        queueSongs: getData().queueSongs
      });
      if (!plan) {
        notify("\u6CA1\u6709\u53EF\u6295\u653E\u7684\u5355\u96C6", "warn");
        return;
      }
      await castQueueToSpeaker({
        deviceId: opts.deviceId,
        songIds: plan.songIds,
        songId: plan.songId
      });
    } catch (e) {
      notify(String(e && e.message || e), "err");
    }
  }
  async function castQueueToSpeaker(opts = {}) {
    const data2 = getData();
    const songIds = (Array.isArray(opts.songIds) && opts.songIds.length ? opts.songIds : (data2.queueSongs || []).map((s) => s && s.id)).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
    if (!songIds.length) {
      notify("\u300C\u64AD\u5BA2\u300D\u5217\u8868\u4E3A\u7A7A\uFF0C\u5148\u6DFB\u52A0\u51E0\u96C6\u518D\u6295\u653E", "warn");
      return;
    }
    const songId = Number.isFinite(Number(opts.songId)) && Number(opts.songId) > 0 ? Number(opts.songId) : songIds[0];
    try {
      notify("\u6B63\u5728\u628A\u8FD9\u4E00\u96C6\u79FB\u5230\u300C\u64AD\u5BA2\u300D\u7B2C\u4E00\u4F4D\u5E76\u6295\u653E\u2026", "muted");
      const r = await api.castMiotPlaylist({
        deviceId: opts.deviceId,
        songIds,
        songId
      });
      if (r && r.ok) {
        notify(
          `\u5DF2\u6295\u653E\u5230${r.deviceName ? `\u300C${r.deviceName}\u300D` : "\u5C0F\u7231\u97F3\u7BB1"}\uFF1A\u4ECE\u8FD9\u4E00\u96C6\u6309\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\u64AD\u653E`,
          "ok"
        );
        await reloadQueue();
        return;
      }
      if (r && (r.reason === "miot_unavailable" || r.reason === "miot_no_device" || r.reason === "miot_device_offline")) {
        clearToast();
        await castUnavailableDialog(r.reason, r.error);
        return;
      }
      const orderNote = r && r.orderChanged === false ? "\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\u672A\u6539\u53D8\u3002" : "\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\u4F1A\u5728\u64AD\u653E\u8BF7\u6C42\u4E4B\u524D\u8C03\u6574\uFF0C\u53EF\u80FD\u5DF2\u7ECF\u6539\u6210\u4ECE\u8FD9\u4E00\u96C6\u5F00\u59CB\u3002";
      notify(`${r && r.error || "\u6295\u653E\u5931\u8D25"} ${orderNote}`.trim(), "err");
      if (r && r.orderChanged !== false) reloadQueue().catch(() => {
      });
    } catch (e) {
      notify(
        `\u6295\u653E\u5931\u8D25\uFF1A${String(e && e.message || e)}\u3002\u300C\u64AD\u5BA2\u300D\u5217\u8868\u987A\u5E8F\u53EF\u80FD\u5728\u8BF7\u6C42\u524D\u5DF2\u8C03\u6574\u3002`,
        "err"
      );
      reloadQueue().catch(() => {
      });
    }
  }
  var queueWrites = createQueueWriteTracker();
  function beginQueueWrite() {
    return queueWrites.begin();
  }
  function isStaleQueueWrite(gen) {
    return !queueWrites.isCurrent(gen);
  }
  function repaintQueueButtonsNow() {
    const index = buildQueueIndex(getData().queueSongs);
    for (const fn of queueRepainters) {
      try {
        fn(index);
      } catch (_) {
      }
    }
  }
  async function reloadQueueIfCurrent(gen) {
    if (isStaleQueueWrite(gen)) return;
    try {
      const r = await api.queue();
      if (!r || !r.ok || !shouldApplyQueueResponse(gen, queueWrites)) return;
      patch({
        queueSongs: r.songs || [],
        queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName }
      });
      repaintQueueButtonsNow();
      notifyQueueViews();
    } catch (_) {
    }
  }
  function applyQueueOrderLocally(ids, episode) {
    const data2 = getData();
    const songs = data2.queueSongs || [];
    const next = pinQueueSongsLocally(songs, ids, episode);
    patch({ queueSongs: next, queueMeta: data2.queueMeta });
    repaintQueueButtonsNow();
    notifyQueueViews();
    return next;
  }
  function rollbackQueue(before, gen) {
    const plan = rollbackPlan({ before, token: gen, tracker: queueWrites });
    if (!plan.patch) return false;
    patch(plan.patch);
    repaintQueueButtonsNow();
    notifyQueueViews();
    return true;
  }
  async function removeSongs(songIds) {
    const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
    if (!ids.length) return { ok: false };
    const gen = beginQueueWrite();
    const before = snapshotQueue(getData());
    const survivors = withoutSongs(before.queueSongs, ids);
    const removedCount = before.queueSongs.length - survivors.length;
    patch({ queueSongs: survivors, queueMeta: before.queueMeta });
    repaintQueueButtonsNow();
    notifyQueueViews();
    notify(`\u5DF2\u4ECE\u64AD\u653E\u5217\u8868\u79FB\u9664 ${removedCount} \u9996`, "ok");
    try {
      const r = await api.queueRemove(ids);
      if (!r || !r.ok) {
        rollbackQueue(before, gen);
        notify(r && r.error || "\u79FB\u9664\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
        return r || { ok: false, error: "\u79FB\u9664\u5931\u8D25" };
      }
      await reloadQueueIfCurrent(gen);
      return r;
    } catch (e) {
      rollbackQueue(before, gen);
      notify("\u79FB\u9664\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
      return { ok: false, error: String(e) };
    } finally {
      queueWrites.end();
    }
  }
  async function clearQueue() {
    const data2 = getData();
    if (!data2.queueSongs.length) {
      notify("\u300C\u64AD\u5BA2\u300D\u5217\u8868\u5DF2\u7A7A", "muted");
      return;
    }
    const ok = await uiConfirm({
      title: "\u6E05\u7A7A\u300C\u64AD\u5BA2\u300D\u5217\u8868",
      message: `\u5C06\u6E05\u7A7A\u300C\u64AD\u5BA2\u300D\u5217\u8868\u4E2D\u7684 ${data2.queueSongs.length} \u9996\uFF0C\u4E0D\u4F1A\u5220\u9664\u8FDC\u7A0B\u97F3\u9891\u6587\u4EF6\uFF0C\u4E5F\u4E0D\u4F1A\u5220\u9664\u8FD9\u5F20\u6B4C\u5355\u3002`,
      okText: "\u6E05\u7A7A",
      danger: true
    });
    if (!ok) return;
    const gen = beginQueueWrite();
    const before = snapshotQueue(getData());
    try {
      const r = await api.queueClear();
      if (!r.ok) {
        notify(r.error || "\u6E05\u7A7A\u5931\u8D25", "err");
        return;
      }
      patch({ queueSongs: [], queueMeta: before.queueMeta });
      notify(`\u5DF2\u6E05\u7A7A ${r.removed} \u9996`, "ok");
      repaintQueueButtonsNow();
      notifyQueueViews();
      await reloadQueueIfCurrent(gen);
    } catch (e) {
      rollbackQueue(before, gen);
      notify(String(e), "err");
    } finally {
      queueWrites.end();
    }
  }
  async function removePlayed() {
    const before = snapshotQueue(getData());
    const played = playedSongs(before.queueSongs);
    if (!played.length) {
      notify("\u6CA1\u6709\u5DF2\u542C\u5B8C\u7684\u8282\u76EE", "muted");
      return;
    }
    const gen = beginQueueWrite();
    const drop = new Set(played.map((s) => s.id));
    patch({
      queueSongs: before.queueSongs.filter((s) => !drop.has(s.id)),
      queueMeta: before.queueMeta
    });
    repaintQueueButtonsNow();
    notifyQueueViews();
    notify(`\u5DF2\u79FB\u9664 ${drop.size} \u9996\u5DF2\u542C\u5B8C\u7684\u8282\u76EE`, "ok");
    try {
      const r = await api.queueRemovePlayed();
      if (!r || !r.ok) {
        rollbackQueue(before, gen);
        notify(r && r.error || "\u79FB\u9664\u5DF2\u64AD\u653E\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
        return;
      }
      await reloadQueueIfCurrent(gen);
    } catch (e) {
      rollbackQueue(before, gen);
      notify("\u79FB\u9664\u5DF2\u64AD\u653E\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
    } finally {
      queueWrites.end();
    }
  }
  async function replaceQueueAndPlay2() {
    const data2 = getData();
    if (!data2.queueSongs.length) {
      notify("\u300C\u64AD\u5BA2\u300D\u5217\u8868\u4E3A\u7A7A", "warn");
      return;
    }
    if (!hasSetQueue()) {
      notify(SET_QUEUE_UNAVAILABLE, "err");
      return;
    }
    const ok = await uiConfirm({
      title: PLAY_FROM_START_TITLE,
      message: PLAY_FROM_START_MESSAGE,
      okText: PLAY_FROM_START_OK
    });
    if (!ok) return;
    try {
      const modeOk = await ensureSequentialPlayMode();
      if (modeOk === false) return;
      const { ids } = queueIdsForStart(getData().queueSongs, null);
      if (!ids.length) {
        notify("\u300C\u64AD\u5BA2\u300D\u5217\u8868\u91CC\u8FD8\u6CA1\u6709\u53EF\u64AD\u653E\u7684\u5355\u96C6", "warn");
        return;
      }
      const meta = getData().queueMeta;
      await replaceQueueAndPlay(ids, 0, {
        sourcePlaylistId: meta ? meta.playlistId : void 0
      });
      try {
        await setPlayMode("order");
      } catch (_) {
      }
      const first = (getData().queueSongs || []).find((s) => episodeSongId(s) === ids[0]) || getData().queueSongs[0];
      notify(`\u6B63\u5728\u64AD\u653E\u300C${first && first.title || "\u5F53\u524D\u5355\u96C6"}\u300D`, "ok");
    } catch (e) {
      notify(String(e), "err");
    }
  }
  async function reorderQueue(songIds) {
    const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
    if (!ids.length) return;
    const gen = beginQueueWrite();
    const before = snapshotQueue(getData());
    patch({
      queueSongs: reorderSongs(before.queueSongs, ids),
      queueMeta: before.queueMeta
    });
    notifyQueueViews();
    try {
      const r = await api.queueReorder(ids);
      if (!r || !r.ok) {
        rollbackQueue(before, gen);
        notify(r && r.error || "\u6392\u5E8F\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
        return;
      }
      await reloadQueueIfCurrent(gen);
    } catch (e) {
      rollbackQueue(before, gen);
      notify("\u6392\u5E8F\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5217\u8868", "err");
    } finally {
      queueWrites.end();
    }
  }

  // ui/lib/skeletonGate.js
  var SKELETON_DELAY_MS = 200;
  function episodeSkeletonHtml(rows = 6) {
    const n = Math.max(1, Math.min(12, Number(rows) || 6));
    let html = "";
    for (let i = 0; i < n; i += 1) {
      html += `<div class="ep-skel" aria-hidden="true"><div class="ep-skel__cover"></div><div class="ep-skel__body"><div class="ep-skel__line"></div><div class="ep-skel__line ep-skel__line--short"></div></div></div>`;
    }
    return html;
  }
  function createSkeletonGate(opts) {
    const delayMs = typeof opts.delayMs === "number" && opts.delayMs >= 0 ? opts.delayMs : SKELETON_DELAY_MS;
    const hasContent = opts.hasContent;
    const show = opts.show;
    const schedule = opts.setTimeout || setTimeout;
    const cancel = opts.clearTimeout || clearTimeout;
    let timer2 = null;
    let shown = false;
    let stopped = false;
    function start() {
      stopped = false;
      shown = false;
      if (typeof hasContent === "function" && hasContent()) return;
      if (timer2 != null) cancel(timer2);
      timer2 = schedule(() => {
        timer2 = null;
        if (stopped) return;
        if (typeof hasContent === "function" && hasContent()) return;
        shown = true;
        if (typeof show === "function") show();
      }, delayMs);
    }
    function stop() {
      stopped = true;
      if (timer2 != null) {
        cancel(timer2);
        timer2 = null;
      }
    }
    return {
      start,
      stop,
      wasShown: () => shown,
      isPending: () => timer2 != null
    };
  }

  // ui/lib/uiCache.js
  var UI_CACHE_KEY = "songloft.podcast.uiCache.v1";
  var FEED_CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
  var UI_CACHE_LIST_CAPS = {
    recent: 80,
    history: 120,
    favorites: 120,
    subs: 200,
    queueSongs: 400
  };
  var LIST_KEYS = ["recent", "history", "favorites", "subs", "queueSongs"];
  var EMPTY = () => ({
    version: 1,
    savedAt: 0,
    feedSyncedAt: 0,
    activeTab: "recent",
    queueOpen: false,
    scrolls: {},
    recent: [],
    history: [],
    favorites: [],
    subs: [],
    queueSongs: [],
    queueMeta: null
  });
  function storage() {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage;
    } catch (_) {
      return null;
    }
  }
  function slimCacheItem(item) {
    if (!item || typeof item !== "object") return item;
    if (!Object.prototype.hasOwnProperty.call(item, "showNote")) return item;
    const { showNote, ...rest } = item;
    if (showNote == null) return rest;
    return { ...rest, hasShowNote: true };
  }
  function slimCacheList(list, cap) {
    if (!Array.isArray(list)) return [];
    const limit = typeof cap === "number" && cap > 0 ? cap : list.length;
    return list.slice(0, limit).map(slimCacheItem);
  }
  function mergeListsForPersist(partial, previous) {
    const prev = previous && typeof previous === "object" ? previous : {};
    const src = partial && typeof partial === "object" ? partial : {};
    const out = { ...src };
    for (const key of LIST_KEYS) {
      const next = src[key];
      const old = prev[key];
      if (Array.isArray(next) && next.length === 0 && Array.isArray(old) && old.length > 0) {
        out[key] = old;
      }
    }
    if ((src.queueMeta == null || src.queueMeta === void 0) && prev.queueMeta != null) {
      out.queueMeta = prev.queueMeta;
    }
    return out;
  }
  function retainNonEmptyLists(current, previous) {
    const cur = current && typeof current === "object" ? current : {};
    const prev = previous && typeof previous === "object" ? previous : {};
    const patch2 = {};
    let changed = false;
    for (const key of LIST_KEYS) {
      const now = cur[key];
      const old = prev[key];
      if (Array.isArray(now) && now.length === 0 && Array.isArray(old) && old.length > 0) {
        patch2[key] = old;
        changed = true;
      }
    }
    if ((cur.queueMeta == null || cur.queueMeta === void 0) && prev.queueMeta != null && Array.isArray(prev.queueSongs) && prev.queueSongs.length > 0) {
      patch2.queueMeta = prev.queueMeta;
      changed = true;
    }
    return { patch: patch2, changed };
  }
  function hasValidListCache(cache) {
    if (!cache || typeof cache !== "object") return false;
    const lists = [cache.recent, cache.history, cache.favorites, cache.subs, cache.queueSongs];
    return lists.some((list) => Array.isArray(list) && list.length > 0);
  }
  function needsInitialFeedRefresh(cache) {
    return !hasValidListCache(cache);
  }
  function shouldBackgroundFeedRefresh(cache, now = Date.now(), ttlMs = FEED_CACHE_TTL_MS) {
    if (!hasValidListCache(cache)) return false;
    const synced = Number(cache.feedSyncedAt) || 0;
    if (!synced) return true;
    return now - synced >= ttlMs;
  }
  function isScheduleFeedFresh(lastSuccessAt, intervalHours = 6, now = Date.now()) {
    const last = Number(lastSuccessAt);
    if (!Number.isFinite(last) || last <= 0) return false;
    let hours = Number(intervalHours);
    if (!Number.isFinite(hours) || hours <= 0) hours = 6;
    if (hours !== 6 && hours !== 12 && hours !== 24) hours = 6;
    return now - last < hours * 60 * 60 * 1e3;
  }
  function shouldBootFeedRefresh(cache, schedule = null, now = Date.now()) {
    if (schedule && isScheduleFeedFresh(schedule.lastSuccessAt, schedule.intervalHours, now)) {
      return false;
    }
    if (needsInitialFeedRefresh(cache)) return true;
    return shouldBackgroundFeedRefresh(cache, now);
  }
  function loadUiCache(store = storage()) {
    if (!store) return null;
    try {
      const raw = store.getItem(UI_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return { ...EMPTY(), ...parsed, version: 1 };
    } catch (_) {
      return null;
    }
  }
  function saveUiCache(partial, store = storage(), now = Date.now()) {
    if (!store) return null;
    const prev = loadUiCache(store) || EMPTY();
    const merged = mergeListsForPersist(partial || {}, prev);
    const next = {
      ...prev,
      ...merged,
      version: 1,
      savedAt: now,
      recent: slimCacheList(merged.recent != null ? merged.recent : prev.recent, UI_CACHE_LIST_CAPS.recent),
      history: slimCacheList(merged.history != null ? merged.history : prev.history, UI_CACHE_LIST_CAPS.history),
      favorites: slimCacheList(
        merged.favorites != null ? merged.favorites : prev.favorites,
        UI_CACHE_LIST_CAPS.favorites
      ),
      subs: slimCacheList(merged.subs != null ? merged.subs : prev.subs, UI_CACHE_LIST_CAPS.subs),
      queueSongs: slimCacheList(
        merged.queueSongs != null ? merged.queueSongs : prev.queueSongs,
        UI_CACHE_LIST_CAPS.queueSongs
      )
    };
    try {
      store.setItem(UI_CACHE_KEY, JSON.stringify(next));
      return next;
    } catch (_) {
      try {
        const tight = {
          ...next,
          history: slimCacheList(next.history, 40),
          favorites: slimCacheList(next.favorites, 40),
          queueSongs: slimCacheList(next.queueSongs, 80)
        };
        store.setItem(UI_CACHE_KEY, JSON.stringify(tight));
        return tight;
      } catch (_2) {
        return null;
      }
    }
  }
  function markFeedSynced(at = Date.now(), store = storage()) {
    return saveUiCache({ feedSyncedAt: at }, store, at);
  }
  function cacheFromStoreData(data2, chrome = {}) {
    const d = data2 || {};
    return {
      recent: Array.isArray(d.recent) ? d.recent : [],
      history: Array.isArray(d.history) ? d.history : [],
      favorites: Array.isArray(d.favorites) ? d.favorites : [],
      subs: Array.isArray(d.subs) ? d.subs : [],
      queueSongs: Array.isArray(d.queueSongs) ? d.queueSongs : [],
      queueMeta: d.queueMeta || null,
      activeTab: chrome.activeTab || "recent",
      queueOpen: !!chrome.queueOpen,
      scrolls: chrome.scrolls && typeof chrome.scrolls === "object" ? chrome.scrolls : {}
    };
  }

  // ui/lib/format.js
  function fmtSec(sec) {
    const n = Number(sec);
    if (!Number.isFinite(n) || n < 0) return "0:00";
    const total = Math.floor(n);
    const h = Math.floor(total / 3600);
    const m = Math.floor(total % 3600 / 60);
    const s = total % 60;
    const pad = (v) => String(v).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  function fmtTime(ms) {
    if (ms == null || !Number.isFinite(Number(ms))) return "\u2014";
    const d = new Date(Number(ms));
    if (!Number.isFinite(d.getTime())) return "\u2014";
    const pad = (v) => String(v).padStart(2, "0");
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }
  function dateGroupKey(ms) {
    if (!ms || !Number.isFinite(ms) || ms < 864e5) return "\u672A\u77E5\u65E5\u671F";
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return "\u672A\u77E5\u65E5\u671F";
    return `${d.getMonth() + 1}\u6708 ${d.getDate()}\u65E5`;
  }
  function absoluteCoverUrl(url) {
    const u = typeof url === "string" ? url.trim() : "";
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
    return "";
  }
  function progressRatio(prog, durationSec) {
    if (!prog) return 0;
    if (prog.completed) return 1;
    const dur = prog && prog.durationSec || durationSec;
    const pos = prog && typeof prog.positionSec === "number" ? prog.positionSec : 0;
    if (!dur || dur <= 0 || pos <= 0) return 0;
    return Math.max(0, Math.min(1, pos / dur));
  }
  function colorFromString(input) {
    const s = String(input || "");
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
    return `hsl(${hash} 52% 45%)`;
  }
  function matchesQuery(haystack, query3) {
    const q = String(query3 || "").trim().toLowerCase();
    if (!q) return true;
    return String(haystack || "").toLowerCase().includes(q);
  }

  // ui/lib/rows.js
  function progressBadgeHtml(prog, durationSec) {
    const dur = prog && prog.durationSec || durationSec;
    const durText = dur ? fmtSec(dur) : "";
    if (prog && prog.completed) {
      return `<span class="prog-badge done" title="\u5DF2\u542C\u5B8C">` + (durText ? `<span class="t">${escapeHtml(durText)}</span>` : "") + `<span class="prog-check">${icon("checkCircle", 15)}</span></span>`;
    }
    const ratio = progressRatio(prog, durationSec);
    if (ratio > 0 && durText) {
      const pct = Math.max(2, Math.round(ratio * 100));
      return `<span class="prog-badge" title="\u8FDB\u5EA6 ${pct}%"><span class="t">${escapeHtml(durText)}</span><span class="bar" style="--p:${pct}"><i></i></span></span>`;
    }
    return durText ? `<span class="prog-badge"><span class="t">${escapeHtml(durText)}</span></span>` : "";
  }
  function coverHtml(url, title, cls) {
    const klass = cls || "ep-cover";
    const abs = absoluteCoverUrl(url);
    if (abs) {
      return `<img class="${klass}" src="${escapeHtml(abs)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover />`;
    }
    const letter = String(title || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="cover-ph ${klass === "ep-cover" ? "" : klass}" style="background:${colorFromString(title || "")}">${escapeHtml(letter)}</div>`;
  }
  function showNoteAvailable(ep) {
    if (!ep) return false;
    if (ep.hasShowNote === true) return true;
    const note = ep.showNote || ep.description || "";
    if (!note) return false;
    const text = String(note).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return !!text || /<img\b/i.test(String(note));
  }
  function rowDataset(ep) {
    const attrs = [];
    if (ep.songId != null) attrs.push(`data-song-id="${Number(ep.songId)}"`);
    if (ep.feedUrl) attrs.push(`data-feed="${escapeHtml(ep.feedUrl)}"`);
    if (ep.guid) attrs.push(`data-guid="${escapeHtml(ep.guid)}"`);
    const dur = ep.durationSec || ep.progress && ep.progress.durationSec || null;
    if (dur) attrs.push(`data-duration="${Number(dur)}"`);
    if (ep.progress) attrs.push(`data-progress="${escapeHtml(JSON.stringify(ep.progress))}"`);
    return attrs.join(" ");
  }
  function readRowProgress(row) {
    const raw = row.getAttribute("data-progress");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function episodeRowHtml(ep, idx, opts = {}) {
    const snap = get();
    const playingId = currentSongId(snap);
    const isCurrent = ep.songId != null && playingId === ep.songId;
    const prog = isCurrent ? liveProgressFor({ id: ep.songId, progress: ep.progress, duration: ep.durationSec }, snap) : ep.progress;
    const label = phaseLabel(snap.phase);
    const dateMs = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : null);
    const showDate = opts.showDate !== false && dateMs && Number.isFinite(dateMs);
    const playIcon = isCurrent && snap.phase === "playing" ? "pause" : "play";
    const lead = opts.leadHtml || "";
    const pending = !!opts.pending;
    const fromWaitlist = !!opts.fromWaitlist;
    const headGrid = lead ? "ep-head q-head" : "ep-head";
    const channelAttr = opts.channelLink ? `data-channel-tap data-idx="${idx}"` : "";
    const art = opts.coverHtml || coverHtml(ep.coverUrl, ep.title || ep.showTitle);
    const cover = opts.channelLink ? `<button type="button" class="cover-btn" ${channelAttr} title="\u67E5\u770B\u9891\u9053">` + art + `</button>` : art;
    const showName = ep.showTitle ? opts.channelLink ? `<button type="button" class="channel-link" ${channelAttr}>${escapeHtml(ep.showTitle)}</button>` : `<span>${escapeHtml(ep.showTitle)}</span>` : "";
    const actions = (opts.actions || []).map(
      (a) => `<button type="button" class="icon-btn ${a.cls || ""}" data-act="${a.act}" data-idx="${idx}" title="${escapeHtml(a.title)}" ${a.attrs || ""}>${icon(a.iconName, 17)}</button>`
    ).join("");
    return `<div class="ep-row${isCurrent ? " is-current" : ""}${pending ? " is-pending" : ""}${opts.extraClass ? " " + opts.extraClass : ""}" data-row data-idx="${idx}" ${pending ? 'aria-busy="true" ' : ""}${fromWaitlist ? 'data-from-waitlist="1" ' : ""}${rowDataset(ep)}><div class="${headGrid}">` + lead + cover + `<div><button type="button" class="ep-title--tap" data-title-tap data-idx="${idx}" title="\u67E5\u770B\u8BE6\u60C5">${escapeHtml(ep.title || "\u672A\u547D\u540D")}</button><div class="meta-line">` + showName + (pending ? `<span class="q-pending">\u6B63\u5728\u52A0\u5165\u2026</span>` : `<span data-now-badge ${isCurrent && label ? "" : "hidden"}>${escapeHtml(isCurrent ? label : "")}</span><span data-prog-slot>${progressBadgeHtml(prog, ep.durationSec)}</span>` + (showDate ? `<span class="hide-sm">${escapeHtml(fmtTime(dateMs))}</span>` : "")) + `</div></div></div><div class="actions-row"><button type="button" class="icon-btn icon-btn--play" data-play-btn data-idx="${idx}" title="${playButtonLabel({ isCurrent, phase: snap.phase, pending, fromWaitlist })}" aria-label="${playButtonLabel({ isCurrent, phase: snap.phase, pending, fromWaitlist })}"${pending ? " disabled" : ""}>${pending ? '<span class="q-spinner" aria-hidden="true"></span>' : icon(playIcon, 17)}</button>` + actions + (opts.moreHtml || "") + `</div></div>`;
  }
  function moreMenuHtml(items, wrapKey) {
    const body = items.map((it) => {
      const label = escapeHtml(it.label);
      const cls = it.danger ? "danger-text" : "";
      return `<button type="button" class="${cls}" data-more-act="${escapeHtml(it.key)}" title="${label}" ${it.attrs || ""}>` + (it.iconName ? icon(it.iconName, 15) : "") + `<span>${label}</span></button>`;
    }).join("");
    return `<div class="more-wrap" data-more-wrap="${escapeHtml(String(wrapKey))}"><button type="button" class="icon-btn" data-more-toggle title="\u66F4\u591A">${icon("moreHorizontal", 17)}</button><div class="more-menu">${body}</div></div>`;
  }
  function paintRows(snap) {
    const current = snap || get();
    const playingId = currentSongId(current);
    const label = phaseLabel(current.phase);
    const cur = current.current || {};
    const curFeed = cur.feedUrl ? String(cur.feedUrl) : "";
    const curGuid = cur.guid ? String(cur.guid) : "";
    document.querySelectorAll("[data-row]").forEach((row) => {
      const rawId = row.getAttribute("data-song-id");
      const songId = rawId != null ? Number(rawId) : null;
      const rowFeed = row.getAttribute("data-feed") || "";
      const rowGuid = row.getAttribute("data-guid") || "";
      const isCurrent = songId != null && playingId != null && playingId === songId || curFeed && curGuid && rowFeed === curFeed && rowGuid === curGuid;
      row.classList.toggle("is-current", !!isCurrent);
      const badge = row.querySelector("[data-now-badge]");
      if (badge) {
        const text = isCurrent ? label : "";
        badge.hidden = !text;
        badge.textContent = text;
      }
      const playBtn = row.querySelector("[data-play-btn]");
      if (playBtn) {
        const iconName = isCurrent && current.phase === "playing" ? "pause" : "play";
        const pending = row.classList.contains("is-pending");
        const fromWaitlist = row.hasAttribute("data-from-waitlist");
        const label2 = playButtonLabel({ isCurrent, phase: current.phase, pending, fromWaitlist });
        if (!pending) playBtn.innerHTML = icon(iconName, 17);
        playBtn.title = label2;
        playBtn.setAttribute("aria-label", label2);
      }
      const slot = row.querySelector("[data-prog-slot]");
      if (!slot) return;
      const dur = Number(row.getAttribute("data-duration")) || null;
      const base = readRowProgress(row);
      const prog = isCurrent ? liveProgressFor({ id: songId, progress: base, duration: dur }, current) : base;
      if (prog || dur) slot.innerHTML = progressBadgeHtml(prog, dur);
    });
  }

  // ui/lib/feedRefresh.js
  var fullInFlight = null;
  var oneInFlight = null;
  var remoteBusy = false;
  var listeners3 = /* @__PURE__ */ new Set();
  var REFRESH_BUSY_TOAST = "\u6B63\u5728\u5237\u65B0\uFF0C\u8BF7\u7A0D\u5019\u3002";
  var REFRESH_STILL_RUNNING_TOAST = "\u5237\u65B0\u4ECD\u5728\u8FDB\u884C\uFF0C\u7A0D\u540E\u4E0B\u62C9\u67E5\u770B\u3002";
  var REFRESH_HINT_TEXT = "\u6B63\u5728\u5237\u65B0\u2026";
  var REFRESH_MENU_BUSY_LABEL = "\u6B63\u5728\u5237\u65B0\u2026";
  var REFRESH_MENU_IDLE_LABEL = "\u5237\u65B0";
  function isFeedRefreshing() {
    return !!(fullInFlight || oneInFlight || remoteBusy);
  }
  function onFeedRefreshState(fn) {
    if (typeof fn !== "function") return () => {
    };
    listeners3.add(fn);
    try {
      fn(isFeedRefreshing());
    } catch (_) {
    }
    return () => listeners3.delete(fn);
  }
  function emit2() {
    const busy = isFeedRefreshing();
    for (const fn of listeners3) {
      try {
        fn(busy);
      } catch (_) {
      }
    }
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function isSkippedBusy(errOrResult) {
    if (errOrResult == null) return false;
    if (typeof errOrResult === "string") return /skipped_busy/i.test(errOrResult);
    if (typeof errOrResult !== "object") return /skipped_busy/i.test(String(errOrResult));
    if (errOrResult.skipped === true) return true;
    if (errOrResult.error === "skipped_busy" || errOrResult.reason === "skipped_busy") return true;
    const msg = String(errOrResult.message || errOrResult.error || errOrResult.reason || "");
    return /skipped_busy/i.test(msg);
  }
  function humanizeRefreshFailure(errOrResult, fallback = "\u5237\u65B0\u5931\u8D25") {
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
  function wrapRefreshCall(promiseFactory) {
    return (async () => {
      try {
        return await promiseFactory();
      } catch (e) {
        if (isSkippedBusy(e)) return { ok: false, skipped: true, error: "skipped_busy" };
        throw e;
      }
    })();
  }
  async function waitUntilFeedRefreshIdle(api2, opts = {}) {
    const pollMs = typeof opts.pollMs === "number" && opts.pollMs > 0 ? opts.pollMs : 350;
    const timeoutMs = typeof opts.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 18e4;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      let status = null;
      try {
        status = await api2.status();
      } catch (_) {
        status = null;
      }
      const busy = !!(status && status.refreshBusy === true);
      if (busy !== remoteBusy) {
        remoteBusy = busy;
        emit2();
      }
      if (!busy) return { timedOut: false };
      await delay(pollMs);
    }
    if (remoteBusy) {
      remoteBusy = false;
      emit2();
    }
    return { timedOut: true };
  }
  async function trackRemoteRefreshBusy(api2, opts = {}) {
    remoteBusy = true;
    emit2();
    try {
      return await waitUntilFeedRefreshIdle(api2, opts);
    } finally {
      remoteBusy = false;
      emit2();
    }
  }
  function runFeedRefresh(deps) {
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
    emit2();
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
        emit2();
      }
    })();
    return gate;
  }
  function runFeedRefreshOne(deps) {
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
    emit2();
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
        emit2();
      }
    })();
    return gate;
  }
  function readRefreshIconSize(btn) {
    const slot = btn.querySelector && btn.querySelector("[data-size], .ico, .q-spinner");
    if (slot) {
      const raw = typeof slot.getAttribute === "function" && slot.getAttribute("data-size") || typeof slot.getAttribute === "function" && slot.getAttribute("style") || "";
      const fromData = Number(raw);
      if (Number.isFinite(fromData) && fromData > 0) return fromData;
      const m = /width:\s*(\d+)/.exec(String(raw));
      if (m) return Number(m[1]) || 16;
    }
    return 16;
  }
  function applyRefreshButtonBusy(btn, busy) {
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
      const spinner = `<span class="q-spinner" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
      const label = btn.querySelector && btn.querySelector("[data-refresh-label]");
      const iconSlot = btn.querySelector && (btn.querySelector("[data-icon]") || btn.querySelector(".ico")) || null;
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
  function applyRefreshMenuBusy(root, busy) {
    const scope = root && root.querySelectorAll ? root : typeof document !== "undefined" ? document : null;
    if (!scope || !scope.querySelectorAll) return;
    const text = busy ? REFRESH_MENU_BUSY_LABEL : REFRESH_MENU_IDLE_LABEL;
    scope.querySelectorAll('[data-more-act="refresh"]').forEach((el2) => {
      el2.setAttribute("aria-busy", busy ? "true" : "false");
      el2.setAttribute("title", text);
      if (busy) el2.classList.add("is-refreshing");
      else el2.classList.remove("is-refreshing");
      const label = el2.querySelector("[data-refresh-label]") || el2.querySelector("span:last-child");
      if (label) label.textContent = text;
      else if (!el2.querySelector(".ico") && !el2.querySelector("[data-icon]")) {
        el2.textContent = text;
      }
    });
  }
  function applyRefreshHint(el2, busy) {
    if (!el2) return;
    el2.hidden = !busy;
    if (busy) el2.textContent = REFRESH_HINT_TEXT;
  }

  // ui/lib/sanitize.js
  var SHOW_NOTE_ALLOWED_TAGS = [
    "p",
    "br",
    "a",
    "img",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "code",
    "pre",
    "hr",
    "span",
    "div",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td"
  ];
  var ALLOWED = new Set(SHOW_NOTE_ALLOWED_TAGS);
  var VOID_TAGS = /* @__PURE__ */ new Set(["br", "hr", "img"]);
  var DROPPED_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "template", "svg", "math"];
  function isSafeHttpUrl(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return false;
    if (!/^https?:\/\/[^\s]+/i.test(raw)) return false;
    if (/[\u0000-\u001f\u007f"'<>`\\]/.test(raw)) return false;
    return true;
  }
  function escapeText(value) {
    return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr2(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function readAttr(attrs, name) {
    const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "gi");
    let out = "";
    let m;
    while ((m = re.exec(attrs)) !== null) {
      out = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] || "";
    }
    return out;
  }
  function stripDangerousBlocks(html) {
    let out = String(html || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
    out = out.replace(/<!--[\s\S]*?-->/g, "");
    for (const tag of DROPPED_WITH_CONTENT) {
      const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi");
      out = out.replace(paired, "");
      out = out.replace(new RegExp(`</?${tag}\\b[^>]*>`, "gi"), "");
    }
    return out;
  }
  function sanitizeShowNote(raw) {
    const input = stripDangerousBlocks(raw);
    const parts = [];
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?)(\/?)>/g;
    let last = 0;
    let m;
    while ((m = tagRe.exec(input)) !== null) {
      if (m.index > last) parts.push({ text: input.slice(last, m.index) });
      parts.push({ closing: m[1] === "/", name: m[2].toLowerCase(), attrs: m[3] || "" });
      last = m.index + m[0].length;
    }
    if (last < input.length) parts.push({ text: input.slice(last) });
    const out = [];
    for (const part of parts) {
      if (part.text !== void 0) {
        out.push(escapeText(part.text));
        continue;
      }
      const { name } = part;
      if (!ALLOWED.has(name)) continue;
      if (part.closing) {
        if (!VOID_TAGS.has(name)) out.push(`</${name}>`);
        continue;
      }
      if (name === "br" || name === "hr") {
        out.push(`<${name} />`);
        continue;
      }
      if (name === "img") {
        const src = readAttr(part.attrs, "src");
        if (!isSafeHttpUrl(src)) continue;
        const alt = readAttr(part.attrs, "alt");
        out.push(`<img src="${escapeAttr2(src.trim())}" alt="${escapeAttr2(alt)}" loading="lazy" />`);
        continue;
      }
      if (name === "a") {
        const href = readAttr(part.attrs, "href");
        if (!isSafeHttpUrl(href)) {
          out.push("<span>");
          continue;
        }
        out.push(
          `<a href="${escapeAttr2(href.trim())}" target="_blank" rel="noopener noreferrer nofollow">`
        );
        continue;
      }
      out.push(`<${name}>`);
    }
    return out.join("").replace(/\s{2,}/g, " ").trim();
  }
  function looksLikeHtml(value) {
    return /<[a-z][^>]*>/i.test(String(value || ""));
  }

  // ui/lib/shownoteActions.js
  var SHOWNNOTE_FOOT_CLASS = "modal__foot--episode-actions";
  var QUEUE_ADD_LABEL2 = "\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868";
  var QUEUE_ADD_SHORT_LABEL = "\u52A0\u5165\u5217\u8868";
  var PLAY_THROUGH_HINT = "\u4ECE\u8FD9\u4E00\u96C6\u5F00\u59CB\uFF0C\u987A\u5E8F\u64AD\u5B8C\u300C\u64AD\u5BA2\u300D\u5217\u8868";
  function shownoteFootActions(ep, opts = {}) {
    const favorited = !!(ep && ep.favorited);
    const playHint = opts.fromWaitlist ? PLAY_THROUGH_HINT : "\u64AD\u653E\u8FD9\u4E00\u96C6";
    return [
      {
        key: "play",
        label: "\u64AD\u653E",
        shortLabel: "\u64AD\u653E",
        ariaLabel: playHint,
        title: playHint,
        kind: "primary",
        iconName: "play",
        close: true
      },
      {
        key: "queue",
        label: QUEUE_ADD_LABEL2,
        shortLabel: QUEUE_ADD_SHORT_LABEL,
        ariaLabel: QUEUE_ADD_LABEL2,
        title: QUEUE_ADD_LABEL2,
        kind: "tonal",
        iconName: "listPlus",
        close: true
      },
      {
        key: "cast",
        label: "\u6295\u653E\u5230\u97F3\u7BB1",
        shortLabel: "\u6295\u653E",
        ariaLabel: "\u6295\u653E\u5230\u97F3\u7BB1",
        title: "\u6295\u653E\u5230\u97F3\u7BB1",
        kind: "ghost",
        iconName: "speaker",
        close: true
      },
      {
        key: "favorite",
        label: favorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
        shortLabel: favorited ? "\u5DF2\u6536\u85CF" : "\u6536\u85CF",
        ariaLabel: favorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
        title: favorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
        ariaPressed: favorited,
        kind: "ghost",
        iconName: "star",
        close: true
      }
    ];
  }

  // ui/views/show-note.js
  var context = null;
  function metaLine(ep) {
    const bits = [];
    const ms = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : null);
    if (ms && Number.isFinite(ms)) bits.push(fmtTime(ms));
    const show = ep.showTitle || ep.album || ep.artist;
    if (show) bits.push(show);
    const dur = ep.durationSec || ep.duration;
    if (dur) bits.push(fmtSec(dur));
    return bits.join(" \xB7 ");
  }
  async function openShowNote(ep, opts = {}) {
    if (!ep) return;
    context = ep;
    const fromWaitlist = !!opts.fromWaitlist;
    const body = document.createElement("div");
    body.className = "sn-frame";
    let note = ep.showNote || ep.description || "";
    const hasNote = showNoteAvailable(ep);
    if (ep.feedUrl && ep.guid && !ep.durationSec) {
      try {
        const pr = await api.getProgressOne(ep.feedUrl, ep.guid);
        if (pr && pr.ok && pr.progress && pr.progress.durationSec) {
          ep.durationSec = pr.progress.durationSec;
        }
      } catch (_) {
      }
    }
    const safeNote = hasNote ? looksLikeHtml(note) ? sanitizeShowNote(note) : `<p>${escapeHtml(note).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>` : `<p class="muted">\u6682\u65E0 ShowNote\u3002\u53EF\u5728\u300C\u8BA2\u9605\u300D\u4E2D\u5237\u65B0\u8BE5\u8282\u76EE\u540E\u518D\u8BD5\u3002</p>`;
    const html = `<div class="sn-head"><div class="sn-meta">${escapeHtml(metaLine(ep))}</div><div class="sn-title">${escapeHtml(ep.title || "ShowNote")}</div></div><div class="sn-body" id="snBody">` + safeNote + `</div>`;
    body.innerHTML = html;
    const [playAct, queueAct, castAct, favAct] = shownoteFootActions(ep, { fromWaitlist });
    openModal({
      title: "",
      body,
      size: "wide",
      footClass: SHOWNNOTE_FOOT_CLASS,
      actions: [
        {
          ...playAct,
          onClick: () => {
            playEpisode(episodePayload(ep), { fromWaitlist });
          }
        },
        {
          ...queueAct,
          close: true,
          onClick: () => addToQueue(ep)
        },
        {
          ...castAct,
          onClick: () => castToSpeaker(ep.songId, { prepareIfMissing: ep })
        },
        {
          ...favAct,
          onClick: () => toggleFavorite(ep, null)
        }
      ]
    });
    const snBody = body.querySelector("#snBody");
    if (snBody) snBody.scrollTop = 0;
  }

  // ui/lib/clipboard.js
  async function copyText(text) {
    const value = String(text ?? "");
    if (!value) return false;
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) {
      }
    }
    if (typeof document === "undefined" || !document.body) return false;
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
    document.body.appendChild(ta);
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, value.length);
      return !!(document.execCommand && document.execCommand("copy"));
    } catch (_) {
      return false;
    } finally {
      try {
        document.body.removeChild(ta);
      } catch (_) {
      }
    }
  }

  // ui/lib/episodePages.js
  var EPISODE_PAGE_SIZE = 20;
  var MAX_EPISODE_PAGE = 100;
  var ADD_ALL_CONFIRM_THRESHOLD = 50;
  var DEFAULT_HISTORY_INDEX_LIMIT = 2e3;
  var HISTORY_INDEX_COMPLETE_TOAST = "\u5DF2\u6309\u6E90\u91CC\u73B0\u6709\u8282\u76EE\u6536\u5F55\uFF0C\u66F4\u65E9\u7684\u65E0\u6CD5\u627E\u56DE\u3002";
  var REFRESH_UP_TO_DATE_TOAST = "\u5DF2\u662F\u6700\u65B0";
  function pageEpisodes(episodes, offset = 0, limit = EPISODE_PAGE_SIZE) {
    const list = Array.isArray(episodes) ? episodes : [];
    const off = Math.max(0, Math.floor(Number(offset) || 0));
    const hasLimit = limit != null && limit !== "" && Number.isFinite(Number(limit));
    const remaining = Math.max(0, list.length - off);
    const lim = hasLimit ? Math.max(1, Math.min(MAX_EPISODE_PAGE, Math.floor(Number(limit) || EPISODE_PAGE_SIZE))) : remaining;
    const items = list.slice(off, off + lim);
    return {
      items,
      offset: off,
      limit: hasLimit ? lim : items.length,
      total: list.length,
      hasMore: off + items.length < list.length,
      nextOffset: off + items.length,
      shown: Math.min(off + items.length, list.length)
    };
  }
  function preservedRenderCount({ previousShown, previousSubId, nextSubId, nextTotal } = {}) {
    if (previousSubId && nextSubId && String(previousSubId) !== String(nextSubId)) return 0;
    const shown = Math.max(0, Math.floor(Number(previousShown) || 0));
    const total = Math.max(0, Math.floor(Number(nextTotal) || 0));
    if (!shown) return 0;
    return Math.min(shown, total);
  }
  function shouldConfirmAddAll(count) {
    return (Number(count) || 0) > ADD_ALL_CONFIRM_THRESHOLD;
  }
  function addAllConfirmCopy(count, cap = DEFAULT_HISTORY_INDEX_LIMIT) {
    const n = Number(count) || 0;
    const limit = Number(cap) || DEFAULT_HISTORY_INDEX_LIMIT;
    return `\u5C06\u628A ${n} \u96C6\u5168\u90E8\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868\uFF08\u8FFD\u52A0\u5230\u672B\u5C3E\uFF0C\u4E0D\u4F1A\u6539\u52A8\u6B63\u5728\u64AD\u653E\u7684\u987A\u5E8F\uFF09\u3002\u6570\u91CF\u8F83\u591A\uFF08\u672C\u5730\u6700\u591A\u53EF\u7D22\u5F15 ${limit} \u96C6\uFF09\uFF0C\u786E\u5B9A\u8981\u4E00\u6B21\u52A0\u5165\u6574\u8868\u5417\uFF1F\u53D6\u6D88\u5219\u4E0D\u4F1A\u52A0\u5165\u3002`;
  }
  function episodeLabel(ep) {
    if (!ep) return "";
    const t = typeof ep.title === "string" ? ep.title.trim() : "";
    return t || (typeof ep.pubDate === "string" ? ep.pubDate : "") || "";
  }
  function retainedRangeCopy(range) {
    if (!range || !range.newest || !range.oldest) return "";
    const a = episodeLabel(range.newest);
    const b = episodeLabel(range.oldest);
    if (!a && !b) return "";
    if (a === b) return `\uFF08\u5DF2\u4FDD\u7559\u300A${a}\u300B\uFF09`;
    return `\uFF08\u5DF2\u4FDD\u7559\u4ECE\u300A${a}\u300B\u5230\u300A${b}\u300B\uFF09`;
  }
  function historyIndexCopy(info = {}) {
    const status = info.status || "idle";
    const indexed = Number(info.indexedCount) || 0;
    const feed = Number(info.feedAvailableCount) || 0;
    const cap = Number(info.cap) || DEFAULT_HISTORY_INDEX_LIMIT;
    if (status === "running") {
      return { tone: "busy", text: "\u6B63\u5728\u7D22\u5F15\u8BE5\u9891\u9053\u7684\u5386\u53F2\u8282\u76EE\u2026" };
    }
    if (status === "error") {
      return { tone: "err", text: info.error ? `\u7D22\u5F15\u5931\u8D25\uFF1A${info.error}` : "\u7D22\u5F15\u5931\u8D25\uFF0C\u53EF\u4EE5\u91CD\u8BD5" };
    }
    if (status === "success" && info.capped) {
      if (info.earliestKept === true || info.earliestConfirmed === true) {
        return {
          tone: "ok",
          text: `\u6E90\u4E2D\u5171 ${feed} \u96C6\uFF0C\u672C\u5730\u5B89\u5168\u4E0A\u9650 ${cap}\uFF0C\u5DF2\u4FDD\u7559\u6700\u8FD1 ${Math.max(0, cap - 1)} \u96C6\u548C\u6700\u65E9\u4E00\u96C6\uFF0C\u4E2D\u95F4\u672A\u6536\u5F55`
        };
      }
      return {
        tone: "ok",
        text: `\u6E90\u4E2D\u5171 ${feed} \u96C6\uFF0C\u672C\u5730\u5B89\u5168\u4E0A\u9650 ${cap}\uFF0C\u672A\u80FD\u786E\u8BA4\u7B2C\u4E00\u671F\uFF0C\u5DF2\u4FDD\u7559\u6700\u8FD1 ${indexed} \u96C6${retainedRangeCopy(info.retainedRange)}`
      };
    }
    if (status === "success") {
      return { tone: "ok", text: "" };
    }
    if (info.truncated) {
      return {
        tone: "muted",
        text: `\u5F53\u524D\u4FDD\u7559\u6700\u8FD1 ${indexed} \u96C6\uFF0C\u66F4\u65E9\u7684\u53EF\u70B9\u7D22\u5F15\u5386\u53F2\u3002`
      };
    }
    return { tone: "muted", text: "" };
  }

  // ui/views/channel-dialog.js
  function emptyChannelState(subId = "") {
    return {
      modal: null,
      subId,
      title: "",
      author: "",
      description: "",
      url: "",
      coverUrl: null,
      lastSuccessAt: null,
      aboutExpanded: false,
      episodes: [],
      rendered: 0,
      busy: false,
      done: false,
      total: 0,
      truncated: false,
      historyIndexed: false,
      historyIndexStatus: "idle",
      historyIndexError: null,
      feedEpisodeCount: 0,
      capped: false,
      earliestConfirmed: false,
      historyIndexLimit: DEFAULT_HISTORY_INDEX_LIMIT
    };
  }
  var state2 = emptyChannelState();
  function resetChannelState() {
    state2 = emptyChannelState();
  }
  function episodeFingerprint(ep) {
    if (!ep) return "";
    return String(ep.guid || ep.enclosureUrl || ep.id || ep.title || "");
  }
  function askAddAllConfirm(body, count, cap = DEFAULT_HISTORY_INDEX_LIMIT) {
    return new Promise((resolve) => {
      const box = body.querySelector("#channelAddAllConfirm");
      const addBtn = body.querySelector("#channelAddAll");
      if (!box) {
        resolve(false);
        return;
      }
      const prevDisabled = addBtn ? addBtn.disabled : false;
      if (addBtn) addBtn.disabled = true;
      box.hidden = false;
      box.innerHTML = `<p>${escapeHtml(addAllConfirmCopy(count, cap))}</p><div class="channel-addall-confirm__actions"><button type="button" class="btn btn--ghost btn--sm" data-addall="no">\u53D6\u6D88</button><button type="button" class="btn btn--primary btn--sm" data-addall="yes">\u786E\u5B9A\u52A0\u5165\u6574\u8868</button></div>`;
      const done = (value) => {
        box.hidden = true;
        box.innerHTML = "";
        if (addBtn) addBtn.disabled = prevDisabled;
        resolve(value);
      };
      box.querySelector('[data-addall="yes"]').addEventListener("click", () => done(true));
      box.querySelector('[data-addall="no"]').addEventListener("click", () => done(false));
    });
  }
  function pagerText() {
    if (!state2.total) return "";
    if (state2.done || state2.rendered >= state2.total) return "";
    return `\u5DF2\u663E\u793A ${state2.rendered} / ${state2.total} \u96C6`;
  }
  function paintIndexStatus(body) {
    const el2 = body.querySelector("#channelIndexStatus");
    const btn = body.querySelector("#channelIndexHistory");
    if (!el2) return;
    const copy = historyIndexCopy({
      status: state2.historyIndexStatus,
      error: state2.historyIndexError,
      indexedCount: state2.total,
      feedAvailableCount: state2.feedEpisodeCount,
      truncated: state2.truncated,
      capped: state2.capped,
      cap: state2.historyIndexLimit || DEFAULT_HISTORY_INDEX_LIMIT,
      earliestConfirmed: state2.earliestConfirmed,
      earliestKept: state2.earliestConfirmed
    });
    el2.hidden = !copy.text;
    el2.className = "channel-index-status muted" + (copy.tone ? " is-" + copy.tone : "");
    el2.textContent = copy.text;
    paintFootVisibility(body);
    if (btn) {
      const running = state2.historyIndexStatus === "running";
      btn.disabled = running;
      btn.setAttribute("aria-busy", running ? "true" : "false");
      const label = btn.querySelector("[data-index-label]");
      if (label) label.textContent = running ? "\u6B63\u5728\u7D22\u5F15\u2026" : state2.historyIndexStatus === "error" ? "\u91CD\u8BD5\u7D22\u5F15\u5386\u53F2" : "\u7D22\u5F15\u5386\u53F2";
    }
  }
  function paintFootVisibility(body) {
    const foot = body.querySelector(".channel-dialog__foot");
    if (!foot) return;
    const visible = Array.from(foot.children).some((el2) => {
      if (el2.hidden) return false;
      if (el2.tagName === "BUTTON") return true;
      return String(el2.textContent || "").trim().length > 0;
    });
    foot.hidden = !visible;
  }
  function paintPager(body) {
    const status = body.querySelector("#epBatchStatus");
    const more = body.querySelector("#channelLoadMore");
    const text = pagerText();
    if (status) {
      status.textContent = text;
      status.hidden = !text;
    }
    if (more) {
      more.hidden = !!state2.done || !state2.total;
      more.disabled = !!state2.busy;
    }
    paintFootVisibility(body);
  }
  function channelCoverHtml() {
    const abs = absoluteCoverUrl(state2.coverUrl);
    if (abs) {
      return `<img class="channel-dialog__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
    }
    const letter = String(state2.title || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="channel-dialog__cover cover-ph" style="background:${colorFromString(state2.title || "")}">${escapeHtml(letter)}</div>`;
  }
  function paintHero(body) {
    const cover = body.querySelector("#channelHeroCover");
    const title = body.querySelector("#channelHeroTitle");
    const author = body.querySelector("#channelHeroAuthor");
    const count = body.querySelector("#channelHeroCount");
    const desc = body.querySelector("#channelDesc");
    const moreBtn = body.querySelector("#channelDescMore");
    const extra = body.querySelector("#channelAboutExtra");
    const urlEl = body.querySelector("#channelUrl");
    const lastEl = body.querySelector("#channelLastSuccess");
    if (cover) cover.innerHTML = channelCoverHtml();
    if (title) title.textContent = state2.title || "";
    if (author) {
      const a = String(state2.author || "").trim();
      author.hidden = !a;
      author.textContent = a;
    }
    if (count) count.textContent = state2.total ? `\u5171 ${state2.total} \u96C6` : "\u5171 0 \u96C6";
    const text = String(state2.description || "").trim();
    const hasDesc = !!text;
    if (desc) {
      desc.hidden = !hasDesc;
      desc.textContent = text;
      desc.classList.toggle("is-expanded", !!state2.aboutExpanded);
    }
    if (moreBtn) {
      moreBtn.hidden = !hasDesc;
      moreBtn.textContent = state2.aboutExpanded ? "\u6536\u8D77" : "\u66F4\u591A";
      moreBtn.setAttribute("aria-expanded", state2.aboutExpanded ? "true" : "false");
    }
    if (extra) {
      extra.hidden = hasDesc ? !state2.aboutExpanded : false;
    }
    if (urlEl) {
      urlEl.textContent = state2.url || "";
      urlEl.title = state2.url || "";
    }
    if (lastEl) {
      lastEl.textContent = state2.lastSuccessAt ? `\u4E0A\u6B21\u5237\u65B0\u6210\u529F ${fmtTime(state2.lastSuccessAt)}` : "\u8FD8\u6CA1\u6709\u6210\u529F\u5237\u65B0\u8BB0\u5F55";
    }
  }
  function setModalTitle(text) {
    const titleEl = document.getElementById("appModalTitle");
    if (!titleEl) return;
    titleEl.textContent = text || "";
    titleEl.style.display = text ? "" : "none";
  }
  function renderNextBatch(body) {
    const list = body.querySelector("#channelEpList");
    if (!list || state2.done) return;
    const page = pageEpisodes(state2.episodes, state2.rendered, EPISODE_PAGE_SIZE);
    if (!page.items.length) {
      state2.done = true;
      paintPager(body);
      return;
    }
    const startIdx = state2.rendered;
    const html = page.items.map((ep, i) => {
      const idx = startIdx + i;
      return episodeRowHtml(ep, idx, {
        showDate: true,
        actions: [
          { act: "queue", iconName: "listPlus", title: "\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868" },
          {
            act: "fav",
            iconName: "star",
            title: "\u6536\u85CF",
            cls: "icon-btn--star",
            attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`
          }
        ],
        moreHtml: moreMenuHtml(
          [{ key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` }],
          "ch-" + idx
        )
      });
    }).join("");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    bindRowInteractions(wrapper, state2.episodes);
    while (wrapper.firstChild) list.appendChild(wrapper.firstChild);
    state2.rendered = page.nextOffset;
    state2.done = !page.hasMore;
    paintPager(body);
  }
  function fillToScroll(body) {
    const list = body.querySelector("#channelEpList");
    if (!list) return;
    let guard = 0;
    while (!state2.done && list.scrollHeight <= list.clientHeight + 8 && guard < 50) {
      const before = state2.rendered;
      renderNextBatch(body);
      guard += 1;
      if (state2.rendered === before) break;
    }
  }
  function applyEpisodePayload(data2, subId) {
    state2.subId = subId;
    state2.title = data2.title || subId;
    state2.author = typeof data2.author === "string" ? data2.author : "";
    state2.description = typeof data2.description === "string" ? data2.description : "";
    state2.url = typeof data2.url === "string" ? data2.url : state2.url || "";
    state2.coverUrl = data2.coverUrl || null;
    state2.lastSuccessAt = typeof data2.lastSuccessAt === "number" && Number.isFinite(data2.lastSuccessAt) ? data2.lastSuccessAt : null;
    state2.episodes = (data2.episodes || []).map((ep) => ({
      ...ep,
      subscriptionId: ep.subscriptionId || subId,
      showTitle: ep.showTitle || state2.title
    }));
    state2.total = Number(data2.total != null ? data2.total : state2.episodes.length) || state2.episodes.length;
    state2.truncated = !!data2.truncated;
    state2.historyIndexed = !!data2.historyIndexed;
    state2.historyIndexStatus = data2.historyIndexStatus || "idle";
    state2.historyIndexError = data2.historyIndexError || null;
    state2.feedEpisodeCount = Number(data2.feedEpisodeCount) || state2.total;
    state2.capped = !!data2.capped;
    state2.earliestConfirmed = !!data2.earliestConfirmed;
    state2.historyIndexLimit = Number(data2.historyIndexLimit || data2.cap) || DEFAULT_HISTORY_INDEX_LIMIT;
  }
  async function loadEpisodes(body, subId, opts = {}) {
    const list = body.querySelector("#channelEpList");
    if (!list) return;
    const preserve = !!opts.preserve && state2.subId === subId && state2.rendered > 0;
    const keepShown = preserve ? preservedRenderCount({
      previousShown: state2.rendered,
      previousSubId: state2.subId,
      nextSubId: subId,
      nextTotal: state2.total
    }) : 0;
    const scrollTop = preserve ? list.scrollTop : 0;
    if (!preserve) {
      state2.rendered = 0;
      state2.done = false;
      list.innerHTML = '<div class="empty">\u52A0\u8F7D\u4E2D\u2026</div>';
    }
    state2.busy = true;
    paintPager(body);
    let data2;
    try {
      data2 = await api.getEpisodes(subId);
    } catch (e) {
      list.innerHTML = `<div class="empty">\u52A0\u8F7D\u5267\u96C6\u5931\u8D25\uFF1A${escapeHtml(String(e))}</div>`;
      state2.busy = false;
      state2.done = true;
      paintPager(body);
      return;
    }
    if (!data2 || !data2.ok) {
      list.innerHTML = `<div class="empty">${escapeHtml(data2 && data2.error || "\u52A0\u8F7D\u5267\u96C6\u5931\u8D25")}</div>`;
      state2.busy = false;
      state2.done = true;
      paintPager(body);
      return;
    }
    applyEpisodePayload(data2, subId);
    setModalTitle(state2.title || "");
    paintHero(body);
    paintIndexStatus(body);
    const target = preserve ? preservedRenderCount({
      previousShown: keepShown || state2.rendered,
      previousSubId: subId,
      nextSubId: subId,
      nextTotal: state2.total
    }) : 0;
    state2.rendered = 0;
    state2.done = false;
    list.innerHTML = "";
    if (!state2.episodes.length) {
      list.innerHTML = '<div class="empty">\u8BE5\u8BA2\u9605\u8FD8\u6CA1\u6709\u5267\u96C6\u7D22\u5F15\u3002\u70B9\u300C\u5237\u65B0\u300D\u6216\u300C\u7D22\u5F15\u5386\u53F2\u300D\u91CD\u65B0\u62C9\u53D6\u3002</div>';
      state2.busy = false;
      state2.done = true;
      paintPager(body);
      return;
    }
    const want = Math.max(EPISODE_PAGE_SIZE, target);
    while (state2.rendered < want && !state2.done) renderNextBatch(body);
    state2.busy = false;
    paintPager(body);
    requestAnimationFrame(() => {
      fillToScroll(body);
      if (preserve) list.scrollTop = scrollTop;
    });
  }
  async function openChannelDialog(subId) {
    if (!subId) return;
    state2 = emptyChannelState(subId);
    state2.busy = true;
    const body = document.createElement("div");
    body.className = "channel-dialog";
    body.innerHTML = `<div class="channel-dialog__head"><div class="channel-dialog__hero"><div class="channel-dialog__cover-wrap" id="channelHeroCover"></div><div class="channel-dialog__hero-text"><div class="channel-dialog__hero-title" id="channelHeroTitle"></div><div class="channel-dialog__hero-author muted" id="channelHeroAuthor" hidden></div><div class="channel-dialog__hero-count muted" id="channelHeroCount">\u5171 0 \u96C6</div></div></div><div class="channel-dialog__about"><div class="channel-dialog__desc" id="channelDesc" hidden></div><button type="button" class="channel-dialog__more" id="channelDescMore" aria-expanded="false" hidden>\u66F4\u591A</button><div class="channel-dialog__about-extra" id="channelAboutExtra" hidden><div class="channel-dialog__url-row"><code class="channel-dialog__url" id="channelUrl"></code><button type="button" class="btn btn--ghost btn--sm" id="channelCopyUrl" title="\u590D\u5236\u6E90\u5730\u5740"><span data-icon="copy" data-size="14"></span><span>\u590D\u5236</span></button></div><div class="channel-dialog__last-success muted" id="channelLastSuccess"></div></div></div><div class="channel-dialog__actions"><button type="button" class="chip-btn" id="channelRefresh" title="\u5237\u65B0\u8BE5\u9891\u9053\u6700\u8FD1\u8282\u76EE\u7684\u81EA\u52A8\u7D22\u5F15"><span data-icon="rotateCcw" data-size="14"></span><span data-refresh-label>\u5237\u65B0</span></button><button type="button" class="chip-btn" id="channelIndexHistory" title="\u6839\u636E\u8BE5\u9891\u9053\u6E90\u4E2D\u73B0\u6709\u6761\u76EE\u8865\u5EFA\u5386\u53F2\u7D22\u5F15\uFF0C\u4E0D\u4F1A\u627E\u56DE\u6E90\u91CC\u6CA1\u6709\u7684\u8282\u76EE"><span data-icon="history" data-size="14"></span><span data-index-label>\u7D22\u5F15\u5386\u53F2</span></button><button type="button" class="btn btn--tonal btn--sm" id="channelAddAll" title="\u5C06\u5F53\u524D\u5DF2\u7D22\u5F15\u5267\u96C6\u5168\u90E8\u8FFD\u52A0\u5230\u300C\u64AD\u5BA2\u300D\u5217\u8868\u672B\u5C3E">\u5168\u90E8\u52A0\u5165</button></div></div><div class="channel-addall-confirm" id="channelAddAllConfirm" hidden></div><div class="ep-list channel-dialog__list" id="channelEpList"></div><div class="channel-dialog__foot" hidden><div class="ep-batch-status muted" id="epBatchStatus" hidden></div><div class="channel-index-status muted" id="channelIndexStatus" hidden></div><button type="button" class="btn btn--ghost btn--sm" id="channelLoadMore" hidden>\u52A0\u8F7D\u66F4\u591A</button></div>`;
    const list = body.querySelector("#channelEpList");
    list.innerHTML = '<div class="empty">\u52A0\u8F7D\u4E2D\u2026</div>';
    hydrateIconSlots(body);
    const channelRefreshBtn = body.querySelector("#channelRefresh");
    const stopRefreshUi = onFeedRefreshState((busy) => applyRefreshButtonBusy(channelRefreshBtn, busy));
    paintHero(body);
    body.querySelector("#channelDescMore").addEventListener("click", () => {
      state2.aboutExpanded = !state2.aboutExpanded;
      paintHero(body);
    });
    body.querySelector("#channelCopyUrl").addEventListener("click", async () => {
      const ok = await copyText(String(state2.url || ""));
      if (ok) notify("\u5DF2\u590D\u5236\u6E90\u5730\u5740", "ok");
      else notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u5730\u5740\u590D\u5236", "warn");
    });
    openModal({
      title: "",
      body,
      size: "wide",
      actions: [],
      closeIcon: "arrowLeft",
      closeLabel: "\u8FD4\u56DE",
      closeLeading: true,
      onClose: () => {
        try {
          stopRefreshUi();
        } catch (_) {
        }
        resetChannelState();
      }
    });
    body.querySelector("#channelAddAll").addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      const count = state2.episodes.length;
      if (!count) {
        notify("\u6CA1\u6709\u53EF\u52A0\u5165\u7684\u5267\u96C6", "warn");
        return;
      }
      if (shouldConfirmAddAll(count)) {
        const accepted = await askAddAllConfirm(body, count, state2.historyIndexLimit || DEFAULT_HISTORY_INDEX_LIMIT);
        if (!accepted) {
          notify("\u5DF2\u53D6\u6D88\uFF0C\u672A\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u5217\u8868", "muted");
          return;
        }
      }
      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = "\u6B63\u5728\u52A0\u5165\u2026";
      try {
        const r = await api.queueAddShow(subId);
        notify(r.ok ? `\u5DF2\u8FFD\u52A0 ${r.added} \u9996\u5230\u300C\u64AD\u5BA2\u300D\u5217\u8868\u672B\u5C3E` : r.error || "\u52A0\u5165\u5931\u8D25", r.ok ? "ok" : "err");
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    });
    channelRefreshBtn.addEventListener("click", async () => {
      if (isFeedRefreshing()) return;
      const prevTotal = state2.total;
      const prevTop = episodeFingerprint(state2.episodes[0]);
      try {
        const r = await runFeedRefreshOne({
          refreshOne: () => api.refreshOne(subId),
          afterRefresh: async (result) => {
            if (!result || result.noop) return;
            if (!result.ok && (result.skipped || isSkippedBusy(result))) {
              notify(REFRESH_BUSY_TOAST, "warn");
              await trackRemoteRefreshBusy(api);
              return;
            }
            await loadEpisodes(body, subId, { preserve: true });
            if (result.ok) {
              const unchanged = state2.total === prevTotal && episodeFingerprint(state2.episodes[0]) === prevTop;
              notify(unchanged ? REFRESH_UP_TO_DATE_TOAST : "\u5DF2\u5237\u65B0\u8BE5\u9891\u9053", unchanged ? "muted" : "ok");
            } else {
              notify(humanizeRefreshFailure(result), "err");
            }
          }
        });
        if (r && r.noop) return;
      } catch (e) {
        if (isSkippedBusy(e)) {
          notify(REFRESH_BUSY_TOAST, "warn");
          void trackRemoteRefreshBusy(api);
          return;
        }
        notify(humanizeRefreshFailure(e), "err");
        await loadEpisodes(body, subId, { preserve: true });
      }
    });
    body.querySelector("#channelIndexHistory").addEventListener("click", async () => {
      state2.historyIndexStatus = "running";
      state2.historyIndexError = null;
      paintIndexStatus(body);
      notify("\u6B63\u5728\u7D22\u5F15\u8BE5\u9891\u9053\u7684\u5386\u53F2\u8282\u76EE\u2026", "muted");
      try {
        const r = await api.indexHistory(subId);
        if (r && r.alreadyRunning) {
          state2.historyIndexStatus = "running";
          notify("\u8BE5\u9891\u9053\u6B63\u5728\u7D22\u5F15\uFF0C\u8BF7\u7A0D\u5019", "warn");
          paintIndexStatus(body);
          return;
        }
        if (!r || !r.ok) {
          state2.historyIndexStatus = "error";
          state2.historyIndexError = r && (r.error || r.historyIndexError) || "\u7D22\u5F15\u5931\u8D25";
          paintIndexStatus(body);
          notify(state2.historyIndexError, "err");
          return;
        }
        state2.historyIndexStatus = "success";
        state2.feedEpisodeCount = Number(r.feedAvailableCount) || 0;
        state2.capped = !!r.capped;
        state2.truncated = !!r.truncated;
        state2.earliestConfirmed = !!r.earliestConfirmed;
        state2.historyIndexLimit = Number(r.cap || r.historyIndexLimit) || DEFAULT_HISTORY_INDEX_LIMIT;
        const copy = historyIndexCopy({
          status: "success",
          indexedCount: r.indexedCount,
          feedAvailableCount: r.feedAvailableCount,
          capped: r.capped,
          cap: state2.historyIndexLimit,
          earliestConfirmed: state2.earliestConfirmed,
          earliestKept: state2.earliestConfirmed
        });
        notify(copy.text || HISTORY_INDEX_COMPLETE_TOAST, copy.text ? "ok" : "muted");
        await loadEpisodes(body, subId, { preserve: true });
      } catch (e) {
        state2.historyIndexStatus = "error";
        state2.historyIndexError = String(e);
        paintIndexStatus(body);
        notify(String(e), "err");
      }
    });
    body.querySelector("#channelLoadMore").addEventListener("click", () => {
      if (state2.busy || state2.done) return;
      renderNextBatch(body);
    });
    list.addEventListener(
      "scroll",
      () => {
        if (state2.done || state2.busy) return;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 120) {
          renderNextBatch(body);
        }
      },
      { passive: true }
    );
    await loadEpisodes(body, subId);
  }

  // ui/views/row-events.js
  async function defaultPlayToggle(ep, row, items, opts = {}) {
    const snap = get();
    const songId = episodeSongId(ep);
    const isCurrent = songId != null && snap.current && snap.current.songId === songId;
    const playOpts = { fromWaitlist: !!opts.fromWaitlist };
    if (isCurrent && snap.phase === "playing") {
      try {
        await pause();
        await flushProgress();
      } catch (e) {
        notify(String(e), "err");
      }
      return;
    }
    if (songId != null) {
      await playEpisode({ ...episodePayload(ep), songId, showTitle: ep.showTitle }, playOpts);
    } else {
      await playEpisode(episodePayload(ep), playOpts);
    }
  }
  function bindRowInteractions(box, items, handlers = {}) {
    if (!box) return;
    const playOpts = handlers.playOpts || {};
    box.querySelectorAll("[data-title-tap]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-idx"));
      const ep = items[idx];
      if (!ep) return;
      btn.addEventListener("click", () => openShowNote(ep, playOpts));
      btn.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openShowNote(ep, playOpts);
        }
      });
    });
    box.querySelectorAll("[data-channel-tap]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-idx"));
      const ep = items[idx];
      if (!ep) return;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (handlers.channel) return handlers.channel(ep, idx, btn);
        if (ep.subscriptionId) openChannelDialog(ep.subscriptionId);
      });
    });
    box.querySelectorAll("[data-play-btn]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-idx"));
      const ep = items[idx];
      if (!ep) return;
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (handlers.play) return handlers.play(ep, idx, btn);
        await defaultPlayToggle(ep, btn.closest("[data-row]"), items, playOpts);
      });
    });
    box.querySelectorAll("[data-act]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-idx"));
      const act = btn.getAttribute("data-act");
      const ep = items[idx];
      if (!ep) return;
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        closePopovers();
        if (handlers[act]) return handlers[act](ep, idx, btn);
        if (act === "queue") await addToQueue(ep, btn);
        else if (act === "fav") await toggleFavorite(ep, btn);
      });
    });
    box.querySelectorAll("[data-more-toggle]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        togglePopover(btn.closest(".more-wrap"));
      });
    });
    box.querySelectorAll("[data-more-act]").forEach((btn) => {
      const act = btn.getAttribute("data-more-act");
      const idx = Number(btn.getAttribute("data-idx"));
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (handlers[act]) {
          const ep2 = Number.isFinite(idx) ? items[idx] : null;
          return handlers[act](ep2, idx, btn);
        }
        const ep = Number.isFinite(idx) ? items[idx] : null;
        closePopovers();
        if (!ep) return;
        if (act === "queue") await addToQueue(ep, btn);
        else if (act === "cast") await castToSpeaker(ep.songId, { prepareIfMissing: ep });
        else if (act === "fav") await toggleFavorite(ep, null);
      });
    });
  }

  // ui/views/recent.js
  function recentListSignature(items) {
    if (!Array.isArray(items) || !items.length) return "empty";
    return items.map((ep) => {
      const prog = ep && ep.progress || {};
      return [
        ep && ep.feedUrl || "",
        ep && ep.guid || "",
        ep && ep.title || "",
        ep && ep.favorited ? "1" : "0",
        ep && ep.coverUrl || "",
        prog.completed ? "1" : "0",
        prog.positionSec || 0,
        ep && (ep.pubDateMs || ep.pubDate) || ""
      ].join("	");
    }).join("\n");
  }
  function actionsFor(ep, idx, index) {
    const queueState = queueButtonState(ep, index);
    return moreMenuHtml(
      [
        {
          key: "queue",
          label: queueState.label,
          iconName: queueState.iconName,
          attrs: queueMenuAttrs(ep, index, idx)
        },
        { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` }
      ],
      "recent-" + idx
    );
  }
  function renderRecent() {
    const box = $("recentList");
    if (!box) return;
    const items = getData().recent || [];
    const sig = recentListSignature(items);
    if (box.dataset.renderSig === sig) return;
    box.dataset.renderSig = sig;
    box.classList.remove("is-skeleton");
    if (!items.length) {
      if (box.dataset.bootPending === "1") return;
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u66F4\u65B0\u3002\u5148\u5728\u300C\u8BA2\u9605\u300D\u91CC\u6DFB\u52A0\u9891\u9053\u3002</div>';
      return;
    }
    delete box.dataset.bootPending;
    const queueIndex = buildQueueIndex(getData().queueSongs);
    const groups = /* @__PURE__ */ new Map();
    items.forEach((ep, idx) => {
      const ms = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : 0);
      const key = dateGroupKey(ms);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ep, idx });
    });
    box.innerHTML = Array.from(groups.entries()).map(([label, rows]) => {
      const cards = rows.map(({ ep, idx }) => {
        const queueState = queueButtonState(ep, queueIndex);
        return episodeRowHtml(ep, idx, {
          showDate: false,
          channelLink: true,
          actions: [
            {
              act: "queue",
              iconName: queueState.iconName,
              title: queueState.label,
              cls: queueState.inQueue ? "is-in-queue" : "",
              attrs: queueButtonAttrs(ep, queueIndex)
            },
            {
              act: "fav",
              iconName: "star",
              title: "\u6536\u85CF",
              cls: "icon-btn--star",
              attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`
            }
          ],
          moreHtml: actionsFor(ep, idx, queueIndex)
        });
      }).join("");
      return `<div class="date-group"><div class="date-label">${escapeHtml(label)}</div>` + cards + `</div>`;
    }).join("");
    bindRowInteractions(box, items);
  }
  var unbindQueueRepaint = null;
  function bindRecentQueueState() {
    if (unbindQueueRepaint) return;
    unbindQueueRepaint = onQueueChange((index) => {
      const box = $("recentList");
      if (!box) return;
      repaintQueueButtons(box, index);
    });
  }
  function requestFeedRefresh({ quietBusy = false } = {}) {
    if (isFeedRefreshing()) return Promise.resolve({ noop: true });
    return runFeedRefresh({
      refreshAll: () => wrapRefreshCall(() => api.refreshAll()),
      afterRefresh: async (r) => {
        if (!r || r.noop) return;
        if (!r.ok && (r.skipped || isSkippedBusy(r))) {
          if (!quietBusy) notify(REFRESH_BUSY_TOAST, "warn");
          await trackRemoteRefreshBusy(api);
          return;
        }
        if (r.started) {
          const wait = await waitUntilFeedRefreshIdle(api);
          if (wait.timedOut) {
            if (!quietBusy) notify(REFRESH_STILL_RUNNING_TOAST, "warn");
            return;
          }
        }
        await reloadRecent();
        await reloadSubs();
        markFeedSynced();
        if (!quietBusy && r.ok === false && !r.started && !isSkippedBusy(r)) {
          notify(humanizeRefreshFailure(r, "\u90E8\u5206\u5237\u65B0\u5931\u8D25"), "warn");
        }
      }
    });
  }
  function bindRecentToolbar() {
    const btn = $("btnRecentRefresh");
    const hint = $("recentRefreshHint");
    if (!btn) return;
    onFeedRefreshState((busy) => {
      applyRefreshButtonBusy(btn, busy);
      applyRefreshHint(hint, busy);
    });
    btn.addEventListener("click", async () => {
      if (isFeedRefreshing()) return;
      try {
        const r = await requestFeedRefresh({ quietBusy: false });
        if (r && r.noop) return;
        renderRecent();
      } catch (e) {
        if (isSkippedBusy(e)) {
          notify(REFRESH_BUSY_TOAST, "warn");
          void trackRemoteRefreshBusy(api);
          return;
        }
        notify(humanizeRefreshFailure(e), "err");
      }
    });
  }

  // ui/views/favorites.js
  var query = "";
  function filtered(items) {
    if (!query.trim()) return items;
    return items.filter(
      (ep) => matchesQuery(ep.title, query) || matchesQuery(ep.showTitle, query)
    );
  }
  function renderFavorites() {
    const box = $("favList");
    if (!box) return;
    const all = getData().favorites || [];
    if (!all.length) {
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u6536\u85CF\u3002\u5728\u300C\u66F4\u65B0\u300D\u91CC\u70B9\u661F\u6807\u5373\u53EF\u3002</div>';
      syncClearButton();
      return;
    }
    const items = filtered(all);
    if (!items.length) {
      box.innerHTML = `<div class="empty">\u6CA1\u6709\u5339\u914D\u300C${escapeHtml(query)}\u300D\u7684\u6536\u85CF\u3002</div>`;
      syncClearButton();
      return;
    }
    const queueIndex = buildQueueIndex(getData().queueSongs);
    box.innerHTML = items.map((ep, idx) => {
      const queueState = queueButtonState(ep, queueIndex);
      const more = moreMenuHtml(
        [
          {
            key: "queue",
            label: queueState.label,
            iconName: queueState.iconName,
            attrs: queueMenuAttrs(ep, queueIndex, idx)
          },
          { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` },
          { key: "unfav", label: "\u53D6\u6D88\u6536\u85CF", iconName: "star", danger: true, attrs: `data-idx="${idx}"` }
        ],
        "fav-" + idx
      );
      return episodeRowHtml(ep, idx, {
        showDate: false,
        channelLink: true,
        actions: [
          {
            act: "queue",
            iconName: queueState.iconName,
            title: queueState.label,
            cls: queueState.inQueue ? "is-in-queue" : "",
            attrs: queueButtonAttrs(ep, queueIndex)
          }
        ],
        moreHtml: more
      });
    }).join("");
    bindRowInteractions(box, items, {
      unfav: async (ep) => {
        await toggleFavorite({ ...ep, favorited: true }, null);
        await reloadFavorites();
        renderFavorites();
      }
    });
    syncClearButton();
  }
  function syncClearButton() {
    const clear = $("favSearchClear");
    if (clear) clear.classList.toggle("hidden", !query.trim());
  }
  var unbindQueueRepaint2 = null;
  function bindFavoritesQueueState() {
    if (unbindQueueRepaint2) return;
    unbindQueueRepaint2 = onQueueChange((index) => {
      const box = $("favList");
      if (!box) return;
      repaintQueueButtons(box, index);
    });
  }
  function bindFavoritesToolbar() {
    const input = $("favSearch");
    const clear = $("favSearchClear");
    if (!input) return;
    input.addEventListener("input", () => {
      query = input.value;
      renderFavorites();
    });
    if (clear) {
      clear.addEventListener("click", () => {
        query = "";
        input.value = "";
        renderFavorites();
        input.focus();
      });
    }
  }

  // ui/lib/addSubForm.js
  function resetOpmlImport(els = {}, pending = null) {
    if (pending && typeof pending === "object") pending.opmlText = null;
    if (els.opmlText) els.opmlText.value = "";
    if (els.opmlFile) els.opmlFile.value = "";
    if (els.opmlSummary) els.opmlSummary.textContent = "";
    if (els.importBtn) els.importBtn.disabled = true;
    return { reset: true };
  }
  function closeAddSubForm(els = {}, pending = null) {
    resetOpmlImport(els, pending);
    if (els.feedUrl) els.feedUrl.value = "";
    const card = els.card;
    if (card) {
      if (typeof card.setAttribute === "function") card.setAttribute("hidden", "");
      if (card.classList && typeof card.classList.toggle === "function") {
        card.classList.toggle("hidden", true);
      }
    }
    return { closed: true };
  }

  // ui/views/subs.js
  var subQuery = "";
  var pendingState = { opmlText: null };
  var selectState = { mode: false, keys: /* @__PURE__ */ new Set() };
  function syncSubsSelectUi() {
    const bar = $("subsSelectBar");
    const del2 = $("btnSubsDeleteSelected");
    const count = $("subsSelectCount");
    const toggle = $("btnSubsSelect");
    setHidden(bar, !selectState.mode);
    if (del2) del2.disabled = selectState.keys.size === 0;
    if (count) {
      count.textContent = selectState.mode ? selectState.keys.size ? `\u5DF2\u9009 ${selectState.keys.size} \u4E2A` : "\u70B9\u9009\u8BA2\u9605" : "";
    }
    if (toggle) {
      toggle.classList.toggle("is-on", selectState.mode);
      toggle.setAttribute("aria-pressed", selectState.mode ? "true" : "false");
      toggle.title = selectState.mode ? "\u9000\u51FA\u591A\u9009" : "\u591A\u9009";
      setButtonIcon(toggle, "listChecks", 16);
    }
  }
  function setSubsSelectMode(on) {
    selectState.mode = !!on;
    if (!on) selectState.keys.clear();
    syncSubsSelectUi();
    renderSubs();
  }
  function subCoverHtml(sub) {
    const abs = absoluteCoverUrl(sub.coverUrl);
    if (abs) {
      return `<img class="sub-card__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
    }
    const letter = String(sub.title || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="sub-card__cover cover-ph" style="background:${colorFromString(sub.title || "")}">${escapeHtml(letter)}</div>`;
  }
  function renderSubs() {
    const box = $("subList");
    if (!box) return;
    const all = getData().subs || [];
    if (!all.length) {
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u8BA2\u9605\u3002\u70B9\u53F3\u4E0A\u89D2\u300C+\u300D\u7C98\u8D34 RSS URL \u6216\u5BFC\u5165 OPML\u3002</div>';
      syncSubClear();
      syncSubsSelectUi();
      return;
    }
    const list = subQuery.trim() ? all.filter((s) => matchesQuery(s.title, subQuery) || matchesQuery(s.url, subQuery)) : all;
    if (!list.length) {
      box.innerHTML = `<div class="empty">\u6CA1\u6709\u5339\u914D\u300C${escapeHtml(subQuery)}\u300D\u7684\u9891\u9053\u3002</div>`;
      syncSubClear();
      syncSubsSelectUi();
      return;
    }
    box.innerHTML = list.map((s, idx) => {
      const selected = selectState.keys.has(s.id);
      const lead = selectState.mode ? `<input type="checkbox" class="sel-box" data-sel-key="${escapeHtml(s.id)}" ${selected ? "checked" : ""} aria-label="\u9009\u62E9\u8BA2\u9605" />` : "";
      const author = typeof s.author === "string" ? s.author.trim() : "";
      const authorHtml = author ? `<div class="sub-card__author">${escapeHtml(author)}</div>` : "";
      const more = selectState.mode ? "" : moreMenuHtml(
        [
          {
            key: "refresh",
            label: isFeedRefreshing() ? REFRESH_MENU_BUSY_LABEL : REFRESH_MENU_IDLE_LABEL,
            iconName: "rotateCcw",
            attrs: `data-idx="${idx}"`
          },
          {
            key: "index-history",
            label: "\u7D22\u5F15\u5386\u53F2",
            iconName: "history",
            attrs: `data-idx="${idx}"`
          },
          {
            key: "copy-url",
            label: "\u590D\u5236\u6E90\u5730\u5740",
            iconName: "copy",
            attrs: `data-idx="${idx}"`
          },
          {
            key: "delete",
            label: "\u53D6\u6D88\u8BA2\u9605",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`
          }
        ],
        "sub-" + s.id
      );
      return `<div class="sub-card${selectState.mode ? " select-mode" : ""}${selected ? " is-selected" : ""}" data-sub-card data-sub-id="${escapeHtml(s.id)}" data-idx="${idx}" role="button" tabindex="0">` + lead + subCoverHtml(s) + `<div class="sub-card__body"><div class="sub-card__title">${escapeHtml(s.title || s.url)}</div>` + authorHtml + `</div>` + more + `</div>`;
    }).join("");
    if (selectState.mode) {
      box.querySelectorAll("input[data-sel-key]").forEach((input) => {
        input.addEventListener("click", (ev) => ev.stopPropagation());
        input.addEventListener("change", () => {
          const key = input.getAttribute("data-sel-key");
          if (!key) return;
          if (input.checked) selectState.keys.add(key);
          else selectState.keys.delete(key);
          const card = input.closest(".sub-card");
          if (card) card.classList.toggle("is-selected", input.checked);
          syncSubsSelectUi();
        });
      });
      box.querySelectorAll("[data-sub-card]").forEach((card) => {
        card.addEventListener("click", (ev) => {
          if (ev.target instanceof Element && ev.target.closest("input")) return;
          const input = card.querySelector("input[data-sel-key]");
          if (!input) return;
          input.checked = !input.checked;
          const key = input.getAttribute("data-sel-key");
          if (!key) return;
          if (input.checked) selectState.keys.add(key);
          else selectState.keys.delete(key);
          card.classList.toggle("is-selected", input.checked);
          syncSubsSelectUi();
        });
      });
      syncSubClear();
      syncSubsSelectUi();
      return;
    }
    box.querySelectorAll(".sub-card").forEach((card) => {
      const idx = Number(card.getAttribute("data-idx"));
      const sub = list[idx];
      if (!sub) return;
      const open = () => {
        void openEpisodes(sub.id);
      };
      card.addEventListener("click", (ev) => {
        if (ev.target instanceof Element && ev.target.closest(".more-wrap, input")) return;
        open();
      });
      card.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        if (ev.target instanceof Element && ev.target.closest(".more-wrap, input")) return;
        ev.preventDefault();
        open();
      });
      card.querySelectorAll("[data-more-toggle]").forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          togglePopover(btn.closest(".more-wrap"));
        });
      });
      card.querySelectorAll("[data-more-act]").forEach((btn) => {
        const act = btn.getAttribute("data-more-act");
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          closePopovers();
          if (act === "refresh") {
            if (isFeedRefreshing()) return;
            try {
              const r = await runFeedRefreshOne({
                refreshOne: () => api.refreshOne(sub.id),
                afterRefresh: async (result) => {
                  if (!result || result.noop) return;
                  if (!result.ok && (result.skipped || isSkippedBusy(result))) {
                    notify(REFRESH_BUSY_TOAST, "warn");
                    await trackRemoteRefreshBusy(api);
                    return;
                  }
                  if (result.ok) {
                    notify("\u5DF2\u5237\u65B0\uFF08\u672A\u6539\u64AD\u653E\u5217\u8868\uFF09", "ok");
                    await reloadSubs();
                    renderSubs();
                  } else {
                    notify(humanizeRefreshFailure(result), "err");
                  }
                }
              });
              if (r && r.noop) return;
            } catch (e) {
              if (isSkippedBusy(e)) {
                notify(REFRESH_BUSY_TOAST, "warn");
                void trackRemoteRefreshBusy(api);
                return;
              }
              notify(humanizeRefreshFailure(e), "err");
            }
          } else if (act === "index-history") {
            btn.disabled = true;
            try {
              notify("\u6B63\u5728\u7D22\u5F15\u8BE5\u9891\u9053\u7684\u5386\u53F2\u8282\u76EE\u2026", "muted");
              const r = await api.indexHistory(sub.id);
              if (r && r.alreadyRunning) {
                notify("\u8BE5\u9891\u9053\u6B63\u5728\u7D22\u5F15\uFF0C\u8BF7\u7A0D\u5019", "warn");
                return;
              }
              if (!r || !r.ok) {
                notify(r && (r.error || r.historyIndexError) || "\u7D22\u5F15\u5931\u8D25", "err");
                return;
              }
              notify("\u5DF2\u6309\u6E90\u91CC\u73B0\u6709\u8282\u76EE\u6536\u5F55\uFF0C\u66F4\u65E9\u7684\u65E0\u6CD5\u627E\u56DE\u3002", "ok");
              await reloadSubs();
              renderSubs();
            } catch (e) {
              notify(String(e), "err");
            } finally {
              btn.disabled = false;
            }
          } else if (act === "copy-url") {
            const ok = await copyText(String(sub.url || ""));
            if (ok) notify("\u5DF2\u590D\u5236\u6E90\u5730\u5740", "ok");
            else notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u5730\u5740\u590D\u5236", "warn");
          } else if (act === "delete") {
            const ok = await uiConfirm({
              title: "\u53D6\u6D88\u8BA2\u9605",
              message: "\u53D6\u6D88\u540E\u8BE5\u9891\u9053\u5C06\u4ECE\u8BA2\u9605\u5217\u8868\u79FB\u9664\u3002\u64AD\u653E\u5217\u8868\u4E0E\u8FDB\u5EA6\u4E0D\u4F1A\u81EA\u52A8\u6E05\u9664\u3002",
              okText: "\u53D6\u6D88\u8BA2\u9605",
              danger: true
            });
            if (!ok) return;
            await api.deleteSubscription(sub.id);
            notify("\u5DF2\u53D6\u6D88\u8BA2\u9605", "ok");
            await reloadSubs();
            renderSubs();
          }
        });
      });
    });
    syncSubClear();
    syncSubsSelectUi();
  }
  function syncSubClear() {
    const clear = $("subSearchClear");
    if (clear) clear.classList.toggle("hidden", !subQuery.trim());
  }
  async function openEpisodes(id) {
    await openChannelDialog(id);
  }
  function bindSubsToolbar() {
    onFeedRefreshState((busy) => {
      applyRefreshMenuBusy(document.getElementById("subList") || document, busy);
    });
    const input = $("subSearch");
    const clear = $("subSearchClear");
    if (input) {
      input.addEventListener("input", () => {
        subQuery = input.value;
        renderSubs();
      });
    }
    if (clear) {
      clear.addEventListener("click", () => {
        subQuery = "";
        if (input) input.value = "";
        renderSubs();
        if (input) input.focus();
      });
    }
    const selectBtn = $("btnSubsSelect");
    if (selectBtn) {
      selectBtn.addEventListener("click", () => setSubsSelectMode(!selectState.mode));
    }
    const selectCancel = $("btnSubsSelectCancel");
    if (selectCancel) {
      selectCancel.addEventListener("click", () => setSubsSelectMode(false));
    }
    const deleteSelected = $("btnSubsDeleteSelected");
    if (deleteSelected) {
      deleteSelected.addEventListener("click", async () => {
        const ids = Array.from(selectState.keys);
        if (!ids.length) return;
        const ok = await uiConfirm({
          title: "\u5220\u9664\u6240\u9009\u8BA2\u9605",
          message: `\u5220\u9664\u9009\u4E2D\u7684 ${ids.length} \u4E2A\u8BA2\u9605\u7BA1\u7406\u9879\uFF1F\u64AD\u653E\u5217\u8868\u4E0E\u8FDB\u5EA6\u4E0D\u4F1A\u81EA\u52A8\u6E05\u9664\u3002`,
          okText: "\u5220\u9664",
          danger: true
        });
        if (!ok) return;
        deleteSelected.disabled = true;
        try {
          const r = await api.batchDeleteSubscriptions(ids);
          if (!r.ok) {
            notify(r.error || "\u5220\u9664\u5931\u8D25", "err");
            return;
          }
          notify(r.tip || `\u5DF2\u5220\u9664 ${r.removedCount || ids.length} \u6761\u8BA2\u9605`, "ok");
          selectState.keys.clear();
          setSubsSelectMode(false);
          await reloadSubs();
          renderSubs();
        } catch (e) {
          notify(String(e), "err");
        } finally {
          syncSubsSelectUi();
        }
      });
    }
    const btnExport = $("btnOpmlExport");
    if (btnExport) btnExport.addEventListener("click", exportOpml);
    const btnOpenAdd = $("btnOpenAddSub");
    const addCard = $("addSubCard");
    function closeAddSubCard() {
      closeAddSubForm(
        {
          card: addCard,
          feedUrl: $("feedUrl"),
          opmlText: $("opmlText"),
          opmlFile: $("opmlFile"),
          opmlSummary: $("opmlSummary"),
          importBtn: $("btnOpmlImport")
        },
        pendingState
      );
    }
    if (btnOpenAdd && addCard) {
      btnOpenAdd.addEventListener("click", () => {
        setHidden(addCard, false);
        const field = $("feedUrl");
        if (field) field.focus();
      });
    }
    const btnCloseAdd = $("btnCloseAddSub");
    if (btnCloseAdd && addCard) {
      btnCloseAdd.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        closeAddSubCard();
      });
    }
    const btnCancelAdd = $("btnCancelAddSub");
    if (btnCancelAdd && addCard) {
      btnCancelAdd.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        closeAddSubCard();
      });
    }
    const btnAdd = $("btnAdd");
    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const url = ($("feedUrl").value || "").trim();
        if (!url) {
          notify("\u8BF7\u586B\u5199 RSS URL", "warn");
          return;
        }
        btnAdd.disabled = true;
        try {
          const r = await api.addSubscription(url);
          if (!r.ok) notify(r.error || "\u6DFB\u52A0\u5931\u8D25", "err");
          else {
            notify(r.already ? "\u5DF2\u5B58\u5728\uFF0C\u5DF2\u5237\u65B0\u7D22\u5F15" : "\u5DF2\u6DFB\u52A0\u5E76\u62C9\u53D6\u7D22\u5F15", "ok");
            $("feedUrl").value = "";
            closeAddSubCard();
            await reloadSubs();
            await renderSubs();
          }
        } catch (e) {
          notify(String(e), "err");
        } finally {
          btnAdd.disabled = false;
        }
      });
    }
    bindOpmlControls({ closeAddSubCard });
  }
  function bindOpmlControls(hooks = {}) {
    const closeAddSubCard = typeof hooks.closeAddSubCard === "function" ? hooks.closeAddSubCard : null;
    const file = $("opmlFile");
    if (file) {
      file.addEventListener("change", async () => {
        const f = file.files && file.files[0];
        if (!f) return;
        $("opmlText").value = await f.text();
      });
    }
    const preview = $("btnOpmlPreview");
    if (preview) {
      preview.addEventListener("click", async () => {
        const text = $("opmlText").value;
        if (!text.trim()) {
          notify("\u9700\u8981 OPML \u6587\u672C", "warn");
          return;
        }
        try {
          const r = await api.opmlPreview(text);
          if (!r.ok) {
            notify(r.error || "\u9884\u89C8\u5931\u8D25", "err");
            pendingState.opmlText = null;
            $("btnOpmlImport").disabled = true;
            return;
          }
          pendingState.opmlText = text;
          $("btnOpmlImport").disabled = false;
          const s = r.summary || {};
          $("opmlSummary").textContent = `\u65B0\u589E ${s.neu ?? s.new ?? 0} \xB7 \u91CD\u590D ${s.duplicate ?? 0} \xB7 \u65E0\u6548 ${s.invalid ?? 0}`;
          notify("\u9884\u89C8\u5B8C\u6210\uFF0C\u786E\u8BA4\u540E\u624D\u4F1A\u5199\u5165", "ok");
        } catch (e) {
          notify(String(e), "err");
        }
      });
    }
    const imp = $("btnOpmlImport");
    if (imp) {
      imp.addEventListener("click", async () => {
        if (!pendingState.opmlText) return;
        imp.disabled = true;
        try {
          const r = await api.opmlImport(pendingState.opmlText);
          if (!r.ok) notify(r.error || "\u5BFC\u5165\u5931\u8D25", "err");
          else {
            notify(r.tip || "\u5BFC\u5165\u5B8C\u6210", "ok");
            pendingState.opmlText = null;
            if (closeAddSubCard) closeAddSubCard();
            await reloadSubs();
            renderSubs();
          }
        } catch (e) {
          notify(String(e), "err");
        } finally {
          if (pendingState.opmlText) imp.disabled = false;
        }
      });
    }
    const cancel = $("btnOpmlCancel");
    if (cancel) {
      cancel.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        resetOpmlImport(
          {
            opmlText: $("opmlText"),
            opmlFile: $("opmlFile"),
            opmlSummary: $("opmlSummary"),
            importBtn: $("btnOpmlImport")
          },
          pendingState
        );
      });
    }
  }
  async function exportOpml() {
    try {
      const r = await api.opmlExport();
      if (!r || !r.ok) {
        notify(r && r.error || "\u5BFC\u51FA\u5931\u8D25", "err");
        return;
      }
      if (!r.count) {
        notify("\u8FD8\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u8BA2\u9605", "warn");
        return;
      }
      let downloaded = false;
      try {
        const blob = new Blob([r.opml], { type: "text/x-opml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.filename || "podcasts.opml";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.remove();
        }, 2e3);
        downloaded = true;
      } catch (_) {
        downloaded = false;
      }
      if (downloaded) {
        notify(`\u5DF2\u5BFC\u51FA ${r.count} \u4E2A\u8BA2\u9605`, "ok");
        return;
      }
      const ta = document.createElement("div");
      ta.innerHTML = `<p class="muted">\u5F53\u524D\u73AF\u5883\u53EF\u80FD\u963B\u6B62\u4E0B\u8F7D\uFF0C\u53EF\u590D\u5236\u4E0B\u9762\u7684\u5185\u5BB9\u4FDD\u5B58\u4E3A <code>${escapeHtml(
        r.filename || "podcasts.opml"
      )}</code>\u3002</p><textarea id="opmlExportText" readonly style="min-height:220px"></textarea>`;
      const dlg = openModal({
        title: "\u5BFC\u51FA OPML",
        body: ta,
        size: "wide",
        actions: [
          {
            label: "\u590D\u5236",
            kind: "primary",
            iconName: "copy",
            close: false,
            onClick: async () => {
              const area2 = document.getElementById("opmlExportText");
              if (!area2) return false;
              area2.select();
              const ok = await copyText(area2.value);
              if (ok) notify("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F", "ok");
              else notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u590D\u5236", "warn");
              return false;
            }
          },
          { label: "\u5173\u95ED", kind: "ghost", close: true }
        ]
      });
      const area = document.getElementById("opmlExportText");
      if (area) area.value = r.opml;
      await dlg;
    } catch (e) {
      notify(String(e), "err");
    }
  }

  // ui/lib/queueDrag.js
  var FRONT_LOCKED_LABEL = "\u6B63\u5728\u64AD\u653E\uFF0C\u4E0D\u80FD\u62D6\u52A8\u6392\u5E8F";
  var FRONT_CLAMPED_PLAYING = "\u6B63\u5728\u64AD\u653E\uFF0C\u5DF2\u6392\u5230\u4E0B\u4E00\u9996\u3002";
  var FRONT_CLAMPED_PAUSED = "\u5F53\u524D\u4E00\u96C6\u4ECD\u5728\u7B2C\u4E00\u4F4D\uFF0C\u5DF2\u6392\u5230\u4E0B\u4E00\u9996\u3002";
  var FRONT_MOVED_TO_FIRST = "\u5DF2\u6392\u5230\u7B2C\u4E00\u4F4D";
  function createFrontClampHint() {
    let hinted = false;
    return {
      /** @returns {string|null} */
      take(clamped, phase) {
        if (!clamped || hinted) return null;
        hinted = true;
        return phase === "paused" ? FRONT_CLAMPED_PAUSED : FRONT_CLAMPED_PLAYING;
      },
      wasShown() {
        return hinted;
      },
      reset() {
        hinted = false;
      }
    };
  }
  function resolvePlayheadLock({
    songIds,
    currentSongId: currentSongId2,
    phase,
    podcastPlaylistId,
    sourcePlaylistId
  } = {}) {
    const ids = (Array.isArray(songIds) ? songIds : []).map(Number).filter(Number.isFinite);
    const cur = Number(currentSongId2);
    const ph = phase || null;
    if (ph !== "playing" && ph !== "paused") {
      return { lockedSongId: null, needsRepair: false, phase: ph };
    }
    if (!Number.isFinite(cur) || cur <= 0) {
      return { lockedSongId: null, needsRepair: false, phase: ph };
    }
    const want = Number(podcastPlaylistId);
    const have = Number(sourcePlaylistId);
    if (!Number.isFinite(want) || want <= 0) {
      return { lockedSongId: null, needsRepair: false, phase: ph };
    }
    if (!Number.isFinite(have) || have !== want) {
      return { lockedSongId: null, needsRepair: false, phase: ph };
    }
    const idx = ids.indexOf(cur);
    if (idx < 0) {
      return { lockedSongId: null, needsRepair: false, phase: ph };
    }
    return { lockedSongId: cur, needsRepair: idx !== 0, phase: ph };
  }
  function planPinSongToFront(ids, songId) {
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
    const id = Number(songId);
    const from = list.indexOf(id);
    if (from < 0 || from === 0) return null;
    const next = list.slice();
    next.splice(from, 1);
    next.unshift(id);
    return next;
  }
  function normalizeLockedId(lockedSongId) {
    const locked = Number(lockedSongId);
    return Number.isFinite(locked) && locked > 0 ? locked : null;
  }
  function canDragQueueRow(fromId, lockedSongId) {
    const from = Number(fromId);
    if (!Number.isFinite(from)) return false;
    const locked = normalizeLockedId(lockedSongId);
    return !(locked && from === locked);
  }
  function planReorderResult(ids, fromId, toId, lockedSongId) {
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
    const from = Number(fromId);
    const to = Number(toId);
    const locked = normalizeLockedId(lockedSongId);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      return { next: null, clampedToNext: false, blocked: false };
    }
    if (locked && from === locked) {
      return { next: null, clampedToNext: false, blocked: true };
    }
    const fromIndex = list.indexOf(from);
    if (fromIndex < 0 || list.indexOf(to) < 0) {
      return { next: null, clampedToNext: false, blocked: false };
    }
    const next = list.slice();
    const [moved] = next.splice(fromIndex, 1);
    let insertAt = next.indexOf(to);
    if (insertAt < 0) return { next: null, clampedToNext: false, blocked: false };
    let clampedToNext = false;
    if (locked) {
      if (to === locked) {
        insertAt = Math.min(Math.max(1, next.indexOf(locked) + 1), next.length);
        clampedToNext = true;
      }
      if (insertAt < 1) {
        insertAt = Math.min(1, next.length);
        clampedToNext = true;
      }
    }
    next.splice(insertAt, 0, moved);
    if (next.length === list.length && next.every((id, i) => id === list[i])) {
      return { next: null, clampedToNext, blocked: false };
    }
    return { next, clampedToNext, blocked: false };
  }
  function useHtml5RowDrag({ pointerFine = false, mobile = false } = {}) {
    return !!pointerFine && !mobile;
  }
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function rowSlotsFromBoxes(boxes) {
    const list = (Array.isArray(boxes) ? boxes : []).map((b) => ({
      id: Number(b && b.id),
      top: Number(b && b.top),
      bottom: Number(b && b.bottom)
    })).filter((b) => Number.isFinite(b.id) && Number.isFinite(b.top) && Number.isFinite(b.bottom));
    return list.map((b, i) => {
      const height = b.bottom - b.top;
      const stride = i < list.length - 1 ? list[i + 1].top - b.top : i > 0 ? b.top - list[i - 1].top : height;
      return { ...b, height, slot: stride > 0 ? stride : height };
    });
  }
  function scrollAdjustedSlots(slots, scrollDelta) {
    const delta = Number(scrollDelta) || 0;
    return (Array.isArray(slots) ? slots : []).map((s) => ({
      ...s,
      top: s.top - delta,
      bottom: s.bottom - delta
    }));
  }
  function followTranslate(startX, startY, x, y, { maxX = 56, scrollDelta = 0 } = {}) {
    return {
      x: clamp((Number(x) || 0) - (Number(startX) || 0), -maxX, maxX),
      y: (Number(y) || 0) - (Number(startY) || 0) + (Number(scrollDelta) || 0)
    };
  }
  function targetIndexForCenter(slots, fromId, centerY, lockedSongId) {
    const list = Array.isArray(slots) ? slots : [];
    const fromIndex = list.findIndex((s) => s.id === Number(fromId));
    if (fromIndex < 0 || !Number.isFinite(centerY)) return Math.max(0, fromIndex);
    let insert = 0;
    for (const s of list) {
      if (s.id === Number(fromId)) continue;
      if (centerY > s.top + s.height / 2) insert += 1;
    }
    if (normalizeLockedId(lockedSongId) && insert < 1) insert = 1;
    return insert;
  }
  function planReorderToIndex(ids, fromId, toIndex, lockedSongId) {
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isFinite);
    const from = Number(fromId);
    const fromIndex = list.indexOf(from);
    if (fromIndex < 0) return null;
    const locked = normalizeLockedId(lockedSongId);
    if (locked && from === locked) return null;
    let dest = clamp(Math.round(Number(toIndex)), 0, Math.max(0, list.length - 1));
    if (locked && dest < 1) dest = Math.min(1, Math.max(0, list.length - 1));
    if (dest === fromIndex) return null;
    const next = list.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(dest, 0, moved);
    if (next.every((id, i) => id === list[i])) return null;
    return next;
  }
  function shiftMapForMove(slots, fromId, toIndex) {
    const list = Array.isArray(slots) ? slots : [];
    const fromIndex = list.findIndex((s) => s.id === Number(fromId));
    if (fromIndex < 0) return [];
    const dest = clamp(Math.round(Number(toIndex)), 0, Math.max(0, list.length - 1));
    const lifted = list[fromIndex].slot;
    return list.map((s, i) => {
      if (i === fromIndex) return { id: s.id, y: 0, isDragged: true };
      let y = 0;
      if (fromIndex < dest && i > fromIndex && i <= dest) y = -lifted;
      else if (dest < fromIndex && i >= dest && i < fromIndex) y = lifted;
      return { id: s.id, y, isDragged: false };
    });
  }
  function settleTranslate(slots, fromId, toIndex) {
    const list = Array.isArray(slots) ? slots : [];
    const fromIndex = list.findIndex((s) => s.id === Number(fromId));
    if (fromIndex < 0 || !list.length) return { x: 0, y: 0 };
    const dest = clamp(Math.round(Number(toIndex)), 0, list.length - 1);
    const originTop = list[fromIndex].top;
    const ids = list.map((s) => s.id);
    const order = planReorderToIndex(ids, fromId, dest) || ids;
    let top = list[0].top;
    for (const id of order) {
      if (id === Number(fromId)) break;
      const row = list.find((s) => s.id === id);
      top += row ? row.slot : 0;
    }
    return { x: 0, y: top - originTop };
  }
  function planPointerMotion({
    slots,
    fromId,
    startX,
    startY,
    x,
    y,
    maxX = 56,
    scrollDelta = 0,
    lockedSongId
  } = {}) {
    const follow = followTranslate(startX, startY, x, y, { maxX, scrollDelta });
    const from = (Array.isArray(slots) ? slots : []).find((s) => s.id === Number(fromId));
    const centerY = from ? from.top + from.height / 2 + follow.y : Number(y) || 0;
    const rawIndex = targetIndexForCenter(slots, fromId, centerY);
    const toIndex = targetIndexForCenter(slots, fromId, centerY, lockedSongId);
    const clampedToNext = !!(normalizeLockedId(lockedSongId) && rawIndex < 1 && toIndex >= 1);
    const shifts = shiftMapForMove(slots, fromId, toIndex);
    const settle = settleTranslate(slots, fromId, toIndex);
    const nextIds = planReorderToIndex(
      (Array.isArray(slots) ? slots : []).map((s) => s.id),
      fromId,
      toIndex,
      lockedSongId
    );
    return { fromId: Number(fromId), follow, toIndex, shifts, settle, nextIds, clampedToNext };
  }
  function autoScrollDelta({
    pointerY,
    viewTop,
    viewBottom,
    scrollTop,
    scrollHeight,
    clientHeight,
    edge = 40,
    step = 14
  } = {}) {
    const maxScroll = Math.max(0, (Number(scrollHeight) || 0) - (Number(clientHeight) || 0));
    const top = Number(scrollTop) || 0;
    if (maxScroll <= 0 || !Number.isFinite(pointerY)) return 0;
    const edgeSize = Math.max(1, Number(edge) || 40);
    const maxStep = Math.max(1, Number(step) || 14);
    let delta = 0;
    if (pointerY < viewTop + edgeSize) {
      const t = (viewTop + edgeSize - pointerY) / edgeSize;
      delta = -Math.ceil(maxStep * clamp(t, 0.25, 1));
    } else if (pointerY > viewBottom - edgeSize) {
      const t = (pointerY - (viewBottom - edgeSize)) / edgeSize;
      delta = Math.ceil(maxStep * clamp(t, 0.25, 1));
    }
    if (!delta) return 0;
    const next = clamp(top + delta, 0, maxScroll);
    return next - top;
  }
  function settleDurationMs(reducedMotion) {
    return reducedMotion ? 0 : 180;
  }
  function planPinToFrontMotion(slots, songId) {
    const list = Array.isArray(slots) ? slots : [];
    const fromId = Number(songId);
    const fromIndex = list.findIndex((s) => s.id === fromId);
    if (fromIndex < 0) return { kind: "insert", fromId, fromIndex: -1, toIndex: 0 };
    if (fromIndex === 0) {
      return {
        kind: "already-first",
        fromId,
        fromIndex: 0,
        toIndex: 0,
        follow: { x: 0, y: 0 },
        shifts: [],
        settle: { x: 0, y: 0 }
      };
    }
    return {
      kind: "move",
      fromId,
      fromIndex,
      toIndex: 0,
      follow: { x: 0, y: 0 },
      shifts: shiftMapForMove(list, fromId, 0),
      settle: settleTranslate(list, fromId, 0)
    };
  }
  function createQueuePointerDrag(opts = {}) {
    const threshold = Number.isFinite(Number(opts.threshold)) ? Number(opts.threshold) : 8;
    let session = null;
    let restSlots = null;
    let restScrollTop = 0;
    function scrollTopNow() {
      return typeof opts.getScrollTop === "function" ? Number(opts.getScrollTop()) || 0 : 0;
    }
    function currentSlots() {
      if (restSlots) return scrollAdjustedSlots(restSlots, scrollTopNow() - restScrollTop);
      return rowSlotsFromBoxes(typeof opts.getRows === "function" ? opts.getRows() || [] : []);
    }
    function motionAt(x, y) {
      if (!session) return null;
      const locked = typeof opts.getLockedSongId === "function" ? opts.getLockedSongId() : opts.lockedSongId;
      return planPointerMotion({
        slots: currentSlots(),
        fromId: session.fromId,
        startX: session.startX,
        startY: session.startY,
        x,
        y,
        maxX: opts.maxX,
        scrollDelta: scrollTopNow() - restScrollTop,
        lockedSongId: locked
      });
    }
    function clear(info) {
      const had = session;
      session = null;
      restSlots = null;
      restScrollTop = 0;
      if (had && had.started && typeof opts.onDragEnd === "function") opts.onDragEnd(info || {});
    }
    return {
      isActive() {
        return !!(session && (session.started || session.settling));
      },
      onPointerDown(ev, fromId) {
        const id = Number(fromId);
        if (!Number.isFinite(id) || !ev) return;
        const locked = typeof opts.getLockedSongId === "function" ? opts.getLockedSongId() : opts.lockedSongId;
        if (!canDragQueueRow(id, locked)) return;
        session = {
          fromId: id,
          pointerId: ev.pointerId,
          startX: ev.clientX ?? 0,
          startY: ev.clientY ?? 0,
          lastX: ev.clientX ?? 0,
          lastY: ev.clientY ?? 0,
          started: false,
          settling: false
        };
      },
      onPointerMove(ev) {
        if (!session || ev && ev.pointerId != null && ev.pointerId !== session.pointerId) return;
        const x = ev && ev.clientX != null ? ev.clientX : session.lastX;
        const y = ev && ev.clientY != null ? ev.clientY : session.lastY;
        session.lastX = x;
        session.lastY = y;
        if (!session.started) {
          if (Math.hypot(x - session.startX, y - session.startY) < threshold) return;
          session.started = true;
          restSlots = currentSlots();
          restScrollTop = scrollTopNow();
          if (typeof opts.onDragStart === "function") opts.onDragStart(session.fromId);
        }
        if (session.settling) return;
        const motion = motionAt(x, y);
        if (motion && typeof opts.onDragMove === "function") opts.onDragMove(motion);
      },
      async onPointerUp(ev) {
        if (!session || ev && ev.pointerId != null && ev.pointerId !== session.pointerId) return;
        const x = ev && ev.clientX != null ? ev.clientX : session.lastX;
        const y = ev && ev.clientY != null ? ev.clientY : session.lastY;
        if (!session.started) {
          clear();
          return;
        }
        session.settling = true;
        const mine = session;
        const motion = motionAt(x, y);
        if (typeof opts.onSettle === "function") await opts.onSettle(motion);
        if (session !== mine) return;
        const nextIds = motion && motion.nextIds;
        clear({ keepPaint: !!nextIds });
        if (nextIds && typeof opts.commit === "function") await opts.commit(nextIds);
      },
      cancel() {
        clear();
      }
    };
  }

  // ui/views/queue.js
  var selectState2 = { mode: false, ids: /* @__PURE__ */ new Set() };
  var dragId = null;
  var pointerDrag = null;
  var frontClampHint = createFrontClampHint();
  var playheadRepairInFlight = false;
  function resolveCurrentPlayhead() {
    const data2 = getData();
    const songs = data2.queueSongs || [];
    const meta = data2.queueMeta;
    const snap = get();
    return resolvePlayheadLock({
      songIds: songs.map((s) => s && s.id),
      currentSongId: currentSongId(snap),
      phase: snap && snap.phase,
      podcastPlaylistId: meta && meta.playlistId,
      sourcePlaylistId: snap && snap.sourcePlaylistId
    });
  }
  function currentFrontLock() {
    return resolveCurrentPlayhead().lockedSongId;
  }
  function maybeHintFrontClamp(clamped) {
    const phase = resolveCurrentPlayhead().phase;
    const msg = frontClampHint.take(clamped, phase);
    if (msg) notify(msg, "warn");
  }
  function maybeHintMovedToFirst(beforeIds, nextIds, fromId) {
    if (currentFrontLock()) return;
    const from = Number(fromId);
    const before = (Array.isArray(beforeIds) ? beforeIds : []).map(Number);
    const next = (Array.isArray(nextIds) ? nextIds : []).map(Number);
    if (!Number.isFinite(from) || !next.length) return;
    if (next[0] === from && before[0] !== from) {
      notify(FRONT_MOVED_TO_FIRST, "ok");
    }
  }
  async function maybeRepairPlayheadOrder() {
    if (playheadRepairInFlight) return;
    if (pointerDrag && pointerDrag.isActive()) return;
    const resolved = resolveCurrentPlayhead();
    if (!resolved.needsRepair || resolved.lockedSongId == null) return;
    const ids = (getData().queueSongs || []).map((s) => s && s.id);
    const next = planPinSongToFront(ids, resolved.lockedSongId);
    if (!next) return;
    playheadRepairInFlight = true;
    try {
      await reorderQueue(next);
    } catch (_) {
    } finally {
      playheadRepairInFlight = false;
    }
  }
  function isMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }
  function setQueueOpen(open) {
    const panel = $("queuePanel");
    if (!panel) return;
    const next = !!open;
    if (isMobile()) {
      panel.classList.toggle("is-open", next);
    } else {
      panel.classList.toggle("is-collapsed", !next);
    }
    const layout = $("layout");
    if (layout) layout.classList.toggle("queue-hidden", !next && !isMobile());
    patch({ queueOpen: next });
    syncQueueToggleButtons(next);
  }
  function syncQueueToggleButtons(open) {
    const label = open ? "\u9690\u85CF\u300C\u64AD\u5BA2\u300D\u5217\u8868" : "\u663E\u793A\u300C\u64AD\u5BA2\u300D\u5217\u8868";
    const btnTop = $("btnToggleQueue");
    if (btnTop) {
      btnTop.setAttribute("aria-pressed", open ? "true" : "false");
      btnTop.setAttribute("title", label);
      btnTop.setAttribute("aria-label", label);
      setButtonIcon(btnTop, "listMusic", 17);
    }
  }
  function toggleQueue() {
    setQueueOpen(!getData().queueOpen);
  }
  function syncSelectUi() {
    const bar = $("queueSelectBar");
    const del2 = $("btnQueueDeleteSelected");
    setHidden(bar, !selectState2.mode);
    if (del2) del2.disabled = selectState2.ids.size === 0;
  }
  function setSelectMode(on) {
    selectState2.mode = !!on;
    if (!on) selectState2.ids.clear();
    syncSelectUi();
    renderQueue();
  }
  function renderQueue() {
    if (pointerDrag && pointerDrag.isActive()) return;
    const data2 = getData();
    const songs = data2.queueSongs || [];
    const meta = data2.queueMeta;
    const metaEl = $("queueMeta");
    if (metaEl) {
      metaEl.textContent = meta ? `${meta.playlistName} \xB7 ${songs.length} \u9996` : "\u56FA\u5B9A\u5BBF\u4E3B\u6B4C\u5355";
    }
    const box = $("queueList");
    if (!box) return;
    const replaceBtn = document.querySelector('[data-queue-act="replace"]');
    if (replaceBtn) replaceBtn.disabled = !songs.length;
    box.classList.remove("is-skeleton");
    if (!songs.length) {
      if (box.dataset.bootPending === "1") {
        syncSelectUi();
        return;
      }
      box.innerHTML = '<div class="empty">\u300C\u64AD\u5BA2\u300D\u5217\u8868\u4E3A\u7A7A\u3002\u5728\u300C\u66F4\u65B0\u300D\u91CC\u52A0\u5165\u5355\u96C6\uFF0C\u70B9\u64AD\u653E\u65F6\u4F1A\u4ECE\u8FD9\u4E00\u96C6\u5F00\u59CB\u987A\u5E8F\u64AD\u5B8C\u3002</div>';
      syncSelectUi();
      return;
    }
    delete box.dataset.bootPending;
    box.innerHTML = songs.map((s, idx) => {
      const pending = !!s.pending;
      const selected = selectState2.ids.has(s.id);
      const lockedId = currentFrontLock();
      const frontLocked = !pending && lockedId != null && Number(s.id) === Number(lockedId);
      const lead = pending ? `<span class="q-pending-lead" aria-hidden="true"></span>` : selectState2.mode ? `<input type="checkbox" class="sel-box" data-sel="${s.id}" ${selected ? "checked" : ""} aria-label="\u9009\u62E9" />` : frontLocked ? `<span class="drag-handle drag-handle--locked" title="${FRONT_LOCKED_LABEL}" aria-label="${FRONT_LOCKED_LABEL}">${icon("gripVertical", 16)}</span>` : `<span class="drag-handle" title="\u62D6\u62FD\u6392\u5E8F" aria-hidden="true">${icon("gripVertical", 16)}</span>`;
      const more = pending ? "" : moreMenuHtml(
        [
          { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove",
            label: "\u79FB\u51FA\u5217\u8868",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`
          }
        ],
        "queue-" + idx
      );
      const row = episodeRowHtml(
        {
          ...s,
          songId: s.id,
          durationSec: s.duration,
          showTitle: s.artist || s.album || ""
        },
        idx,
        {
          showDate: false,
          extraClass: frontLocked ? "q-row is-front-locked" : "q-row",
          pending,
          fromWaitlist: true,
          leadHtml: lead,
          actions: [
            {
              act: "fav",
              iconName: "star",
              title: "\u6536\u85CF",
              cls: "icon-btn--star",
              attrs: `aria-pressed="${s.favorited ? "true" : "false"}" ` + (pending || !(s.feedUrl && s.guid) ? "disabled" : "")
            }
          ],
          moreHtml: pending || selectState2.mode ? "" : more
        }
      );
      return row;
    }).join("");
    if (selectState2.mode) {
      box.querySelectorAll("input[data-sel]").forEach((input) => {
        input.addEventListener("click", (ev) => ev.stopPropagation());
        input.addEventListener("change", () => {
          const id = Number(input.getAttribute("data-sel"));
          if (input.checked) selectState2.ids.add(id);
          else selectState2.ids.delete(id);
          syncSelectUi();
        });
      });
      box.querySelectorAll("[data-row]").forEach((row) => {
        row.addEventListener("click", (ev) => {
          if (ev.target instanceof Element && ev.target.closest("input")) return;
          const input = row.querySelector("input[data-sel]");
          if (!input) return;
          input.checked = !input.checked;
          const id = Number(input.getAttribute("data-sel"));
          if (input.checked) selectState2.ids.add(id);
          else selectState2.ids.delete(id);
          syncSelectUi();
        });
      });
      syncSelectUi();
      return;
    }
    bindRowInteractions(box, songs, {
      playOpts: { fromWaitlist: true },
      remove: async (ep, idx) => {
        const id = songs[idx] && songs[idx].id;
        if (id == null) return;
        await removeSongs([id]);
      },
      cast: async (ep, idx) => {
        const song = songs[idx];
        if (!song) return;
        const songIds = songs.map((s) => Number(s && s.id)).filter((id) => Number.isFinite(id) && id > 0);
        await castQueueToSpeaker({ songIds, songId: song.id });
      },
      fav: async (ep, idx, btn) => {
        const song = songs[idx];
        if (!song || !song.feedUrl || !song.guid) return;
        await toggleFavorite(
          {
            feedUrl: song.feedUrl,
            guid: song.guid,
            title: song.title,
            showTitle: song.album || song.artist || "",
            coverUrl: song.coverUrl || song.cover_url,
            subscriptionId: song.subscriptionId,
            durationSec: song.duration,
            favorited: song.favorited
          },
          btn
        );
      }
    });
    wireDragAndDrop(box);
    syncQueueFrontLock();
    syncSelectUi();
  }
  function clearDragMarks(box) {
    box.querySelectorAll("[data-row]").forEach((row) => {
      row.classList.remove(
        "dragging",
        "drag-over",
        "is-lifted",
        "is-shifting",
        "is-settling",
        "is-drop-after-front"
      );
      row.style.transform = "";
    });
  }
  function markDropAfterFront(box, on) {
    const songs = getData().queueSongs || [];
    const second = songs[1];
    box.querySelectorAll("[data-row]").forEach((row) => {
      const id = Number(row.getAttribute("data-song-id"));
      row.classList.toggle("is-drop-after-front", !!(on && second && id === Number(second.id)));
    });
  }
  function rowBoxes(box) {
    return Array.from(box.querySelectorAll("[data-row]")).map((row) => {
      const rect = row.getBoundingClientRect();
      return {
        id: Number(row.getAttribute("data-song-id")),
        top: rect.top,
        bottom: rect.bottom
      };
    });
  }
  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function motionTransform(x, y) {
    return "translate(" + (Number(x) || 0) + "px, " + (Number(y) || 0) + "px)";
  }
  function paintPointerMotion(box, fromId, motion, settling) {
    if (!motion) return;
    const shifts = motion.shifts || [];
    markDropAfterFront(box, !!(motion.clampedToNext || currentFrontLock() && motion.toIndex === 1));
    box.querySelectorAll("[data-row]").forEach((row) => {
      const id = Number(row.getAttribute("data-song-id"));
      if (id === fromId) {
        const t = settling ? motion.settle : motion.follow;
        row.classList.add("is-lifted");
        row.classList.toggle("is-settling", !!settling);
        row.classList.remove("is-shifting", "drag-over", "dragging");
        row.style.transform = motionTransform(t && t.x, t && t.y);
        return;
      }
      const shift = shifts.find((s) => s.id === id);
      row.classList.add("is-shifting");
      row.classList.remove("is-lifted", "is-settling", "drag-over");
      row.style.transform = motionTransform(0, shift ? shift.y : 0);
    });
  }
  function waitForRowSettle(row, reduced) {
    const ms = settleDurationMs(reduced);
    if (!ms || !row) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        row.removeEventListener("transitionend", onEnd);
        resolve();
      };
      const onEnd = (ev) => {
        if (!ev || ev.propertyName === "transform") finish();
      };
      row.addEventListener("transitionend", onEnd);
      setTimeout(finish, ms + 40);
    });
  }
  function wirePointerReorder(box) {
    let lastPointer = null;
    let scrollRaf = 0;
    function stopAutoScroll() {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
    function tickAutoScroll() {
      if (!pointerDrag || !pointerDrag.isActive() || !lastPointer) {
        stopAutoScroll();
        return;
      }
      scrollRaf = requestAnimationFrame(() => {
        if (!pointerDrag || !pointerDrag.isActive() || !lastPointer) {
          stopAutoScroll();
          return;
        }
        const view = box.getBoundingClientRect();
        const delta = autoScrollDelta({
          pointerY: lastPointer.clientY,
          viewTop: view.top,
          viewBottom: view.bottom,
          scrollTop: box.scrollTop,
          scrollHeight: box.scrollHeight,
          clientHeight: box.clientHeight
        });
        if (delta) {
          box.scrollTop += delta;
          pointerDrag.onPointerMove(lastPointer);
        }
        tickAutoScroll();
      });
    }
    pointerDrag = createQueuePointerDrag({
      getRows: () => rowBoxes(box),
      getScrollTop: () => box.scrollTop,
      threshold: 8,
      getLockedSongId: currentFrontLock,
      onDragStart(fromId) {
        frontClampHint.reset();
        const row = box.querySelector('[data-song-id="' + fromId + '"]');
        if (row) row.classList.add("is-lifted");
        tickAutoScroll();
      },
      onDragMove(motion) {
        if (!motion) return;
        paintPointerMotion(box, motion.fromId, motion, false);
      },
      async onSettle(motion) {
        stopAutoScroll();
        if (!motion) return;
        const lifted = box.querySelector('[data-song-id="' + motion.fromId + '"]') || box.querySelector(".q-row.is-lifted");
        const reduced = prefersReducedMotion();
        paintPointerMotion(box, motion.fromId, motion, false);
        if (lifted) lifted.getBoundingClientRect();
        paintPointerMotion(box, motion.fromId, motion, true);
        await waitForRowSettle(lifted, reduced);
        maybeHintFrontClamp(motion && motion.clampedToNext);
      },
      onDragEnd(info) {
        stopAutoScroll();
        lastPointer = null;
        if (!(info && info.keepPaint)) clearDragMarks(box);
      },
      commit: applyOrderIds
    });
    box.querySelectorAll("[data-row] .drag-handle").forEach((handle) => {
      const row = handle.closest("[data-row]");
      const songId = Number(row && row.getAttribute("data-song-id"));
      if (!Number.isFinite(songId)) return;
      handle.addEventListener("pointerdown", (ev) => {
        lastPointer = ev;
        pointerDrag.onPointerDown(ev, songId);
        try {
          handle.setPointerCapture(ev.pointerId);
        } catch (_) {
        }
      });
      handle.addEventListener("pointermove", (ev) => {
        lastPointer = ev;
        pointerDrag.onPointerMove(ev);
      });
      handle.addEventListener("pointerup", (ev) => {
        lastPointer = ev;
        pointerDrag.onPointerUp(ev);
      });
      handle.addEventListener("pointercancel", () => {
        lastPointer = null;
        stopAutoScroll();
        pointerDrag.cancel();
      });
    });
  }
  function wireHtml5Reorder(box) {
    const lockedId = currentFrontLock();
    box.querySelectorAll("[data-row]").forEach((row) => {
      const songId = Number(row.getAttribute("data-song-id"));
      const locked = lockedId != null && songId === Number(lockedId);
      row.setAttribute("draggable", locked ? "false" : "true");
      if (locked) row.draggable = false;
      row.querySelectorAll(".actions-row, button, a, input").forEach((el2) => {
        el2.addEventListener("mousedown", () => {
          row.draggable = false;
        });
        el2.addEventListener("mouseup", () => {
          if (!locked) row.draggable = true;
        });
        el2.addEventListener("mouseleave", () => {
          if (!locked) row.draggable = true;
        });
      });
      if (locked) {
        row.addEventListener("dragstart", (ev) => {
          ev.preventDefault();
        });
      } else {
        row.addEventListener("dragstart", (ev) => {
          frontClampHint.reset();
          dragId = songId;
          row.classList.add("dragging");
          try {
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", String(songId));
          } catch (_) {
          }
        });
      }
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        if (!locked) row.draggable = true;
        box.querySelectorAll(".drag-over").forEach((el2) => el2.classList.remove("drag-over"));
        markDropAfterFront(box, false);
        dragId = null;
      });
      row.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        const overLocked = lockedId != null && songId === Number(lockedId);
        if (overLocked) {
          row.classList.remove("drag-over");
          markDropAfterFront(box, true);
        } else {
          markDropAfterFront(box, false);
          row.classList.add("drag-over");
        }
        try {
          ev.dataTransfer.dropEffect = overLocked ? "none" : "move";
        } catch (_) {
        }
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
        if (lockedId != null && songId === Number(lockedId)) markDropAfterFront(box, false);
      });
      row.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        row.classList.remove("drag-over");
        markDropAfterFront(box, false);
        const toId = Number(row.getAttribute("data-song-id"));
        const fromId = dragId != null ? dragId : Number(ev.dataTransfer.getData("text/plain"));
        await applyOrder(fromId, toId);
      });
    });
  }
  function wireDragAndDrop(box) {
    const html5 = useHtml5RowDrag({
      pointerFine: window.matchMedia("(pointer: fine)").matches,
      mobile: isMobile()
    });
    if (html5) {
      pointerDrag = null;
      wireHtml5Reorder(box);
    } else {
      box.querySelectorAll("[data-row]").forEach((row) => {
        row.setAttribute("draggable", "false");
      });
      wirePointerReorder(box);
    }
  }
  async function applyOrder(fromId, toId) {
    const ids = (getData().queueSongs || []).map((s) => s.id);
    const result = planReorderResult(ids, fromId, toId, currentFrontLock());
    if (result.blocked) return;
    maybeHintFrontClamp(result.clampedToNext);
    if (!result.next) return;
    maybeHintMovedToFirst(ids, result.next, fromId);
    await reorderQueue(result.next);
  }
  async function applyOrderIds(nextIds) {
    const before = (getData().queueSongs || []).map((s) => s.id);
    let next = (Array.isArray(nextIds) ? nextIds : []).map(Number).filter(Number.isFinite);
    if (!next.length) return;
    const locked = currentFrontLock();
    if (locked && next[0] !== locked) {
      const seen = /* @__PURE__ */ new Set();
      const fixed = [];
      for (const id of [locked, ...next]) {
        if (seen.has(id)) continue;
        seen.add(id);
        fixed.push(id);
      }
      next = fixed;
      maybeHintFrontClamp(true);
    } else {
      maybeHintMovedToFirst(before, next, next[0]);
    }
    await reorderQueue(next);
  }
  function scrollQueueListToTop() {
    const box = $("queueList");
    if (box) box.scrollTop = 0;
  }
  function flashPinnedRow(songId) {
    const box = $("queueList");
    if (!box) return;
    const row = box.querySelector('[data-song-id="' + Number(songId) + '"]') || box.querySelector("[data-row]");
    if (!row) return;
    row.classList.remove("is-pin-flash");
    void row.offsetWidth;
    row.classList.add("is-pin-flash");
  }
  async function animatePinToFront(songId) {
    const box = $("queueList");
    if (!box) return;
    const id = Number(songId);
    const row = Number.isFinite(id) ? box.querySelector('[data-song-id="' + id + '"]') : null;
    if (!row) return;
    const reduced = prefersReducedMotion();
    const slots = rowSlotsFromBoxes(rowBoxes(box));
    const motion = planPinToFrontMotion(slots, id);
    if (motion.kind !== "move") return;
    row.classList.add("is-lifted");
    paintPointerMotion(box, id, motion, false);
    row.getBoundingClientRect();
    paintPointerMotion(box, id, motion, true);
    await waitForRowSettle(row, reduced);
    clearDragMarks(box);
  }
  function syncQueueFrontLock() {
    const box = $("queueList");
    if (!box || pointerDrag && pointerDrag.isActive()) return;
    const lockedId = currentFrontLock();
    const html5 = useHtml5RowDrag({
      pointerFine: window.matchMedia("(pointer: fine)").matches,
      mobile: isMobile()
    });
    box.querySelectorAll("[data-row]").forEach((row) => {
      const songId = Number(row.getAttribute("data-song-id"));
      const locked = lockedId != null && songId === Number(lockedId);
      row.classList.toggle("is-front-locked", locked);
      if (html5) {
        row.setAttribute("draggable", locked ? "false" : "true");
        row.draggable = !locked;
      }
      const handle = row.querySelector(".drag-handle");
      if (!handle) return;
      handle.classList.toggle("drag-handle--locked", locked);
      if (locked) {
        handle.setAttribute("title", FRONT_LOCKED_LABEL);
        handle.setAttribute("aria-label", FRONT_LOCKED_LABEL);
        handle.removeAttribute("aria-hidden");
      } else {
        handle.setAttribute("title", "\u62D6\u62FD\u6392\u5E8F");
        handle.setAttribute("aria-hidden", "true");
        handle.removeAttribute("aria-label");
      }
    });
  }
  function bindQueuePanel() {
    onQueueViewChange(() => renderQueue());
    onChange(() => {
      syncQueueFrontLock();
      void maybeRepairPlayheadOrder();
    });
    onEnsureQueueVisible(() => setQueueOpen(true));
    setQueuePinRunner(async (phase, songId) => {
      if (phase === "before") {
        await animatePinToFront(songId);
        return;
      }
      if (phase === "after") {
        scrollQueueListToTop();
        flashPinnedRow(songId);
      }
    });
    const panel = $("queuePanel");
    const backdrop = $("queueBackdrop");
    if (backdrop) backdrop.addEventListener("click", () => setQueueOpen(false));
    const grab = $("queueGrab");
    if (grab) {
      grab.addEventListener("click", () => {
        if (isMobile()) setQueueOpen(false);
      });
    }
    const btnTop = $("btnToggleQueue");
    if (btnTop) btnTop.addEventListener("click", () => toggleQueue());
    const menuBtn = $("btnQueueMenu");
    if (menuBtn) {
      menuBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        togglePopover(menuBtn.closest(".more-wrap"));
      });
    }
    if (panel) {
      panel.querySelectorAll("[data-queue-act]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          closePopovers();
          const act = btn.getAttribute("data-queue-act");
          if (act === "select") setSelectMode(!selectState2.mode);
          else if (act === "remove-played") await removePlayed();
          else if (act === "cast-all") await castQueueToSpeaker();
          else if (act === "refresh") {
            renderQueue();
            await reloadQueue();
            renderQueue();
          } else if (act === "replace") await replaceQueueAndPlay2();
          else if (act === "clear") await clearQueue();
        });
      });
    }
    const cancel = $("btnQueueSelectCancel");
    if (cancel) cancel.addEventListener("click", () => setSelectMode(false));
    const del2 = $("btnQueueDeleteSelected");
    if (del2) {
      del2.addEventListener("click", async () => {
        const ids = Array.from(selectState2.ids);
        if (!ids.length) return;
        const ok = await uiConfirm({
          title: "\u5220\u9664\u6240\u9009",
          message: `\u4ECE\u300C\u64AD\u5BA2\u300D\u5217\u8868\u5220\u9664\u9009\u4E2D\u7684 ${ids.length} \u9996\uFF1F`,
          okText: "\u5220\u9664",
          danger: true
        });
        if (!ok) return;
        const r = await removeSongs(ids);
        if (r && r.ok !== false) {
          notify(`\u5DF2\u5220\u9664 ${ids.length} \u9996`, "ok");
          setSelectMode(false);
        }
      });
    }
    if (isMobile()) setQueueOpen(false);
    else setQueueOpen(true);
    let wasMobile = isMobile();
    window.addEventListener(
      "resize",
      () => {
        const nowMobile = isMobile();
        if (nowMobile === wasMobile) return;
        wasMobile = nowMobile;
        setQueueOpen(!nowMobile);
      },
      { passive: true }
    );
  }

  // ui/views/settings.js
  var selectedDeviceId = "";
  async function loadSettings() {
    try {
      const r = await api.settings();
      if (!r || !r.ok) return;
      patch({ settings: r });
      const enabled = $("scheduleEnabled");
      const interval = $("scheduleInterval");
      const max = $("maxEpisodes");
      const limit = Number(r.maxEpisodesLimit) || 200;
      if (enabled) enabled.checked = !!r.scheduleEnabled;
      if (interval) interval.value = String(r.scheduleIntervalHours || 6);
      if (max) {
        max.max = String(limit);
        max.value = String(r.maxEpisodes || 50);
      }
      const hint = $("maxEpisodesHint");
      if (hint) {
        hint.textContent = `\u53EF\u586B 1\u2013${limit}\uFF0C\u9ED8\u8BA4 50\u3002\u8FD9\u662F\u81EA\u52A8\u5237\u65B0\u7A97\u53E3\uFF0C\u4E0D\u662F\u5386\u53F2\u7D22\u5F15\u4E0A\u9650\uFF1B\u8D85\u8FC7 ${limit} \u4F1A\u81EA\u52A8\u6536\u655B\u5230 ${limit}\u3002\u66F4\u65E9\u7684\u8282\u76EE\u8BF7\u5728\u9891\u9053\u9875\u6309\u9700\u7D22\u5F15\uFF08\u6309\u9891\u9053\u9009\u62E9\uFF0C\u4E0D\u53D7\u6B64\u6ED1\u5757\u63A7\u5236\uFF09\u3002`;
      }
      const meta = $("scheduleMeta");
      if (meta) {
        meta.textContent = "\u4E0B\u6B21\uFF1A" + (r.scheduleNextDueAt ? fmtTime(r.scheduleNextDueAt) : "\u2014");
      }
    } catch (_) {
    }
  }
  async function loadCastDevices() {
    const box = $("castDeviceList");
    if (!box) return;
    box.innerHTML = '<div class="empty">\u6B63\u5728\u8BFB\u53D6\u97F3\u7BB1\u2026</div>';
    let res;
    try {
      res = await api.castStatus();
    } catch (e) {
      box.innerHTML = `<div class="empty">\u8BFB\u53D6\u5931\u8D25\uFF1A${escapeHtml(String(e))}</div>`;
      return;
    }
    if (!res || !res.ok) {
      box.innerHTML = '<div class="empty">\u8BFB\u53D6\u8BBE\u5907\u5931\u8D25</div>';
      return;
    }
    if (!res.devices || !res.devices.length) {
      box.innerHTML = '<div class="empty">\u6CA1\u6709\u8BFB\u5230\u8BBE\u5907\uFF1A\u8BF7\u5148\u5728\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6\u767B\u5F55\u5C0F\u7C73\u8D26\u53F7\u3002</div>';
      return;
    }
    const devices = res.devices || [];
    if (!selectedDeviceId || !devices.some((d) => d.deviceId === selectedDeviceId)) {
      const preferred = devices.find((d) => d.selected && d.online) || devices.find((d) => d.selected) || devices.find((d) => d.online) || devices[0];
      selectedDeviceId = preferred ? preferred.deviceId : "";
    }
    const offlineCount = devices.filter((d) => !d.online).length;
    const hints = [];
    if (!res.available) hints.push("\u6240\u6709\u97F3\u7BB1\u90FD\u79BB\u7EBF\uFF0C\u6295\u653E\u524D\u8BF7\u5148\u5524\u9192\u97F3\u7BB1");
    else if (offlineCount) hints.push(`\u6709 ${offlineCount} \u53F0\u8BBE\u5907\u79BB\u7EBF`);
    box.innerHTML = (hints.length ? `<div class="cast-hint">${escapeHtml(hints.join("\uFF1B"))}</div>` : "") + devices.map((d) => {
      const checked = d.deviceId === selectedDeviceId;
      const status = d.online ? "\u5728\u7EBF" : "\u79BB\u7EBF";
      return `<label class="cast-device${checked ? " is-selected" : ""}${d.online ? "" : " is-offline"}"><input type="radio" name="castDevice" value="${escapeHtml(d.deviceId)}" ${checked ? "checked" : ""} /><span class="cast-device__name">${escapeHtml(d.name)}</span><span class="cast-device__status${d.online ? " is-online" : ""}">${escapeHtml(status)}</span>` + (d.selected ? '<span class="badge badge--warn">\u4E0A\u6B21\u4F7F\u7528</span>' : "") + `</label>`;
    }).join("");
    box.querySelectorAll('input[name="castDevice"]').forEach((input) => {
      input.addEventListener("change", () => {
        selectedDeviceId = input.value;
        box.querySelectorAll(".cast-device").forEach((el2) => el2.classList.remove("is-selected"));
        const label = input.closest(".cast-device");
        if (label) label.classList.add("is-selected");
      });
    });
  }
  async function loadLog() {
    try {
      const r = await api.log();
      if (!r || !r.ok) return;
      const box = $("logBox");
      if (!box) return;
      const lines = (r.log || []).map((x) => `[${fmtTime(x.ts)}] ${x.level}: ${x.message}`);
      box.textContent = lines.join("\n") || "\uFF08\u7A7A\uFF09";
    } catch (_) {
    }
  }
  function bindSettings() {
    const save = $("btnSaveSchedule");
    if (save) {
      save.addEventListener("click", async () => {
        try {
          await api.saveSettings({
            scheduleEnabled: $("scheduleEnabled").checked,
            scheduleIntervalHours: Number($("scheduleInterval").value)
          });
          notify("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58", "ok");
          await loadSettings();
        } catch (e) {
          notify(String(e), "err");
        }
      });
    }
    const saveIndex = $("btnSaveIndex");
    if (saveIndex) {
      saveIndex.addEventListener("click", async () => {
        const input = $("maxEpisodes");
        const limit = Number(input && input.max) || 200;
        const raw = Number(input && input.value);
        if (!Number.isFinite(raw) || raw < 1) {
          notify("\u7D22\u5F15\u6DF1\u5EA6\u9700\u4E3A 1 \u4EE5\u4E0A\u7684\u6574\u6570", "warn");
          return;
        }
        const value = Math.min(Math.round(raw), limit);
        if (value !== raw) notify(`\u5DF2\u6536\u655B\u5230\u4E0A\u9650 ${limit}`, "warn");
        try {
          const r = await api.saveSettings({ maxEpisodes: value });
          if (r && r.ok !== false && r.maxEpisodes != null && input) {
            input.value = String(r.maxEpisodes);
          }
          notify("\u7D22\u5F15\u6DF1\u5EA6\u5DF2\u4FDD\u5B58\uFF1B\u4E0B\u6B21\u5237\u65B0\u6309\u65B0\u6DF1\u5EA6\u4FDD\u7559", "ok");
          await loadSettings();
        } catch (e) {
          notify(String(e), "err");
        }
      });
    }
    const refreshCast = $("btnCastRefresh");
    if (refreshCast) {
      refreshCast.addEventListener("click", async () => {
        refreshCast.disabled = true;
        try {
          await loadCastDevices();
        } finally {
          refreshCast.disabled = false;
        }
      });
    }
    const openMiot = $("btnOpenMiot");
    if (openMiot) {
      openMiot.addEventListener("click", () => {
        const url = `${location.origin}/api/v1/jsplugin/miot/`;
        const opened = window.open(url, "_blank", "noopener");
        if (!opened) notify(`\u8BF7\u624B\u52A8\u6253\u5F00\uFF1A${url}`, "warn");
      });
    }
    const testCast = $("btnTestCast");
    if (testCast) {
      testCast.addEventListener("click", async () => {
        const cur = get().current;
        if (!cur || cur.songId == null) {
          notify("\u5148\u64AD\u653E\u4E00\u96C6\u518D\u6D4B\u8BD5\u6295\u653E", "warn");
          return;
        }
        testCast.disabled = true;
        try {
          await castToSpeaker(cur.songId, {
            deviceId: selectedDeviceId || void 0,
            forceSingle: true
          });
        } finally {
          testCast.disabled = false;
        }
      });
    }
    const reloadLog = $("btnReloadLog");
    if (reloadLog) reloadLog.addEventListener("click", () => loadLog());
  }

  // ui/lib/episodeMeta.js
  function isPlaceholderTitle(title) {
    const t = String(title || "").trim();
    return !t || t === "Untitled";
  }
  function normalizeFeedUrl(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    try {
      const u = new URL(t);
      u.hash = "";
      if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
        u.pathname = u.pathname.replace(/\/+$/, "");
      }
      return u.toString();
    } catch {
      return t;
    }
  }
  function episodeStorageKey(feedUrl, guid) {
    return `${normalizeFeedUrl(feedUrl)}::${String(guid || "").trim()}`;
  }
  function findEpisodeMeta(subs, feedUrl, guid) {
    const key = episodeStorageKey(feedUrl, guid);
    if (!guid || key.startsWith("::")) return null;
    for (const sub of Array.isArray(subs) ? subs : []) {
      if (!sub) continue;
      const subUrl = sub.url || sub.feedUrl || "";
      for (const ep of sub.episodes || []) {
        if (!ep) continue;
        const epGuid = String(ep.guid || "").trim();
        if (!epGuid) continue;
        if (episodeStorageKey(subUrl, epGuid) !== key) continue;
        const title = !isPlaceholderTitle(ep.title) ? String(ep.title).trim() : void 0;
        return {
          title,
          showTitle: sub.title && String(sub.title).trim() ? String(sub.title).trim() : void 0,
          coverUrl: typeof ep.coverUrl === "string" && ep.coverUrl ? ep.coverUrl : null,
          durationSec: ep.durationSec ?? null,
          subscriptionId: sub.id,
          dedupKey: ep.dedupKey
        };
      }
    }
    return null;
  }
  function enrichHistoryEntry(entry, subs) {
    if (!entry) return entry;
    const meta = findEpisodeMeta(subs, entry.feedUrl, entry.guid);
    if (!meta) return entry;
    const next = { ...entry };
    if (isPlaceholderTitle(next.title) && meta.title) next.title = meta.title;
    if (!(next.showTitle && String(next.showTitle).trim()) && meta.showTitle) {
      next.showTitle = meta.showTitle;
    }
    if (!next.coverUrl && meta.coverUrl) next.coverUrl = meta.coverUrl;
    if ((next.durationSec == null || next.durationSec <= 0) && meta.durationSec) {
      next.durationSec = meta.durationSec;
    }
    return next;
  }

  // ui/lib/historyCover.js
  var HISTORY_COVER_TIMEOUT_MS = 8e3;
  var HISTORY_COVER_ROOT_MARGIN = "80px";
  function channelCoverFromSubs(feedUrl, subs) {
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
    return String(url || "").trim().replace(/\/+$/, "").toLowerCase();
  }
  function letterPlaceholderSource(showTitle, title) {
    const show = String(showTitle || "").trim();
    if (show) return show;
    const ep = String(title || "").trim();
    if (ep) return ep;
    return "?";
  }
  function historyCoverCandidates(input) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of [input && input.coverUrl, input && input.channelCoverUrl]) {
      const abs = absoluteCoverUrl(raw);
      if (!abs || seen.has(abs)) continue;
      seen.add(abs);
      out.push(abs);
    }
    return out;
  }
  function historyCoverHtml(entry, opts = {}) {
    const candidates = historyCoverCandidates({
      coverUrl: entry && entry.coverUrl,
      channelCoverUrl: opts.channelCoverUrl
    });
    const letterSrc = letterPlaceholderSource(entry && entry.showTitle, entry && entry.title);
    const letter = letterSrc.trim().charAt(0).toUpperCase() || "?";
    const color = colorFromString(letterSrc === "?" ? "" : letterSrc);
    const ph = `<div class="cover-ph" style="background:${color}" aria-hidden="true">${escapeHtml(letter)}</div>`;
    if (!candidates.length) return ph;
    return `<img class="ep-cover" src="${escapeHtml(candidates[0])}" alt="" loading="lazy" referrerpolicy="no-referrer" data-history-cover="1" data-cover-candidates="${escapeHtml(JSON.stringify(candidates))}" data-cover-letter="${escapeHtml(letter)}" data-cover-color="${escapeHtml(color)}" />`;
  }
  function uniqueAbsolute(urls) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of urls) {
      const abs = absoluteCoverUrl(raw);
      if (!abs || seen.has(abs)) continue;
      seen.add(abs);
      out.push(abs);
    }
    return out;
  }
  function historyCoverReduce(session, event) {
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
          action: { type: "placeholder" }
        };
      }
      return {
        session: { ...session, index: next },
        action: { type: "set-src", url: session.candidates[next] }
      };
    }
    return { session, action: { type: "ignore" } };
  }
  function historyCoverImageState(img, opts = {}) {
    if (!img) return "pending";
    if ((Number(img.naturalWidth) || 0) > 0) return "loaded";
    if (!isCoverEligibleToLoad(img, opts)) return "pending";
    return "pending";
  }
  function isLazyCoverLoading(img) {
    const loading = img && img.loading != null ? img.loading : img && typeof img.getAttribute === "function" ? img.getAttribute("loading") : "";
    return String(loading || "").toLowerCase() === "lazy";
  }
  function isCoverEligibleToLoad(img, opts) {
    if (opts && opts.eligible === true) return true;
    if (opts && opts.eligible === false) return false;
    return !isLazyCoverLoading(img);
  }
  function bindHistoryCoverRoot(root, opts = {}) {
    const timeoutMs = opts.timeoutMs || HISTORY_COVER_TIMEOUT_MS;
    const rootMargin = opts.rootMargin || HISTORY_COVER_ROOT_MARGIN;
    if (!root || typeof root.querySelectorAll !== "function") return () => {
    };
    const cleanups = [];
    const waiters = /* @__PURE__ */ new WeakMap();
    const Observer = typeof IntersectionObserver === "function" ? IntersectionObserver : null;
    const observer = Observer ? new Observer(
      (entries) => {
        for (const entry of entries) {
          if (!entry || !entry.isIntersecting || !entry.target) continue;
          const fn = waiters.get(entry.target);
          if (!fn) continue;
          waiters.delete(entry.target);
          try {
            observer.unobserve(entry.target);
          } catch {
          }
          try {
            fn();
          } catch {
          }
        }
      },
      { rootMargin }
    ) : null;
    root.querySelectorAll("[data-history-cover]").forEach((img) => {
      cleanups.push(attachHistoryCover(img, timeoutMs, { observer, waiters }));
    });
    return () => {
      if (observer) {
        try {
          observer.disconnect();
        } catch {
        }
      }
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
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
      timeoutMs
    };
    let timer2 = null;
    const stopTimer = () => {
      if (timer2 != null) {
        clearTimeout(timer2);
        timer2 = null;
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
      timer2 = setTimeout(() => apply({ type: "timeout", generation }), timeoutMs);
    };
    const settleOrArm = () => {
      if (session.cancelled) return;
      decodeToken += 1;
      const token = decodeToken;
      const state3 = historyCoverImageState(img, { eligible });
      if (state3 === "loaded") {
        apply({ type: "load", generation });
        return;
      }
      if (!eligible) {
        stopTimer();
        return;
      }
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
      }
    } else if (eligible) {
      settleOrArm();
    }
    return () => {
      decodeToken += 1;
      if (io && io.waiters) io.waiters.delete(img);
      if (io && io.observer) {
        try {
          io.observer.unobserve(img);
        } catch {
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

  // ui/views/history.js
  var COMPLETED_NEAR_END_SEC = 3;
  var query2 = "";
  var filter = "all";
  var selectState3 = { mode: false, keys: /* @__PURE__ */ new Set() };
  var unbindHistoryCovers = null;
  function disposeHistoryCovers() {
    if (typeof unbindHistoryCovers === "function") {
      unbindHistoryCovers();
      unbindHistoryCovers = null;
    }
  }
  function entryKey(entry) {
    return `${entry.feedUrl}::${entry.guid}`;
  }
  function isCompletedEntry(entry) {
    if (entry && entry.completed) return true;
    const pos = Number(entry && entry.positionSec) || 0;
    const dur = Number(entry && entry.durationSec) || 0;
    return dur > 0 && pos >= dur - COMPLETED_NEAR_END_SEC;
  }
  function withEpisodeMeta(entry) {
    return enrichHistoryEntry(entry, getData().subs || []);
  }
  function filtered2(items) {
    let list = (items || []).map(withEpisodeMeta);
    if (filter === "completed") list = list.filter(isCompletedEntry);
    if (query2.trim()) {
      list = list.filter(
        (h) => matchesQuery(h.title, query2) || matchesQuery(h.showTitle, query2)
      );
    }
    return list;
  }
  function toRowItem(entry) {
    const item = withEpisodeMeta(entry);
    return {
      ...item,
      // `progress` drives the badge; history keeps the highest position reached.
      progress: {
        positionSec: item.positionSec || 0,
        durationSec: item.durationSec || null,
        completed: isCompletedEntry(item)
      },
      // Reuse the date column for "played at".
      pubDateMs: item.playedAt || null,
      pubDate: null
    };
  }
  function syncSelectUi2() {
    const bar = $("historySelectBar");
    const del2 = $("btnHistoryDeleteSelected");
    const count = $("historySelectCount");
    const toggle = $("btnHistorySelect");
    setHidden(bar, !selectState3.mode);
    if (del2) del2.disabled = selectState3.keys.size === 0;
    if (count) {
      count.textContent = selectState3.mode ? selectState3.keys.size ? `\u5DF2\u9009 ${selectState3.keys.size} \u6761` : "\u70B9\u9009\u6761\u76EE" : "";
    }
    if (toggle) {
      toggle.classList.toggle("is-on", selectState3.mode);
      toggle.setAttribute("aria-pressed", selectState3.mode ? "true" : "false");
      toggle.title = selectState3.mode ? "\u9000\u51FA\u591A\u9009" : "\u591A\u9009";
      setButtonIcon(toggle, "listChecks", 16);
    }
  }
  function setSelectMode2(on) {
    selectState3.mode = !!on;
    if (!on) selectState3.keys.clear();
    syncSelectUi2();
    renderHistory();
  }
  function syncSearchClear() {
    const clear = $("historySearchClear");
    if (clear) clear.classList.toggle("hidden", !query2.trim());
  }
  function renderHistory() {
    const box = $("historyList");
    if (!box) return;
    disposeHistoryCovers();
    const all = getData().history || [];
    box.classList.remove("is-skeleton");
    if (!all.length) {
      if (box.dataset.bootPending === "1") {
        syncSelectUi2();
        return;
      }
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u6536\u542C\u8BB0\u5F55</div>';
      syncSelectUi2();
      return;
    }
    delete box.dataset.bootPending;
    const items = filtered2(all);
    if (!items.length) {
      box.innerHTML = `<div class="empty">${filter === "completed" && !query2.trim() ? "\u6CA1\u6709\u5DF2\u542C\u5B8C\u7684\u8BB0\u5F55" : "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55"}</div>`;
      syncSelectUi2();
      return;
    }
    const rows = items.map(toRowItem);
    const subs = getData().subs || [];
    const queueIndex = buildQueueIndex(getData().queueSongs);
    box.innerHTML = rows.map((entry, idx) => {
      const key = entryKey(entry);
      const lead = selectState3.mode ? `<input type="checkbox" class="sel-box" data-sel-key="${escapeHtml(key)}" ${selectState3.keys.has(key) ? "checked" : ""} aria-label="\u9009\u62E9" />` : "";
      const queueState = queueButtonState(entry, queueIndex);
      const more = moreMenuHtml(
        [
          {
            key: "queue",
            label: queueState.label,
            iconName: queueState.iconName,
            attrs: queueMenuAttrs(entry, queueIndex, idx)
          },
          { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove-history",
            label: "\u4ECE\u5386\u53F2\u4E2D\u79FB\u9664",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`
          }
        ],
        "history-" + idx
      );
      return episodeRowHtml(entry, idx, {
        // Show "played at" rather than the episode's publish date.
        showDate: true,
        channelLink: true,
        coverHtml: historyCoverHtml(entry, {
          channelCoverUrl: channelCoverFromSubs(entry.feedUrl, subs)
        }),
        leadHtml: lead,
        actions: selectState3.mode ? [] : [
          {
            act: "fav",
            iconName: "star",
            title: "\u6536\u85CF",
            cls: "icon-btn--star",
            attrs: `aria-pressed="${entry.favorited ? "true" : "false"}"`
          }
        ],
        moreHtml: selectState3.mode ? "" : more
      });
    }).join("");
    unbindHistoryCovers = bindHistoryCoverRoot(box);
    if (selectState3.mode) {
      box.querySelectorAll("input[data-sel-key]").forEach((input) => {
        input.addEventListener("click", (ev) => ev.stopPropagation());
        input.addEventListener("change", () => {
          const key = input.getAttribute("data-sel-key");
          if (!key) return;
          if (input.checked) selectState3.keys.add(key);
          else selectState3.keys.delete(key);
          syncSelectUi2();
        });
      });
      box.querySelectorAll("[data-row]").forEach((row) => {
        row.addEventListener("click", (ev) => {
          if (ev.target instanceof Element && ev.target.closest("input")) return;
          const input = row.querySelector("input[data-sel-key]");
          if (!input) return;
          input.checked = !input.checked;
          const key = input.getAttribute("data-sel-key");
          if (!key) return;
          if (input.checked) selectState3.keys.add(key);
          else selectState3.keys.delete(key);
          syncSelectUi2();
        });
      });
      syncSelectUi2();
      return;
    }
    bindRowInteractions(box, rows, {
      "remove-history": async (entry, idx) => {
        const target = rows[idx];
        if (!target) return;
        const ok = await removeHistoryItem(target);
        if (ok) {
          notify("\u5DF2\u4ECE\u5386\u53F2\u4E2D\u79FB\u9664", "ok");
          renderHistory();
        }
      }
    });
    syncSelectUi2();
  }
  var unbindQueueRepaint3 = null;
  function bindHistoryQueueState() {
    if (unbindQueueRepaint3) return;
    unbindQueueRepaint3 = onQueueChange((index) => {
      const box = $("historyList");
      if (!box) return;
      repaintQueueButtons(box, index);
    });
  }
  function bindHistoryToolbar() {
    const clear = $("btnClearHistory");
    if (clear) {
      clear.addEventListener("click", async () => {
        const ok = await clearPlayHistory();
        if (ok) {
          setSelectMode2(false);
          renderHistory();
        }
      });
    }
    const input = $("historySearch");
    const searchClear = $("historySearchClear");
    if (input) {
      input.addEventListener("input", () => {
        query2 = input.value;
        syncSearchClear();
        renderHistory();
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        query2 = "";
        if (input) input.value = "";
        syncSearchClear();
        renderHistory();
      });
    }
    const completedOnly = $("historyCompletedOnly");
    if (completedOnly) {
      completedOnly.checked = filter === "completed";
      completedOnly.setAttribute("aria-checked", completedOnly.checked ? "true" : "false");
      completedOnly.addEventListener("change", () => {
        filter = completedOnly.checked ? "completed" : "all";
        completedOnly.setAttribute("aria-checked", completedOnly.checked ? "true" : "false");
        renderHistory();
      });
    }
    const selectBtn = $("btnHistorySelect");
    if (selectBtn) {
      selectBtn.addEventListener("click", () => setSelectMode2(!selectState3.mode));
    }
    const cancel = $("btnHistorySelectCancel");
    if (cancel) cancel.addEventListener("click", () => setSelectMode2(false));
    const del2 = $("btnHistoryDeleteSelected");
    if (del2) {
      del2.addEventListener("click", async () => {
        const all = getData().history || [];
        const selected = all.filter((h) => selectState3.keys.has(entryKey(h)));
        if (!selected.length) return;
        const ok = await batchDeleteHistoryItems(selected);
        if (ok) {
          setSelectMode2(false);
          renderHistory();
        }
      });
    }
    setHistoryChangeHandler(() => {
      if (!$("tab-history") || $("tab-history").classList.contains("hidden")) return;
      renderHistory();
    });
  }
  async function loadHistoryView() {
    renderHistory();
    await reloadHistory();
    renderHistory();
  }

  // ui/main.js
  var TABS = ["recent", "favorites", "history", "subs", "settings"];
  var activeTab = "recent";
  var bootFeedRefreshStarted = false;
  var SCROLL_IDS = ["recentList", "historyList", "queueList", "subList"];
  function readScrolls() {
    const scrolls = {};
    for (const id of SCROLL_IDS) {
      const el2 = $(id);
      if (el2) scrolls[id] = el2.scrollTop || 0;
    }
    return scrolls;
  }
  function applyScrolls(scrolls) {
    if (!scrolls || typeof scrolls !== "object") return;
    for (const id of SCROLL_IDS) {
      const el2 = $(id);
      const top = Number(scrolls[id]);
      if (el2 && Number.isFinite(top)) el2.scrollTop = top;
    }
  }
  function persistUiCache(extra = {}) {
    saveUiCache({
      ...cacheFromStoreData(getData(), {
        activeTab,
        queueOpen: !!getData().queueOpen,
        scrolls: readScrolls()
      }),
      ...extra
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
    paintRows(get());
    renderQueue();
    if (activeTab === "recent") renderRecent();
    if (activeTab === "history") renderHistory();
    if (activeTab === "favorites") renderFavorites();
    if (activeTab === "subs") renderSubs();
  }
  async function refreshFromHost() {
    const snapshotBeforeReload = {
      recent: (getData().recent || []).slice(),
      history: (getData().history || []).slice(),
      favorites: (getData().favorites || []).slice(),
      subs: (getData().subs || []).slice(),
      queueSongs: (getData().queueSongs || []).slice(),
      queueMeta: getData().queueMeta || null
    };
    await Promise.allSettled([
      reloadQueue(),
      reloadRecent(),
      reloadFavorites(),
      reloadHistory()
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
        hasContent: () => (getData().recent || []).length > 0
      },
      {
        id: "historyList",
        hasContent: () => (getData().history || []).length > 0
      },
      {
        id: "queueList",
        hasContent: () => (getData().queueSongs || []).length > 0
      }
    ];
    return targets.map((t) => {
      const gate = createSkeletonGate({
        delayMs: SKELETON_DELAY_MS,
        hasContent: t.hasContent,
        show: () => {
          const el2 = $(t.id);
          if (!el2 || t.hasContent()) return;
          el2.classList.add("is-skeleton");
          el2.innerHTML = episodeSkeletonHtml(t.id === "queueList" ? 5 : 6);
        }
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
      queueOpen: !!cache.queueOpen
    });
    return true;
  }
  function startConditionalFeedRefresh(cache) {
    if (bootFeedRefreshStarted) return;
    bootFeedRefreshStarted = true;
    const localDue = needsInitialFeedRefresh(cache) || shouldBackgroundFeedRefresh(cache);
    if (!localDue) return;
    void (async () => {
      let schedule = null;
      try {
        const status = await api.status();
        schedule = status && status.schedule ? status.schedule : null;
      } catch (_) {
        schedule = null;
      }
      if (isScheduleFeedFresh(schedule && schedule.lastSuccessAt, schedule && schedule.intervalHours)) {
        if (schedule && schedule.lastSuccessAt) {
          markFeedSynced(schedule.lastSuccessAt);
          persistUiCache({ feedSyncedAt: schedule.lastSuccessAt });
        }
        return;
      }
      if (!shouldBootFeedRefresh(cache, schedule)) return;
      try {
        await requestFeedRefresh({ quietBusy: true });
        markFeedSynced();
        persistUiCache({ feedSyncedAt: Date.now() });
        if (activeTab === "recent") renderRecent();
        if (activeTab === "subs") renderSubs();
      } catch (_) {
      }
    })();
  }
  async function init() {
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
      const el2 = $(id);
      if (el2 && !hadCache) el2.dataset.bootPending = "1";
    }
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
    setProgressCapable(true);
    onChange((snap) => {
      paintRows(snap);
      refreshBackToTopTargets();
    });
    const caps2 = await getCapabilities();
    setCapabilities(caps2);
    if (caps2.available && caps2.hasPlayer) {
      startProgressTracking();
      try {
        applyHostState(await getState());
      } catch (_) {
      }
    } else {
      toast("\u672A\u68C0\u6D4B\u5230\u5BBF\u4E3B\u64AD\u653E\u5668\uFF1B\u5217\u8868\u4ECD\u53EF\u6D4F\u89C8", "warn");
    }
    const loads = [
      ["\u8BA2\u9605\u66F4\u65B0", reloadRecent],
      ["\u6536\u85CF", reloadFavorites],
      ["\u6536\u542C\u5386\u53F2", reloadHistory],
      ["\u8BA2\u9605\u5217\u8868", reloadSubs],
      ["\u64AD\u653E\u5217\u8868", reloadQueue]
    ];
    const snapshotBeforeReload = {
      recent: (getData().recent || []).slice(),
      history: (getData().history || []).slice(),
      favorites: (getData().favorites || []).slice(),
      subs: (getData().subs || []).slice(),
      queueSongs: (getData().queueSongs || []).slice(),
      queueMeta: getData().queueMeta || null
    };
    async function finishSoftReload(results) {
      const failed = results.map((r, i) => r.status === "rejected" ? loads[i][0] : null).filter(Boolean);
      if (failed.length && !hadCache) toast(`\u672A\u80FD\u52A0\u8F7D\uFF1A${failed.join("\u3001")}`, "err");
      const retained = retainNonEmptyLists(getData(), snapshotBeforeReload);
      if (retained.changed) patch(retained.patch);
      skeletonGates.forEach((g) => g.stop());
      for (const id of ["recentList", "historyList", "queueList"]) {
        const el2 = $(id);
        if (el2) delete el2.dataset.bootPending;
      }
      renderAll();
      if (hadCache && cached && cached.scrolls) applyScrolls(cached.scrolls);
      persistUiCache(cached && cached.feedSyncedAt ? { feedSyncedAt: cached.feedSyncedAt } : {});
    }
    if (hadCache) {
      Promise.allSettled(loads.map(([, fn]) => fn())).then((results) => finishSoftReload(results)).catch(() => {
        skeletonGates.forEach((g) => g.stop());
      });
    } else {
      const results = await Promise.allSettled(loads.map(([, fn]) => fn()));
      await finishSoftReload(results);
    }
    startConditionalFeedRefresh(cached);
    startDataSync(refreshFromHost);
    setTimeout(() => {
      refreshFromHost().catch(() => {
      });
    }, 1500);
    try {
      const wanted = new URLSearchParams(location.search).get("tab");
      if (wanted && TABS.includes(wanted)) switchTab(wanted);
    } catch (_) {
    }
    window.addEventListener("pagehide", () => persistUiCache());
  }
  init().catch((e) => {
    toast("\u754C\u9762\u521D\u59CB\u5316\u5931\u8D25\uFF1A" + (e && e.message || e), "err");
  });
})();
