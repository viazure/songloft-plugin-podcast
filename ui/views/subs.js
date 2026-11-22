/** 「订阅」view: channel cards with cover icons, search and a 更多 menu. */

import { $, escapeHtml, setHidden } from "../lib/dom.js";
import { matchesQuery, colorFromString, absoluteCoverUrl } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { moreMenuHtml } from "../lib/rows.js";
import { reloadSubs, notify } from "../lib/actions.js";
import { copyText } from "../lib/clipboard.js";
import { api } from "../lib/api.js";
import {
  REFRESH_BUSY_TOAST,
  REFRESH_MENU_BUSY_LABEL,
  REFRESH_MENU_IDLE_LABEL,
  applyRefreshMenuBusy,
  humanizeRefreshFailure,
  isFeedRefreshing,
  isSkippedBusy,
  onFeedRefreshState,
  runFeedRefreshOne,
  trackRemoteRefreshBusy,
} from "../lib/feedRefresh.js";
import { openModal, uiConfirm, togglePopover, closePopovers } from "../lib/modal.js";
import { closeAddSubForm, resetOpmlImport } from "../lib/addSubForm.js";
import { setButtonIcon } from "../lib/icons.js";
import { openChannelDialog } from "./channel-dialog.js";

let subQuery = "";
const pendingState = { opmlText: null };
const selectState = { mode: false, keys: new Set() };

function syncSubsSelectUi() {
  const bar = $("subsSelectBar");
  const del = $("btnSubsDeleteSelected");
  const count = $("subsSelectCount");
  const toggle = $("btnSubsSelect");
  setHidden(bar, !selectState.mode);
  if (del) del.disabled = selectState.keys.size === 0;
  if (count) {
    count.textContent = selectState.mode
      ? selectState.keys.size
        ? `已选 ${selectState.keys.size} 个`
        : "点选订阅"
      : "";
  }
  if (toggle) {
    toggle.classList.toggle("is-on", selectState.mode);
    toggle.setAttribute("aria-pressed", selectState.mode ? "true" : "false");
    toggle.title = selectState.mode ? "退出多选" : "多选";
    setButtonIcon(toggle, "listChecks", 16);
  }
}

function setSubsSelectMode(on) {
  selectState.mode = !!on;
  if (!on) selectState.keys.clear();
  syncSubsSelectUi();
  renderSubs();
}

function subCoverHtml(sub) {
  const abs = absoluteCoverUrl(sub.coverUrl);
  if (abs) {
    return `<img class="sub-card__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  const letter = String(sub.title || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    `<div class="sub-card__cover cover-ph" style="background:${colorFromString(sub.title || "")}">` +
    `${escapeHtml(letter)}</div>`
  );
}

export function renderSubs() {
  const box = $("subList");
  if (!box) return;
  const all = getData().subs || [];
  if (!all.length) {
    box.innerHTML = '<div class="empty">还没有订阅。点右上角「+」粘贴 RSS URL 或导入 OPML。</div>';
    syncSubClear();
    syncSubsSelectUi();
    return;
  }

  const list = subQuery.trim()
    ? all.filter((s) => matchesQuery(s.title, subQuery) || matchesQuery(s.url, subQuery))
    : all;

  if (!list.length) {
    box.innerHTML = `<div class="empty">没有匹配「${escapeHtml(subQuery)}」的频道。</div>`;
    syncSubClear();
    syncSubsSelectUi();
    return;
  }

  box.innerHTML = list
    .map((s, idx) => {
      const selected = selectState.keys.has(s.id);
      const lead = selectState.mode
        ? `<input type="checkbox" class="sel-box" data-sel-key="${escapeHtml(s.id)}" ${
            selected ? "checked" : ""
          } aria-label="选择订阅" />`
        : "";
      const author = typeof s.author === "string" ? s.author.trim() : "";
      const authorHtml = author
        ? `<div class="sub-card__author">${escapeHtml(author)}</div>`
        : "";
      const more = selectState.mode
        ? ""
        : moreMenuHtml(
            [
              {
                key: "refresh",
                label: isFeedRefreshing() ? REFRESH_MENU_BUSY_LABEL : REFRESH_MENU_IDLE_LABEL,
                iconName: "rotateCcw",
                attrs: `data-idx="${idx}"`,
              },
              {
                key: "index-history",
                label: "索引历史",
                iconName: "history",
                attrs: `data-idx="${idx}"`,
              },
              {
                key: "copy-url",
                label: "复制源地址",
                iconName: "copy",
                attrs: `data-idx="${idx}"`,
              },
              {
                key: "delete",
                label: "取消订阅",
                iconName: "trash",
                danger: true,
                attrs: `data-idx="${idx}"`,
              },
            ],
            "sub-" + s.id
          );
      return (
        `<div class="sub-card${selectState.mode ? " select-mode" : ""}${
          selected ? " is-selected" : ""
        }" data-sub-card data-sub-id="${escapeHtml(s.id)}" data-idx="${idx}" role="button" tabindex="0">` +
        lead +
        subCoverHtml(s) +
        `<div class="sub-card__body">` +
        `<div class="sub-card__title">${escapeHtml(s.title || s.url)}</div>` +
        authorHtml +
        `</div>` +
        more +
        `</div>`
      );
    })
    .join("");

  if (selectState.mode) {
    box.querySelectorAll("input[data-sel-key]").forEach((input) => {
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-sel-key");
        if (!key) return;
        if (input.checked) selectState.keys.add(key);
        else selectState.keys.delete(key);
        const card = input.closest(".sub-card");
        if (card) card.classList.toggle("is-selected", input.checked);
        syncSubsSelectUi();
      });
    });
    box.querySelectorAll("[data-sub-card]").forEach((card) => {
      card.addEventListener("click", (ev) => {
        if (ev.target instanceof Element && ev.target.closest("input")) return;
        const input = card.querySelector("input[data-sel-key]");
        if (!input) return;
        input.checked = !input.checked;
        const key = input.getAttribute("data-sel-key");
        if (!key) return;
        if (input.checked) selectState.keys.add(key);
        else selectState.keys.delete(key);
        card.classList.toggle("is-selected", input.checked);
        syncSubsSelectUi();
      });
    });
    syncSubClear();
    syncSubsSelectUi();
    return;
  }

  box.querySelectorAll(".sub-card").forEach((card) => {
    const idx = Number(card.getAttribute("data-idx"));
    const sub = list[idx];
    if (!sub) return;

    const open = () => {
      void openEpisodes(sub.id);
    };
    card.addEventListener("click", (ev) => {
      if (ev.target instanceof Element && ev.target.closest(".more-wrap, input")) return;
      open();
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      if (ev.target instanceof Element && ev.target.closest(".more-wrap, input")) return;
      ev.preventDefault();
      open();
    });

    card.querySelectorAll("[data-more-toggle]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        togglePopover(btn.closest(".more-wrap"));
      });
    });

    card.querySelectorAll("[data-more-act]").forEach((btn) => {
      const act = btn.getAttribute("data-more-act");
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        closePopovers();
        if (act === "refresh") {
          if (isFeedRefreshing()) return;
          try {
            const r = await runFeedRefreshOne({
              refreshOne: () => api.refreshOne(sub.id),
              afterRefresh: async (result) => {
                if (!result || result.noop) return;
                if (!result.ok && (result.skipped || isSkippedBusy(result))) {
                  notify(REFRESH_BUSY_TOAST, "warn");
                  await trackRemoteRefreshBusy(api);
                  return;
                }
                if (result.ok) {
                  notify("已刷新（未改播放列表）", "ok");
                  await reloadSubs();
                  renderSubs();
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
          }
        } else if (act === "index-history") {
          btn.disabled = true;
          try {
            notify("正在索引该频道的历史节目…", "muted");
            const r = await api.indexHistory(sub.id);
            if (r && r.alreadyRunning) {
              notify("该频道正在索引，请稍候", "warn");
              return;
            }
            if (!r || !r.ok) {
              notify((r && (r.error || r.historyIndexError)) || "索引失败", "err");
              return;
            }
            notify("已按源里现有节目收录，更早的无法找回。", "ok");
            await reloadSubs();
            renderSubs();
          } catch (e) {
            notify(String(e), "err");
          } finally {
            btn.disabled = false;
          }
        } else if (act === "copy-url") {
          const ok = await copyText(String(sub.url || ""));
          if (ok) notify("已复制源地址", "ok");
          else notify("复制失败，请手动选择地址复制", "warn");
        } else if (act === "delete") {
          const ok = await uiConfirm({
            title: "取消订阅",
            message: "取消后该频道将从订阅列表移除。播放列表与进度不会自动清除。",
            okText: "取消订阅",
            danger: true,
          });
          if (!ok) return;
          await api.deleteSubscription(sub.id);
          notify("已取消订阅", "ok");
          await reloadSubs();
          renderSubs();
        }
      });
    });
  });

  syncSubClear();
  syncSubsSelectUi();
}

function syncSubClear() {
  const clear = $("subSearchClear");
  if (clear) clear.classList.toggle("hidden", !subQuery.trim());
}

/**
 * Open a channel's episode list.
 *
 * Uses the shared modal dialog with batched lazy loading instead of an inline
 * card, so the list stays responsive and the page keeps its scroll position.
 */
export async function openEpisodes(id) {
  await openChannelDialog(id);
}

export function bindSubsToolbar() {
  onFeedRefreshState((busy) => {
    applyRefreshMenuBusy(document.getElementById("subList") || document, busy);
  });

  const input = $("subSearch");
  const clear = $("subSearchClear");
  if (input) {
    input.addEventListener("input", () => {
      subQuery = input.value;
      renderSubs();
    });
  }
  if (clear) {
    clear.addEventListener("click", () => {
      subQuery = "";
      if (input) input.value = "";
      renderSubs();
      if (input) input.focus();
    });
  }

  const selectBtn = $("btnSubsSelect");
  if (selectBtn) {
    selectBtn.addEventListener("click", () => setSubsSelectMode(!selectState.mode));
  }
  const selectCancel = $("btnSubsSelectCancel");
  if (selectCancel) {
    selectCancel.addEventListener("click", () => setSubsSelectMode(false));
  }
  const deleteSelected = $("btnSubsDeleteSelected");
  if (deleteSelected) {
    deleteSelected.addEventListener("click", async () => {
      const ids = Array.from(selectState.keys);
      if (!ids.length) return;
      const ok = await uiConfirm({
        title: "删除所选订阅",
        message: `删除选中的 ${ids.length} 个订阅管理项？播放列表与进度不会自动清除。`,
        okText: "删除",
        danger: true,
      });
      if (!ok) return;
      deleteSelected.disabled = true;
      try {
        const r = await api.batchDeleteSubscriptions(ids);
        if (!r.ok) {
          notify(r.error || "删除失败", "err");
          return;
        }
        notify(r.tip || `已删除 ${r.removedCount || ids.length} 条订阅`, "ok");
        selectState.keys.clear();
        setSubsSelectMode(false);
        await reloadSubs();
        renderSubs();
      } catch (e) {
        notify(String(e), "err");
      } finally {
        syncSubsSelectUi();
      }
    });
  }

  const btnExport = $("btnOpmlExport");
  if (btnExport) btnExport.addEventListener("click", exportOpml);

  const btnOpenAdd = $("btnOpenAddSub");
  const addCard = $("addSubCard");

  /** Close the add-subscription card and clear leftover form/OPML state. */
  function closeAddSubCard() {
    closeAddSubForm(
      {
        card: addCard,
        feedUrl: $("feedUrl"),
        opmlText: $("opmlText"),
        opmlFile: $("opmlFile"),
        opmlSummary: $("opmlSummary"),
        importBtn: $("btnOpmlImport"),
      },
      pendingState
    );
  }

  if (btnOpenAdd && addCard) {
    btnOpenAdd.addEventListener("click", () => {
      setHidden(addCard, false);
      const field = $("feedUrl");
      if (field) field.focus();
    });
  }
  const btnCloseAdd = $("btnCloseAddSub");
  if (btnCloseAdd && addCard) {
    btnCloseAdd.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeAddSubCard();
    });
  }
  const btnCancelAdd = $("btnCancelAddSub");
  if (btnCancelAdd && addCard) {
    btnCancelAdd.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeAddSubCard();
    });
  }

  const btnAdd = $("btnAdd");
  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const url = ($("feedUrl").value || "").trim();
      if (!url) {
        notify("请填写 RSS URL", "warn");
        return;
      }
      btnAdd.disabled = true;
      try {
        const r = await api.addSubscription(url);
        if (!r.ok) notify(r.error || "添加失败", "err");
        else {
          notify(r.already ? "已存在，已刷新索引" : "已添加并拉取索引", "ok");
          $("feedUrl").value = "";
          closeAddSubCard();
          await reloadSubs();
          await renderSubs();
        }
      } catch (e) {
        notify(String(e), "err");
      } finally {
        btnAdd.disabled = false;
      }
    });
  }

  bindOpmlControls({ closeAddSubCard });
}

/** OPML import controls (preview → import) and export. */
function bindOpmlControls(hooks = {}) {
  const closeAddSubCard = typeof hooks.closeAddSubCard === "function" ? hooks.closeAddSubCard : null;
  const file = $("opmlFile");
  if (file) {
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      $("opmlText").value = await f.text();
    });
  }

  const preview = $("btnOpmlPreview");
  if (preview) {
    preview.addEventListener("click", async () => {
      const text = $("opmlText").value;
      if (!text.trim()) {
        notify("需要 OPML 文本", "warn");
        return;
      }
      try {
        const r = await api.opmlPreview(text);
        if (!r.ok) {
          notify(r.error || "预览失败", "err");
          pendingState.opmlText = null;
          $("btnOpmlImport").disabled = true;
          return;
        }
        pendingState.opmlText = text;
        $("btnOpmlImport").disabled = false;
        const s = r.summary || {};
        $("opmlSummary").textContent =
          `新增 ${s.neu ?? s.new ?? 0} · 重复 ${s.duplicate ?? 0} · 无效 ${s.invalid ?? 0}`;
        notify("预览完成，确认后才会写入", "ok");
      } catch (e) {
        notify(String(e), "err");
      }
    });
  }

  const imp = $("btnOpmlImport");
  if (imp) {
    imp.addEventListener("click", async () => {
      if (!pendingState.opmlText) return;
      imp.disabled = true;
      try {
        const r = await api.opmlImport(pendingState.opmlText);
        if (!r.ok) notify(r.error || "导入失败", "err");
        else {
          notify(r.tip || "导入完成", "ok");
          pendingState.opmlText = null;
          if (closeAddSubCard) closeAddSubCard();
          await reloadSubs();
          renderSubs();
        }
      } catch (e) {
        notify(String(e), "err");
      } finally {
        if (pendingState.opmlText) imp.disabled = false;
      }
    });
  }

  const cancel = $("btnOpmlCancel");
  if (cancel) {
    cancel.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      // OPML「取消」only resets import fields; keep the add card open.
      resetOpmlImport(
        {
          opmlText: $("opmlText"),
          opmlFile: $("opmlFile"),
          opmlSummary: $("opmlSummary"),
          importBtn: $("btnOpmlImport"),
        },
        pendingState
      );
    });
  }
}

/** Download the exported OPML, degrading to a copy dialog when blocked. */
async function exportOpml() {
  try {
    const r = await api.opmlExport();
    if (!r || !r.ok) {
      notify((r && r.error) || "导出失败", "err");
      return;
    }
    if (!r.count) {
      notify("还没有可导出的订阅", "warn");
      return;
    }

    let downloaded = false;
    try {
      const blob = new Blob([r.opml], { type: "text/x-opml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename || "podcasts.opml";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 2000);
      downloaded = true;
    } catch (_) {
      downloaded = false;
    }

    if (downloaded) {
      notify(`已导出 ${r.count} 个订阅`, "ok");
      return;
    }

    // Fallback: show the XML for manual copy.
    const ta = document.createElement("div");
    ta.innerHTML =
      `<p class="muted">当前环境可能阻止下载，可复制下面的内容保存为 <code>${escapeHtml(
        r.filename || "podcasts.opml"
      )}</code>。</p>` +
      `<textarea id="opmlExportText" readonly style="min-height:220px"></textarea>`;
    const dlg = openModal({
      title: "导出 OPML",
      body: ta,
      size: "wide",
      actions: [
        {
          label: "复制",
          kind: "primary",
          iconName: "copy",
          close: false,
          onClick: async () => {
            const area = document.getElementById("opmlExportText");
            if (!area) return false;
            area.select();
            const ok = await copyText(area.value);
            if (ok) notify("已复制到剪贴板", "ok");
            else notify("复制失败，请手动选择复制", "warn");
            return false;
          },
        },
        { label: "关闭", kind: "ghost", close: true },
      ],
    });
    const area = document.getElementById("opmlExportText");
    if (area) area.value = r.opml;
    await dlg;
  } catch (e) {
    notify(String(e), "err");
  }
}
