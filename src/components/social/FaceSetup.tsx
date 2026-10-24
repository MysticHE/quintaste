import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { View } from "react-native";
import { Button, common } from "../ui";
import { useMember } from "../CommunityGate";
import { useFood } from "../../state/Food";
import { useLanguage, useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { invalidate } from "../../hooks/useRemote";
import { removeFace, saveFace } from "../../services/social-api";
import { prepareFace } from "../../utils/face-image";
import { Face } from "./Face";

/** Choose the picture other members see: your own avatar, a photo, or just your initial. */
export function FaceSetup({ name, hasFace, onChange }: { name: string; hasFace: boolean; onChange: (hasFace: boolean) => void }) {
  const { doc } = useFood(), { userId } = useMember(), { setNotice } = usePreferences(), t = useT("social"), language = useLanguage(), [busy, setBusy] = useState(false), [version, setVersion] = useState(0);
  const avatar = doc.avatar && !doc.avatar.sample && doc.avatar.frames.base.startsWith("data:image/") ? doc.avatar : null;
  const run = async (task: () => Promise<boolean>) => {
    setBusy(true);
    try { const next = await task(); onChange(next); setVersion(Date.now()); invalidate("/api/social/"); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : t("pictureNotSaved"), error: true }); }
    finally { setBusy(false); }
  };
  const fromAvatar = () => run(async () => (await saveFace(await prepareFace(avatar!.frames.base, undefined, undefined, language))).hasFace);
  const fromPhoto = () => run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsMultipleSelection: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return hasFace;
    return (await saveFace(await prepareFace(asset.uri, asset.width, asset.height, language))).hasFace;
  });
  return <View style={[common.row, { gap: 14 }]}>
    {userId && <Face id={userId} name={name || t("you")} hasFace={hasFace} size={72} version={version} />}
    <View style={[common.flex, { gap: 8 }]}>
      {avatar && <Button label={t("useAvatar")} icon="happy-outline" loading={busy} onPress={() => void fromAvatar()} />}
      <Button label={t("choosePhoto")} icon="image-outline" variant={avatar ? "secondary" : "primary"} disabled={busy} onPress={() => void fromPhoto()} />
      {hasFace && <Button label={t("removePicture")} variant="link" disabled={busy} onPress={() => void run(async () => (await removeFace()).hasFace)} />}
    </View>
  </View>;
}
