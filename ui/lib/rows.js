/**
 * Shared list-row rendering + painting.
 *
 * Every playable row from any tab produces the same markup contract so a single
 * `paintRows()` pass can keep playback state and progress in sync across the
 * whole app:
 *
 *   <div data-row data-song-id data-duration data-progress='{...}'>
 *     [data-title-tap]   → opens ShowNote
 *     [data-now-badge]   → 「正在播放」badge
 *     [data-prog-slot]   → progress badge
 *     [data-play-btn]    → play / pause icon
 *   </div>
 */

import { escapeHtml } from "./dom.js";
import { icon } from "./icons.js";
import { fmtSec, fmtTime, absoluteCoverUrl, colorFromString, progressRatio } from "./format.js";
import { currentSongId, phaseLabel, liveProgressFor, get as getSnap } from "./playback.js";

/** Progress badge styled like the reference (time above a thin bar / check when done). */
export function progressBadgeHtml(prog, durationSec) {
  const dur = (prog && prog.durationSec) || durationSec;
  const durText = dur ? fmtSec(dur) : "";
  if (prog && prog.completed) {
    return (
      `<span class="prog-badge done" title="已听完">` +
      (durText ? `<span class="t">${escapeHtml(durText)}</span>` : "") +
      `<span class="prog-check">${icon("checkCircle", 15)}</span>` +
      `</span>`
    );
  }
  const ratio = progressRatio(prog, durationSec);
  if (ratio > 0 && durText) {
    const pct = Math.max(2, Math.round(ratio * 100));
    return (
      `<span class="prog-badge" title="进度 ${pct}%">` +
      `<span class="t">${escapeHtml(durText)}</span>` +
      `<span class="bar" style="--p:${pct}"><i></i></span>` +
      `</span>`
    );
  }
  return durText
    ? `<span class="prog-badge"><span class="t">${escapeHtml(durText)}</span></span>`
    : "";
}

/** Cover image, or a coloured initial when no absolute url is available. */
export function coverHtml(url, title, cls) {
  const klass = cls || "ep-cover";
  const abs = absoluteCoverUrl(url);
  if (abs) {
    return `<img class="${klass}" src="${escapeHtml(abs)}" alt="" loading="lazy" data-cover />`;
  }
  const letter = String(title || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    `<div class="cover-ph ${klass === "ep-cover" ? "" : klass}" ` +
    `style="background:${colorFromString(title || "")}">${escapeHtml(letter)}</div>`
  );
}

export function showNoteAvailable(ep) {
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
  const dur = ep.durationSec || (ep.progress && ep.progress.durationSec) || null;
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

/**
 * Render one episode row.
 *
 * @param {object} ep
 * @param {number} idx
 * @param {object} [opts]
 * @param {boolean} [opts.showDate]
 * @param {string}  [opts.extraClass]
 * @param {string}  [opts.leadHtml]  leading slot (drag handle / checkbox)
 * @param {Array<{act:string,iconName:string,title:string,attrs?:string,cls?:string}>} [opts.actions]
 * @param {string}  [opts.moreHtml]  trailing「更多」popover markup
 * @param {boolean} [opts.channelLink] make the cover + channel name open the show
 */
export function episodeRowHtml(ep, idx, opts = {}) {
  const snap = getSnap();
  const playingId = currentSongId(snap);
  const isCurrent = ep.songId != null && playingId === ep.songId;
  const prog = isCurrent
    ? liveProgressFor({ id: ep.songId, progress: ep.progress, duration: ep.durationSec }, snap)
    : ep.progress;
  const label = phaseLabel(snap.phase);
  const dateMs = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : null);
  const showDate = opts.showDate !== false && dateMs && Number.isFinite(dateMs);
  const playIcon = isCurrent && snap.phase === "playing" ? "pause" : "play";

  const lead = opts.leadHtml || "";
  const headGrid = lead ? "ep-head q-head" : "ep-head";

  // Channel affordance: both the artwork and the show name open the channel.
  const channelAttr = opts.channelLink ? `data-channel-tap data-idx="${idx}"` : "";
  const cover = opts.channelLink
    ? `<button type="button" class="cover-btn" ${channelAttr} title="查看频道">` +
      coverHtml(ep.coverUrl, ep.title || ep.showTitle) +
      `</button>`
    : coverHtml(ep.coverUrl, ep.title || ep.showTitle);
  const showName = ep.showTitle
    ? opts.channelLink
      ? `<button type="button" class="channel-link" ${channelAttr}>${escapeHtml(ep.showTitle)}</button>`
      : `<span>${escapeHtml(ep.showTitle)}</span>`
    : "";

  const actions = (opts.actions || [])
    .map(
      (a) =>
        `<button type="button" class="icon-btn ${a.cls || ""}" data-act="${a.act}" data-idx="${idx}" ` +
        `title="${escapeHtml(a.title)}" ${a.attrs || ""}>${icon(a.iconName, 17)}</button>`
    )
    .join("");

  return (
    `<div class="ep-row${isCurrent ? " is-current" : ""}${opts.extraClass ? " " + opts.extraClass : ""}" ` +
    `data-row data-idx="${idx}" ${rowDataset(ep)}>` +
    `<div class="${headGrid}">` +
    lead +
    cover +
    `<div>` +
    `<button type="button" class="ep-title--tap" data-title-tap data-idx="${idx}" title="查看详情">` +
    `${escapeHtml(ep.title || "未命名")}</button>` +
    `<div class="meta-line">` +
    showName +
    `<span data-now-badge ${isCurrent && label ? "" : "hidden"}>${escapeHtml(isCurrent ? label : "")}</span>` +
    `<span data-prog-slot>${progressBadgeHtml(prog, ep.durationSec)}</span>` +
    (showDate ? `<span class="hide-sm">${escapeHtml(fmtTime(dateMs))}</span>` : "") +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div class="actions-row">` +
    `<button type="button" class="icon-btn icon-btn--primary" data-play-btn data-idx="${idx}" title="播放">` +
    `${icon(playIcon, 17)}</button>` +
    actions +
    (opts.moreHtml || "") +
    `</div>` +
    `</div>`
  );
}

/** Popover markup for「更多」. */
export function moreMenuHtml(items, wrapKey) {
  const body = items
    .map((it) => {
      if (it.disabled) {
        return (
          `<button type="button" disabled>` +
          (it.iconName ? icon(it.iconName, 15) : "") +
          `<span>${escapeHtml(it.label)}</span></button>`
        );
      }
      return (
        `<button type="button" class="${it.danger ? "danger-text" : ""}" data-more-act="${escapeHtml(
          it.key
        )}" ${it.attrs || ""}>` +
        (it.iconName ? icon(it.iconName, 15) : "") +
        `<span>${escapeHtml(it.label)}</span></button>`
      );
    })
    .join("");  return (
    `<div class="more-wrap" data-more-wrap="${escapeHtml(String(wrapKey))}">` +
    `<button type="button" class="icon-btn" data-more-toggle title="更多">${icon("moreHorizontal", 17)}</button>` +
    `<div class="more-menu">${body}</div>` +
    `</div>`
  );
}

/**
 * Repaint every playable row from the current snapshot, so all tabs stay in sync.
 */
export function paintRows(snap) {
  const current = snap || getSnap();
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

    // A song id match is authoritative; feed+guid covers rows not yet prepared.
    const isCurrent =
      (songId != null && playingId != null && playingId === songId) ||
      (curFeed && curGuid && rowFeed === curFeed && rowGuid === curGuid);

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
      playBtn.title = isCurrent && current.phase === "playing" ? "暂停" : isCurrent ? "继续" : "播放";
    }

    const slot = row.querySelector("[data-prog-slot]");
    if (!slot) return;
    const dur = Number(row.getAttribute("data-duration")) || null;
    const base = readRowProgress(row);
    const prog = isCurrent
      ? liveProgressFor({ id: songId, progress: base, duration: dur }, current)
      : base;
    if (prog || dur) slot.innerHTML = progressBadgeHtml(prog, dur);
  });
}
