import { router, useLocalSearchParams } from "expo-router";
import { dietLabel } from "../config/preferences";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

export function AccountScreen() {
  const { user, enabled } = useAuth();
  const { draft, preview, theme } = usePreferences(), { doc, leavePreview, switching } = useFood();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const origin = returnTo ? safeReturn(returnTo) : "/";
  const [unsaved, setUnsaved] = useState(false);
  const leave = async (force = false) => {
    const result = await leavePreview(force);
    if (result === "unsaved" && user) setUnsaved(true);
    else if (result === true) { setUnsaved(false); router.dismissTo("/"); }
    return result === true;
  };
  return <Screen title="Me" backTo={origin}>
    <Card style={s.profile}>
      <Pressable accessibilityRole="button" accessibilityLabel="Change Avatar"
        onPress={() => router.push("/avatar")} style={({ pressed }) => [s.avatar, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={[s.portrait, { backgroundColor: theme.accentSoft }]}><AvatarPortrait avatar={doc.avatar} size={64} /></View>
        <View style={[s.avatarEdit, { backgroundColor: theme.card, borderColor: theme.border }]}><Icon name="camera-outline" size={16} color={theme.accent} /></View>
      </Pressable>
      <View style={common.flex}>
        <T variant="subtitle">{user?.name || (preview ? draft.displayName : "Your Space")}</T>
        {!user && <T variant="small" muted>{preview ? "Local Preview" : "Guest"}</T>}
        {!user && !preview && enabled && <Button label="Sign In Or Create Account" icon="log-in-outline" variant="link"
          onPress={() => router.push({ pathname: "/login", params: { returnTo: "/account" } })} />}
        {(preview || user?.adultConfirmed) && <Button label="Edit Profile" icon="create-outline" variant="link" onPress={() => router.push("/profile")} />}
        {user && !user.adultConfirmed && <Button label="Complete Account Setup" variant="link" onPress={() => router.push('/account-eligibility')} />}
      </View>
    </Card>
    <Card style={s.group}>
      <SettingsRow label="Saved" leading={<QuinTasteIcon name="saved" color={theme.accent} size={26} />} value={String(doc.saves.length)} onPress={() => router.push("/saved")} />
      <SettingsRow label="Food Choices" icon="leaf-outline" value={dietLabel(draft.diet)} onPress={() => router.push("/exclusions")} />
      <SettingsRow label="Location" icon="location-outline" last={!__DEV__} onPress={() => router.push("/private-places")} />
      {__DEV__ && <SettingsRow label="My Cases" icon="file-tray-outline" last onPress={() => router.push("/cases")} />}
    </Card>
    <Card style={s.group}>
      <SettingsRow label="Appearance" icon="color-palette-outline" onPress={() => router.push("/settings")} />
      <SettingsRow label="Accessibility" icon="accessibility-outline" onPress={() => router.push("/accessibility")} />
      <SettingsRow label="Notifications" icon="notifications-outline" last onPress={() => router.push("/notifications")} />
    </Card>
    <Card style={s.group}>
      <SettingsRow label="Privacy & Data" icon="shield-checkmark-outline" onPress={() => router.push("/privacy")} />
      <SettingsRow label="Help" icon="help-circle-outline" last={!user} onPress={() => router.push("/help")} />
      {user && <SettingsRow label="Bring In Guest Saves" icon="download-outline" last onPress={() => router.push('/merge-saves')} />}
    </Card>
    {(user || preview || !enabled) && <Button label={user ? "Sign Out" : preview ? "Return To Guest Collection" : "View Profile Options"} icon={user || preview ? "log-out-outline" : "log-in-outline"} variant="link" loading={switching} onPress={() => {
      if (preview) void leave();
      else router.push({ pathname: "/login", params: { returnTo: "/account" } });
    }} />}
    <MarketModal visible={unsaved} onClose={() => setUnsaved(false)} label="Sign Out Anyway?">
      <T>Some changes on this device have not saved yet. Signing out now discards them.</T>
      <Action label="Sign Out Anyway" run={() => leave(true)} />
      <Button label="Stay Signed In" variant="link" onPress={() => setUnsaved(false)} />
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
