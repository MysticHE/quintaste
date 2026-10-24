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
import { useT } from "../../i18n";

const TIPS = ["lotusTipCentred", "lotusTipLight", "lotusTipYou"] as const;

function Guide({ photo }: { photo?: string }) {
  const { theme } = usePreferences(), [w, h] = GAME_ART_SIZE["avatar-adult"], t = useT("game");
  return <View style={[s.guide, { backgroundColor: theme.accentSoft }]}>
    {photo ? <Image source={{ uri: photo }} resizeMode="cover" accessibilityLabel={t("lotusSelectedSelfie")} style={StyleSheet.absoluteFill} />
      : <Image source={GAME_ART["avatar-adult"]} resizeMode="contain" accessible={false} style={{ height: 170, width: 170 * w / h, tintColor: theme.mutedForeground, opacity: 0.35 }} />}
    <View pointerEvents="none" style={[s.oval, { borderColor: theme.mediaForeground }]} />
  </View>;
}

export function BreedStart({ regenerate, triesLeft, busy, error, onBreed }: {
  regenerate: boolean; triesLeft: number; busy: boolean; error: string; onBreed(photo: string): void;
}) {
  const { theme } = usePreferences(), photo = useAvatarPhoto(), [agreed, setAgreed] = useState(false), t = useT("game");
  const choose = (camera: boolean) => { setAgreed(false); void photo.choose(camera); };
  const disabled = busy || photo.busy;
  return <View style={s.stack}>
    <Guide photo={photo.photo} />
    <View style={[common.row, s.wrap]} accessible accessibilityLabel={t("lotusSelfieTips", { list: TIPS.map(tip => t(tip)).join(t("sep")) })}>
      {TIPS.map(tip => <T key={tip} variant="small" muted style={[s.tip, { backgroundColor: theme.card, borderColor: theme.border }]}>{t(tip)}</T>)}
    </View>
    <View style={[common.row, s.wrap]}>
      <Pill icon="image-outline" text={photo.photo ? t("lotusChangePhoto") : t("lotusChoosePhoto")} label={photo.photo ? t("lotusChangePhotoA11y") : t("lotusChoosePhotoA11y")} disabled={disabled} onPress={() => choose(false)} />
      <Pill icon="camera-outline" text={t("lotusTakeSelfie")} label={t("lotusTakeSelfieA11y")} disabled={disabled} onPress={() => choose(true)} />
    </View>
    {photo.busy && <T variant="small" accessibilityLiveRegion="polite">{t("lotusPreparingPhoto")}</T>}
    {!!photo.error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{photo.error}</T>}
    {photo.needsSettings && <Button label={t("lotusCameraSettings")} variant="link" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
    {photo.photo && <BreedConsent agreed={agreed} disabled={disabled} onChange={() => setAgreed(v => !v)} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite" style={common.center}>{error}</T>}
    {photo.photo && agreed && !disabled
      ? <PlayButton icon="sparkles" title={t("lotusBreedMine")} sub={regenerate ? t("lotusFreeTry", { n: triesLeft }) : t("lotusUsesBreed")} onPlay={() => onBreed(photo.photo!)} />
      : <T variant="small" muted style={common.center}>{busy ? t("lotusStartingBreed") : photo.photo ? t("lotusGiveConsent") : t("lotusChooseSelfie")}</T>}
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 12, alignItems: "center" },
  wrap: { flexWrap: "wrap", justifyContent: "center", gap: 8 },
  guide: { width: 220, height: 220, borderRadius: 110, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  oval: { position: "absolute", top: 24, left: 52, width: 116, height: 150, borderRadius: 75, borderWidth: 2, borderStyle: "dashed", opacity: 0.9 },
  tip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
});
