import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Icon, T, common, type IconName } from "./ui";

/** Navigation labels with optional current values, without descriptive subtitles. */
export function SettingsRow({ label, icon, leading, value, last = false, onPress }: {
  label: string; icon?: IconName; leading?: ReactNode; value?: string; last?: boolean; onPress: () => void;
}) {
  const { theme } = usePreferences();
  const [focused, setFocused] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityValue={value ? { text: value } : undefined}
      onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [s.row, { backgroundColor: pressed ? theme.accentSoft : theme.transparent, borderColor: focused ? theme.accent : theme.transparent }]}>
      <View style={s.icon}>{leading ?? (icon && <Icon name={icon} size={24} color={theme.accent} />)}</View>
      <T style={[common.flex, common.bold]}>{label}</T>
      {value !== undefined && <T variant="small" muted style={s.value}>{value}</T>}
      <Icon name="chevron-forward" size={18} />
    </Pressable>
    {!last && <View style={[s.divider, { backgroundColor: theme.divider }]} />}
  </View>;
}
const s = StyleSheet.create({
  row: { minHeight: 56, paddingVertical: 10, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 8 },
  icon: { width: 28, alignItems: "center" },
  value: { maxWidth: "35%", flexShrink: 1, textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 44 },
});
