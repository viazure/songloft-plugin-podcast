/**
 * Host wiring for MIoT casting.
 * Kept out of castSlots.ts so unit tests can inject a fake runtime.
 */

import { moveEpisodeToFront } from "./castSlots";
import { loadSettings } from "./store";
import {
  fetchMiotGroups,
  fetchMiotPlayerStatus,
  listMiotDeviceTargets,
  pickDeviceTarget,
  playPlaylistOnDevice,
} from "./castMiot";
import type { CastSlotRuntime } from "./castSlots";

export function buildHostCastRuntime(): CastSlotRuntime {
  const anyGlobal = globalThis as unknown as { songloft?: { playlists?: CastSlotRuntime["playlists"] } };
  const playlists = anyGlobal.songloft && anyGlobal.songloft.playlists;
  if (!playlists) {
    throw new Error("songloft.playlists 不可用");
  }
  return {
    playlists,
    async getWaitlistId() {
      const settings = await loadSettings();
      return settings.podcastPlaylistId;
    },
    listDevices: listMiotDeviceTargets,
    pickTarget: pickDeviceTarget,
    listGroups: fetchMiotGroups,
    playerStatus: fetchMiotPlayerStatus,
    async moveToFront(songId, playlistId) {
      const settings = await loadSettings();
      return moveEpisodeToFront(
        playlists,
        playlistId,
        settings.podcastPlaylistName || "播客",
        songId
      );
    },
    play: playPlaylistOnDevice,
  };
}
