import { View } from "react-native";
import type { useNearbyLocation } from "../../hooks/useNearbyLocation";
import { MarketModal } from "../market/MarketChrome";
import { Button, Icon, T, common } from "../ui";

export function LocationFeedback({ nearby }: { nearby: Pick<ReturnType<typeof useNearbyLocation>, "error" | "busy" | "recover" | "recoveryLabel" | "dismiss"> }) {
  return <MarketModal visible={!!nearby.error} onClose={nearby.dismiss} label="Use my location">
    <View testID="location-feedback" style={[common.row, { alignItems: "flex-start" }]}>
    <Icon name="locate-outline" size={22} />
    <T variant="small" style={common.flex} accessibilityLiveRegion="polite">{nearby.error}</T>
    </View>
    {!!nearby.recoveryLabel && <Button label={nearby.recoveryLabel === "Settings" ? "Open location settings" : "Try location again"}
      icon={nearby.recoveryLabel === "Settings" ? "settings-outline" : "locate-outline"} loading={nearby.busy} onPress={() => void nearby.recover()} />}
    <Button label="Keep current search" variant="secondary" onPress={nearby.dismiss} />
  </MarketModal>;
}
