import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GAME_ART } from "../../../game/art";
import { T } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import { useKeyboardFocus } from "../../../hooks/useKeyboardFocus";

export function Art({ k, size, style }: { k: string; size: number; style?: object }) {
  const src = GAME_ART[k];
  return src ? <Image source={src} style={[{ width: size, height: size }, style]} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ width: size, height: size }} />;
}
/** A selectable tile with art, a label, a status line and an optional check badge (boards A06, A07). */
export function Tile({ art, label, status, selected, worn, locked, onPress, size = 64, a11y }: {
  art?: string; label: string; status?: string; selected?: boolean; worn?: boolean; locked?: boolean; onPress(): void; size?: number; a11y?: string;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label + (status ? ", " + status : "")} accessibilityState={{ selected: !!selected }} {...focusProps}
    style={[s.tile, { backgroundColor: theme.card, borderColor: selected || focused ? theme.accent : theme.border }, selected && { borderWidth: 2 }]}>
    {worn && <View style={[s.badge, { backgroundColor: theme.accent }]}><T variant="small" color={theme.actionForeground} style={{ fontWeight: "900" }}>✓</T></View>}
    <View style={locked ? { opacity: 0.45 } : null}>{art ? <Art k={art} size={size} /> : <View style={{ width: size, height: size }} />}</View>
    <T variant="small" style={{ fontWeight: "800", textAlign: "center" }} numberOfLines={2}>{label}</T>
    {!!status && <T variant="small" muted style={{ textAlign: "center", fontSize: 11 }} numberOfLines={2}>{status}</T>}
  </Pressable>;
}
export function Seg<K extends string>({ options, value, onChange, label }: { options: [K, string][]; value: K; onChange(k: K): void; label: string }) {
  const { theme } = usePreferences();
  return <View style={[s.seg, { backgroundColor: theme.muted }]} accessibilityRole="tablist" accessibilityLabel={label}>
    {options.map(([k, l]) => <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }}
      style={[s.segBtn, value === k && { backgroundColor: theme.foreground }]}>
      <T variant="small" color={value === k ? theme.background : theme.foreground} style={{ fontWeight: "800" }}>{l}</T></Pressable>)}
  </View>;
}
export function Grid({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.grid, style]}>{children}</View>; }
const s = StyleSheet.create({
  tile: { width: "22.5%", minWidth: 76, flexGrow: 1, maxWidth: 140, borderRadius: 16, borderWidth: 1, padding: 8, alignItems: "center", gap: 4, minHeight: 48 },
  badge: { position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", zIndex: 2 },
  seg: { flexDirection: "row", borderRadius: 999, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
