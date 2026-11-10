/**
 * Bundle the UI modules (ui/) into static/js/app.js.
 *
 * The plugin builder always treats `static/js/app.js` as the browser entry and
 * deletes every other script in that folder, so the real sources live in `ui/`
 * and are bundled here first (wired through `prebuild`/`predev`).
 */

import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [resolve(root, "ui/main.js")],
  outfile: resolve(root, "static/js/app.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  sourcemap: false,
  logLevel: "info",
  banner: {
    js: "/* Generated from ui/ by scripts/build-ui.mjs — do not edit. */",
  },
});
