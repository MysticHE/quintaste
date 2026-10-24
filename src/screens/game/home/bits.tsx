import { useCallback, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GAME_ART } from "../../../game/art";
import type { Tier, Unlock } from "../../../game/content/cosmetics";
import { SEASONS } from "../../../game/content/seasons";
import type { Tier as KitchenTier } from "../../../game/mission";
import { Icon, T } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import { useKeyboardFocus } from "../../../hooks/useKeyboardFocus";
import { useT, type Vars } from "../../../i18n";
import type gameMessages from "../../../i18n/en/game";

export type GameKey = Extract<keyof typeof gameMessages, string>;
export type GameT = (key: GameKey, vars?: Vars) => string;
/** Display names for the lotus tiers and the Recipe Kitchen tiers; the stored values stay the same. */
export const LOTUS_TIER_KEYS: Record<Tier, GameKey> = { pink: "lotusTierPink", purple: "lotusTierPurple", blue: "lotusTierBlue", golden: "lotusTierGolden" };
export const KITCHEN_TIER_KEYS: Record<KitchenTier, GameKey> = { learn: "kitchenTierLearn", service: "kitchenTierService", memory: "kitchenTierMemory" };
/** What unlocks a cosmetic, in the member's language ("Clear Level 6", "Purple lotus", "120 credits"). Season names stay as game content. */
export function useUnlockText() {
  const t = useT("game");
  return useCallback((u: Unlock) => u.kind === "free" ? t("unlockFree") : u.kind === "level" ? t("unlockLevel", { n: u.level })
    : u.kind === "season" ? t("unlockSeason", { season: SEASONS.find(s => s.id === u.season)?.name ?? t("theSeason"), n: u.n })
    : u.kind === "tier" ? t("tierLotus", { tier: t(LOTUS_TIER_KEYS[u.tier]) }) : t("credits", { n: u.price }), [t]);
}

export function Art({ k, size, style }: { k: string; size: number; style?: object }) {
  const src = GAME_ART[k];
  return src ? <Image source={src} style={[{ width: size, height: size }, style]} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ width: size, height: size }} />;
}
/** Pointer hover for tiles and chips (web and tablets with a pointer); touch never sets it. */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  return { hovered, hoverProps: { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) } };
}
/** A selectable tile with art, a label, a status line and an optional check badge (boards A06, A07). Lifts on hover, presses in. */
export function Tile({ art, label, status, selected, worn, locked, onPress, size = 64, a11y }: {
  art?: string; label: string; status?: string; selected?: boolean; worn?: boolean; locked?: boolean; onPress(): void; size?: number; a11y?: string;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), { hovered, hoverProps } = useHover(), t = useT("game");
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label + (status ? t("sep") + status : "")} accessibilityState={{ selected: !!selected }} {...focusProps} {...hoverProps}
    style={({ pressed }) => [s.tile, { backgroundColor: selected ? theme.accentSoft : theme.card, borderColor: selected || focused ? theme.accent : hovered ? theme.mutedForeground : theme.border },
      selected && { borderWidth: 2 }, { transform: [{ scale: pressed ? 0.95 : hovered ? 1.03 : 1 }] }]}>
    {worn && <View style={[s.badge, { backgroundColor: theme.accent }]}><Icon name="checkmark" size={15} color={theme.actionForeground} /></View>}
    <View style={[s.art, { backgroundColor: theme.muted }, locked ? { opacity: 0.45 } : null]}>{art ? <Art k={art} size={size} /> : <Icon name="close" size={28} color={theme.mutedForeground} />}</View>
    {locked && <View style={[s.lock, { backgroundColor: theme.mediaControl }]}><Icon name="lock-closed" size={12} color={theme.mediaForeground} /></View>}
    <T variant="small" style={s.label} numberOfLines={2}>{label}</T>
    {!!status && <T variant="small" muted style={s.status} numberOfLines={2}>{status}</T>}
  </Pressable>;
}
export function Seg<K extends string>({ options, value, onChange, label }: { options: [K, string][]; value: K; onChange(k: K): void; label: string }) {
  const { theme } = usePreferences();
  return <View style={[s.seg, { backgroundColor: theme.muted }]} accessibilityRole="tablist" accessibilityLabel={label}>
    {options.map(([k, l]) => <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }}
      style={({ pressed }) => [s.segBtn, value === k && { backgroundColor: theme.foreground }, { opacity: pressed ? 0.8 : 1 }]}>
      <T variant="small" color={value === k ? theme.background : theme.foreground} style={{ fontWeight: "800" }} numberOfLines={1}>{l}</T></Pressable>)}
  </View>;
}
export function Grid({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.grid, style]}>{children}</View>; }
const s = StyleSheet.create({
  tile: { width: "22.5%", minWidth: 84, flexGrow: 1, maxWidth: 150, borderRadius: 18, borderWidth: 1, padding: 8, alignItems: "center", gap: 4, minHeight: 48 },
  art: { width: "100%", aspectRatio: 1, maxHeight: 92, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", zIndex: 2 },
  lock: { position: "absolute", top: 12, left: 12, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "800", textAlign: "center" },
  status: { textAlign: "center", fontSize: 11 },
  seg: { flexDirection: "row", borderRadius: 999, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
