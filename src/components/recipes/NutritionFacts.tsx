import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { usePreferences } from "../../state/Preferences";
import type { MicroNutrient, Recipe } from "../../types/food";
import { minerals, vitamins } from "../../config/nutrition-standards";
import { badgeName, microBadgeName, microBadgesFor, microName, nutrientBenefitFor, nutritionBadgesFor, percentOfDay, percentOfReference } from "../../utils/nutrition";
import { useLanguage, useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";
import { Icon, T, common } from "../ui";
import { CookSection } from "./CookLayout";

const ROWS: [keyof NonNullable<Recipe["nutrition"]>["perServing"], CookKey, CookKey][] = [
  ["kcal", "nutrientKcal", "unitKcal"], ["protein", "nutrientProtein", "unitGram"], ["carbs", "nutrientCarbs", "unitGram"], ["fat", "nutrientFat", "unitGram"],
  ["fibre", "nutrientFibre", "unitGram"], ["sugar", "nutrientSugar", "unitGram"], ["sodium", "nutrientSodium", "unitMilligram"],
];
/** Vitamins A, D, B12 and folate are in µg; the rest in mg. */
const MICRO_UNITS: Record<MicroNutrient, CookKey> = {
  vitA: "unitMicrogram", vitC: "unitMilligram", vitD: "unitMicrogram", vitE: "unitMilligram", b12: "unitMicrogram", folate: "unitMicrogram",
  calcium: "unitMilligram", iron: "unitMilligram", zinc: "unitMilligram", magnesium: "unitMilligram", potassium: "unitMilligram",
};
/** Whole numbers from 10 up, one decimal from 1, two below (vitamin B12 0.04 µg), so a small amount never reads as 0 beside
 * its own percent. */
const amount = (value: number) => String(value >= 10 ? Math.round(value) : value >= 1 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100);

/** Per-serving figures with claim badges and one authorised health claim (Codex, EU, WHO), then vitamins and minerals with
 * their share of the Codex daily reference; "Unavailable" when a recipe has no reliable figures. Never a score or medical
 * wording; the standards live in config/nutrition-standards.ts. */
export function NutritionFacts({ recipe }: { recipe: Recipe }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  const nutrition = recipe.nutrition;
  if (!nutrition) return <CookSection title={t("nutritionPerServing")}>
    <T variant="small" muted>{t("nutritionUnavailable")}</T>
  </CookSection>;
  const figures = nutrition.perServing;
  const rows = ROWS.filter(([key]) => typeof figures[key] === "number");
  const micro = nutrition.micro ?? {}, microRows = [...vitamins, ...minerals].filter(key => typeof micro[key] === "number");
  const badges = nutritionBadgesFor(figures, recipe.categories), benefit = nutrientBenefitFor(badges);
  const names = [...badges.map(badge => badgeName(badge, language)), ...microBadgesFor(nutrition).map(badge => microBadgeName(badge, language))];
  const toTaste = recipe.ingredients.some(ingredient => ingredient.amount === null);
  return <CookSection title={t("nutritionPerServing")} initiallyOpen>
    {!!names.length && <View style={[common.row, { gap: 6, flexWrap: "wrap" }]} accessibilityLabel={t("nutritionBadges", { list: names.join(t("listJoin")) })}>
      {names.map(name => <View key={name} style={[s.badge, { backgroundColor: theme.successSoft, borderColor: theme.success }]}><T variant="small" color={theme.success} style={common.bold}>{name}</T></View>)}
    </View>}
    <View style={{ gap: 4 }}>
      {rows.map(([key, labelKey, unitKey]) => {
        const value = figures[key] ?? 0, percent = percentOfDay(key, value);
        return <Figure key={key} label={t(labelKey)} value={String(Math.round(value))} unit={t(unitKey)} percent={percent} spokenKey={percent !== undefined ? "nutrientSpokenPercent" : "nutrientSpoken"} />;
      })}
    </View>
    {!!microRows.length && <MicroList micro={micro} keys={microRows} />}
    {/* Authorised wording is English only and may not be reworded, so the Chinese interface leaves it out rather than show it unexplained. */}
    {benefit && language === "en" && <T variant="small">{benefit.text}</T>}
    <T variant="caption" muted>
      {nutrition.basis === "source" ? t("nutritionFromSite", { site: nutrition.site ?? "" }) : t("nutritionEstimated")}
      {toTaste ? t("nutritionToTaste") : ""}{t("nutritionPercentNote")}{microRows.length ? t("nutritionMicroNote") : ""}{t("nutritionNotAdvice")}
    </T>
  </CookSection>;
}

/** Vitamins and minerals behind one disclosure row, closed at first, so the section stays short. */
function MicroList({ micro, keys }: { micro: Partial<Record<MicroNutrient, number>>; keys: MicroNutrient[] }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage(), [open, setOpen] = useState(false);
  const { focused, focusProps } = useKeyboardFocus();
  return <View style={{ gap: 4 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} {...focusProps}
      style={({ pressed }) => [common.row, s.toggle, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
      <T variant="small" style={[common.flex, common.bold]}>{t("vitaminsMinerals")}</T>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
    </Pressable>
    {open && keys.map(key => {
      const value = micro[key] ?? 0;
      return <Figure key={key} label={microName(key, language)} value={amount(value)} unit={t(MICRO_UNITS[key])} percent={percentOfReference(key, value)} spokenKey="nutrientSpokenReference" />;
    })}
  </View>;
}

function Figure({ label, value, unit, percent, spokenKey }: { label: string; value: string; unit: string; percent: number | undefined; spokenKey: CookKey }) {
  const t = useT("cook");
  return <View style={[common.row, { gap: 8 }]} accessible accessibilityLabel={t(spokenKey, { label, value, unit, percent: percent ?? "" })}>
    <T variant="small" style={common.flex}>{label}</T>
    <T variant="small" style={[common.bold, s.value]}>{value} {unit}</T>
    <T variant="small" muted style={s.percent}>{percent !== undefined ? percent + "%" : ""}</T>
  </View>;
}

const s = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, minHeight: 28, justifyContent: "center" },
  value: { minWidth: 72, textAlign: "right" },
  percent: { minWidth: 40, textAlign: "right" },
  toggle: { gap: 8, minHeight: 48, borderWidth: 2, borderRadius: 10, marginHorizontal: -4, paddingHorizontal: 2 },
});
