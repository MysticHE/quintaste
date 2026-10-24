import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { Button, Icon, T, common } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { AgeNotice, MemberGate, SetupPrompt, useSocialError } from "../../components/social/SocialState";
import { preparePhoto } from "../../components/market/ListingPhotos";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { newPose, sendSelfie, verifyState } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { Standing } from "../../types/community";

/** A front-camera selfie fits the 2 MB server limit with room to spare. */
const selfieBudget = { edge: 1280, compress: 0.85, chars: 2700000 };
const poseIcons: Record<string, "thumbs-up-outline" | "hand-left-outline" | "hand-right-outline" | "happy-outline"> = {
  "thumbs-up": "thumbs-up-outline", wave: "hand-left-outline", "point-up": "hand-right-outline", "three-fingers": "hand-left-outline" };
/** After the selfie is sent: staff check it within about a day. */
export function WaitingState({ onDone }: { onDone: () => void }) {
  const t = useT("social");
  return <StateView size="page" icon="hourglass-outline" title={t("waitingTitle")} text={t("waitingText")} primary={{ label: t("done"), icon: "checkmark", onPress: onDone }} />;
}
/**
 * The photo check: copy a random pose in a live selfie (camera only, no gallery). Only staff see it; they compare it with
 * the main photo and it is deleted 30 days after their decision. A declined check or a changed main photo starts again here.
 */
export function VerifyPanel({ onSent }: { onSent: (standing: Standing) => void }) {
  const t = useT("social"), { theme } = usePreferences(), problem = useSocialError(), remote = useRemote("/api/social/me/verify", verifyState);
  const [pose, setPose] = useState<string | null>(null), [selfie, setSelfie] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const asked = useRef(false), standing = remote.data?.standing, shown = pose ?? remote.data?.pose ?? null;
  const another = async () => {
    setError("");
    try { setPose((await newPose()).pose); setSelfie(null); } catch (failure) { setError(problem(failure)); }
  };
  useEffect(() => {
    if (remote.data && !remote.data.pose && standing?.step === "verify" && !asked.current) { asked.current = true; void another(); }
  });
  const take = async () => {
    setError("");
    try {
      if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) { setError(t("cameraDenied")); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1, cameraType: ImagePicker.CameraType.front });
      if (result.canceled) return;
      const image = await preparePhoto(result.assets[0], selfieBudget);
      if (!image) setError(t("selfieTooLarge")); else setSelfie(image);
    } catch { setError(t("selfieFailed")); }
  };
  const send = async () => {
    if (!selfie || !shown) return;
    setBusy(true); setError("");
    try { const result = await sendSelfie(selfie, shown); setSelfie(null); invalidate("/api/social"); onSent(result.standing); }
    catch (failure) { setError(problem(failure)); }
    finally { setBusy(false); }
  };
  if (!remote.data) return <RemoteStatus remote={remote} icon="camera-outline" returnTo="/social/verify" />;
  // Photos and basics come first (the selfie is compared with the main photo); members under 21 have no photo check.
  if (standing?.step === "photos" || standing?.step === "basics") return <SetupPrompt />;
  if (standing?.step === "age") return <AgeNotice onEvents={() => router.replace("/cook?tab=events")} />;
  if (standing?.step === "waiting") return <WaitingState onDone={() => router.replace("/social")} />;
  if (standing?.verified) return <StateView size="page" icon="checkmark-circle-outline" title={t("verifiedStatus")} text="" primary={{ label: t("done"), icon: "checkmark", onPress: () => router.replace("/social") }} />;
  return <View style={{ gap: 14 }}>
    {standing?.verification === "rejected" && <View style={[s.notice, { backgroundColor: theme.warningSoft }]}>
      <T style={common.bold}>{t("rejectedTitle")}</T>{!!standing.reason && <T variant="small">{standing.reason}</T>}</View>}
    {standing?.verification === "paused" && <View style={[s.notice, { backgroundColor: theme.warningSoft }]}>
      <T style={common.bold}>{t("pausedTitle")}</T><T variant="small">{t("pausedText")}</T></View>}
    {selfie ? <View style={[s.preview, { backgroundColor: theme.muted }]}>
      <Image source={{ uri: selfie }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={t("selfiePreview")} />
    </View> : <View style={[s.pose, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[s.poseIcon, { backgroundColor: theme.accentSoft }]}><Icon name={(shown && poseIcons[shown]) || "happy-outline"} size={48} color={theme.accent} /></View>
      <T variant="small" muted>{t("verifyTitle")}</T>
      <T variant="title" style={[common.bold, { textAlign: "center" }]} accessibilityLiveRegion="polite">{shown ? t("optPose", { value: shown }) : "…"}</T>
      <View style={{ alignSelf: "center" }}><Button label={t("anotherPose")} variant="link" onPress={() => void another()} /></View>
    </View>}
    <T variant="small" muted style={{ textAlign: "center" }}>{t("verifyNote")}</T>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {selfie ? <View style={{ gap: 8 }}>
      <Button label={t("sendSelfie")} icon="send-outline" loading={busy} onPress={() => void send()} />
      <Button label={t("retake")} icon="camera-reverse-outline" variant="secondary" disabled={busy} onPress={() => void take()} />
    </View> : <Button label={t("takeSelfie")} icon="camera-outline" disabled={!shown} onPress={() => void take()} />}
  </View>;
}
/** /social/verify: the photo check on its own, for a retake after a declined check or a new main photo. */
export function VerifyScreen() {
  const t = useT("social");
  return <Screen title={t("stepVerify")}><MemberGate returnTo="/social/verify"><VerifyPanel onSent={() => undefined} /></MemberGate></Screen>;
}
const s = StyleSheet.create({
  notice: { borderRadius: 14, padding: 12, gap: 4 },
  pose: { borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", gap: 8 },
  poseIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 20, overflow: "hidden", alignSelf: "center", maxWidth: 420 },
});
