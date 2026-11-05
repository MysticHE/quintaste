import type { PropsWithChildren, ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { usePreferences } from "../../state/Preferences";

/** Collection uses flat sections: compact content, with a full 48-point disclosure target. */
export function CollectionSection({ title, aside, expanded, onToggle, children }: PropsWithChildren<{
  title: string; aside?: string; expanded?: boolean; onToggle?: () => void;
}>) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const heading = <>
    <T accessibilityRole={onToggle ? undefined : "header"} style={[common.bold, { flex: 1 }]}>{title}</T>
    {!!aside && <T variant="small" muted>{aside}</T>}
    {onToggle && <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} />}
  </>;
  return <View style={{ gap: 2 }}>
    {onToggle ? <Pressable accessibilityRole="button" accessibilityLabel={[title, aside].filter(Boolean).join(", ")}
      accessibilityState={{ expanded }} onPress={onToggle} {...focusProps}
      style={({ pressed }) => [s.heading, { backgroundColor: pressed ? theme.accentSoft : theme.transparent,
        borderColor: focused ? theme.accent : theme.transparent }, Platform.OS === "web" && s.noOutline]}>{heading}</Pressable>
      : <View style={s.heading}>{heading}</View>}
    {children}
  </View>;
}

/** The same distinct icon, text and trailing value rhythm across earning tasks and requirements. */
export function CollectionRow({ title, icon, meta, trailing, onPress, label, done = false }: {
  title: string; icon: IconName; meta?: ReactNode; trailing?: ReactNode; onPress?: () => void; label?: string; done?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const body = <>
    <View style={s.icon}><Icon name={done ? "checkmark-circle-outline" : icon} size={22} color={done ? theme.success : theme.accent} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}><T variant="button" style={common.bold}>{title}</T>{meta}</View>
    {trailing}
    {onPress && <Icon name="chevron-forward" size={15} />}
  </>;
  const style = [s.row, { borderBottomColor: theme.divider }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...focusProps}
    style={({ pressed }) => [style, { backgroundColor: pressed ? theme.accentSoft : theme.transparent,
      borderColor: focused ? theme.accent : theme.transparent, borderBottomColor: focused ? theme.accent : theme.divider },
      Platform.OS === "web" && s.noOutline]}>{body}</Pressable>
    : <View style={style}>{body}</View>;
}

/** A progress bar always has a text counterpart; it never substitutes for the requirement. */
export function ProgressLine({ done, of, complete = done >= of }: { done: number; of: number; complete?: boolean }) {
  const { theme } = usePreferences(), ratio = of > 0 ? Math.max(0, Math.min(1, done / of)) : 0;
  return <View accessible={false} style={{ height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: theme.muted }}>
    <View style={{ width: `${ratio * 100}%`, height: 4, borderRadius: 2, backgroundColor: complete ? theme.success : theme.accent }} />
  </View>;
}

const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 2, gap: 8, borderWidth: 2, borderColor: "transparent", borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 60, paddingVertical: 10, paddingHorizontal: 2,
    borderWidth: 2, borderColor: "transparent", borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 28, alignItems: "center", alignSelf: "flex-start", paddingTop: 2 },
  noOutline: { outlineStyle: "solid", outlineWidth: 0 },
});
