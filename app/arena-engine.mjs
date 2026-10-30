/**
 * Choose a compatible set of reviewed teams. Scores only break ties between
 * equally complete sets; they are editorial preferences, never win rates.
 * Member order is preserved because it controls targeting and auto burst.
 */
export function buildArenaPlan({ roster, ownedIds, favoriteIds = [], presets, pendingReviews = [] }) {
  const byName = new Map(roster.map((nikke) => [nikke.name, nikke]));
  const validIds = new Set(roster.map((nikke) => nikke.id));
  const owned = new Set([...ownedIds].filter((id) => validIds.has(id)));
  const favorites = new Set(favoriteIds);
  const pendingNames = new Set(pendingReviews.map(({ name }) => name));
  const candidates = presets.map((preset) => {
    if (preset.members.some((name) => pendingNames.has(name))) {
      throw new Error(`Unverified arena character in recommended team: ${preset.id}`);
    }
    const members = preset.members.map((name) => {
      const nikke = byName.get(name);
      if (!nikke) throw new Error(`Unknown arena member: ${name}`);
      return nikke;
    });
    if (members.length !== 5 || new Set(members.map(({ id }) => id)).size !== 5) {
      throw new Error(`Arena team must contain five distinct characters: ${preset.id}`);
    }
    const missing = members.filter(({ id }) => !owned.has(id));
    const favoriteMissing = members.filter(({ id, name }) =>
      owned.has(id) && (preset.requiresFavorite ?? []).includes(name) && !favorites.has(id));
    return { ...preset, members, missing, favoriteMissing, conflicts: [],
      available: missing.length === 0 && favoriteMissing.length === 0 };
  });
  const compare = (a, b) => b.priority - a.priority || a.id.localeCompare(b.id, "en");
  const available = candidates.filter(({ available }) => available).sort(compare);
  let best = [];
  let bestScore = -Infinity;
  // At most three teams are needed. Exhaustive bounded search avoids the
  // greedy trap where the highest-priority team blocks two compatible teams.
  function search(start, chosen, used, score) {
    if (chosen.length > best.length || (chosen.length === best.length && score > bestScore)) {
      best = [...chosen];
      bestScore = score;
    }
    if (chosen.length === 3 || chosen.length + available.length - start < best.length) return;
    for (let index = start; index < available.length; index++) {
      const team = available[index];
      if (team.members.some(({ id }) => used.has(id))) continue;
      const nextUsed = new Set(used);
      team.members.forEach(({ id }) => nextUsed.add(id));
      search(index + 1, [...chosen, team], nextUsed, score + team.priority);
    }
  }
  search(0, [], new Set(), 0);
  const selected = new Set(best.map(({ id }) => id));
  const usedNames = new Set(best.flatMap(({ members }) => members.map(({ name }) => name)));
  const withConflicts = (candidate) => ({ ...candidate,
    conflicts: candidate.members.filter(({ name }) => usedNames.has(name)).map(({ name }) => name) });
  return {
    teams: best,
    alternatives: available.filter(({ id }) => !selected.has(id)).map(withConflicts),
    nearMatches: candidates.filter(({ available }) => !available)
      .sort((a, b) => (a.missing.length + a.favoriteMissing.length) -
        (b.missing.length + b.favoriteMissing.length) || compare(a, b)).map(withConflicts),
    ownedCount: owned.size,
    availableCount: available.length,
    pendingOwned: pendingReviews.flatMap((review) => {
      const nikke = byName.get(review.name);
      if (!nikke) throw new Error(`Unknown arena review character: ${review.name}`);
      return owned.has(nikke.id) ? [{ ...review, nikke }] : [];
    }),
  };
}

/** Fail CI on broken references instead of shipping an unusable recommendation. */
export function validateArenaCatalog(catalog, roster) {
  const fail = (message) => { throw new Error(message); };
  const validDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate(catalog.checkedAt)) fail("Missing arena verification date");
  const names = new Set(roster.map(({ name }) => name));
  const sourceIds = new Set();
  for (const source of catalog.sources) {
    if (!source.id || !source.title || sourceIds.has(source.id)) fail("Invalid arena source");
    const url = new URL(source.url);
    if (url.protocol !== "https:" || url.username || url.password) fail("Arena sources must use HTTPS without credentials");
    sourceIds.add(source.id);
  }
  const pendingNames = new Set();
  for (const review of catalog.pendingReviews ?? []) {
    if (!names.has(review.name) || pendingNames.has(review.name)) fail("Invalid arena review character");
    pendingNames.add(review.name);
    if (review.status !== "pending-team" || !validDate(review.checkedAt)
      || typeof review.reason !== "string" || !review.reason.trim()
      || !Array.isArray(review.notes) || !review.notes.length
      || review.notes.some((note) => typeof note !== "string" || !note.trim())) fail(`Incomplete arena review: ${review.name}`);
    if (!Array.isArray(review.sourceIds) || !review.sourceIds.length
      || new Set(review.sourceIds).size !== review.sourceIds.length
      || review.sourceIds.some((id) => !sourceIds.has(id))) fail(`Missing arena review evidence: ${review.name}`);
  }
  const ids = new Set();
  for (const preset of catalog.presets) {
    if (!preset.id || ids.has(preset.id)) fail("Duplicate or missing arena preset ID");
    ids.add(preset.id);
    if (!preset.title || !preset.style || !preset.weakness || !preset.notes?.length) fail(`Incomplete arena explanation: ${preset.id}`);
    if (!Number.isFinite(preset.priority) || preset.priority < 1 || preset.priority > 100) fail(`Invalid arena preference: ${preset.id}`);
    if (preset.members.length !== 5 || new Set(preset.members).size !== 5 ||
      preset.members.some((name) => !names.has(name))) fail(`Invalid arena members: ${preset.id}`);
    if (preset.members.some((name) => pendingNames.has(name))) fail(`Unverified arena character in recommended team: ${preset.id}`);
    if (preset.burst.length < 3 || preset.burst.some((name) => !preset.members.includes(name))) fail(`Invalid arena burst path: ${preset.id}`);
    if ((preset.requiresFavorite ?? []).some((name) => !preset.members.includes(name))) fail(`Invalid favorite item condition: ${preset.id}`);
    if (!preset.sourceIds.length || preset.sourceIds.some((id) => !sourceIds.has(id))) fail(`Missing arena evidence: ${preset.id}`);
  }
  return true;
}
