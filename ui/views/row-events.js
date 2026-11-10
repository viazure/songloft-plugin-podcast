/**
 * Row interaction wiring shared by every list view.
 *
 * Handles the common contract produced by `episodeRowHtml`:
 * title tap → ShowNote, play button → play/pause, `data-act` buttons, and the
 * `data-more-act` popover items. Views can override individual actions through
 * the `handlers` map.
 */

import { togglePopover, closePopovers } from "../lib/modal.js";
import {
  notify,
  playEpisode,
  addToQueue,
  toggleFavorite,
  castToSpeaker,
  episodePayload,
  flushProgress,
} from "../lib/actions.js";
import * as Playback from "../lib/playback.js";
import * as Host from "../lib/host.js";
import { openShowNote } from "./show-note.js";
import { openChannelDialog } from "./channel-dialog.js";

async function defaultPlayToggle(ep, row, items) {
  const snap = Playback.get();
  const isCurrent = ep.songId != null && snap.current && snap.current.songId === ep.songId;
  if (isCurrent && snap.phase === "playing") {
    try {
      await Host.pause();
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

/**
 * @param {HTMLElement} box
 * @param {Array<object>} items
 * @param {object} [handlers] extra/override handlers keyed by action name
 */
export function bindRowInteractions(box, items, handlers = {}) {
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

  // Cover / channel name → channel episode list (same affordance everywhere).
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
        const ep = Number.isFinite(idx) ? items[idx] : null;
        return handlers[act](ep, idx, btn);
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
