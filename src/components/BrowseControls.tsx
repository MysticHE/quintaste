import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewInstance } from "react-native";
import type { WebOnlyProps } from "../types/web-props";
import { SearchField } from "./food/Controls";
import { Icon, T, common, type IconName } from "./ui";
import { usePreferences } from "../state/Preferences";
import { StateView, type StateAction } from "./StateView";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { useT } from "../i18n";

export type BrowseFilter = { label: string; count: number; onPress: () => void };
/** Text and icons drawn on the accent colour (the dark-mode accent is light, so it takes the background colour). */
export const useOnAccent = () => { const { theme } = usePreferences(); return theme.dark ? theme.background : theme.actionForeground; };

/** Shared browse chrome: one search box with its filter button inside, an optional action (Inbox) and Me. */
/** `field` replaces the plain search box (Cook's has suggestions); `below` sits under the row, such as its suggestion list. */
export function BrowseHeader({ query, onChange, placeholder, filter, action, field, below }: {
  query: string; onChange: (value: string) => void; placeholder: string; filter?: BrowseFilter; action?: ReactNode; field?: ReactNode; below?: ReactNode;
}) {
  const row = <View testID="browse-search-row" style={s.search}>
    <View style={[common.flex, { minWidth: 0 }]}>{field ?? <SearchField value={query} onChange={onChange} placeholder={placeholder}
      trailing={filter ? <FilterButton {...filter} /> : undefined} />}</View>
    {action}
  </View>;
  // Always the same wrapper: adding one only when the list appears would remount the search box and drop its focus.
  return <View>{row}{below}</View>;
}
/** The filter button inside a search box: a plain icon at rest, solid accent while filters are on. Owner rule: never show a count on it. */
export function FilterButton({ label, count, onPress }: BrowseFilter) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), active = count > 0, t = useT("common");
  // Looks the same whether or not filters are on (owner rule: no count or colour on filter buttons); screen readers still hear "on".
  return <Pressable accessibilityRole="button" accessibilityLabel={active ? t("filterOn", { label }) : label} accessibilityState={{ selected: active }}
    onPress={onPress} hitSlop={4} {...focusProps}
    style={({ pressed }) => [s.filter, { backgroundColor: pressed ? theme.muted : theme.transparent, borderColor: focused ? theme.foreground : theme.transparent }]}>
    <Icon name="options-outline" size={22} color={theme.foreground} />
  </Pressable>;
}

export type IconTab<T extends string> = { id: T; label: string; icon: IconName; activeIcon: IconName; badge?: number };
/**
 * Icon-only section tabs (the Social profile): the selected icon is filled with a bar beneath it; labels are for screen readers.
 * On the web it is one tab stop; Arrow keys, Home and End move between tabs, as in TopTabs.
 */
export function IconTabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly IconTab<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const { theme } = usePreferences(), items = useRef<(ViewInstance | null)[]>([]);
  const keyDown = (event: KeyboardEvent, index: number) => {
    const count = tabs.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(tabs[next].id); items.current[next]?.focus();
  };
  return <View>
    <View accessibilityRole="tablist" accessibilityLabel={label} style={s.tabs}>
      {tabs.map((tab, index) => <TabButton key={tab.id} tab={tab} selected={tab.id === value} onPress={() => onChange(tab.id)}
        controlRef={node => { items.current[index] = node; }} onKeyDown={event => keyDown(event, index)} />)}
    </View>
    <View style={[s.rule, { backgroundColor: theme.divider }]} />
  </View>;
}
function TabButton<T extends string>({ tab, selected, onPress, controlRef, onKeyDown }: {
  tab: IconTab<T>; selected: boolean; onPress: () => void; controlRef: (node: ViewInstance | null) => void; onKeyDown: (event: KeyboardEvent) => void;
}) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), badge = tab.badge ?? 0;
  const keyboardProps: WebOnlyProps = Platform.OS === "web" ? { tabIndex: selected ? 0 : -1, onKeyDown } : {};
  return <Pressable ref={controlRef} {...keyboardProps} accessibilityRole="tab" accessibilityLabel={tab.label + (badge ? `, ${badge}` : "")} accessibilityState={{ selected }}
    aria-selected={selected} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.tab, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <View>
      <Icon name={selected ? tab.activeIcon : tab.icon} size={26} color={selected ? theme.foreground : theme.mutedForeground} />
      {badge > 0 && <View style={[s.tabBadge, { backgroundColor: theme.accent }]}><T variant="small" color={onAccent} style={[common.bold, s.dotText]}>{badge > 99 ? "99+" : badge}</T></View>}
    </View>
    {selected && <View style={[s.indicator, { backgroundColor: theme.accent }]} />}
  </Pressable>;
}

/** A tab with nothing in it yet: icon, title, one short line and the step that fills it. Only creating actions take a + icon. */
export function FirstRunState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: StateAction }) {
  return <StateView size="page" icon={icon} title={title} text={text} primary={action} />;
}
export function FilterSection({ title, icon, children, prominent = false }: PropsWithChildren<{ title: string; icon: IconName; prominent?: boolean }>) {
  const { theme } = usePreferences();
  return <View style={[s.section, { borderBottomColor: theme.divider }]}>
    <View style={[common.row, { gap: 8 }]}><Icon name={icon} size={prominent ? 20 : 18} /><T variant={prominent ? "subtitle" : "small"} style={common.bold} accessibilityRole="header">{title}</T></View>
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
  section: { gap: 10, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
