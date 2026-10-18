import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { ThemedSwitch } from "../GroupedList";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

/**
 * Cooking timer alerts as one on/off row: label and switch only (owner decision, 18 October 2026: no status or
 * timing description). Errors and a blocked permission still show their fix. Phone-only: nothing on the web build.
 */
export function TimerAlertControl({ label = "Timer Alerts" }: { label?: string }) {
  const alerts = useTimerAlerts(), { readable, dirty } = useFood(), { setNotice, theme } = usePreferences();
  if (Platform.OS === "web") return null;
  const openSettings = () => void Linking.openSettings().catch(() => setNotice({ text: "Phone settings could not open.", error: true }));
  return <View>
    <View style={s.row}>
      <View style={s.icon}><Icon name="notifications-outline" size={24} color={theme.accent} /></View>
      <T style={[common.flex, common.bold]}>{label}</T>
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
