/** Tiny DOM helpers shared by every view. */

export const $ = (id) => document.getElementById(id);

export const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

/** Escape a value for safe insertion into HTML text / attribute contexts. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Toggle a class from a truthy flag. */
export function toggleClass(el, name, on) {
  if (!el) return;
  el.classList.toggle(name, !!on);
}

/** Set `hidden` without fighting `display` rules coming from stylesheets. */
export function setHidden(el, hidden) {
  if (!el) return;
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
  el.classList.toggle("hidden", !!hidden);
}

/**
 * Delegated click handler.
 * `selector` is matched against `event.target.closest(selector)`.
 */
export function onClick(root, selector, handler) {
  if (!root) return () => {};
  const fn = (ev) => {
    const hit = ev.target instanceof Element ? ev.target.closest(selector) : null;
    if (!hit || !root.contains(hit)) return;
    handler(ev, hit);
  };
  root.addEventListener("click", fn);
  return () => root.removeEventListener("click", fn);
}
