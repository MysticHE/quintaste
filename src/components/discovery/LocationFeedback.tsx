import { View } from "react-native";
import type { useNearbyLocation } from "../../hooks/useNearbyLocation";
import { MarketModal } from "../market/MarketChrome";
import { Button, Icon, T, common } from "../ui";
import { useT } from "../../i18n";

export function LocationFeedback({ nearby }: { nearby: Pick<ReturnType<typeof useNearbyLocation>, "error" | "busy" | "recover" | "recoveryLabel" | "dismiss"> }) {
  const t = useT("explore");
  return <MarketModal visible={!!nearby.error} onClose={nearby.dismiss} label={t("useMyLocation")}>
    <View testID="location-feedback" style={[common.row, { alignItems: "flex-start" }]}>
    <Icon name="locate-outline" size={22} />
    <T variant="small" style={common.flex} accessibilityLiveRegion="polite">{nearby.error}</T>
    </View>
    {!!nearby.recoveryLabel && <Button label={t(nearby.recoveryLabel === "Settings" ? "openLocationSettings" : "tryLocationAgain")}
      icon={nearby.recoveryLabel === "Settings" ? "settings-outline" : "locate-outline"} loading={nearby.busy} onPress={() => void nearby.recover()} />}
    <Button label={t("keepCurrentSearch")} variant="secondary" onPress={nearby.dismiss} />
  </MarketModal>;
}
