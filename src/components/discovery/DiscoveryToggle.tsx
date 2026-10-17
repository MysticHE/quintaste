import { Pressable, StyleSheet } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";

export function DiscoveryToggle({ label, accessibilityLabel, checked, disabled, onPress }: {
  label: string; accessibilityLabel?: string; checked: boolean; disabled: boolean; onPress: () => void;
}) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={accessibilityLabel ?? label}
    disabled={disabled} accessibilityState={{ checked, disabled }} aria-checked={checked} onPress={onPress}
    style={({ pressed }) => [s.row, { borderColor: checked ? theme.accent : theme.border,
      backgroundColor: checked ? theme.accentSoft : theme.card, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <T style={[common.flex, common.bold]}>{label}</T>
    <Icon name={checked ? "checkbox" : "square-outline"} color={checked ? theme.accent : theme.mutedForeground} />
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, borderRadius: 16, borderWidth: 1, padding: 12 },
});
