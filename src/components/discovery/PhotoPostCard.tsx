import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { photoCardBleed } from "../../theme/layout";
import { Icon, T, common, type IconName } from "../ui";
import { CataloguePhotoBackdrop } from "./CataloguePhotoBackdrop";
import { usePhotoVisibility } from "./PhotoScrollView";

/**
 * The shared photo post for Explore places and Cook recipes: the photo fills the card, the title and facts sit in white
 * on its blurred lower part, a chip top-left, and like / save / share stacked down the right edge (`side`).
 * The whole photo opens the item; the corner controls and strip work on their own.
 */
export function PhotoPostCard({ photo, title, label, hint, onPress, topLeft, topRight, side, footer, children, testID, titleTestID = "post-card-title" }: {
  photo: { path?: string; source?: ImageSourcePropType; fallback?: string }; title: string; label: string; hint: string; onPress: () => void;
  topLeft?: ReactNode; topRight?: ReactNode; side?: ReactNode; footer?: ReactNode; children?: ReactNode; testID?: string; titleTestID?: string;
}) {
  const { theme, textMultiplier } = usePreferences(), visibility = usePhotoVisibility(true);
  const [focused, setFocused] = useState(false), [pressed, setPressed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(140), [nameHeight, setNameHeight] = useState(24);
  // Start above the first line so multi-line titles retain contrast at larger text sizes.
  const fadeHeight = Math.max(32, panelHeight - 8 + 32);
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: focused || pressed ? theme.accent : theme.border }]}>
    <View testID={testID} ref={node => visibility.attach(node)} onLayout={visibility.onLayout} collapsable={false} style={{ backgroundColor: theme.mediaSurface }}>
      <CataloguePhotoBackdrop key={(photo.path || (photo.source ? "bundled" : "missing")) + visibility.visible} path={photo.path} source={photo.source} fallback={photo.fallback}
        enabled={visibility.visible} panelHeight={panelHeight} nameHeight={nameHeight} />
      <View pointerEvents="none" style={[s.blend, { height: fadeHeight }]} testID="photo-blend">
        <LinearGradient colors={theme.photoBlend} locations={[0, 32 / fadeHeight, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <View style={{ height: 156 }} />
        <View onLayout={event => setPanelHeight(event.nativeEvent.layout.height)} style={[s.information, !!side && s.besideSide]}>
          <T testID={titleTestID} variant="place" style={[s.name, { fontSize: 20 * textMultiplier, lineHeight: 26 * textMultiplier }]} color={theme.mediaForeground}
            onLayout={event => setNameHeight(event.nativeEvent.layout.height)}>{title}</T>
          {children}
        </View>
      </View>
      {topLeft && <View style={s.topLeft}>{topLeft}</View>}
      {topRight && <View style={s.topRight} pointerEvents="box-none">{topRight}</View>}
      {side && <View style={s.side} pointerEvents="box-none">{side}</View>}
    </View>
    {footer && <View style={s.footer}>{footer}</View>}
  </View>;
}
/** One white fact on the photo: an icon and its text. */
export function PostFact({ icon, children, iconColor, shrink = false }: { icon: IconName; children: ReactNode; iconColor?: string; shrink?: boolean }) {
  const { theme } = usePreferences();
  return <View style={[s.line, shrink && { flexShrink: 1 }]}><Icon name={icon} size={14} color={iconColor ?? theme.mediaForeground} />
    <T variant="caption" style={shrink ? { flexShrink: 1 } : common.flex} color={theme.mediaForeground}>{children}</T></View>;
}
/** Facts that share one wrapping row. */
export const PostFacts = ({ children }: { children: ReactNode }) => <View style={s.facts}>{children}</View>;
/** A small read-only chip for the top-left corner, matching the Menu chip. */
export function PostChip({ icon, label }: { icon: IconName; label: string }) {
  const { theme } = usePreferences();
  return <View style={[s.chip, { backgroundColor: theme.mediaControl, borderColor: theme.mediaDivider }]}>
    <Icon name={icon} size={18} color={theme.mediaForeground} /><T variant="small" color={theme.mediaForeground} style={common.bold}>{label}</T>
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", borderWidth: 1, ...photoCardBleed },
  blend: { position: "absolute", bottom: 0, left: 0, right: 0 },
  information: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 3 },
  name: { fontFamily: fontNames.bold },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  facts: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 3 },
  topLeft: { position: "absolute", top: 4, left: 4 },
  topRight: { position: "absolute", top: 4, right: 4, flexDirection: "row", gap: 6 },
  // The stacked actions sit on the right edge; the text keeps clear of them.
  side: { position: "absolute", right: 4, bottom: 8 },
  besideSide: { paddingRight: 64 },
  chip: { minHeight: 42, margin: 3, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  footer: { paddingHorizontal: 4, paddingVertical: 2 },
});
