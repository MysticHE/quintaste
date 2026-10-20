import { StyleSheet, View } from "react-native";
import type { DietLabel } from "../../config/diet-labels";
import { usePreferences } from "../../state/Preferences";
import { T, common } from "../ui";
import { DietIcon } from "./DietIcon";

/** The diet labels an item proves (Vegan, Vegetarian or Plant-Based), each with its icon; nothing when none is proven. */
export function DietLabels({ labels, note }: { labels: readonly DietLabel[]; note?: string }) {
  const { theme } = usePreferences();
  if (!labels.length) return null;
  return <View style={[common.row, s.row]} accessible accessibilityLabel={labels.join(", ") + (note ? ", " + note : "")}>
    {labels.map(label => <View key={label} style={[s.badge, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
      <DietIcon diet={label} color={theme.success} size={15} /><T variant="small" color={theme.success} style={common.bold}>{label}</T>
    </View>)}
    {!!note && <T variant="small" muted>{note}</T>}
  </View>;
}
const s = StyleSheet.create({
  row: { gap: 6, flexWrap: "wrap", alignItems: "center" },
  badge: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 5 },
});
