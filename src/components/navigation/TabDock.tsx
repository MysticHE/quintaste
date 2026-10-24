import { BlurView } from "expo-blur";
import type { Tabs } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { T, common } from "../ui";
import { useMarketUnread } from "../market/MarketUnread";
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
  market: { label: "tabMarket", icon: "market" },
  game: { label: "tabGame", icon: "game" },
};

export function TabDock({ state, descriptors, navigation, insets }: DockProps) {
  const { theme } = usePreferences(), marketBadge = useMarketUnread()?.count ?? 0, t = useT("common");
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
          const item = tabs[route.name], { options } = descriptors[route.key], selected = state.index === index;
          if (!item) return null;
          const press = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const badge = route.name === "market" ? marketBadge : 0;
          return <DockTab key={route.key} icon={item.icon} selected={selected} onPress={press} badge={badge}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? t(item.label) + (badge ? t("tabNew", { n: badge }) : "") + t("tabPosition", { i: index + 1, n: state.routes.length })}
            testID={options.tabBarButtonTestID ?? "tab-" + item.icon} onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })} />;
        })}
      </View>
    </View>
  </View>;
}

function DockTab({ icon, selected, onPress, onLongPress, accessibilityLabel, testID, badge = 0 }: {
  icon: QuinTasteTab; selected: boolean; onPress: () => void; onLongPress: () => void;
  accessibilityLabel: string; testID?: string; badge?: number;
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
    }]}><QuinTasteIcon name={icon} color={color} selected={selected} size={30} /></View>
    {badge > 0 && <View pointerEvents="none" style={[s.badge, { backgroundColor: theme.accent }]}>
      <T variant="caption" color={theme.actionForeground} style={common.bold}>{badge > 99 ? "99+" : badge}</T></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  dock: { width: "100%", maxWidth: 760, borderWidth: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flex: 1, minWidth: 48, minHeight: 56, paddingHorizontal: 2,
    borderWidth: 2, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  badge: { position: "absolute", top: 4, left: "55%", minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  highlight: { width: "100%", maxWidth: 68, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
