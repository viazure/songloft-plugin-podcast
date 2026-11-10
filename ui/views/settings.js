/** 「设置」view: refresh schedule, speaker casting, recent log. */

import { $ } from "../lib/dom.js";
import { fmtTime } from "../lib/format.js";
import { getData, patch } from "../lib/store.js";
import { api } from "../lib/api.js";
import { notify, castToSpeaker } from "../lib/actions.js";
import * as Playback from "../lib/playback.js";
import { escapeHtml } from "../lib/dom.js";
import { icon } from "../lib/icons.js";

let selectedDeviceId = "";

export async function loadSettings() {
  try {
    const r = await api.settings();
    if (!r || !r.ok) return;
    patch({ settings: r });
    const enabled = $("scheduleEnabled");
    const interval = $("scheduleInterval");
    const max = $("maxEpisodes");
    const limit = Number(r.maxEpisodesLimit) || 200;
    if (enabled) enabled.checked = !!r.scheduleEnabled;
    if (interval) interval.value = String(r.scheduleIntervalHours || 6);
    if (max) {
      // The input can never advertise more than the hard cap.
      max.max = String(limit);
      max.value = String(r.maxEpisodes || 50);
    }
    const hint = $("maxEpisodesHint");
    if (hint) {
      hint.textContent = `可填 1–${limit}，默认 50。超过 ${limit} 会自动收敛到 ${limit}。`;
    }
    const meta = $("scheduleMeta");
    if (meta) {
      meta.textContent = "下次：" + (r.scheduleNextDueAt ? fmtTime(r.scheduleNextDueAt) : "—");
    }
    const eventsNote = $("playEventsNote");
    if (eventsNote) {
      // Do not pretend host-bar / other-entry plays are fully covered when
      // songloft.events subscription is inactive (missing permission or old host).
      eventsNote.textContent = r.playEventsActive
        ? "进度与收听历史保存在本插件（按节目 feed + 单集 guid）。已订阅宿主播放事件：在宿主歌单 / 底栏播放且能解出 feed+guid 时也会记账；解不出则不写脏数据。"
        : "进度与收听历史保存在本插件（按节目 feed + 单集 guid）。当前未启用宿主播放事件订阅：只有在本插件页点播 / 入队时会写入历史；宿主其它入口的播放不会自动记入。";
    }
  } catch (_) {
    /* settings are non-critical on boot */
  }
}

/** Speaker device picker: reflects what the MIoT plugin actually has. */
export async function loadCastDevices() {
  const box = $("castDeviceList");
  if (!box) return;
  box.innerHTML = '<div class="empty">正在读取音箱…</div>';

  let res;
  try {
    res = await api.castStatus();
  } catch (e) {
    box.innerHTML = `<div class="empty">读取失败：${escapeHtml(String(e))}</div>`;
    return;
  }

  if (!res || !res.ok) {
    box.innerHTML = '<div class="empty">读取设备失败</div>';
    return;
  }
  if (!res.devices || !res.devices.length) {
    box.innerHTML =
      '<div class="empty">没有读到设备：请先在「智能音箱」插件登录小米账号。</div>';
    return;
  }

  const devices = res.devices || [];
  if (!selectedDeviceId || !devices.some((d) => d.deviceId === selectedDeviceId)) {
    const preferred =
      devices.find((d) => d.selected && d.online) ||
      devices.find((d) => d.selected) ||
      devices.find((d) => d.online) ||
      devices[0];
    selectedDeviceId = preferred ? preferred.deviceId : "";
  }

  const offlineCount = devices.filter((d) => !d.online).length;
  const hints = [];
  if (!res.available) hints.push("所有音箱都离线，投放前请先唤醒音箱");
  else if (offlineCount) hints.push(`有 ${offlineCount} 台设备离线`);

  box.innerHTML =
    (hints.length ? `<div class="cast-hint">${escapeHtml(hints.join("；"))}</div>` : "") +
    devices
      .map((d) => {
        const checked = d.deviceId === selectedDeviceId;
        const status = d.online ? "在线" : "离线";
        return (
          `<label class="cast-device${checked ? " is-selected" : ""}${d.online ? "" : " is-offline"}">` +
          `<input type="radio" name="castDevice" value="${escapeHtml(d.deviceId)}" ${checked ? "checked" : ""} />` +
          `<span class="cast-device__name">${escapeHtml(d.name)}</span>` +
          `<span class="cast-device__status${d.online ? " is-online" : ""}">${escapeHtml(status)}</span>` +
          (d.selected ? '<span class="badge badge--warn">上次使用</span>' : "") +
          `</label>`
        );
      })
      .join("");

  box.querySelectorAll('input[name="castDevice"]').forEach((input) => {
    input.addEventListener("change", () => {
      selectedDeviceId = input.value;
      box.querySelectorAll(".cast-device").forEach((el) => el.classList.remove("is-selected"));
      const label = input.closest(".cast-device");
      if (label) label.classList.add("is-selected");
    });
  });
}

export async function loadLog() {
  try {
    const r = await api.log();
    if (!r || !r.ok) return;
    const box = $("logBox");
    if (!box) return;
    const lines = (r.log || []).map((x) => `[${fmtTime(x.ts)}] ${x.level}: ${x.message}`);
    box.textContent = lines.join("\n") || "（空）";
  } catch (_) {
    /* ignore */
  }
}

export function bindSettings() {
  const save = $("btnSaveSchedule");
  if (save) {
    save.addEventListener("click", async () => {
      try {
        await api.saveSettings({
          scheduleEnabled: $("scheduleEnabled").checked,
          scheduleIntervalHours: Number($("scheduleInterval").value),
        });
        notify("设置已保存", "ok");
        await loadSettings();
      } catch (e) {
        notify(String(e), "err");
      }
    });
  }

  const saveIndex = $("btnSaveIndex");
  if (saveIndex) {
    saveIndex.addEventListener("click", async () => {
      const input = $("maxEpisodes");
      const limit = Number(input && input.max) || 200;
      const raw = Number(input && input.value);
      if (!Number.isFinite(raw) || raw < 1) {
        notify("索引深度需为 1 以上的整数", "warn");
        return;
      }
      // Clamp locally too: the server clamps, but the field should show the
      // value that was actually stored.
      const value = Math.min(Math.round(raw), limit);
      if (value !== raw) notify(`已收敛到上限 ${limit}`, "warn");
      try {
        const r = await api.saveSettings({ maxEpisodes: value });
        if (r && r.ok !== false && r.maxEpisodes != null && input) {
          input.value = String(r.maxEpisodes);
        }
        notify("索引深度已保存；下次刷新按新深度保留", "ok");
        await loadSettings();
      } catch (e) {
        notify(String(e), "err");
      }
    });
  }

  const refreshCast = $("btnCastRefresh");
  if (refreshCast) {
    refreshCast.addEventListener("click", async () => {
      refreshCast.disabled = true;
      try {
        await loadCastDevices();
      } finally {
        refreshCast.disabled = false;
      }
    });
  }

  const openMiot = $("btnOpenMiot");
  if (openMiot) {
    openMiot.addEventListener("click", () => {
      const url = `${location.origin}/api/v1/jsplugin/miot/`;
      const opened = window.open(url, "_blank", "noopener");
      if (!opened) notify(`请手动打开：${url}`, "warn");
    });
  }

  const testCast = $("btnTestCast");
  if (testCast) {
    testCast.addEventListener("click", async () => {
      const cur = Playback.get().current;
      if (!cur || cur.songId == null) {
        notify("先播放一集再测试投放", "warn");
        return;
      }
      testCast.disabled = true;
      try {
        await castToSpeaker(cur.songId, { deviceId: selectedDeviceId || undefined });
      } finally {
        testCast.disabled = false;
      }
    });
  }

  const reloadLog = $("btnReloadLog");
  if (reloadLog) reloadLog.addEventListener("click", () => loadLog());
}

export function renderSettings() {
  const settings = getData().settings;
  if (!settings) return;
  const meta = $("scheduleMeta");
  if (meta) {
    meta.textContent = "下次：" + (settings.scheduleNextDueAt ? fmtTime(settings.scheduleNextDueAt) : "—");
  }
}
