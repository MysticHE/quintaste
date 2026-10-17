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
import { ConnectedAuthScreen } from "./ConnectedAuth";
function PreviewAuthScreen({ signup = false }: { signup?: boolean }) {
  const state = usePreviewAuth(signup);
  return (
    <Screen
      title={signup ? "Create Account" : undefined}
      back={signup}
      footer={<AuthFooter signup={signup} />}
    >
      {!signup && <AuthHeader />}
      {signup && (
        <Field
          label="Display Name"
          placeholder="What should we call you?"
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
        label={signup ? "Create Preview Profile" : "Sign In To Preview"}
        icon="arrow-forward"
        loading={state.busy}
        onPress={() => void state.submit()}
      />
      {!signup && <AuthServices state={state} />}
      <T variant="small" muted style={common.center}>
        UI preview only. Use example details; passwords are never saved or sent.
      </T>
    </Screen>
  );
}
export function AuthScreen({ signup = false }: { signup?: boolean }) {
  return accountsEnabled ? <ConnectedAuthScreen signup={signup} /> : <PreviewAuthScreen signup={signup} />;
}
