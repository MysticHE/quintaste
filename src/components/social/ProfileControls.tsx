import { ScrollView, Pressable, View } from "react-native";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { IconButton } from "../food/Controls";
import { router } from "expo-router";

export function ProfileTabs<Tab extends string>({ options, value, onChange, solid = false, label }: {
  options: { id: Tab; label: string }[]; value: Tab; onChange: (id: Tab) => void; solid?: boolean; label: string;
}) {
  const { theme } = usePreferences();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1, borderRadius: 12, backgroundColor: solid ? theme.muted : theme.transparent }}
    accessibilityRole="tablist" accessibilityLabel={label}>
    {options.map(o => <Pressable key={o.id} accessibilityRole="tab" accessibilityLabel={o.label} accessibilityState={{ selected: o.id === value }} aria-selected={o.id === value}
      onPress={() => onChange(o.id)} style={({ pressed }) => ({ flex: 1, flexBasis: 'auto', minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: solid ? 12 : 0,
        backgroundColor: solid && o.id === value ? theme.foreground : pressed ? theme.accentSoft : theme.transparent,
        borderBottomWidth: solid ? 0 : 2, borderBottomColor: o.id === value ? theme.accent : theme.transparent })}>
      <T variant="button" style={{ textAlign: "center" }} color={solid && o.id === value ? theme.background : o.id === value ? theme.accent : theme.foreground}>{o.label}</T>
    </Pressable>)}
  </ScrollView>;
}
export function MessagesButton({ unread }: { unread: number }) {
  const t = useT("profile");
  return <IconButton icon="chatbubble-outline" label={unread ? t("unreadMessages", { n: unread }) : t("messages")} badge={unread} appearance="plain" onPress={() => router.push("/messages")} />;
}
export function ProfileSection({ title, onPress, action }: { title: string; onPress?: () => void; action?: string }) {
  const { theme } = usePreferences();
  return <View style={[common.row, { justifyContent: "space-between", gap: 8, marginTop: 8 }]}><T variant="subtitle" accessibilityRole="header" style={common.flex}>{title}</T>
    {onPress && <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: "center" }}><T variant="small" color={theme.accent}>{action}</T></Pressable>}</View>;
}
export function PrivateSaves() { const t = useT("profile"); return <View style={[common.row, { gap: 6 }]}><Icon name="lock-closed-outline" size={14} /><T variant="small" muted style={common.flex}>{t("privateSaves")}</T></View>; }
