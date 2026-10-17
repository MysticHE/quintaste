import type { ReactNode } from "react";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { Pressable, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, common } from "../ui";

/** Shared checkbox row (consents, label checks, checklists). Checklists opt into strike so ticked lines recede. */
export function CheckRow({ label, spoken, caption, checked, onPress, disabled = false, size = "body", strike = false, trailing }: {
  label: string; spoken?: string; caption?: string; checked: boolean; onPress: () => void; disabled?: boolean;
  size?: "small" | "body" | "large"; strike?: boolean; trailing?: ReactNode;
}) {
  const { theme, textMultiplier } = usePreferences();
  const { focused, focusProps } = useKeyboardFocus();
  const large = size === "large", receded = strike && checked;
  return <View style={[common.row, { gap: 4 }]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={spoken ?? label} accessibilityHint={caption} accessibilityState={{ checked, disabled }}
      aria-checked={checked} aria-disabled={disabled} disabled={disabled} onPress={onPress} {...focusProps}
      style={({ pressed }) => [common.row, common.flex, { minHeight: large ? 56 : 48, gap: 10, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid" }]}>
      <Icon name={checked ? "checkbox" : "square-outline"} size={large ? 26 : 22} color={theme.accent} />
      <View style={[common.flex, { gap: 2 }]}>
        <T variant={size === "small" ? "small" : "body"} color={receded ? theme.mutedForeground : theme.foreground}
          style={[large && { fontSize: 18 * textMultiplier, lineHeight: 26 * textMultiplier }, receded && { textDecorationLine: "line-through" }]}>{label}</T>
        {!!caption && <T variant="small" muted>{caption}</T>}
      </View>
    </Pressable>
    {trailing}
  </View>;
}
