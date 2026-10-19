import { StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { Recipe } from "../../types/food";
import { nutrientBenefitFor, nutritionBadgesFor, percentOfDay } from "../../utils/nutrition";
import { T, common } from "../ui";
import { CookSection } from "./CookLayout";

const ROWS: [keyof NonNullable<Recipe["nutrition"]>["perServing"], string, string][] = [
  ["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbohydrates", "g"], ["fat", "Fat", "g"],
  ["fibre", "Fibre", "g"], ["sugar", "Sugar", "g"], ["sodium", "Sodium", "mg"],
];

/** Per-serving figures with HPB claim badges and one approved nutrient function claim; "Unavailable" when a recipe has
 * no reliable figures. Never a score or medical wording; the standards live in config/nutrition-standards.ts. */
export function NutritionFacts({ recipe }: { recipe: Recipe }) {
  const { theme } = usePreferences();
  const nutrition = recipe.nutrition;
  if (!nutrition) return <CookSection title="Nutrition Per Serving">
    <T variant="small" muted>Unavailable: the ingredients could not all be matched to a reviewed nutrition table.</T>
  </CookSection>;
  const figures = nutrition.perServing;
  const rows = ROWS.filter(([key]) => typeof figures[key] === "number");
  const badges = nutritionBadgesFor(figures, recipe.categories), benefit = nutrientBenefitFor(badges);
  const toTaste = recipe.ingredients.some(ingredient => ingredient.amount === null);
  return <CookSection title="Nutrition Per Serving" initiallyOpen>
    {!!badges.length && <View style={[common.row, { gap: 6, flexWrap: "wrap" }]} accessibilityLabel={"Nutrition badges: " + badges.join(", ")}>
      {badges.map(badge => <View key={badge} style={[s.badge, { backgroundColor: theme.successSoft, borderColor: theme.success }]}><T variant="small" color={theme.success} style={common.bold}>{badge}</T></View>)}
    </View>}
    <View style={{ gap: 4 }}>
      {rows.map(([key, label, unit]) => {
        const value = figures[key] ?? 0, percent = percentOfDay(key, value);
        return <View key={key} style={[common.row, { gap: 8 }]} accessible accessibilityLabel={`${label} ${Math.round(value)} ${unit}${percent !== undefined ? `, ${percent} percent of a day` : ""}`}>
          <T variant="small" style={common.flex}>{label}</T>
          <T variant="small" style={[common.bold, s.value]}>{Math.round(value)} {unit}</T>
          <T variant="small" muted style={s.percent}>{percent !== undefined ? percent + "%" : ""}</T>
        </View>;
      })}
    </View>
    {benefit && <T variant="small">{benefit.text} <T variant="caption" muted>({benefit.source})</T></T>}
    <T variant="caption" muted>
      {nutrition.basis === "source" ? "From " + nutrition.site + "." : "Estimated from the raw ingredients (USDA data)."}
      {toTaste ? " Salt, sauces or garnishes added to taste are not included." : ""} Percent of a 2,000 kcal day (HPB). Not dietary advice.
    </T>
  </CookSection>;
}

const s = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, minHeight: 28, justifyContent: "center" },
  value: { minWidth: 72, textAlign: "right" },
  percent: { minWidth: 40, textAlign: "right" },
});
