/**
 * Cross-window / cross-device list refresh.
 *
 * Progress, the queue and favorites all live in host-side plugin storage
 * (`data/jsplugins_data/<plugin>/data/*`), so every page opened against the same
 * host already reads one shared dataset. What was missing is a *refresh
 * trigger*: a page left open never re-read it, so two windows looked out of sync.
 *
 * Two cheap triggers are wired here:
 *   - returning to the page (visibility / window focus) re-reads everything;
 *   - a slow poll while visible keeps a long-open page current.
 *
 * Refreshes are skipped while the user is mid-interaction (open dialog,
 * popover, focused input, row drag) so the list never shifts under them.
 */

const DEFAULT_INTERVAL_MS = 20000;
const MIN_GAP_MS = 3000;

function hasOpenOverlay() {
  if (document.querySelector("#appModal[open]")) return true;
  if (document.querySelector(".more-wrap.open, .more-wrap.is-open")) return true;
  return false;
}

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable === true
  );
}

function isDragging() {
  return !!document.querySelector(".q-row.dragging");
}

/**
 * Start periodic refresh.
 *
 * @param {() => Promise<void>} refresh  re-reads data and repaints views
 * @param {{intervalMs?: number}} [options]
 * @returns {() => void} stop function
 */
export function startDataSync(refresh, options = {}) {
  const intervalMs =
    typeof options.intervalMs === "number" && options.intervalMs > 0
      ? options.intervalMs
      : DEFAULT_INTERVAL_MS;

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
      // Keep whatever is on screen; the next tick retries.
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
  const timer = setInterval(() => run(false), intervalMs);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
    clearInterval(timer);
  };
}
