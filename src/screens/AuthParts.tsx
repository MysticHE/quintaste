import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { Button, Card, Field, Icon, T, common } from "../components/ui";
import { s } from "./authStyles";
import { usePreferences } from "../state/Preferences";
import { safeReturn, goBack } from "../utils/navigation";
import type { AuthState } from "./usePreviewAuth";
import { useT } from "../i18n";
export function AuthHeader() {
  const t = useT("me"), tc = useT("common");
  return <View style={common.row}>
    <Image source={require("../../assets/chef.png")} style={{ width: 40, height: 40 }} resizeMode="contain" accessible={false} />
    <T variant="subtitle" accessibilityRole="header" style={common.flex}>{tc("signIn")}</T>
    <Pressable accessibilityRole="button" accessibilityLabel={t("closeProfilePreview")} onPress={() => goBack()} style={s.iconButton}>
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
  const t = useT("me");
  return (
    <>
      <Field
        label={t("email")}
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
        label={t("password")}
        icon="lock-closed-outline"
        placeholder={
          signup ? t("createPreviewPassword") : t("atLeast8")
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
            accessibilityLabel={visible ? t("hidePassword") : t("showPassword")}
            onPress={() => setVisible(!visible)}
            style={s.show}
          >
            <T color={theme.accent} style={common.bold}>
              {visible ? t("hide") : t("show")}
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
  const { theme, setNotice } = usePreferences(), t = useT("me");
  return (
    <>
      {signup ? (
        <Card>
          <T style={common.bold}>{t("choicesStayYours")}</T>
          <T variant="small" muted style={s.tagline}>
            {t("previewProfileNote")}
          </T>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={t("understandPreviewLabel")}
            accessibilityState={{ checked: ack }}
            onPress={() => setAck(!ack)}
            style={s.ack}
          >
            <Icon
              name={ack ? "checkbox" : "square-outline"}
              color={theme.accent}
            />
            <T variant="small" style={common.flex}>
              {t("understandPreview")}
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
          label={t("forgotPassword")}
          variant="link"
          onPress={() =>
            setNotice({
              text: t("previewPasswordNotice"),
            })
          }
        />
      )}
    </>
  );
}
export function AuthServices({ state }: { state: AuthState }) {
  const t = useT("me");
  return <View style={common.row}>
    <View style={common.flex}><Button label="Apple" accessibilityLabel={t("continueWithProvider", { provider: "Apple" })} variant="secondary" icon="logo-apple" onPress={() => state.provider("Apple")} /></View>
    <View style={common.flex}><Button label="Google" accessibilityLabel={t("continueWithProvider", { provider: "Google" })} variant="secondary" icon="logo-google" onPress={() => state.provider("Google")} /></View>
  </View>;
}
export function AuthFooter({ signup }: { signup: boolean }) {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const destination = safeReturn(returnTo), t = useT("me");
  return signup ? (
    <Button
      label={t("alreadyMember")}
      variant="link"
      onPress={() => router.replace({ pathname: "/login", params: { returnTo: String(destination) } })}
    />
  ) : (
    <>
      <Button
        label={t("newHere")}
        variant="link"
        onPress={() => router.push({ pathname: "/create-account", params: { returnTo: String(destination) } })}
      />
      <Button
        label={t("exploreFirst")}
        variant="link"
        onPress={() => router.dismissTo(destination)}
      />
    </>
  );
}
