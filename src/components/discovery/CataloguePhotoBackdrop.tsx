import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View, type ImageSourcePropType } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { subscribeCataloguePhoto } from "../../services/catalogue-photo-cache";
import { apiUrl } from "../../utils/api-url";
import { Icon, T } from "../ui";
import { PhotoBlend } from "./PhotoBlend";

/** `source` is a photo bundled with the app; `fallback` names what a photo-less item is (a recipe's category). */
export function CataloguePhotoBackdrop({ path, source, fallback, enabled, panelHeight, nameHeight }: {
  path?: string; source?: ImageSourcePropType; fallback?: string; enabled: boolean; panelHeight: number; nameHeight: number;
}) {
  const { theme } = usePreferences();
  const [state, setState] = useState<{ uri?: string; failed: boolean }>({ failed: false });
  const [height, setHeight] = useState(260), [attempt, setAttempt] = useState(0);
  let url: string | undefined;
  try { if (path) url = apiUrl(path); } catch { /* Missing API configuration uses the fallback. */ }
  useEffect(() => {
    if (url && enabled) return subscribeCataloguePhoto(url, setState);
  }, [url, enabled, attempt]);
  // A failed photo on screen tries again shortly, e.g. after a dropped connection.
  useEffect(() => {
    if (!state.failed || !url || !enabled) return;
    const timer = setTimeout(() => setAttempt(n => n + 1), 15000);
    return () => clearTimeout(timer);
  }, [state.failed, url, enabled]);
  const start = panelHeight > 0 ? Math.max(0, height - panelHeight + 8 - 32) : height;
  const fail = () => setState({ failed: true });
  // A bundled photo is used unless it failed to load; a failed or missing photo shows the fallback name when there is one.
  const image = state.failed ? undefined : source ?? (state.uri ? { uri: state.uri } : undefined);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[StyleSheet.absoluteFill, { backgroundColor: theme.mediaSurface }]}>
    {image ? <><Image source={image} cachePolicy="none" contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
      {panelHeight > 0 && <View testID="photo-soft-blur" style={{ position: "absolute", left: 0, right: 0, top: start, bottom: 0, overflow: "hidden" }}>
        <PhotoBlend fadeAt={32 / Math.max(32, height - start)}><View style={{ position: "absolute", top: -start, height, left: 0, right: 0 }}>
          <Image source={image} cachePolicy="none" contentFit="cover" blurRadius={5} style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
        </View></PhotoBlend>
      </View>}</> : fallback && (!url || state.failed) ? <View style={s.fallback}>
      <T variant="title" color={theme.mediaMutedForeground} numberOfLines={2} style={s.fallbackText}>{fallback}</T>
    </View> : <View style={{ position: "absolute", top: 76, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name="image-outline" color={theme.mediaMutedForeground} />
      <T variant="small" color={theme.mediaMutedForeground}>{!url || state.failed ? "Photo unavailable" : "Loading photo…"}</T>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  fallback: { position: "absolute", top: 0, left: 16, right: 16, height: 156, alignItems: "center", justifyContent: "center" },
  fallbackText: { textAlign: "center", opacity: 0.8 },
});
