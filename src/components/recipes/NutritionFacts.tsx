import { View } from "react-native";
import type { Recipe } from "../../types/food";
import { T, common } from "../ui";
import { CookSection } from "./CookLayout";

const ROWS: [keyof NonNullable<Recipe["nutrition"]>["perServing"], string, string][] = [
  ["kcal", "Calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbohydrates", "g"], ["fat", "Fat", "g"],
  ["fibre", "Fibre", "g"], ["sugar", "Sugar", "g"], ["sodium", "Sodium", "mg"],
];

/** Per-serving nutrition when the bot found reliable figures; recipes without them show no section. */
export function NutritionFacts({ nutrition }: { nutrition: Recipe["nutrition"] }) {
  if (!nutrition) return null;
  const rows = ROWS.filter(([key]) => typeof nutrition.perServing[key] === "number");
  return <CookSection title="Nutrition Per Serving">
    {rows.map(([key, label, unit]) => <View key={key} style={[common.row, { justifyContent: "space-between" }]}>
      <T variant="small">{label}</T><T variant="small" style={common.bold}>{Math.round(nutrition.perServing[key] ?? 0)} {unit}</T>
    </View>)}
    <T variant="caption" muted>{nutrition.basis === "source" ? "From " + nutrition.site + "." : "Estimated from the ingredients (USDA data)."} Not dietary advice.</T>
  </CookSection>;
}
