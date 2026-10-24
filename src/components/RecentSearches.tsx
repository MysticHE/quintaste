import { Pressable, StyleSheet, View } from "react-native";
import { Icon, T, common } from "./ui";
import { IconButton } from "./food/Controls";
import { usePreferences } from "../state/Preferences";

/** Recent searches on the Explore and Feeds search pages: tap to search again, ✕ to forget one. */
export function RecentSearches({ items, label, removeLabel, onPick, onRemove, disabled = false, testID }: {
  items: string[]; label: string; removeLabel: (item: string) => string; onPick: (item: string) => void; onRemove: (item: string) => void; disabled?: boolean; testID?: string;
}) {
  const { theme } = usePreferences();
  if (!items.length) return null;
  return <View accessibilityLabel={label} testID={testID} style={[s.list, { borderBottomColor: theme.divider }]}>
    {items.map(item => <View key={item} style={common.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={item} disabled={disabled} onPress={() => onPick(item)}
        style={({ pressed }) => [s.row, { backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
        <Icon name="time-outline" color={theme.mutedForeground} /><T style={common.flex} numberOfLines={1}>{item}</T>
      </Pressable>
      <IconButton appearance="plain" label={removeLabel(item)} icon="close-outline" onPress={() => onRemove(item)} />
    </View>)}
  </View>;
}
const s = StyleSheet.create({
  list: { borderBottomWidth: 1, paddingBottom: 12, gap: 4 },
  row: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4, borderRadius: 12 },
});
