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
  function hydrateIconSlots(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-icon]").forEach((el2) => {
      const name = el2.getAttribute("data-icon");
      const size = Number(el2.getAttribute("data-size")) || 16;
      el2.insertAdjacentHTML("afterbegin", icon(name, size));
    });
  }

  // ui/lib/modal.js
  var modalRoot = null;
  var modalResolve = null;
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
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    dialog.classList.remove("modal--wide", "modal--sheet");
    const done = modalResolve;
    modalResolve = null;
    if (done) done(result);
  }
  function openModal(opts = {}) {
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
    const actions = opts.actions || [{ label: "\u5173\u95ED", value: void 0, close: true }];
    for (const action of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      const kind = action.kind || "ghost";
      btn.className = kind === "primary" ? "btn btn--primary" : kind === "danger" ? "btn btn--danger" : kind === "tonal" ? "btn btn--tonal" : "btn btn--ghost";
      btn.innerHTML = (action.iconName ? icon(action.iconName, 15) : "") + `<span>${escapeHtml(action.label)}</span>`;
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

  // ui/lib/toast.js
  var timer = null;
  var el = null;
  function ensure() {
    if (el && el.isConnected) return el;
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
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
  async function seek(seconds) {
    return requirePlayer().seek(Number(seconds));
  }
  async function replaceQueueAndPlay(songIds, startIndex) {
    return requirePlayer().setQueue(
      songIds.map(Number),
      { startIndex: startIndex || 0 }
    );
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
    hostSongId: null
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
    getEpisodes: (id) => get2(`/api/subscriptions/${enc(id)}/episodes`),
    refreshOne: (id) => post(`/api/subscriptions/${enc(id)}/refresh`, {}),
    refreshAll: () => post("/api/refresh", {}),
    deleteSubscription: (id) => del(`/api/subscriptions/${enc(id)}`),
    updateSubscriptionUrl: (id, url) => put(`/api/subscriptions/${enc(id)}`, { url }),
    prepare: (body) => post("/api/episodes/prepare", body),
    queue: () => get2("/api/queue"),
    queueAdd: (body) => post("/api/queue/add", body),
    queueAddShow: (subscriptionId) => post("/api/queue/add-show", { subscriptionId }),
    queueRemove: (songIds) => post("/api/queue/remove", { songIds }),
    queueRemovePlayed: () => post("/api/queue/remove-played", {}),
    queueMove: (songId, direction) => post("/api/queue/move", { songId, direction }),
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
    castMiotPlaylist: (playlistId, deviceId) => post("/api/cast/miot-playlist", deviceId ? { deviceId } : {}),
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
  function subscribe(fn) {
    listeners2.add(fn);
    return () => listeners2.delete(fn);
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
    try {
      const r = await api.queue();
      if (!r.ok) {
        patch({ queueSongs: [], queueMeta: null });
        return getData();
      }
      patch({
        queueSongs: r.songs || [],
        queueMeta: { playlistId: r.playlistId, playlistName: r.playlistName }
      });
    } catch (e) {
      patch({ queueSongs: [], queueMeta: null });
      notify("\u8BFB\u53D6\u64AD\u653E\u5217\u8868\u5931\u8D25\uFF08\u9700\u5BBF\u4E3B playlists \u6743\u9650\uFF09", "warn");
    }
    return getData();
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
  async function resumeCurrentIfSame(songId) {
    const snap = get();
    if (songId != null && snap.current && snap.current.songId === songId && ["paused", "ended", "playing"].includes(snap.phase)) {
      await play();
      const st = await getState();
      applyHostState(st);
      return true;
    }
    return false;
  }
  async function playEpisode(ep, opts = {}) {
    if (!caps.available || !caps.hasPlayer) {
      notify("\u5BBF\u4E3B\u64AD\u653E\u5668\u4E0D\u53EF\u7528", "warn");
      return;
    }
    let songId = ep.songId;
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
      if (songId && !opts.forcePrepare && await resumeCurrentIfSame(songId)) {
        notify("\u7EE7\u7EED\u64AD\u653E\u5F53\u524D\u5355\u96C6", "ok");
        return;
      }
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
      const snap0 = get();
      let resumeAt = 0;
      const wantResume = opts.resume === true || snap0.current && snap0.current.songId === songId && snap0.positionSec > 5 && snap0.phase !== "ended";
      if (wantResume) {
        if (snap0.progressCapable && snap0.positionSec > 5 && snap0.current?.songId === songId) {
          resumeAt = snap0.positionSec;
        } else if (ctx.feedUrl && ctx.guid && ctx.guidSource !== "enclosure") {
          try {
            const pr = await api.getProgressOne(ctx.feedUrl, ctx.guid);
            if (pr && pr.ok && pr.progress && pr.progress.positionSec > 5 && !pr.progress.completed) {
              resumeAt = pr.progress.positionSec;
            }
          } catch (_) {
          }
        }
      }
      beginPlayRequest({ ...ctx, songId });
      await play(songId);
      notify(`\u6B63\u5728\u64AD\u653E\u300C${ctx.title || "\u5F53\u524D\u5355\u96C6"}\u300D`, "ok");
      const ok = await syncPlayStateAfterRequest(songId);
      if (!ok) {
        playFailed("\u64AD\u653E\u672A\u786E\u8BA4\u6210\u529F\uFF08\u5BBF\u4E3B\u672A\u56DE\u62A5\u8BE5\u66F2\u72B6\u6001\uFF09");
        notify("\u64AD\u653E\u672A\u786E\u8BA4\u6210\u529F\u3002\u8BF7\u786E\u8BA4\u5728 Songloft \u5BA2\u6237\u7AEF\u5185\u6253\u5F00\u3002", "err");
        return;
      }
      if (resumeAt > 5) {
        let seekOk = false;
        try {
          const st = await getState();
          if (st && st.current_song && st.current_song.id === songId) {
            if (typeof st.current_time !== "number") {
              setProgressCapable(false);
            } else {
              await seek(resumeAt);
              const st2 = await getState();
              applyHostState(st2);
              seekOk = st2 && typeof st2.current_time === "number" && Math.abs(st2.current_time - resumeAt) < 15;
            }
          }
        } catch (_) {
          seekOk = false;
        }
        notify(seekOk ? "\u5DF2\u4ECE\u4E0A\u6B21\u4F4D\u7F6E\u7EE7\u7EED\u6536\u542C" : "\u672A\u80FD\u53EF\u9760\u7EED\u542C\uFF0C\u5DF2\u4ECE\u7247\u5934\u9644\u8FD1\u5F00\u59CB", seekOk ? "ok" : "warn");
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
      if (!getData().queueSongs.some((s) => s.id === songId)) {
        api.queueAddIds([songId]).then((r) => {
          if (r && r.ok && (r.added || 0) > 0) {
            notify("\u5DF2\u52A0\u5165\u300C\u64AD\u5BA2\u300D\u64AD\u653E\u5217\u8868", "ok");
          }
          return reloadQueue();
        }).catch(() => {
          notify("\u672A\u80FD\u81EA\u52A8\u52A0\u5165\u64AD\u653E\u5217\u8868\uFF0C\u53EF\u624B\u52A8\u300C\u52A0\u5165\u64AD\u653E\u5217\u8868\u300D", "warn");
        });
      }
    } catch (e) {
      playFailed(String(e && e.message || e));
      notify(String(e && e.message || e), "err");
    }
  }
  async function togglePlayPause() {
    const snap = get();
    const cur = snap.current;
    try {
      if (snap.phase === "playing") {
        await pause();
        try {
          applyHostState(await getState());
        } catch (_) {
        }
        await flushProgress();
        return;
      }
      if (cur && cur.songId) {
        if (await resumeCurrentIfSame(cur.songId)) return;
        await playEpisode({ ...cur, songId: cur.songId }, { resume: true });
        return;
      }
      const first = getData().queueSongs[0];
      if (!first) {
        notify("\u6CA1\u6709\u53EF\u64AD\u653E\u7684\u5185\u5BB9", "warn");
        return;
      }
      await playEpisode({
        title: first.title,
        songId: first.id,
        showTitle: first.album || "",
        feedUrl: first.feedUrl || "",
        guid: first.guid || "",
        subscriptionId: first.subscriptionId || "",
        coverUrl: first.coverUrl || first.cover_url || null,
        durationSec: first.duration || null
      });
    } catch (e) {
      notify(String(e), "err");
    }
  }
  async function addToQueue(ep) {
    try {
      const r = await api.queueAdd({
        subscriptionId: ep.subscriptionId,
        guid: ep.guid,
        dedupKey: ep.dedupKey
      });
      if (!r.ok) {
        notify(r.error || "\u52A0\u5165\u64AD\u653E\u5217\u8868\u5931\u8D25\uFF08\u51C6\u5907\u97F3\u9891\uFF09", "err");
        return;
      }
      const name = r.playlistName || "\u64AD\u5BA2";
      const bits = [];
      if (r.added > 0) bits.push(`\u5DF2\u5C06\u300A${shortTitle(ep.title)}\u300B\u52A0\u5165\u64AD\u653E\u5217\u8868\u300C${name}\u300D`);
      else if (r.skipped > 0) bits.push(`\u300A${shortTitle(ep.title)}\u300B\u5DF2\u5728\u64AD\u653E\u5217\u8868\u300C${name}\u300D\u4E2D`);
      else bits.push(`\u672A\u80FD\u52A0\u5165\u64AD\u653E\u5217\u8868\u300C${name}\u300D`);
      notify(bits.join(""), r.added > 0 ? "ok" : "warn");
      await reloadQueue();
    } catch (e) {
      notify(String(e), "err");
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
      body = `<p>\u4E00\u952E\u6295\u653E\u901A\u8FC7\u300C\u667A\u80FD\u97F3\u7BB1\u300D\u63D2\u4EF6\uFF08entryPath <code>miot</code>\uFF09\u628A\u5355\u96C6 URL \u63A8\u7ED9\u97F3\u7BB1\u3002</p><p class="muted">\u8BF7\u5148\u5728 Songloft \u7684\u63D2\u4EF6\u5E02\u573A\u5B89\u88C5\uFF0C\u5E76\u786E\u8BA4\u8BE5\u63D2\u4EF6\u5DF2\u542F\u7528\u3002</p>` + (errorText ? `<p class="muted">${escapeHtml(errorText)}</p>` : "");
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
      notify("\u6B63\u5728\u6295\u653E\u5230\u5C0F\u7231\u97F3\u7BB1\u2026", "muted");
      const r = await api.castMiot(id, opts.deviceId);
      if (r && r.ok) {
        notify(`\u5DF2\u6295\u653E\u5230${r.deviceName ? `\u300C${r.deviceName}\u300D` : "\u5C0F\u7231\u97F3\u7BB1"}`, "ok");
        return;
      }
      if (r && (r.reason === "miot_unavailable" || r.reason === "miot_no_device" || r.reason === "miot_device_offline")) {
        clearToast();
        await castUnavailableDialog(r.reason, r.error);
        return;
      }
      notify(r && r.error || "\u6295\u653E\u5931\u8D25", "err");
    } catch (e) {
      notify(String(e && e.message || e), "err");
    }
  }
  async function castQueueToSpeaker(opts = {}) {
    const data2 = getData();
    if (!data2.queueSongs.length) {
      notify("\u64AD\u653E\u5217\u8868\u4E3A\u7A7A\uFF0C\u5148\u6DFB\u52A0\u51E0\u96C6\u518D\u6295\u653E", "warn");
      return;
    }
    try {
      notify(`\u6B63\u5728\u628A ${data2.queueSongs.length} \u96C6\u63A8\u9001\u5230\u97F3\u7BB1\u2026`, "muted");
      const r = await api.castMiotPlaylist(null, opts.deviceId);
      if (r && r.ok) {
        notify(
          `\u5DF2\u6295\u653E\u5230${r.deviceName ? `\u300C${r.deviceName}\u300D` : "\u5C0F\u7231\u97F3\u7BB1"}\uFF1A${r.count} \u96C6\u6392\u961F\u64AD\u653E`,
          "ok"
        );
        return;
      }
      if (r && (r.reason === "miot_unavailable" || r.reason === "miot_no_device" || r.reason === "miot_device_offline")) {
        clearToast();
        await castUnavailableDialog(r.reason, r.error);
        return;
      }
      notify(r && r.error || "\u6295\u653E\u5931\u8D25", "err");
    } catch (e) {
      notify(String(e && e.message || e), "err");
    }
  }
  async function removeSongs(songIds) {
    if (!songIds || !songIds.length) return { ok: false };
    const before = getData().queueSongs || [];
    const drop = new Set(songIds.map(Number));
    try {
      const r = await api.queueRemove(songIds);
      if (!r.ok) {
        notify(r.error || "\u79FB\u9664\u5931\u8D25", "err");
        return r;
      }
      patch({
        queueSongs: before.filter((s) => !drop.has(s.id)),
        queueMeta: getData().queueMeta
      });
      await reloadQueue();
      return r;
    } catch (e) {
      notify(String(e), "err");
      return { ok: false, error: String(e) };
    }
  }
  async function clearQueue() {
    const data2 = getData();
    if (!data2.queueSongs.length) {
      notify("\u64AD\u653E\u5217\u8868\u5DF2\u7A7A", "muted");
      return;
    }
    const ok = await uiConfirm({
      title: "\u6E05\u7A7A\u64AD\u653E\u5217\u8868",
      message: `\u5C06\u6E05\u7A7A\u56FA\u5B9A\u6B4C\u5355\u300C${data2.queueMeta ? data2.queueMeta.playlistName : "\u64AD\u5BA2"}\u300D\u4E2D\u7684 ${data2.queueSongs.length} \u9996\uFF0C\u4E0D\u4F1A\u5220\u9664\u8FDC\u7A0B\u97F3\u9891\u6587\u4EF6\u3002`,
      okText: "\u6E05\u7A7A",
      danger: true
    });
    if (!ok) return;
    try {
      const r = await api.queueClear();
      if (!r.ok) {
        notify(r.error || "\u6E05\u7A7A\u5931\u8D25", "err");
        return;
      }
      patch({ queueSongs: [], queueMeta: getData().queueMeta });
      notify(`\u5DF2\u6E05\u7A7A ${r.removed} \u9996`, "ok");
      await reloadQueue();
    } catch (e) {
      notify(String(e), "err");
    }
  }
  async function removePlayed() {
    try {
      const r = await api.queueRemovePlayed();
      if (!r.ok) {
        notify(r.error || "\u79FB\u9664\u5DF2\u64AD\u653E\u5931\u8D25", "err");
        return;
      }
      if (!r.removed) {
        notify("\u6CA1\u6709\u5DF2\u542C\u5B8C\u7684\u8282\u76EE", "muted");
        return;
      }
      notify(`\u5DF2\u79FB\u9664 ${r.removed} \u9996\u5DF2\u542C\u5B8C\u7684\u8282\u76EE`, "ok");
      await reloadQueue();
    } catch (e) {
      notify(String(e), "err");
    }
  }
  async function replaceQueueAndPlay2() {
    const data2 = getData();
    if (!data2.queueSongs.length) {
      notify("\u64AD\u653E\u5217\u8868\u4E3A\u7A7A", "warn");
      return;
    }
    const ok = await uiConfirm({
      title: "\u66FF\u6362\u5E76\u64AD\u653E",
      message: "\u5C06\u7528\u300C\u64AD\u5BA2\u300D\u6B4C\u5355\u66FF\u6362\u5BBF\u4E3B\u5F53\u524D\u64AD\u653E\u961F\u5217\u5E76\u5F00\u59CB\u64AD\u653E\uFF0C\u73B0\u6709\u961F\u5217\u4F1A\u88AB\u8986\u76D6\u3002",
      okText: "\u66FF\u6362\u5E76\u64AD\u653E"
    });
    if (!ok) return;
    try {
      await replaceQueueAndPlay(
        data2.queueSongs.map((s) => s.id),
        0
      );
      notify("\u5DF2\u66FF\u6362\u5BBF\u4E3B\u961F\u5217\u5E76\u5F00\u59CB\u64AD\u653E", "ok");
    } catch (e) {
      notify(String(e), "err");
    }
  }
  async function reorderQueue(songIds) {
    try {
      const r = await api.queueReorder(songIds);
      if (!r.ok) notify(r.error || "\u6392\u5E8F\u5931\u8D25", "err");
      await reloadQueue();
    } catch (e) {
      notify(String(e), "err");
    }
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

  // ui/views/player-bar.js
  var seeking = false;
  var uiTickTimer = null;
  var lastHostSyncAt = 0;
  var scrubCommitToken = 0;
  var coverCache = /* @__PURE__ */ new Map();
  function rememberCover(songId, url) {
    const abs = absoluteCoverUrl(url);
    if (songId == null || !abs) return;
    const key = Number(songId);
    if (!Number.isFinite(key)) return;
    if (coverCache.get(key) !== abs) coverCache.set(key, abs);
  }
  function primeCoverCache() {
    const data2 = getData();
    for (const s of data2.queueSongs || []) rememberCover(s.id, s.coverUrl || s.cover_url);
    for (const ep of data2.recent || []) rememberCover(ep.songId, ep.coverUrl);
    for (const ep of data2.favorites || []) rememberCover(ep.songId, ep.coverUrl);
    for (const ep of data2.episodes || []) rememberCover(ep.songId, ep.coverUrl);
  }
  function resolveCover(cur) {
    if (!cur) return "";
    const songId = cur.songId != null ? Number(cur.songId) : null;
    if (songId != null && coverCache.has(songId)) return coverCache.get(songId);
    const fromCurrent = absoluteCoverUrl(cur.coverUrl);
    if (fromCurrent) {
      if (songId != null) coverCache.set(songId, fromCurrent);
      return fromCurrent;
    }
    const song = (getData().queueSongs || []).find((x) => x.id === songId);
    const fromQueue = absoluteCoverUrl(song && (song.coverUrl || song.cover_url));
    if (fromQueue) {
      if (songId != null) coverCache.set(songId, fromQueue);
      return fromQueue;
    }
    return "";
  }
  var coverSongId = null;
  var coverRetryTimer = null;
  function placeholderCover() {
    const el2 = document.createElement("div");
    el2.id = "playerCover";
    el2.className = "player__cover placeholder";
    el2.textContent = "";
    return el2;
  }
  function setCover(url, songId) {
    const abs = absoluteCoverUrl(url);
    const sameSong = songId != null && Number(songId) === coverSongId;
    if (songId != null) coverSongId = Number(songId);
    if (!abs) {
      if (sameSong) return;
      const existing2 = $("playerCover");
      if (existing2 && existing2.tagName === "IMG") existing2.replaceWith(placeholderCover());
      return;
    }
    const existing = $("playerCover");
    if (existing && existing.tagName === "IMG") {
      if (existing.getAttribute("src") !== abs) {
        mountCover(abs, existing);
      }
      return;
    }
    mountCover(abs, existing);
  }
  function mountCover(abs, existing) {
    const img = document.createElement("img");
    img.id = "playerCover";
    img.className = "player__cover";
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => onCoverError(abs, img);
    img.src = abs;
    if (existing) existing.replaceWith(img);
  }
  function onCoverError(abs, img) {
    if (!img || !img.isConnected) return;
    img.replaceWith(placeholderCover());
    if (coverRetryTimer) clearTimeout(coverRetryTimer);
    coverRetryTimer = setTimeout(() => {
      if (coverSongId == null) return;
      const current = get().current;
      if (!current || Number(current.songId) !== coverSongId) return;
      const retryUrl = coverCache.get(coverSongId);
      if (!retryUrl) return;
      const node = $("playerCover");
      if (node && node.tagName === "IMG") return;
      mountCover(retryUrl, node);
    }, 2500);
  }
  function resetCover() {
    coverSongId = null;
    if (coverRetryTimer) {
      clearTimeout(coverRetryTimer);
      coverRetryTimer = null;
    }
    const existing = $("playerCover");
    if (existing && existing.tagName === "IMG") existing.replaceWith(placeholderCover());
  }
  function bindCoverCache() {
    subscribe(() => primeCoverCache());
    primeCoverCache();
  }
  function setProgressUi(pos, dur) {
    const posEl = $("playerPos");
    const durEl = $("playerDur");
    const seek2 = $("playerSeek");
    const line = $("playerLine");
    const ratio = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
    const pct = `${(ratio * 100).toFixed(2)}%`;
    if (line) line.style.setProperty("--p", pct);
    if (posEl) posEl.textContent = fmtSec(pos);
    if (durEl) durEl.textContent = dur > 0 ? fmtSec(dur) : "\u2014";
    if (seek2) {
      seek2.disabled = !(dur > 0);
      if (!seeking) seek2.value = String(Math.round(ratio * 1e3));
    }
  }
  function ensureUiTick(phase) {
    if (phase === "playing") {
      if (uiTickTimer != null) return;
      uiTickTimer = setInterval(async () => {
        if (seeking) return;
        const snap = get();
        if (snap.phase !== "playing") {
          clearInterval(uiTickTimer);
          uiTickTimer = null;
          return;
        }
        const now = Date.now();
        if (now - lastHostSyncAt > 2e3) {
          lastHostSyncAt = now;
          try {
            applyHostState(await getState());
            return;
          } catch (_) {
          }
        }
        const dur = typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
        setProgressUi(livePositionSec(snap), dur);
      }, 250);
      return;
    }
    if (uiTickTimer != null) {
      clearInterval(uiTickTimer);
      uiTickTimer = null;
    }
  }
  function renderPlayerBar(snap) {
    const bar = $("playerBar");
    if (!bar) return;
    const cur = snap.current;
    const titleEl = $("playerTitle");
    const subEl = $("playerSub");
    const playBtn = $("btnPlayPause");
    const dur = typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
    const pos = seeking ? (() => {
      const seek2 = $("playerSeek");
      return dur > 0 && seek2 ? Number(seek2.value) / 1e3 * dur : livePositionSec(snap);
    })() : livePositionSec(snap);
    if (!cur) {
      bar.classList.add("is-empty");
      titleEl.textContent = "\u5C1A\u672A\u64AD\u653E";
      subEl.textContent = "";
      seeking = false;
      setProgressUi(0, 0);
      ensureUiTick("idle");
      playBtn.innerHTML = icon("play", 20);
      playBtn.title = "\u64AD\u653E";
      resetCover();
      $("btnPlayerCast").disabled = true;
      return;
    }
    bar.classList.remove("is-empty");
    titleEl.textContent = cur.title || "\u672A\u547D\u540D";
    const bits = [];
    if (cur.showTitle) bits.push(cur.showTitle);
    if (snap.error) bits.push(snap.error);
    else if (snap.hostHint) bits.push(snap.hostHint);
    subEl.textContent = bits.join(" \xB7 ");
    setProgressUi(pos, dur);
    ensureUiTick(snap.phase);
    if (snap.phase === "playing") {
      playBtn.innerHTML = icon("pause", 20);
      playBtn.title = "\u6682\u505C";
    } else {
      playBtn.innerHTML = icon("play", 20);
      playBtn.title = snap.phase === "paused" || snap.phase === "ended" ? "\u7EE7\u7EED" : "\u64AD\u653E";
    }
    const song = getData().queueSongs.find((x) => x.id === cur.songId);
    setCover(resolveCover(cur) || song && (song.coverUrl || song.cover_url), cur.songId);
    $("btnPlayerCast").disabled = cur.songId == null;
  }
  function bindPlayerBar() {
    const seek2 = $("playerSeek");
    if (seek2) {
      const endScrub = () => {
        seeking = false;
      };
      const commit = async () => {
        const token = ++scrubCommitToken;
        const snap = get();
        const dur = snap.durationSec;
        if (!(dur > 0)) {
          endScrub();
          return;
        }
        const next = Number(seek2.value) / 1e3 * dur;
        setPhase(snap.phase === "playing" ? "playing" : snap.phase || "paused", {
          positionSec: next
        });
        endScrub();
        try {
          await seek(next);
          if (token !== scrubCommitToken) return;
          applyHostState(await getState());
          await flushProgress({ seek: true });
        } catch (e) {
          if (token !== scrubCommitToken) return;
          notify(String(e), "err");
          try {
            applyHostState(await getState());
          } catch (_) {
          }
        }
      };
      seek2.addEventListener("pointerdown", (ev) => {
        seeking = true;
        try {
          seek2.setPointerCapture(ev.pointerId);
        } catch (_) {
        }
      });
      seek2.addEventListener("pointerup", commit);
      seek2.addEventListener("pointercancel", endScrub);
      seek2.addEventListener("lostpointercapture", () => {
        if (seeking) endScrub();
      });
      seek2.addEventListener("change", commit);
      seek2.addEventListener("input", () => {
        seeking = true;
        const snap = get();
        const dur = typeof snap.durationSec === "number" && snap.durationSec > 0 ? snap.durationSec : 0;
        if (!(dur > 0)) return;
        const pos = Number(seek2.value) / 1e3 * dur;
        setProgressUi(pos, dur);
      });
    }
    $("btnPlayPause").addEventListener("click", () => togglePlayPause());
    $("btnSeekBack").addEventListener("click", async () => {
      const snap = get();
      try {
        await seek(Math.max(0, (snap.positionSec || 0) - 15));
        applyHostState(await getState());
        await flushProgress({ seek: true });
      } catch (e) {
        notify(String(e), "err");
      }
    });
    $("btnSeekFwd").addEventListener("click", async () => {
      const snap = get();
      const dur = snap.durationSec;
      const next = dur && dur > 0 ? Math.min(dur, (snap.positionSec || 0) + 15) : (snap.positionSec || 0) + 15;
      try {
        await seek(next);
        applyHostState(await getState());
        await flushProgress({ seek: true });
      } catch (e) {
        notify(String(e), "err");
      }
    });
    $("btnPlayerCast").addEventListener("click", () => {
      const cur = get().current;
      if (!cur || cur.songId == null) {
        notify("\u6CA1\u6709\u6B63\u5728\u64AD\u653E\u7684\u5355\u96C6", "warn");
        return;
      }
      castToSpeaker(cur.songId);
    });
    const meta = $("playerMeta");
    if (meta) {
      meta.addEventListener("click", () => {
        const bar = $("playerBar");
        if (bar.classList.contains("is-collapsed")) bar.classList.remove("is-collapsed");
        bar.classList.toggle("is-expanded");
        meta.setAttribute(
          "title",
          bar.classList.contains("is-expanded") ? "\u6536\u8D77\u64AD\u653E\u63A7\u5236" : "\u5C55\u5F00\u64AD\u653E\u63A7\u5236"
        );
      });
    }
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
      return `<img class="${klass}" src="${escapeHtml(abs)}" alt="" loading="lazy" data-cover />`;
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
    const headGrid = lead ? "ep-head q-head" : "ep-head";
    const channelAttr = opts.channelLink ? `data-channel-tap data-idx="${idx}"` : "";
    const cover = opts.channelLink ? `<button type="button" class="cover-btn" ${channelAttr} title="\u67E5\u770B\u9891\u9053">` + coverHtml(ep.coverUrl, ep.title || ep.showTitle) + `</button>` : coverHtml(ep.coverUrl, ep.title || ep.showTitle);
    const showName = ep.showTitle ? opts.channelLink ? `<button type="button" class="channel-link" ${channelAttr}>${escapeHtml(ep.showTitle)}</button>` : `<span>${escapeHtml(ep.showTitle)}</span>` : "";
    const actions = (opts.actions || []).map(
      (a) => `<button type="button" class="icon-btn ${a.cls || ""}" data-act="${a.act}" data-idx="${idx}" title="${escapeHtml(a.title)}" ${a.attrs || ""}>${icon(a.iconName, 17)}</button>`
    ).join("");
    return `<div class="ep-row${isCurrent ? " is-current" : ""}${opts.extraClass ? " " + opts.extraClass : ""}" data-row data-idx="${idx}" ${rowDataset(ep)}><div class="${headGrid}">` + lead + cover + `<div><button type="button" class="ep-title--tap" data-title-tap data-idx="${idx}" title="\u67E5\u770B\u8BE6\u60C5">${escapeHtml(ep.title || "\u672A\u547D\u540D")}</button><div class="meta-line">` + showName + `<span data-now-badge ${isCurrent && label ? "" : "hidden"}>${escapeHtml(isCurrent ? label : "")}</span><span data-prog-slot>${progressBadgeHtml(prog, ep.durationSec)}</span>` + (showDate ? `<span class="hide-sm">${escapeHtml(fmtTime(dateMs))}</span>` : "") + `</div></div></div><div class="actions-row"><button type="button" class="icon-btn icon-btn--primary" data-play-btn data-idx="${idx}" title="\u64AD\u653E">${icon(playIcon, 17)}</button>` + actions + (opts.moreHtml || "") + `</div></div>`;
  }
  function moreMenuHtml(items, wrapKey) {
    const body = items.map((it) => {
      if (it.disabled) {
        return `<button type="button" disabled>` + (it.iconName ? icon(it.iconName, 15) : "") + `<span>${escapeHtml(it.label)}</span></button>`;
      }
      return `<button type="button" class="${it.danger ? "danger-text" : ""}" data-more-act="${escapeHtml(
        it.key
      )}" ${it.attrs || ""}>` + (it.iconName ? icon(it.iconName, 15) : "") + `<span>${escapeHtml(it.label)}</span></button>`;
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
        playBtn.innerHTML = icon(iconName, 17);
        playBtn.title = isCurrent && current.phase === "playing" ? "\u6682\u505C" : isCurrent ? "\u7EE7\u7EED" : "\u64AD\u653E";
      }
      const slot = row.querySelector("[data-prog-slot]");
      if (!slot) return;
      const dur = Number(row.getAttribute("data-duration")) || null;
      const base = readRowProgress(row);
      const prog = isCurrent ? liveProgressFor({ id: songId, progress: base, duration: dur }, current) : base;
      if (prog || dur) slot.innerHTML = progressBadgeHtml(prog, dur);
    });
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
  function escapeAttr(value) {
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
        out.push(`<img src="${escapeAttr(src.trim())}" alt="${escapeAttr(alt)}" loading="lazy" />`);
        continue;
      }
      if (name === "a") {
        const href = readAttr(part.attrs, "href");
        if (!isSafeHttpUrl(href)) {
          out.push("<span>");
          continue;
        }
        out.push(
          `<a href="${escapeAttr(href.trim())}" target="_blank" rel="noopener noreferrer nofollow">`
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
  async function openShowNote(ep) {
    if (!ep) return;
    context = ep;
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
    openModal({
      title: "",
      body,
      size: "wide",
      actions: [
        {
          label: "\u64AD\u653E",
          kind: "primary",
          iconName: "play",
          close: true,
          onClick: () => {
            playEpisode(episodePayload(ep));
          }
        },
        {
          label: "\u52A0\u5165\u64AD\u653E\u5217\u8868",
          kind: "tonal",
          iconName: "listPlus",
          close: true,
          onClick: () => addToQueue(ep)
        },
        {
          label: "\u6295\u653E\u5230\u97F3\u7BB1",
          kind: "ghost",
          iconName: "speaker",
          close: true,
          onClick: () => castToSpeaker(ep.songId, { prepareIfMissing: ep })
        },
        {
          label: ep.favorited ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF",
          kind: "ghost",
          iconName: "star",
          close: true,
          onClick: () => toggleFavorite(ep, null)
        }
      ]
    });
    const snBody = body.querySelector("#snBody");
    if (snBody) snBody.scrollTop = 0;
  }

  // ui/views/channel-dialog.js
  var BATCH_SIZE = 20;
  var state2 = {
    modal: null,
    subId: "",
    title: "",
    episodes: [],
    rendered: 0,
    busy: false,
    done: false
  };
  function footer(count) {
    return `<div class="ep-batch-status muted" id="epBatchStatus">\u5DF2\u663E\u793A ${count} \u96C6</div>`;
  }
  function renderNextBatch(body) {
    const list = body.querySelector("#channelEpList");
    const status = body.querySelector("#epBatchStatus");
    if (!list || state2.done) return;
    const slice = state2.episodes.slice(state2.rendered, state2.rendered + BATCH_SIZE);
    if (!slice.length) {
      state2.done = true;
      if (status) status.textContent = `\u5171 ${state2.episodes.length} \u96C6`;
      return;
    }
    const startIdx = state2.rendered;
    const html = slice.map((ep, i) => {
      const idx = startIdx + i;
      return episodeRowHtml(ep, idx, {
        showDate: true,
        actions: [
          { act: "queue", iconName: "listPlus", title: "\u52A0\u5165\u64AD\u653E\u5217\u8868" },
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
    state2.rendered += slice.length;
    if (status) {
      status.textContent = state2.rendered >= state2.episodes.length ? `\u5171 ${state2.episodes.length} \u96C6` : `\u5DF2\u663E\u793A ${state2.rendered} / ${state2.episodes.length} \u96C6`;
    }
  }
  function fillToScroll(body) {
    const list = body.querySelector("#channelEpList");
    if (!list) return;
    let guard = 0;
    while (!state2.done && list.scrollHeight <= list.clientHeight + 8 && guard < 50) {
      const before = state2.rendered;
      renderNextBatch(body);
      guard++;
      if (state2.rendered === before) break;
    }
  }
  async function openChannelDialog(subId) {
    if (!subId) return;
    state2 = {
      modal: null,
      subId,
      title: "",
      episodes: [],
      rendered: 0,
      busy: true,
      done: false
    };
    const body = document.createElement("div");
    body.className = "channel-dialog";
    body.innerHTML = `<div class="channel-dialog__head"><div class="channel-dialog__title" id="channelTitle">\u5267\u96C6</div><div class="channel-dialog__actions"><button type="button" class="chip-btn" id="channelRefresh" title="\u91CD\u65B0\u62C9\u53D6\u8BE5\u9891\u9053\u7684\u5267\u96C6\u7D22\u5F15"><span data-icon="rotateCcw" data-size="14"></span><span>\u5237\u65B0</span></button><button type="button" class="btn btn--tonal btn--sm" id="channelAddAll">\u5168\u90E8\u52A0\u5165\u64AD\u653E\u5217\u8868</button></div></div><div class="ep-list channel-dialog__list" id="channelEpList"></div>` + footer(0);
    const list = body.querySelector("#channelEpList");
    list.innerHTML = '<div class="empty">\u52A0\u8F7D\u4E2D\u2026</div>';
    hydrateIconSlots(body);
    openModal({
      title: "",
      body,
      size: "wide",
      actions: [{ label: "\u5173\u95ED", kind: "ghost", close: true }]
    });
    body.querySelector("#channelAddAll").addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      try {
        const r = await api.queueAddShow(subId);
        notify(r.ok ? `\u5DF2\u8FFD\u52A0 ${r.added} \u9996` : r.error || "\u52A0\u5165\u5931\u8D25", r.ok ? "ok" : "err");
      } finally {
        btn.disabled = false;
      }
    });
    body.querySelector("#channelRefresh").addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      list.innerHTML = '<div class="empty">\u6B63\u5728\u5237\u65B0\u8BE5\u9891\u9053\u2026</div>';
      try {
        const r = await api.refreshOne(subId);
        notify(
          r && r.ok ? "\u5DF2\u5237\u65B0\u8BE5\u9891\u9053" : r && r.error || "\u5237\u65B0\u5931\u8D25",
          r && r.ok ? "ok" : "err"
        );
      } catch (e) {
        notify(String(e), "err");
      } finally {
        btn.disabled = false;
        await loadEpisodes(body, subId);
      }
    });
    list.addEventListener(
      "scroll",
      () => {
        if (state2.done) return;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 120) {
          renderNextBatch(body);
        }
      },
      { passive: true }
    );
    await loadEpisodes(body, subId);
  }
  async function loadEpisodes(body, subId) {
    const list = body.querySelector("#channelEpList");
    const titleEl = body.querySelector("#channelTitle");
    if (!list) return;
    state2.rendered = 0;
    state2.done = false;
    state2.busy = true;
    list.innerHTML = '<div class="empty">\u52A0\u8F7D\u4E2D\u2026</div>';
    let data2;
    try {
      data2 = await api.getEpisodes(subId);
    } catch (e) {
      list.innerHTML = `<div class="empty">\u52A0\u8F7D\u5267\u96C6\u5931\u8D25\uFF1A${escapeHtml(String(e))}</div>`;
      state2.busy = false;
      return;
    }
    if (!data2 || !data2.ok) {
      list.innerHTML = `<div class="empty">${escapeHtml(
        data2 && data2.error || "\u52A0\u8F7D\u5267\u96C6\u5931\u8D25"
      )}</div>`;
      state2.busy = false;
      return;
    }
    state2.subId = subId;
    state2.title = data2.title || subId;
    state2.episodes = (data2.episodes || []).map((ep) => ({
      ...ep,
      subscriptionId: ep.subscriptionId || subId,
      showTitle: ep.showTitle || state2.title
    }));
    if (titleEl) titleEl.textContent = `${state2.title} \xB7 ${state2.episodes.length} \u96C6`;
    list.innerHTML = "";
    if (!state2.episodes.length) {
      list.innerHTML = '<div class="empty">\u8BE5\u8BA2\u9605\u8FD8\u6CA1\u6709\u5267\u96C6\u7D22\u5F15\u3002\u70B9\u300C\u5237\u65B0\u300D\u91CD\u65B0\u62C9\u53D6\u3002</div>';
      state2.busy = false;
      state2.done = true;
      return;
    }
    state2.busy = false;
    renderNextBatch(body);
    requestAnimationFrame(() => fillToScroll(body));
  }

  // ui/views/row-events.js
  async function defaultPlayToggle(ep, row, items) {
    const snap = get();
    const isCurrent = ep.songId != null && snap.current && snap.current.songId === ep.songId;
    if (isCurrent && snap.phase === "playing") {
      try {
        await pause();
        await flushProgress();
      } catch (e) {
        notify(String(e), "err");
      }
      return;
    }
    if (ep.songId != null) {
      await playEpisode({ ...episodePayload(ep), songId: ep.songId, showTitle: ep.showTitle }, { resume: true });
    } else {
      await playEpisode(episodePayload(ep));
    }
  }
  function bindRowInteractions(box, items, handlers = {}) {
    if (!box) return;
    box.querySelectorAll("[data-title-tap]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-idx"));
      const ep = items[idx];
      if (!ep) return;
      btn.addEventListener("click", () => openShowNote(ep));
      btn.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openShowNote(ep);
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
        await defaultPlayToggle(ep, btn.closest("[data-row]"), items);
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
        if (act === "queue") await addToQueue(ep);
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
        if (act === "queue") await addToQueue(ep);
        else if (act === "cast") await castToSpeaker(ep.songId, { prepareIfMissing: ep });
        else if (act === "fav") await toggleFavorite(ep, null);
      });
    });
  }

  // ui/views/recent.js
  function actionsFor(ep, idx) {
    return moreMenuHtml(
      [
        { key: "queue", label: "\u52A0\u5165\u64AD\u653E\u5217\u8868", iconName: "listPlus", attrs: `data-idx="${idx}"` },
        { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` }
      ],
      "recent-" + idx
    );
  }
  function renderRecent() {
    const box = $("recentList");
    if (!box) return;
    const items = getData().recent || [];
    if (!items.length) {
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u66F4\u65B0\u3002\u5148\u5728\u300C\u8BA2\u9605\u300D\u91CC\u6DFB\u52A0\u9891\u9053\u3002</div>';
      return;
    }
    const groups = /* @__PURE__ */ new Map();
    items.forEach((ep, idx) => {
      const ms = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : 0);
      const key = dateGroupKey(ms);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ep, idx });
    });
    box.innerHTML = Array.from(groups.entries()).map(([label, rows]) => {
      const cards = rows.map(
        ({ ep, idx }) => episodeRowHtml(ep, idx, {
          showDate: false,
          channelLink: true,
          actions: [
            {
              act: "queue",
              iconName: "listPlus",
              title: "\u52A0\u5165\u64AD\u653E\u5217\u8868"
            },
            {
              act: "fav",
              iconName: "star",
              title: "\u6536\u85CF",
              cls: "icon-btn--star",
              attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`
            }
          ],
          moreHtml: actionsFor(ep, idx)
        })
      ).join("");
      return `<div class="date-group"><div class="date-label">${escapeHtml(label)}</div>` + cards + `</div>`;
    }).join("");
    bindRowInteractions(box, items);
  }
  function bindRecentToolbar() {
    const btn = $("btnRecentRefresh");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const r = await api.refreshAll();
        if (!r.ok && r.skipped) notify("\u5FD9\u788C\u4E2D\uFF0C\u8BF7\u7A0D\u540E", "warn");
        else notify(r.ok ? "\u5DF2\u5237\u65B0" : "\u90E8\u5206\u5237\u65B0\u5931\u8D25", r.ok ? "ok" : "warn");
        await reloadRecent();
        await reloadSubs();
      } catch (e) {
        notify(String(e), "err");
      } finally {
        btn.disabled = false;
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
    box.innerHTML = items.map((ep, idx) => {
      const more = moreMenuHtml(
        [
          { key: "queue", label: "\u52A0\u5165\u64AD\u653E\u5217\u8868", iconName: "listPlus", attrs: `data-idx="${idx}"` },
          { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` },
          { key: "unfav", label: "\u53D6\u6D88\u6536\u85CF", iconName: "star", danger: true, attrs: `data-idx="${idx}"` }
        ],
        "fav-" + idx
      );
      return episodeRowHtml(ep, idx, {
        showDate: false,
        channelLink: true,
        actions: [{ act: "queue", iconName: "listPlus", title: "\u52A0\u5165\u64AD\u653E\u5217\u8868" }],
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

  // ui/views/subs.js
  var subQuery = "";
  var pendingState = { opmlText: null };
  function subCoverHtml(sub) {
    const abs = absoluteCoverUrl(sub.coverUrl);
    if (abs) {
      return `<img class="sub-card__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" />`;
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
      return;
    }
    const list = subQuery.trim() ? all.filter((s) => matchesQuery(s.title, subQuery) || matchesQuery(s.url, subQuery)) : all;
    if (!list.length) {
      box.innerHTML = `<div class="empty">\u6CA1\u6709\u5339\u914D\u300C${escapeHtml(subQuery)}\u300D\u7684\u9891\u9053\u3002</div>`;
      syncSubClear();
      return;
    }
    box.innerHTML = list.map((s, idx) => {
      const err = s.lastError ? `<div class="sub-card__err">\u6700\u8FD1\u9519\u8BEF\uFF1A${escapeHtml(s.lastError)}</div>` : "";
      const meta = [
        // Not an error: it only means the feed publishes more than our index
        // depth, and we keep the newest N.
        `<span title="\u8BE5 feed \u7684\u5267\u96C6\u6570\u8D85\u8FC7\u672C\u5730\u7D22\u5F15\u6DF1\u5EA6\uFF0C\u53EA\u4FDD\u7559\u6700\u8FD1\u82E5\u5E72\u96C6">\u5267\u96C6 ${Number(
          s.episodeCount
        ) || 0}${s.truncated ? "\uFF08\u5DF2\u8FBE\u7D22\u5F15\u4E0A\u9650\uFF09" : ""}</span>`,
        `<span>\u4E0A\u6B21\u6210\u529F ${escapeHtml(fmtTime(s.lastSuccessAt))}</span>`
      ].join("");
      const more = moreMenuHtml(
        [
          { key: "refresh", label: "\u5237\u65B0", iconName: "rotateCcw", attrs: `data-idx="${idx}"` },
          { key: "queue-show", label: "\u52A0\u5165\u64AD\u653E\u5217\u8868", iconName: "listPlus", attrs: `data-idx="${idx}"` },
          {
            key: "delete",
            label: "\u5220\u9664\u8BA2\u9605",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`
          }
        ],
        "sub-" + s.id
      );
      return `<div class="sub-card" data-sub-card data-idx="${idx}">` + subCoverHtml(s) + `<div class="sub-card__body"><div class="sub-card__title">${escapeHtml(s.title || s.url)}</div><div class="sub-card__meta">${meta}</div><div class="sub-card__url" title="${escapeHtml(s.url)}">${escapeHtml(s.url)}</div>` + err + `<div class="sub-card__actions"><button type="button" class="chip-btn" data-sub-act="eps" data-idx="${idx}"><span data-icon="listMusic" data-size="14"></span><span>\u5267\u96C6</span></button>` + more + `</div></div></div>`;
    }).join("");
    box.querySelectorAll(".sub-card").forEach((card) => {
      const idx = Number(card.getAttribute("data-idx"));
      const sub = list[idx];
      if (!sub) return;
      card.querySelectorAll("[data-sub-act]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          await openEpisodes(sub.id);
        });
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
            btn.disabled = true;
            try {
              const r = await api.refreshOne(sub.id);
              notify(r.ok ? "\u5DF2\u5237\u65B0\uFF08\u672A\u6539\u64AD\u653E\u5217\u8868\uFF09" : r.error || "\u5237\u65B0\u5931\u8D25", r.ok ? "ok" : "err");
              await reloadSubs();
              renderSubs();
            } finally {
              btn.disabled = false;
            }
          } else if (act === "queue-show") {
            btn.disabled = true;
            try {
              const r = await api.queueAddShow(sub.id);
              notify(
                r.ok ? `\u5DF2\u8FFD\u52A0 ${r.added} \u9996\u5230\u300C${r.playlistName}\u300D` : r.error || "\u52A0\u5165\u5931\u8D25",
                r.ok ? "ok" : "err"
              );
              await reloadQueue();
            } finally {
              btn.disabled = false;
            }
          } else if (act === "delete") {
            const ok = await uiConfirm({
              title: "\u5220\u9664\u8BA2\u9605",
              message: "\u5220\u9664\u8BE5\u8BA2\u9605\u7BA1\u7406\u9879\uFF1F\u64AD\u653E\u5217\u8868\u4E0E\u8FDB\u5EA6\u4E0D\u4F1A\u81EA\u52A8\u6E05\u9664\u3002",
              okText: "\u5220\u9664",
              danger: true
            });
            if (!ok) return;
            await api.deleteSubscription(sub.id);
            notify("\u5DF2\u5220\u9664\u8BA2\u9605", "ok");
            await reloadSubs();
            renderSubs();
          }
        });
      });
    });
    syncSubClear();
  }
  function syncSubClear() {
    const clear = $("subSearchClear");
    if (clear) clear.classList.toggle("hidden", !subQuery.trim());
  }
  async function openEpisodes(id) {
    await openChannelDialog(id);
  }
  function bindSubsToolbar() {
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
    const btnRefreshAll = $("btnRefreshAll");
    if (btnRefreshAll) {
      btnRefreshAll.addEventListener("click", async () => {
        btnRefreshAll.disabled = true;
        try {
          const r = await api.refreshAll();
          if (!r.ok && r.skipped) notify("\u5FD9\u788C\u4E2D\uFF0C\u8BF7\u7A0D\u540E", "warn");
          else notify(r.ok ? "\u5168\u90E8\u5237\u65B0\u5B8C\u6210\uFF08\u672A\u6539\u64AD\u653E\u5217\u8868\uFF09" : "\u90E8\u5206\u5237\u65B0\u5931\u8D25\uFF0C\u5DF2\u4FDD\u7559\u65E7\u6570\u636E", r.ok ? "ok" : "warn");
          await reloadSubs();
          renderSubs();
        } catch (e) {
          notify(String(e), "err");
        } finally {
          btnRefreshAll.disabled = false;
        }
      });
    }
    const btnExport = $("btnOpmlExport");
    if (btnExport) btnExport.addEventListener("click", exportOpml);
    const btnOpenAdd = $("btnOpenAddSub");
    const addCard = $("addSubCard");
    if (btnOpenAdd && addCard) {
      btnOpenAdd.addEventListener("click", () => {
        setHidden(addCard, false);
        const field = $("feedUrl");
        if (field) field.focus();
      });
    }
    const btnCloseAdd = $("btnCloseAddSub");
    if (btnCloseAdd && addCard) {
      btnCloseAdd.addEventListener("click", () => setHidden(addCard, true));
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
    bindOpmlControls();
  }
  function bindOpmlControls() {
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
        try {
          const r = await api.opmlImport(pendingState.opmlText);
          if (!r.ok) notify(r.error || "\u5BFC\u5165\u5931\u8D25", "err");
          else {
            notify(r.tip || "\u5BFC\u5165\u5B8C\u6210", "ok");
            pendingState.opmlText = null;
            imp.disabled = true;
            await reloadSubs();
            renderSubs();
          }
        } catch (e) {
          notify(String(e), "err");
        }
      });
    }
    const cancel = $("btnOpmlCancel");
    if (cancel) {
      cancel.addEventListener("click", () => {
        pendingState.opmlText = null;
        $("btnOpmlImport").disabled = true;
        $("opmlSummary").textContent = "";
        $("opmlText").value = "";
        $("opmlFile").value = "";
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
              try {
                await navigator.clipboard.writeText(area2.value);
                notify("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F", "ok");
              } catch (_) {
                notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u590D\u5236", "warn");
              }
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

  // ui/views/queue.js
  var selectState = { mode: false, ids: /* @__PURE__ */ new Set() };
  var dragId = null;
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
    const label = open ? "\u9690\u85CF\u64AD\u653E\u5217\u8868" : "\u663E\u793A\u64AD\u653E\u5217\u8868";
    const btnTop = $("btnToggleQueue");
    if (btnTop) {
      btnTop.setAttribute("aria-pressed", open ? "true" : "false");
      btnTop.setAttribute("title", label);
      btnTop.setAttribute("aria-label", label);
      setButtonIcon(btnTop, open ? "panelRightClose" : "panelRight", 17);
    }
    const btnInline = $("btnToggleQueueInline");
    if (btnInline) {
      btnInline.setAttribute("aria-pressed", open ? "true" : "false");
      btnInline.setAttribute("title", label);
      btnInline.setAttribute("aria-label", label);
    }
  }
  function toggleQueue() {
    setQueueOpen(!getData().queueOpen);
  }
  function syncSelectUi() {
    const bar = $("queueSelectBar");
    const del2 = $("btnQueueDeleteSelected");
    setHidden(bar, !selectState.mode);
    if (del2) del2.disabled = selectState.ids.size === 0;
  }
  function setSelectMode(on) {
    selectState.mode = !!on;
    if (!on) selectState.ids.clear();
    syncSelectUi();
    renderQueue();
  }
  function renderQueue() {
    const data2 = getData();
    const songs = data2.queueSongs || [];
    const meta = data2.queueMeta;
    const metaEl = $("queueMeta");
    if (metaEl) {
      metaEl.textContent = meta ? `${meta.playlistName} \xB7 ${songs.length} \u9996` : "\u56FA\u5B9A\u5BBF\u4E3B\u6B4C\u5355";
    }
    const box = $("queueList");
    if (!box) return;
    if (!songs.length) {
      box.innerHTML = '<div class="empty">\u64AD\u653E\u5217\u8868\u4E3A\u7A7A\u3002\u5728\u300C\u66F4\u65B0\u300D\u91CC\u52A0\u5165\u5355\u96C6\u3002</div>';
      syncSelectUi();
      return;
    }
    box.innerHTML = songs.map((s, idx) => {
      const selected = selectState.ids.has(s.id);
      const lead = selectState.mode ? `<input type="checkbox" class="sel-box" data-sel="${s.id}" ${selected ? "checked" : ""} aria-label="\u9009\u62E9" />` : `<span class="drag-handle" title="\u62D6\u62FD\u6392\u5E8F" aria-hidden="true">${icon("gripVertical", 16)}</span>`;
      const more = moreMenuHtml(
        [
          { key: "cast", label: "\u6295\u653E\u5230\u97F3\u7BB1", iconName: "speaker", attrs: `data-idx="${idx}"` },
          {
            key: "remove",
            label: "\u4ECE\u64AD\u653E\u5217\u8868\u79FB\u9664",
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
          extraClass: "q-row",
          leadHtml: lead,
          actions: [
            {
              act: "fav",
              iconName: "star",
              title: "\u6536\u85CF",
              cls: "icon-btn--star",
              attrs: `aria-pressed="${s.favorited ? "true" : "false"}" ` + (s.feedUrl && s.guid ? "" : "disabled")
            }
          ],
          moreHtml: selectState.mode ? "" : more
        }
      );
      return row;
    }).join("");
    if (selectState.mode) {
      box.querySelectorAll("input[data-sel]").forEach((input) => {
        input.addEventListener("click", (ev) => ev.stopPropagation());
        input.addEventListener("change", () => {
          const id = Number(input.getAttribute("data-sel"));
          if (input.checked) selectState.ids.add(id);
          else selectState.ids.delete(id);
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
          if (input.checked) selectState.ids.add(id);
          else selectState.ids.delete(id);
          syncSelectUi();
        });
      });
      syncSelectUi();
      return;
    }
    bindRowInteractions(box, songs, {
      remove: async (ep, idx) => {
        const id = songs[idx] && songs[idx].id;
        if (id == null) return;
        await removeSongs([id]);
      },
      cast: async (ep, idx) => {
        const song = songs[idx];
        if (!song) return;
        await castToSpeaker(song.id);
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
    syncSelectUi();
  }
  function wireDragAndDrop(box) {
    box.querySelectorAll("[data-row]").forEach((row) => {
      const songId = Number(row.getAttribute("data-song-id"));
      row.setAttribute("draggable", "true");
      row.querySelectorAll(".actions-row, button, a, input").forEach((el2) => {
        el2.addEventListener("mousedown", () => {
          row.draggable = false;
        });
        el2.addEventListener("mouseup", () => {
          row.draggable = true;
        });
        el2.addEventListener("mouseleave", () => {
          row.draggable = true;
        });
      });
      row.addEventListener("dragstart", (ev) => {
        dragId = songId;
        row.classList.add("dragging");
        try {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", String(songId));
        } catch (_) {
        }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        row.draggable = true;
        box.querySelectorAll(".drag-over").forEach((el2) => el2.classList.remove("drag-over"));
        dragId = null;
      });
      row.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        row.classList.add("drag-over");
        try {
          ev.dataTransfer.dropEffect = "move";
        } catch (_) {
        }
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        row.classList.remove("drag-over");
        const toId = Number(row.getAttribute("data-song-id"));
        const fromId = dragId != null ? dragId : Number(ev.dataTransfer.getData("text/plain"));
        await applyOrder(fromId, toId);
      });
    });
  }
  async function applyOrder(fromId, toId) {
    if (fromId == null || toId == null || fromId === toId) return;
    const ids = (getData().queueSongs || []).map((s) => s.id);
    const from = ids.indexOf(fromId);
    if (from < 0 || ids.indexOf(toId) < 0) return;
    const next = ids.slice();
    const [moved] = next.splice(from, 1);
    const insertAt = next.indexOf(toId);
    if (insertAt < 0) return;
    next.splice(insertAt, 0, moved);
    await reorderQueue(next);
  }
  function bindQueuePanel() {
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
    const btnInline = $("btnToggleQueueInline");
    if (btnInline) btnInline.addEventListener("click", () => toggleQueue());
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
          if (act === "select") setSelectMode(!selectState.mode);
          else if (act === "remove-played") await removePlayed();
          else if (act === "cast-all") await castQueueToSpeaker();
          else if (act === "refresh") await reloadQueue();
          else if (act === "replace") await replaceQueueAndPlay2();
          else if (act === "clear") await clearQueue();
        });
      });
    }
    const cancel = $("btnQueueSelectCancel");
    if (cancel) cancel.addEventListener("click", () => setSelectMode(false));
    const del2 = $("btnQueueDeleteSelected");
    if (del2) {
      del2.addEventListener("click", async () => {
        const ids = Array.from(selectState.ids);
        if (!ids.length) return;
        const ok = await uiConfirm({
          title: "\u5220\u9664\u6240\u9009",
          message: `\u4ECE\u64AD\u653E\u5217\u8868\u5220\u9664\u9009\u4E2D\u7684 ${ids.length} \u9996\uFF1F`,
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
        hint.textContent = `\u53EF\u586B 1\u2013${limit}\uFF0C\u9ED8\u8BA4 50\u3002\u8D85\u8FC7 ${limit} \u4F1A\u81EA\u52A8\u6536\u655B\u5230 ${limit}\u3002`;
      }
      const meta = $("scheduleMeta");
      if (meta) {
        meta.textContent = "\u4E0B\u6B21\uFF1A" + (r.scheduleNextDueAt ? fmtTime(r.scheduleNextDueAt) : "\u2014");
      }
      const eventsNote = $("playEventsNote");
      if (eventsNote) {
        eventsNote.textContent = r.playEventsActive ? "\u8FDB\u5EA6\u4E0E\u6536\u542C\u5386\u53F2\u4FDD\u5B58\u5728\u672C\u63D2\u4EF6\uFF08\u6309\u8282\u76EE feed + \u5355\u96C6 guid\uFF09\u3002\u5DF2\u8BA2\u9605\u5BBF\u4E3B\u64AD\u653E\u4E8B\u4EF6\uFF1A\u5728\u5BBF\u4E3B\u6B4C\u5355 / \u5E95\u680F\u64AD\u653E\u4E14\u80FD\u89E3\u51FA feed+guid \u65F6\u4E5F\u4F1A\u8BB0\u8D26\uFF1B\u89E3\u4E0D\u51FA\u5219\u4E0D\u5199\u810F\u6570\u636E\u3002" : "\u8FDB\u5EA6\u4E0E\u6536\u542C\u5386\u53F2\u4FDD\u5B58\u5728\u672C\u63D2\u4EF6\uFF08\u6309\u8282\u76EE feed + \u5355\u96C6 guid\uFF09\u3002\u5F53\u524D\u672A\u542F\u7528\u5BBF\u4E3B\u64AD\u653E\u4E8B\u4EF6\u8BA2\u9605\uFF1A\u53EA\u6709\u5728\u672C\u63D2\u4EF6\u9875\u70B9\u64AD / \u5165\u961F\u65F6\u4F1A\u5199\u5165\u5386\u53F2\uFF1B\u5BBF\u4E3B\u5176\u5B83\u5165\u53E3\u7684\u64AD\u653E\u4E0D\u4F1A\u81EA\u52A8\u8BB0\u5165\u3002";
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
          await castToSpeaker(cur.songId, { deviceId: selectedDeviceId || void 0 });
        } finally {
          testCast.disabled = false;
        }
      });
    }
    const reloadLog = $("btnReloadLog");
    if (reloadLog) reloadLog.addEventListener("click", () => loadLog());
  }

  // ui/views/history.js
  var COMPLETED_NEAR_END_SEC = 3;
  var query2 = "";
  var filter = "all";
  var selectState2 = { mode: false, keys: /* @__PURE__ */ new Set() };
  function entryKey(entry) {
    return `${entry.feedUrl}::${entry.guid}`;
  }
  function isCompletedEntry(entry) {
    if (entry && entry.completed) return true;
    const pos = Number(entry && entry.positionSec) || 0;
    const dur = Number(entry && entry.durationSec) || 0;
    return dur > 0 && pos >= dur - COMPLETED_NEAR_END_SEC;
  }
  function filtered2(items) {
    let list = items || [];
    if (filter === "completed") list = list.filter(isCompletedEntry);
    if (query2.trim()) {
      list = list.filter(
        (h) => matchesQuery(h.title, query2) || matchesQuery(h.showTitle, query2)
      );
    }
    return list;
  }
  function toRowItem(entry) {
    return {
      ...entry,
      // `progress` drives the badge; history keeps the highest position reached.
      progress: {
        positionSec: entry.positionSec || 0,
        durationSec: entry.durationSec || null,
        completed: isCompletedEntry(entry)
      },
      // Reuse the date column for "played at".
      pubDateMs: entry.playedAt || null,
      pubDate: null
    };
  }
  function syncSelectUi2() {
    const bar = $("historySelectBar");
    const del2 = $("btnHistoryDeleteSelected");
    const count = $("historySelectCount");
    const toggle = $("btnHistorySelect");
    setHidden(bar, !selectState2.mode);
    if (del2) del2.disabled = selectState2.keys.size === 0;
    if (count) {
      count.textContent = selectState2.mode ? selectState2.keys.size ? `\u5DF2\u9009 ${selectState2.keys.size} \u6761` : "\u70B9\u9009\u6761\u76EE" : "";
    }
    if (toggle) {
      toggle.classList.toggle("is-on", selectState2.mode);
      toggle.setAttribute("aria-pressed", selectState2.mode ? "true" : "false");
      toggle.title = selectState2.mode ? "\u9000\u51FA\u591A\u9009" : "\u591A\u9009";
      setButtonIcon(toggle, "listChecks", 16);
    }
  }
  function setSelectMode2(on) {
    selectState2.mode = !!on;
    if (!on) selectState2.keys.clear();
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
    const all = getData().history || [];
    if (!all.length) {
      box.innerHTML = '<div class="empty">\u8FD8\u6CA1\u6709\u6536\u542C\u8BB0\u5F55</div>';
      syncSelectUi2();
      return;
    }
    const items = filtered2(all);
    if (!items.length) {
      box.innerHTML = `<div class="empty">${filter === "completed" && !query2.trim() ? "\u6CA1\u6709\u5DF2\u542C\u5B8C\u7684\u8BB0\u5F55" : "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55"}</div>`;
      syncSelectUi2();
      return;
    }
    const rows = items.map(toRowItem);
    box.innerHTML = rows.map((entry, idx) => {
      const key = entryKey(entry);
      const lead = selectState2.mode ? `<input type="checkbox" class="sel-box" data-sel-key="${escapeHtml(key)}" ${selectState2.keys.has(key) ? "checked" : ""} aria-label="\u9009\u62E9" />` : "";
      const more = moreMenuHtml(
        [
          { key: "queue", label: "\u52A0\u5165\u64AD\u653E\u5217\u8868", iconName: "listPlus", attrs: `data-idx="${idx}"` },
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
        leadHtml: lead,
        actions: selectState2.mode ? [] : [
          {
            act: "fav",
            iconName: "star",
            title: "\u6536\u85CF",
            cls: "icon-btn--star",
            attrs: `aria-pressed="${entry.favorited ? "true" : "false"}"`
          }
        ],
        moreHtml: selectState2.mode ? "" : more
      });
    }).join("");
    if (selectState2.mode) {
      box.querySelectorAll("input[data-sel-key]").forEach((input) => {
        input.addEventListener("click", (ev) => ev.stopPropagation());
        input.addEventListener("change", () => {
          const key = input.getAttribute("data-sel-key");
          if (!key) return;
          if (input.checked) selectState2.keys.add(key);
          else selectState2.keys.delete(key);
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
          if (input.checked) selectState2.keys.add(key);
          else selectState2.keys.delete(key);
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
      selectBtn.addEventListener("click", () => setSelectMode2(!selectState2.mode));
    }
    const cancel = $("btnHistorySelectCancel");
    if (cancel) cancel.addEventListener("click", () => setSelectMode2(false));
    const del2 = $("btnHistoryDeleteSelected");
    if (del2) {
      del2.addEventListener("click", async () => {
        const all = getData().history || [];
        const selected = all.filter((h) => selectState2.keys.has(entryKey(h)));
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
    await reloadHistory();
    renderHistory();
  }

  // ui/main.js
  var TABS = ["recent", "favorites", "history", "subs", "settings"];
  var activeTab = "recent";
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
    renderPlayerBar(get());
    paintRows(get());
    renderQueue();
    if (activeTab === "recent") renderRecent();
    if (activeTab === "history") renderHistory();
    if (activeTab === "favorites") renderFavorites();
    if (activeTab === "subs") renderSubs();
  }
  async function refreshFromHost() {
    await Promise.allSettled([
      reloadQueue(),
      reloadRecent(),
      reloadFavorites(),
      reloadHistory()
    ]);
    renderAll();
  }
  async function init() {
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
    renderAll();
    setProgressCapable(true);
    onChange((snap) => {
      renderPlayerBar(snap);
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
    const results = await Promise.allSettled(loads.map(([, fn]) => fn()));
    const failed = results.map((r, i) => r.status === "rejected" ? loads[i][0] : null).filter(Boolean);
    if (failed.length) toast(`\u672A\u80FD\u52A0\u8F7D\uFF1A${failed.join("\u3001")}`, "err");
    renderAll();
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
  }
  init().catch((e) => {
    toast("\u754C\u9762\u521D\u59CB\u5316\u5931\u8D25\uFF1A" + (e && e.message || e), "err");
  });
})();
