import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { MeButton, SearchField } from "./food/Controls";
import { Icon, T, common, type IconName } from "./ui";
import { usePreferences } from "../state/Preferences";

/** Shared two-row browse chrome. Secondary actions scroll rather than wrap. */
export function BrowseHeader({ query, onChange, placeholder, action }: {
  query: string; onChange: (value: string) => void; placeholder: string; action: ReactNode;
}) {
  return <View testID="browse-search-row" style={s.search}>
    <View style={[common.flex, { minWidth: 0 }]}><SearchField value={query} onChange={onChange} placeholder={placeholder} /></View>
    {action}<MeButton />
  </View>;
}
export function BrowseActions({ children, trailing }: PropsWithChildren<{ trailing?: ReactNode }>) {
  return <View testID="browse-options-row" style={s.search}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1, minWidth: 0 }}
      contentContainerStyle={s.actions}>{children}</ScrollView>{trailing}
  </View>;
}
export function FilterSection({ title, icon, children }: PropsWithChildren<{ title: string; icon: IconName }>) {
  const { theme } = usePreferences();
  return <View style={[s.section, { borderBottomColor: theme.divider }]}>
    <View style={[common.row, { gap: 8 }]}><Icon name={icon} size={18} /><T variant="small" style={common.bold} accessibilityRole="header">{title}</T></View>
    {children}
  </View>;
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  section: { gap: 10, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
