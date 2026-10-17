import { Pressable, View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { Card, Icon, T, common, type IconName } from "./ui";

export function LinkRow({ label, text, icon = "chevron-forward", onPress, hint }: { label: string; text?: string; icon?: IconName; onPress: () => void; hint?: string }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? .7 : 1 })}>
    <Card style={[common.row, { padding: 12, borderRadius: 18, minHeight: 48 }]}><View style={[common.flex, { gap: 3 }]}><T style={common.bold}>{label}</T>{!!text && <T variant="small" muted>{text}</T>}</View><Icon name={icon} color={theme.accent} /></Card>
  </Pressable>;
}
