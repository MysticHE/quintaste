import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { photoCardBleed } from "../../theme/layout";
import { Icon, T, common, type IconName } from "../ui";
import { CataloguePhotoBackdrop } from "./CataloguePhotoBackdrop";
import { FocusOutline } from "../FocusOutline";
import { usePhotoVisibility } from "./PhotoScrollView";

/**
 * The shared photo post for Explore places and Cook recipes: the photo fills the card, the title and facts sit in white
 * on its blurred lower part, a chip top-left, and like / save / share stacked down the right edge (`side`).
 * The whole photo opens the item; the corner controls and strip work on their own.
 */
export function PhotoPostCard({ photo, title, label, hint, onPress, topLeft, topRight, side, footer, children, testID, titleTestID = "post-card-title", edgeToEdge = false }: {
  photo: { path?: string; source?: ImageSourcePropType; thumbhash?: string; fallback?: string; emptyIcon?: IconName }; title: string; label: string; hint: string; onPress: () => void;
  topLeft?: ReactNode; topRight?: ReactNode; side?: ReactNode; footer?: ReactNode; children?: ReactNode; testID?: string; titleTestID?: string;
  edgeToEdge?: boolean;
}) {
  const { theme, textMultiplier } = usePreferences(), visibility = usePhotoVisibility(true);
  const [focused, setFocused] = useState(false), [pressed, setPressed] = useState(false);
  // The first guess matches a typical card (title and three fact lines), so the soft blur barely moves once the panel is measured.
  const [panelHeight, setPanelHeight] = useState(104);
  // Start above the first line so multi-line titles retain contrast at larger text sizes.
  const fadeHeight = Math.max(32, panelHeight - 8 + 32);
  // An edge-to-edge card never changes its border width: a touch while scrolling would resize the photo and leave it blank on
  // Android (owner, 28 Oct 2026). Its focus and press show as an outline drawn on top instead.
  return <View style={[s.card, edgeToEdge && s.edge, { backgroundColor: theme.card, borderColor: focused || pressed ? theme.accent : theme.border }]}>
    <View testID={testID} ref={node => visibility.attach(node)} onLayout={visibility.onLayout} collapsable={false} style={{ backgroundColor: theme.mediaSurface }}>
      {/* Leaving the screen only unloads the photo (enabled); the preview stays, so scrolling back does not flash an empty card. */}
      <CataloguePhotoBackdrop key={photo.path || (photo.source ? "bundled" : "missing")} path={photo.path} source={photo.source} thumbhash={photo.thumbhash}
        fallback={photo.fallback} emptyIcon={photo.emptyIcon} enabled={visibility.visible} panelHeight={panelHeight} />
      <View pointerEvents="none" style={[s.blend, { height: fadeHeight }]} testID="photo-blend">
        <LinearGradient colors={theme.photoBlend} locations={[0, 32 / fadeHeight, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={StyleSheet.absoluteFill}
        // An edge-to-edge card draws its press outline inside the Pressable, so a touch while scrolling never re-renders the card.
        onPressIn={edgeToEdge ? undefined : () => setPressed(true)} onPressOut={edgeToEdge ? undefined : () => setPressed(false)}>
        {({ pressed: down }) => <FocusOutline visible={edgeToEdge && down} />}
      </Pressable>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <View style={{ height: 156 }} />
        <View onLayout={event => setPanelHeight(event.nativeEvent.layout.height)} style={[s.information, !!side && s.besideSide]}>
          <T testID={titleTestID} variant="place" style={[s.name, { fontSize: 20 * textMultiplier, lineHeight: 26 * textMultiplier }]} color={theme.mediaForeground}>{title}</T>
          {children}
        </View>
      </View>
      {topLeft && <View style={s.topLeft}>{topLeft}</View>}
      {topRight && <View style={s.topRight} pointerEvents="box-none">{topRight}</View>}
      {side && <View style={s.side} pointerEvents="box-none">{side}</View>}
    </View>
    {footer && <View style={s.footer}>{footer}</View>}
    <FocusOutline visible={edgeToEdge && focused} />
  </View>;
}
/** One white fact on the photo: an icon and its text. */
export function PostFact({ icon, leading, children, iconColor, shrink = false }: { icon?: IconName; leading?: ReactNode; children: ReactNode; iconColor?: string; shrink?: boolean }) {
  const { theme } = usePreferences();
  return <View style={[s.line, shrink && { flexShrink: 1 }]}>{leading ?? (icon && <Icon name={icon} size={14} color={iconColor ?? theme.mediaForeground} />)}
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
  edge: { marginHorizontal: 0, borderRadius: 0, borderWidth: 0 },
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
