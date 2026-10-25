import { ActivityIndicator, View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Icon, T } from "./ui";
import { useT } from "../i18n";

/**
 * A save problem or hint, in the page because it needs the member. Saving itself shows in the title bar (SavingIndicator), so a
 * quick save never pushes the page down and back up.
 */
export function AutosaveStatus({ error, hint }: { error?: string; hint?: string }) {
  const { theme } = usePreferences();
  if (!error && !hint) return null;
  return <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 }}>
    <Icon name={error ? "alert-circle-outline" : "information-circle-outline"} size={15} color={error ? theme.error : theme.mutedForeground} />
    <T variant="small" muted style={{ flexShrink: 1 }}>{error || hint}</T>
  </View>;
}

/**
 * A small spinner in the title bar's right-hand slot while changes save. The slot keeps its size whether or not it spins, so
 * nothing moves; screen readers hear "Saving changes" once.
 */
export function SavingIndicator({ saving }: { saving: boolean }) {
  const { theme } = usePreferences(), t = useT("common");
  return <View accessibilityLiveRegion="polite" accessibilityLabel={saving ? t("savingChanges") : undefined} accessible={saving}
    style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
    {saving && <ActivityIndicator size="small" color={theme.mutedForeground} />}
  </View>;
}

/** The title-bar spinner for app preferences (Appearance, Accessibility, Account, Food Choices). */
export function PreferenceSavingIndicator() {
  return <SavingIndicator saving={usePreferences().saving} />;
}

export function PreferenceSaveStatus() {
  const { storageReady, notice } = usePreferences(), t = useT("common");
  return <AutosaveStatus error={!storageReady ? t("loadChoicesFirst") : notice?.preferenceRetry ? notice.text : undefined} />;
}
