import { beforeEach, describe, expect, it, vi } from "vitest";

const { uiConfirm, host, queuePlayFront, api } = vi.hoisted(() => {
  const uiConfirm = vi.fn(async () => true);
  const queuePlayFront = vi.fn(async (songId: number) => ({
    ok: true,
    moved: true,
    songIds: [songId],
    playlistId: 8,
    playlistName: "播客",
  }));
  const host = {
    hasSetQueue: vi.fn(() => true),
    getState: vi.fn(async () => ({ is_playing: false, queue: [], play_mode: "order" })),
    play: vi.fn(async () => {}),
    replaceQueueAndPlay: vi.fn(async () => {}),
    setPlayMode: vi.fn(async () => {}),
    seek: vi.fn(async () => {}),
  };
  const api = {
    prepare: vi.fn(async () => ({ ok: true, songId: 12 })),
    saveProgress: vi.fn(async () => ({ ok: true })),
    recordHistory: vi.fn(async () => ({ ok: true })),
    queueReorder: vi.fn(),
    queuePlayFront: (...args: [number]) => queuePlayFront(...args),
    queue: vi.fn(async () => ({
      ok: true,
      playlistId: 8,
      playlistName: "播客",
      songs: [
        { id: 12, title: "two", feedUrl: "https://ex/2", guid: "g2" },
        { id: 11, title: "one", feedUrl: "https://ex/1", guid: "g1" },
      ],
    })),
  };
  return { uiConfirm, host, queuePlayFront, api };
});

vi.mock("../ui/lib/toast.js", () => ({ toast: vi.fn(), clearToast: vi.fn() }));
vi.mock("../ui/lib/modal.js", () => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  uiConfirm: (...args: unknown[]) => uiConfirm(...args),
  closePopovers: vi.fn(),
}));
vi.mock("../ui/lib/host.js", () => host);
vi.mock("../ui/lib/api.js", () => ({ api }));

import { getData, patch } from "../ui/lib/store.js";
import { onEnsureQueueVisible, playEpisode, setCapabilities } from "../ui/lib/actions.js";

const EP = {
  title: "two",
  showTitle: "show",
  subscriptionId: "s1",
  guid: "g2",
  feedUrl: "https://ex/2",
  dedupKey: "d2",
};

describe("playEpisode keeps queue panel open/closed state", () => {
  beforeEach(() => {
    const doc = globalThis as typeof globalThis & { document?: { querySelector: (s: string) => null } };
    if (!doc.document || typeof doc.document.querySelector !== "function") {
      doc.document = { querySelector: () => null };
    }
    vi.clearAllMocks();
    uiConfirm.mockResolvedValue(true);
    host.hasSetQueue.mockReturnValue(true);
    host.getState.mockResolvedValue({ is_playing: false, queue: [], play_mode: "order" });
    host.replaceQueueAndPlay.mockResolvedValue(undefined);
    host.setPlayMode.mockResolvedValue(undefined);
    setCapabilities({ available: true, hasPlayer: true });
    patch({
      queueSongs: [
        { id: 11, title: "one", feedUrl: "https://ex/1", guid: "g1" },
        { id: 12, title: "two", feedUrl: "https://ex/2", guid: "g2" },
      ],
      queueMeta: { playlistId: 8, playlistName: "播客" },
      queueOpen: false,
    });
  });

  it("does not force-open the panel when it was closed", async () => {
    const opened: boolean[] = [];
    const stop = onEnsureQueueVisible(() => opened.push(true));
    patch({ queueOpen: false });
    await playEpisode(EP);
    stop();
    expect(opened).toEqual([]);
    expect(getData().queueOpen).toBe(false);
    expect(host.replaceQueueAndPlay).toHaveBeenCalled();
  });

  it("does not close or re-toggle the panel when it was already open", async () => {
    const opened: boolean[] = [];
    const stop = onEnsureQueueVisible(() => opened.push(true));
    patch({ queueOpen: true });
    await playEpisode(EP);
    stop();
    expect(opened).toEqual([]);
    expect(getData().queueOpen).toBe(true);
    expect(host.replaceQueueAndPlay).toHaveBeenCalled();
  });
});
