/** Pure formatting helpers (no DOM, no side effects). */

/** Seconds → `m:ss` / `h:mm:ss`. */
export function fmtSec(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Epoch millis → `2026/11/9 18:20` (or `—`). */
export function fmtTime(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return "—";
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/** Date bucket label used by the「最近更新」list. */
export function dateGroupKey(ms) {
  if (!ms || !Number.isFinite(ms) || ms < 86400000) return "未知日期";
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "未知日期";
  return `${d.getMonth() + 1}月 ${d.getDate()}日`;
}

/** Only absolute (or data:) cover urls are usable inside the plugin webview. */
export function absoluteCoverUrl(url) {
  const u = typeof url === "string" ? url.trim() : "";
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
  return "";
}

/** 0..1 progress ratio for a progress payload. */
export function progressRatio(prog, durationSec) {
  if (!prog) return 0;
  if (prog.completed) return 1;
  const dur = (prog && prog.durationSec) || durationSec;
  const pos = prog && typeof prog.positionSec === "number" ? prog.positionSec : 0;
  if (!dur || dur <= 0 || pos <= 0) return 0;
  return Math.max(0, Math.min(1, pos / dur));
}

/** Stable colour for placeholder cover letters. */
export function colorFromString(input) {
  const s = String(input || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${hash} 52% 45%)`;
}

/** Case-insensitive substring match used by the search boxes. */
export function matchesQuery(haystack, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return String(haystack || "").toLowerCase().includes(q);
}
