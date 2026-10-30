// These weights are design choices, not game coefficients or measured win rates.
export const CALCULATION_WEIGHTS = Object.freeze({
  balanced: Object.freeze({ generation: 3, offense: 4, survival: 3 }),
  burst: Object.freeze({ generation: 5, offense: 3, survival: 2 }),
  survival: Object.freeze({ generation: 2, offense: 3, survival: 5 }),
});
// Five maximum 5-point contributions are the reference scale. Smaller limits
// made many unrelated teams saturate at 100 and erased useful trade-offs.
export const CALCULATION_SCALE = Object.freeze({ generation: 25, offense: 25, survival: 25 });
const SCORE_KEYS = ["generation", "passiveOffense", "burstOffense", "passiveSurvival", "burstSurvival", "tank"];
const round = (value) => Math.round(value * 10) / 10;
const byId = (a, b) => a.nikke.id.localeCompare(b.nikke.id, "en");
const weightsFor = (goal) => {
  if (!Object.hasOwn(CALCULATION_WEIGHTS, goal)) throw new Error("Unknown arena calculation goal");
  return CALCULATION_WEIGHTS[goal];
};

function prepare(roster, ownedIds, favoriteIds, model) {
  const owned = new Set(ownedIds);
  const favorites = new Set(favoriteIds);
  const profiles = new Map(model.profiles.map((profile) => [profile.name, profile]));
  const blocked = new Map(model.excluded.map((entry) => [entry.name, entry.reason]));
  const entries = [];
  const excluded = [];
  const seen = new Set();
  for (const nikke of roster) {
    if (!owned.has(nikke.id) || seen.has(nikke.id)) continue;
    seen.add(nikke.id);
    const profile = profiles.get(nikke.name);
    const stage = profile?.burstStage ?? Number(nikke.burst);
    const reason = blocked.get(nikke.name)
      ?? (![1, 2, 3].includes(stage) ? "올버스트·변환 버스트는 현재 계산 모델에서 다루지 않습니다." : null)
      ?? (profile?.requiresFavorite && !favorites.has(nikke.id) ? "계산 프로필에 필요한 애장품 최종 단계가 확인되지 않았습니다." : null);
    if (reason) { excluded.push({ nikke, reason }); continue; }
    const favorite = Boolean(profile?.favorite && favorites.has(nikke.id));
    const scores = profile ? { ...profile, ...(favorite ? profile.favorite : {}) } : {
      generation: model.weaponGeneration[nikke.weapon] ?? 0,
      passiveOffense: nikke.class === "attacker" ? 1 : 0,
      burstOffense: 0, passiveSurvival: 0, burstSurvival: 0, tank: 0,
    };
    entries.push({ nikke, stage, profile, scores, favorite,
      sole: profile?.burstRule === "sole-b1" });
  }
  entries.sort(byId);
  excluded.sort((a, b) => a.nikke.id.localeCompare(b.nikke.id, "en"));
  return { entries, excluded, ownedCount: seen.size };
}

function legal(entries) {
  return entries.length === 5 && new Set(entries.map(({ nikke }) => nikke.id)).size === 5
    && [1, 2, 3].every((stage) => entries.some((entry) => entry.stage === stage))
    && (!entries.some(({ sole }) => sole) || entries.filter(({ stage }) => stage === 1).length === 1);
}

function measure(entries, weights) {
  const active = [1, 2, 3].map((stage) => entries.find((entry) => entry.stage === stage));
  let generation = 0, offense = 0, survival = 0;
  for (const entry of entries) {
    generation += entry.scores.generation;
    offense += entry.scores.passiveOffense + (active.includes(entry) ? entry.scores.burstOffense : 0);
    const condition = !entry.profile?.survivalRequiresClass || entries.some((other) =>
      other !== entry && other.nikke.class === entry.profile.survivalRequiresClass);
    survival += (condition ? entry.scores.passiveSurvival : 0) + (active.includes(entry) ? entry.scores.burstSurvival : 0);
  }
  const breakdown = {
    generation: Math.min(100, generation * 100 / CALCULATION_SCALE.generation),
    offense: Math.min(100, offense * 100 / CALCULATION_SCALE.offense),
    survival: Math.min(100, survival * 100 / CALCULATION_SCALE.survival),
  };
  const score = (breakdown.generation * weights.generation + breakdown.offense * weights.offense
    + breakdown.survival * weights.survival) / 10;
  return { active, breakdown, score };
}

// Pick an active user at each stage, then put that user before every same-stage
// filler. Tank preference affects ordering only, never a promised targeting result.
function arrange(entries, weights) {
  const stages = [1, 2, 3].map((stage) => entries.filter((entry) => entry.stage === stage).sort(byId));
  let winners = new Set();
  let bestScore = -Infinity;
  // A legal five-member team has at most four active-user combinations. Compare
  // all of them so a capped offense index cannot hide a useful survival burst.
  for (const first of stages[0]) for (const second of stages[1]) for (const third of stages[2]) {
    const active = [first, second, third];
    const score = measure([...active, ...entries.filter((entry) => !active.includes(entry))], weights).score;
    if (score > bestScore + 1e-8) { bestScore = score; winners = new Set(active); }
  }
  const remaining = [...entries];
  const ordered = [];
  while (remaining.length) {
    const available = remaining.filter((entry) => winners.has(entry)
      || ordered.some((other) => other.stage === entry.stage));
    available.sort((a, b) => b.scores.tank - a.scores.tank || byId(a, b));
    const next = available[0];
    ordered.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }
  return ordered;
}

function describe(entries, weights, model) {
  const { active, breakdown, score } = measure(entries, weights);
  const contributions = entries.map((entry) => {
    const isActive = active.includes(entry);
    const condition = !entry.profile?.survivalRequiresClass || entries.some((other) =>
      other !== entry && other.nikke.class === entry.profile.survivalRequiresClass);
    return {
      id: entry.nikke.id, label: entry.nikke.nameKo,
      generation: entry.scores.generation,
      offense: entry.scores.passiveOffense + (isActive ? entry.scores.burstOffense : 0),
      survival: (condition ? entry.scores.passiveSurvival : 0) + (isActive ? entry.scores.burstSurvival : 0),
      basis: (entry.profile ? "개별 역할 프로필" : "무기·직군 기본값 · 개별 스킬 미반영")
        + (entry.favorite ? " · 애장품 반영" : "")
        + (isActive ? " · 첫 버스트 사용" : " · 본인 버스트 효과 제외")
        + (!condition ? " · 보호 대상 직군 없음: 조건부 생존 가산 제외" : ""),
    };
  });
  const unprofiledNames = entries.filter(({ profile }) => !profile).map(({ nikke }) => nikke.nameKo);
  const notes = [
    "전원 생존·첫 버스트 기준입니다. 같은 단계의 왼쪽 니케만 본인 버스트 효과를 가산합니다.",
    "표시 순서는 첫 버스트 사용자를 앞에 두고 생존 역할을 우선한 시작 배치입니다. 상대의 타깃·도발에 맞춰 조정해 주세요.",
    ...entries.flatMap(({ nikke, profile }) => (profile?.notes ?? []).map((note) => nikke.nameKo + ": " + note)),
  ];
  if (unprofiledNames.length) notes.push("기본값 계산: " + unprofiledNames.join(" · ") + ". 개별 스킬을 확인하기 전에는 투자 판단에 사용하지 마세요.");
  const weak = [];
  if (breakdown.generation < 50) weak.push("수급 지수가 낮아 첫 버스트가 늦어질 위험을 확인해 주세요.");
  if (breakdown.offense < 35) weak.push("확인한 공격 역할이 적습니다. 실제 처치 능력을 확인해 주세요.");
  if (breakdown.survival < 35) weak.push("확인한 생존 지원이 적습니다. 선제 공격에 취약할 수 있습니다.");
  weak.push("상대 편성·전투력·장비·스킬 레벨·후속 쿨다운은 계산하지 않습니다.");
  return {
    id: "calculated-" + entries.map(({ nikke }) => nikke.id).join("-"),
    title: active[2].nikke.nameKo + " 중심 계산 조합", style: "자체 계산 · 실전 미검증",
    priority: round(score), score: round(score),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([key, value]) => [key, round(value)])),
    contributions, unprofiledNames, members: entries.map(({ nikke }) => nikke),
    burst: active.map(({ nikke }) => nikke.name),
    requiresFavorite: entries.filter(({ profile, favorite }) => profile?.requiresFavorite || favorite).map(({ nikke }) => nikke.name),
    missing: [], favoriteMissing: [], conflicts: [], available: true,
    notes, weakness: weak.join(" "),
    sourceIds: [...new Set([
      ...model.rules.filter(({ id }) => ["automatic-burst-order", "relative-generation"].includes(id)).flatMap(({ sourceIds }) => sourceIds),
      ...entries.flatMap(({ profile }) => profile?.sourceIds ?? []),
    ])],
  };
}

/** Evaluate the supplied P1..P5 order, without silently fixing an invalid path. */
export function evaluateCalculatedTeam({ members, favoriteIds = [], model, goal = "balanced" }) {
  const weights = weightsFor(goal);
  const { entries, excluded } = prepare(members, members.map(({ id }) => id), favoriteIds, model);
  const byMember = new Map(entries.map((entry) => [entry.nikke.id, entry]));
  if (excluded.length || members.length !== 5) return null;
  const ordered = members.map(({ id }) => byMember.get(id));
  return legal(ordered) ? describe(ordered, weights, model) : null;
}

// Feasibility is exact for this restricted model: ordinary B1/B2/B3, plus B1s
// that must be the team's only B1. Special/re-entry units are explicitly excluded.
function feasibleAllocation(entries, requested) {
  const regularB1 = entries.filter((entry) => entry.stage === 1 && !entry.sole).length;
  const soleB1 = entries.filter(({ sole }) => sole).length;
  const b2 = entries.filter((entry) => entry.stage === 2).length;
  const b3 = entries.filter((entry) => entry.stage === 3).length;
  for (let count = requested; count > 0; count--) {
    const soleOptions = [];
    for (let sole = 0; sole <= Math.min(count, soleB1); sole++) {
      if (regularB1 >= count - sole && b2 >= count && b3 >= count
        && entries.length - soleB1 + sole >= 5 * count && b2 + b3 >= 2 * count + 2 * sole) soleOptions.push(sole);
    }
    if (soleOptions.length) return { count, soleOptions };
  }
  return { count: 0, soleOptions: [] };
}

/** Joint multi-start allocation + bounded replacement/swaps; never preset lookup. */
export function buildCalculatedArenaPlan({ roster, ownedIds, favoriteIds = [], model, teamCount = 3, goal = "balanced" }) {
  if (![1, 3].includes(teamCount)) throw new Error("Arena team count must be 1 or 3");
  const weights = weightsFor(goal);
  const prepared = prepare(roster, ownedIds, favoriteIds, model);
  const { entries } = prepared;
  const { count, soleOptions } = feasibleAllocation(entries, teamCount);
  let examinedCount = 0;
  const cache = new Map();
  function rate(members) {
    const key = members.map(({ nikke }) => nikke.id).sort().join(",");
    let value = cache.get(key);
    if (!value) {
      const ordered = arrange(members, weights);
      value = { members: ordered, score: measure(ordered, weights).score };
      cache.set(key, value);
      examinedCount++;
    }
    return value;
  }
  // All teams are built together; the weakest team gets extra influence instead
  // of sacrificing it to make the first team stronger. Team count is fixed first.
  const utility = (teams) => teams.reduce((sum, team) => sum + team.score, 0)
    + Math.min(...teams.map(({ score }) => score)) * teams.length;
  let best = [];
  let bestUtility = -Infinity;
  for (let seed = 0; seed < (count ? 6 : 0); seed++) {
    const seedWeights = seed < 3 ? weights : Object.values(CALCULATION_WEIGHTS)[seed - 3];
    const rank = (entry, burst = false) => entry.scores.generation * seedWeights.generation
      + (entry.scores.passiveOffense + (burst ? entry.scores.burstOffense : 0)) * seedWeights.offense
      + (entry.scores.passiveSurvival + (burst ? entry.scores.burstSurvival : 0)) * seedWeights.survival;
    const groups = Array.from({ length: count }, () => []);
    const used = new Set();
    const requestedSole = soleOptions[seed % soleOptions.length];
    for (const stage of [1, 2, 3]) {
      const sorted = entries.filter((entry) => entry.stage === stage)
        .sort((a, b) => rank(b, true) - rank(a, true) || byId(a, b));
      const anchors = [];
      for (const entry of sorted) {
        if (stage === 1 && anchors.filter((anchor) => anchor.sole === entry.sole).length
          >= (entry.sole ? requestedSole : count - requestedSole)) continue;
        anchors.push(entry);
        if (anchors.length === count) break;
      }
      // Rotate/reverse allocation to explore different shared-resource pairings.
      anchors.forEach((entry, index) => {
        const target = (seed % 2 && stage === 2 ? count - 1 - index : index + seed * (stage - 1)) % count;
        groups[target].push(entry);
        used.add(entry);
      });
    }
    const fillOrder = groups.map((group, index) => ({ group, index }))
      .sort((a, b) => Number(b.group.some(({ sole }) => sole)) - Number(a.group.some(({ sole }) => sole)) || a.index - b.index);
    for (const { group } of fillOrder) {
      while (group.length < 5) {
        const choices = entries.filter((entry) => !used.has(entry) && !entry.sole
          && !(entry.stage === 1 && group.some(({ sole }) => sole)))
          .map((entry) => ({ entry, rating: rate([...group, entry]).score }))
          .sort((a, b) => b.rating - a.rating || byId(a.entry, b.entry));
        if (!choices.length) break;
        group.push(choices[0].entry);
        used.add(choices[0].entry);
      }
    }
    if (!groups.every(legal)) continue;
    let current = groups.map(rate);
    let currentUtility = utility(current);
    // Every pass accepts just the best strict improvement. Fixed passes bound
    // runtime; replacement and cross-team swaps can redistribute scarce units.
    for (let pass = 0; pass < 5; pass++) {
      const occupied = new Set(current.flatMap(({ members }) => members));
      const spare = entries.filter((entry) => !occupied.has(entry));
      let next = current;
      let nextUtility = currentUtility;
      function consider(candidate) {
        const value = utility(candidate);
        if (value > nextUtility + 1e-8) { next = candidate; nextUtility = value; }
      }
      for (let team = 0; team < current.length; team++) {
        for (let slot = 0; slot < 5; slot++) {
          for (const replacement of spare) {
            const members = current[team].members.with(slot, replacement);
            if (legal(members)) consider(current.with(team, rate(members)));
          }
          for (let other = team + 1; other < current.length; other++) {
            for (let otherSlot = 0; otherSlot < 5; otherSlot++) {
              const left = current[team].members.with(slot, current[other].members[otherSlot]);
              const right = current[other].members.with(otherSlot, current[team].members[slot]);
              if (legal(left) && legal(right)) consider(current.with(team, rate(left)).with(other, rate(right)));
            }
          }
        }
      }
      if (next === current) break;
      current = next;
      currentUtility = nextUtility;
    }
    if (currentUtility > bestUtility + 1e-8) { best = current; bestUtility = currentUtility; }
  }
  const teams = best.sort((a, b) => b.score - a.score || byId(a.members[0], b.members[0]))
    .map(({ members }) => describe(members, weights, model));
  return {
    teams, ownedCount: prepared.ownedCount, eligibleCount: entries.length, excluded: prepared.excluded,
    unknownCount: entries.filter(({ profile }) => !profile).length, examinedCount,
    searchLabel: "최대 팀 수를 먼저 확보한 뒤 6가지 배분에서 팀 간 교체·교환을 최대 5회 개선합니다. 총점 + 팀 수 × 최약팀 점수를 비교하는 근사 탐색이며 전역 최적해를 보장하지 않습니다.",
  };
}

export function validateArenaModel(model, roster) {
  const fail = (message) => { throw new Error(message); };
  if (model.modelKind !== "relative-heuristic-v1" || !model.description?.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(model.checkedAt) || !Number.isFinite(Date.parse(model.checkedAt))
    || new Date(model.checkedAt).toISOString().slice(0, 10) !== model.checkedAt) fail("Invalid calculation model metadata");
  const names = new Map(roster.map((nikke) => [nikke.name, nikke]));
  const sourceIds = new Set();
  for (const source of model.sources) {
    const url = new URL(source.url);
    if (!source.id || !source.title || sourceIds.has(source.id) || url.protocol !== "https:"
      || url.username || url.password) fail("Invalid calculation source");
    sourceIds.add(source.id);
  }
  const evidence = (ids) => Array.isArray(ids) && ids.length && new Set(ids).size === ids.length
    && ids.every((id) => sourceIds.has(id));
  const score = (value) => Number.isFinite(value) && value >= 0 && value <= 5;
  for (const weapon of ["AR", "MG", "RL", "SG", "SMG", "SR"]) {
    if (!score(model.weaponGeneration[weapon])) fail("Invalid weapon generation baseline");
  }
  const rules = new Set();
  for (const rule of model.rules) {
    if (!rule.id || rules.has(rule.id) || !rule.note?.trim() || !evidence(rule.sourceIds)) fail("Invalid calculation rule");
    rules.add(rule.id);
  }
  if (!rules.size) fail("Missing calculation rules");
  const seen = new Set();
  for (const profile of model.profiles) {
    if (!names.has(profile.name) || seen.has(profile.name)) fail("Unknown or duplicate calculation profile");
    seen.add(profile.name);
    if (![1, 2, 3].includes(profile.burstStage) || String(profile.burstStage) !== names.get(profile.name).burst
      || !["standard", "sole-b1"].includes(profile.burstRule)
      || (profile.burstRule === "sole-b1" && profile.burstStage !== 1)) fail("Invalid calculation burst rule");
    if (SCORE_KEYS.some((key) => !score(profile[key]))) fail("Invalid calculation profile score");
    if (profile.favorite && Object.entries(profile.favorite).some(([key, value]) => !SCORE_KEYS.includes(key) || !score(value))) fail("Invalid favorite calculation score");
    if (profile.requiresFavorite !== undefined && typeof profile.requiresFavorite !== "boolean") fail("Invalid favorite requirement");
    if (profile.survivalRequiresClass && !["attacker", "defender", "supporter"].includes(profile.survivalRequiresClass)) fail("Invalid survival condition");
    if (!profile.notes?.length || profile.notes.some((note) => typeof note !== "string" || !note.trim()) || !evidence(profile.sourceIds)) fail("Missing calculation profile evidence");
  }
  for (const entry of model.excluded) {
    if (!names.has(entry.name) || seen.has(entry.name) || !entry.reason?.trim() || !evidence(entry.sourceIds)) fail("Invalid calculation exclusion");
    seen.add(entry.name);
  }
  return true;
}
