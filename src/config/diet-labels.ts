import { alliums, animalExclusions, type Exclusion } from "./preferences";

/**
 * Diet labels everywhere in the app (owner rule, 20 Oct 2026). Two independent checks:
 * Vegan = no dairy, egg or honey; Vegetarian = none of the five pungent (garlic, onion, shallots, spring onion, leeks,
 * chives, asafoetida). Something passing both shows both labels; passing neither (but meat-free, as everything in the
 * app is) shows Plant-Based. A check that cannot be proven shows nothing, never a guess. Twin: server/diet-labels.mjs.
 */
export const dietLabels = ["Vegan", "Vegetarian", "Plant-Based"] as const;
export type DietLabel = (typeof dietLabels)[number];
/** true = contains it, false = proven free of it, null = not known. */
export type DietFacts = { animal: boolean | null; pungent: boolean | null };

export function labelsFor({ animal, pungent }: DietFacts): DietLabel[] {
  const out: DietLabel[] = [];
  if (animal === false) out.push("Vegan");
  if (pungent === false) out.push("Vegetarian");
  if (animal === true && pungent === true) out.push("Plant-Based");
  return out;
}
/** Facts from what an item contains; `known` says the list is complete, `uncertain` names what a prepared ingredient may hide. */
export function factsFrom(contains: readonly Exclusion[], known: boolean, uncertain: readonly Exclusion[] = []): DietFacts {
  const has = (list: readonly Exclusion[]) => list.some(value => contains.includes(value));
  const maybe = (list: readonly Exclusion[]) => list.some(value => uncertain.includes(value));
  return {
    animal: has(animalExclusions) ? true : known && !maybe(animalExclusions) ? false : null,
    pungent: has(alliums) ? true : known && !maybe(alliums) ? false : null,
  };
}
export const labelsFrom = (contains: readonly Exclusion[], known: boolean, uncertain: readonly Exclusion[] = []) => labelsFor(factsFrom(contains, known, uncertain));
/**
 * Whether labels suit someone who keeps `wanted`: every Vegan or Vegetarian they keep must be proven. Plant-Based asks
 * only for meat-free, which everything in the app is.
 */
export const suits = (wanted: readonly DietLabel[], labels: readonly DietLabel[]) =>
  wanted.every(label => label === "Plant-Based" || labels.includes(label));
/** A choice of labels to keep: Plant-Based alone, or Vegan and/or Vegetarian. Toggling keeps that rule. */
export function toggleLabel(current: readonly DietLabel[], label: DietLabel): DietLabel[] {
  if (label === "Plant-Based") return ["Plant-Based"];
  const strict = current.filter(value => value !== "Plant-Based");
  const next: DietLabel[] = strict.includes(label) ? strict.filter(value => value !== label) : [...strict, label];
  return next.length ? dietLabels.filter(value => next.includes(value)) : ["Plant-Based"];
}
/** Reads a stored label list, keeping order and dropping anything unknown. */
export const readLabels = (value: unknown): DietLabel[] =>
  Array.isArray(value) ? dietLabels.filter(label => value.includes(label)) : [];
