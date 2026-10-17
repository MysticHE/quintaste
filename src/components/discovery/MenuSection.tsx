import { View } from "react-native";
import type { PublishedMenu } from "../../types/menus";
import { T, common } from "../ui";
import { MenuItemRow } from "./MenuItemRow";

export function MenuSection({ section }: { section: PublishedMenu["sections"][number] }) {
  const groups = [...new Set(section.items.map(item => item.category ?? ""))];
  return <View style={{ gap: 12 }}>{groups.map(category => <View key={category} style={{ gap: 4 }}>
    {!!category && <T variant="small" style={common.bold} accessibilityRole="header">{category}</T>}
    <View>{section.items.filter(item => (item.category ?? "") === category).map(item => <MenuItemRow key={item.id} item={item} />)}</View>
  </View>)}</View>;
}
