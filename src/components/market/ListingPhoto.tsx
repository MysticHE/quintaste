import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, T, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import { useT } from "../../i18n";

/** Image source for a server photo path (with the session), or any other URI as given. */
export function useListingSource() {
  const headers = useSessionHeaders();
  return (uri?: string | null) => !uri ? undefined : uri.startsWith("/api/") ? photoSource(uri, headers) : { uri };
}
/** Square listing photo; label, seal and date photos are shown whole. */
/** `icon` replaces the empty-photo picture with the kind of thing (an order, a shop) when there is no photo or it cannot load. */
export function ListingPhoto({ path, contain = false, label, round = 16, icon }: { path?: string | null; contain?: boolean; label?: string; round?: number; icon?: IconName }) {
  const { theme } = usePreferences(), source = useListingSource(), t = useT("market");
  const [failed, setFailed] = useState(""), broken = !!path && failed === path;
  return <View style={[s.frame, { backgroundColor: theme.muted, borderRadius: round }]}>
    {/* recyclingKey: a list cell reused for another item clears the old photo instead of showing it until the new one loads. */}
    {path && !broken ? <Image source={source(path)} recyclingKey={path} contentFit={contain ? "contain" : "cover"} style={StyleSheet.absoluteFill} onError={() => setFailed(path)}
      accessible={!!label} accessibilityLabel={label} transition={120} />
      : <View style={s.empty}><Icon name={icon ?? "image-outline"} size={round > 12 ? 30 : 20} color={icon ? theme.accent : undefined} />
        {round > 12 && !icon && <T variant="small" muted>{t(broken ? "photoUnavailable" : "noPhoto")}</T>}</View>}
  </View>;
}
export function ListingThumb({ path, size = 44, icon }: { path?: string | null; size?: number; icon?: IconName }) {
  return <View style={{ width: size, height: size }}><ListingPhoto path={path} round={10} icon={icon} /></View>;
}
const s = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 1, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
});
