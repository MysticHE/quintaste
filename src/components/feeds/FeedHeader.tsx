import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { useCreateRecipe } from "../../screens/food/MyRecipes";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type { FeedTab } from "../../state/Feeds";

export function FeedHeader({ tab, onChange, filtered }: { tab: FeedTab; onChange: (tab: FeedTab) => void; filtered: boolean }) {
  const t = useT("feeds"), tc = useT("common"), { theme, reducedMotion } = usePreferences(), { width, height } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null), button = useRef<View>(null);
  const { create, readable } = useCreateRecipe();
  const first = useRef<View>(null);
  const tabs = useRef<ScrollView>(null);
  useEffect(() => {
    if (tab === "recipes") tabs.current?.scrollTo({ x: 0, animated: false });
    else if (tab === "market") tabs.current?.scrollToEnd({ animated: false });
  }, [tab, width]);
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
    { icon: "calendar-outline", title: "createEvent", hint: "createEventHint", run: () => router.push("/market/teaching?create=1") },
    { icon: "pricetag-outline", title: "listItem", hint: "listItemHint", run: () => router.push("/market/new") },
  ];
  const menuWidth = Math.min(320, width - 32);
  return <View testID="feeds-toolbar" style={[s.row, { borderBottomColor: theme.divider }]}>
    <ScrollView ref={tabs} horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabContent}
      onContentSizeChange={() => { if (tab === "market") tabs.current?.scrollToEnd({ animated: false }); }} accessibilityRole="tablist" accessibilityLabel={t("sections")}>
      {(["recipes", "events", "market"] as const).map(id => <FeedTabButton key={id} label={t(id)} selected={tab === id} onPress={() => onChange(id)} />)}
    </ScrollView>
    <Pressable accessibilityRole="button" accessibilityLabel={t(tab === "recipes" ? "searchRecipes" : tab === "events" ? "searchEvents" : "searchMarket")}
      onPress={() => router.push({ pathname: "/feed-search", params: { tab } })} style={s.action}>
      <Icon name="search-outline" size={24} />{filtered && <View testID="feed-search-active" style={[s.dot, { backgroundColor: theme.accent }]} />}
    </Pressable>
    <Pressable ref={button} accessibilityRole="button" accessibilityLabel={t("addPost")} accessibilityState={{ expanded: !!anchor }}
      {...(Platform.OS === "web" ? { "aria-haspopup": "dialog" as const } : {})}
      style={[s.action, { backgroundColor: anchor ? theme.accentSoft : theme.transparent, borderRadius: 12 }]}
      onPress={() => button.current?.measureInWindow((x, y, w, h) => setAnchor({ x: x + w, y: y + h }))}>
      <View style={{ borderWidth: 1.8, borderColor: anchor ? theme.accent : theme.foreground, borderRadius: 7 }}><Icon name="add-outline" size={24} color={anchor ? theme.accent : theme.foreground} /></View>
    </Pressable>
    <Modal visible={!!anchor} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={close} onShow={() => { if (Platform.OS === "web") (first.current as unknown as HTMLElement)?.focus?.(); }}>
      <View style={common.flex}>
        <Pressable accessibilityRole="button" accessibilityLabel={tc("close")} onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <View accessibilityViewIsModal role="dialog" accessibilityLabel={t("addPost")} testID="feed-add-menu"
          style={[s.menu, { backgroundColor: theme.card, width: menuWidth, maxHeight: height - 48,
            left: Math.max(16, Math.min((anchor?.x ?? width - 16) - menuWidth, width - menuWidth - 16)), top: Math.max(16, Math.min(anchor?.y ?? 70, height - 300)) }]}>
          <ScrollView keyboardShouldPersistTaps="handled">{actions.map((action, index) => <Pressable key={action.title} ref={index === 0 ? first : undefined}
            accessibilityRole="button" accessibilityLabel={t(action.title)} accessibilityHint={t(action.hint)} disabled={index === 0 && !readable}
            onPress={() => { close(); action.run(); }} style={({ pressed }) => [s.menuRow, { borderTopWidth: index ? 1 : 0, borderTopColor: theme.divider, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
            <Icon name={action.icon} size={27} color={theme.accent} /><View style={common.flex}><T style={common.bold}>{t(action.title)}</T><T variant="small" muted>{t(action.hint)}</T></View>
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
function FeedTabButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.tab, { borderBottomColor: selected ? theme.accent : theme.transparent, backgroundColor: focused || pressed ? theme.accentSoft : theme.transparent }]}>
    <T variant="button" numberOfLines={1} color={selected ? theme.accent : theme.foreground} style={[common.bold, { textAlign: "center" }]}>{label}</T>
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 0 }, tabs: { flexDirection: "row", flex: 1, minWidth: 0 },
  tabContent: { flexGrow: 1 },
  tab: { flexGrow: 1, flexShrink: 0, minWidth: 64, minHeight: 48, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 2 },
  action: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }, dot: { position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
  menu: { position: "absolute", borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.18)" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, minHeight: 80 },
});
