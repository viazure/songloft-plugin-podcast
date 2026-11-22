import { describe, expect, it } from "vitest";
import { decidePlayAction, readHostPlayback } from "../ui/lib/playSession.js";

describe("readHostPlayback", () => {
  it("reads snake_case getState fields", () => {
    const host = readHostPlayback({
      current_song: { id: 12 },
      current_time: 34.5,
      is_playing: true,
      queue: [{ id: 10 }, { id: 12 }, { id: 13 }],
      current_index: 1,
      source_playlist_id: 7,
    });
    expect(host).toMatchObject({
      available: true,
      currentId: 12,
      currentTime: 34.5,
      isPlaying: true,
      queue: [10, 12, 13],
      currentIndex: 1,
      sourcePlaylistId: 7,
    });
  });

  it("falls back to camelCase but prefers snake_case", () => {
    const host = readHostPlayback({
      current_song: { id: 2 },
      currentSong: { id: 99 },
      current_time: 8,
      currentTime: 1,
      is_playing: false,
      isPlaying: true,
      queue: [2],
      source_playlist_id: 5,
      sourcePlaylistId: 9,
    });
    expect(host.currentId).toBe(2);
    expect(host.currentTime).toBe(8);
    expect(host.isPlaying).toBe(false);
    expect(host.sourcePlaylistId).toBe(5);
  });

  it("marks missing state as unavailable", () => {
    expect(readHostPlayback(null).available).toBe(false);
    expect(readHostPlayback(undefined).available).toBe(false);
  });
});

describe("decidePlayAction", () => {
  const ids = [1, 2, 3];

  it("confirms when host state is missing, and still orders the target first", () => {
    const action = decidePlayAction({
      host: readHostPlayback(null),
      targetSongId: 2,
      intendedIds: ids,
    });
    expect(action).toMatchObject({
      type: "confirm-replace",
      reason: "unknown",
      ids: [2, 1, 3],
      startIndex: 0,
      playMode: "order",
    });
  });

  it("sets the queue when the host is idle", () => {
    const action = decidePlayAction({
      host: readHostPlayback({ is_playing: false, queue: [] }),
      targetSongId: 1,
      intendedIds: ids,
    });
    expect(action).toMatchObject({
      type: "set-queue",
      ids: [1, 2, 3],
      startIndex: 0,
      playMode: "order",
    });
  });

  it("resumes the same paused episode without rebuilding, but only when it is already first", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 2 },
        current_time: 90,
        is_playing: false,
        queue: [2, 1],
        current_index: 0,
        source_playlist_id: 100,
      }),
      targetSongId: 2,
      intendedIds: ids,
      podcastPlaylistId: 100,
    });
    expect(action.type).toBe("resume");
    expect(action.ids[0]).toBe(2);
    expect(action.startIndex).toBe(0);
  });

  it("does not restart the same episode that is already first and playing", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 2 },
        is_playing: true,
        queue: [2, 1, 3],
        current_index: 0,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
    });
    expect(action.type).toBe("noop-playing");
  });

  it("re-anchors the same episode to the front when it is not the first row", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 2 },
        is_playing: true,
        queue: [1, 2, 3],
        current_index: 1,
        source_playlist_id: 100,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
      podcastPlaylistId: 100,
    });
    expect(action.type).toBe("set-queue");
    expect(action.ids).toEqual([2, 1, 3]);
    expect(action.startIndex).toBe(0);
  });

  it("confirms before re-anchoring a same-id episode from an unknown source", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 2 },
        is_playing: true,
        queue: [1, 2, 3],
        current_index: 1,
        source_playlist_id: 55,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
      podcastPlaylistId: 100,
    });
    expect(action).toMatchObject({ type: "confirm-replace", reason: "not-in-front" });
  });

  it("confirms when another song is current, even if the queue ids happen to match", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 9 },
        is_playing: true,
        queue: [1, 2, 3],
        current_index: 0,
        source_playlist_id: 3,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
    });
    expect(action).toMatchObject({ type: "confirm-replace", reason: "different-source" });
  });

  it("does not treat a matching intended id list alone as the same session", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        queue: [1, 2, 3],
        is_playing: false,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
    });
    // No current episode at all: not verifiable, so ask before replacing.
    expect(action.type).toBe("confirm-replace");
  });

  it("re-anchors another episode without asking when the host plays our own「播客」queue", () => {
    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 1 },
        is_playing: true,
        queue: [1, 2, 3],
        current_index: 0,
        source_playlist_id: 100,
      }),
      targetSongId: 3,
      intendedIds: [1, 2, 3],
      podcastPlaylistId: 100,
    });
    expect(action).toMatchObject({ type: "set-queue", ids: [3, 1, 2], startIndex: 0 });
  });

  it("paused but not first is not treated as a resume", () => {    const action = decidePlayAction({
      host: readHostPlayback({
        current_song: { id: 2 },
        is_playing: false,
        queue: [1, 2, 3],
        current_index: 1,
        source_playlist_id: 100,
      }),
      targetSongId: 2,
      intendedIds: [1, 2, 3],
      podcastPlaylistId: 100,
    });
    expect(action.type).toBe("set-queue");
  });
});
