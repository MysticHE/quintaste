import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { LivePhoto } from "../../types/discovery";
import { usePhotoData } from "../../hooks/usePhotoData";
import { usePreferences } from "../../state/Preferences";
import { Icon, T } from "../ui";
import { PhotoBlend } from "./PhotoBlend";

export function GooglePhotoBackdrop({ photo, expiresAt, panelHeight, nameHeight, panelInset = 12, enabled = true }: {
  photo?: LivePhoto; expiresAt: number; enabled?: boolean; panelHeight: number; nameHeight: number; panelInset?: number;
}) {
  const { theme } = usePreferences(), { uri, failed, fail } = usePhotoData(photo?.url, expiresAt, enabled);
  const [height, setHeight] = useState(panelHeight * 2);
  const start = Math.min(height - 24, Math.max(0, height - panelHeight + panelInset + nameHeight / 2));
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={[StyleSheet.absoluteFill, { backgroundColor: theme.mediaSurface }]}
    onLayout={event => setHeight(event.nativeEvent.layout.height)}>
    {uri ? <><Image source={{ uri }} cachePolicy="none" contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
      <View testID="photo-soft-blur" style={{ position: "absolute", left: 0, right: 0, top: start, bottom: 0, overflow: "hidden" }}>
        <PhotoBlend fadeAt={24 / Math.max(24, height - start)}>
          <View style={{ position: "absolute", top: -start, height, left: 0, right: 0 }}>
            <Image source={{ uri }} cachePolicy="none" contentFit="cover" blurRadius={2} style={StyleSheet.absoluteFill} accessible={false} alt="" onError={fail} />
          </View>
        </PhotoBlend>
      </View></> : failed || !photo ? <View style={s.placeholder}>
        <Icon name="image-outline" color={theme.mediaMutedForeground} /><T variant="small" color={theme.mediaMutedForeground} numberOfLines={1} ellipsizeMode="tail"
          style={{ minWidth: 0, flexShrink: 1 }}>Photo unavailable</T>
      </View> : <ActivityIndicator style={s.spinner} color={theme.mediaForeground} />}
  </View>;
}

const s = StyleSheet.create({ placeholder: { position: "absolute", top: 60, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 6 },
  spinner: { position: "absolute", top: 36, alignSelf: "center" } });
