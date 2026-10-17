import { useState } from "react";
import { router } from "expo-router";
import { Screen } from "../components/Screen";
import { Button, Card, Field, T, common } from "../components/ui";
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
export function HelpScreen() {
  return (
    <Screen
      title="Help & Account"
      subtitle="A little clarity, whenever you need it."
      footer={
        <Button
          label="Back To Account"
          variant="secondary"
          onPress={() => router.dismissTo("/account")}
        />
      }
    >
      <Card>
        <T variant="subtitle">What can I try?</T>
        <T muted style={common.section}>
          Find nearby vegetarian venues with live Google business information,
          photos and reviews where available, save privately, ask
          stall questions in English and Chinese, submit place cases to local review, and
          follow recipes with serving adjustments and persistent timers.
        </T>
      </Card>
      <Card>
        <T variant="subtitle">Where are my choices saved?</T>
        <T muted style={common.section}>
          Saves, notes, drafts and cooking progress are kept automatically on this
          device. Appearance, food choices and settings save automatically. A storage
          failure leaves your draft visible with a Retry action. Guest and
          profile food collections are separate. Submitted place cases and opted-in coarse
          areas also use the local development server.
        </T>
      </Card>
      <Card>
        <T variant="subtitle">Is this a real sign-in?</T>
        <T muted style={common.section}>
          {accountsEnabled ? 'Sign in with Google or a username and password. Google shares your verified email and account identity. Username accounts use one-time recovery codes. Food collections stay on each device.' : 'This is a local UI preview. Example details open a preview profile. Passwords are never stored or sent, and Apple, Google and password recovery are not connected.'}
        </T>
      </Card>
      <Card>
        <T variant="subtitle">What is not connected yet?</T>
        <T muted style={common.section}>
          Cloud food sync, production moderation, reviewed menu
          evidence and native background timer alerts still need connected services.
          Recipe images are illustrative. Google business listings do not confirm ingredients.
        </T>
      </Card>
    </Screen>
  );
}
