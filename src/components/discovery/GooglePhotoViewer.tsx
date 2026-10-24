import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreferences } from "../../state/Preferences";
import type { LivePhoto } from "../../types/discovery";
import { Icon, T, common } from "../ui";
import { GooglePhotoCredits, GooglePhotoImage } from "./GooglePhoto";
import { useT } from "../../i18n";

export function GooglePhotoViewer({ photo, name, expiresAt, visible, onClose }: {
  photo: LivePhoto; name: string; expiresAt: number; visible: boolean; onClose: () => void;
}) {
  const { theme, reducedMotion } = usePreferences();
  const [error, setError] = useState(""), t = useT("explore");
  return <Modal visible={visible} animationType={reducedMotion ? "none" : "fade"} onRequestClose={onClose}>
    <SafeAreaView style={[common.flex, { backgroundColor: theme.mediaSurface }]}>
      <View style={s.heading}><T variant="small" color={theme.mediaForeground} style={common.flex}>{name}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={t("closePhoto")} onPress={onClose} style={s.close}>
          <Icon name="close" color={theme.mediaForeground} /></Pressable></View>
      <GooglePhotoImage key={photo.url} photo={photo} name={name} expiresAt={expiresAt} contain style={common.flex} />
      <ScrollView style={s.credits} contentContainerStyle={s.creditContent}>
        <T variant="small" color={theme.mediaProviderForeground}>Google Maps</T>
        <GooglePhotoCredits photo={photo} onMedia onError={setError} />
        {!!error && <T variant="small" color={theme.mediaForeground} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</T>}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  close: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  credits: { maxHeight: "32%", flexGrow: 0 }, creditContent: { padding: 16, gap: 4 },
});
