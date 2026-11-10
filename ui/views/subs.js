/** 「订阅」view: channel cards with cover icons, search and a 更多 menu. */

import { $, escapeHtml, setHidden } from "../lib/dom.js";
import { matchesQuery, colorFromString, absoluteCoverUrl, fmtTime } from "../lib/format.js";
import { getData } from "../lib/store.js";
import { episodeRowHtml, moreMenuHtml } from "../lib/rows.js";
import { reloadQueue, reloadSubs, notify } from "../lib/actions.js";
import { api } from "../lib/api.js";
import { openModal, uiConfirm, togglePopover, closePopovers } from "../lib/modal.js";
import { openChannelDialog } from "./channel-dialog.js";

let subQuery = "";
const pendingState = { opmlText: null };

function subCoverHtml(sub) {
  const abs = absoluteCoverUrl(sub.coverUrl);
  if (abs) {
    return `<img class="sub-card__cover" src="${escapeHtml(abs)}" alt="" loading="lazy" />`;
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
    return;
  }

  const list = subQuery.trim()
    ? all.filter((s) => matchesQuery(s.title, subQuery) || matchesQuery(s.url, subQuery))
    : all;

  if (!list.length) {
    box.innerHTML = `<div class="empty">没有匹配「${escapeHtml(subQuery)}」的频道。</div>`;
    syncSubClear();
    return;
  }

  box.innerHTML = list
    .map((s, idx) => {
      const err = s.lastError
        ? `<div class="sub-card__err">最近错误：${escapeHtml(s.lastError)}</div>`
        : "";
      const meta = [
        // Not an error: it only means the feed publishes more than our index
        // depth, and we keep the newest N.
        `<span title="该 feed 的剧集数超过本地索引深度，只保留最近若干集">剧集 ${Number(
          s.episodeCount
        ) || 0}${s.truncated ? "（已达索引上限）" : ""}</span>`,
        `<span>上次成功 ${escapeHtml(fmtTime(s.lastSuccessAt))}</span>`,
      ].join("");
      const more = moreMenuHtml(
        [
          { key: "refresh", label: "刷新", iconName: "rotateCcw", attrs: `data-idx="${idx}"` },
          { key: "queue-show", label: "加入播放列表", iconName: "listPlus", attrs: `data-idx="${idx}"` },
          {
            key: "delete",
            label: "删除订阅",
            iconName: "trash",
            danger: true,
            attrs: `data-idx="${idx}"`,
          },
        ],
        "sub-" + s.id
      );
      return (
        `<div class="sub-card" data-sub-card data-idx="${idx}">` +
        subCoverHtml(s) +
        `<div class="sub-card__body">` +
        `<div class="sub-card__title">${escapeHtml(s.title || s.url)}</div>` +
        `<div class="sub-card__meta">${meta}</div>` +
        `<div class="sub-card__url" title="${escapeHtml(s.url)}">${escapeHtml(s.url)}</div>` +
        err +
        `<div class="sub-card__actions">` +
        `<button type="button" class="chip-btn" data-sub-act="eps" data-idx="${idx}">` +
        `<span data-icon="listMusic" data-size="14"></span><span>剧集</span></button>` +
        more +
        `</div>` +
        `</div>` +
        `</div>`
      );
    })
    .join("");

  box.querySelectorAll(".sub-card").forEach((card) => {
    const idx = Number(card.getAttribute("data-idx"));
    const sub = list[idx];
    if (!sub) return;

    card.querySelectorAll("[data-sub-act]").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        await openEpisodes(sub.id);
      });
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
          btn.disabled = true;
          try {
            const r = await api.refreshOne(sub.id);
            notify(r.ok ? "已刷新（未改播放列表）" : r.error || "刷新失败", r.ok ? "ok" : "err");
            await reloadSubs();
            renderSubs();
          } finally {
            btn.disabled = false;
          }
        } else if (act === "queue-show") {
          btn.disabled = true;
          try {
            const r = await api.queueAddShow(sub.id);
            notify(
              r.ok ? `已追加 ${r.added} 首到「${r.playlistName}」` : r.error || "加入失败",
              r.ok ? "ok" : "err"
            );
            await reloadQueue();
          } finally {
            btn.disabled = false;
          }
        } else if (act === "delete") {
          const ok = await uiConfirm({
            title: "删除订阅",
            message: "删除该订阅管理项？播放列表与进度不会自动清除。",
            okText: "删除",
            danger: true,
          });
          if (!ok) return;
          await api.deleteSubscription(sub.id);
          notify("已删除订阅", "ok");
          await reloadSubs();
          renderSubs();
        }
      });
    });
  });

  syncSubClear();
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

  const btnRefreshAll = $("btnRefreshAll");
  if (btnRefreshAll) {
    btnRefreshAll.addEventListener("click", async () => {
      btnRefreshAll.disabled = true;
      try {
        const r = await api.refreshAll();
        if (!r.ok && r.skipped) notify("忙碌中，请稍后", "warn");
        else notify(r.ok ? "全部刷新完成（未改播放列表）" : "部分刷新失败，已保留旧数据", r.ok ? "ok" : "warn");
        await reloadSubs();
        renderSubs();
      } catch (e) {
        notify(String(e), "err");
      } finally {
        btnRefreshAll.disabled = false;
      }
    });
  }

  const btnExport = $("btnOpmlExport");
  if (btnExport) btnExport.addEventListener("click", exportOpml);

  const btnOpenAdd = $("btnOpenAddSub");
  const addCard = $("addSubCard");
  if (btnOpenAdd && addCard) {
    btnOpenAdd.addEventListener("click", () => {
      setHidden(addCard, false);
      const field = $("feedUrl");
      if (field) field.focus();
    });
  }
  const btnCloseAdd = $("btnCloseAddSub");
  if (btnCloseAdd && addCard) {
    btnCloseAdd.addEventListener("click", () => setHidden(addCard, true));
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

  bindOpmlControls();
}

/** OPML import controls (preview → import) and export. */
function bindOpmlControls() {
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
      try {
        const r = await api.opmlImport(pendingState.opmlText);
        if (!r.ok) notify(r.error || "导入失败", "err");
        else {
          notify(r.tip || "导入完成", "ok");
          pendingState.opmlText = null;
          imp.disabled = true;
          await reloadSubs();
          renderSubs();
        }
      } catch (e) {
        notify(String(e), "err");
      }
    });
  }

  const cancel = $("btnOpmlCancel");
  if (cancel) {
    cancel.addEventListener("click", () => {
      pendingState.opmlText = null;
      $("btnOpmlImport").disabled = true;
      $("opmlSummary").textContent = "";
      $("opmlText").value = "";
      $("opmlFile").value = "";
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
            try {
              await navigator.clipboard.writeText(area.value);
              notify("已复制到剪贴板", "ok");
            } catch (_) {
              notify("复制失败，请手动选择复制", "warn");
            }
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
