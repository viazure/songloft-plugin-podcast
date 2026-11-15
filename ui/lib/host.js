/**
 * Host playback adapter — probes the host and drives `SongloftPlugin.player`.
 *
 * `play(id)` resumes or jumps within the host's current queue.
 * Replacing that queue goes through `replaceQueueAndPlay` → `player.setQueue`.
 * Callers decide whether to confirm; this adapter only probes and forwards.
 */

function pluginRoot() {
  return typeof window !== "undefined" ? window.SongloftPlugin : null;
}

export function isClient() {
  try {
    const h = pluginRoot() && window.SongloftPlugin.host;
    return !!(h && typeof h.isAvailable === "function" && h.isAvailable());
  } catch {
    return false;
  }
}

export async function getCapabilities() {
  const root = pluginRoot();
  if (!isClient()) {
    return { available: false, hasPlayer: false, version: null, platform: null, capabilities: [] };
  }
  const playerOk = !!(root && root.player && typeof root.player.play === "function");
  try {
    const info = await root.host.getInfo();
    const caps = (info && info.capabilities) || [];
    return {
      available: true,
      hasPlayer: caps.includes("player") || playerOk,
      version: info.version || null,
      platform: info.platform || null,
      capabilities: caps,
    };
  } catch {
    return { available: true, hasPlayer: playerOk, version: null, platform: null, capabilities: [] };
  }
}

function requirePlayer() {
  const root = pluginRoot();
  if (!isClient() || !root || !root.player || typeof root.player.play !== "function") {
    throw new Error("宿主播放器不可用（请在 Songloft 客户端内打开本插件）");
  }
  return root.player;
}

export function hasSetQueue() {
  try {
    return typeof requirePlayer().setQueue === "function";
  } catch {
    return false;
  }
}

function requireSetQueue() {
  const player = requirePlayer();
  if (typeof player.setQueue !== "function") {
    throw new Error("宿主不支持整表播放（请在 Songloft 客户端内打开本插件，或升级宿主）");
  }
  return player;
}

export async function play(songId) {
  const player = requirePlayer();
  if (songId == null) return player.play();
  return player.play(Number(songId));
}

export async function pause() {
  return requirePlayer().pause();
}

export async function getState() {
  return requirePlayer().getState();
}

export function onStateChange(cb) {
  return requirePlayer().onStateChange(cb);
}

export async function seek(seconds) {
  return requirePlayer().seek(Number(seconds));
}

/**
 * Replace the host now-playing queue and start at startIndex.
 * Throws if `setQueue` is missing — callers must not fall back to play(id).
 */
export async function replaceQueueAndPlay(songIds, startIndex, opts = {}) {
  const player = requireSetQueue();
  const options = { startIndex: startIndex == null ? 0 : Number(startIndex) };
  const sourceId = opts && opts.sourcePlaylistId;
  if (sourceId != null && sourceId !== "" && Number.isFinite(Number(sourceId))) {
    options.sourcePlaylistId = Number(sourceId);
  }
  return player.setQueue(songIds.map(Number), options);
}

export async function addToHostQueue(songIds) {
  return requirePlayer().addToQueue(songIds.map(Number));
}

export async function setPlayMode(mode) {
  const player = requirePlayer();
  if (typeof player.setPlayMode !== "function") {
    throw new Error("宿主不支持切换播放模式");
  }
  return player.setPlayMode(mode);
}
