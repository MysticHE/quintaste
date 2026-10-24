import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import type { SocialPlace } from "../../types/community";

/** A catalogue place's cover, or a neutral tile. */
export function PlaceThumb({ place, size = 48, radius = 12 }: { place: Pick<SocialPlace, "photo"> | null; size?: number | "fill"; radius?: number }) {
  const { theme } = usePreferences(), headers = useSessionHeaders(), [failed, setFailed] = useState(false), path = place?.photo ?? null;
  const source = useMemo(() => photoSource(path, headers), [path, headers]);
  const box = size === "fill" ? StyleSheet.absoluteFill : { width: size, height: size };
  return <View style={[box, { borderRadius: radius, overflow: "hidden", backgroundColor: theme.muted, alignItems: "center", justifyContent: "center" }]}>
    {source && !failed ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} accessible={false} />
      : <Icon name="restaurant-outline" size={20} color={theme.mutedForeground} />}
  </View>;
}
