import { useRef, type KeyboardEvent } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewInstance } from "react-native";
import type { WebOnlyProps } from "../types/web-props";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { usePreferences } from "../state/Preferences";
import { T, common } from "./ui";

/** `dot` marks an option with something new (Messages Buy / Sell); the label already says so to screen readers via `accessibleLabel`. */
export type SegmentOption<V extends string> = { id: V; label: string; dot?: boolean; accessibleLabel?: string };
/** One segmented radio row: arrow keys, Home and End move between options with a single web tab stop. */
export function SegmentedTabs<V extends string>({ options, value, onChange, label }: {
  options: readonly SegmentOption<V>[]; value: V; onChange: (value: V) => void; label: string;
}) {
  const { theme } = usePreferences(), items = useRef<(ViewInstance | null)[]>([]);
  const keyDown = (event: KeyboardEvent, index: number) => {
    const count = options.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(options[next].id); items.current[next]?.focus();
  };
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[s.track, { backgroundColor: theme.muted }]}>
    {options.map((option, index) => <Segment key={option.id} label={option.label} dot={option.dot} spoken={option.accessibleLabel} selected={value === option.id} onPress={() => onChange(option.id)}
      controlRef={node => { items.current[index] = node; }} onKeyDown={event => keyDown(event, index)} />)}
  </View>;
}
function Segment({ label, dot, spoken, selected, onPress, controlRef, onKeyDown }: {
  label: string; dot?: boolean; spoken?: string; selected: boolean; onPress: () => void; controlRef: (node: ViewInstance | null) => void; onKeyDown: (event: KeyboardEvent) => void;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const keyboardProps: WebOnlyProps = Platform.OS === "web" ? { tabIndex: selected ? 0 : -1, onKeyDown } : {};
  return <Pressable ref={controlRef} {...keyboardProps} accessibilityRole="radio" accessibilityLabel={spoken ?? label} accessibilityState={{ checked: selected }} aria-checked={selected}
    onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.tab, { backgroundColor: selected ? theme.card : theme.transparent,
      borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? .7 : 1 }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <View style={[common.row, { gap: 6 }]}><T variant="small" color={selected ? theme.accent : theme.mutedForeground} style={[common.bold, s.label]}>{label}</T>
      {dot && <View style={[s.dot, { backgroundColor: theme.accent }]} />}</View>
  </Pressable>;
}
const s = StyleSheet.create({
  track: { flex: 1, minWidth: 0, flexDirection: "row", padding: 3, gap: 2, borderRadius: 12 },
  tab: { flex: 1, minWidth: 48, minHeight: 48, borderRadius: 9, borderWidth: 1, paddingHorizontal: 3, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  label: { textAlign: "center", flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
