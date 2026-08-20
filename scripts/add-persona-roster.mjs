import { readFile, writeFile } from "node:fs/promises";

const rosterPath = new URL("../app/roster.json", import.meta.url);
const roster = JSON.parse((await readFile(rosterPath, "utf8")).replace(/^\uFEFF/, ""));

const personaCharacters = [
  {
    id: "c870",
    name: "Queen (Makoto Niijima)",
    nameKo: "퀸(니지마 마코토)",
    image: "https://nikke-db-legacy.pages.dev/images/sprite/si_c870_00_s.png",
    class: "attacker",
    weapon: "SG",
    burst: "3",
    manufacturer: "abnormal",
    code: "fire",
    artwork: "https://static.wikia.nocookie.net/nikke-goddess-of-victory-international/images/2/2e/Queen_%28Makoto%29_SkillBurst.png/revision/latest?cb=20260814221036",
  },
  {
    id: "c871",
    name: "Yukiko Amagi",
    nameKo: "아마기 유키코",
    image: "https://nikke-db-legacy.pages.dev/images/sprite/si_c871_00_s.png",
    class: "attacker",
    weapon: "MG",
    burst: "3",
    manufacturer: "abnormal",
    code: "fire",
    artwork: "https://static.wikia.nocookie.net/nikke-goddess-of-victory-international/images/b/bf/Yukiko_Amagi_SkillBurst.png/revision/latest?cb=20260814221032",
  },
  {
    id: "c872",
    name: "Aigis",
    nameKo: "아이기스",
    image: "https://nikke-db-legacy.pages.dev/images/sprite/si_c872_00_s.png",
    class: "supporter",
    weapon: "SMG",
    burst: "2",
    manufacturer: "abnormal",
    code: "iron",
    artwork: "https://static.wikia.nocookie.net/nikke-goddess-of-victory-international/images/8/80/Aigis_SkillBurst.png/revision/latest?cb=20260814221034",
  },
];

const personaIds = new Set(personaCharacters.map(({ id }) => id));
const personaNames = new Set(personaCharacters.map(({ name }) => name));
const merged = roster
  .filter(({ id, name }) => !personaIds.has(id) && !personaNames.has(name))
  .concat(personaCharacters)
  .sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));

if (merged.length !== 199) {
  throw new Error(`Expected 199 playable characters after Persona update, received ${merged.length}.`);
}
if (new Set(merged.map(({ id }) => id)).size !== merged.length) {
  throw new Error("Roster IDs must be unique.");
}
if (new Set(merged.map(({ name }) => name)).size !== merged.length) {
  throw new Error("Roster names must be unique.");
}

await writeFile(rosterPath, `${JSON.stringify(merged)}\n`, "utf8");
console.log(`Persona roster synced: ${personaCharacters.length} added, ${merged.length} total`);
