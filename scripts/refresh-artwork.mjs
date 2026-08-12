import { readFile, writeFile } from "node:fs/promises";

const rosterPath = new URL("../app/roster.json", import.meta.url);
const wikiApi =
  "https://nikke-goddess-of-victory-international.fandom.com/api.php";

const roster = JSON.parse((await readFile(rosterPath, "utf8")).replace(/^\uFEFF/, ""));

function sourceFilename(imageUrl) {
  const match = imageUrl.match(/\/([^/?]+_(?:MI|FB)\.png)\/revision\//i);
  return match ? decodeURIComponent(match[1]).replace(/_MI\.png$/i, "_FB.png") : null;
}

const requestedFiles = [
  ...new Set(roster.map((nikke) => sourceFilename(nikke.image)).filter(Boolean)),
];
const artworkByFile = new Map();

function cleanKoreanName(value) {
  return value
    .replace(/<ref>.*?<\/ref>/gi, "")
    .replace(/\{\{hover\|([^|]+)\|[^}]+\}\}/gi, "$1")
    .trim();
}

for (let index = 0; index < requestedFiles.length; index += 50) {
  const batch = requestedFiles.slice(index, index + 50);
  const params = new URLSearchParams({
    action: "query",
    titles: batch.map((file) => `File:${file}`).join("|"),
    prop: "imageinfo",
    iiprop: "url|size",
    iiurlwidth: "512",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`${wikiApi}?${params}`);
  if (!response.ok) throw new Error(`Fandom API request failed: ${response.status}`);

  const payload = await response.json();
  for (const page of Object.values(payload.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info?.url || !page.title?.startsWith("File:")) continue;
    artworkByFile.set(page.title.slice(5).replaceAll(" ", "_"), {
      url: info.thumburl ?? info.url,
      width: info.width,
      height: info.height,
    });
  }
}

let matched = 0;
const missing = [];
const enriched = roster.map((nikke) => {
  const filename = sourceFilename(nikke.image);
  const artwork = filename ? artworkByFile.get(filename) : null;
  if (!artwork) {
    missing.push(nikke.name);
    return { ...nikke, nameKo: cleanKoreanName(nikke.nameKo), artwork: nikke.image };
  }
  matched += 1;
  return { ...nikke, nameKo: cleanKoreanName(nikke.nameKo), artwork: artwork.url };
});

await writeFile(rosterPath, `${JSON.stringify(enriched)}\n`, "utf8");
console.log(`Full-body artwork: ${matched}/${roster.length}`);
if (missing.length) console.log(`Icon fallback (${missing.length}): ${missing.join(", ")}`);
