import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { Button, T, common } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { AgeNotice, MemberGate, SetupPrompt, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { openSocial } from "../../components/social/Shared";
import { invalidate } from "../../hooks/useRemote";
import { sendForCheck } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** After the photo is sent: staff check it within about a day. */
export function WaitingState({ onDone }: { onDone: () => void }) {
  const t = useT("social");
  return <StateView size="page" icon="hourglass-outline" title={t("waitingTitle")} text={t("waitingText")} primary={{ label: t("done"), icon: "checkmark", onPress: onDone }} />;
}
/**
 * /social/verify: sends the main photo for checking again, after a declined check or a new main photo. The main photo must be a
 * real selfie of the member (owner, 1 Nov 2026); there is no separate selfie or pose. First-time setup sends it from Setup.
 */
function VerifyPanel() {
  const t = useT("social"), { theme } = usePreferences(), problem = useSocialError(), remote = useSocialMe();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState(false);
  const standing = remote.data?.standing, main = remote.data?.photos[0];
  const send = async () => {
    setBusy(true); setError("");
    try { await sendForCheck(); invalidate("/api/social"); setSent(true); }
    catch (failure) { setError(problem(failure)); }
    finally { setBusy(false); }
  };
  if (!remote.data) return <RemoteStatus remote={remote} icon="camera-outline" returnTo="/social/verify" />;
  if (standing?.step === "photos" || standing?.step === "basics") return <SetupPrompt />;
  if (standing?.step === "age") return <AgeNotice onEvents={() => router.replace("/cook?tab=events")} />;
  if (sent || standing?.step === "waiting") return <WaitingState onDone={() => router.replace("/social")} />;
  if (standing?.verified) return <StateView size="page" icon="checkmark-circle-outline" title={t("verifiedStatus")} text="" primary={{ label: t("done"), icon: "checkmark", onPress: () => router.replace("/social") }} />;
  return <View style={{ gap: 14 }}>
    {standing?.verification === "rejected" && <View style={[s.notice, { backgroundColor: theme.warningSoft }]}>
      <T style={common.bold}>{t("rejectedTitle")}</T>{!!standing.reason && <T variant="small">{standing.reason}</T>}</View>}
    {standing?.verification === "paused" && <View style={[s.notice, { backgroundColor: theme.warningSoft }]}>
      <T style={common.bold}>{t("pausedTitle")}</T><T variant="small">{t("pausedText")}</T></View>}
    {main && <View style={[s.preview, { backgroundColor: theme.muted }]}>
      <Image source={{ uri: main.url }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={t("mainPhoto")} />
    </View>}
    <T variant="small" muted style={{ textAlign: "center" }}>{t("verifyNote")}</T>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t("sendForCheck")} icon="send-outline" loading={busy} onPress={() => void send()} />
    <Button label={t("changePhotos")} icon="images-outline" variant="secondary" disabled={busy} onPress={() => openSocial("/photos")} />
  </View>;
}
export function VerifyScreen() {
  const t = useT("social");
  return <Screen title={t("stepVerify")}><MemberGate returnTo="/social/verify"><VerifyPanel /></MemberGate></Screen>;
}
const s = StyleSheet.create({
  notice: { borderRadius: 14, padding: 12, gap: 4 },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 20, overflow: "hidden", alignSelf: "center", maxWidth: 420 },
});
