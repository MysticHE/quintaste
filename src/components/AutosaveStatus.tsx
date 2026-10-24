import { View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Icon, T } from "./ui";
import { useT } from "../i18n";

export function AutosaveStatus({ saving = false, error, hint, local = true }: { saving?: boolean; error?: string; hint?: string; local?: boolean }) {
  const { theme } = usePreferences(), t = useT("common");
  if (!saving && !error && !hint) return null;
  return <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 }}>
    <Icon name={error ? "alert-circle-outline" : hint ? "information-circle-outline" : saving ? "sync-outline" : "checkmark-circle-outline"} size={15} color={error ? theme.error : theme.mutedForeground} />
    <T variant="small" muted style={{ flexShrink: 1 }}>{error || hint || (saving ? t("savingChanges") : local ? t("savesOnDevice") : t("savesAutomatically"))}</T>
  </View>;
}

export function PreferenceSaveStatus() {
  const { saving, storageReady, notice } = usePreferences(), t = useT("common");
  return <AutosaveStatus saving={saving} error={!storageReady ? t("loadChoicesFirst") : notice?.preferenceRetry ? notice.text : undefined} />;
}
