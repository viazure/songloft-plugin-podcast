/** Toast notifications (single element, auto-dismiss). */

let timer = null;
let el = null;
/** Preferred mount parent while a native <dialog> top-layer modal is open. */
let mountParent = null;

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

/**
 * While #appModal is open (showModal top layer), toast must live inside the
 * dialog or it stays under the list. Pass the dialog node, or null/body to restore.
 * Moves an already-visible toast with the same node so the message stays up.
 */
export function setToastMount(parent) {
  mountParent =
    parent && typeof parent.appendChild === "function" && parent.isConnected
      ? parent
      : null;
  if (!el) return;
  const host = resolveMount();
  if (el.isConnected) {
    if (el.parentElement !== host) host.appendChild(el);
  } else if (el.classList.contains("show")) {
    host.appendChild(el);
  }
}

const SILENT = /^(继续播放|已开始播放|已继续收听|继续收听|正在加载剧集…)$/;

/**
 * Show a transient message.
 *
 * Playback feedback ("继续播放" etc.) is surfaced too but as a quieter, shorter
 * toast: the default host play / queue-add flow must never be silent.
 *
 * @param {string} text
 * @param {"ok"|"warn"|"err"|"muted"} [kind]
 */
export function toast(text, kind) {
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

export function clearToast() {
  if (el) el.classList.remove("show");
  if (timer) clearTimeout(timer);
}
