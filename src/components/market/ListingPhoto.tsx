import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, T } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";

/** Image source for a server photo path (with the session), or any other URI as given. */
export function useListingSource() {
  const headers = useSessionHeaders();
  return (uri?: string | null) => !uri ? undefined : uri.startsWith("/api/") ? photoSource(uri, headers) : { uri };
}
/** Square listing photo; label, seal and date photos are shown whole. */
export function ListingPhoto({ path, contain = false, label, round = 16 }: { path?: string | null; contain?: boolean; label?: string; round?: number }) {
  const { theme } = usePreferences(), source = useListingSource();
  const [failed, setFailed] = useState(""), broken = !!path && failed === path;
  return <View style={[s.frame, { backgroundColor: theme.muted, borderRadius: round }]}>
    {path && !broken ? <Image source={source(path)} contentFit={contain ? "contain" : "cover"} style={StyleSheet.absoluteFill} onError={() => setFailed(path)}
      accessible={!!label} accessibilityLabel={label} transition={120} />
      : <View style={s.empty}><Icon name="image-outline" size={round > 12 ? 30 : 20} />{round > 12 && <T variant="small" muted>{broken ? "Photo unavailable" : "No photo"}</T>}</View>}
  </View>;
}
export function ListingThumb({ path, size = 44 }: { path?: string | null; size?: number }) {
  return <View style={{ width: size, height: size }}><ListingPhoto path={path} round={10} /></View>;
}
const s = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 1, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
});
