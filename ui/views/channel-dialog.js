/**
 * 频道剧集弹窗 — shared by every place a channel can be opened from.
 *
 * Episodes load lazily in batches so a 200-episode feed does not block the
 * sheet from appearing, and the rest streams in as the user scrolls.
 */

import { escapeHtml } from "../lib/dom.js";
import { hydrateIconSlots } from "../lib/icons.js";
import { api } from "../lib/api.js";
import { openModal, closeModal } from "../lib/modal.js";
import { notify } from "../lib/actions.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { bindRowInteractions } from "./row-events.js";

const BATCH_SIZE = 20;

let state = {
  modal: null,
  subId: "",
  title: "",
  episodes: [],
  rendered: 0,
  busy: false,
  done: false,
};

function footer(count) {
  return `<div class="ep-batch-status muted" id="epBatchStatus">已显示 ${count} 集</div>`;
}

export function closeChannelDialog() {
  state = { modal: null, subId: "", title: "", episodes: [], rendered: 0, busy: false, done: false };
  closeModal();
}

/**
 * Render the next batch of rows into the dialog.
 *
 * The caller owns the `busy` flag: this function used to also bail out when
 * `state.busy` was true, which deadlocked the scroll handler below (`busy` was
 * set before calling, so no further batch ever rendered — the list stopped at 20).
 */
function renderNextBatch(body) {
  const list = body.querySelector("#channelEpList");
  const status = body.querySelector("#epBatchStatus");
  if (!list || state.done) return;

  const slice = state.episodes.slice(state.rendered, state.rendered + BATCH_SIZE);
  if (!slice.length) {
    state.done = true;
    if (status) status.textContent = `共 ${state.episodes.length} 集`;
    return;
  }

  const startIdx = state.rendered;
  const html = slice
    .map((ep, i) => {
      const idx = startIdx + i;
      return episodeRowHtml(ep, idx, {
        showDate: true,
        actions: [
          { act: "queue", iconName: "listPlus", title: "加入播放列表" },
          {
            act: "fav",
            iconName: "star",
            title: "收藏",
            cls: "icon-btn--star",
            attrs: `aria-pressed="${ep.favorited ? "true" : "false"}"`,
          },
        ],
        moreHtml: moreMenuHtml(
          [{ key: "cast", label: "投放到音箱", iconName: "speaker", attrs: `data-idx="${idx}"` }],
          "ch-" + idx
        ),
      });
    })
    .join("");

  // Build + wire the new rows while still detached, so previously rendered rows
  // are never re-bound (rebinding attached duplicate click handlers on every
  // batch, making a single click fire N times).
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  bindRowInteractions(wrapper, state.episodes);
  while (wrapper.firstChild) list.appendChild(wrapper.firstChild);

  state.rendered += slice.length;
  if (status) {
    status.textContent =
      state.rendered >= state.episodes.length
        ? `共 ${state.episodes.length} 集`
        : `已显示 ${state.rendered} / ${state.episodes.length} 集`;
  }
}

/**
 * Keep filling until the list can actually scroll (or everything is rendered).
 *
 * A batch of 20 may not exceed the dialog height, in which case no scroll event
 * ever fires and the remaining episodes would stay invisible.
 */
function fillToScroll(body) {
  const list = body.querySelector("#channelEpList");
  if (!list) return;
  let guard = 0;
  while (!state.done && list.scrollHeight <= list.clientHeight + 8 && guard < 50) {
    const before = state.rendered;
    renderNextBatch(body);
    guard++;
    if (state.rendered === before) break;
  }
}

/**
 * Open a channel's episode list in a modal.
 * @param {string} subId
 */
export async function openChannelDialog(subId) {
  if (!subId) return;

  state = {
    modal: null,
    subId,
    title: "",
    episodes: [],
    rendered: 0,
    busy: true,
    done: false,
  };

  // Shell first so the dialog opens instantly with a loading state.
  const body = document.createElement("div");
  body.className = "channel-dialog";
  body.innerHTML =
    `<div class="channel-dialog__head">` +
    `<div class="channel-dialog__title" id="channelTitle">剧集</div>` +
    `<div class="channel-dialog__actions">` +
    `<button type="button" class="chip-btn" id="channelRefresh" title="重新拉取该频道的剧集索引">` +
    `<span data-icon="rotateCcw" data-size="14"></span><span>刷新</span></button>` +
    `<button type="button" class="btn btn--tonal btn--sm" id="channelAddAll">全部加入播放列表</button>` +
    `</div>` +
    `</div>` +
    `<div class="ep-list channel-dialog__list" id="channelEpList"></div>` +
    footer(0);

  const list = body.querySelector("#channelEpList");
  list.innerHTML = '<div class="empty">加载中…</div>';
  hydrateIconSlots(body);

  openModal({
    title: "",
    body,
    size: "wide",
    actions: [{ label: "关闭", kind: "ghost", close: true }],
  });

  body.querySelector("#channelAddAll").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    try {
      const r = await api.queueAddShow(subId);
      notify(r.ok ? `已追加 ${r.added} 首` : r.error || "加入失败", r.ok ? "ok" : "err");
    } finally {
      btn.disabled = false;
    }
  });

  // Refresh the channel's index, then re-read the list. Without this the dialog
  // could only ever show whatever index existed when the subscription was first
  // added (stale feeds had no way to update from here).
  body.querySelector("#channelRefresh").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    list.innerHTML = '<div class="empty">正在刷新该频道…</div>';
    try {
      const r = await api.refreshOne(subId);
      notify(
        r && r.ok ? "已刷新该频道" : (r && r.error) || "刷新失败",
        r && r.ok ? "ok" : "err"
      );
    } catch (e) {
      notify(String(e), "err");
    } finally {
      btn.disabled = false;
      await loadEpisodes(body, subId);
    }
  });

  // Infinite scroll inside the dialog. No `busy` flag needed any more: batches
  // are appended synchronously, so a scroll event cannot interleave.
  list.addEventListener(
    "scroll",
    () => {
      if (state.done) return;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 120) {
        renderNextBatch(body);
      }
    },
    { passive: true }
  );

  await loadEpisodes(body, subId);
}

/** Read the channel's episodes and reset the batch cursor. */
async function loadEpisodes(body, subId) {
  const list = body.querySelector("#channelEpList");
  const titleEl = body.querySelector("#channelTitle");
  if (!list) return;

  state.rendered = 0;
  state.done = false;
  state.busy = true;
  list.innerHTML = '<div class="empty">加载中…</div>';

  let data;
  try {
    data = await api.getEpisodes(subId);
  } catch (e) {
    list.innerHTML = `<div class="empty">加载剧集失败：${escapeHtml(String(e))}</div>`;
    state.busy = false;
    return;
  }

  if (!data || !data.ok) {
    list.innerHTML = `<div class="empty">${escapeHtml(
      (data && data.error) || "加载剧集失败"
    )}</div>`;
    state.busy = false;
    return;
  }

  state.subId = subId;
  state.title = data.title || subId;
  state.episodes = (data.episodes || []).map((ep) => ({
    ...ep,
    subscriptionId: ep.subscriptionId || subId,
    showTitle: ep.showTitle || state.title,
  }));

  if (titleEl) titleEl.textContent = `${state.title} · ${state.episodes.length} 集`;

  list.innerHTML = "";
  if (!state.episodes.length) {
    list.innerHTML = '<div class="empty">该订阅还没有剧集索引。点「刷新」重新拉取。</div>';
    state.busy = false;
    state.done = true;
    return;
  }

  state.busy = false;
  renderNextBatch(body);
  // A short list may not fill the dialog, so nothing would ever scroll.
  requestAnimationFrame(() => fillToScroll(body));
}
