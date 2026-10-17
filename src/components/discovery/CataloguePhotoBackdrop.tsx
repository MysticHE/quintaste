import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useExploreLocal } from "../../state/ExploreLocal";
import { usePreferences } from "../../state/Preferences";
import { subscribeCataloguePhoto } from "../../services/catalogue-photo-cache";
import { apiUrl } from "../../utils/api-url";
import { Icon, T } from "../ui";
import { PhotoBlend } from "./PhotoBlend";

export function CataloguePhotoBackdrop({ path, enabled, panelHeight, nameHeight }: {
  path?: string; enabled: boolean; panelHeight: number; nameHeight: number;
}) {
  const { theme } = usePreferences(), { offline } = useExploreLocal();
  const [state, setState] = useState<{ uri?: string; failed: boolean }>({ failed: false });
  const [height, setHeight] = useState(260);
  let url: string | undefined;
  try { if (path) url = apiUrl(path); } catch { /* Missing API configuration uses the fallback. */ }
  useEffect(() => {
    if (url && enabled) return subscribeCataloguePhoto(url, offline, setState);
  }, [url, enabled, offline]);
  const start = panelHeight > 0 ? Math.max(0, height - panelHeight + 8 - 32) : height;
  const fail = () => setState({ failed: true });
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[StyleSheet.absoluteFill, { backgroundColor: theme.mediaSurface }]}>
    {state.uri ? <><Image source={{ uri: state.uri }} cachePolicy="none" contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
      {panelHeight > 0 && <View testID="photo-soft-blur" style={{ position: "absolute", left: 0, right: 0, top: start, bottom: 0, overflow: "hidden" }}>
        <PhotoBlend fadeAt={32 / Math.max(32, height - start)}><View style={{ position: "absolute", top: -start, height, left: 0, right: 0 }}>
          <Image source={{ uri: state.uri }} cachePolicy="none" contentFit="cover" blurRadius={5} style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
        </View></PhotoBlend>
      </View>}</> : <View style={{ position: "absolute", top: 76, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name="image-outline" color={theme.mediaMutedForeground} />
      <T variant="small" color={theme.mediaMutedForeground}>{!url || state.failed ? "Photo unavailable" : "Loading photo…"}</T>
    </View>}
  </View>;
}
