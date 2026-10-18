import type { PropsWithChildren, ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, T } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";

/** Bottom sheet for the café home. Backdrop tap and the close button dismiss it; content scrolls. */
export function GameSheet({ title, onClose, children, footer }: PropsWithChildren<{ title: string; onClose(): void; footer?: ReactNode }>) {
  const { theme, reducedMotion } = usePreferences();
  const insets = useSafeAreaInsets();
  return <Modal transparent visible animationType={reducedMotion ? "none" : "slide"} onRequestClose={onClose} statusBarTranslucent>
    <View style={[s.wrap, { backgroundColor: theme.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={[s.sheet, { backgroundColor: theme.background, paddingBottom: 16 + insets.bottom }]} accessibilityViewIsModal>
        <View style={s.head}>
          <T variant="title" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={[s.close, { backgroundColor: theme.muted }]}>
            <Icon name="close" color={theme.foreground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        {footer && <View style={s.footer}>{footer}</View>}
      </View>
    </View>
  </Modal>;
}
export function Section({ title, children }: PropsWithChildren<{ title?: string }>) {
  const { theme } = usePreferences();
  return <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
    {!!title && <T variant="subtitle">{title}</T>}{children}</View>;
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  section: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
});
