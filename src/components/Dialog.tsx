import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "./food/Controls";
import { T, common } from "./ui";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";

/** The app's centred dialog: a titled card over a dimmed backdrop that closes on the backdrop, the close button or Back. */
export function Dialog({ visible, onClose, label, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; label: string }>) {
  const { theme } = usePreferences(), t = useT("common");
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[s.overlay, { backgroundColor: theme.overlay }]}>
      <Pressable accessibilityLabel={t("closeDialog")} accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[s.dialog, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={common.spread}><T variant="subtitle" accessibilityRole="header" style={[common.flex, { minWidth: 0 }]} numberOfLines={2}>{label}</T><IconButton label={t("closeDialogButton")} icon="close" onPress={onClose} /></View>
        {children}
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 460, maxHeight: "94%", borderRadius: 22, borderWidth: 1, padding: 16, gap: 14 },
});
