import { describe, expect, it } from "vitest";
import {
  buildCastMiotPlaylistBody,
  queueIdsWithFront,
  queueSongIds,
  resolveSpeakerCastPlan,
} from "../ui/lib/castPlan.js";

const QUEUE = [
  { id: 11, title: "A" },
  { id: 22, title: "B" },
  { id: 33, title: "C" },
  { id: 44, title: "D" },
];

describe("resolveSpeakerCastPlan", () => {
  it("plans the whole「播客」order with the cast episode moved to the front", () => {
    const plan = resolveSpeakerCastPlan({ songId: 33, queueSongs: QUEUE });
    expect(plan).toEqual({
      kind: "queue",
      songId: 33,
      songIds: [33, 11, 22, 44],
    });
  });

  it("keeps the whole-list button at the first episode", () => {
    const ids = queueSongIds(QUEUE);
    const body = buildCastMiotPlaylistBody({
      songIds: queueIdsWithFront(QUEUE, ids[0]),
      songId: ids[0],
    });
    expect(body).toEqual({ songIds: [11, 22, 33, 44], songId: 11 });
  });

  it("prepends an episode that is not in the queue instead of casting only it", () => {
    expect(resolveSpeakerCastPlan({ songId: 99, queueSongs: QUEUE })).toEqual({
      kind: "queue",
      songId: 99,
      songIds: [99, 11, 22, 33, 44],
    });
  });

  it("settings test casts target the same persistent queue, one episode at a time", () => {
    expect(
      resolveSpeakerCastPlan({ songId: 33, queueSongs: QUEUE, forceSingle: true })
    ).toEqual({ kind: "one", songId: 33, songIds: [33] });
  });

  it("ignores invalid ids", () => {
    expect(resolveSpeakerCastPlan({ songId: 0, queueSongs: QUEUE })).toBeNull();
    expect(resolveSpeakerCastPlan({ songId: 22, queueSongs: null })).toEqual({
      kind: "queue",
      songId: 22,
      songIds: [22],
    });
  });
});

describe("buildCastMiotPlaylistBody", () => {
  it("sends songIds, startIndex and songId for an explicit anchor", () => {
    const body = buildCastMiotPlaylistBody({
      songIds: [11, 22, 33, 44],
      startIndex: 2,
      songId: 33,
      deviceId: "dev1",
    });
    expect(body).toEqual({
      songIds: [11, 22, 33, 44],
      startIndex: 2,
      songId: 33,
      deviceId: "dev1",
    });
  });

  it("omits startIndex when the caller relies on the front-of-list default", () => {
    const body = buildCastMiotPlaylistBody({ songIds: [33, 11], songId: 33 });
    expect(body).toEqual({ songIds: [33, 11], songId: 33 });
  });
});
