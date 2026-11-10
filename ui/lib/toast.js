/** Toast notifications (single element, auto-dismiss). */

let timer = null;
let el = null;

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
