import { StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { Recipe } from "../../types/food";
import { badgeName, nutrientBenefitFor, nutritionBadgesFor, percentOfDay } from "../../utils/nutrition";
import { useLanguage, useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";
import { T, common } from "../ui";
import { CookSection } from "./CookLayout";

const ROWS: [keyof NonNullable<Recipe["nutrition"]>["perServing"], CookKey, CookKey][] = [
  ["kcal", "nutrientKcal", "unitKcal"], ["protein", "nutrientProtein", "unitGram"], ["carbs", "nutrientCarbs", "unitGram"], ["fat", "nutrientFat", "unitGram"],
  ["fibre", "nutrientFibre", "unitGram"], ["sugar", "nutrientSugar", "unitGram"], ["sodium", "nutrientSodium", "unitMilligram"],
];

/** Per-serving figures with claim badges and one authorised health claim (Codex, EU, WHO); "Unavailable" when a recipe has
 * no reliable figures. Never a score or medical wording; the standards live in config/nutrition-standards.ts. */
export function NutritionFacts({ recipe }: { recipe: Recipe }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  const nutrition = recipe.nutrition;
  if (!nutrition) return <CookSection title={t("nutritionPerServing")}>
    <T variant="small" muted>{t("nutritionUnavailable")}</T>
  </CookSection>;
  const figures = nutrition.perServing;
  const rows = ROWS.filter(([key]) => typeof figures[key] === "number");
  const badges = nutritionBadgesFor(figures, recipe.categories), benefit = nutrientBenefitFor(badges, language);
  const names = badges.map(badge => badgeName(badge, language));
  const toTaste = recipe.ingredients.some(ingredient => ingredient.amount === null);
  return <CookSection title={t("nutritionPerServing")} initiallyOpen>
    {!!badges.length && <View style={[common.row, { gap: 6, flexWrap: "wrap" }]} accessibilityLabel={t("nutritionBadges", { list: names.join(t("listJoin")) })}>
      {badges.map((badge, index) => <View key={badge} style={[s.badge, { backgroundColor: theme.successSoft, borderColor: theme.success }]}><T variant="small" color={theme.success} style={common.bold}>{names[index]}</T></View>)}
    </View>}
    <View style={{ gap: 4 }}>
      {rows.map(([key, labelKey, unitKey]) => {
        const value = figures[key] ?? 0, percent = percentOfDay(key, value), label = t(labelKey), unit = t(unitKey);
        const spoken = { label, value: Math.round(value), unit, percent: percent ?? "" };
        return <View key={key} style={[common.row, { gap: 8 }]} accessible accessibilityLabel={t(percent !== undefined ? "nutrientSpokenPercent" : "nutrientSpoken", spoken)}>
          <T variant="small" style={common.flex}>{label}</T>
          <T variant="small" style={[common.bold, s.value]}>{Math.round(value)} {unit}</T>
          <T variant="small" muted style={s.percent}>{percent !== undefined ? percent + "%" : ""}</T>
        </View>;
      })}
    </View>
    {benefit && <T variant="small">{benefit.text} <T variant="caption" muted>{benefit.source}</T></T>}
    <T variant="caption" muted>
      {nutrition.basis === "source" ? t("nutritionFromSite", { site: nutrition.site ?? "" }) : t("nutritionEstimated")}
      {toTaste ? t("nutritionToTaste") : ""}{t("nutritionPercentNote")}
    </T>
  </CookSection>;
}

const s = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, minHeight: 28, justifyContent: "center" },
  value: { minWidth: 72, textAlign: "right" },
  percent: { minWidth: 40, textAlign: "right" },
});
