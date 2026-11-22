import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CAST_LEDGER_KEY,
  CAST_PLAYLIST_DESCRIPTION,
  CLEANUP_DISCLAIMER,
  loadCastLedger,
} from "../src/castLedger";
import {
  __resetCastLocksForTests,
  cleanupConfirmedCastPlaylists,
  executeCastToSpeaker,
  executionKeyFor,
  isInUseByStatus,
  listCastCleanupCandidates,
  moveEpisodeToFront,
  parseMiotGroups,
  parsePlayerStatus,
  type CastSlotRuntime,
  type DeviceTarget,
  type MiotGroup,
  type PlayAttempt,
  type PlayerState,
} from "../src/castSlots";

type PlaylistRow = {
  id: number;
  name: string;
  description: string;
  songs: number[];
};

type Bag = Record<string, unknown>;

const PODCAST_ID = 3;

function installStorage(bag: Bag = {}) {
  (globalThis as unknown as { songloft: unknown }).songloft = {
    storage: {
      async get(key: string) {
        return bag[key];
      },
      async set(key: string, value: unknown) {
        bag[key] = value;
      },
    },
  };
  return bag;
}

function device(partial: Partial<DeviceTarget> & { deviceId: string }): DeviceTarget {
  return {
    accountId: partial.accountId || "acc1",
    deviceId: partial.deviceId,
    deviceName: partial.deviceName || partial.deviceId,
    online: partial.online !== false,
  };
}

function memoryPlaylists(initial: PlaylistRow[] = []) {
  const rows = initial.map((p) => ({ ...p, songs: p.songs.slice() }));
  let nextId = 200;
  const calls: string[] = [];
  const api = {
    rows,
    calls,
    async list() {
      return rows.map((p) => ({ id: p.id, name: p.name, description: p.description }));
    },
    async getById(id: number) {
      const row = rows.find((p) => p.id === id);
      return row ? { id: row.id, name: row.name, description: row.description } : null;
    },
    async getSongs(playlistId: number) {
      const row = rows.find((p) => p.id === playlistId);
      return (row?.songs || []).map((id) => ({ id }));
    },
    async create(input: { name: string; description?: string }) {
      const row: PlaylistRow = {
        id: ++nextId,
        name: input.name,
        description: input.description || "",
        songs: [],
      };
      rows.push(row);
      calls.push(`create:${row.id}:${row.name}`);
      return { id: row.id, name: row.name, description: row.description };
    },
    async addSongs(playlistId: number, songIds: number[]) {
      const row = rows.find((p) => p.id === playlistId);
      if (!row) throw new Error("missing");
      row.songs.push(...songIds);
      calls.push(`add:${playlistId}:${songIds.join(",")}`);
      return { added: songIds.length, skipped: 0 };
    },
    async removeSongs(playlistId: number, songIds: number[]) {
      const row = rows.find((p) => p.id === playlistId);
      if (!row) return;
      row.songs = row.songs.filter((id) => !songIds.includes(id));
      calls.push(`remove:${playlistId}`);
    },
    async reorder(playlistId: number, songIds: number[]) {
      const row = rows.find((p) => p.id === playlistId);
      if (!row) throw new Error("missing");
      row.songs = songIds.slice();
      calls.push(`reorder:${playlistId}:${songIds.join(",")}`);
    },
    async replaceSongs(playlistId: number, songIds: number[]) {
      const row = rows.find((p) => p.id === playlistId);
      if (!row) throw new Error("missing");
      row.songs = songIds.slice();
      calls.push(`replace:${playlistId}:${songIds.join(",")}`);
    },
    async delete(id: number) {
      if (id === PODCAST_ID) throw new Error("cannot delete podcast playlist");
      const idx = rows.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error("missing");
      rows.splice(idx, 1);
      calls.push(`delete:${id}`);
    },
  };
  return api;
}

function makeRuntime(opts: {
  playlists: ReturnType<typeof memoryPlaylists>;
  devices?: DeviceTarget[];
  groups?: MiotGroup[] | null;
  statuses?: Record<string, PlayerState | null>;
  play?: (playlistId: number, target: DeviceTarget) => Promise<PlayAttempt> | PlayAttempt;
  podcastPlaylistId?: number | null;
}): CastSlotRuntime & { plays: number[]; playlists: ReturnType<typeof memoryPlaylists> } {
  const devices = opts.devices || [device({ deviceId: "dev1", deviceName: "客厅" })];
  const plays: number[] = [];
  const runtime: CastSlotRuntime & { plays: number[]; playlists: ReturnType<typeof memoryPlaylists> } = {
    playlists: opts.playlists,
    plays,
    async getWaitlistId() {
      return opts.podcastPlaylistId === undefined ? PODCAST_ID : opts.podcastPlaylistId;
    },
    async listDevices() {
      return { ok: true, devices };
    },
    pickTarget(list, requestedId) {
      const wanted = String(requestedId || "").trim();
      if (wanted) return list.find((d) => d.deviceId === wanted) || null;
      return list.find((d) => d.online) || list[0] || null;
    },
    async listGroups() {
      return opts.groups === undefined ? [] : opts.groups;
    },
    async playerStatus(accountId, deviceId) {
      const map = opts.statuses || {};
      if (Object.prototype.hasOwnProperty.call(map, `${accountId}:${deviceId}`)) {
        return map[`${accountId}:${deviceId}`];
      }
      if (Object.prototype.hasOwnProperty.call(map, deviceId)) return map[deviceId];
      return { playlistId: 0, state: "idle" };
    },
    async play(playlistId, target) {
      plays.push(playlistId);
      if (opts.play) return opts.play(playlistId, target);
      return { ok: true, playIssued: true, uncertain: false };
    },
  };
  return runtime;
}

function podcastRow(songs: number[] = []): PlaylistRow {
  return { id: PODCAST_ID, name: "播客", description: "", songs };
}

beforeEach(() => {
  installStorage();
  __resetCastLocksForTests();
});

afterEach(() => {
  __resetCastLocksForTests();
  delete (globalThis as unknown as { songloft?: unknown }).songloft;
});

describe("group and status parsers", () => {
  it("elevates two grouped devices to the same execution key", () => {
    const groups = parseMiotGroups({
      data: [
        {
          id: "g1",
          name: "客厅组",
          members: [
            { account_id: "acc1", device_id: "devA" },
            { account_id: "acc1", device_id: "devB" },
          ],
        },
      ],
    });
    const a = executionKeyFor(device({ deviceId: "devA", deviceName: "A" }), groups);
    const b = executionKeyFor(device({ deviceId: "devB", deviceName: "B" }), groups);
    expect(a.key).toBe("group:g1");
    expect(b.key).toBe("group:g1");
    expect(a.label).toBe("客厅组");
  });

  it("keeps ungrouped devices on their own key", () => {
    const key = executionKeyFor(device({ deviceId: "solo" }), []);
    expect(key.key).toBe("device:acc1:solo");
  });

  it("treats a persisted playlist id as in-use even when paused", () => {
    expect(isInUseByStatus({ playlistId: 9, state: "paused" }, 9)).toBe(true);
    expect(isInUseByStatus({ playlistId: 9, state: "playing" }, 9)).toBe(true);
    expect(isInUseByStatus({ playlistId: 9, state: "idle" }, 9)).toBe(true);
    expect(isInUseByStatus({ playlistId: 0, state: "idle" }, 9)).toBe(false);
  });

  it("unwraps player status data.playlist_id", () => {
    expect(parsePlayerStatus({ data: { playlist_id: 18, state: "PAUSED" } })).toEqual({
      playlistId: 18,
      state: "paused",
    });
  });
});

describe("casting plays the persistent「播客」queue", () => {
  it("moves the episode to the front and plays that same playlist id", async () => {
    const playlists = memoryPlaylists([podcastRow([11, 22, 33])]);
    const runtime = makeRuntime({ playlists });
    const result = await executeCastToSpeaker(runtime, { songIds: [33], kind: "one", songId: 33 });

    expect(result.ok).toBe(true);
    expect(result.playlistId).toBe(PODCAST_ID);
    expect(result.orderChanged).toBe(true);
    expect(runtime.plays).toEqual([PODCAST_ID]);
    expect(playlists.rows.find((p) => p.id === PODCAST_ID)?.songs).toEqual([33, 11, 22]);
  });

  it("never creates or refills a separate cast table", async () => {
    const playlists = memoryPlaylists([podcastRow([11, 22])]);
    const runtime = makeRuntime({ playlists });
    await executeCastToSpeaker(runtime, { songIds: [22, 11], kind: "list", songId: 22 });

    expect(playlists.rows).toHaveLength(1);
    expect(playlists.calls.filter((c) => c.startsWith("create:"))).toEqual([]);
    expect(playlists.calls.filter((c) => c.startsWith("replace:"))).toEqual([]);
    expect(playlists.calls.filter((c) => c.startsWith("add:"))).toEqual([]);
    expect(playlists.calls.filter((c) => c.startsWith("reorder:"))).toEqual([
      `reorder:${PODCAST_ID}:22,11`,
    ]);
  });

  it("inserts an episode that is not yet queued at the front", async () => {
    const playlists = memoryPlaylists([podcastRow([11])]);
    const runtime = makeRuntime({ playlists });
    const result = await executeCastToSpeaker(runtime, { songIds: [99], kind: "one", songId: 99 });

    expect(result.ok).toBe(true);
    expect(playlists.rows.find((p) => p.id === PODCAST_ID)?.songs).toEqual([99, 11]);
    expect(runtime.plays).toEqual([PODCAST_ID]);
  });

  it("does not reorder when the episode is already first", async () => {
    const playlists = memoryPlaylists([podcastRow([33, 11])]);
    const runtime = makeRuntime({ playlists });
    const result = await executeCastToSpeaker(runtime, { songIds: [33, 11], kind: "list", songId: 33 });
    expect(result.orderChanged).toBe(false);
    expect(playlists.calls.some((c) => c.startsWith("reorder:"))).toBe(false);
    expect(runtime.plays).toEqual([PODCAST_ID]);
  });

  it("identifies「播客」only by the saved id and never claims a same-named table", async () => {
    const playlists = memoryPlaylists([
      { id: 15, name: "播客", description: "别人的表", songs: [7] },
    ]);
    const runtime = makeRuntime({ playlists, podcastPlaylistId: null });
    const result = await executeCastToSpeaker(runtime, { songIds: [10], kind: "one" });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_podcast_playlist");
    expect(runtime.plays).toEqual([]);
    expect(playlists.calls.filter((c) => c.startsWith("create:"))).toEqual([]);
    expect(playlists.rows.find((p) => p.id === 15)?.songs).toEqual([7]);
  });

  it("does not recreate the playlist when the saved id is gone", async () => {
    const playlists = memoryPlaylists([{ id: 15, name: "播客", description: "", songs: [7] }]);
    const runtime = makeRuntime({ playlists });
    const result = await executeCastToSpeaker(runtime, { songIds: [10], kind: "one" });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_podcast_playlist");
    expect(playlists.rows).toHaveLength(1);
    expect(runtime.plays).toEqual([]);
  });

  it("copy does not talk about a separate cast table or a split listen-later plan", async () => {
    const playlists = memoryPlaylists([podcastRow([])]);
    const runtime = makeRuntime({
      playlists,
      play: async () => ({ ok: false, playIssued: true, uncertain: false, error: "音箱拒绝播放" }),
    });
    const result = await executeCastToSpeaker(runtime, { songIds: [10], kind: "one" });
    const text = `${result.error || ""} ${result.warning || ""}`;
    expect(text).not.toContain("待听");
    expect(text).not.toContain("另一张投放表");
    expect(text).toContain("「播客」");
    expect(text).toContain("列表顺序");
  });
});

describe("moveEpisodeToFront", () => {
  it("reports the host order and refuses to lie when the add was rejected", async () => {
    const playlists = memoryPlaylists([podcastRow([1, 2])]);
    const rejected = {
      ...playlists,
      async addSongs() {
        return { added: 0, skipped: 1 };
      },
    };
    const move = await moveEpisodeToFront(rejected, PODCAST_ID, "播客", 9);
    expect(move.moved).toBe(false);
    expect(move.songIds).toEqual([1, 2]);
    expect(playlists.calls.some((c) => c.startsWith("reorder:"))).toBe(false);
  });
});

describe("play issuance and concurrency", () => {
  it("does not say the request was sent when play was not issued, and creates no backup table", async () => {
    const playlists = memoryPlaylists([podcastRow([10])]);
    const runtime = makeRuntime({
      playlists,
      play: async () => ({ ok: false, playIssued: false, uncertain: false, error: "AbortController is not defined" }),
    });
    const result = await executeCastToSpeaker(runtime, { songIds: [10], kind: "list" });
    expect(result.ok).toBe(false);
    expect(result.playIssued).toBe(false);
    expect(result.uncertain).not.toBe(true);
    expect(String(result.error || "")).toContain("播放请求未能发出");
    expect(String(result.error || "")).toContain("AbortController is not defined");
    expect(String(result.error || "")).not.toMatch(/已向音箱发出/);
    expect(playlists.rows).toHaveLength(1);
  });

  it("says the list order may already have changed when the request was not issued", async () => {
    const playlists = memoryPlaylists([podcastRow([1, 2])]);
    const runtime = makeRuntime({
      playlists,
      play: async () => ({ ok: false, playIssued: false, uncertain: false, error: "host url missing" }),
    });
    const result = await executeCastToSpeaker(runtime, { songIds: [2], kind: "list", songId: 2 });
    expect(result.ok).toBe(false);
    expect(result.orderChanged).toBe(true);
    expect(String(result.error || "")).toContain("列表顺序已调整");
    expect(playlists.rows.find((p) => p.id === PODCAST_ID)?.songs).toEqual([2, 1]);
  });

  it("keeps uncertain protection after an issued timeout and creates no backup table", async () => {
    const playlists = memoryPlaylists([podcastRow([10])]);
    const runtime = makeRuntime({
      playlists,
      play: async () => ({ ok: false, playIssued: true, uncertain: true, error: "请求超时" }),
    });
    const result = await executeCastToSpeaker(runtime, { songIds: [10, 11], kind: "list" });
    expect(result.ok).toBe(false);
    expect(result.playIssued).toBe(true);
    expect(result.uncertain).toBe(true);
    expect(String(result.error || "")).toContain("已向音箱发出播放请求，但结果不明确");
    expect(String(result.error || "")).toContain("列表顺序已调整");
    expect(playlists.rows).toHaveLength(1);
  });

  it("serializes casts on the same playlist and plays only the requested target", async () => {
    const playlists = memoryPlaylists([podcastRow([])]);
    const devices = [
      device({ deviceId: "devA", deviceName: "客厅" }),
      device({ deviceId: "devB", deviceName: "卧室" }),
    ];
    const targets: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runtime = makeRuntime({
      playlists,
      devices,
      play: async (_playlistId, target) => {
        targets.push(target.deviceId);
        if (targets.length === 1) await gate;
        return { ok: true, playIssued: true, uncertain: false };
      },
    });
    const firstP = executeCastToSpeaker(runtime, { songIds: [10], kind: "list", deviceId: "devA", songId: 10 });
    await new Promise((r) => setTimeout(r, 20));
    const secondP = executeCastToSpeaker(runtime, { songIds: [20], kind: "list", deviceId: "devB", songId: 20 });
    release();
    const [first, second] = await Promise.all([firstP, secondP]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.playlistId).toBe(PODCAST_ID);
    expect(playlists.rows).toHaveLength(1);
    // The last cast's episode is at the front, and nothing else was created.
    expect(playlists.rows.find((p) => p.id === PODCAST_ID)?.songs[0]).toBe(20);
    expect(targets).toEqual(["devA", "devB"]);
    expect(runtime.plays).toEqual([PODCAST_ID, PODCAST_ID]);
  });

  it("joins a double-click of the same payload into one play", async () => {
    const playlists = memoryPlaylists([podcastRow([10])]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runtime = makeRuntime({
      playlists,
      play: async () => {
        await gate;
        return { ok: true, playIssued: true, uncertain: false };
      },
    });
    const a = executeCastToSpeaker(runtime, { songIds: [10, 11], kind: "list", songId: 10 });
    await new Promise((r) => setTimeout(r, 20));
    const b = executeCastToSpeaker(runtime, { songIds: [10, 11], kind: "list", songId: 10 });
    release();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.ok).toBe(true);
    expect(rb.ok).toBe(true);
    expect(ra.playlistId).toBe(rb.playlistId);
    expect(playlists.rows).toHaveLength(1);
    expect(runtime.plays).toHaveLength(1);
  });

  it("does nothing to the list when the device is offline", async () => {
    const playlists = memoryPlaylists([podcastRow([1, 2])]);
    const runtime = makeRuntime({
      playlists,
      devices: [device({ deviceId: "off", deviceName: "离线", online: false })],
    });
    const result = await executeCastToSpeaker(runtime, { songIds: [2], kind: "list", songId: 2 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("miot_device_offline");
    expect(playlists.rows.find((p) => p.id === PODCAST_ID)?.songs).toEqual([1, 2]);
    expect(runtime.plays).toEqual([]);
  });
});

describe("manual cleanup", () => {
  it("lists historical tables but never「播客」, and deletes only after confirm", async () => {
    const bag = installStorage();
    bag[CAST_LEDGER_KEY] = {
      version: 2,
      generation: 3,
      playlist: {
        playlistId: 11,
        name: "播客投放",
        description: CAST_PLAYLIST_DESCRIPTION,
        songFingerprint: "10",
        generation: 3,
        playIssued: true,
        trust: "ours",
        kind: "list",
        createdAt: 1,
        updatedAt: 2,
      },
      leftovers: [{ playlistId: 12, name: "播客投放 · 待听 · 客厅 (2)", source: "ledger" }],
    };
    const playlists = memoryPlaylists([
      podcastRow([5]),
      { id: 11, name: "播客投放", description: CAST_PLAYLIST_DESCRIPTION, songs: [10] },
      { id: 12, name: "播客投放 · 待听 · 客厅 (2)", description: CAST_PLAYLIST_DESCRIPTION, songs: [3] },
      { id: 20, name: "播客投放 · 待听 11-15 13:00", description: "旧快照", songs: [1] },
    ]);
    const runtime = makeRuntime({ playlists });
    const listed = await listCastCleanupCandidates(runtime);
    expect(listed.disclaimer).toBe(CLEANUP_DISCLAIMER);
    expect(listed.items.map((i) => i.playlistId)).toEqual([11, 12, 20]);
    expect(listed.items.some((i) => i.playlistId === PODCAST_ID)).toBe(false);

    const refused = await cleanupConfirmedCastPlaylists(runtime, [20], false);
    expect(refused.ok).toBe(false);
    expect(playlists.rows.some((p) => p.id === 20)).toBe(true);

    const podcast = await cleanupConfirmedCastPlaylists(runtime, [PODCAST_ID], true);
    expect(podcast.deleted).toEqual([]);
    expect(podcast.skipped[0].reason).toContain("「播客」");
    expect(playlists.rows.some((p) => p.id === PODCAST_ID)).toBe(true);

    const cleaned = await cleanupConfirmedCastPlaylists(runtime, [11, 12, 20], true);
    expect(cleaned.ok).toBe(true);
    expect(cleaned.deleted.sort()).toEqual([11, 12, 20]);
    expect(playlists.rows.some((p) => p.id === 11 || p.id === 12 || p.id === 20)).toBe(false);
    expect(playlists.rows.some((p) => p.id === PODCAST_ID)).toBe(true);
  });

  it("lists the previously canonical table too, since it is no longer in use", async () => {
    const bag = installStorage();
    bag[CAST_LEDGER_KEY] = {
      version: 2,
      generation: 2,
      playlist: {
        playlistId: 11,
        name: "播客投放",
        description: CAST_PLAYLIST_DESCRIPTION,
        songFingerprint: "10",
        generation: 2,
        playIssued: true,
        trust: "ours",
        kind: "list",
        createdAt: 1,
        updatedAt: 2,
      },
      leftovers: [],
    };
    const playlists = memoryPlaylists([
      podcastRow([5]),
      { id: 11, name: "播客投放", description: CAST_PLAYLIST_DESCRIPTION, songs: [10] },
    ]);
    const runtime = makeRuntime({ playlists });
    const listed = await listCastCleanupCandidates(runtime);
    expect(listed.items.map((i) => i.playlistId)).toEqual([11]);
  });

  it("skips a leftover still referenced by a speaker", async () => {
    const bag = installStorage();
    bag[CAST_LEDGER_KEY] = {
      version: 2,
      generation: 1,
      playlist: null,
      leftovers: [{ playlistId: 20, name: "播客投放 · 待听 11-15 13:00", source: "legacy-name" }],
    };
    const playlists = memoryPlaylists([
      podcastRow([5]),
      { id: 20, name: "播客投放 · 待听 11-15 13:00", description: "旧快照", songs: [1] },
    ]);
    const runtime = makeRuntime({
      playlists,
      statuses: { "acc1:dev1": { playlistId: 20, state: "paused" } },
    });
    const cleaned = await cleanupConfirmedCastPlaylists(runtime, [20], true);
    expect(cleaned.deleted).toEqual([]);
    expect(cleaned.skipped[0]).toMatchObject({ playlistId: 20 });
    expect(playlists.rows.some((p) => p.id === 20)).toBe(true);
  });

  it("does not migrate or rewrite existing ledger data on read", async () => {
    const bag = installStorage();
    const before = {
      version: 2,
      generation: 4,
      playlist: {
        playlistId: 11,
        name: "播客投放",
        description: CAST_PLAYLIST_DESCRIPTION,
        songFingerprint: "1,2",
        generation: 4,
        playIssued: true,
        trust: "ours",
        kind: "list",
        createdAt: 1,
        updatedAt: 2,
      },
      leftovers: [],
    };
    bag[CAST_LEDGER_KEY] = JSON.parse(JSON.stringify(before));
    const ledger = await loadCastLedger();
    expect(ledger.playlist?.playlistId).toBe(11);
    expect(bag[CAST_LEDGER_KEY]).toEqual(before);
  });
});
