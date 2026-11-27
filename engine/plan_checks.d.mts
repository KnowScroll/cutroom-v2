// Types for what test/ imports from engine/plan_checks.mjs (engine/ is plain JavaScript and tsconfig has no allowJs).

export interface PlanAsset {
  id: string;
  kind?: string;
  description?: string;
  params?: unknown[];
  states?: unknown[];
}
// the plan as M3 wrote it: its stated subject, its assets (the hero first) and the cast each asset shows
export interface DraftPlan {
  subject?: { name?: string; asset?: string };
  assets: PlanAsset[];
  cast?: Record<string, { asset?: string | null }>;
}
// problems with the subject binding, each a message for the planner; d3: a 3D reel, whose subject need not be the first asset
export function subjectErrors(p: DraftPlan, brief: string, opts?: { d3?: boolean }): string[];
// problems with the places the shot ideas name ("MARKER at Name [lon, lat]", LINE ends, RING centres, LABELs), from Wikipedia
export function placeErrors(p: { shots: { idea: string }[] }): Promise<string[]>;
