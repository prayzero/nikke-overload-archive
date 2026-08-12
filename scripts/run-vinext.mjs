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
const isWindowsBuild = command === "build" && process.platform === "win32";

const result = spawnSync(process.execPath, [cli, command], {
  env,
  stdio: isWindowsBuild ? ["inherit", "pipe", "pipe"] : "inherit",
  encoding: isWindowsBuild ? "utf8" : undefined,
});

if (isWindowsBuild) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

if (result.error) throw result.error;

// vinext 1.0.0-beta.2 can hit a libuv cleanup assertion on Windows after a
// successful static export. Accept only the exact observed exit/output tuple,
// never an arbitrary failed build that happens to leave an HTML file behind.
if (isWindowsBuild && result.status !== 0) {
  // Node exposes this Windows NTSTATUS as signed or unsigned depending on the
  // runtime/build; both values are the same exact 0xC0000409 status.
  const expectedStatuses = new Set([-1073740791, 3221226505]);
  const expectedSuccessLine = "Build complete. Run `vinext start` to start the production server.";
  const expectedAssertion =
    "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\\win\\async.c, line 76";

  try {
    const output = statSync(fileURLToPath(new URL("../dist/client/index.html", import.meta.url)));
    const outputIsFresh = output.size > 1_000 && output.mtimeMs >= startedAt - 1_000;
    const exportCompleted = result.stdout?.includes(expectedSuccessLine);
    const assertionMatches = result.stderr?.trim() === expectedAssertion;

    if (expectedStatuses.has(result.status) && outputIsFresh && exportCompleted && assertionMatches) {
      console.warn("[build] Static export completed; ignored vinext Windows cleanup assertion.");
      process.exit(0);
    }
  } catch {
    // Fall through to the real non-zero exit below.
  }
}

process.exit(result.status ?? 1);
