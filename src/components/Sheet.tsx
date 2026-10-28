import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./food/Controls";
import { T, common } from "./ui";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";

/** A bottom sheet that keeps the screen behind it in view; its body scrolls and the footer stays put. */
export function Sheet({ visible, onClose, title, footer, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; footer?: ReactNode }>) {
  const { theme } = usePreferences(), insets = useSafeAreaInsets(), close = useT("common")("close");
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.overlay, { backgroundColor: theme.overlay }]}>
      <Pressable accessibilityLabel={close} accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[s.grab, { backgroundColor: theme.border }]} />
        <View style={common.spread}><T variant="subtitle" accessibilityRole="header" style={[common.flex, { minWidth: 0 }]} numberOfLines={2}>{title}</T>
          <IconButton label={close} icon="close" onPress={onClose} /></View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, gap: 12, width: "100%", maxWidth: 640, alignSelf: "center" },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: "center" },
});
