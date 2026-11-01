import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { T, common } from "../ui";
import { StatusPill, type Tone } from "../GroupedList";
import { ItemArt } from "./Glint";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { CollectionArt } from "../../config/collection-art";
import { badgeArt, type BadgeTier, type Rarity } from "../../config/collection";
import type collectionMessages from "../../i18n/en/collection";

/** Rarity and tier pills use the app's status tones, so they follow every palette and mode. */
export const rarityTone: Record<Rarity, Tone> = { common: "muted", rare: "accent", epic: "accent", legend: "warning" };
export const tierTone: Record<BadgeTier, Tone> = { bronze: "accent", silver: "muted", gold: "warning", mythic: "warning" };

/** The selected item, large, on a soft spotlight, with its name, pills and whatever the tab adds below. */
export function FeatureCard({ art, pulse, dim, inside, title, pills, children }: PropsWithChildren<{
  art: CollectionArt | undefined; pulse: number; dim?: boolean; inside?: (size: number) => ReactNode; title: string; pills: [string, Tone][];
}>) {
  const { theme } = usePreferences(), size = 188, hole = art?.hole;
  return <View style={{ backgroundColor: theme.muted, borderRadius: 20, padding: 16, gap: 10, alignItems: "center" }}>
    <View style={{ width: 220, height: 220, borderRadius: 110, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }}>
      <ItemArt art={art} size={size} pulse={pulse} loop dim={dim} inside={hole && inside ? inside((hole[2] / 100) * size) : undefined} />
    </View>
    <T variant="title" style={[common.bold, { textAlign: "center" }]} accessibilityRole="header">{title}</T>
    <View style={[common.row, { gap: 6, flexWrap: "wrap", justifyContent: "center" }]}>{pills.map(([label, tone]) => <StatusPill key={label} label={label} tone={tone} />)}</View>
    {children}
  </View>;
}

/** Three tiles a row, sized to the space the screen gives them. */
export function TileGrid({ children }: { children: (width: number) => ReactNode }) {
  const [width, setWidth] = useState(0), gap = 8;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Tiles in a row stretch to the tallest, so names on one or two lines keep the lines under them level.
  return <View onLayout={onLayout} style={[common.row, { flexWrap: "wrap", gap, alignItems: "stretch" }]}>{width > 0 && children((width - gap * 2) / 3)}</View>;
}

/** One item in the grid: picture, name and one line (price, state or progress). */
export function Tile({ width, art, pulse, dim, inside, name, sub, subTone, selected, onPress, label, bar }: {
  width: number; art: CollectionArt | undefined; pulse: number; dim?: boolean; inside?: (size: number) => ReactNode; name: string; sub: string;
  subTone?: "success" | "muted"; selected: boolean; onPress: () => void; label: string; bar?: number;
}) {
  const { theme } = usePreferences(), size = width * 0.72, hole = art?.hole;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => ({ width, borderRadius: 16, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.accent : theme.border,
      backgroundColor: selected ? theme.accentSoft : theme.card, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", gap: 4, opacity: pressed ? 0.85 : 1 })}>
    <ItemArt art={art} size={size} pulse={pulse} dim={dim} inside={hole && inside ? inside((hole[2] / 100) * size) : undefined} />
    <View style={{ flexGrow: 1, justifyContent: "center" }}><T variant="small" numberOfLines={2} style={[common.bold, { textAlign: "center" }]}>{name}</T></View>
    <T variant="caption" color={subTone === "success" ? theme.success : theme.mutedForeground} numberOfLines={1}>{sub}</T>
    {bar !== undefined && <View style={{ width: "70%", height: 4, borderRadius: 2, backgroundColor: theme.muted, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(bar * 100)}%`, height: 4, backgroundColor: theme.accent }} /></View>}
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
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.card, overflow: "hidden" }}>
      <View style={{ width: `${Math.min(100, Math.round((done / of) * 100))}%`, height: 6, backgroundColor: full ? theme.success : theme.accent }} />
    </View>
  </View>;
}

/** The badges a member chose to show, small, in a row under their name. */
export function BadgeRow({ ids }: { ids: string[] }) {
  const t = useT("collection"), names = ids.map(id => t(("badge_" + id) as keyof typeof collectionMessages) as string);
  if (!ids.length) return null;
  return <View style={[common.row, { gap: 6 }]} accessible accessibilityLabel={t("tabBadges") + ": " + names.join(", ")}>
    {ids.map(id => <ItemArt key={id} art={badgeArt(id)} size={30} loop />)}
  </View>;
}
