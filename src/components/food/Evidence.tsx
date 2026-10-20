import { StyleSheet, View } from "react-native";
import type { Dietary, Fit } from "../../types/food";
import type { Exclusion } from "../../config/preferences";
import { dietaryResult } from "../../utils/dietary";
import { usePreferences } from "../../state/Preferences";
import { Card, Icon, T, common, type IconName } from "../ui";
import { useCompactUI } from "../ui-density";

const fitIcons: Record<Fit, IconName> = { Vegan: "leaf", Vegetarian: "leaf-outline", Unknown: "help-circle-outline", Conflicts: "warning-outline" };
export function FitBadge({ fit }: { fit: Fit }) {
  const { theme } = usePreferences();
  const color = fit === "Conflicts" ? theme.warning : fit === "Unknown" ? theme.mutedForeground : theme.success;
  return <View style={[s.badge, { backgroundColor: fit === "Conflicts" ? theme.warningSoft : fit === "Unknown" ? theme.muted : theme.successSoft,
    borderColor: color, borderStyle: fit === "Unknown" ? "dashed" : "solid" }]} accessible accessibilityLabel={"Dietary fit: " + fit}>
    <View style={{ width: 15, height: 15 }}><Icon name={fitIcons[fit]} size={15} color={color} />{fit === "Vegetarian" && <View style={{ position: "absolute", left: 0, top: 0, width: 8, height: 15, overflow: "hidden" }}><Icon name="leaf" size={15} color={color} /></View>}</View><T variant="small" color={color} style={common.bold}>{fit}</T>
  </View>;
}
/** uncertain carries recipe compound-ingredient exclusions so Saved cards match the fit shown in Cook. */
export function EvidenceLine({ dietary, uncertain }: { dietary: Dietary; uncertain?: readonly Exclusion[] }) {
  const { draft } = usePreferences();
  const result = dietaryResult(dietary, draft.diets, draft.excluded, undefined, uncertain);
  return <View style={s.evidenceRow}><FitBadge fit={result.fit} /><T variant="small" muted>{result.evidence === "Current sample" ? dietary.evidence.kind === "menu" ? "Venue says · sample" : "Editorial · sample" : result.evidence}</T></View>;
}
export function EvidencePanel({ dietary }: { dietary: Dietary }) {
  const { draft, theme } = usePreferences();
  const compact = useCompactUI();
  const result = dietaryResult(dietary, draft.diets, draft.excluded);
  if (compact) return <View style={{ gap: 6 }}><EvidenceLine dietary={dietary} />
    <T variant="small" muted>{dietary.evidence.source}{dietary.evidence.checkedAt ? " · " + dietary.evidence.checkedAt : " · Undated"}</T>
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>Contains: {result.conflicts.join(", ")}</T>}
    {!!result.unknown.length && <T variant="small" muted>Unconfirmed: {result.unknown.join(", ")}</T>}
    {dietary.evidence.withdrawn && <T variant="small" color={theme.warning}>Evidence withdrawn</T>}
    <T variant="small" muted>Check labels. Not an allergen guarantee.</T>
  </View>;
  return <Card style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">Fit & Evidence</T>
    <EvidenceLine dietary={dietary} />
    <T variant="small" muted>{dietary.evidence.source}{dietary.evidence.checkedAt ? " · " + dietary.evidence.checkedAt : " · no confirmation date"}</T>
    <T>{result.fit === "Conflicts" ? "This item conflicts with your current choices."
      : result.fit === "Unknown" ? "There is not enough current evidence to confirm a fit."
        : "The listed sample ingredients fit your current choices."}</T>
    {!!result.conflicts.length && <T color={theme.warning}>Contains: {result.conflicts.join(", ")}</T>}
    {!!result.unknown.length && <T muted>Not confirmed: {result.unknown.join(", ")}</T>}
    {!result.conflicts.length && draft.diets.includes("Vegan") && dietary.diet === "Vegetarian" && <T color={theme.warning}>Vegetarian information does not establish that a dish is vegan.</T>}
    {dietary.evidence.withdrawn && <T muted>Previous evidence was withdrawn. It is no longer a confirmation.</T>}
    <T variant="small" muted>Ask about sauces, stock and shared equipment. This is ingredient guidance, not an allergen guarantee.</T>
  </Card>;
}
const s = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  evidenceRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
});
