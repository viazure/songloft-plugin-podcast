const { apiGet, apiPost } = SongloftPlugin;

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setFlash(text, cls) {
  const el = $("flash");
  el.className = cls || "muted";
  el.textContent = text ? String(text) : "";
}

function fmtTime(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  try { return new Date(ms).toLocaleString(); } catch { return "—"; }
}

async function apiPut(path, body) {
  if (typeof SongloftPlugin.apiPut === "function") {
    return SongloftPlugin.apiPut(path, body);
  }
  if (typeof SongloftPlugin.apiRequest === "function") {
    return SongloftPlugin.apiRequest("PUT", path, body);
  }
  const base = (SongloftPlugin.baseUrl || SongloftPlugin.apiBase || "").replace(/\/$/, "");
  const res = await fetch((base || "") + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(SongloftPlugin.headers || {}) },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

async function apiDelete(path, body) {
  if (typeof SongloftPlugin.apiDelete === "function") {
    return SongloftPlugin.apiDelete(path, body);
  }
  if (typeof SongloftPlugin.apiRequest === "function") {
    return SongloftPlugin.apiRequest("DELETE", path, body);
  }
  const base = (SongloftPlugin.baseUrl || SongloftPlugin.apiBase || "").replace(/\/$/, "");
  const res = await fetch((base || "") + path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(SongloftPlugin.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/** Last OPML text that passed preview; import reuses it (cancel clears). */
let pendingOpmlText = null;

function renderSubs(list) {
  const box = $("subList");
  if (!list || !list.length) {
    box.innerHTML = '<div class="empty">还没有订阅。粘贴公开 RSS URL 后点「添加并拉取」，或导入 OPML。</div>';
    return;
  }
  box.innerHTML = list.map((s) => {
    const err = s.lastError
      ? `<div class="err">最近错误：${escapeHtml(s.lastError)}</div>`
      : "";
    const skipped = s.lastSkippedNonAudio
      ? ` · 跳过非音频 ${s.lastSkippedNonAudio}`
      : "";
    return (
      `<div class="sub-row" data-id="${escapeHtml(s.id)}">` +
        `<h3>${escapeHtml(s.title || s.url)}</h3>` +
        `<div class="sub-meta">` +
          `${escapeHtml(s.url)}<br/>` +
          `歌单：${escapeHtml(s.playlistName || "（尚未生成）")}` +
          (s.playlistId != null ? ` (#${s.playlistId})` : "") +
          `<br/>剧集 ${s.episodeCount || 0}${skipped}` +
          `<br/>上次成功：${escapeHtml(fmtTime(s.lastSuccessAt))}` +
          err +
        `</div>` +
        `<div class="sub-actions">` +
          `<button type="button" data-act="episodes">剧集</button>` +
          `<button type="button" class="secondary" data-act="refresh">刷新</button>` +
          `<button type="button" class="secondary" data-act="edit">改 URL</button>` +
          `<button type="button" class="danger" data-act="delete">删除</button>` +
        `</div>` +
      `</div>`
    );
  }).join("");
}

function renderEpisodes(payload) {
  const card = $("episodesCard");
  card.hidden = false;
  $("episodesTitle").textContent = "剧集 · " + (payload.title || "");
  $("episodesTip").textContent = payload.playTip || "";
  const eps = Array.isArray(payload.episodes) ? payload.episodes : [];
  const box = $("epList");
  if (!eps.length) {
    box.innerHTML = '<div class="empty">暂无剧集索引。先刷新该订阅。</div>';
    return;
  }
  box.innerHTML = eps.map((ep) => {
    const when = ep.pubDate || (ep.pubDateMs ? fmtTime(ep.pubDateMs) : "");
    const dur = ep.durationSec != null ? Math.round(ep.durationSec / 60) + " 分钟" : "";
    const meta = [when, dur, ep.songId != null ? "song#" + ep.songId : ""]
      .filter(Boolean).join(" · ");
    return (
      `<div class="ep-row"><strong>${escapeHtml(ep.title || "")}</strong>` +
      (meta ? `<div class="meta">${escapeHtml(meta)}</div>` : "") +
      `</div>`
    );
  }).join("");
}

function renderLog(log) {
  const box = $("logBox");
  const list = Array.isArray(log) ? log.slice().reverse() : [];
  if (!list.length) {
    box.textContent = "（空）";
    return;
  }
  box.textContent = list
    .map((e) => `${fmtTime(e.ts)} [${e.level}] ${e.message}`)
    .join("\n");
}

function applySchedule(data) {
  $("scheduleEnabled").checked = !!data.scheduleEnabled;
  const iv = String(data.scheduleIntervalHours || 6);
  $("scheduleInterval").value = ["6", "12", "24"].includes(iv) ? iv : "6";
  if (data.maxEpisodes) $("maxEpisodes").value = String(data.maxEpisodes);
  const next = data.scheduleEnabled
    ? ("下次：" + fmtTime(data.scheduleNextDueAt))
    : "下次：定时未启用";
  const last = "上次成功：" + fmtTime(data.scheduleLastSuccessAt);
  $("scheduleMeta").textContent = last + " · " + next;
}

function clearOpmlPreview() {
  pendingOpmlText = null;
  $("btnOpmlImport").disabled = true;
  $("opmlSummary").textContent = "";
  $("opmlList").innerHTML = "";
}

function statusTag(status) {
  if (status === "new") return '<span class="tag new">新增</span>';
  if (status === "duplicate_existing" || status === "duplicate_in_file") {
    return '<span class="tag dup">重复</span>';
  }
  return '<span class="tag bad">无效</span>';
}

function renderOpmlPreview(payload) {
  const s = payload.summary || {};
  const title = payload.documentTitle ? `「${payload.documentTitle}」` : "（无标题）";
  $("opmlSummary").innerHTML =
    `${escapeHtml(title)} · 新增 ${s.neu || 0} · 重复 ${s.duplicate || 0} · 无效 ${s.invalid || 0}` +
    (payload.fileWarnings && payload.fileWarnings.length
      ? `<div class="warn">文件警告：${escapeHtml(payload.fileWarnings.map((w) => w.message).join("；"))}</div>`
      : "");
  const items = Array.isArray(payload.items) ? payload.items : [];
  const box = $("opmlList");
  if (!items.length) {
    box.innerHTML = '<div class="empty">没有可展示条目</div>';
    return;
  }
  box.innerHTML = items.slice(0, 200).map((it) => {
    const warns = (it.warnings || []).map((w) => w.message).join("；");
    const errs = (it.errors || []).map((e) => e.message).join("；");
    const path = (it.folderPath && it.folderPath.length)
      ? escapeHtml(it.folderPath.join(" / ")) + " / "
      : "";
    return (
      `<div class="opml-row">` +
        statusTag(it.status) +
        `${path}<strong>${escapeHtml(it.title || "(无标题)")}</strong>` +
        (it.feedUrl ? `<div class="muted">${escapeHtml(it.feedUrl)}</div>` : "") +
        (warns ? `<div class="warn">${escapeHtml(warns)}</div>` : "") +
        (errs ? `<div class="err">${escapeHtml(errs)}</div>` : "") +
      `</div>`
    );
  }).join("");
}

async function reloadAll() {
  try {
    const [subs, settings, log] = await Promise.all([
      apiGet("/api/subscriptions"),
      apiGet("/api/settings"),
      apiGet("/api/log"),
    ]);
    if (subs && subs.ok) renderSubs(subs.subscriptions || []);
    if (settings && settings.ok) applySchedule(settings);
    if (log && log.ok) renderLog(log.log || []);
  } catch (e) {
    setFlash("加载失败：" + e, "err");
  }
}

$("btnReload").onclick = () => reloadAll();

$("btnAdd").onclick = async () => {
  const url = $("feedUrl").value.trim();
  if (!url) { setFlash("请填写 RSS URL", "warn"); return; }
  setFlash("正在添加并拉取…");
  $("btnAdd").disabled = true;
  try {
    const res = await apiPost("/api/subscriptions", { url });
    if (!res || !res.ok) {
      setFlash((res && res.error) || "添加失败", "err");
    } else {
      setFlash(
        `已订阅「${res.subscription.title}」→ 歌单「${res.playlistName}」（${res.createdSongs || 0} 首）` +
          (res.already ? "（已存在，已刷新）" : ""),
        "ok"
      );
      $("feedUrl").value = "";
      await reloadAll();
    }
  } catch (e) {
    setFlash("添加失败：" + e, "err");
  } finally {
    $("btnAdd").disabled = false;
  }
};

$("btnRefreshAll").onclick = async () => {
  setFlash("正在刷新全部…");
  try {
    const res = await apiPost("/api/refresh", {});
    if (res && res.skipped) {
      setFlash("刷新跳过：忙碌中", "warn");
    } else if (res && res.ok) {
      setFlash("全部刷新完成", "ok");
    } else {
      const fails = (res && res.results || []).filter((r) => !r.ok);
      setFlash(
        fails.length
          ? ("部分失败：" + fails.map((f) => f.title + ":" + (f.reason || "")).join("；"))
          : "刷新结束",
        fails.length ? "warn" : "ok"
      );
    }
    await reloadAll();
  } catch (e) {
    setFlash("刷新失败：" + e, "err");
  }
};

$("btnSaveSchedule").onclick = async () => {
  try {
    const res = await apiPost("/api/settings", {
      scheduleEnabled: $("scheduleEnabled").checked,
      scheduleIntervalHours: Number($("scheduleInterval").value),
      maxEpisodes: Number($("maxEpisodes").value),
    });
    if (!res || !res.ok) {
      setFlash("保存失败", "err");
    } else {
      applySchedule(res);
      setFlash("已保存定时 / 设置", "ok");
    }
  } catch (e) {
    setFlash("保存失败：" + e, "err");
  }
};

$("opmlFile").onchange = async (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  try {
    const text = await f.text();
    $("opmlText").value = text;
    clearOpmlPreview();
    setFlash("已载入文件，请点「预览」", "muted");
  } catch (e) {
    setFlash("读取文件失败：" + e, "err");
  }
};

$("btnOpmlCancel").onclick = () => {
  clearOpmlPreview();
  $("opmlText").value = "";
  $("opmlFile").value = "";
  setFlash("已取消 OPML 导入（零写入）", "muted");
};

$("btnOpmlPreview").onclick = async () => {
  const text = $("opmlText").value;
  if (!String(text || "").trim()) {
    setFlash("请先上传或粘贴 OPML", "warn");
    return;
  }
  setFlash("正在离线预览 OPML…");
  $("btnOpmlPreview").disabled = true;
  try {
    const res = await apiPost("/api/opml/preview", { opml: text });
    if (!res || !res.ok) {
      clearOpmlPreview();
      setFlash((res && res.error) || "预览失败", "err");
      return;
    }
    pendingOpmlText = text;
    renderOpmlPreview(res);
    const neu = (res.summary && res.summary.neu) || 0;
    $("btnOpmlImport").disabled = neu <= 0;
    setFlash(
      neu > 0
        ? `预览完成：可新增 ${neu} 条。确认后才会写入；不会自动刷新 RSS。`
        : "预览完成：没有可新增条目",
      neu > 0 ? "ok" : "warn"
    );
  } catch (e) {
    clearOpmlPreview();
    setFlash("预览失败：" + e, "err");
  } finally {
    $("btnOpmlPreview").disabled = false;
  }
};

$("btnOpmlImport").onclick = async () => {
  if (!pendingOpmlText) {
    setFlash("请先预览", "warn");
    return;
  }
  if (!confirm("确认导入预览中的新增订阅？\n只写入管理项，不会拉取 RSS / 建歌单 / 播放。")) {
    return;
  }
  setFlash("正在导入…");
  $("btnOpmlImport").disabled = true;
  try {
    const res = await apiPost("/api/opml/import", { opml: pendingOpmlText });
    if (res && res.skipped) {
      setFlash("导入跳过：忙碌中", "warn");
      $("btnOpmlImport").disabled = false;
      return;
    }
    if (!res || !res.ok) {
      setFlash((res && res.error) || "导入失败", "err");
      $("btnOpmlImport").disabled = false;
      return;
    }
    setFlash(res.tip || `已新增 ${res.added || 0} 条`, "ok");
    clearOpmlPreview();
    $("opmlText").value = "";
    $("opmlFile").value = "";
    await reloadAll();
  } catch (e) {
    setFlash("导入失败：" + e, "err");
    $("btnOpmlImport").disabled = false;
  }
};

$("subList").onclick = async (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const row = btn.closest(".sub-row");
  if (!row) return;
  const id = row.getAttribute("data-id");
  const act = btn.getAttribute("data-act");
  if (act === "episodes") {
    try {
      const res = await apiGet("/api/subscriptions/" + encodeURIComponent(id) + "/episodes");
      if (!res || !res.ok) setFlash((res && res.error) || "加载剧集失败", "err");
      else renderEpisodes(res);
    } catch (e) {
      setFlash("加载剧集失败：" + e, "err");
    }
    return;
  }
  if (act === "refresh") {
    setFlash("正在刷新…");
    try {
      const res = await apiPost("/api/subscriptions/" + encodeURIComponent(id) + "/refresh", {});
      if (res && res.skipped) setFlash("刷新跳过：忙碌中", "warn");
      else if (!res || !res.ok) setFlash((res && res.error) || "刷新失败", "err");
      else setFlash(`已刷新「${res.subscription.title}」`, "ok");
      await reloadAll();
    } catch (e) {
      setFlash("刷新失败：" + e, "err");
    }
    return;
  }
  if (act === "edit") {
    const next = prompt("新的 RSS URL", row.querySelector(".sub-meta")?.textContent?.split("\n")[0] || "");
    if (next == null) return;
    const url = String(next).trim();
    if (!url) return;
    setFlash("正在更新 URL…");
    try {
      const res = await apiPut("/api/subscriptions/" + encodeURIComponent(id), { url });
      if (!res || !res.ok) setFlash((res && res.error) || "更新失败", "err");
      else {
        setFlash("已更新并刷新「" + res.subscription.title + "」", "ok");
        await reloadAll();
      }
    } catch (e) {
      setFlash("更新失败：" + e, "err");
    }
    return;
  }
  if (act === "delete") {
    const clear = confirm(
      "删除订阅管理项？\n\n确定 = 仅移除管理（保留歌单与远程曲）\n取消 = 什么也不做\n\n若还要清空歌单曲目，删除后再在下一提示确认。"
    );
    if (!clear) return;
    const clearPlaylist = confirm("是否同时清空该订阅对应歌单内的曲目？（歌单本身与远程曲仍保留）");
    try {
      const res = await apiDelete("/api/subscriptions/" + encodeURIComponent(id), {
        clearPlaylist: !!clearPlaylist,
      });
      if (!res || !res.ok) setFlash((res && res.error) || "删除失败", "err");
      else {
        setFlash(res.tip || "已删除", "ok");
        $("episodesCard").hidden = true;
        await reloadAll();
      }
    } catch (e) {
      setFlash("删除失败：" + e, "err");
    }
  }
};

reloadAll();
