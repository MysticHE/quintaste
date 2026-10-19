import { claimCriteria, dailyReference, mealCategories, nutrientFunctionClaims, proteinKcalPerGram, type DailyNutrient, type NutritionBadge } from "../config/nutrition-standards";
import type { Recipe } from "../types/food";

type Figures = NonNullable<Recipe["nutrition"]>["perServing"];

/** Badges a serving earns under HPB's nutrient claim criteria; deterministic, never a score. */
export function nutritionBadgesFor(figures: Figures, categories: readonly Recipe["categories"][number][]): NutritionBadge[] {
  const meal = categories.some(category => mealCategories.includes(category));
  const badges: NutritionBadge[] = [];
  if (meal && figures.kcal <= claimCriteria.lightMealKcal) badges.push("Light meal");
  else if (meal && figures.kcal <= claimCriteria.mealUnder500Kcal) badges.push("Under 500 kcal");
  const protein = figures.protein;
  if (typeof protein === "number" && figures.kcal > 0) {
    const share = (protein * proteinKcalPerGram) / figures.kcal;
    if (protein >= claimCriteria.proteinHigh.gramsPerServing && share >= claimCriteria.proteinHigh.energyShare) badges.push("High in protein");
    else if (protein >= claimCriteria.proteinSource.gramsPerServing && share >= claimCriteria.proteinSource.energyShare) badges.push("Source of protein");
  }
  const fibre = figures.fibre;
  if (typeof fibre === "number" && figures.kcal > 0) {
    const per100Kcal = (fibre / figures.kcal) * 100;
    if (fibre >= claimCriteria.fibreHigh.gramsPerServing || per100Kcal >= claimCriteria.fibreHigh.per100Kcal) badges.push("High in fibre");
    else if (per100Kcal >= claimCriteria.fibreSourcePer100Kcal) badges.push("Source of fibre");
  }
  if (meal && typeof figures.sugar === "number" && figures.sugar <= claimCriteria.lowSugarMealGrams) badges.push("Low in sugar");
  if (typeof figures.sodium === "number" && figures.sodium <= claimCriteria.sodiumUnder15PercentMg) badges.push("Under 300 mg sodium");
  return badges;
}

/** The one approved nutrient function claim that applies, in HPB's own words; undefined when no badge supports one. */
export function nutrientBenefitFor(badges: readonly NutritionBadge[]) {
  return nutrientFunctionClaims.find(claim => badges.includes(claim.badge));
}

/** Whole-number percent of the daily reference, or undefined for nutrients without one. */
export function percentOfDay(key: string, value: number): number | undefined {
  const reference = (dailyReference as Record<string, number>)[key as DailyNutrient];
  return reference ? Math.round((value / reference) * 100) : undefined;
}
