import { Image, type ImageProps } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View, type ImageSourcePropType } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { apiUrl } from "../../utils/api-url";
import { Icon, T, type IconName } from "../ui";
import { PhotoBlend } from "./PhotoBlend";

/**
 * `source` is a photo bundled with the app; `fallback` names what a photo-less item is (a recipe's category);
 * `emptyIcon` draws a plain tile with that icon when there is no photo at all (a failed photo still says so).
 * `thumbhash` draws a soft preview of the photo at once, until the photo itself fades in.
 */
export function CataloguePhotoBackdrop({ path, source, thumbhash, fallback, emptyIcon, enabled, panelHeight }: {
  path?: string; source?: ImageSourcePropType; thumbhash?: string; fallback?: string; emptyIcon?: IconName; enabled: boolean; panelHeight: number;
}) {
  const { theme, reducedMotion } = usePreferences();
  const [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(false), [height, setHeight] = useState(260), [attempt, setAttempt] = useState(0);
  // Leaving the screen ends a failed attempt (and unloads the photo), so coming back tries again at once.
  const [shown, setShown] = useState(enabled);
  if (enabled !== shown) { setShown(enabled); if (!enabled) { setFailed(false); setLoaded(false); } }
  let url: string | undefined;
  try { if (path) url = apiUrl(path); } catch { /* Missing API configuration uses the fallback. */ }
  // A failed photo on screen tries again shortly, e.g. after a dropped connection.
  useEffect(() => {
    if (!failed || !url || !enabled) return;
    const timer = setTimeout(() => { setFailed(false); setLoaded(false); setAttempt(n => n + 1); }, 15000);
    return () => clearTimeout(timer);
  }, [failed, url, enabled]);
  const start = panelHeight > 0 ? Math.max(0, height - panelHeight + 8 - 32) : height;
  const fail = () => setFailed(true);
  // A bundled photo is used unless it failed to load; a failed or missing photo shows the fallback name when there is one.
  // Our photos never change at a path, so expo-image keeps them on disk and a card shown again draws straight away.
  // Bundled photos are require() numbers; React Native types them with readonly arrays that expo-image 58 does not take.
  const image = (failed ? undefined : source ?? (url && enabled ? { uri: url } : undefined)) as ImageProps["source"];
  const placeholder = !failed && !source && thumbhash ? { thumbhash } : undefined;
  // The blurred copy asks for the photo only once the sharp one has it, so the photo is downloaded once and then read from cache.
  const photo = (blurred: boolean) => <Image key={attempt} source={(blurred && !loaded ? null : image) ?? null} placeholder={placeholder} placeholderContentFit="cover"
    contentFit="cover" cachePolicy="memory-disk" recyclingKey={path} transition={reducedMotion ? 0 : 150} blurRadius={blurred ? 5 : undefined}
    style={StyleSheet.absoluteFill} accessible={false} alt="" onLoad={blurred ? undefined : () => setLoaded(true)} onError={fail} />;
  // While a photo loads the card shows its colour preview (or the plain dark frame), never a "Loading" caption. A photo that cannot
  // load shows the same tile as a place without one.
  const tile = (icon: IconName) => <View testID="photo-empty-tile" style={StyleSheet.absoluteFill}>
    <View style={[StyleSheet.absoluteFill, s.tint, { backgroundColor: theme.accent }]} />
    <View style={[panelHeight > 0 ? s.fallback : [StyleSheet.absoluteFill, s.centred], s.emptyIcon]}>
      <Icon name={icon} size={56} color={theme.mediaMutedForeground} />
    </View>
  </View>;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[StyleSheet.absoluteFill, { backgroundColor: theme.mediaSurface }]}>
    {/* Until a photo without a colour preview arrives, the card shows its place tile, never an empty dark frame (owner, 28 Oct 2026). */}
    {image || placeholder ? <>{!placeholder && !source && tile(emptyIcon ?? "image-outline")}{photo(false)}
      {panelHeight > 0 && <View testID="photo-soft-blur" style={{ position: "absolute", left: 0, right: 0, top: start, bottom: 0, overflow: "hidden" }}>
        <PhotoBlend fadeAt={32 / Math.max(32, height - start)}><View style={{ position: "absolute", top: -start, height, left: 0, right: 0 }}>
          {photo(true)}
        </View></PhotoBlend>
      </View>}</> : emptyIcon && !source && (!path || failed) ? tile(emptyIcon)
    : fallback && (!url || failed) ? <View style={s.fallback}>
      <T variant="title" color={theme.mediaMutedForeground} numberOfLines={2} style={s.fallbackText}>{fallback}</T>
    </View> : !url || failed ? tile("image-outline") : null}
  </View>;
}
const s = StyleSheet.create({
  fallback: { position: "absolute", top: 0, left: 16, right: 16, height: 156, alignItems: "center", justifyContent: "center" },
  fallbackText: { textAlign: "center", opacity: 0.8 },
  tint: { opacity: 0.18 },
  centred: { alignItems: "center", justifyContent: "center" },
  emptyIcon: { opacity: 0.72 },
});
