import { Pressable, View } from "react-native";
import { T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { Chip, HorizontalChips, IconButton } from "../food/Controls";
import { router } from "expo-router";

/** A single-choice filter row under a section (My posts and Saved kinds, Messages kinds). */
/** `clearable`: nothing selected is allowed and a second tap clears the choice, so chips are checkboxes, not radios. */
export function ChoiceChips<V extends string>({ options, value, onChange, label, clearable = false }: {
  options: readonly { id: V; label: string }[]; value: V; onChange: (id: V) => void; label: string; clearable?: boolean;
}) {
  return <View accessibilityRole={clearable ? undefined : "radiogroup"} accessibilityLabel={label}><HorizontalChips bleed>
    {options.map(o => <Chip key={o.id} compact role={clearable ? "checkbox" : "radio"} label={o.label} selected={o.id === value} onPress={() => onChange(o.id)} />)}
  </HorizontalChips></View>;
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

