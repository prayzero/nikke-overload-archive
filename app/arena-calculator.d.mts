import type { ArenaCandidate, ArenaNikke } from "./arena-engine.mjs";

export type CalculationGoal = "balanced" | "burst" | "survival";
export type ArenaModelScores = {
  generation: number;
  passiveOffense: number;
  burstOffense: number;
  passiveSurvival: number;
  burstSurvival: number;
  tank: number;
};
export type ArenaModelProfile = ArenaModelScores & {
  name: string;
  burstStage: 1 | 2 | 3;
  burstRule: "standard" | "sole-b1";
  requiresFavorite?: boolean;
  favorite?: Partial<ArenaModelScores>;
  survivalRequiresClass?: string;
  notes: string[];
  sourceIds: string[];
};
export type ArenaCalculationModel = {
  checkedAt: string;
  modelKind: string;
  description: string;
  sources: { id: string; title: string; url: string }[];
  rules: { id: string; note: string; sourceIds: string[] }[];
  weaponGeneration: Record<string, number>;
  profiles: ArenaModelProfile[];
  excluded: { name: string; reason: string; sourceIds: string[] }[];
};
export type CalculatedTeam = ArenaCandidate & {
  score: number;
  breakdown: { generation: number; offense: number; survival: number };
  contributions: { id: string; label: string; generation: number; offense: number; survival: number; basis: string }[];
  unprofiledNames: string[];
};
export type CalculatedArenaPlan = {
  teams: CalculatedTeam[];
  ownedCount: number;
  eligibleCount: number;
  excluded: { nikke: ArenaNikke; reason: string }[];
  unknownCount: number;
  examinedCount: number;
  searchLabel: string;
};
type CalculationInput = {
  roster: ArenaNikke[];
  ownedIds: Iterable<string>;
  favoriteIds?: Iterable<string>;
  model: ArenaCalculationModel;
  teamCount?: 1 | 3;
  goal?: CalculationGoal;
};
export const CALCULATION_WEIGHTS: Record<CalculationGoal, { generation: number; offense: number; survival: number }>;
export const CALCULATION_SCALE: { generation: number; offense: number; survival: number };
export function buildCalculatedArenaPlan(input: CalculationInput): CalculatedArenaPlan;
export function evaluateCalculatedTeam(input: {
  members: ArenaNikke[];
  favoriteIds?: Iterable<string>;
  model: ArenaCalculationModel;
  goal?: CalculationGoal;
}): CalculatedTeam | null;
export function validateArenaModel(model: ArenaCalculationModel, roster: ArenaNikke[]): true;
