import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { DietLabel } from "../../config/diet-labels";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { MarketModal } from "../market/MarketChrome";
import { Icon, T, common } from "../ui";
import { DietIcon } from "./DietIcon";

/** Translated name, rule and other-language name for each label (D23: the rule always travels with the word). */
export function useDietText() {
  const t = useT("diet");
  return useMemo(() => ({
    name: (label: DietLabel) => t(label === "Vegan" ? "nameVegan" : label === "Vegetarian" ? "nameVegetarian" : "namePlantBased"),
    rule: (label: DietLabel) => t(label === "Vegan" ? "ruleVegan" : label === "Vegetarian" ? "ruleVegetarian" : "rulePlantBased"),
    alt: (label: DietLabel) => t(label === "Vegan" ? "altVegan" : label === "Vegetarian" ? "altVegetarian" : "altPlantBased"),
    /** "Vegan · no dairy, egg, honey": one line for cards and lists. */
    line: (label: DietLabel) => t(label === "Vegan" ? "nameVegan" : label === "Vegetarian" ? "nameVegetarian" : "namePlantBased")
      + " · " + t(label === "Vegan" ? "ruleVegan" : label === "Vegetarian" ? "ruleVegetarian" : "rulePlantBased"),
    t,
  }), [t]);
}

/**
 * The labels an item proves, each with its icon, name and rule; tapping one opens the explainer.
 * Nothing renders when no label is proven.
 */
/** `declared`: the labels are a seller's own declaration (Market), and the sheet says so. */
export function DietLabels({ labels, note, interactive = true, declared = false }: { labels: readonly DietLabel[]; note?: string; interactive?: boolean; declared?: boolean }) {
  const { theme } = usePreferences(), text = useDietText();
  const [open, setOpen] = useState(false);
  if (!labels.length) return null;
  return <View style={[common.row, s.row]}>
    {labels.map(label => {
      const chip = <>
        <DietIcon diet={label} color={theme.success} size={16} />
        <T variant="small" color={theme.success} style={common.bold}>{text.name(label)}</T>
        <T variant="small" color={theme.success}>· {text.rule(label)}</T>
      </>;
      return interactive
        ? <Pressable key={label} accessibilityRole="button" accessibilityLabel={text.t("labelSpoken", { name: text.name(label), rule: text.rule(label) })}
          accessibilityHint={text.t("explainHint")} onPress={() => setOpen(true)}
          style={({ pressed }) => [s.chip, { backgroundColor: pressed ? theme.accentSoft : theme.successSoft, borderColor: theme.success }]}>{chip}</Pressable>
        : <View key={label} accessible accessibilityLabel={text.t("labelSpoken", { name: text.name(label), rule: text.rule(label) })}
          style={[s.chip, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>{chip}</View>;
    })}
    {!!note && <T variant="small" muted>{note}</T>}
    {interactive && <DietLabelSheet visible={open} onClose={() => setOpen(false)} declared={declared} />}
  </View>;
}

/** A small "What the labels mean" link for filters, Food Choices and anywhere labels are chosen. */
export function DietLabelHelp() {
  const { theme } = usePreferences(), text = useDietText();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={text.t("explain")} onPress={() => setOpen(true)} hitSlop={8}
      style={({ pressed }) => [s.help, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="information-circle-outline" size={18} color={theme.accent} />
      <T variant="small" color={theme.accent} style={common.bold}>{text.t("explain")}</T>
    </Pressable>
    <DietLabelSheet visible={open} onClose={() => setOpen(false)} />
  </>;
}

/** What each label means, in the interface language with the other language's name beside it. */
export function DietLabelSheet({ visible, onClose, declared = false }: { visible: boolean; onClose: () => void; declared?: boolean }) {
  const { theme } = usePreferences(), text = useDietText();
  const rows: { label: DietLabel; detail: string }[] = [
    { label: "Vegan", detail: text.t("detailVegan") },
    { label: "Vegetarian", detail: text.t("detailVegetarian") },
    { label: "Plant-Based", detail: text.t("detailPlantBased") },
  ];
  return <MarketModal visible={visible} onClose={onClose} label={text.t("sheetTitle")}>
    <ScrollView style={s.scroll} contentContainerStyle={s.sheet}>
    <T variant="small" muted>{text.t(declared ? "sheetIntroDeclared" : "sheetIntro")}</T>
    {rows.map(row => <View key={row.label} style={[s.entry, { borderColor: theme.border }]} accessible
      accessibilityLabel={text.name(row.label) + ", " + text.rule(row.label) + ". " + row.detail}>
      <DietIcon diet={row.label} color={theme.success} size={26} />
      <View style={[common.flex, s.entryText]}>
        <View style={[common.row, s.names]}>
          <T style={common.bold}>{text.name(row.label)}</T>
          <T variant="small" muted>{text.alt(row.label)}</T>
        </View>
        <T variant="small" color={theme.success} style={common.bold}>{text.rule(row.label)}</T>
        <T variant="small">{row.detail}</T>
      </View>
    </View>)}
    <T variant="small">{text.t("detailBoth")}</T>
    <View style={[s.pungent, { backgroundColor: theme.muted }]}>
      <T variant="small" style={common.bold}>{text.t("fivePungentTitle")}</T>
      <T variant="small">{text.t("fivePungentList")}</T>
    </View>
    <T variant="caption" muted>{text.t("notAllergy")}</T>
    </ScrollView>
  </MarketModal>;
}

/**
 * On a vegetarian place that has not proven the no-five-pungent check: says so plainly and offers the question to show
 * the stall, in Chinese with its English meaning.
 */
export function PungentUnconfirmed() {
  const { theme } = usePreferences(), text = useDietText();
  const [open, setOpen] = useState(false);
  return <View style={[s.unconfirmed, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(value => !value)}
      accessibilityLabel={text.t("pungentUnconfirmed") + ". " + text.t("askStallTitle")} style={[common.row, s.unconfirmedRow]}>
      <DietIcon diet="Vegetarian" color={theme.mutedForeground} size={18} />
      <T variant="small" muted style={common.flex}>{text.t("pungentUnconfirmed")}</T>
      <T variant="small" color={theme.accent} style={common.bold}>{text.t("askStallTitle")}</T>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.accent} />
    </Pressable>
    {open && <View style={s.question}>
      <T variant="subtitle" selectable>{text.t("askStallQuestion")}</T>
      <T variant="small" muted selectable>{text.t("askStallTranslation")}</T>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  row: { gap: 6, flexWrap: "wrap", alignItems: "center" },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5 },
  help: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  scroll: { flexShrink: 1 },
  sheet: { gap: 14 },
  entry: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1, borderRadius: 12, padding: 10 },
  entryText: { gap: 2 },
  names: { gap: 8, flexWrap: "wrap", alignItems: "baseline" },
  pungent: { borderRadius: 12, padding: 10, gap: 2 },
  unconfirmed: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10 },
  unconfirmedRow: { gap: 8, minHeight: 44 },
  question: { gap: 4, paddingBottom: 10 },
});
