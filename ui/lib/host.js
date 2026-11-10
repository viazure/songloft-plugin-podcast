/**
 * Host playback adapter — probes the host and drives `SongloftPlugin.player`.
 *
 * Default play path is `player.play(id)`. Replacing the host queue happens only
 * after an explicit user confirmation.
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

/** Only call after the user confirmed replacing the host now-playing queue. */
export async function replaceQueueAndPlay(songIds, startIndex) {
  return requirePlayer().setQueue(
    songIds.map(Number),
    { startIndex: startIndex || 0 }
  );
}

export async function addToHostQueue(songIds) {
  return requirePlayer().addToQueue(songIds.map(Number));
}
