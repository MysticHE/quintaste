import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MeButton, SearchField } from "./food/Controls";
import { Button, Icon, T, common, type IconName } from "./ui";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";

export type BrowseFilter = { label: string; count: number; onPress: () => void };
/** Text and icons drawn on the accent colour (the dark-mode accent is light, so it takes the background colour). */
export const useOnAccent = () => { const { theme } = usePreferences(); return theme.dark ? theme.background : theme.actionForeground; };

/** Shared browse chrome: one search box with its filter button inside, an optional action (Inbox) and Me. */
export function BrowseHeader({ query, onChange, placeholder, filter, action }: {
  query: string; onChange: (value: string) => void; placeholder: string; filter?: BrowseFilter; action?: ReactNode;
}) {
  return <View testID="browse-search-row" style={s.search}>
    <View style={[common.flex, { minWidth: 0 }]}><SearchField value={query} onChange={onChange} placeholder={placeholder}
      trailing={filter ? <FilterButton {...filter} /> : undefined} /></View>
    {action}<MeButton />
  </View>;
}
/** The filter button that sits inside a search box; solid while filters are on. Owner rule: never show a count on it. */
export function FilterButton({ label, count, onPress }: BrowseFilter) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), active = count > 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={active ? label + ", on" : label} accessibilityState={{ selected: active }}
    onPress={onPress} hitSlop={4} {...focusProps}
    style={({ pressed }) => [s.filter, { backgroundColor: active ? theme.accent : theme.accentSoft, borderColor: focused ? theme.foreground : theme.transparent, opacity: pressed ? 0.75 : 1 }]}>
    <Icon name="options-outline" size={20} color={active ? onAccent : theme.accent} />
  </Pressable>;
}

export type IconTab<T extends string> = { id: T; label: string; icon: IconName; activeIcon: IconName; badge?: number };
/** Icon-only section tabs: the selected icon is filled with a bar beneath it; labels are for screen readers. */
export function IconTabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly IconTab<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const { theme } = usePreferences();
  return <View>
    <View accessibilityRole="tablist" accessibilityLabel={label} style={s.tabs}>
      {tabs.map(tab => <TabButton key={tab.id} tab={tab} selected={tab.id === value} onPress={() => onChange(tab.id)} />)}
    </View>
    <View style={[s.rule, { backgroundColor: theme.divider }]} />
  </View>;
}
function TabButton<T extends string>({ tab, selected, onPress }: { tab: IconTab<T>; selected: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), badge = tab.badge ?? 0;
  return <Pressable accessibilityRole="tab" accessibilityLabel={tab.label + (badge ? `, ${badge}` : "")} accessibilityState={{ selected }} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.tab, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    <View>
      <Icon name={selected ? tab.activeIcon : tab.icon} size={26} color={selected ? theme.foreground : theme.mutedForeground} />
      {badge > 0 && <View style={[s.tabBadge, { backgroundColor: theme.accent }]}><T variant="small" color={onAccent} style={[common.bold, s.dotText]}>{badge > 99 ? "99+" : badge}</T></View>}
    </View>
    {selected && <View style={[s.indicator, { backgroundColor: theme.foreground }]} />}
  </Pressable>;
}

/** A section with nothing in it yet: one icon, a title, one short line and the action that fills it. */
export function FirstRunState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { label: string; onPress: () => void } }) {
  const { theme } = usePreferences();
  return <View style={s.empty}>
    <View style={[s.emptyIcon, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={38} color={theme.accent} /></View>
    <T variant="title" accessibilityRole="header" style={[common.center, common.bold]}>{title}</T>
    <T muted style={common.center}>{text}</T>
    {action && <View style={s.emptyAction}><Button label={action.label} icon="add" onPress={action.onPress} /></View>}
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
  filter: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 4 },
  dotText: { fontSize: 11, lineHeight: 14 },
  tabs: { flexDirection: "row" },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderWidth: 2, borderRadius: 12 },
  tabBadge: { position: "absolute", top: -6, left: 18, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  indicator: { position: "absolute", bottom: 0, left: "22%", right: "22%", height: 3, borderRadius: 2 },
  rule: { height: StyleSheet.hairlineWidth },
  empty: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyAction: { marginTop: 14, minWidth: 160 },
  section: { gap: 10, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
