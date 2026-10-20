import type { MealTime, Recipe, RecipeCategory } from "../types/food";
import { sgDateTimeText } from "./sg-datetime";

/**
 * Cook feed by time of day, in Singapore time (owner decision, 21 October 2026; docs/COOK_DISCOVERY_PLAN.md §3).
 * Weekdays: Morning 05:00–10:30, Midday 10:30–14:30, Afternoon 14:30–17:30, Dinner 17:30–21:30, Late 21:30–05:00.
 * Weekends: Brunch 06:00–12:00 (morning and midday recipes both fit), Midday 12:00–14:30, then the same; Late runs to 06:00.
 * The daypart only orders the feed; it never hides a recipe.
 */
export type Daypart = "morning" | "brunch" | "midday" | "afternoon" | "dinner" | "late";
export type DaypartNow = { part: Daypart; weekend: boolean; day: string };

const minutesOf = (text: string) => Number(text.slice(11, 13)) * 60 + Number(text.slice(14, 16));
export function daypartAt(at: number): DaypartNow {
  const text = sgDateTimeText(at), day = text.slice(0, 10), minute = minutesOf(text);
  const weekday = new Date(day + "T00:00:00Z").getUTCDay(), weekend = weekday === 0 || weekday === 6;
  const part: Daypart = weekend
    ? minute < 360 ? "late" : minute < 720 ? "brunch" : minute < 870 ? "midday" : minute < 1050 ? "afternoon" : minute < 1290 ? "dinner" : "late"
    : minute < 300 ? "late" : minute < 630 ? "morning" : minute < 870 ? "midday" : minute < 1050 ? "afternoon" : minute < 1290 ? "dinner" : "late";
  return { part, weekend, day };
}

/** Where a recipe fits when it names no meal times: from its categories. */
const byCategory: Record<RecipeCategory, MealTime[]> = {
  Breakfast: ["morning"], Noodles: ["midday", "dinner"], "Rice meals": ["midday", "dinner"], "With rice": ["midday", "dinner"],
  Soups: ["midday", "dinner"], "Snacks & kueh": ["afternoon", "late"], "Desserts & drinks": ["afternoon", "dinner", "late"],
};
export function mealTimes(recipe: Pick<Recipe, "categories" | "mealTimes">): MealTime[] {
  if (recipe.mealTimes?.length) return recipe.mealTimes;
  return [...new Set(recipe.categories.flatMap(category => byCategory[category] ?? []))];
}
const fitsPart = (times: MealTime[], part: Daypart) => part === "brunch" ? times.includes("morning") || times.includes("midday") : times.includes(part);

/** 0 = suits now and the moment (quick weekday lunch, a dinner for the table), 1 = suits now, 2 = another time of day. */
export function daypartScore(recipe: Pick<Recipe, "categories" | "mealTimes" | "minutes" | "onePot" | "servings">, now: DaypartNow) {
  if (!fitsPart(mealTimes(recipe), now.part)) return 2;
  const quick = recipe.minutes <= 20;
  const moment = now.part === "morning" || (now.part === "midday" && !now.weekend) ? quick
    : now.part === "dinner" ? !!recipe.onePot || recipe.servings >= 2 : true;
  return moment ? 0 : 1;
}

/** The meal name shown on the first card when it suits now: "Dinner · 25 min". */
export const daypartLabel: Record<Daypart, string> = { morning: "Breakfast", brunch: "Brunch", midday: "Lunch", afternoon: "Tea Time", dinner: "Dinner", late: "Supper" };

/** A stable number per recipe per day, so recipes that rank the same take turns at the top instead of always the same few. */
export function dailyShuffle(id: string, day: string) {
  let h = 2166136261;
  for (const ch of day + "|" + id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
