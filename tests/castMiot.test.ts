import { describe, it, expect, afterEach, vi } from "vitest";
import { isPodcastSong } from "../src/castMiot";

/**
 * The cast path talks to the MIoT plugin over HTTP (`/mina/devices` +
 * `/mina/play-url`) because MIoT registers no "play" action over
 * `songloft.comm`. These tests pin the guard rails and the device-shape
 * handling (MIoT emits camelCase `deviceID` / `presence`).
 */
const HOST_PLUGIN = {
  plugin: {
    getHostUrl: async () => "http://127.0.0.1:58091",
    getToken: async () => "tkn",
    getNetworkAddresses: async () => ["192.168.1.10"],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deviceBlock(devices: unknown[], selected?: string) {
  return {
    success: true,
    data: [{ account_id: "acc1", last_selected_device_id: selected || "", devices }],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as unknown as { songloft?: unknown }).songloft;
});

describe("isPodcastSong", () => {
  it("accepts source_data with a feed url", () => {
    expect(isPodcastSong({ id: 1, source_data: { feedUrl: "https://x/y.xml" } })).toBe(true);
  });

  it("accepts source_data with only an enclosure url", () => {
    expect(isPodcastSong({ id: 1, source_data: { enclosureUrl: "https://x/a.mp3" } })).toBe(true);
  });

  it("accepts a JSON string source_data", () => {
    expect(
      isPodcastSong({ id: 1, source_data: JSON.stringify({ feedUrl: "https://x/y.xml" }) })
    ).toBe(true);
  });

  it("rejects unrelated songs", () => {
    expect(isPodcastSong({ id: 1, source_data: {} })).toBe(false);
    expect(isPodcastSong({ id: 1, source_data: '{"artist":"x"}' })).toBe(false);
    expect(isPodcastSong({ id: 1, source_data: "{not json" })).toBe(false);
    expect(isPodcastSong(null)).toBe(false);
    expect(isPodcastSong(undefined)).toBe(false);
  });

  it("ignores blank urls", () => {
    expect(isPodcastSong({ id: 1, source_data: { feedUrl: "   ", enclosureUrl: "" } })).toBe(false);
  });
});

describe("castSongToMiot", () => {
  it("rejects an invalid song id without touching the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { castSongToMiot } = await import("../src/castMiot");
    const bad = await castSongToMiot(0);
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBe("cast_failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports miot_unavailable when the MIoT plugin 404s", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "not found" }, 404)));
    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("miot_unavailable");
  });

  it("reports miot_no_device only when the list is truly empty", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: [] })));
    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("miot_no_device");
  });

  it("understands camelCase deviceID / alias from the MIoT plugin", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        if (String(url).endsWith("/mina/devices")) {
          return jsonResponse(
            deviceBlock([
              { deviceID: "dev-camel", name: "奔跑的小爱音箱", presence: "online", managed: true },
            ])
          );
        }
        return jsonResponse({ success: true });
      })
    );
    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(true);
    expect(r.deviceId).toBe("dev-camel");
    expect(r.deviceName).toBe("奔跑的小爱音箱");
    expect(calls.some((c) => c.endsWith("/mina/play-url"))).toBe(true);
  });

  it("prefers an online device over an offline one", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/mina/devices")) {
          return jsonResponse(
            deviceBlock(
              [
                { deviceID: "off", name: "离线音箱", presence: "offline", managed: true },
                { deviceID: "on", name: "在线音箱", presence: "online", managed: true },
              ],
              "off"
            )          );
        }
        return jsonResponse({ success: true });
      })
    );
    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(true);
    expect(r.deviceId).toBe("on");
  });

  it("reports miot_device_offline instead of pretending it worked", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/mina/devices")) {
          return jsonResponse(
            deviceBlock([{ deviceID: "off", name: "奔跑的小爱音箱", presence: "offline" }])
          );
        }
        throw new Error("should not reach play-url");
      })
    );
    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("miot_device_offline");
    expect(r.deviceName).toBe("奔跑的小爱音箱");
    expect(r.online).toBe(false);
    expect(r.error).toContain("离线");
  });

  it("posts to /mina/play-url with a speaker-reachable url", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    type Call = { url: string; init?: RequestInit };
    const calls: Call[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        if (String(url).endsWith("/mina/devices")) {
          return jsonResponse(
            deviceBlock(
              [
                { deviceID: "dev1", name: "客厅音箱", presence: "online" },
                { deviceID: "dev2", name: "卧室音箱", presence: "online" },
              ],
              "dev2"
            )
          );
        }
        return jsonResponse({ success: true });
      })
    );

    const { castSongToMiot } = await import("../src/castMiot");
    const r = await castSongToMiot(42);
    expect(r.ok).toBe(true);
    expect(r.deviceId).toBe("dev2");

    const play = calls.find((c) => c.url.endsWith("/mina/play-url"));
    expect(play).toBeTruthy();
    const body = JSON.parse(String(play!.init!.body));
    expect(body.account_id).toBe("acc1");
    expect(body.device_id).toBe("dev2");
    // Speaker cannot reach loopback: must use the LAN address.
    expect(body.url.startsWith("http://192.168.1.10:58091/api/v1/songs/42/play")).toBe(true);
    expect(body.url).toContain("access_token=tkn");
    expect(body.url).not.toContain("127.0.0.1");
  });
});

describe("listMiotDevices", () => {  it("exposes online/managed/selected flags for the picker", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          deviceBlock(
            [
              { deviceID: "a", name: "A", presence: "online", managed: true, model: "L07A" },
              { deviceID: "b", name: "B", presence: "offline", managed: false },
            ],
            "b"
          )
        )
      )
    );
    const { listMiotDevices } = await import("../src/castMiot");
    const list = await listMiotDevices();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ deviceId: "a", online: true, managed: true, model: "L07A" });
    expect(list[1]).toMatchObject({ deviceId: "b", online: false, managed: false, selected: true });
  });

  it("returns an empty list when the plugin is unreachable", async () => {
    (globalThis as unknown as { songloft: unknown }).songloft = HOST_PLUGIN;
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "nope" }, 404)));
    const { listMiotDevices } = await import("../src/castMiot");
    expect(await listMiotDevices()).toEqual([]);
  });
});
