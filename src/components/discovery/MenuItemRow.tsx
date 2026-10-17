import { StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { MenuItem } from "../../types/menus";
import { menuDisplayPrice } from "../../utils/menu-display";
import { T } from "../ui";
import { fontNames } from "../../theme/tokens";

export function MenuItemRow({ item }: { item: MenuItem }) {
  const { theme } = usePreferences();
  const price = menuDisplayPrice(item);
  return <View>
    <View testID="menu-item" style={s.item} accessible accessibilityLabel={item.name + ", " + price}>
      <T variant="small" style={s.name}>{item.name}</T>
      <T style={s.price} variant="small">{price}</T>
    </View>
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.divider }} />
  </View>;
}
const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 44, paddingVertical: 10 },
  name: { flex: 1, minWidth: 0 }, price: { maxWidth: "40%", textAlign: "right", fontVariant: ["tabular-nums"], fontFamily: fontNames.semibold },
});
