import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { usePreferences } from "../state/Preferences";
import { photoCardBleed } from "../theme/layout";

/**
 * Still loading shapes the size of what replaces them, so a page does not jump when its content arrives.
 * They never shimmer: product screens stay still while loading (owner design rule, no perpetual motion).
 */
export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme } = usePreferences();
  return <View style={[s.block, { backgroundColor: theme.muted }, style]} />;
}
/** One spoken "Loading" for the whole group; the shapes themselves are hidden from screen readers. */
export function LoadingShapes({ label, children, grid = false, testID }: { label: string; children: ReactNode; grid?: boolean; testID?: string }) {
  return <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden style={grid ? s.grid : s.stack}>{children}</View>
  </View>;
}
/** A photo post (Explore place or recipe card): 156-point clear photo, then the title and facts panel. */
export function PostCardSkeleton({ edgeToEdge = false }: { edgeToEdge?: boolean } = {}) {
  const { theme, textMultiplier } = usePreferences();
  return <View style={[s.card, edgeToEdge && { marginHorizontal: 0, borderRadius: 0, borderWidth: 0 }, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <View style={{ height: 156, backgroundColor: theme.muted }} />
    <View style={[s.panel, { minHeight: 104 * textMultiplier }]}>
      <SkeletonBlock style={{ width: "62%", height: 20 * textMultiplier }} />
      <SkeletonBlock style={{ width: "80%", height: 12 * textMultiplier }} />
      <SkeletonBlock style={{ width: "46%", height: 12 * textMultiplier }} />
    </View>
  </View>;
}
/** A grid tile: a photo (profile tiles 1.12, Market cards square), a title line and a note line. */
export function GridTileSkeleton({ ratio = 1.12 }: { ratio?: number }) {
  const { textMultiplier } = usePreferences();
  return <View style={s.tile}>
    <SkeletonBlock style={{ aspectRatio: ratio, borderRadius: 12 }} />
    <SkeletonBlock style={{ width: "78%", height: 14 * textMultiplier, marginTop: 6 }} />
    <SkeletonBlock style={{ width: "50%", height: 12 * textMultiplier }} />
  </View>;
}
/** A list row with a leading picture and two lines (chats, people, events). */
export function RowSkeleton({ leading = true }: { leading?: boolean } = {}) {
  const { textMultiplier } = usePreferences();
  return <View style={s.row}>
    {leading && <SkeletonBlock style={s.avatar} />}
    <View style={s.lines}>
      <SkeletonBlock style={{ width: "55%", height: 14 * textMultiplier }} />
      <SkeletonBlock style={{ width: "80%", height: 12 * textMultiplier }} />
    </View>
  </View>;
}
/** Repeats one shape `count` times inside a single LoadingShapes group; `columns` lays them out like the grid they stand in for. */
export function SkeletonList({ label, count, shape, columns = 1, testID }: { label: string; count: number; shape: () => ReactNode; columns?: number; testID?: string }) {
  const grid = columns > 1, width = `${(100 - (columns - 1) * 4) / columns}%` as const;
  return <LoadingShapes label={label} testID={testID} grid={grid}>
    {Array.from({ length: count }, (_, index) => <View key={index} style={grid ? { width } : undefined}>{shape()}</View>)}
  </LoadingShapes>;
}
const s = StyleSheet.create({
  block: { borderRadius: 8 },
  stack: { gap: 12 },
  card: { borderRadius: 22, overflow: "hidden", borderWidth: 1, ...photoCardBleed },
  panel: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 8 },
  tile: { gap: 4, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  lines: { flex: 1, gap: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
