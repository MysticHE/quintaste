import { StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { MenuItem } from "../../types/menus";
import { menuDisplayPrice } from "../../utils/menu-display";
import { T, common } from "../ui";
import { fontNames } from "../../theme/tokens";

export function MenuItemRow({ item }: { item: MenuItem }) {
  const { theme } = usePreferences();
  const price = menuDisplayPrice(item);
  // The venue's own label on a veg options menu, as text so it never relies on colour.
  const label = item.diet === "VG" ? ", vegan" : item.diet === "V" ? ", vegetarian" : "";
  return <View>
    <View testID="menu-item" style={s.item} accessible accessibilityLabel={item.name + label + ", " + price}>
      <T variant="small" style={s.name}>{item.name}</T>
      {!!item.diet && <View testID="menu-item-diet" style={[s.tag, { borderColor: theme.border }]}>
        <T variant="caption" color={theme.mutedForeground} style={common.bold}>{item.diet}</T></View>}
      <T style={s.price} variant="small">{price}</T>
    </View>
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider }} />
  </View>;
}
const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 44, paddingVertical: 10 },
  name: { flex: 1, minWidth: 0 }, tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, marginLeft: -8 }, price: { maxWidth: "40%", textAlign: "right", fontVariant: ["tabular-nums"], fontFamily: fontNames.semibold },
});
