import { useEffect, type PropsWithChildren, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, T } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import { Art } from "./bits";

/**
 * Bottom sheet for the café home. It springs up over a fading backdrop, with a grab handle and an optional round art
 * badge beside the title so each sheet reads as part of the game. Backdrop tap and the close button dismiss it.
 */
export function GameSheet({ title, subtitle, art, onClose, children, footer }: PropsWithChildren<{ title: string; subtitle?: string; art?: string; onClose(): void; footer?: ReactNode }>) {
  const { theme, reducedMotion } = usePreferences();
  const insets = useSafeAreaInsets();
  const t = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => { if (!reducedMotion) t.value = withSpring(1, { damping: 18, stiffness: 170, mass: 0.9 }); }, [reducedMotion, t]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - t.value) * 420 }] }));
  const shade = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.4], [0, 1], "clamp") }));
  return <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
    <View style={s.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }, shade]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[s.sheet, { backgroundColor: theme.background, paddingBottom: 16 + insets.bottom }, sheet]} accessibilityViewIsModal>
        <View style={[s.handle, { backgroundColor: theme.border }]} />
        <View style={s.head}>
          {art && <View style={[s.badge, { backgroundColor: theme.accentSoft, borderColor: theme.card }]}><Art k={art} size={46} /></View>}
          <View style={{ flex: 1 }}>
            <T variant="title" accessibilityRole="header" numberOfLines={1}>{title}</T>
            {!!subtitle && <T variant="small" muted numberOfLines={1}>{subtitle}</T>}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
            style={({ pressed }) => [s.close, { backgroundColor: theme.muted, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Icon name="close" color={theme.foreground} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        {footer && <View style={s.footer}>{footer}</View>}
      </Animated.View>
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
  sheet: { maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, marginBottom: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  badge: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  section: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
});
