import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { T, common } from "../ui";
import { StatusPill, type Tone } from "../GroupedList";
import { ItemArt } from "./Glint";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { CollectionArt } from "../../config/collection-art";
import { badgeArt, type BadgeTier, type Rarity } from "../../config/collection";
import type collectionMessages from "../../i18n/en/collection";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { ProgressLine } from "./CollectionUI";

/** Rarity and tier pills use the app's status tones, so they follow every palette and mode. */
export const rarityTone: Record<Rarity, Tone> = { common: "muted", rare: "accent", epic: "accent", legend: "warning" };
export const tierTone: Record<BadgeTier, Tone> = { bronze: "accent", silver: "muted", gold: "warning", mythic: "warning" };

/** A compact item preview retains the original artwork without the old oversized spotlight. */
export function FeatureCard({ art, dim, inside, title, pills, hideTitle = false, children }: PropsWithChildren<{
  art: CollectionArt | undefined; dim?: boolean; inside?: (size: number) => ReactNode; title: string; pills: [string, Tone][]; hideTitle?: boolean;
}>) {
  const { theme } = usePreferences(), size = 92, hole = art?.hole;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <ItemArt art={art} size={size} fx dim={dim} inside={hole && inside ? inside((hole[2] / 100) * size) : undefined} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        {!hideTitle && <T variant="subtitle" style={common.bold} accessibilityRole="header">{title}</T>}
        <View style={[common.row, { gap: 6, flexWrap: "wrap" }]}>{pills.map(([label, tone]) => <StatusPill key={label} label={label} tone={tone} />)}</View>
      </View>
    </View>
    <View style={{ height: 1, backgroundColor: theme.divider }} />
    {children}
  </View>;
}

/** Two collection items on phones; larger text gets a single column. Gift pickers retain three. */
export function TileGrid({ children, columns = 3 }: { children: (width: number) => ReactNode; columns?: number }) {
  const [width, setWidth] = useState(0), gap = 8, { textMultiplier } = usePreferences(), { fontScale } = useWindowDimensions();
  const count = textMultiplier * fontScale >= 1.3 ? 1 : width >= 580 ? 3 : columns;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Tiles in a row stretch to the tallest, so names on one or two lines keep the lines under them level.
  return <View onLayout={onLayout} style={[common.row, { flexWrap: "wrap", gap, alignItems: "stretch" }]}>{width > 0 && children((width - gap * (count - 1)) / count)}</View>;
}

/** One item in the grid: picture, name and one line (price, state or progress). */
export function Tile({ width, art, pulse, dim, inside, name, sub, subTone, selected, onPress, label, bar, disabled = false }: {
  width: number; art: CollectionArt | undefined; pulse: number; dim?: boolean; inside?: (size: number) => ReactNode; name: string; sub: string;
  subTone?: "success" | "muted"; selected: boolean; onPress: () => void; label: string; bar?: number; disabled?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), size = Math.min(96, width * 0.62), hole = art?.hole;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} {...focusProps}
    style={({ pressed }) => [{ width, borderRadius: 12, borderWidth: 2, borderColor: selected || focused ? theme.accent : theme.transparent,
      backgroundColor: selected || pressed ? theme.accentSoft : theme.card, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", gap: 4, opacity: pressed ? 0.85 : 1 },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <ItemArt art={art} size={size} pulse={pulse} dim={dim} inside={hole && inside ? inside((hole[2] / 100) * size) : undefined} />
    <View style={{ flexGrow: 1, justifyContent: "center" }}><T variant="small" style={[common.bold, { textAlign: "center" }]}>{name}</T></View>
    <T variant="caption" color={subTone === "success" ? theme.success : theme.mutedForeground} style={{ textAlign: "center" }}>{sub}</T>
    {bar !== undefined && <View style={{ width: "70%", height: 4, borderRadius: 2, backgroundColor: theme.muted, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, Math.round(bar * 100)))}%`, height: 4, backgroundColor: theme.accent }} /></View>}
  </Pressable>;
}

/** One badge task: what it asks, a bar and "3 of 5". */
export function TaskBar({ label, done, of }: { label: string; done: number; of: number }) {
  const { theme } = usePreferences(), t = useT("collection"), full = done >= of;
  return <View style={{ alignSelf: "stretch", gap: 4 }} accessible accessibilityLabel={label + ", " + t("progress", { done, of })}>
    <View style={[common.spread, { gap: 8 }]}>
      <T variant="small" style={common.flex}>{label}</T>
      <T variant="small" style={common.bold} color={full ? theme.success : theme.mutedForeground}>{full ? t("done") : t("progress", { done, of })}</T>
    </View>
    <ProgressLine done={done} of={of} />
  </View>;
}

/** The badges a member chose to show, small, in a row under their name. */
export function BadgeRow({ ids }: { ids: string[] }) {
  const t = useT("collection"), names = ids.map(id => t(("badge_" + id) as keyof typeof collectionMessages) as string);
  if (!ids.length) return null;
  return <View style={[common.row, { gap: 6, flexWrap: "wrap" }]} accessible accessibilityLabel={t("tabBadges") + ": " + names.join(", ")}>
    {ids.map(id => <ItemArt key={id} art={badgeArt(id)} size={30} fx />)}
  </View>;
}
