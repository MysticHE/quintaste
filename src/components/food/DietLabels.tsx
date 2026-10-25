import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { DietLabel } from "../../config/diet-labels";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";
import { DietIcon } from "./DietIcon";

/**
 * Translated name and rule for each label. Screens show the name alone (owner, 25 Oct 2026:
 * "Vegan", "Vegetarian" on one row); the rule stays in what screen readers say.
 */
export function useDietText() {
  const t = useT("diet");
  return useMemo(() => ({
    name: (label: DietLabel) => t(label === "Vegan" ? "nameVegan" : label === "Vegetarian" ? "nameVegetarian" : "namePlantBased"),
    rule: (label: DietLabel) => t(label === "Vegan" ? "ruleVegan" : label === "Vegetarian" ? "ruleVegetarian" : "rulePlantBased"),
    /** "Vegan, no dairy, egg, honey": the accessible name for a label. */
    spoken: (label: DietLabel) => t("labelSpoken", {
      name: t(label === "Vegan" ? "nameVegan" : label === "Vegetarian" ? "nameVegetarian" : "namePlantBased"),
      rule: t(label === "Vegan" ? "ruleVegan" : label === "Vegetarian" ? "ruleVegetarian" : "rulePlantBased") }),
    t,
  }), [t]);
}

/** The labels an item proves, icon and name, on one wrapping row. Nothing renders when no label is proven. */
export function DietLabels({ labels, note }: { labels: readonly DietLabel[]; note?: string }) {
  const { theme } = usePreferences(), text = useDietText();
  if (!labels.length) return null;
  return <View style={[common.row, s.row]}>
    {labels.map(label => <View key={label} accessible accessibilityLabel={text.spoken(label)}
      style={[s.chip, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
      <DietIcon diet={label} color={theme.success} size={16} />
      <T variant="small" color={theme.success} style={common.bold}>{text.name(label)}</T>
    </View>)}
    {!!note && <T variant="small" muted>{note}</T>}
  </View>;
}

/**
 * On a vegetarian place that has not proven the no-five-pungent check: says so plainly and offers the question to show
 * the stall, in Chinese with its English meaning.
 */
export function PungentUnconfirmed() {
  const { theme } = usePreferences(), text = useDietText();
  const [open, setOpen] = useState(false);
  return <View style={[s.unconfirmed, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(value => !value)}
      accessibilityLabel={text.t("pungentUnconfirmed") + ". " + text.t("askStallTitle")} style={[common.row, s.unconfirmedRow]}>
      <DietIcon diet="Vegetarian" color={theme.mutedForeground} size={18} />
      <T variant="small" muted style={common.flex}>{text.t("pungentUnconfirmed")}</T>
      <T variant="small" color={theme.accent} style={common.bold}>{text.t("askStallTitle")}</T>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.accent} />
    </Pressable>
    {open && <View style={s.question}>
      <T variant="subtitle" selectable>{text.t("askStallQuestion")}</T>
      <T variant="small" muted selectable>{text.t("askStallTranslation")}</T>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  row: { gap: 6, flexWrap: "wrap", alignItems: "center" },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5 },
  unconfirmed: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10 },
  unconfirmedRow: { gap: 8, minHeight: 44 },
  question: { gap: 4, paddingBottom: 10 },
});
