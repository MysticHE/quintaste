import { useState } from "react";
import { Screen } from "../components/Screen";
import { Card, Field, T, common } from "../components/ui";
import { usePreferences } from "../state/Preferences";
import { PreferenceSaveStatus, PreferenceSavingIndicator } from "../components/AutosaveStatus";
import { accountsEnabled } from "../services/auth-client";
import { ConnectedProfileScreen } from "./ConnectedProfile";
import { useT } from "../i18n";
function PreviewProfileScreen() {
  const { draft, patch } = usePreferences(), t = useT("me");
  const [error, setError] = useState<string>();
  return (
    <Screen
      title={t("editProfile")}
      headerAction={<PreferenceSavingIndicator />}
    >
      <PreferenceSaveStatus />
      <Field
        label={t("displayName")}
        placeholder={t("displayNamePlaceholder")}
        value={draft.displayName}
        onChangeText={(displayName) => {
          patch({ displayName });
          setError(displayName.trim() ? undefined : t("enterDisplayName"));
        }}
        maxLength={50}
        error={error}
      />
      <Field
        label={t("aboutYou")}
        placeholder={t("aboutYouPlaceholder")}
        multiline
        value={draft.bio}
        onChangeText={(bio) => patch({ bio })}
        maxLength={160}
      />
      <Card>
        <T style={common.bold}>{t("localPreviewProfile")}</T>
        <T muted style={common.section}>
          {t("localPreviewProfileNote")}
        </T>
      </Card>
    </Screen>
  );
}
export function ProfileScreen() {
  return accountsEnabled ? <ConnectedProfileScreen /> : <PreviewProfileScreen />;
}
