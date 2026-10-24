import { Pressable, View } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
export function ChatContext({ title, detail, status, action, icon, onPress }: { title: string; detail: string; status?: string; action: string; icon: IconName; onPress: () => void }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={[title, detail, status, action].filter(Boolean).join(", ")} onPress={onPress}
    style={({ pressed }) => ({ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card, gap: 8 })}>
    <View style={[common.row, { gap: 10, alignItems: "flex-start" }]}><Icon name={icon} size={24} color={theme.accent} /><View style={[common.flex, { gap: 5 }]}>
      <T style={common.bold} numberOfLines={2}>{title}</T><T variant="small">{detail}</T>{!!status && <T variant="caption" color={theme.accent}>{status}</T>}
    </View></View><View style={[common.row, { justifyContent: "flex-end", gap: 4 }]}><T variant="small" color={theme.accent}>{action}</T><Icon name="chevron-forward" size={16} color={theme.accent} /></View>
  </Pressable>;
}
