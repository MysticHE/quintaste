import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { View } from "react-native";
import { Button, common } from "../ui";
import { useMember } from "../CommunityGate";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { invalidate } from "../../hooks/useRemote";
import { removeFace, saveFace } from "../../services/social-api";
import { prepareFace } from "../../utils/face-image";
import { Face } from "./Face";

/** Choose the picture other members see: your own avatar, a photo, or just your initial. */
export function FaceSetup({ name, hasFace, onChange }: { name: string; hasFace: boolean; onChange: (hasFace: boolean) => void }) {
  const { doc } = useFood(), { userId } = useMember(), { setNotice } = usePreferences(), [busy, setBusy] = useState(false), [version, setVersion] = useState(0);
  const avatar = doc.avatar && !doc.avatar.sample && doc.avatar.frames.base.startsWith("data:image/") ? doc.avatar : null;
  const run = async (task: () => Promise<boolean>) => {
    setBusy(true);
    try { const next = await task(); onChange(next); setVersion(Date.now()); invalidate("/api/social/"); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "Your picture was not saved. Try again.", error: true }); }
    finally { setBusy(false); }
  };
  const fromAvatar = () => run(async () => (await saveFace(await prepareFace(avatar!.frames.base))).hasFace);
  const fromPhoto = () => run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsMultipleSelection: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return hasFace;
    return (await saveFace(await prepareFace(asset.uri, asset.width, asset.height))).hasFace;
  });
  return <View style={[common.row, { gap: 14 }]}>
    {userId && <Face id={userId} name={name || "You"} hasFace={hasFace} size={72} version={version} />}
    <View style={[common.flex, { gap: 8 }]}>
      {avatar && <Button label="Use My Avatar" icon="happy-outline" loading={busy} onPress={() => void fromAvatar()} />}
      <Button label="Choose A Photo" icon="image-outline" variant={avatar ? "secondary" : "primary"} disabled={busy} onPress={() => void fromPhoto()} />
      {hasFace && <Button label="Remove Picture" variant="link" disabled={busy} onPress={() => void run(async () => (await removeFace()).hasFace)} />}
    </View>
  </View>;
}
