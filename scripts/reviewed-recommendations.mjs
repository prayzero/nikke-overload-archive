import { readFile } from "node:fs/promises";

const reviewFiles = ["shard-a.json", "shard-b.json", "shard-c.json", "follow-up.json"];
const statuses = new Set(["reviewed", "no-target", "unavailable"]);

// Reviews are curated source data, never refreshed just by running a build.
export function validateReviews(records, rosterNames) {
  const reviews = new Map();
  for (const record of records) {
    if (!rosterNames.has(record.name) || reviews.has(record.name)) {
      throw new Error(`${record.name}: unknown or duplicate character review.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)
      || new Date(record.checkedAt).toISOString().slice(0, 10) !== record.checkedAt) {
      throw new Error(`${record.name}: invalid review date.`);
    }
    if (!record.sources?.length || !record.overload && !record.cube) {
      throw new Error(`${record.name}: review requires evidence and a recommendation section.`);
    }
    const urls = new Set();
    for (const source of record.sources) {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password
        || !["www.prydwen.gg", "nikke.gg", "gamewith.jp", "nikkehub.com"].includes(url.hostname)
        || !source.label?.trim() || urls.has(source.url)) {
        throw new Error(`${record.name}: invalid or duplicate review source.`);
      }
      urls.add(source.url);
    }
    for (const [kind, recommendation] of [["overload", record.overload], ["cube", record.cube]]) {
      if (!recommendation) continue;
      if (!statuses.has(recommendation.reviewStatus)
        || !recommendation.note?.trim() || !recommendation.mode?.trim() || recommendation.mode.length > 40
        || !["guide", "mechanic"].includes(recommendation.confidence)) {
        throw new Error(`${record.name}: missing ${kind} review status or explanation.`);
      }
      if (kind === "overload") {
        if (!Array.isArray(recommendation.primary)
          || !Array.isArray(recommendation.alternatives) || !Array.isArray(recommendation.avoid)
          || !["meta", "high", "medium", "low", "skip"].includes(recommendation.priority)
          || (recommendation.reviewStatus === "reviewed") !== (recommendation.primary.length > 0)) {
          throw new Error(`${record.name}: overload targets must agree with the review status.`);
        }
      } else if (recommendation.reviewStatus === "no-target"
        || !Array.isArray(recommendation.alternatives)
        || !Array.isArray(recommendation.pvp ?? [])
        || (recommendation.reviewStatus === "unavailable") !== (recommendation.primary === null)
        || recommendation.primary === null && recommendation.alternatives.length > 0) {
        throw new Error(`${record.name}: cube choices must agree with the review status.`);
      }
    }
    reviews.set(record.name, record);
  }
  return reviews;
}

export async function loadReviews(roster) {
  const groups = await Promise.all(reviewFiles.map(async (file) =>
    JSON.parse(await readFile(new URL(`./reviews/${file}`, import.meta.url), "utf8"))));
  return validateReviews(groups.flat(), new Set(roster.map(({ name }) => name)));
}

export function applyReview(previous, review, kind) {
  if (!review?.[kind]) return previous;
  return {
    name: previous.name,
    ...review[kind],
    sources: review.sources,
    verifiedAt: review.checkedAt,
  };
}
