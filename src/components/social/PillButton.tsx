import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";

/** A one-word button for list rows and chat cards (Add, Accept, Confirm): 36 points tall, 48 to touch. */
export function PillButton({ label, onPress, primary = false, busy = false, disabled = false, wide = false, accessibilityLabel }: {
  label: string; onPress: () => void; primary?: boolean; busy?: boolean; disabled?: boolean; wide?: boolean; accessibilityLabel?: string;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), off = disabled || busy;
  // The same fill as the primary Button (ui.tsx): the action colour in light mode, the accent in dark mode.
  const fill = primary ? (theme.dark ? theme.accent : theme.action[0]) : theme.card, ink = primary ? (theme.dark ? theme.background : theme.actionForeground) : theme.foreground;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: off, busy }} disabled={off} onPress={onPress}
    hitSlop={6} {...focusProps} style={({ pressed }) => [s.button, wide && s.wide, { backgroundColor: fill, borderColor: focused ? theme.accent : primary ? fill : theme.border,
      opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
    {busy ? <ActivityIndicator color={ink} /> : <T variant="small" color={ink} style={common.bold} numberOfLines={1}>{label}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  button: { minHeight: 36, minWidth: 64, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  wide: { flex: 1, minHeight: 44, borderRadius: 12 },
});
