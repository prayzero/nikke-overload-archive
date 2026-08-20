import { readFile } from "node:fs/promises";

const rosterPath = new URL("../app/roster.json", import.meta.url);
const roster = JSON.parse((await readFile(rosterPath, "utf8")).replace(/^\uFEFF/, ""));
const expectedArtworkCount = 199;
const concurrency = 12;
const retries = 2;
const timeoutMs = 10_000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function checkArtwork(nikke) {
  let lastFailure = "unknown error";

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(nikke.artwork, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          "user-agent": "nikke-overload-archive-artwork-check/1.0",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const contentType = response.headers.get("content-type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase();

      if (response.ok && contentType?.startsWith("image/")) {
        return { name: nikke.name, ok: true, status: response.status, contentType };
      }

      lastFailure = `HTTP ${response.status}; content-type=${contentType ?? "missing"}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    if (attempt < retries) await wait(250 * (2 ** attempt));
  }

  return { name: nikke.name, ok: false, url: nikke.artwork, error: lastFailure };
}

if (roster.length !== expectedArtworkCount) {
  throw new Error(`Expected ${expectedArtworkCount} roster entries, received ${roster.length}.`);
}
if (roster.some(({ artwork }) => typeof artwork !== "string" || !/^https:\/\//.test(artwork))) {
  throw new Error("Every roster entry must have an HTTPS artwork URL.");
}

const results = new Array(roster.length);
let nextIndex = 0;

async function worker() {
  while (nextIndex < roster.length) {
    const index = nextIndex;
    nextIndex += 1;
    results[index] = await checkArtwork(roster[index]);
  }
}

await Promise.all(
  Array.from({ length: Math.min(concurrency, roster.length) }, () => worker()),
);

const failures = results.filter(({ ok }) => !ok);
console.log(`Artwork URLs: ${results.length - failures.length}/${roster.length} valid image responses`);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.name}: ${failure.error} (${failure.url})`);
  }
  process.exitCode = 1;
}
