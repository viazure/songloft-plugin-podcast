/**
 * Ownership ledger for historical MIoT cast playlists.
 *
 * Casting no longer copies the queue into a separate playlist: it moves the
 * episode to the front of the persistent「播客」queue and plays that same
 * playlist. This ledger now only remembers tables older versions created, so
 * the settings page can list them for manual cleanup. It is never the source of
 * truth for「播客」, and changing the queue never mutates these records.
 *
 * v1 stored per-device/group slots (at most two). v2 keeps one canonical
 * playlist id for the whole plugin. Records are listed for manual cleanup only;
 * load/adopt never deletes or rewrites those playlists, and never claims a
 * table by name.
 */

import { withStorageLock } from "./store";

export const CAST_LEDGER_KEY = "cast_playlist_ledger";
export const CAST_PLAYLIST_DESCRIPTION = "插件历史投放列表（旧版本使用）";
export const CAST_SHARED_TABLE_DISCLAIMER =
  "「播客」歌单本身就是播放队列：投放会先把这一集移到它的第一位，再让音箱从第一位按顺序播放。因此列表顺序在播放请求之前就已调整，即使请求失败也不会自动恢复。";
export const CLEANUP_DISCLAIMER =
  "这里列出旧版本留下的历史投放表，可手动清理。引用检测可能不完整。不会自动删除，「播客」歌单不会被列出，也不会被删除。";

export type SlotRole = "current" | "idle";
export type SlotTrust = "ours" | "external";

/** Legacy v1 row, kept so adoption can read older ledgers. */
export interface CastSlot {
  playlistId: number;
  targetKey: string;
  name: string;
  description: string;
  songFingerprint: string;
  generation: number;
  role: SlotRole;
  playIssued: boolean;
  trust: SlotTrust;
  kind: "one" | "list";
  createdAt: number;
  updatedAt: number;
}

export interface CastPlaylistRecord {
  playlistId: number;
  name: string;
  description: string;
  songFingerprint: string;
  generation: number;
  playIssued: boolean;
  trust: SlotTrust;
  kind: "one" | "list";
  createdAt: number;
  updatedAt: number;
  lastTargetKey?: string;
  lastAccountId?: string;
  lastDeviceId?: string;
  lastDeviceName?: string;
}

export interface LeftoverPlaylist {
  playlistId: number;
  name: string;
  source: "ledger" | "legacy-name";
  targetKey?: string;
  role?: SlotRole;
  trust?: SlotTrust;
  playIssued?: boolean;
  kind?: "one" | "list";
}

export interface CastLedger {
  version: 2;
  playlist: CastPlaylistRecord | null;
  leftovers: LeftoverPlaylist[];
  generation: number;
}

function pluginStorage(): { get: (key: string) => Promise<unknown>; set: (key: string, value: unknown) => Promise<void> } {
  const anyGlobal = globalThis as unknown as {
    songloft?: { storage?: { get: (key: string) => Promise<unknown>; set: (key: string, value: unknown) => Promise<void> } };
  };
  const storage = anyGlobal.songloft && anyGlobal.songloft.storage;
  if (!storage) {
    throw new Error("songloft.storage 不可用");
  }
  return storage;
}

export function uniqueSongIds(songIds: number[] | null | undefined): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of songIds || []) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Stable fingerprint of an ordered song id list. */
export function songFingerprint(songIds: number[] | null | undefined): string {
  return uniqueSongIds(songIds).join(",");
}

export function emptyLedger(): CastLedger {
  return { version: 2, playlist: null, leftovers: [], generation: 0 };
}
function asRole(value: unknown): SlotRole {
  return value === "current" ? "current" : "idle";
}

function asTrust(value: unknown): SlotTrust {
  return value === "external" ? "external" : "ours";
}

function asKind(value: unknown): "one" | "list" {
  return value === "one" ? "one" : "list";
}

function asFiniteId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function normalizeSlot(raw: unknown): CastSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const playlistId = asFiniteId(row.playlistId);
  const targetKey = typeof row.targetKey === "string" ? row.targetKey.trim() : "";
  if (!playlistId) return null;
  const name = typeof row.name === "string" ? row.name : "";
  const description = typeof row.description === "string" ? row.description : CAST_PLAYLIST_DESCRIPTION;
  const songFingerprintValue = typeof row.songFingerprint === "string" ? row.songFingerprint : "";
  const generation = asFiniteId(row.generation) || 0;
  const createdAt = asFiniteId(row.createdAt) || 0;
  const updatedAt = asFiniteId(row.updatedAt) || createdAt;
  return {
    playlistId,
    targetKey,
    name,
    description,
    songFingerprint: songFingerprintValue,
    generation,
    role: asRole(row.role),
    playIssued: row.playIssued === true,
    trust: asTrust(row.trust),
    kind: asKind(row.kind),
    createdAt,
    updatedAt,
  };
}

export function playlistFromSlot(slot: CastSlot): CastPlaylistRecord {
  return {
    playlistId: slot.playlistId,
    name: slot.name,
    description: slot.description || CAST_PLAYLIST_DESCRIPTION,
    songFingerprint: slot.songFingerprint,
    generation: slot.generation,
    playIssued: slot.playIssued,
    trust: slot.trust,
    kind: slot.kind,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
    lastTargetKey: slot.targetKey || undefined,
  };
}

export function leftoverFromSlot(slot: CastSlot, source: LeftoverPlaylist["source"] = "ledger"): LeftoverPlaylist {
  return {
    playlistId: slot.playlistId,
    name: slot.name,
    source,
    targetKey: slot.targetKey || undefined,
    role: slot.role,
    trust: slot.trust,
    playIssued: slot.playIssued,
    kind: slot.kind,
  };
}

/**
 * Deterministic pick of one owned table to keep using.
 * Prefers role=current, then newest updatedAt, then highest generation,
 * then the lowest playlistId. Never selects trust=external, and never
 * matches by playlist name.
 */
export function selectCanonicalSlot(slots: CastSlot[]): CastSlot | null {
  const ours = slots.filter((s) => s.trust === "ours" && s.playlistId > 0);
  if (!ours.length) return null;
  const currents = ours.filter((s) => s.role === "current");
  const pool = currents.length ? currents : ours;
  const ranked = pool.slice().sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    if (b.generation !== a.generation) return b.generation - a.generation;
    return a.playlistId - b.playlistId;
  });
  return ranked[0] || null;
}
export function adoptLegacySlots(slots: CastSlot[], generations?: unknown): CastLedger {
  const chosen = selectCanonicalSlot(slots);
  const leftovers: LeftoverPlaylist[] = [];
  const seen = new Set<number>();
  for (const slot of slots) {
    if (chosen && slot.playlistId === chosen.playlistId) continue;
    if (seen.has(slot.playlistId)) continue;
    seen.add(slot.playlistId);
    leftovers.push(leftoverFromSlot(slot, "ledger"));
  }
  leftovers.sort((a, b) => a.playlistId - b.playlistId);
  let generation = chosen?.generation || 0;
  if (generations && typeof generations === "object") {
    for (const value of Object.values(generations as Record<string, unknown>)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > generation) generation = Math.round(n);
    }
  }
  return {
    version: 2,
    playlist: chosen ? playlistFromSlot(chosen) : null,
    leftovers,
    generation,
  };
}

function normalizePlaylist(raw: unknown): CastPlaylistRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const slot = normalizeSlot({ targetKey: "global", ...(raw as Record<string, unknown>) });
  if (!slot) return null;
  const row = raw as Record<string, unknown>;
  const record = playlistFromSlot(slot);
  if (typeof row.lastTargetKey === "string" && row.lastTargetKey.trim()) {
    record.lastTargetKey = row.lastTargetKey.trim();
  }
  if (typeof row.lastAccountId === "string") record.lastAccountId = row.lastAccountId;
  if (typeof row.lastDeviceId === "string") record.lastDeviceId = row.lastDeviceId;
  if (typeof row.lastDeviceName === "string") record.lastDeviceName = row.lastDeviceName;
  return record;
}

function normalizeLeftover(raw: unknown): LeftoverPlaylist | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const playlistId = asFiniteId(row.playlistId);
  if (!playlistId) return null;
  return {
    playlistId,
    name: typeof row.name === "string" ? row.name : "",
    source: row.source === "legacy-name" ? "legacy-name" : "ledger",
    targetKey: typeof row.targetKey === "string" ? row.targetKey : undefined,
    role: row.role === "current" || row.role === "idle" ? row.role : undefined,
    trust: row.trust === "external" || row.trust === "ours" ? row.trust : undefined,
    playIssued: row.playIssued === true ? true : undefined,
    kind: row.kind === "one" || row.kind === "list" ? row.kind : undefined,
  };
}

function isLegacyLedger(data: Record<string, unknown>): boolean {
  if (data.version === 2) return false;
  if (data.playlist && typeof data.playlist === "object") return false;
  if (Array.isArray(data.leftovers)) return false;
  return Array.isArray(data.slots) || data.version === 1;
}

export function normalizeLedger(raw: unknown): CastLedger {
  const base = emptyLedger();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Record<string, unknown>;
  if (isLegacyLedger(data)) {
    const slots = Array.isArray(data.slots)
      ? data.slots.map(normalizeSlot).filter((s): s is CastSlot => !!s)
      : [];
    return adoptLegacySlots(slots, data.generations);
  }
  const playlist = normalizePlaylist(data.playlist);
  const leftovers = Array.isArray(data.leftovers)
    ? data.leftovers.map(normalizeLeftover).filter((s): s is LeftoverPlaylist => !!s)
    : [];
  leftovers.sort((a, b) => a.playlistId - b.playlistId);
  const generation = asFiniteId(data.generation) || playlist?.generation || 0;
  return { version: 2, playlist, leftovers, generation };
}

export async function loadCastLedger(): Promise<CastLedger> {
  try {
    const raw = await pluginStorage().get(CAST_LEDGER_KEY);
    return normalizeLedger(raw);
  } catch {
    return emptyLedger();
  }
}

export async function saveCastLedger(ledger: CastLedger): Promise<CastLedger> {
  const next = normalizeLedger(ledger);
  return withStorageLock(CAST_LEDGER_KEY, async () => {
    await pluginStorage().set(CAST_LEDGER_KEY, next);
    return next;
  });
}

export function bumpGeneration(ledger: CastLedger): CastLedger {
  return { ...ledger, generation: (ledger.generation || 0) + 1 };
}

export function withPlaylist(ledger: CastLedger, playlist: CastPlaylistRecord | null): CastLedger {
  return { ...ledger, playlist };
}

export function addLeftover(ledger: CastLedger, item: LeftoverPlaylist): CastLedger {
  const leftovers = ledger.leftovers.filter((row) => row.playlistId !== item.playlistId);
  leftovers.push(item);
  leftovers.sort((a, b) => a.playlistId - b.playlistId);
  return { ...ledger, leftovers };
}

export function removeLeftover(ledger: CastLedger, playlistId: number): CastLedger {
  return { ...ledger, leftovers: ledger.leftovers.filter((row) => row.playlistId !== playlistId) };
}

export function touchPlaylist(
  record: CastPlaylistRecord,
  patch: Partial<CastPlaylistRecord>,
  now: number = Date.now()
): CastPlaylistRecord {
  return { ...record, ...patch, updatedAt: now };
}