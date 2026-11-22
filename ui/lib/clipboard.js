/** Best-effort copy for plugin webview: Clipboard API, then execCommand fallback. */
export async function copyText(text) {
  const value = String(text ?? "");
  if (!value) return false;

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      /* fall through to execCommand */
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
    } catch (_) {}
  }
}
