import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { Icon, T } from "../ui";
import { ensureMember, useMember } from "../CommunityGate";
import { ReportSheet } from "../ReportSheet";
import { useT } from "../../i18n";

type Action = { key: string; label: string; accessible: string; icon: "create-outline" | "flag-outline"; onPress: () => void };
/**
 * Production: one "Report A Problem" action that files to the staff case queue (signed-in members only).
 * Development also keeps the local review service's correction and concern drafts.
 */
export function PlaceFeedbackActions({ name, placeId, menuId }: { name: string; placeId: string; menuId?: string }) {
  const { theme } = usePreferences(), member = useMember(), [open, setOpen] = useState(false), t = useT("explore");
  const local = (kind: "correction" | "report") => router.push({ pathname: "/contribute", params: { target: name, kind, placeId,
    ...(kind === "correction" && menuId ? { menuId } : {}) } });
  const actions: Action[] = __DEV__
    ? [{ key: "correction", label: t("correction"), accessible: t("suggestCorrectionA11y"), icon: "create-outline", onPress: () => local("correction") },
      { key: "report", label: t("reportConcern"), accessible: t("reportConcernA11y"), icon: "flag-outline", onPress: () => local("report") }]
    : menuId ? [{ key: "problem", label: t("reportProblem"), accessible: t("reportProblemWith", { name }), icon: "flag-outline",
      onPress: () => { if (ensureMember(member, "/place/catalogue-" + menuId)) setOpen(true); } }] : [];
  if (!actions.length) return null;
  return <View style={s.actions}>
    {actions.map(action => <Pressable key={action.key} accessibilityRole="button" accessibilityLabel={action.accessible} onPress={action.onPress}
      style={({ pressed }) => [s.action, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
      <Icon name={action.icon} size={19} color={theme.accent} /><T variant="small" style={s.label}>{action.label}</T>
    </Pressable>)}
    {!__DEV__ && menuId && <ReportSheet kind="place" targetId={menuId} name={name} visible={open} onClose={() => setOpen(false)} />}
  </View>;
}
const s = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 }, action: { flex: 1, minHeight: 52, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  label: { flexShrink: 1 },
});
