import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, View } from "react-native";
import { Button, T, common } from "../ui";

export function CasePhotoField({ value, change, error }: {
  value?: string; change: (value: string | undefined) => void; error: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false), [missing, setMissing] = useState(false);
  const pick = async () => {
    setBusy(true); error("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.35, base64: true, allowsMultipleSelection: false });
      if (result.canceled) return;
      const data = result.assets[0]?.base64;
      if (!data || data.length > 699000) { error("Choose a photo under 512 KB."); return; }
      const mime = data.startsWith("/9j/") ? "jpeg" : data.startsWith("iVBORw0KGgo") ? "png" : data.startsWith("UklGR") ? "webp" : "";
      if (!mime) { error("Choose a JPEG, PNG or WebP photo."); return; }
      change("data:image/" + mime + ";base64," + data); setMissing(false);
    } catch { error("Photo unavailable. Try another photo."); }
    finally { setBusy(false); }
  };
  return <View style={common.stack}>
    {value && (missing ? <T muted>Photo unavailable</T> : <Image source={{ uri: value }} accessibilityLabel="Attached evidence photo"
      style={{ width: "100%", height: 190, borderRadius: 16 }} resizeMode="contain" onError={() => setMissing(true)} />)}
    <Button label={value ? "Replace Photo" : "Add Photo"} icon="image-outline" variant="secondary" loading={busy} onPress={() => void pick()} />
    {!!value && <Button label="Remove Photo" variant="link" onPress={() => change(undefined)} />}
  </View>;
}
