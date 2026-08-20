import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const outputPath = new URL("../dist/client/index.html", import.meta.url);
const existingCspPattern = /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*"\s*\/?>/i;
const inlineScriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

let html = await readFile(outputPath, "utf8");

if (!existingCspPattern.test(html)) {
  throw new Error("The static export is missing its fallback Content Security Policy.");
}

html = html.replace(existingCspPattern, "");

if (/\sstyle="/i.test(html) || /\son[a-z]+="/i.test(html)) {
  throw new Error("Inline style or event-handler attributes would violate the hardened policy.");
}

const scriptHashes = [...html.matchAll(inlineScriptPattern)].map((match) => {
  const digest = createHash("sha256").update(match[1], "utf8").digest("base64");
  return `'sha256-${digest}'`;
});

if (scriptHashes.length === 0) {
  throw new Error("No inline bootstrap scripts were found to authorize.");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${[...new Set(scriptHashes)].join(" ")}`,
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data: https://static.wikia.nocookie.net https://nikke-db-legacy.pages.dev",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}"/>`;
const charsetPrefix = '<head><meta charSet="utf-8"/>';
if (!html.includes(charsetPrefix)) {
  throw new Error("The static export is missing its leading UTF-8 declaration.");
}

html = html.replace(charsetPrefix, `${charsetPrefix}${cspMeta}`);
await writeFile(outputPath, html, "utf8");

console.log(`Static CSP: ${new Set(scriptHashes).size} inline script hashes; unsafe-inline disabled`);
