import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { ThemedSwitch } from "../GroupedList";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

/**
 * Cooking timer alerts as one on/off row. Android 12+ only offers approximate timing, so the row says so before
 * and after opting in. Phone-only: the web build has no device alerts and shows nothing.
 */
export function TimerAlertControl({ label = "Timer Alerts" }: { label?: string }) {
  const alerts = useTimerAlerts(), { readable, dirty } = useFood(), { setNotice, theme } = usePreferences();
  if (Platform.OS === "web") return null;
  const approximate = Platform.OS === "android" && Number(Platform.Version) >= 31;
  const status = alerts.permission === "denied" ? "Blocked in phone settings"
    : alerts.enabled ? (approximate || alerts.permission === "timing-unverified" ? "On · may arrive a little late" : "On")
    : approximate ? "Cooking timers · may arrive a little late" : "Cooking timers";
  const openSettings = () => void Linking.openSettings().catch(() => setNotice({ text: "Phone settings could not open.", error: true }));
  return <View>
    <View style={s.row}>
      <View style={s.icon}><Icon name="notifications-outline" size={24} color={theme.accent} /></View>
      <View style={common.flex}>
        <T style={common.bold}>{label}</T>
        <T variant="small" muted>{status}</T>
      </View>
      <ThemedSwitch label={label} value={alerts.enabled} disabled={!readable || dirty || alerts.busy} onChange={() => void alerts.toggle()} />
    </View>
    {!!alerts.error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite" style={s.note}>{alerts.error}</T>}
    {(alerts.permission === "denied" || !!alerts.error) && <View style={[common.row, s.note]}>
      <Button label="Phone Settings" variant="link" onPress={openSettings} />
      {!!alerts.error && <Button label="Retry" variant="link" onPress={alerts.retry} />}
    </View>}
  </View>;
}
const s = StyleSheet.create({
  row: { minHeight: 56, paddingVertical: 10, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 28, alignItems: "center" },
  note: { marginLeft: 42, gap: 16 },
});
