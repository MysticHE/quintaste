import { useMemo, type PropsWithChildren, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./food/Controls";
import { T, common } from "./ui";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";

/** A bottom sheet that keeps the screen behind it in view; its body scrolls and the footer stays put. */
export function Sheet({ visible, onClose, title, footer, swipeToClose = false, fullScreen = false, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; footer?: ReactNode; swipeToClose?: boolean; fullScreen?: boolean }>) {
  const { theme, reducedMotion } = usePreferences(), insets = useSafeAreaInsets(), close = useT("common")("close");
  const drag = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => swipeToClose && gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (gesture.dy > 56 || (gesture.dy > 16 && gesture.vy > 0.5)) onClose(); },
  }), [onClose, swipeToClose]);
  return <Modal visible={visible} transparent animationType={reducedMotion ? "none" : "slide"} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.overlay, { backgroundColor: theme.overlay }]}>
      <Pressable accessibilityLabel={close} accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[s.sheet, fullScreen && { height: "100%", maxHeight: "100%", borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: Math.max(insets.top, 8) }, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View {...(swipeToClose ? drag.panHandlers : {})} style={{ gap: 12 }}>
          {!fullScreen && <View style={[s.grab, { backgroundColor: theme.border }]} />}
          <View style={common.spread}><T variant="subtitle" accessibilityRole="header" style={[common.flex, { minWidth: 0 }]} numberOfLines={2}>{title}</T>
            <IconButton label={close} icon="close" onPress={onClose} /></View>
        </View>
        <ScrollView style={fullScreen ? { flex: 1, minHeight: 0 } : { flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
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
