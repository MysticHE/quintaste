import { StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { MenuItem } from "../../types/menus";
import { menuDisplayPrice } from "../../utils/menu-display";
import { T, common } from "../ui";
import { fontNames } from "../../theme/tokens";
import { DietIcon } from "../food/DietIcon";

export function MenuItemRow({ item }: { item: MenuItem }) {
  const { theme } = usePreferences();
  const price = menuDisplayPrice(item);
  // Only a venue's VG label proves a diet label (Vegan); its plain V means meat-free, which every listed dish is.
  const vegan = item.diet === "VG";
  return <View>
    <View testID="menu-item" style={s.item} accessible accessibilityLabel={item.name + (vegan ? ", Vegan" : "") + ", " + price}>
      <T variant="small" style={s.name}>{item.name}</T>
      {vegan && <View testID="menu-item-diet" style={[s.tag, { borderColor: theme.border }]}>
        <DietIcon diet="Vegan" size={13} color={theme.mutedForeground} />
        <T variant="caption" color={theme.mutedForeground} style={common.bold}>Vegan</T></View>}
      <T style={s.price} variant="small">{price}</T>
    </View>
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider }} />
  </View>;
}
const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 44, paddingVertical: 10 },
  name: { flex: 1, minWidth: 0 }, tag: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, marginLeft: -8 }, price: { maxWidth: "40%", textAlign: "right", fontVariant: ["tabular-nums"], fontFamily: fontNames.semibold },
});
