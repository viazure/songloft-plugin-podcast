/**
 * Membership of an episode in the fixed「播客」playlist (the podcast queue).
 *
 * Answers one question for the *existing*「加入播放列表」buttons: is this episode
 * already in the queue? Membership is matched by song id when the row has one,
 * and by feedUrl+guid otherwise (a row that has never been prepared has no id).
 *
 * Deliberately narrow: it never merges playlist entry points, never rewrites
 * the global icon set, and never mutates the episode or the queue. The
 * already-in-queue control swaps to the checklist icon (`listChecks`) so it
 * is visually distinct from「加入播放列表」(`listPlus`).
 *
 * State is exposed with `aria-disabled` rather than the `disabled` attribute: an
 * icon-only button that is `disabled` drops out of the tab order and loses its
 * tooltip on some webviews, and the brief requires labels / keyboard / focus to
 * keep working. The click still reaches `addToQueue`, which reports「已在播放列表」
 * instead of silently doing nothing.
 */

import { replaceIcon } from "./icons.js";

/** Feed urls differ by trailing slash / case; compare loosely. */
export function normalizeFeedKey(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** `feedUrl::guid` key, or "" when the episode has no usable identity. */
export function episodeKey(feedUrl, guid) {
  const feed = normalizeFeedKey(feedUrl);
  const g = String(guid || "").trim();
  if (!feed || !g) return "";
  return `${feed}::${g}`;
}

/**
 * Index one queue snapshot.
 *
 * @param {Array<{ id?: number, feedUrl?: string | null, guid?: string | null }>} queueSongs
 * @returns {{ ids: Set<number>, keys: Set<string> }}
 */
export function buildQueueIndex(queueSongs) {
  const ids = new Set();
  const keys = new Set();
  for (const song of Array.isArray(queueSongs) ? queueSongs : []) {
    if (!song || song.pending) continue;
    const id = Number(song.id);
    if (Number.isFinite(id)) ids.add(id);
    const key = episodeKey(song.feedUrl, song.guid);
    if (key) keys.add(key);
  }
  return { ids, keys };
}

/** @param {{ songId?: number | null, feedUrl?: string, guid?: string }} ep */
export function isInPodcastQueue(ep, index) {
  if (!ep || !index) return false;
  const rawId = ep.songId;
  const songId = rawId == null || rawId === "" ? null : Number(rawId);
  if (songId != null && Number.isFinite(songId) && index.ids.has(songId)) return true;
  const key = episodeKey(ep.feedUrl, ep.guid);
  return !!key && index.keys.has(key);
}

export const QUEUE_ADD_LABEL = "加入播放列表";
export const QUEUE_IN_LABEL = "已在播放列表";
export const QUEUE_ADD_ICON = "listPlus";
export const QUEUE_IN_ICON = "listChecks";

/**
 * Descriptor for a queue toggle control. The label drives the tooltip /
 * aria-label as well, so the visible and announced state cannot drift apart.
 */
export function queueButtonState(ep, index) {
  const inQueue = isInPodcastQueue(ep, index);
  return {
    inQueue,
    label: inQueue ? QUEUE_IN_LABEL : QUEUE_ADD_LABEL,
    iconName: inQueue ? QUEUE_IN_ICON : QUEUE_ADD_ICON,
    ariaPressed: inQueue,
    ariaDisabled: inQueue,
  };
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Attributes for an inline icon button rendered by `episodeRowHtml`.
 * `data-queue-song` / `data-queue-key` let `repaintQueueButtons` update the
 * button in place when the queue changes without a full view re-render.
 */
export function queueButtonAttrs(ep, index) {
  return queueMarkers(ep, index);
}

/**
 * Attributes for a 更多 menu item. It keeps `data-more-act` (so the existing
 * click path still runs) and carries the same queue markers, so the item is
 * repainted in place rather than requiring a re-render.
 */
export function queueMenuAttrs(ep, index, idx) {
  const bits = [`data-idx="${idx}"`, queueMarkers(ep, index)];
  return bits.join(" ");
}

function queueMarkers(ep, index) {
  const state = queueButtonState(ep, index);
  const rawId = ep && ep.songId;
  const songId = rawId == null || rawId === "" ? NaN : Number(rawId);
  const key = episodeKey(ep && ep.feedUrl, ep && ep.guid);
  const bits = [
    `aria-pressed="${state.ariaPressed ? "true" : "false"}"`,
    `aria-disabled="${state.ariaDisabled ? "true" : "false"}"`,
    `title="${state.label}"`,
  ];
  if (Number.isFinite(songId)) bits.push(`data-queue-song="${songId}"`);
  if (key) bits.push(`data-queue-key="${escapeAttr(key)}"`);
  if (state.inQueue) bits.push('data-in-queue="1"');
  return bits.join(" ");
}

/**
 * Repaint already-rendered queue controls against a fresh queue snapshot.
 * Safe with a missing root; never re-renders the list.
 *
 * @param {ParentNode | null} root
 * @param {{ ids: Set<number>, keys: Set<string> }} index
 * @returns {number} number of controls updated
 */
export function repaintQueueButtons(root, index) {
  if (!root || typeof root.querySelectorAll !== "function" || !index) return 0;
  let updated = 0;
  root.querySelectorAll("[data-queue-song], [data-queue-key]").forEach((btn) => {
    const songAttr = btn.getAttribute("data-queue-song");
    const keyAttr = btn.getAttribute("data-queue-key") || "";
    const songId = songAttr != null && songAttr !== "" ? Number(songAttr) : null;
    const inQueue =
      (songId != null && Number.isFinite(songId) && index.ids.has(songId)) ||
      (!!keyAttr && index.keys.has(keyAttr));
    const label = inQueue ? QUEUE_IN_LABEL : QUEUE_ADD_LABEL;
    const iconName = inQueue ? QUEUE_IN_ICON : QUEUE_ADD_ICON;

    btn.setAttribute("aria-pressed", inQueue ? "true" : "false");
    btn.setAttribute("aria-disabled", inQueue ? "true" : "false");
    if (inQueue) btn.setAttribute("data-in-queue", "1");
    else btn.removeAttribute("data-in-queue");
    btn.setAttribute("title", label);
    btn.classList.toggle("is-in-queue", inQueue);
    replaceIcon(btn, iconName);

    // 更多 menu items carry a visible label span. Icon buttons wrap the SVG
    // in <span class="ico"> — overwriting that replaces the icon with
    // wrapped label text inside a fixed-size button.
    const span = btn.querySelector("span:not(.ico)");
    if (span) span.textContent = label;
    updated += 1;
  });
  return updated;
}

/** True when a queue control currently reports "already added". */
export function queueControlIsInQueue(btn) {
  return !!btn && btn.getAttribute("aria-disabled") === "true";
}
