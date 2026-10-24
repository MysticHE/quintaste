import { claimCriteria, dailyReference, mealCategories, nutrientFunctionClaims, proteinKcalPerGram, type DailyNutrient, type NutritionBadge } from "../config/nutrition-standards";
import type { Recipe } from "../types/food";
import type { NutritionChoice } from "../types/recipe-workspace";
import { translate, type Language } from "../i18n";
import type { CookKey } from "../i18n/en/cook";

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
export function nutrientBenefitFor(badges: readonly NutritionBadge[], language: Language = "en") {
  const claim = nutrientFunctionClaims.find(item => badges.includes(item.badge));
  // HPB approves the claim wording itself, so it is always shown verbatim in English; only the source line is translated.
  return claim && { text: claim.text,
    source: translate(language, "cook", "claimSource", { n: claim.claim }) };
}

const badgeKeys: Record<NutritionBadge, CookKey> = {
  "Light meal": "badgeLightMeal", "Under 500 kcal": "badgeUnder500", "High in protein": "badgeHighProtein", "Source of protein": "badgeSourceProtein",
  "High in fibre": "badgeHighFibre", "Source of fibre": "badgeSourceFibre", "Low in sugar": "badgeLowSugar", "Under 300 mg sodium": "badgeUnder300Sodium",
};
/** A badge as shown; the badge value itself stays HPB's English wording. */
export const badgeName = (badge: NutritionBadge, language: Language) => translate(language, "cook", badgeKeys[badge]);
const choiceKeys: Record<NutritionChoice, CookKey> = {
  "Under 500 kcal": "badgeUnder500", "Higher protein": "choiceHigherProtein", "Higher fibre": "choiceHigherFibre", "Under 300 mg sodium": "badgeUnder300Sodium",
};
export const nutritionChoiceName = (choice: NutritionChoice, language: Language) => translate(language, "cook", choiceKeys[choice]);

const choiceBadges: Record<NutritionChoice, NutritionBadge[]> = {
  "Under 500 kcal": ["Under 500 kcal", "Light meal"],
  "Higher protein": ["High in protein", "Source of protein"],
  "Higher fibre": ["High in fibre", "Source of fibre"],
  "Under 300 mg sodium": ["Under 300 mg sodium"],
};

/** Badges for a recipe, or an empty list when it has no figures. */
export function recipeBadges(recipe: Pick<Recipe, "nutrition" | "categories">) {
  return recipe.nutrition ? nutritionBadgesFor(recipe.nutrition.perServing, recipe.categories) : [];
}

/** Every chosen nutrition filter must be met; a recipe without figures matches only when nothing is chosen. */
export function matchesNutritionChoices(recipe: Pick<Recipe, "nutrition" | "categories">, choices: readonly NutritionChoice[] | undefined) {
  if (!choices?.length) return true;
  if (!recipe.nutrition) return false;
  const badges = recipeBadges(recipe);
  return choices.every(choice => choiceBadges[choice].some(badge => badges.includes(badge)));
}

/** Whole-number percent of the daily reference, or undefined for nutrients without one. */
export function percentOfDay(key: string, value: number): number | undefined {
  const reference = (dailyReference as Record<string, number>)[key as DailyNutrient];
  return reference ? Math.round((value / reference) * 100) : undefined;
}
