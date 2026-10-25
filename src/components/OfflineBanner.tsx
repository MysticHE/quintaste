import { useNetworkState } from "expo-network";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Icon, T } from "./ui";
import { useT } from "../i18n";

/** How long the connection must stay down before the banner shows, so a reconnect or the start-up check never flashes it. */
const SETTLE_MS = 2500;

/**
 * The app's one offline notice, in the screen's pinned bottom area beside other notices, so it never pushes the page. Screens show
 * what is saved without their own offline captions.
 */
export function OfflineBanner() {
  const { theme } = usePreferences(), t = useT("common"), focused = useIsFocused(), network = useNetworkState();
  const down = network.isConnected === false || network.isInternetReachable === false, [settled, setSettled] = useState(false);
  if (!down && settled) setSettled(false);
  useEffect(() => {
    if (!down) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [down]);
  if (!focused || !down || !settled) return null;
  return <View accessibilityLiveRegion="polite" style={[s.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Icon name="cloud-offline-outline" size={18} color={theme.mutedForeground} />
    <T variant="small" muted style={s.text}>{t("offline")}</T>
  </View>;
}
const s = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 16, margin: 8, paddingHorizontal: 12, paddingVertical: 8 },
  text: { flex: 1 },
});
