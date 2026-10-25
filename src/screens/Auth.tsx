import { Screen } from "../components/Screen";
import { Button, Field, T, common } from "../components/ui";
import {
  AuthHeader,
  AuthFields,
  AuthConsent,
  AuthServices,
  AuthFooter,
} from "./AuthParts";
import { usePreviewAuth } from "./usePreviewAuth";
import { accountsEnabled } from "../services/auth-client";
import { ConnectedSignUpScreen } from "./ConnectedAuth";
import { ConnectedSignInScreen } from "./ConnectedSignIn";
import { useT } from "../i18n";
import { WalkInExperience } from "../components/walkin/WalkInExperience";
function PreviewAuthScreen({ signup = false }: { signup?: boolean }) {
  const state = usePreviewAuth(signup), t = useT("me");
  return (
    <Screen
      title={signup ? t("createAccount") : undefined}
      back={signup}
      footer={<AuthFooter signup={signup} />}
    >
      {!signup && <AuthHeader />}
      {signup && (
        <Field
          label={t("displayName")}
          placeholder={t("displayNamePlaceholder")}
          value={state.name}
          onChangeText={state.setName}
          autoComplete="name"
          maxLength={50}
          error={state.errors.name}
        />
      )}
      <AuthFields state={state} signup={signup} />
      <AuthConsent state={state} signup={signup} />
      <Button
        label={signup ? t("createPreviewProfile") : t("signInToPreview")}
        icon="arrow-forward"
        loading={state.busy}
        onPress={() => void state.submit()}
      />
      {!signup && <AuthServices state={state} />}
      <T variant="small" muted style={common.center}>
        {t("previewOnlyNote")}
      </T>
    </Screen>
  );
}
export function AuthScreen({ signup = false }: { signup?: boolean }) {
  if (!accountsEnabled) return <PreviewAuthScreen signup={signup} />;
  if (signup) return <ConnectedSignUpScreen />;
  return <WalkInExperience SignIn={ConnectedSignInScreen} />;
}
