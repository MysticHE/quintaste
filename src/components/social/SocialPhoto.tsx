import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, T, common } from "../ui";
import { Initial } from "../GroupedList";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import type { PhotoLink } from "../../types/community";

/** A Social photo link with the session (native requests carry the cookie; photos follow the server's access rule). Stable per path. */
export function useSocialSource(path: string | null | undefined) {
  const headers = useSessionHeaders();
  return useMemo(() => photoSource(path, headers), [path, headers]);
}
/** A member's main photo thumbnail as a circle, or their initial. */
export function Avatar({ uri, name, size = 44 }: { uri: string | null | undefined; name: string; size?: number }) {
  const source = useSocialSource(uri), [failed, setFailed] = useState<string | null>(null), { theme } = usePreferences();
  if (!source || failed === uri) return <Initial name={name} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: theme.muted }}>
    <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(uri ?? null)} accessible={false} cachePolicy="memory-disk" />
  </View>;
}
/**
 * Up to six photos, one at a time: tap the right of the photo for the next, the left for the previous; segment bars show where you are.
 * Screen readers adjust it like a slider. `children` sit on the shaded lower part (name, age, area).
 */
export function PhotoCarousel({ photos, name, height, radius = 0, children }: { photos: PhotoLink[]; name: string; height: number; radius?: number; children?: ReactNode }) {
  const { theme } = usePreferences(), t = useT("social"), [index, setIndex] = useState(0), count = photos.length, at = Math.min(index, Math.max(0, count - 1));
  const source = useSocialSource(photos[at]?.url), [failed, setFailed] = useState<string | null>(null);
  const step = (by: number) => setIndex(Math.max(0, Math.min(count - 1, at + by)));
  return <View style={{ height, borderRadius: radius, overflow: "hidden", backgroundColor: theme.muted }}>
    {source && failed !== photos[at]?.url ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} onError={() => setFailed(photos[at]?.url ?? null)}
      accessible={false} cachePolicy="memory-disk" />
      : <View style={[StyleSheet.absoluteFill, s.center]}><Icon name="person-outline" size={56} color={theme.mutedForeground} /></View>}
    <LinearGradient colors={theme.photoBlend} locations={[0.45, 0.78, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
    {count > 1 && <View style={s.bars} pointerEvents="none">{photos.map((photo, i) =>
      <View key={photo.url} style={[s.bar, { backgroundColor: i === at ? theme.mediaForeground : theme.mediaDivider }]} />)}</View>}
    {count > 1 && <Pressable style={StyleSheet.absoluteFill} onPress={event => step(event.nativeEvent.locationX < 120 ? -1 : 1)}
      accessibilityRole="adjustable" accessibilityLabel={t("photosOfName", { name })} accessibilityValue={{ text: t("photoOf", { n: at + 1, total: count }) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={event => step(event.nativeEvent.actionName === "increment" ? 1 : -1)} />}
    {!!children && <View style={s.over} pointerEvents="box-none">{children}</View>}
    {!count && <T variant="small" color={theme.mediaForeground} style={s.none}>{t("noPhoto")}</T>}
  </View>;
}
/** White text for the shaded lower part of a photo. */
export function OnPhoto({ children, variant = "body", bold = false }: { children: ReactNode; variant?: "title" | "subtitle" | "body" | "small"; bold?: boolean }) {
  const { theme } = usePreferences();
  return <T variant={variant} color={theme.mediaForeground} style={bold ? common.bold : undefined} numberOfLines={1}>{children}</T>;
}
const s = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  bars: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  over: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 2 },
  none: { position: "absolute", alignSelf: "center", top: "60%" },
});
