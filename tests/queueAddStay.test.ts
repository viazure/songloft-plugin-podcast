import { beforeEach, describe, expect, it, vi } from "vitest";

const { api, toast } = vi.hoisted(() => ({
  api: {
    queueAdd: vi.fn(),
    queue: vi.fn(),
  },
  toast: vi.fn(),
}));

vi.mock("../ui/lib/toast.js", () => ({ toast, clearToast: vi.fn() }));
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
import {
  addToQueue,
  onEnsureQueueVisible,
  setCapabilities,
} from "../ui/lib/actions.js";

describe("addToQueue keeps the current view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCapabilities({ available: true, hasPlayer: true });
    patch({
      queueSongs: [],
      queueMeta: { playlistId: 8, playlistName: "播客" },
      queueOpen: false,
    });
  });

  it("toasts success without opening the queue panel", async () => {
    const opened: boolean[] = [];
    const stop = onEnsureQueueVisible(() => opened.push(true));
    api.queueAdd.mockResolvedValue({
      ok: true,
      added: 1,
      skipped: 0,
      playlistName: "播客",
      playlistId: 8,
    });
    api.queue.mockResolvedValue({
      ok: true,
      playlistId: 8,
      playlistName: "播客",
      songs: [{ id: 11, title: "ep", feedUrl: "https://a", guid: "g" }],
    });

    const r = await addToQueue({
      title: "ep",
      subscriptionId: "s1",
      guid: "g",
      feedUrl: "https://a",
      dedupKey: "d",
    });
    stop();

    expect(r.ok).toBe(true);
    expect(opened).toEqual([]);
    expect(getData().queueOpen).toBe(false);
    expect(toast).toHaveBeenCalled();
    const msg = String(toast.mock.calls[0][0] || "");
    expect(msg).toMatch(/加入/);
  });

  it("keeps the header queue toggle entry in markup", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");
    expect(html).toMatch(/id="btnToggleQueue"/);
  });
});
