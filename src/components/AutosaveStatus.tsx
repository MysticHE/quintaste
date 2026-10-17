import { View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Icon, T } from "./ui";

export function AutosaveStatus({ saving = false, error, hint, local = true }: { saving?: boolean; error?: string; hint?: string; local?: boolean }) {
  const { theme } = usePreferences();
  if (!saving && !error && !hint) return null;
  return <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 }}>
    <Icon name={error ? "alert-circle-outline" : hint ? "information-circle-outline" : saving ? "sync-outline" : "checkmark-circle-outline"} size={15} color={error ? theme.error : theme.mutedForeground} />
    <T variant="small" muted style={{ flexShrink: 1 }}>{error || hint || (saving ? "Saving changes…" : local ? "Changes save automatically on this device" : "Changes save automatically")}</T>
  </View>;
}

export function PreferenceSaveStatus() {
  const { saving, storageReady, notice } = usePreferences();
  return <AutosaveStatus saving={saving} error={!storageReady ? "Load your saved choices before editing" : notice?.preferenceRetry ? notice.text : undefined} />;
}
