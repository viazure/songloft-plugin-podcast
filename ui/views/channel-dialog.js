/**
 * 频道剧集弹窗 — shared by every place a channel can be opened from.
 *
 * Episodes page in batches so a long index does not block the sheet, and the
 * channel header stays put while more rows append. Refresh / history index
 * can refill without dropping the channel context or already-visible window.
 */

import { escapeHtml } from "../lib/dom.js";
import { absoluteCoverUrl, colorFromString, fmtTime } from "../lib/format.js";
import { hydrateIconSlots } from "../lib/icons.js";
import { api } from "../lib/api.js";
import { openModal, closeModal } from "../lib/modal.js";
import { notify } from "../lib/actions.js";
import { copyText } from "../lib/clipboard.js";
import {
  REFRESH_BUSY_TOAST,
  applyRefreshButtonBusy,
  humanizeRefreshFailure,
  isFeedRefreshing,
  isSkippedBusy,
  onFeedRefreshState,
  runFeedRefreshOne,
  trackRemoteRefreshBusy,
} from "../lib/feedRefresh.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { bindRowInteractions } from "./row-events.js";
import {
  DEFAULT_HISTORY_INDEX_LIMIT,
  EPISODE_PAGE_SIZE,
  HISTORY_INDEX_COMPLETE_TOAST,
  REFRESH_UP_TO_DATE_TOAST,
  addAllConfirmCopy,
  historyIndexCopy,
  pageEpisodes,
  preservedRenderCount,
  shouldConfirmAddAll,
} from "../lib/episodePages.js";

function emptyChannelState(subId = "") {
  return {
    modal: null,
    subId,
    title: "",
    author: "",
    description: "",
    url: "",
    coverUrl: null,
    lastSuccessAt: null,
    aboutExpanded: false,
    episodes: [],
    rendered: 0,
    busy: false,
    done: false,
    total: 0,
    truncated: false,
    historyIndexed: false,
    historyIndexStatus: "idle",
    historyIndexError: null,
    feedEpisodeCount: 0,
    capped: false,
    earliestConfirmed: false,
    historyIndexLimit: DEFAULT_HISTORY_INDEX_LIMIT,
  };
}

let state = emptyChannelState();

function resetChannelState() {
  state = emptyChannelState();
}

function episodeFingerprint(ep) {
  if (!ep) return "";
  return String(ep.guid || ep.enclosureUrl || ep.id || ep.title || "");
}

function askAddAllConfirm(body, count, cap = DEFAULT_HISTORY_INDEX_LIMIT) {
  return new Promise((resolve) => {
    const box = body.querySelector("#channelAddAllConfirm");
    const addBtn = body.querySelector("#channelAddAll");
    if (!box) {
      resolve(false);
      return;
    }
    const prevDisabled = addBtn ? addBtn.disabled : false;
    if (addBtn) addBtn.disabled = true;
    box.hidden = false;
    box.innerHTML =
      `<p>${escapeHtml(addAllConfirmCopy(count, cap))}</p>` +
      `<div class="channel-addall-confirm__actions">` +
      `<button type="button" class="btn btn--ghost btn--sm" data-addall="no">取消</button>` +
      `<button type="button" class="btn btn--primary btn--sm" data-addall="yes">确定加入整表</button>` +
      `</div>`;
    const done = (value) => {
      box.hidden = true;
      box.innerHTML = "";
      if (addBtn) addBtn.disabled = prevDisabled;
      resolve(value);
    };
    box.querySelector('[data-addall="yes"]').addEventListener("click", () => done(true));
    box.querySelector('[data-addall="no"]').addEventListener("click", () => done(false));
  });
}

function pagerText() {
  if (!state.total) return "";
  if (state.done || state.rendered >= state.total) return "";
  return `已显示 ${state.rendered} / ${state.total} 集`;
}

function paintIndexStatus(body) {
  const el = body.querySelector("#channelIndexStatus");
  const btn = body.querySelector("#channelIndexHistory");
  if (!el) return;
  const copy = historyIndexCopy({
    status: state.historyIndexStatus,
    error: state.historyIndexError,
    indexedCount: state.total,
    feedAvailableCount: state.feedEpisodeCount,
    truncated: state.truncated,
    capped: state.capped,
    cap: state.historyIndexLimit || DEFAULT_HISTORY_INDEX_LIMIT,
    earliestConfirmed: state.earliestConfirmed,
    earliestKept: state.earliestConfirmed,
  });
  el.hidden = !copy.text;
  el.className = "channel-index-status muted" + (copy.tone ? " is-" + copy.tone : "");
  el.textContent = copy.text;
  paintFootVisibility(body);
  if (btn) {
    const running = state.historyIndexStatus === "running";
    btn.disabled = running;
    btn.setAttribute("aria-busy", running ? "true" : "false");
    const label = btn.querySelector("[data-index-label]");
    if (label) label.textContent = running ? "正在索引…" : state.historyIndexStatus === "error" ? "重试索引历史" : "索引历史";
  }
}

function paintFootVisibility(body) {
  const foot = body.querySelector(".channel-dialog__foot");
  if (!foot) return;
  const visible = Array.from(foot.children).some((el) => {
    if (el.hidden) return false;
    if (el.tagName === "BUTTON") return true;
    return String(el.textContent || "").trim().length > 0;
  });
  foot.hidden = !visible;
}

function paintPager(body) {
  const status = body.querySelector("#epBatchStatus");
  const more = body.querySelector("#channelLoadMore");
  const text = pagerText();
  if (status) {
    status.textContent = text;
    status.hidden = !text;
  }
  if (more) {
    more.hidden = !!state.done || !state.total;
    more.disabled = !!state.busy;
  }
  paintFootVisibility(body);
}

function channelCoverHtml() {
  const abs = absoluteCoverUrl(state.coverUrl);
  if (abs) {
    return `<img class="channel-dialog__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  const letter = String(state.title || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    `<div class="channel-dialog__cover cover-ph" style="background:${colorFromString(state.title || "")}">` +
    `${escapeHtml(letter)}</div>`
  );
}

function paintHero(body) {
  const cover = body.querySelector("#channelHeroCover");
  const title = body.querySelector("#channelHeroTitle");
  const author = body.querySelector("#channelHeroAuthor");
  const count = body.querySelector("#channelHeroCount");
  const desc = body.querySelector("#channelDesc");
  const moreBtn = body.querySelector("#channelDescMore");
  const extra = body.querySelector("#channelAboutExtra");
  const urlEl = body.querySelector("#channelUrl");
  const lastEl = body.querySelector("#channelLastSuccess");
  if (cover) cover.innerHTML = channelCoverHtml();
  if (title) title.textContent = state.title || "";
  if (author) {
    const a = String(state.author || "").trim();
    author.hidden = !a;
    author.textContent = a;
  }
  if (count) count.textContent = state.total ? `共 ${state.total} 集` : "共 0 集";
  const text = String(state.description || "").trim();
  const hasDesc = !!text;
  if (desc) {
    desc.hidden = !hasDesc;
    desc.textContent = text;
    desc.classList.toggle("is-expanded", !!state.aboutExpanded);
  }
  if (moreBtn) {
    // No isolated 更多/收起 when there is no blurb to expand.
    moreBtn.hidden = !hasDesc;
    moreBtn.textContent = state.aboutExpanded ? "收起" : "更多";
    moreBtn.setAttribute("aria-expanded", state.aboutExpanded ? "true" : "false");
  }
  if (extra) {
    // With blurb: reveal URL / last success only after 更多.
    // Without blurb: keep them visible so the address is not trapped behind a missing toggle.
    extra.hidden = hasDesc ? !state.aboutExpanded : false;
  }
  if (urlEl) {
    urlEl.textContent = state.url || "";
    urlEl.title = state.url || "";
  }
  if (lastEl) {
    lastEl.textContent = state.lastSuccessAt
      ? `上次刷新成功 ${fmtTime(state.lastSuccessAt)}`
      : "还没有成功刷新记录";
  }
}

function setModalTitle(text) {
  const titleEl = document.getElementById("appModalTitle");
  if (!titleEl) return;
  titleEl.textContent = text || "";
  titleEl.style.display = text ? "" : "none";
}

function renderNextBatch(body) {
  const list = body.querySelector("#channelEpList");
  if (!list || state.done) return;
  const page = pageEpisodes(state.episodes, state.rendered, EPISODE_PAGE_SIZE);
  if (!page.items.length) {
    state.done = true;
    paintPager(body);
    return;
  }

  const startIdx = state.rendered;
  const html = page.items
    .map((ep, i) => {
      const idx = startIdx + i;
      return episodeRowHtml(ep, idx, {
        showDate: true,
        actions: [
          { act: "queue", iconName: "listPlus", title: "加入「播客」列表" },
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

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  bindRowInteractions(wrapper, state.episodes);
  while (wrapper.firstChild) list.appendChild(wrapper.firstChild);

  state.rendered = page.nextOffset;
  state.done = !page.hasMore;
  paintPager(body);
}

function fillToScroll(body) {
  const list = body.querySelector("#channelEpList");
  if (!list) return;
  let guard = 0;
  while (!state.done && list.scrollHeight <= list.clientHeight + 8 && guard < 50) {
    const before = state.rendered;
    renderNextBatch(body);
    guard += 1;
    if (state.rendered === before) break;
  }
}

function applyEpisodePayload(data, subId) {
  state.subId = subId;
  state.title = data.title || subId;
  state.author = typeof data.author === "string" ? data.author : "";
  state.description = typeof data.description === "string" ? data.description : "";
  state.url = typeof data.url === "string" ? data.url : state.url || "";
  state.coverUrl = data.coverUrl || null;
  state.lastSuccessAt =
    typeof data.lastSuccessAt === "number" && Number.isFinite(data.lastSuccessAt)
      ? data.lastSuccessAt
      : null;
  state.episodes = (data.episodes || []).map((ep) => ({
    ...ep,
    subscriptionId: ep.subscriptionId || subId,
    showTitle: ep.showTitle || state.title,
  }));
  state.total = Number(data.total != null ? data.total : state.episodes.length) || state.episodes.length;
  state.truncated = !!data.truncated;
  state.historyIndexed = !!data.historyIndexed;
  state.historyIndexStatus = data.historyIndexStatus || "idle";
  state.historyIndexError = data.historyIndexError || null;
  state.feedEpisodeCount = Number(data.feedEpisodeCount) || state.total;
  state.capped = !!data.capped;
  state.earliestConfirmed = !!data.earliestConfirmed;
  state.historyIndexLimit = Number(data.historyIndexLimit || data.cap) || DEFAULT_HISTORY_INDEX_LIMIT;
}

/**
 * Read the channel's episodes. When `preserve` is set, already-shown rows and
 * the current scroll stay instead of jumping back to an empty loading state.
 */
async function loadEpisodes(body, subId, opts = {}) {
  const list = body.querySelector("#channelEpList");
  if (!list) return;

  const preserve = !!opts.preserve && state.subId === subId && state.rendered > 0;
  const keepShown = preserve
    ? preservedRenderCount({
        previousShown: state.rendered,
        previousSubId: state.subId,
        nextSubId: subId,
        nextTotal: state.total,
      })
    : 0;
  const scrollTop = preserve ? list.scrollTop : 0;

  if (!preserve) {
    state.rendered = 0;
    state.done = false;
    list.innerHTML = '<div class="empty">加载中…</div>';
  }
  state.busy = true;
  paintPager(body);

  let data;
  try {
    data = await api.getEpisodes(subId);
  } catch (e) {
    list.innerHTML = `<div class="empty">加载剧集失败：${escapeHtml(String(e))}</div>`;
    state.busy = false;
    state.done = true;
    paintPager(body);
    return;
  }

  if (!data || !data.ok) {
    list.innerHTML = `<div class="empty">${escapeHtml((data && data.error) || "加载剧集失败")}</div>`;
    state.busy = false;
    state.done = true;
    paintPager(body);
    return;
  }

  applyEpisodePayload(data, subId);
  setModalTitle(state.title || "");
  paintHero(body);
  paintIndexStatus(body);

  const target = preserve
    ? preservedRenderCount({
        previousShown: keepShown || state.rendered,
        previousSubId: subId,
        nextSubId: subId,
        nextTotal: state.total,
      })
    : 0;

  state.rendered = 0;
  state.done = false;
  list.innerHTML = "";
  if (!state.episodes.length) {
    list.innerHTML = '<div class="empty">该订阅还没有剧集索引。点「刷新」或「索引历史」重新拉取。</div>';
    state.busy = false;
    state.done = true;
    paintPager(body);
    return;
  }

  const want = Math.max(EPISODE_PAGE_SIZE, target);
  while (state.rendered < want && !state.done) renderNextBatch(body);
  state.busy = false;
  paintPager(body);
  requestAnimationFrame(() => {
    fillToScroll(body);
    if (preserve) list.scrollTop = scrollTop;
  });
}

export function closeChannelDialog() {
  resetChannelState();
  closeModal();
}

export async function openChannelDialog(subId) {
  if (!subId) return;

  state = emptyChannelState(subId);
  state.busy = true;

  const body = document.createElement("div");
  body.className = "channel-dialog";
  body.innerHTML =
    `<div class="channel-dialog__head">` +
    `<div class="channel-dialog__hero">` +
    `<div class="channel-dialog__cover-wrap" id="channelHeroCover"></div>` +
    `<div class="channel-dialog__hero-text">` +
    `<div class="channel-dialog__hero-title" id="channelHeroTitle"></div>` +
    `<div class="channel-dialog__hero-author muted" id="channelHeroAuthor" hidden></div>` +
    `<div class="channel-dialog__hero-count muted" id="channelHeroCount">共 0 集</div>` +
    `</div></div>` +
    `<div class="channel-dialog__about">` +
    `<div class="channel-dialog__desc" id="channelDesc" hidden></div>` +
    `<button type="button" class="channel-dialog__more" id="channelDescMore" aria-expanded="false" hidden>更多</button>` +
    `<div class="channel-dialog__about-extra" id="channelAboutExtra" hidden>` +
    `<div class="channel-dialog__url-row">` +
    `<code class="channel-dialog__url" id="channelUrl"></code>` +
    `<button type="button" class="btn btn--ghost btn--sm" id="channelCopyUrl" title="复制源地址">` +
    `<span data-icon="copy" data-size="14"></span><span>复制</span></button>` +
    `</div>` +
    `<div class="channel-dialog__last-success muted" id="channelLastSuccess"></div>` +
    `</div></div>` +
    `<div class="channel-dialog__actions">` +
    `<button type="button" class="chip-btn" id="channelRefresh" title="刷新该频道最近节目的自动索引">` +
    `<span data-icon="rotateCcw" data-size="14"></span><span data-refresh-label>刷新</span></button>` +
    `<button type="button" class="chip-btn" id="channelIndexHistory" title="根据该频道源中现有条目补建历史索引，不会找回源里没有的节目">` +
    `<span data-icon="history" data-size="14"></span><span data-index-label>索引历史</span></button>` +
    `<button type="button" class="btn btn--tonal btn--sm" id="channelAddAll" title="将当前已索引剧集全部追加到「播客」列表末尾">全部加入</button>` +
    `</div>` +
    `</div>` +
    `<div class="channel-addall-confirm" id="channelAddAllConfirm" hidden></div>` +
    `<div class="ep-list channel-dialog__list" id="channelEpList"></div>` +
    `<div class="channel-dialog__foot" hidden>` +
    `<div class="ep-batch-status muted" id="epBatchStatus" hidden></div>` +
    `<div class="channel-index-status muted" id="channelIndexStatus" hidden></div>` +
    `<button type="button" class="btn btn--ghost btn--sm" id="channelLoadMore" hidden>加载更多</button>` +
    `</div>`;

  const list = body.querySelector("#channelEpList");
  list.innerHTML = '<div class="empty">加载中…</div>';
  hydrateIconSlots(body);

  const channelRefreshBtn = body.querySelector("#channelRefresh");
  const stopRefreshUi = onFeedRefreshState((busy) => applyRefreshButtonBusy(channelRefreshBtn, busy));
  paintHero(body);

  body.querySelector("#channelDescMore").addEventListener("click", () => {
    state.aboutExpanded = !state.aboutExpanded;
    paintHero(body);
  });
  body.querySelector("#channelCopyUrl").addEventListener("click", async () => {
    const ok = await copyText(String(state.url || ""));
    if (ok) notify("已复制源地址", "ok");
    else notify("复制失败，请手动选择地址复制", "warn");
  });

  openModal({
    title: "",
    body,
    size: "wide",
    actions: [],
    closeIcon: "arrowLeft",
    closeLabel: "返回",
    closeLeading: true,
    onClose: () => {
      try {
        stopRefreshUi();
      } catch (_) {}
      resetChannelState();
    },
  });

  body.querySelector("#channelAddAll").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const count = state.episodes.length;
    if (!count) {
      notify("没有可加入的剧集", "warn");
      return;
    }
    if (shouldConfirmAddAll(count)) {
      const accepted = await askAddAllConfirm(body, count, state.historyIndexLimit || DEFAULT_HISTORY_INDEX_LIMIT);
      if (!accepted) {
        notify("已取消，未加入「播客」列表", "muted");
        return;
      }
    }
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = "正在加入…";
    try {
      const r = await api.queueAddShow(subId);
      notify(r.ok ? `已追加 ${r.added} 首到「播客」列表末尾` : r.error || "加入失败", r.ok ? "ok" : "err");
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  });

  channelRefreshBtn.addEventListener("click", async () => {
    if (isFeedRefreshing()) return;
    const prevTotal = state.total;
    const prevTop = episodeFingerprint(state.episodes[0]);
    try {
      const r = await runFeedRefreshOne({
        refreshOne: () => api.refreshOne(subId),
        afterRefresh: async (result) => {
          if (!result || result.noop) return;
          if (!result.ok && (result.skipped || isSkippedBusy(result))) {
            notify(REFRESH_BUSY_TOAST, "warn");
            await trackRemoteRefreshBusy(api);
            return;
          }
          await loadEpisodes(body, subId, { preserve: true });
          if (result.ok) {
            const unchanged =
              state.total === prevTotal && episodeFingerprint(state.episodes[0]) === prevTop;
            notify(unchanged ? REFRESH_UP_TO_DATE_TOAST : "已刷新该频道", unchanged ? "muted" : "ok");
          } else {
            notify(humanizeRefreshFailure(result), "err");
          }
        },
      });
      if (r && r.noop) return;
    } catch (e) {
      if (isSkippedBusy(e)) {
        notify(REFRESH_BUSY_TOAST, "warn");
        void trackRemoteRefreshBusy(api);
        return;
      }
      notify(humanizeRefreshFailure(e), "err");
      await loadEpisodes(body, subId, { preserve: true });
    }
  });

  body.querySelector("#channelIndexHistory").addEventListener("click", async () => {
    state.historyIndexStatus = "running";
    state.historyIndexError = null;
    paintIndexStatus(body);
    notify("正在索引该频道的历史节目…", "muted");
    try {
      const r = await api.indexHistory(subId);
      if (r && r.alreadyRunning) {
        state.historyIndexStatus = "running";
        notify("该频道正在索引，请稍候", "warn");
        paintIndexStatus(body);
        return;
      }
      if (!r || !r.ok) {
        state.historyIndexStatus = "error";
        state.historyIndexError = (r && (r.error || r.historyIndexError)) || "索引失败";
        paintIndexStatus(body);
        notify(state.historyIndexError, "err");
        return;
      }
      state.historyIndexStatus = "success";
      state.feedEpisodeCount = Number(r.feedAvailableCount) || 0;
      state.capped = !!r.capped;
      state.truncated = !!r.truncated;
      state.earliestConfirmed = !!r.earliestConfirmed;
      state.historyIndexLimit = Number(r.cap || r.historyIndexLimit) || DEFAULT_HISTORY_INDEX_LIMIT;
      const copy = historyIndexCopy({
        status: "success",
        indexedCount: r.indexedCount,
        feedAvailableCount: r.feedAvailableCount,
        capped: r.capped,
        cap: state.historyIndexLimit,
        earliestConfirmed: state.earliestConfirmed,
        earliestKept: state.earliestConfirmed,
      });
      notify(copy.text || HISTORY_INDEX_COMPLETE_TOAST, copy.text ? "ok" : "muted");
      await loadEpisodes(body, subId, { preserve: true });
    } catch (e) {
      state.historyIndexStatus = "error";
      state.historyIndexError = String(e);
      paintIndexStatus(body);
      notify(String(e), "err");
    }
  });

  body.querySelector("#channelLoadMore").addEventListener("click", () => {
    if (state.busy || state.done) return;
    renderNextBatch(body);
  });

  list.addEventListener(
    "scroll",
    () => {
      if (state.done || state.busy) return;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 120) {
        renderNextBatch(body);
      }
    },
    { passive: true }
  );

  await loadEpisodes(body, subId);
}
