import { useEffect, useRef, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewInstance, type ScrollViewInstance } from "react-native";
import type { WebOnlyProps } from "../types/web-props";
import { T, common } from "./ui";
import { useOnAccent } from "./BrowseControls";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";

/** `badge` shows a count; `dot` marks something new without a number (Messages). */
export type TopTab<V extends string> = { id: V; label: string; accessibleLabel?: string; badge?: number; dot?: boolean };

/**
 * The one screen-level section switcher (Explore, Feeds, Social, Dining, Market): text tabs with a bar under the selected tab.
 * On the web it is a single tab stop; Arrow keys, Home and End move between tabs, as in SegmentedTabs.
 */
export function TopTabs<V extends string>({ tabs, value, onChange, label }: {
  tabs: readonly TopTab<V>[]; value: V; onChange: (id: V) => void; label: string;
}) {
  const scroll = useRef<ScrollViewInstance>(null), offsets = useRef<Partial<Record<V, number>>>({}), items = useRef<(ViewInstance | null)[]>([]);
  // Large text can overflow the row; keep the selected tab in view when it changes and when it is first laid out.
  const reveal = (x: number | undefined) => { if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 24), animated: false }); };
  useEffect(() => { reveal(offsets.current[value]); }, [value]);
  const keyDown = (event: KeyboardEvent, index: number) => {
    const count = tabs.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(tabs[next].id); items.current[next]?.focus();
  };
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.content}
    accessibilityRole="tablist" accessibilityLabel={label}>
    {tabs.map((tab, index) => <TabButton key={tab.id} tab={tab} selected={tab.id === value} onPress={() => onChange(tab.id)}
      controlRef={node => { items.current[index] = node; }} onKeyDown={event => keyDown(event, index)}
      onLayout={x => { offsets.current[tab.id] = x; if (tab.id === value) reveal(x); }} />)}
  </ScrollView>;
}

/** A screen's top row: tabs on the left, icon actions on the right, over one full-width divider. */
export function TopBar({ children, actions, testID }: { children: ReactNode; actions?: ReactNode; testID?: string }) {
  const { theme } = usePreferences();
  return <View testID={testID} style={[s.bar, { borderBottomColor: theme.divider }]}>
    <View style={s.tabs}>{children}</View>
    {!!actions && <View style={s.actions}>{actions}</View>}
  </View>;
}

function TabButton<V extends string>({ tab, selected, onPress, onLayout, controlRef, onKeyDown }: {
  tab: TopTab<V>; selected: boolean; onPress: () => void; onLayout: (x: number) => void;
  controlRef: (node: ViewInstance | null) => void; onKeyDown: (event: KeyboardEvent) => void;
}) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus();
  const keyboardProps: WebOnlyProps = Platform.OS === "web" ? { tabIndex: selected ? 0 : -1, onKeyDown } : {};
  return <Pressable ref={controlRef} {...keyboardProps} accessibilityRole="tab" accessibilityLabel={tab.accessibleLabel ?? tab.label} accessibilityState={{ selected }} aria-selected={selected}
    onPress={onPress} onLayout={event => onLayout(event.nativeEvent.layout.x)} {...focusProps}
    style={({ pressed }) => [s.tab, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.accentSoft : theme.transparent },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <View style={[common.row, { gap: 6 }]}>
      <T variant="button" numberOfLines={1} color={selected ? theme.accent : theme.mutedForeground} style={common.bold}>{tab.label}</T>
      {!!tab.badge && <View style={[s.badge, { backgroundColor: theme.accent }]}>
        <T variant="caption" color={onAccent} style={common.bold}>{tab.badge > 99 ? "99+" : tab.badge}</T></View>}
      {!tab.badge && tab.dot && <View style={[s.dot, { backgroundColor: theme.accent }]} />}
    </View>
    <View pointerEvents="none" style={[s.indicator, { backgroundColor: selected ? theme.accent : theme.transparent }]} />
  </Pressable>;
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, minHeight: 52 },
  tabs: { flex: 1, minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center" },
  scroll: { flexGrow: 0 },
  content: { flexGrow: 1 },
  tab: { flexGrow: 1, flexShrink: 0, minWidth: 64, minHeight: 50, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderRadius: 12 },
  indicator: { position: "absolute", left: "24%", right: "24%", bottom: 1, height: 3, borderRadius: 2 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
