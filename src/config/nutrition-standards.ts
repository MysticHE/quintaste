/**
 * Nutrition standards used to read a recipe's per-serving figures. Figures come from the recipe (`Recipe.nutrition`);
 * everything here is a published Singapore reference, dated so a later HPB revision is a data edit.
 * Source: HPB, "A Guide to Nutrition Labelling for Food Products (Singapore)", August 2024 (nutrient claim criteria,
 * Appendix I; nutrient function claims, Appendix II) and HPB daily guidance (2,000 mg sodium; sugar at 10% of a
 * 2,000 kcal day; dietary fibre 20 g women / 26 g men). None of this is dietary advice or a reviewed health claim.
 */
import type { RecipeCategory } from "../types/food";

export const nutritionStandardsVersion = "HPB guide Aug 2024 · reviewed 2026-10-19";

/** Daily references for "% of a day": a 2,000 kcal adult day as HPB uses for sugar; fibre uses the higher adult figure. */
export const dailyReference = { kcal: 2000, sodium: 2000, sugar: 50, fibre: 26 } as const;
export type DailyNutrient = keyof typeof dailyReference;

/** Recipe categories that are a meal in HPB's sense (meal-type product criteria apply). */
export const mealCategories: readonly RecipeCategory[] = ["Breakfast", "Noodles", "Rice meals", "With rice", "Soups"];

/** Nutrient claim criteria (HPB guide, Appendix I). Per-serving and per-100 kcal conditions only: recipes carry no
 * serving weight, so per-100 g conditions (low sodium, low fat) are not applied. */
export const claimCriteria = {
  /** Healthier Dining Programme meal cap. */
  mealUnder500Kcal: 500,
  /** "Light meal": ≤ 300 kcal per serving (meal-type product). */
  lightMealKcal: 300,
  /** "Source of protein": ≥ 12% of energy from protein and ≥ 10 g per day's recommended quantity (taken per serving). */
  proteinSource: { energyShare: 0.12, gramsPerServing: 10 },
  /** "High in protein": ≥ 20% of energy from protein and ≥ 10 g. */
  proteinHigh: { energyShare: 0.2, gramsPerServing: 10 },
  /** "Source of dietary fibre": ≥ 1.5 g per 100 kcal. */
  fibreSourcePer100Kcal: 1.5,
  /** "High in dietary fibre": ≥ 4 g per serving or ≥ 3 g per 100 kcal. */
  fibreHigh: { gramsPerServing: 4, per100Kcal: 3 },
  /** "Low in sugar", meal-type product: ≤ 2 g sugars per serving. */
  lowSugarMealGrams: 2,
  /** Sodium at or under 15% of the 2,000 mg daily limit per serving (the guide's reduced-sodium reference quantity). */
  sodiumUnder15PercentMg: 300,
} as const;

export const nutritionBadges = ["Light meal", "Under 500 kcal", "High in protein", "Source of protein", "High in fibre", "Source of fibre", "Low in sugar", "Under 300 mg sodium"] as const;
export type NutritionBadge = (typeof nutritionBadges)[number];

/** Approved nutrient function claims (HPB guide, Appendix II), verbatim. Shown only when the matching badge is earned. */
export const nutrientFunctionClaims: { badge: NutritionBadge; nutrient: "Protein" | "Dietary fibre"; text: string; source: string }[] = [
  { badge: "High in fibre", nutrient: "Dietary fibre", text: "Dietary fibre aids in digestion.", source: "HPB nutrient function claim 5" },
  { badge: "High in protein", nutrient: "Protein", text: "Protein helps in tissue building and growth.", source: "HPB nutrient function claim 2" },
  { badge: "Source of fibre", nutrient: "Dietary fibre", text: "Dietary fibre aids in digestion.", source: "HPB nutrient function claim 5" },
  { badge: "Source of protein", nutrient: "Protein", text: "Protein helps in tissue building and growth.", source: "HPB nutrient function claim 2" },
];

/** Energy per gram used to turn protein grams into an energy share (Atwater factor). */
export const proteinKcalPerGram = 4;
