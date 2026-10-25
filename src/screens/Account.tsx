import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { AvatarPortrait } from "../components/avatar/AvatarPortrait";
import { Screen } from "../components/Screen";
import { SettingsRow } from "../components/SettingsRow";
import { Button, Card, Icon, T, common } from "../components/ui";
import { usePreferences } from "../state/Preferences";
import { useFood } from "../state/Food";
import { QuinTasteIcon } from "../components/navigation/QuinTasteIcon";
import { safeReturn } from "../utils/navigation";
import { useAuth } from "../state/Auth";
import { MarketModal } from "../components/market/MarketChrome";
import { Action } from "../components/Actions";
import { TimerAlertControl } from "../components/food/TimerAlertControl";
import { LotusSlot } from "../components/lotus/LotusSlot";
import { useDietText } from "../components/food/DietLabels";
import { useLanguageName } from "./Settings";
import { useT, useLanguageChoice } from "../i18n";

export function AccountScreen() {
  const { user, enabled } = useAuth();
  const { draft, preview, theme } = usePreferences(), { doc, leavePreview, switching } = useFood();
  const tc = useT("common"), t = useT("me"), languageName = useLanguageName(useLanguageChoice().choice), dietText = useDietText();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const origin = returnTo ? safeReturn(returnTo) : "/";
  const [unsaved, setUnsaved] = useState(false);
  const leave = async (force = false) => {
    const result = await leavePreview(force);
    if (result === "unsaved" && user) setUnsaved(true);
    else if (result === true) { setUnsaved(false); router.dismissTo("/"); }
    return result === true;
  };
  return <Screen title={tc("settings")} backTo={origin}>
    <Card style={s.profile}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("changeAvatar")}
        onPress={() => router.push("/avatar")} style={({ pressed }) => [s.avatar, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={[s.portrait, { backgroundColor: theme.accentSoft }]}><AvatarPortrait avatar={doc.avatar} size={64} /></View>
        <View style={[s.avatarEdit, { backgroundColor: theme.card, borderColor: theme.border }]}><Icon name="camera-outline" size={16} color={theme.accent} /></View>
      </Pressable>
      <View style={common.flex}>
        <T variant="subtitle">{user?.name || (preview ? draft.displayName : t("yourSpace"))}</T>
        {!user && <T variant="small" muted>{preview ? t("localPreview") : t("guest")}</T>}
        {!user && !preview && enabled && <Button label={t("signInOrCreate")} icon="log-in-outline" variant="link"
          onPress={() => router.push({ pathname: "/login", params: { returnTo: "/account" } })} />}
        {(preview || user?.adultConfirmed) && <Button label={t("editProfile")} icon="create-outline" variant="link" onPress={() => router.push("/profile")} />}
        {user && !user.adultConfirmed && <Button label={tc("completeAccountSetup")} variant="link" onPress={() => router.push('/account-eligibility')} />}
      </View>
    </Card>
    <LotusSlot />
    <Card style={s.group}>
      <SettingsRow label={tc("saved")} leading={<QuinTasteIcon name="saved" color={theme.accent} size={26} />} value={String(doc.saves.length)} onPress={() => router.push("/saved")} />
      <SettingsRow label={t("foodChoices")} icon="leaf-outline" value={draft.diets.map(dietText.name).join(" · ")} onPress={() => router.push("/exclusions")} />
      <SettingsRow label={t("aiRecipesPlan")} icon="sparkles-outline" onPress={() => router.push("/cook/ai-plans" as never)} />
      <SettingsRow label={t("location")} icon="location-outline" last={!__DEV__} onPress={() => router.push("/private-places")} />
      {__DEV__ && <SettingsRow label={t("myCases")} icon="file-tray-outline" last onPress={() => router.push("/cases")} />}
    </Card>
    <Card style={s.group}>
      <SettingsRow label={tc("language")} icon="language-outline" value={languageName} onPress={() => router.push("/language" as never)} />
      <SettingsRow label={t("appearance")} icon="color-palette-outline" onPress={() => router.push("/settings")} />
      <SettingsRow label={t("accessibility")} icon="accessibility-outline" last={Platform.OS === "web"} onPress={() => router.push("/accessibility")} />
      <TimerAlertControl label={t("notifications")} />
    </Card>
    <Card style={s.group}>
      <SettingsRow label={t("privacyData")} icon="shield-checkmark-outline" onPress={() => router.push("/privacy")} />
      <SettingsRow label={t("help")} icon="help-circle-outline" last={!user} onPress={() => router.push("/help")} />
      {user && <SettingsRow label={t("bringInGuestSaves")} icon="download-outline" last onPress={() => router.push('/merge-saves')} />}
    </Card>
    {(user || preview || !enabled) && <Button label={user ? tc("signOut") : preview ? t("returnToGuest") : t("viewProfileOptions")} icon={user || preview ? "log-out-outline" : "log-in-outline"} variant="link" loading={switching} onPress={() => {
      if (preview) void leave();
      else router.push({ pathname: "/login", params: { returnTo: "/account" } });
    }} />}
    <MarketModal visible={unsaved} onClose={() => setUnsaved(false)} label={t("signOutAnywayQuestion")}>
      <T>{t("unsavedSignOut")}</T>
      <Action label={t("signOutAnyway")} run={() => leave(true)} />
      <Button label={t("staySignedIn")} variant="link" onPress={() => setUnsaved(false)} />
    </MarketModal>
  </Screen>;
}

const s = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  avatar: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  portrait: { borderRadius: 32, overflow: "hidden" },
  avatarEdit: { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  group: { paddingVertical: 4 },
});
