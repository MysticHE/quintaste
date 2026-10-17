import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { PublishedMenu } from "../../types/menus";
import { Icon, T, common } from "../ui";
import { MenuIcon } from "./MenuIcon";

export function MenuEntry({ menu, compact = false }: { menu: Pick<PublishedMenu, "id" | "name" | "branch">; compact?: boolean }) {
  const { theme } = usePreferences(), [focused, setFocused] = useState(false);
  const content = <><MenuIcon size={compact ? 20 : 22}
    color={compact ? theme.mediaForeground : theme.actionForeground} />
    <T variant={compact ? "small" : "button"} color={compact ? theme.mediaForeground : theme.actionForeground}
      style={common.bold}>Menu</T></>;
  return <Pressable accessibilityRole="button" accessibilityLabel={"View menu for " + menu.name + ", " + menu.branch}
    testID={compact ? "place-card-menu" : "place-detail-menu"}
    onPress={event => { event.stopPropagation(); router.push({ pathname: "/menu/[id]", params: { id: menu.id } } as never); }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [s.entry, compact && s.compact, { opacity: pressed ? 0.82 : 1,
      borderColor: focused ? (compact ? theme.mediaForeground : theme.foreground) : theme.transparent,
      backgroundColor: theme.transparent }]}>
    {compact ? <View style={[s.compactLabel, { backgroundColor: theme.mediaControl, borderColor: theme.mediaDivider }]}>{content}</View> : <LinearGradient colors={theme.action}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primary}>
      <View style={s.label}>{content}</View><View style={s.chevron}><Icon name="chevron-forward" color={theme.actionForeground} /></View>
    </LinearGradient>}
  </Pressable>;
}
const s = StyleSheet.create({
  entry: { minHeight: 52, borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  compact: { minHeight: 48, borderRadius: 16, alignSelf: "flex-start", justifyContent: "center" },
  compactLabel: { minHeight: 42, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  label: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  primary: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  chevron: { position: "absolute", right: 12 },
});
