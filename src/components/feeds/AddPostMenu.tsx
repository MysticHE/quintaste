import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewInstance } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { useCreateRecipe } from "../../screens/food/MyRecipes";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";

/** The one Add post control (Feeds and Social): a + button that drops a menu of what a member can post. */
export function AddPostMenu() {
  const t = useT("feeds"), tc = useT("common"), { theme, reducedMotion } = usePreferences(), { width, height } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null), button = useRef<ViewInstance>(null), first = useRef<ViewInstance>(null);
  const { create, readable } = useCreateRecipe(), { focused, focusProps } = useKeyboardFocus();
  useFocusEffect(useCallback(() => () => setAnchor(null), []));
  const close = useCallback(() => { setAnchor(null); if (Platform.OS === "web") (button.current as unknown as HTMLElement)?.focus?.(); }, []);
  useEffect(() => {
    if (!anchor || Platform.OS !== "web") return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [anchor, close]);
  const actions: { icon: IconName; title: "shareRecipe" | "createEvent" | "listItem"; hint: "shareRecipeHint" | "createEventHint" | "listItemHint"; run: () => void }[] = [
    { icon: "create-outline", title: "shareRecipe", hint: "shareRecipeHint", run: () => void create() },
    // Members who do not teach yet land on Apply To Teach.
    { icon: "calendar-outline", title: "createEvent", hint: "createEventHint", run: () => router.push("/market/teaching?create=1") },
    { icon: "pricetag-outline", title: "listItem", hint: "listItemHint", run: () => router.push("/market/new") },
  ];
  const menuWidth = Math.min(320, width - 32), open = !!anchor, color = open ? theme.accent : theme.foreground;
  return <>
    <Pressable ref={button} accessibilityRole="button" accessibilityLabel={t("addPost")} accessibilityState={{ expanded: open }} {...focusProps}
      {...(Platform.OS === "web" ? { "aria-haspopup": "dialog" as const } : {})}
      style={[s.button, { backgroundColor: open ? theme.accentSoft : theme.transparent, borderColor: focused ? theme.accent : theme.transparent },
        Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}
      onPress={() => button.current?.measureInWindow((x, y, w, h) => setAnchor({ x: x + w, y: y + h }))}>
      <View style={[s.plus, { borderColor: color }]}><Icon name="add-outline" size={22} color={color} /></View>
    </Pressable>
    <Modal visible={open} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={close} onShow={() => { if (Platform.OS === "web") (first.current as unknown as HTMLElement)?.focus?.(); }}>
      <View style={common.flex}>
        <Pressable accessibilityRole="button" accessibilityLabel={tc("close")} onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <View accessibilityViewIsModal role="dialog" accessibilityLabel={t("addPost")} testID="feed-add-menu"
          style={[s.menu, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: "0 8px 28px " + theme.shadow + "33", width: menuWidth, maxHeight: height - 48,
            left: Math.max(16, Math.min((anchor?.x ?? width - 16) - menuWidth, width - menuWidth - 16)), top: Math.max(16, Math.min(anchor?.y ?? 70, height - 300)) }]}>
          <ScrollView keyboardShouldPersistTaps="handled">{actions.map((action, index) => <Pressable key={action.title} ref={index === 0 ? first : undefined}
            accessibilityRole="button" accessibilityLabel={t(action.title)} accessibilityHint={t(action.hint)} disabled={index === 0 && !readable}
            onPress={() => { close(); action.run(); }} style={({ pressed }) => [s.row, { borderTopWidth: index ? 1 : 0, borderTopColor: theme.divider, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
            <Icon name={action.icon} size={26} color={theme.accent} /><View style={common.flex}><T style={common.bold}>{t(action.title)}</T><T variant="small" muted>{t(action.hint)}</T></View>
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  button: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, borderWidth: 2 },
  plus: { borderWidth: 1.8, borderRadius: 7 },
  menu: { position: "absolute", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, minHeight: 72 },
});
