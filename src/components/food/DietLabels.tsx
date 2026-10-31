import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { DietLabel } from "../../config/diet-labels";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { T, common } from "../ui";
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


const s = StyleSheet.create({
  row: { gap: 6, flexWrap: "wrap", alignItems: "center" },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5 },
});
