import { StyleSheet, View } from "react-native";
import type { Dietary, Fit } from "../../types/food";
import type { Exclusion } from "../../config/preferences";
import { dietaryResult } from "../../utils/dietary";
import { usePreferences } from "../../state/Preferences";
import { Card, Icon, T, common, type IconName } from "../ui";
import { useCompactUI } from "../ui-density";
import { useLanguage, useT } from "../../i18n";
import { exclusionList } from "../../utils/recipe-dietary";
import { useDietText } from "./DietLabels";

const fitIcons: Record<Fit, IconName> = { Vegan: "leaf", Vegetarian: "leaf-outline", Unknown: "help-circle-outline", Conflicts: "warning-outline" };
export function FitBadge({ fit }: { fit: Fit }) {
  const { theme } = usePreferences(), t = useT("explore"), dietText = useDietText();
  const name = fit === "Unknown" ? t("fitUnknown") : fit === "Conflicts" ? t("fitConflicts") : dietText.name(fit);
  const color = fit === "Conflicts" ? theme.warning : fit === "Unknown" ? theme.mutedForeground : theme.success;
  return <View style={[s.badge, { backgroundColor: fit === "Conflicts" ? theme.warningSoft : fit === "Unknown" ? theme.muted : theme.successSoft,
    borderColor: color, borderStyle: fit === "Unknown" ? "dashed" : "solid" }]} accessible accessibilityLabel={t("dietaryFit", { fit: name })}>
    <View style={{ width: 15, height: 15 }}><Icon name={fitIcons[fit]} size={15} color={color} />{fit === "Vegetarian" && <View style={{ position: "absolute", left: 0, top: 0, width: 8, height: 15, overflow: "hidden" }}><Icon name="leaf" size={15} color={color} /></View>}</View><T variant="small" color={color} style={common.bold}>{name}</T>
  </View>;
}
/** uncertain carries recipe compound-ingredient exclusions so Saved cards match the fit shown in Cook. */
export function EvidenceLine({ dietary, uncertain }: { dietary: Dietary; uncertain?: readonly Exclusion[] }) {
  const { draft } = usePreferences(), t = useT("explore");
  const result = dietaryResult(dietary, draft.diets, draft.excluded, undefined, uncertain);
  // An unproven fit shows no badge: only a clash or a proven label is worth a label (owner, 31 Oct 2026: no unconfirmed labels).
  return <View style={s.evidenceRow}>{result.fit !== "Unknown" && <FitBadge fit={result.fit} />}<T variant="small" muted>{result.evidence === "Current sample" ? t(dietary.evidence.kind === "menu" ? "venueSaysSample" : "editorialSample") : t("evidence", { value: result.evidence })}</T></View>;
}
export function EvidencePanel({ dietary }: { dietary: Dietary }) {
  const { draft, theme } = usePreferences(), t = useT("explore"), language = useLanguage(), dietText = useDietText();
  const compact = useCompactUI();
  const result = dietaryResult(dietary, draft.diets, draft.excluded);
  const conflicts = exclusionList(result.conflicts, language);
  if (compact) return <View style={{ gap: 6 }}><EvidenceLine dietary={dietary} />
    <T variant="small" muted>{dietary.evidence.source}{" · " + (dietary.evidence.checkedAt || t("undated"))}</T>
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>{t("containsList", { list: conflicts })}</T>}
    {dietary.evidence.withdrawn && <T variant="small" color={theme.warning}>{t("evidenceWithdrawn")}</T>}
    <T variant="small" muted>{t("checkLabels")}</T>
  </View>;
  return <Card style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">{t("fitEvidence")}</T>
    <EvidenceLine dietary={dietary} />
    <T variant="small" muted>{dietary.evidence.source}{" · " + (dietary.evidence.checkedAt || t("noConfirmationDate"))}</T>
    <T>{t(result.fit === "Conflicts" ? "conflictsWithChoices" : result.fit === "Unknown" ? "checkLabels" : "sampleFits")}</T>
    {!!result.conflicts.length && <T color={theme.warning}>{t("containsList", { list: conflicts })}</T>}
    {!result.conflicts.length && draft.diets.includes("Vegan") && dietary.diet === "Vegetarian" && <T color={theme.warning}>{t("vegetarianNotVegan", { vegetarian: dietText.name("Vegetarian"), vegan: dietText.name("Vegan") })}</T>}
    {dietary.evidence.withdrawn && <T muted>{t("previousWithdrawn")}</T>}
    <T variant="small" muted>{t("askSauces")}</T>
  </Card>;
}
const s = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  evidenceRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
});
