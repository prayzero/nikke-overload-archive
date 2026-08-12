import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const command = process.argv[2] ?? "dev";
const cli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
const env = {
  ...process.env,
  WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
  ...(command === "build" ? { VINEXT_STATIC_EXPORT: "1" } : {}),
};
const startedAt = Date.now();

const result = spawnSync(process.execPath, [cli, command], {
  env,
  stdio: "inherit",
});

if (result.error) throw result.error;

// vinext 1.0.0-beta.2 can hit a libuv cleanup assertion on Windows after a
// successful static export. Only accept that exit when this run wrote fresh HTML.
if (command === "build" && process.platform === "win32" && result.status !== 0) {
  try {
    const output = statSync(fileURLToPath(new URL("../dist/client/index.html", import.meta.url)));
    if (output.size > 1_000 && output.mtimeMs >= startedAt - 1_000) {
      console.warn("[build] Static export completed; ignored vinext Windows cleanup assertion.");
      process.exit(0);
    }
  } catch {
    // Fall through to the real non-zero exit below.
  }
}

process.exit(result.status ?? 1);
