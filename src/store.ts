import type { RefreshScheduleState } from "./schedule";
import { DEFAULT_REFRESH_SCHEDULE, normalizeIntervalHours } from "./schedule";
import { feedIdFromUrl, normalizeFeedUrl } from "./hash";

export const DEFAULT_MAX_EPISODES = 50;

export interface EpisodeSummary {
  title: string;
  guid: string | null;
  pubDate: string | null;
  pubDateMs: number | null;
  durationSec: number | null;
  coverUrl: string | null;
  enclosureUrl: string;
  dedupKey: string;
  songId?: number;
}

export interface Subscription {
  id: string;
  url: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  playlistId: number | null;
  playlistName: string | null;
  createdAt: number;
  updatedAt: number;
  lastSuccessAt: number | null;
  lastError: string | null;
  lastSkippedNonAudio: number;
  episodeCount: number;
  /** Recent episode index (capped). */
  episodes: EpisodeSummary[];
}

export interface PluginSettings {
  maxEpisodes: number;
}

const SUBS_KEY = "subscriptions";
const SETTINGS_KEY = "settings";
const SCHEDULE_KEY = "refresh_schedule";
const LOG_KEY = "recent_log";
const MAX_LOG = 40;
const MAX_EPISODE_INDEX = 80;

const DEFAULT_SETTINGS: PluginSettings = {
  maxEpisodes: DEFAULT_MAX_EPISODES,
};

function asObject(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function numOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeReason(raw: unknown): string {
  let s = String(raw ?? "").trim();
  if (!s) return "未知错误";
  if (s.length > 200) s = s.slice(0, 200) + "…";
  return s;
}

function normalizeEpisode(raw: unknown): EpisodeSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "";
  const enclosureUrl = typeof o.enclosureUrl === "string" ? o.enclosureUrl : "";
  const dedupKey = typeof o.dedupKey === "string" ? o.dedupKey : "";
  if (!enclosureUrl && !dedupKey) return null;
  const ep: EpisodeSummary = {
    title: title || "Untitled",
    guid: typeof o.guid === "string" ? o.guid : null,
    pubDate: typeof o.pubDate === "string" ? o.pubDate : null,
    pubDateMs: typeof o.pubDateMs === "number" && Number.isFinite(o.pubDateMs) ? o.pubDateMs : null,
    durationSec:
      typeof o.durationSec === "number" && Number.isFinite(o.durationSec) ? o.durationSec : null,
    coverUrl: typeof o.coverUrl === "string" ? o.coverUrl : null,
    enclosureUrl,
    dedupKey,
  };
  if (typeof o.songId === "number" && Number.isFinite(o.songId)) ep.songId = o.songId;
  return ep;
}

function normalizeSub(raw: unknown): Subscription | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url : "";
  if (!url) return null;
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : feedIdFromUrl(url);
  const episodes = Array.isArray(o.episodes)
    ? (o.episodes.map(normalizeEpisode).filter(Boolean) as EpisodeSummary[]).slice(0, MAX_EPISODE_INDEX)
    : [];
  return {
    id,
    url,
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : url,
    author: typeof o.author === "string" ? o.author : null,
    coverUrl: typeof o.coverUrl === "string" ? o.coverUrl : null,
    playlistId: typeof o.playlistId === "number" ? o.playlistId : null,
    playlistName: typeof o.playlistName === "string" ? o.playlistName : null,
    createdAt: numOr(o.createdAt, Date.now()),
    updatedAt: numOr(o.updatedAt, Date.now()),
    lastSuccessAt:
      typeof o.lastSuccessAt === "number" && Number.isFinite(o.lastSuccessAt)
        ? o.lastSuccessAt
        : null,
    lastError: typeof o.lastError === "string" && o.lastError ? sanitizeReason(o.lastError) : null,
    lastSkippedNonAudio: numOr(o.lastSkippedNonAudio, 0),
    episodeCount: numOr(o.episodeCount, episodes.length),
    episodes,
  };
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  try {
    const raw = await songloft.storage.get(SUBS_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return data.map(normalizeSub).filter((x): x is Subscription => !!x);
  } catch {
    return [];
  }
}

export async function saveSubscriptions(list: Subscription[]): Promise<Subscription[]> {
  await songloft.storage.set(SUBS_KEY, list);
  return list;
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const list = await loadSubscriptions();
  return list.find((s) => s.id === id) || null;
}

export async function upsertSubscription(sub: Subscription): Promise<Subscription[]> {
  const list = await loadSubscriptions();
  const i = list.findIndex((s) => s.id === sub.id);
  if (i >= 0) list[i] = sub;
  else list.push(sub);
  return saveSubscriptions(list);
}

export async function removeSubscription(id: string): Promise<{
  removed: Subscription | null;
  list: Subscription[];
}> {
  const list = await loadSubscriptions();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { removed: null, list };
  const removed = list[i];
  list.splice(i, 1);
  await saveSubscriptions(list);
  return { removed, list };
}

export function findByUrl(list: Subscription[], url: string): Subscription | null {
  const norm = normalizeFeedUrl(url);
  return (
    list.find((s) => normalizeFeedUrl(s.url) === norm || s.url.trim() === url.trim()) || null
  );
}

export async function loadSettings(): Promise<PluginSettings> {
  try {
    const raw = await songloft.storage.get(SETTINGS_KEY);
    const data = asObject(raw);
    let max = numOr(data.maxEpisodes, DEFAULT_MAX_EPISODES);
    if (max < 1) max = 1;
    if (max > 200) max = 200;
    return { maxEpisodes: max };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial: Partial<PluginSettings>): Promise<PluginSettings> {
  const cur = await loadSettings();
  let max = partial.maxEpisodes !== undefined ? Number(partial.maxEpisodes) : cur.maxEpisodes;
  if (!Number.isFinite(max) || max < 1) max = cur.maxEpisodes;
  if (max > 200) max = 200;
  const next = { maxEpisodes: Math.round(max) };
  await songloft.storage.set(SETTINGS_KEY, next);
  return next;
}

export async function loadRefreshSchedule(): Promise<RefreshScheduleState> {
  try {
    const raw = await songloft.storage.get(SCHEDULE_KEY);
    const data = asObject(raw);
    return {
      enabled: data.enabled === true,
      intervalHours: normalizeIntervalHours(data.intervalHours),
      lastSuccessAt:
        typeof data.lastSuccessAt === "number" && Number.isFinite(data.lastSuccessAt)
          ? data.lastSuccessAt
          : null,
      nextDueAt:
        typeof data.nextDueAt === "number" && Number.isFinite(data.nextDueAt)
          ? data.nextDueAt
          : null,
    };
  } catch {
    return { ...DEFAULT_REFRESH_SCHEDULE };
  }
}

export async function saveRefreshSchedule(
  partial: Partial<RefreshScheduleState>
): Promise<RefreshScheduleState> {
  const cur = await loadRefreshSchedule();
  const next: RefreshScheduleState = {
    enabled: partial.enabled !== undefined ? !!partial.enabled : cur.enabled,
    intervalHours: normalizeIntervalHours(
      partial.intervalHours !== undefined ? partial.intervalHours : cur.intervalHours
    ),
    lastSuccessAt:
      partial.lastSuccessAt !== undefined
        ? partial.lastSuccessAt == null || !Number.isFinite(partial.lastSuccessAt as number)
          ? null
          : (partial.lastSuccessAt as number)
        : cur.lastSuccessAt,
    nextDueAt:
      partial.nextDueAt !== undefined
        ? partial.nextDueAt == null || !Number.isFinite(partial.nextDueAt as number)
          ? null
          : (partial.nextDueAt as number)
        : cur.nextDueAt,
  };
  await songloft.storage.set(SCHEDULE_KEY, next);
  return next;
}

export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

export async function loadLog(): Promise<LogEntry[]> {
  try {
    const raw = await songloft.storage.get(LOG_KEY);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    return data
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const message = typeof o.message === "string" ? o.message : "";
        if (!message) return null;
        const level =
          o.level === "error" || o.level === "warn" || o.level === "info" ? o.level : "info";
        return {
          ts: typeof o.ts === "number" ? o.ts : Date.now(),
          level,
          message: sanitizeReason(message),
        } as LogEntry;
      })
      .filter((x): x is LogEntry => !!x)
      .slice(-MAX_LOG);
  } catch {
    return [];
  }
}

export async function appendLog(
  level: "info" | "warn" | "error",
  message: string
): Promise<void> {
  const list = await loadLog();
  list.push({ ts: Date.now(), level, message: sanitizeReason(message) });
  const next = list.slice(-MAX_LOG);
  await songloft.storage.set(LOG_KEY, next);
}

export function publicSubscription(s: Subscription) {
  return {
    id: s.id,
    url: s.url,
    title: s.title,
    author: s.author,
    coverUrl: s.coverUrl,
    playlistId: s.playlistId,
    playlistName: s.playlistName,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lastSuccessAt: s.lastSuccessAt,
    lastError: s.lastError,
    lastSkippedNonAudio: s.lastSkippedNonAudio,
    episodeCount: s.episodeCount,
  };
}
