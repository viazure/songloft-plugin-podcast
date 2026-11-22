import { beforeEach, describe, expect, it, vi } from "vitest";

const { api } = vi.hoisted(() => ({
  api: {
    queue: vi.fn(),
    queuePlayFront: vi.fn(),
    prepare: vi.fn(),
    saveProgress: vi.fn(),
    recordHistory: vi.fn(),
  },
}));

vi.mock("../ui/lib/toast.js", () => ({ toast: vi.fn(), clearToast: vi.fn() }));
vi.mock("../ui/lib/modal.js", () => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  uiConfirm: vi.fn(async () => true),
  closePopovers: vi.fn(),
}));
vi.mock("../ui/lib/host.js", () => ({
  hasSetQueue: vi.fn(() => true),
  getState: vi.fn(async () => ({ is_playing: false, queue: [] })),
}));
vi.mock("../ui/lib/api.js", () => ({ api }));

import { getData, patch } from "../ui/lib/store.js";
import { onQueueViewChange, reloadQueue, setCapabilities } from "../ui/lib/actions.js";

describe("reloadQueue notifies the queue panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCapabilities({ available: true, hasPlayer: true });
    patch({
      queueSongs: [{ id: 1, title: "old-first" }, { id: 2, title: "two" }],
      queueMeta: { playlistId: 8, playlistName: "播客" },
    });
  });

  it("calls queue view listeners after a successful reload", async () => {
    api.queue.mockResolvedValue({
      ok: true,
      playlistId: 8,
      playlistName: "播客",
      songs: [
        { id: 2, title: "two" },
        { id: 1, title: "old-first" },
      ],
    });
    const views: number[][] = [];
    const stop = onQueueViewChange(() => {
      views.push(getData().queueSongs.map((s: { id: number }) => s.id));
    });

    await reloadQueue();
    stop();

    expect(views.length).toBeGreaterThan(0);
    expect(views[views.length - 1]).toEqual([2, 1]);
    expect(getData().queueSongs.map((s: { id: number }) => s.id)).toEqual([2, 1]);
  });
});
