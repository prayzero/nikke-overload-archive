import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCalculatedArenaPlan, evaluateCalculatedTeam, validateArenaModel } from "../app/arena-calculator.mjs";

const unit = (id, stage, extra = {}) => ({ id, name: id, nameKo: id, burst: String(stage), weapon: "RL", class: "attacker", image: "", ...extra });
const profile = (nikke, extra = {}) => ({ name: nikke.name, burstStage: Number(nikke.burst),
  burstRule: "standard", generation: 2, passiveOffense: 0, burstOffense: 0,
  passiveSurvival: 0, burstSurvival: 0, tank: 0, notes: ["테스트 역할"], sourceIds: ["source"], ...extra });
const modelFor = (profiles = [], excluded = []) => ({ checkedAt: "2026-10-30", modelKind: "relative-heuristic-v1",
  description: "테스트용 상대 점수", sources: [{ id: "source", title: "근거", url: "https://example.com/guide" }],
  rules: [{ id: "auto", note: "같은 단계 왼쪽 우선", sourceIds: ["source"] }],
  weaponGeneration: { RL: 2, SG: 1.5, SR: 1, AR: 0.5, SMG: 0.2, MG: 0.2 }, profiles, excluded });
const generate = (roster, model = modelFor(), options = {}) => buildCalculatedArenaPlan({
  roster, ownedIds: roster.map(({ id }) => id), model, ...options,
});
const five = [unit("b1", 1), unit("b2", 2), unit("carry", 3), unit("filler1", 2), unit("filler2", 3)];
const rosterPath = new URL("../app/roster.json", import.meta.url);
const modelPath = new URL("../app/arena-model.json", import.meta.url);

test("generates previously unseen teams from owned units without any preset input", () => {
  const result = generate(five);
  assert.equal(result.teams.length, 1);
  assert.deepEqual(new Set(result.teams[0].members.map(({ id }) => id)), new Set(five.map(({ id }) => id)));
  assert.equal(result.unknownCount, 5);
  assert.equal(result.teams[0].unprofiledNames.length, 5);
  assert.match(result.teams[0].contributions[0].basis, /개별 스킬 미반영/);
  assert.match(result.searchLabel, /근사 탐색/);
});

test("empty, fewer than five, and missing-stage rosters never become complete teams", () => {
  for (const roster of [[], five.slice(0, 4), five.map((nikke) => ({ ...nikke, burst: "3" }))]) {
    assert.deepEqual(generate(roster).teams, []);
  }
});

test("allocates all three teams jointly, limits rookie to one, and keeps every ID unique", () => {
  const roster = Array.from({ length: 15 }, (_, i) => unit("u" + i, i % 3 + 1));
  const model = modelFor(roster.map((nikke, i) => profile(nikke, {
    generation: i < 5 ? 5 : 1, burstOffense: nikke.burst === "3" ? 5 : 0,
    passiveSurvival: i < 5 ? 3 : 0,
  })));
  const result = generate(roster, model);
  assert.equal(result.teams.length, 3);
  assert.equal(new Set(result.teams.flatMap(({ members }) => members.map(({ id }) => id))).size, 15);
  for (const team of result.teams) {
    assert.deepEqual(team.burst, ["1", "2", "3"].map((stage) => team.members.find(({ burst }) => burst === stage).name));
    assert.ok(team.breakdown.generation > 25, "strong generators must not all be stranded in one team");
  }
  assert.equal(generate(roster, model, { teamCount: 1 }).teams.length, 1);
  assert.equal(generate(roster.slice(0, 14), model).teams.length, 2);
});

test("only actual first burst users contribute their own burst effects; passives remain", () => {
  const model = modelFor(five.map((nikke) => profile(nikke, {
    passiveOffense: 1, passiveSurvival: 1,
    burstOffense: nikke.id === "filler2" ? 5 : 0,
    burstSurvival: nikke.id === "filler1" ? 5 : 0,
  })));
  const ordered = evaluateCalculatedTeam({ members: five, model });
  const filler = ordered.contributions.find(({ id }) => id === "filler1");
  assert.equal(filler.survival, 1);
  assert.equal(ordered.contributions.find(({ id }) => id === "filler2").offense, 1);
  const reversed = evaluateCalculatedTeam({ members: [five[0], five[3], five[4], five[1], five[2]], model });
  assert.equal(reversed.contributions.find(({ id }) => id === "filler1").survival, 6);
  assert.equal(reversed.contributions.find(({ id }) => id === "filler2").offense, 6);
  assert.ok(reversed.score > ordered.score);
});

test("active selection accounts for saturation and position cannot steal the chosen burst", () => {
  const model = modelFor(five.map((nikke) => profile(nikke, {
    passiveOffense: 5, burstOffense: nikke.id === "b2" ? 5 : 0,
    burstSurvival: nikke.id === "filler1" ? 2 : 0, tank: nikke.id === "b2" ? 5 : 0,
  })));
  const team = generate(five, model).teams[0];
  assert.equal(team.burst[1], "filler1", "offense is already capped, so the survival burst is useful");
  assert.ok(team.members.findIndex(({ id }) => id === "filler1") < team.members.findIndex(({ id }) => id === "b2"));
  assert.equal(evaluateCalculatedTeam({ members: team.members, model }).score, team.score);
});

test("goal selection genuinely changes the active user and score", () => {
  const model = modelFor(five.map((nikke) => profile(nikke, {
    burstOffense: nikke.id === "b2" ? 5 : 0,
    burstSurvival: nikke.id === "filler1" ? 5 : 0,
  })));
  assert.equal(generate(five, model, { goal: "balanced" }).teams[0].burst[1], "b2");
  assert.equal(generate(five, model, { goal: "survival" }).teams[0].burst[1], "filler1");
  assert.throws(() => generate(five, model, { goal: "invalid" }), /goal/);
  assert.throws(() => generate(five, model, { teamCount: 2 }), /count/);
});

test("favorite-gated units and upgraded scores need the separate favorite setting", () => {
  const model = modelFor(five.map((nikke) => profile(nikke, {
    requiresFavorite: nikke.id === "b1", favorite: { generation: 5 },
  })));
  assert.equal(generate(five, model).teams.length, 0);
  assert.match(generate(five, model).excluded[0].reason, /애장품/);
  const withFavorite = generate(five, model, { favoriteIds: ["b1"] });
  assert.equal(withFavorite.teams.length, 1);
  assert.equal(withFavorite.teams[0].contributions.find(({ id }) => id === "b1").generation, 5);
  assert.deepEqual(withFavorite.teams[0].requiresFavorite, ["b1"]);
});

test("conditional protection needs another member of the protected class", () => {
  const model = modelFor(five.map((nikke) => profile(nikke, {
    passiveSurvival: nikke.id === "b2" ? 5 : 0,
    ...(nikke.id === "b2" ? { survivalRequiresClass: "defender" } : {}),
  })));
  const read = (members) => evaluateCalculatedTeam({ members, model }).contributions.find(({ id }) => id === "b2");
  assert.equal(read(five).survival, 0);
  assert.equal(read(five.map((nikke) => nikke.id === "b2" ? { ...nikke, class: "defender" } : nikke)).survival, 0);
  assert.equal(read(five.map((nikke) => nikke.id === "filler1" ? { ...nikke, class: "defender" } : nikke)).survival, 5);
});

test("sole-B1 cannot be combined with another B1 and does not consume impossible filler slots", () => {
  const units = [unit("sole", 1), unit("regular", 1), unit("b2", 2), unit("b3", 3), unit("other", 3)];
  const model = modelFor(units.map((nikke) => profile(nikke, { burstRule: nikke.id === "sole" ? "sole-b1" : "standard" })));
  assert.equal(evaluateCalculatedTeam({ members: units, model }), null);
  assert.equal(generate(units, model).teams.length, 0);
  const extra = unit("extra", 3);
  const result = generate([...units, extra], model);
  assert.equal(result.teams.length, 1);
  assert.ok(!(result.teams[0].members.some(({ id }) => id === "sole") && result.teams[0].members.some(({ id }) => id === "regular")));
});

test("explicit exclusions and ALL stages are never guessed as ordinary burst units", () => {
  const all = unit("all", "ALL");
  const model = modelFor([], [{ name: "b1", reason: "재진입 미지원", sourceIds: ["source"] }]);
  const result = generate([...five, all], model);
  assert.equal(result.teams.length, 0);
  assert.deepEqual(result.excluded.map(({ nikke }) => nikke.id).sort(), ["all", "b1"]);
  assert.equal(evaluateCalculatedTeam({ members: five, model }), null);
  assert.equal(evaluateCalculatedTeam({ members: [...five.slice(0, 4), five[0]], model: modelFor() }), null);
});

test("input order, duplicate ownership, and stale IDs do not affect deterministic output or mutate inputs", () => {
  const roster = Array.from({ length: 18 }, (_, i) => unit("u" + i, i % 3 + 1));
  const model = modelFor(roster.map((nikke, i) => profile(nikke, { generation: i % 5, passiveOffense: i % 3, burstSurvival: i % 2 })));
  const before = structuredClone({ roster, model });
  const result = generate(roster, model);
  const reversed = generate([...roster].reverse(), model, { ownedIds: [...roster.map(({ id }) => id).reverse(), "stale", "u0"] });
  assert.deepEqual(reversed, result);
  assert.deepEqual({ roster, model }, before);
  assert.equal(result.ownedCount, roster.length);
});

test("shipped model validates exact names, bounded coefficients, sources and burst stages", async () => {
  const roster = JSON.parse(await readFile(rosterPath, "utf8"));
  const model = JSON.parse(await readFile(modelPath, "utf8"));
  assert.equal(validateArenaModel(model, roster), true);
  for (const mutation of [
    (copy) => { copy.profiles[0].generation = NaN; },
    (copy) => { copy.profiles[0].burstStage = 9; },
    (copy) => { copy.profiles[0].sourceIds = ["missing"]; },
    (copy) => { copy.profiles.push(copy.profiles[0]); },
    (copy) => { copy.weaponGeneration.RL = 100; },
    (copy) => { copy.sources[0].url = "http://example.com"; },
    (copy) => { copy.checkedAt = "2026-02-30"; },
  ]) {
    const copy = structuredClone(model); mutation(copy);
    assert.throws(() => validateArenaModel(copy, roster));
  }
});

test("Marian Queen and Sanctuary can form a calculated team while untriggered revive and barrier give no credit", async () => {
  const roster = JSON.parse(await readFile(rosterPath, "utf8"));
  const model = JSON.parse(await readFile(modelPath, "utf8"));
  const names = ["Jackal", "Rapunzel: Sanctuary", "Marian: Queen", "Centi", "Drake"];
  const owned = roster.filter(({ name }) => names.includes(name));
  assert.equal(owned.length, 5);
  const team = generate(owned, model).teams[0];
  assert.equal(team.members.length, 5);
  assert.ok(team.members.some(({ name }) => name === "Marian: Queen"));
  assert.ok(team.members.some(({ name }) => name === "Rapunzel: Sanctuary"));
  const sanctuary = model.profiles.find(({ name }) => name === "Rapunzel: Sanctuary");
  assert.equal(sanctuary.burstSurvival, 0);
  assert.ok(sanctuary.passiveSurvival > 0);
  assert.match(team.notes.join(" "), /부활/);
  assert.match(team.style, /실전 미검증/);
});

test("all 205 owned characters finish within a bounded workload with valid non-overlapping teams", async () => {
  const roster = JSON.parse(await readFile(rosterPath, "utf8"));
  const model = JSON.parse(await readFile(modelPath, "utf8"));
  const start = performance.now();
  const result = generate(roster, model, { favoriteIds: roster.map(({ id }) => id) });
  const elapsed = performance.now() - start;
  assert.equal(roster.length, 205);
  assert.equal(result.teams.length, 3);
  assert.equal(new Set(result.teams.flatMap(({ members }) => members.map(({ id }) => id))).size, 15);
  assert.ok(result.examinedCount < 150000, `candidate evaluations: ${result.examinedCount}`);
  assert.ok(elapsed < 10000, `bounded planner took ${Math.round(elapsed)}ms`);
  for (const team of result.teams) {
    assert.equal(evaluateCalculatedTeam({ members: team.members, model, favoriteIds: roster.map(({ id }) => id) }).score, team.score);
    assert.ok(Number.isFinite(team.score) && team.score >= 0 && team.score <= 100);
  }
});
