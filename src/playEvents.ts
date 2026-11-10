/**
 * Background playback accounting via songloft.events.onPlayEvent (P1).
 *
 * PlayEvent carries only play | finish | skip + song id — no continuous
 * position stream. Mid-track position still comes from the plugin page
 * (Host.onStateChange → /api/progress). With the `events` permission we can
 * still record history / mark completed when the user plays from the host
 * queue or bottom bar without the plugin UI open.
 *
 * Without `events`, only in-page play/queue paths write history (see settings).
 */

import type { PlayEvent } from "@songloft/plugin-sdk";
import { resolveEpisodeIdentity } from "./episodeIdentity";
import {
  recordHistory,
  rememberSongMapping,
  touchHistoryProgress,
  upsertProgress,
} from "./store";

const DEDUPE_MS = 2500;

type DedupeKey = string;
const recent = new Map<DedupeKey, number>();

let lastSongId: number | null = null;
let subscribed = false;

function dedupe(key: DedupeKey, now: number): boolean {
  const prev = recent.get(key) || 0;
  if (now - prev < DEDUPE_MS) return true;
  recent.set(key, now);
  if (recent.size > 80) {
    for (const [k, at] of recent) {
      if (now - at > DEDUPE_MS * 4) recent.delete(k);
    }
  }
  return false;
}

async function applyPlay(songId: number, at: number): Promise<void> {
  const id = await resolveEpisodeIdentity(songId, { remember: true });
  if (!id) {
    songloft.log.info(`[podcast] play event songId=${songId}: no feedUrl+guid — skip write`);
    return;
  }

  await rememberSongMapping(songId, id.feedUrl, id.guid).catch(() => {});

  // Track change: previous song already has a history row from its play event;
  // ensure the new song is recorded (deduped by feedUrl+guid inside recordHistory).
  await recordHistory({
    feedUrl: id.feedUrl,
    guid: id.guid,
    title: id.title,
    showTitle: id.showTitle,
    coverUrl: id.coverUrl ?? null,
    durationSec: id.durationSec ?? null,
    songId,
    subscriptionId: id.subscriptionId,
    dedupKey: id.dedupKey,
    playedAt: at,
  });

  await upsertProgress({
    feedUrl: id.feedUrl,
    guid: id.guid,
    lastSongId: songId,
    lastPlayedAt: at,
    durationSec: id.durationSec ?? undefined,
  }).catch(() => {});

  lastSongId = songId;
}

async function applyFinish(songId: number): Promise<void> {
  const id = await resolveEpisodeIdentity(songId, { remember: true });
  if (!id) {
    songloft.log.info(`[podcast] finish event songId=${songId}: no feedUrl+guid — skip write`);
    return;
  }

  const durationSec = id.durationSec ?? null;
  await upsertProgress({
    feedUrl: id.feedUrl,
    guid: id.guid,
    completed: true,
    positionSec: durationSec && durationSec > 0 ? durationSec : undefined,
    durationSec: durationSec ?? undefined,
    lastSongId: songId,
    lastPlayedAt: Date.now(),
  });

  await touchHistoryProgress(id.feedUrl, id.guid, {
    completed: true,
    positionSec: durationSec && durationSec > 0 ? durationSec : undefined,
    durationSec: durationSec ?? undefined,
  }).catch(() => {});

  // Keep a history row even if the user never opened the plugin page.
  await recordHistory({
    feedUrl: id.feedUrl,
    guid: id.guid,
    title: id.title,
    showTitle: id.showTitle,
    coverUrl: id.coverUrl ?? null,
    durationSec,
    songId,
    subscriptionId: id.subscriptionId,
    dedupKey: id.dedupKey,
    completed: true,
    positionSec: durationSec && durationSec > 0 ? durationSec : undefined,
  }).catch(() => {});
}

async function applySkip(songId: number): Promise<void> {
  // Skip = leaving this track early. Do not invent a position (events have none).
  // Ensure a history row exists so the host-bar skip still surfaces in 收听历史.
  const id = await resolveEpisodeIdentity(songId, { remember: true });
  if (!id) return;
  await recordHistory({
    feedUrl: id.feedUrl,
    guid: id.guid,
    title: id.title,
    showTitle: id.showTitle,
    coverUrl: id.coverUrl ?? null,
    durationSec: id.durationSec ?? null,
    songId,
    subscriptionId: id.subscriptionId,
    dedupKey: id.dedupKey,
  }).catch(() => {});
  if (lastSongId === songId) lastSongId = null;
}

export async function handlePlayEvent(event: PlayEvent): Promise<void> {
  try {
    const songId = event?.song?.id;
    if (!Number.isFinite(songId) || (songId as number) <= 0) return;
    const type = event.type;
    const now = typeof event.timestamp === "number" ? event.timestamp : Date.now();
    const key = `${type}:${songId}`;
    if (dedupe(key, now)) return;

    if (type === "play") await applyPlay(songId as number, now);
    else if (type === "finish") await applyFinish(songId as number);
    else if (type === "skip") await applySkip(songId as number);
  } catch (e) {
    songloft.log.warn(`[podcast] play event handler failed: ${String(e ?? "")}`);
  }
}

/** Subscribe once from onInit. Safe to call repeatedly. */
export function subscribePlayEvents(): boolean {
  if (subscribed) return true;
  const events = (songloft as { events?: { onPlayEvent?: (h: (e: PlayEvent) => void | Promise<void>) => void } })
    .events;
  if (!events || typeof events.onPlayEvent !== "function") {
    songloft.log.info(
      "[podcast] songloft.events unavailable — history/progress only from plugin page (no events permission or host too old)"
    );
    return false;
  }
  events.onPlayEvent((ev) => {
    void handlePlayEvent(ev);
  });
  subscribed = true;
  songloft.log.info("[podcast] subscribed to songloft.events.onPlayEvent");
  return true;
}

export function unsubscribePlayEvents(): void {
  const events = (songloft as { events?: { offPlayEvent?: () => void } }).events;
  if (events && typeof events.offPlayEvent === "function") {
    try {
      events.offPlayEvent();
    } catch {
      /* ignore */
    }
  }
  subscribed = false;
  lastSongId = null;
}

export function isPlayEventsSubscribed(): boolean {
  return subscribed;
}

/** Test helper: clear dedupe / last-song state between cases. */
export function __resetPlayEventStateForTests(): void {
  recent.clear();
  lastSongId = null;
  subscribed = false;
}
