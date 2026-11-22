import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("settings removes dead「投放用歌单」entry", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "static/index.html"), "utf8");
  const settings = fs.readFileSync(path.join(process.cwd(), "ui/views/settings.js"), "utf8");
  const main = fs.readFileSync(path.join(process.cwd(), "ui/main.js"), "utf8");
  const api = fs.readFileSync(path.join(process.cwd(), "ui/lib/api.js"), "utf8");

  it("drops the settings section and UI loaders while keeping real cast controls", () => {
    expect(html).not.toMatch(/投放用歌单/);
    expect(html).not.toMatch(/castSnapshotList/);
    expect(html).not.toMatch(/btnCleanupCastSnapshots/);
    expect(html).toMatch(/btnTestCast/);
    expect(html).toMatch(/castDeviceList/);
    expect(html).toMatch(/btnCastRefresh/);

    expect(settings).not.toMatch(/loadCastSnapshots/);
    expect(settings).not.toMatch(/投放用歌单/);
    expect(settings).toMatch(/loadCastDevices/);
    expect(settings).toMatch(/castToSpeaker/);

    expect(main).not.toMatch(/loadCastSnapshots/);
    expect(api).not.toMatch(/castSnapshots/);
    expect(api).not.toMatch(/cleanupCastSnapshots/);
  });
});
