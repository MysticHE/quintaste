import { useState } from "react";
import { Screen } from "../components/Screen";
import { Card, Field, T, common } from "../components/ui";
import { usePreferences } from "../state/Preferences";
import { PreferenceSaveStatus } from "../components/AutosaveStatus";
import { accountsEnabled } from "../services/auth-client";
import { ConnectedProfileScreen } from "./ConnectedProfile";
function PreviewProfileScreen() {
  const { draft, patch } = usePreferences();
  const [error, setError] = useState<string>();
  return (
    <Screen
      title="Edit Profile"

    >
      <PreferenceSaveStatus />
      <Field
        label="Display Name"
        placeholder="What should we call you?"
        value={draft.displayName}
        onChangeText={(displayName) => {
          patch({ displayName });
          setError(displayName.trim() ? undefined : "Enter a display name.");
        }}
        maxLength={50}
        error={error}
      />
      <Field
        label="About You"
        placeholder="What do you love cooking?"
        multiline
        value={draft.bio}
        onChangeText={(bio) => patch({ bio })}
        maxLength={160}
      />
      <Card>
        <T style={common.bold}>Local preview profile</T>
        <T muted style={common.section}>
          Your display name and preferences stay on this device. No birthday,
          exact address or contact details are needed to try this preview.
        </T>
      </Card>
    </Screen>
  );
}
export function ProfileScreen() {
  return accountsEnabled ? <ConnectedProfileScreen /> : <PreviewProfileScreen />;
}
