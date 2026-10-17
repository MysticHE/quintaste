import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { Button, Card, Field, Icon, T, common } from "../components/ui";
import { s } from "./authStyles";
import { usePreferences } from "../state/Preferences";
import { safeReturn, goBack } from "../utils/navigation";
import type { AuthState } from "./usePreviewAuth";
export function AuthHeader() {
  return <View style={common.row}>
    <Image source={require("../../assets/chef.png")} style={{ width: 40, height: 40 }} resizeMode="contain" accessible={false} />
    <T variant="subtitle" accessibilityRole="header" style={common.flex}>Sign In</T>
    <Pressable accessibilityRole="button" accessibilityLabel="Close profile preview" onPress={() => goBack()} style={s.iconButton}>
      <Icon name="close" />
    </Pressable>
  </View>;
}
export function AuthFields({
  state,
  signup,
}: {
  state: AuthState;
  signup: boolean;
}) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    visible,
    setVisible,
    errors,
    theme,
  } = state;
  return (
    <>
      <Field
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        maxLength={254}
        error={errors.email}
      />
      <Field
        label="Password"
        icon="lock-closed-outline"
        placeholder={
          signup ? "Create a preview password" : "At least 8 characters"
        }
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={128}
        error={errors.password}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible(!visible)}
            style={s.show}
          >
            <T color={theme.accent} style={common.bold}>
              {visible ? "Hide" : "Show"}
            </T>
          </Pressable>
        }
      />
    </>
  );
}
export function AuthConsent({
  state,
  signup,
}: {
  state: AuthState;
  signup: boolean;
}) {
  const { ack, setAck, errors } = state;
  const { theme, setNotice } = usePreferences();
  return (
    <>
      {signup ? (
        <Card>
          <T style={common.bold}>Your choices stay yours</T>
          <T variant="small" muted style={s.tagline}>
            Your profile and preferences stay on this device. This preview does
            not create an online account.
          </T>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="I understand this is a preview profile"
            accessibilityState={{ checked: ack }}
            onPress={() => setAck(!ack)}
            style={s.ack}
          >
            <Icon
              name={ack ? "checkbox" : "square-outline"}
              color={theme.accent}
            />
            <T variant="small" style={common.flex}>
              I understand this is a preview profile.
            </T>
          </Pressable>
          {errors.ack && (
            <T variant="small" color={theme.error}>
              {errors.ack}
            </T>
          )}
        </Card>
      ) : (
        <Button
          label="Forgot Password?"
          variant="link"
          onPress={() =>
            setNotice({
              text: "Password recovery will be available with real authentication. For this preview, use any 8-character password.",
            })
          }
        />
      )}
    </>
  );
}
export function AuthServices({ state }: { state: AuthState }) {
  return <View style={common.row}>
    <View style={common.flex}><Button label="Apple" accessibilityLabel="Continue with Apple" variant="secondary" icon="logo-apple" onPress={() => state.provider("Apple")} /></View>
    <View style={common.flex}><Button label="Google" accessibilityLabel="Continue with Google" variant="secondary" icon="logo-google" onPress={() => state.provider("Google")} /></View>
  </View>;
}
export function AuthFooter({ signup }: { signup: boolean }) {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const destination = safeReturn(returnTo);
  return signup ? (
    <Button
      label="Already A Member? Sign In"
      variant="link"
      onPress={() => router.replace({ pathname: "/login", params: { returnTo: String(destination) } })}
    />
  ) : (
    <>
      <Button
        label="New Here? Create Account"
        variant="link"
        onPress={() => router.push({ pathname: "/create-account", params: { returnTo: String(destination) } })}
      />
      <Button
        label="Explore First"
        variant="link"
        onPress={() => router.dismissTo(destination)}
      />
    </>
  );
}
