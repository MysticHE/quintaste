/**
 * Nutrition standards used to read a recipe's per-serving figures. Figures come from the recipe (`Recipe.nutrition`);
 * everything here is a published international reference, dated so a later revision is a data edit (owner, 28 Oct 2026:
 * international standards rather than HPB; docs/RECIPE_SOURCING_PLAN.md §5c). Sources: Codex CXG 23-1997 (nutrition claims)
 * and CXG 2-1985 (nutrient reference values), EU Regulation 1924/2006 Annex (nutrition claims), EU Regulation 432/2012
 * (authorised health claims), WHO guidelines on sodium (under 2,000 mg a day) and free sugars (under 10% of energy).
 * None of this is dietary advice.
 */
import type { RecipeCategory } from "../types/food";

export const nutritionStandardsVersion = "Codex · EU 1924/2006, 432/2012 · WHO · reviewed 2026-10-30";

/** Daily references for "% of a day": a 2,000 kcal day (Codex/EU reference intake), WHO sodium and free-sugar limits, and the
 * Codex NRV for dietary fibre. */
export const dailyReference = { kcal: 2000, sodium: 2000, sugar: 50, fibre: 25 } as const;
export type DailyNutrient = keyof typeof dailyReference;

/** Recipe categories that are a meal (the calorie line applies to them only). */
export const mealCategories: readonly RecipeCategory[] = ["Breakfast", "Noodles", "Rice meals", "With rice", "Soups"];

/** Claim conditions. Per-serving and per-100 kcal forms only: recipes carry no serving weight, so per-100 g conditions are
 * not applied. */
export const claimCriteria = {
  /** A plain calorie fact for a meal, not a claim. */
  mealUnder500Kcal: 500,
  /** EU 1924/2006 "Source of protein": at least 12% of the energy from protein, and Codex CXG 23-1997's per-serving
   * condition (10% of the 50 g protein NRV), so a light broth with a little protein does not earn it. */
  proteinSourceEnergyShare: 0.12, proteinSourceGrams: 5,
  /** EU 1924/2006 "High protein": at least 20% of the energy from protein; Codex "high" is twice the source amount. */
  proteinHighEnergyShare: 0.2, proteinHighGrams: 10,
  /** EU 1924/2006 and Codex "Source of fibre": at least 1.5 g per 100 kcal. */
  fibreSourcePer100Kcal: 1.5,
  /** EU 1924/2006 "High fibre": at least 3 g per 100 kcal. */
  fibreHighPer100Kcal: 3,
  /** Sodium at or under 15% of WHO's 2,000 mg daily limit per serving. */
  sodiumUnder15PercentMg: 300,
} as const;

export const nutritionBadges = ["Under 500 kcal", "High in protein", "Source of protein", "High in fibre", "Source of fibre", "Under 300 mg sodium"] as const;
export type NutritionBadge = (typeof nutritionBadges)[number];

/**
 * Authorised health claims (EU Regulation 432/2012), verbatim, shown only when the badge that meets the claim's condition is
 * earned. The wording is shown verbatim in every interface language; only the source line is translated. The EU authorises no
 * general dietary-fibre claim (only claims for named fibres), so the fibre badges carry none.
 */
export const healthClaims: { badges: readonly NutritionBadge[]; nutrient: "Protein"; text: string }[] = [
  { badges: ["High in protein", "Source of protein"], nutrient: "Protein", text: "Protein contributes to a growth in muscle mass." },
];

/** Energy per gram used to turn protein grams into an energy share (Atwater factor). */
export const proteinKcalPerGram = 4;
