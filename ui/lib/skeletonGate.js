/**
 * Delayed skeleton gate: avoid a flash when cached/fast loads finish quickly.
 *
 * No project design-spec ms threshold was found in-repo / refs / AGENTS /
 * podcast-ui-demo-isolated; 200ms is an engineering anti-flash choice.
 */

export const SKELETON_DELAY_MS = 200;

export function episodeSkeletonHtml(rows = 6) {
  const n = Math.max(1, Math.min(12, Number(rows) || 6));
  let html = "";
  for (let i = 0; i < n; i += 1) {
    html +=
      `<div class="ep-skel" aria-hidden="true">` +
      `<div class="ep-skel__cover"></div>` +
      `<div class="ep-skel__body">` +
      `<div class="ep-skel__line"></div>` +
      `<div class="ep-skel__line ep-skel__line--short"></div>` +
      `</div></div>`;
  }
  return html;
}

/**
 * @param {{
 *   delayMs?: number,
 *   hasContent: () => boolean,
 *   show: () => void,
 *   now?: () => number,
 *   setTimeout?: typeof setTimeout,
 *   clearTimeout?: typeof clearTimeout,
 * }} opts
 */
export function createSkeletonGate(opts) {
  const delayMs =
    typeof opts.delayMs === "number" && opts.delayMs >= 0 ? opts.delayMs : SKELETON_DELAY_MS;
  const hasContent = opts.hasContent;
  const show = opts.show;
  const schedule = opts.setTimeout || setTimeout;
  const cancel = opts.clearTimeout || clearTimeout;

  let timer = null;
  let shown = false;
  let stopped = false;

  function start() {
    stopped = false;
    shown = false;
    if (typeof hasContent === "function" && hasContent()) return;
    if (timer != null) cancel(timer);
    timer = schedule(() => {
      timer = null;
      if (stopped) return;
      if (typeof hasContent === "function" && hasContent()) return;
      shown = true;
      if (typeof show === "function") show();
    }, delayMs);
  }

  function stop() {
    stopped = true;
    if (timer != null) {
      cancel(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    wasShown: () => shown,
    isPending: () => timer != null,
  };
}
