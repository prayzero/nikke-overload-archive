import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildArenaPlan, validateArenaCatalog } from "../app/arena-engine.mjs";

const roster = Array.from({ length: 25 }, (_, index) => ({
  id: `unit-${index}`, name: `Unit ${index}`, nameKo: `니케 ${index}`,
  image: "https://example.com/portrait.webp", burst: String(index % 3 + 1), weapon: "RL", class: "attacker",
}));
const ids = roster.map(({ id }) => id);
const names = (indices) => indices.map((index) => roster[index].name);
const preset = (id, indices, priority = 50, extra = {}) => ({
  id, title: id, style: "편성 예시", priority, members: names(indices),
  burst: names(indices.slice(0, 3)), notes: ["운용 근거"], weakness: "상대 확인 필요",
  sourceIds: ["guide"], ...extra,
});
const teams = [
  preset("alpha", [0, 1, 2, 3, 4], 90),
  preset("beta", [5, 6, 7, 8, 9], 80),
  preset("gamma", [10, 11, 12, 13, 14], 70),
  preset("delta", [15, 16, 17, 18, 19], 60),
];
const plan = (ownedIds, presets = teams, favoriteIds = []) =>
  buildArenaPlan({ roster, ownedIds, presets, favoriteIds });

test("selects at most three complete owned teams with distinct characters", () => {
  const result = plan(ids);
  assert.deepEqual(result.teams.map(({ id }) => id), ["alpha", "beta", "gamma"]);
  const members = result.teams.flatMap(({ members }) => members);
  assert.equal(members.length, 15);
  assert.equal(new Set(members.map(({ id }) => id)).size, 15);
  assert.equal(result.availableCount, 4);
  assert.deepEqual(result.alternatives.map(({ id }) => id), ["delta"]);
});

test("does not fabricate a team for an empty, small, or unsupported roster", () => {
  for (const owned of [[], ids.slice(0, 4), ids.filter((_, index) => index % 5 !== 0)]) {
    assert.equal(plan(owned).teams.length, 0);
  }
  assert.equal(plan(ids.slice(0, 9)).teams.length, 1);
  assert.equal(plan(ids.slice(0, 14)).teams.length, 2);
});

test("searches compatible combinations instead of letting one greedy choice block three teams", () => {
  const greedyTrap = preset("expensive", [0, 5, 10, 20, 21], 100);
  assert.deepEqual(plan(ids, [greedyTrap, ...teams.slice(0, 3)]).teams.map(({ id }) => id),
    ["alpha", "beta", "gamma"]);
});

test("maximizes editorial preference only among equally complete sets", () => {
  const weaker = preset("weaker-alpha", [0, 1, 2, 3, 20], 10);
  assert.deepEqual(plan(ids, [weaker, ...teams.slice(0, 3)]).teams.map(({ id }) => id),
    ["alpha", "beta", "gamma"]);
});

test("preserves formation order and repeated Red Hood-like burst paths", () => {
  const ordered = preset("ordered", [4, 1, 3, 0, 2], 50, { burst: names([1, 1, 1]) });
  const result = plan(ids, [ordered]);
  assert.deepEqual(result.teams[0].members.map(({ name }) => name), ordered.members);
  assert.deepEqual(result.teams[0].burst, ordered.burst);
});

test("favorite-item ownership is separate from character ownership and does not duplicate characters", () => {
  const favoriteTeam = preset("favorite", [0, 1, 2, 3, 4], 100, { requiresFavorite: names([0]) });
  const locked = plan(ids, [favoriteTeam, teams[0]]);
  assert.deepEqual(locked.teams.map(({ id }) => id), ["alpha"]);
  assert.equal(locked.nearMatches[0].missing.length, 0);
  assert.deepEqual(locked.nearMatches[0].favoriteMissing.map(({ id }) => id), [ids[0]]);
  const unlocked = plan(ids, [favoriteTeam, teams[0]], [ids[0]]);
  assert.deepEqual(unlocked.teams.map(({ id }) => id), ["favorite"]);
  assert.equal(unlocked.alternatives[0].conflicts.length, 5);
  const notOwned = plan(ids.slice(1), [favoriteTeam], [ids[0]]);
  assert.equal(notOwned.teams.length, 0);
  assert.equal(notOwned.nearMatches[0].missing.length, 1);
});

test("missing requirements and conflicts stay attached to their own candidate", () => {
  const conflicting = preset("conflicting", [0, 5, 6, 7, 8], 20);
  const result = plan(ids.slice(0, 8), [teams[0], conflicting]);
  assert.deepEqual(result.nearMatches[0].missing.map(({ id }) => id), [ids[8]]);
  assert.deepEqual(result.nearMatches[0].conflicts, names([0]));
  assert.equal(result.teams[0].conflicts.length, 0);
});

test("is deterministic, ignores stale IDs, and leaves the caller's saved roster unchanged", () => {
  const input = { roster, ownedIds: new Set([...ids, ids[0], "retired-id"]), favoriteIds: new Set(), presets: teams };
  const before = structuredClone(input);
  const result = buildArenaPlan(input);
  assert.deepEqual(input, before);
  assert.equal(result.ownedCount, roster.length);
  assert.deepEqual(plan([...ids].reverse(), [...teams].reverse()), result);
});

test("fails loudly on unknown or duplicate team members", () => {
  assert.throws(() => plan(ids, [preset("invalid", [0, 0, 1, 2, 3])]), /distinct/);
  assert.throws(() => plan(ids, [{ ...teams[0], members: ["not in roster", ...teams[0].members.slice(1)] }]), /Unknown/);
});

test("validates provenance, ownership references, and favorite conditions", () => {
  const catalog = { checkedAt: "2026-10-27", sources: [{ id: "guide", title: "Guide", url: "https://example.com/guide" }], presets: teams };
  assert.equal(validateArenaCatalog(catalog, roster), true);
  for (const bad of [
    { ...catalog, sources: [{ ...catalog.sources[0], url: "http://example.com" }] },
    { ...catalog, presets: [teams[0], teams[0]] },
    { ...catalog, presets: [{ ...teams[0], sourceIds: ["unknown"] }] },
    { ...catalog, presets: [{ ...teams[0], requiresFavorite: [roster[24].name] }] },
    { ...catalog, presets: [{ ...teams[0], burst: ["unknown", ...teams[0].burst.slice(1)] }] },
  ]) assert.throws(() => validateArenaCatalog(bad, roster));
});

test("shipped arena catalog references real roster members, sources, and three compatible teams", async () => {
  const [catalog, realRoster] = await Promise.all(["arena-presets.json", "roster.json"].map(async (file) =>
    JSON.parse(await readFile(new URL(`../app/${file}`, import.meta.url), "utf8"))));
  assert.equal(validateArenaCatalog(catalog, realRoster), true);
  const allOwned = realRoster.map(({ id }) => id);
  const result = buildArenaPlan({ roster: realRoster, ownedIds: allOwned, favoriteIds: allOwned, presets: catalog.presets });
  assert.equal(result.teams.length, 3);
  assert.equal(new Set(result.teams.flatMap(({ members }) => members.map(({ id }) => id))).size, 15);
  for (const candidate of [...result.teams, ...result.alternatives]) {
    assert.equal(candidate.members.length, 5);
    assert.equal(candidate.missing.length, 0);
    assert.equal(candidate.favoriteMissing.length, 0);
    // These reviewed presets use ordinary stages; Anis: Star is permitted
    // only as the sole B1. Re-entry/ALL teams need a separate reviewed path.
    const firstBurst = ["1", "2", "3"].map((stage) =>
      candidate.members.find(({ burst }) => burst === stage)?.name);
    assert.deepEqual(candidate.burst, firstBurst, `Auto-burst order: ${candidate.id}`);
    if (candidate.members.some(({ name }) => name === "Anis: Star")) {
      assert.equal(candidate.members.filter(({ burst }) => burst === "1").length, 1);
    }
    const reentry = ["Tia", "Rupee: Winter Shopper", "Alice: Wonderland Bunny", "Avistar", "Viper", "Rapi: Red Hood", "Red Hood"];
    assert.equal(candidate.members.some(({ name }) => reentry.includes(name)), false,
      `Re-entry/conditional stages need an explicit new validation rule: ${candidate.id}`);
  }
});
