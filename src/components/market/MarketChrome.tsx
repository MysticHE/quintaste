import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "../food/Controls";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
export function MarketModal({ visible, onClose, label, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; label: string }>) {
  const { theme } = usePreferences(), t = useT("market");
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
export function MarketToolbar({ children, back = true }: PropsWithChildren<{ back?: boolean }>) {
  const { theme } = usePreferences(), t = useT("market");
  return <View style={[common.row, { gap: 6 }]}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel={t("goBack")} onPress={() => router.canGoBack() ? router.back() : router.replace("/cook?tab=market")} style={s.back}>
      <Icon name="chevron-back" color={theme.foreground} /></Pressable>}
    <View style={common.flex}>{children}</View>
  </View>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  dialog: { width: "100%", maxWidth: 460, maxHeight: "94%", borderRadius: 22, borderWidth: 1, padding: 16, gap: 14 },
});

