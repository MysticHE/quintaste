import { useRef, type KeyboardEvent } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { usePreferences } from "../state/Preferences";
import { T, common } from "./ui";

export type SegmentOption<V extends string> = { id: V; label: string; accessibleLabel?: string; flex?: number };
/** One segmented radio row: arrow keys, Home and End move between options with a single web tab stop. */
export function SegmentedTabs<V extends string>({ options, value, onChange, label, accent = false }: {
  options: readonly SegmentOption<V>[]; value: V; onChange: (value: V) => void; label: string; accent?: boolean;
}) {
  const { theme } = usePreferences(), items = useRef<(View | null)[]>([]);
  const keyDown = (event: KeyboardEvent, index: number) => {
    const count = options.length;
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count
      : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(options[next].id); items.current[next]?.focus();
  };
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[s.track, { backgroundColor: accent ? theme.accentSoft : theme.muted }]}>
    {options.map((option, index) => <Segment key={option.id} label={option.label} selected={value === option.id} onPress={() => onChange(option.id)}
      accent={accent} accessibleLabel={option.accessibleLabel} flex={option.flex}
      controlRef={node => { items.current[index] = node; }} onKeyDown={event => keyDown(event, index)} />)}
  </View>;
}
function Segment({ label, selected, onPress, controlRef, onKeyDown, accent, accessibleLabel, flex = 1 }: {
  label: string; selected: boolean; onPress: () => void; controlRef: (node: View | null) => void; onKeyDown: (event: KeyboardEvent) => void;
  accent: boolean; accessibleLabel?: string; flex?: number;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const keyboardProps = Platform.OS === "web" ? { tabIndex: selected ? 0 as const : -1 as const, onKeyDown } : {};
  return <Pressable ref={controlRef} {...keyboardProps} accessibilityRole="radio" accessibilityLabel={accessibleLabel ?? label} accessibilityState={{ checked: selected }} aria-checked={selected}
    onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.tab, { flex, backgroundColor: selected ? (accent ? theme.accent : theme.card) : theme.transparent,
      borderColor: focused ? (accent ? theme.foreground : theme.accent) : theme.transparent, opacity: pressed ? .7 : 1 }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <T variant="small" color={selected ? (accent ? (theme.dark ? theme.background : theme.actionForeground) : theme.accent) : theme.mutedForeground} style={[common.bold, s.label]}>{label}</T>
  </Pressable>;
}
const s = StyleSheet.create({
  track: { flex: 1, minWidth: 0, flexDirection: "row", padding: 3, gap: 2, borderRadius: 12 },
  tab: { flex: 1, minWidth: 48, minHeight: 48, borderRadius: 9, borderWidth: 1, paddingHorizontal: 3, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  label: { textAlign: "center", flexShrink: 1 },
});
