import { Linking, Platform, View } from "react-native";
import { Button, T, common } from "../ui";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
export function TimerAlertControl() {
  const alerts = useTimerAlerts(), { readable, dirty } = useFood(), { setNotice, theme } = usePreferences();
  if (Platform.OS === "web") return <T variant="small" muted>Phone alerts require the mobile app.</T>;
  const unverified = Platform.OS === "android" && Number(Platform.Version) >= 31;
  return <View style={common.stack}>
    {unverified && <T variant="small" muted>Android may deliver alerts a little late; keep the timer open for the countdown.</T>}
    <Button label={alerts.enabled ? "Disable Alerts" : unverified ? "Enable Approximate Alerts" : "Enable Alerts"} variant="secondary" loading={alerts.busy}
      disabled={!readable || dirty} onPress={() => void alerts.toggle()} />
    <T variant="small" muted>{alerts.enabled && alerts.permission === "timing-unverified" ? "Approximate alerts on"
      : alerts.enabled && alerts.permission === "granted" ? "Alerts on · Device sound and battery settings apply."
      : "Notification permission required. Timers bypass app quiet hours."}</T>
    {(alerts.permission === "denied" || !!alerts.error) && <Button label="Device Settings" variant="link" onPress={() => void Linking.openSettings().catch(() => setNotice({ text: "Device settings could not open.", error: true }))} />}
    {!!alerts.error && <><T color={theme.error} accessibilityLiveRegion="polite">{alerts.error}</T><Button label="Retry Alerts" variant="link" onPress={alerts.retry} /></>}
  </View>;
}
