export type ArenaNikke = {
  id: string;
  name: string;
  nameKo: string;
  image: string;
  burst: string;
  weapon: string;
  class: string;
};
export type ArenaPreset = {
  id: string;
  title: string;
  style: string;
  priority: number;
  members: string[];
  burst: string[];
  requiresFavorite?: string[];
  notes: string[];
  weakness: string;
  sourceIds: string[];
  evidence?: string;
};
export type ArenaCandidate = Omit<ArenaPreset, "members"> & {
  members: ArenaNikke[];
  missing: ArenaNikke[];
  favoriteMissing: ArenaNikke[];
  conflicts: string[];
  available: boolean;
};
export type ArenaPendingReview = {
  name: string;
  status: "pending-team";
  checkedAt: string;
  reason: string;
  notes: string[];
  sourceIds: string[];
};
export type ArenaCatalog = {
  checkedAt: string;
  sources: { id: string; title: string; url: string }[];
  presets: ArenaPreset[];
  pendingReviews?: ArenaPendingReview[];
};
export function buildArenaPlan(input: {
  roster: ArenaNikke[];
  ownedIds: Iterable<string>;
  favoriteIds?: Iterable<string>;
  presets: ArenaPreset[];
  pendingReviews?: ArenaPendingReview[];
}): {
  teams: ArenaCandidate[];
  alternatives: ArenaCandidate[];
  nearMatches: ArenaCandidate[];
  ownedCount: number;
  availableCount: number;
  pendingOwned: Array<ArenaPendingReview & { nikke: ArenaNikke }>;
};
export function validateArenaCatalog(catalog: ArenaCatalog, roster: ArenaNikke[]): true;
