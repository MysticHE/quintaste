/**
 * The selfie step of a breed (AVATAR_LOTUS_PLAN §2 step 7): consent naming the processor, a guide (face centred, even
 * light, just you), photo picker or camera, then one compact Breed pill. A free regeneration uses the same step.
 */
import { useState } from "react";
import { Image, Linking, StyleSheet, View } from "react-native";
import { Pill, PlayButton } from "../../screens/game/home/Controls";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import { useAvatarPhoto } from "../../hooks/useAvatarPhoto";
import { usePreferences } from "../../state/Preferences";
import { Button, T, common } from "../ui";
import { BreedConsent } from "./BreedConsent";

const TIPS = ["Face centred", "Even light", "Just you"];

function Guide({ photo }: { photo?: string }) {
  const { theme } = usePreferences(), [w, h] = GAME_ART_SIZE["avatar-adult"];
  return <View style={[s.guide, { backgroundColor: theme.accentSoft }]}>
    {photo ? <Image source={{ uri: photo }} resizeMode="cover" accessibilityLabel="Your selected selfie" style={StyleSheet.absoluteFill} />
      : <Image source={GAME_ART["avatar-adult"]} resizeMode="contain" accessible={false} style={{ height: 170, width: 170 * w / h, tintColor: theme.mutedForeground, opacity: 0.35 }} />}
    <View pointerEvents="none" style={[s.oval, { borderColor: theme.mediaForeground }]} />
  </View>;
}

export function BreedStart({ regenerate, triesLeft, busy, error, onBreed }: {
  regenerate: boolean; triesLeft: number; busy: boolean; error: string; onBreed(photo: string): void;
}) {
  const { theme } = usePreferences(), photo = useAvatarPhoto(), [agreed, setAgreed] = useState(false);
  const choose = (camera: boolean) => { setAgreed(false); void photo.choose(camera); };
  const disabled = busy || photo.busy;
  return <View style={s.stack}>
    <Guide photo={photo.photo} />
    <View style={[common.row, s.wrap]} accessible accessibilityLabel={"Selfie tips: " + TIPS.join(", ")}>
      {TIPS.map(tip => <T key={tip} variant="small" muted style={[s.tip, { backgroundColor: theme.card, borderColor: theme.border }]}>{tip}</T>)}
    </View>
    <View style={[common.row, s.wrap]}>
      <Pill icon="image-outline" text={photo.photo ? "Change Photo" : "Choose Photo"} label={photo.photo ? "Change photo" : "Choose a photo"} disabled={disabled} onPress={() => choose(false)} />
      <Pill icon="camera-outline" text="Take Selfie" label="Take a selfie" disabled={disabled} onPress={() => choose(true)} />
    </View>
    {photo.busy && <T variant="small" accessibilityLiveRegion="polite">Preparing your photo…</T>}
    {!!photo.error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{photo.error}</T>}
    {photo.needsSettings && <Button label="Open Camera Settings" variant="link" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
    {photo.photo && <BreedConsent agreed={agreed} disabled={disabled} onChange={() => setAgreed(v => !v)} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite" style={common.center}>{error}</T>}
    {photo.photo && agreed && !disabled
      ? <PlayButton icon="sparkles" title="Breed My Avatar" sub={regenerate ? `Free try · ${triesLeft} left` : "Uses your breed"} onPlay={() => onBreed(photo.photo!)} />
      : <T variant="small" muted style={common.center}>{busy ? "Starting your breed…" : photo.photo ? "Give consent to breed." : "Choose a clear, front-facing selfie."}</T>}
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 12, alignItems: "center" },
  wrap: { flexWrap: "wrap", justifyContent: "center", gap: 8 },
  guide: { width: 220, height: 220, borderRadius: 110, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  oval: { position: "absolute", top: 24, left: 52, width: 116, height: 150, borderRadius: 75, borderWidth: 2, borderStyle: "dashed", opacity: 0.9 },
  tip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
});
