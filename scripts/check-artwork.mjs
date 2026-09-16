import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Confirm HEAD failures with GET, as browsers do. Cancel the streamed body so
// checking availability does not download every full-resolution illustration.
export async function checkImage(url, { fetchImage = fetch, retries = 2, pause = wait } = {}) {
  let lastFailure = "unknown error";

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let retryable = true;
    for (const method of ["HEAD", "GET"]) {
      try {
        const response = await fetchImage(url, {
          method,
          redirect: "follow",
          headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
          signal: AbortSignal.timeout(15_000),
        });
        const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
        await response.body?.cancel();
        if (response.ok && contentType?.startsWith("image/")) {
          return { ok: true, status: response.status, contentType, method };
        }
        lastFailure = `${method} HTTP ${response.status}; content-type=${contentType ?? "missing"}`;
        retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      } catch (error) {
        lastFailure = `${method} ${error instanceof Error ? error.message : String(error)}`;
        retryable = true;
      }
    }

    if (!retryable) break;
    if (attempt < retries) await pause(1000 * (2 ** attempt));
  }

  return { ok: false, error: lastFailure };
}

export function collectImageTargets(roster) {
  if (!roster.length || new Set(roster.map(({ id }) => id)).size !== roster.length) {
    throw new Error("Roster must be non-empty and have unique IDs.");
  }
  const byUrl = new Map();
  for (const nikke of roster) {
    for (const role of ["artwork", "image"]) {
      const url = nikke[role];
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error(`${nikke.name}: ${role} must be an HTTPS URL.`);
      }
      const target = byUrl.get(url) ?? { url, usages: [] };
      target.usages.push({ name: nikke.name, role });
      byUrl.set(url, target);
    }
  }
  return [...byUrl.values()];
}

async function main() {
  const roster = JSON.parse((await readFile(new URL("../app/roster.json", import.meta.url), "utf8")).replace(/^\uFEFF/, ""));
  const targets = collectImageTargets(roster);
  const results = new Array(targets.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < targets.length) {
      const index = nextIndex++;
      results[index] = { ...targets[index], ...await checkImage(targets[index].url) };
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, targets.length) }, () => worker()));
  const failures = results.filter(({ ok }) => !ok);
  const summary = `Image URLs: ${results.length - failures.length}/${targets.length} valid (${roster.length} characters; artwork + fallback icons)`;
  console.log(summary);
  for (const failure of failures) {
    console.error(`${failure.usages.map(({ name, role }) => `${name} [${role}]`).join(", ")}: ${failure.error} (${failure.url})`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const details = failures.map(({ usages, error, url }) => `- ${usages.map(({ name, role }) => `${name} (${role})`).join(", ")}: ${error}\n  ${url}`);
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Remote image health\n\n${summary}\n\n${details.join("\n")}\n`);
  }
  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
