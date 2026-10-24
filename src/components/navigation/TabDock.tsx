import { BlurView } from "expo-blur";
import type { Tabs } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { T } from "../ui";
import { useInbox } from "../InboxCounts";
import { usePreferences } from "../../state/Preferences";
import { QuinTasteIcon, type QuinTasteTab } from "./QuinTasteIcon";
import { useGlassNavigation } from "./GlassNavigation";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useT } from "../../i18n";

type DockProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
const tabs: Record<string, { label: "tabExplore" | "tabCook" | "tabSocial" | "tabMarket" | "tabGame"; icon: QuinTasteTab }> = {
  "(explore)": { label: "tabExplore", icon: "explore" },
  cook: { label: "tabCook", icon: "cook" },
  social: { label: "tabSocial", icon: "social" },
  game: { label: "tabGame", icon: "game" },
};

export function TabDock({ state, descriptors, navigation, insets }: DockProps) {
  // A dot, not a number: the counts themselves sit where each thing lives (Messages, My shop, Dining).
  const { theme } = usePreferences(), activity = (useInbox()?.total ?? 0) > 0, t = useT("common");
  const glass = useGlassNavigation(), setHeight = glass?.setHeight;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => { setKeyboardVisible(true); setHeight?.(0); });
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { shown.remove(); hidden.remove(); };
  }, [setHeight]);
  if (keyboardVisible) return null;
  return <View testID="navigation-dock" style={s.host} pointerEvents="box-none" onLayout={event => setHeight?.(event.nativeEvent.layout.height)}>
    <View testID="navigation-surface" style={[s.dock, { paddingBottom: Math.max(insets.bottom, 2),
      paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8),
      backgroundColor: glass?.reduceTransparency ? theme.card : theme.transparent }]}>
      {!glass?.reduceTransparency && (Platform.OS !== "android" || !!glass?.target) &&
        <BlurView testID="navigation-blur" blurTarget={glass?.target} blurMethod="dimezisBlurView" intensity={70}
          tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      {!glass?.reduceTransparency && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.navigation.glassTint }]} />}
      <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel={t("mainNavigation")}>
        {state.routes.map((route, index) => {
          // The hidden Market route is the Orders / My shop hub opened from Social.
          const item = tabs[route.name], { options } = descriptors[route.key], selected = state.index === index || (route.name === "social" && state.routes[state.index]?.name === "market");
          if (!item) return null;
          const press = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const dot = route.name === "social" && activity;
          return <DockTab key={route.key} label={t(item.label)} icon={item.icon} selected={selected} onPress={press} dot={dot}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? t(item.label) + (dot ? t("tabActivity") : "") + t("tabPosition", { i: state.routes.filter(r => !!tabs[r.name]).findIndex(r => r.key === route.key) + 1, n: Object.keys(tabs).length })}
            testID={options.tabBarButtonTestID ?? "tab-" + item.icon} onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })} />;
        })}
      </View>
    </View>
  </View>;
}

function DockTab({ label, icon, selected, onPress, onLongPress, accessibilityLabel, testID, dot = false }: {
  label: string; icon: QuinTasteTab; selected: boolean; onPress: () => void; onLongPress: () => void;
  accessibilityLabel: string; testID?: string; dot?: boolean;
}) {
  const { theme } = usePreferences();
  const { focused, focusProps } = useKeyboardFocus(), [hovered, setHovered] = useState(false);
  const color = selected ? theme.navigation.selectedForeground : theme.mutedForeground;
  return <Pressable accessibilityRole="tab" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }} aria-selected={selected} testID={testID}
    onPress={onPress} onLongPress={onLongPress}
    {...focusProps}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [s.tab, { backgroundColor: theme.transparent,
      borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.78 : 1 },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <View testID={"tab-highlight-" + icon} style={[s.highlight, {
      backgroundColor: selected ? theme.navigation.selection : hovered ? theme.navigation.hover : theme.transparent,
      borderColor: selected ? theme.navigation.selectedForeground : theme.transparent,
    }]}><QuinTasteIcon name={icon} color={color} selected={selected} size={27} /></View>
    <T variant="caption" color={color} style={{ textAlign: "center", fontSize: 11, marginTop: 2 }}>{label}</T>
    {dot && <View testID={"tab-dot-" + icon} pointerEvents="none" style={[s.dot, { backgroundColor: theme.accent, borderColor: theme.background }]} />}
  </Pressable>;
}

const s = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  dock: { width: "100%", maxWidth: 760, borderWidth: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flex: 1, minWidth: 48, minHeight: 68, paddingHorizontal: 2,
    borderWidth: 2, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dot: { position: "absolute", top: 6, left: "58%", width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  highlight: { width: "100%", maxWidth: 68, height: 38, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
