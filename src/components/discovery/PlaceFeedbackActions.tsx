import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { Icon, T } from "../ui";

export function PlaceFeedbackActions({ name, placeId, menuId }: { name: string; placeId: string; menuId?: string }) {
  const { theme } = usePreferences();
  return <View style={s.actions}>
    {([{ kind: "correction", label: "Correction", accessible: "Suggest a correction", icon: "create-outline" },
      { kind: "report", label: "Report concern", accessible: "Report a concern", icon: "flag-outline" }] as const).map(action =>
      <Pressable key={action.kind} accessibilityRole="button" accessibilityLabel={action.accessible}
        onPress={() => router.push({ pathname: "/contribute", params: { target: name, kind: action.kind, placeId,
          ...(action.kind === "correction" && menuId ? { menuId } : {}) } })}
        style={({ pressed }) => [s.action, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
        <Icon name={action.icon} size={19} color={theme.accent} /><T variant="small" style={s.label}>{action.label}</T>
      </Pressable>)}
  </View>;
}
const s = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 }, action: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  label: { flexShrink: 1 },
});
