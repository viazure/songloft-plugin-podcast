/** ShowNote reader: centered modal on desktop, bottom sheet on mobile. */

import { $, escapeHtml } from "../lib/dom.js";
import { fmtSec, fmtTime } from "../lib/format.js";
import { sanitizeShowNote, looksLikeHtml } from "../lib/sanitize.js";
import { openModal, closeModal } from "../lib/modal.js";
import { showNoteAvailable } from "../lib/rows.js";
import { episodePayload, playEpisode, addToQueue, toggleFavorite } from "../lib/actions.js";
import { api } from "../lib/api.js";
import { castToSpeaker } from "../lib/actions.js";
import { shownoteFootActions, SHOWNNOTE_FOOT_CLASS } from "../lib/shownoteActions.js";

let context = null;

function metaLine(ep) {
  const bits = [];
  const ms = ep.pubDateMs || (ep.pubDate ? Date.parse(ep.pubDate) : null);
  if (ms && Number.isFinite(ms)) bits.push(fmtTime(ms));
  const show = ep.showTitle || ep.album || ep.artist;
  if (show) bits.push(show);
  const dur = ep.durationSec || ep.duration;
  if (dur) bits.push(fmtSec(dur));
  return bits.join(" · ");
}

/** Open the ShowNote dialog for an episode. */
export async function openShowNote(ep) {
  if (!ep) return;
  context = ep;

  const body = document.createElement("div");
  body.className = "sn-frame";

  let note = ep.showNote || ep.description || "";
  const hasNote = showNoteAvailable(ep);

  // Fall back to persisted progress when the caller only supplied a row.
  if (ep.feedUrl && ep.guid && !ep.durationSec) {
    try {
      const pr = await api.getProgressOne(ep.feedUrl, ep.guid);
      if (pr && pr.ok && pr.progress && pr.progress.durationSec) {
        ep.durationSec = pr.progress.durationSec;
      }
    } catch (_) {
      /* progress lookup is optional */
    }
  }

  // ShowNote content is untrusted feed HTML: always re-sanitize right before
  // rendering, even though the backend sanitized it at ingest time.
  const safeNote = hasNote
    ? looksLikeHtml(note)
      ? sanitizeShowNote(note)
      : `<p>${escapeHtml(note).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>`
    : `<p class="muted">暂无 ShowNote。可在「订阅」中刷新该节目后再试。</p>`;

  const html =
    `<div class="sn-head">` +
    `<div class="sn-meta">${escapeHtml(metaLine(ep))}</div>` +
    `<div class="sn-title">${escapeHtml(ep.title || "ShowNote")}</div>` +
    `</div>` +
    `<div class="sn-body" id="snBody">` +
    safeNote +
    `</div>`;
  body.innerHTML = html;

  const [playAct, queueAct, castAct, favAct] = shownoteFootActions(ep);
  openModal({
    title: "",
    body,
    size: "wide",
    footClass: SHOWNNOTE_FOOT_CLASS,
    actions: [
      {
        ...playAct,
        onClick: () => {
          playEpisode(episodePayload(ep));
        },
      },
      {
        ...queueAct,
        close: true,
        onClick: () => addToQueue(ep),
      },
      {
        ...castAct,
        onClick: () => castToSpeaker(ep.songId, { prepareIfMissing: ep }),
      },
      {
        ...favAct,
        onClick: () => toggleFavorite(ep, null),
      },
    ],
  });

  const snBody = body.querySelector("#snBody");
  if (snBody) snBody.scrollTop = 0;
}

export function closeShowNote() {
  context = null;
  closeModal();
}

/** Currently open ShowNote episode (null when closed). */
export function currentShowNoteEpisode() {
  return context;
}
