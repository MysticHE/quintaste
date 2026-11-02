import { claimCriteria, dailyReference, healthClaims, mealCategories, minerals, nutrientReference, proteinKcalPerGram, vitamins, type DailyNutrient, type NutritionBadge } from "../config/nutrition-standards";
import type { MicroNutrient, Recipe } from "../types/food";
import type { NutritionChoice } from "../types/recipe-workspace";
import { translate, type Language } from "../i18n";
import type { CookKey } from "../i18n/en/cook";

type Figures = NonNullable<Recipe["nutrition"]>["perServing"];

/** Badges a serving earns under the international claim conditions (config/nutrition-standards.ts); never a score. */
export function nutritionBadgesFor(figures: Figures, categories: readonly Recipe["categories"][number][]): NutritionBadge[] {
  const meal = categories.some(category => mealCategories.includes(category));
  const badges: NutritionBadge[] = [];
  if (meal && figures.kcal <= claimCriteria.mealUnder500Kcal) badges.push("Under 500 kcal");
  const protein = figures.protein;
  if (typeof protein === "number" && figures.kcal > 0) {
    const share = (protein * proteinKcalPerGram) / figures.kcal;
    if (share >= claimCriteria.proteinHighEnergyShare && protein >= claimCriteria.proteinHighGrams) badges.push("High in protein");
    else if (share >= claimCriteria.proteinSourceEnergyShare && protein >= claimCriteria.proteinSourceGrams) badges.push("Source of protein");
  }
  const fibre = figures.fibre;
  if (typeof fibre === "number" && figures.kcal > 0) {
    const per100Kcal = (fibre / figures.kcal) * 100;
    if (per100Kcal >= claimCriteria.fibreHighPer100Kcal) badges.push("High in fibre");
    else if (per100Kcal >= claimCriteria.fibreSourcePer100Kcal) badges.push("Source of fibre");
  }
  if (typeof figures.sodium === "number" && figures.sodium <= claimCriteria.sodiumUnder15PercentMg) badges.push("Under 300 mg sodium");
  return badges;
}

/** The one authorised health claim that applies, in the regulation's own words; undefined when no badge supports one. */
export function nutrientBenefitFor(badges: readonly NutritionBadge[]) {
  const claim = healthClaims.find(item => item.badges.some(badge => badges.includes(badge)));
  // The claim wording is authorised as written, so it is always shown verbatim in English. Members see no regulation reference (owner, 31 Oct 2026).
  return claim && { text: claim.text };
}

const badgeKeys: Record<NutritionBadge, CookKey> = {
  "Under 500 kcal": "badgeUnder500", "High in protein": "badgeHighProtein", "Source of protein": "badgeSourceProtein",
  "High in fibre": "badgeHighFibre", "Source of fibre": "badgeSourceFibre", "Under 300 mg sodium": "badgeUnder300Sodium",
};
/** A badge as shown; the badge value itself stays the claim's English name. */
export const badgeName = (badge: NutritionBadge, language: Language) => translate(language, "cook", badgeKeys[badge]);
const choiceKeys: Record<NutritionChoice, CookKey> = {
  "Under 500 kcal": "badgeUnder500", "Higher protein": "choiceHigherProtein", "Higher fibre": "choiceHigherFibre", "Under 300 mg sodium": "badgeUnder300Sodium",
};
export const nutritionChoiceName = (choice: NutritionChoice, language: Language) => translate(language, "cook", choiceKeys[choice]);

const choiceBadges: Record<NutritionChoice, NutritionBadge[]> = {
  "Under 500 kcal": ["Under 500 kcal"],
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

/** Percent of the Codex NRV for a vitamin or mineral, whole number. */
export const percentOfReference = (key: MicroNutrient, value: number) => Math.round((value / nutrientReference[key]) * 100);

export type MicroBadge = { nutrient: MicroNutrient; level: "source" | "high" };
/** At most one vitamin and one mineral badge, the strongest of each, under Codex CXG 23-1997 (source: 5% of the NRV per
 * 100 kcal; high: twice that). The same rule as the QT bots' nutrient level, so a house recipe shows what qualified it. */
export function microBadgesFor(nutrition: Pick<NonNullable<Recipe["nutrition"]>, "perServing" | "micro">): MicroBadge[] {
  const kcal = nutrition.perServing.kcal, micro = nutrition.micro ?? {};
  if (!(kcal > 0)) return [];
  const share = (key: MicroNutrient) => (micro[key] ?? 0) / (kcal / 100) / nutrientReference[key];
  const strongest = (group: readonly MicroNutrient[]) => group.filter(key => share(key) >= claimCriteria.microSourcePer100KcalShare)
    .sort((a, b) => share(b) - share(a))[0];
  return [strongest(vitamins), strongest(minerals)].filter((key): key is MicroNutrient => !!key).map(nutrient => ({
    nutrient, level: share(nutrient) >= claimCriteria.microSourcePer100KcalShare * claimCriteria.microHighFactor ? "high" : "source",
  }));
}

const microKeys: Record<MicroNutrient, CookKey> = {
  vitA: "nutrientVitA", vitC: "nutrientVitC", vitD: "nutrientVitD", vitE: "nutrientVitE", b12: "nutrientB12", folate: "nutrientFolate",
  calcium: "nutrientCalcium", iron: "nutrientIron", zinc: "nutrientZinc", magnesium: "nutrientMagnesium", potassium: "nutrientPotassium",
};
export const microName = (key: MicroNutrient, language: Language) => translate(language, "cook", microKeys[key]);
/** "Source of iron" / "High in vitamin C" (English lower-cases the name mid-phrase), "铁来源" / "富含维生素C". */
export function microBadgeName(badge: MicroBadge, language: Language) {
  const name = microName(badge.nutrient, language);
  const nutrient = language === "en" ? name.charAt(0).toLowerCase() + name.slice(1) : name;
  return translate(language, "cook", badge.level === "high" ? "badgeHighIn" : "badgeSourceOf", { nutrient });
}
