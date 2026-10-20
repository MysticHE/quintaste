import { alliums, animalExclusions, type Exclusion } from "../config/preferences";
import type { DietLabel } from "../config/diet-labels";
import type { Dietary, Fit } from "../types/food";

export type DietaryResult = {
  fit: Fit; conflicts: Exclusion[]; unknown: Exclusion[]; confirmed: boolean;
  evidence: "Current sample" | "Stale" | "Withdrawn" | "Unconfirmed";
};
/**
 * Fit of a sample place or dish with the reader's labels (Vegan avoids dairy, egg and honey; Vegetarian the five pungent)
 * and exclusions. uncertain lists exclusions a compound ingredient (stock, paste, sauce) could hide; they stay Unknown.
 */
export function dietaryResult(item: Dietary, wanted: readonly DietLabel[], excluded: readonly Exclusion[], now = Date.now(), uncertain: readonly Exclusion[] = []): DietaryResult {
  const avoided = [...excluded, ...(wanted.includes("Vegan") ? animalExclusions : []), ...(wanted.includes("Vegetarian") ? alliums : [])];
  const conflicts = [...new Set(avoided)].filter(value => item.contains.includes(value));
  // Check dates are Singapore calendar days, so "today" is never read as future-dated before UTC midnight.
  const time = item.evidence.checkedAt ? Date.parse(item.evidence.checkedAt + "T00:00:00+08:00") : NaN;
  const recent = Number.isFinite(time) && now - time <= 90 * 86400000 && now >= time;
  const withdrawn = item.evidence.withdrawn === true;
  const trusted = item.evidence.kind === "menu" || item.evidence.kind === "editorial";
  const confirmed = !withdrawn && recent && trusted && item.ingredientsKnown && item.diet !== "Unknown";
  const unknown = excluded.filter(value => !conflicts.includes(value) && (!confirmed || uncertain.includes(value)));
  const dietConflict = wanted.includes("Vegan") && item.diet === "Vegetarian";
  const fit: Fit = conflicts.length || dietConflict ? "Conflicts"
    : withdrawn || !confirmed || unknown.length ? "Unknown" : item.diet;
  return { fit, conflicts, unknown, confirmed,
    evidence: withdrawn ? "Withdrawn" : !recent && Number.isFinite(time) ? "Stale" : confirmed ? "Current sample" : "Unconfirmed" };
}
