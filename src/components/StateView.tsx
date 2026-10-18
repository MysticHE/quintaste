import { StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "./ui";
import { usePreferences } from "../state/Preferences";

const keep = new Set(["QuinTaste", "Market", "Cook", "Social", "Explore", "Google", "I", "OK"]);
/** Headings read as sentences ("No matching recipes"); product names and acronyms keep their capitals. Buttons stay Title Case. */
export function sentenceCase(title: string) {
  return title.split(" ").map((word, index) => index === 0 || keep.has(word) || /[0-9]/.test(word) || (word.length > 1 && word === word.toUpperCase()) ? word : word.toLowerCase()).join(" ");
}
export type StateAction = { label: string; onPress: () => void; icon?: IconName };
/**
 * The one empty, error and first-run state: an icon tile, a heading, at most one short line, then the next step.
 * `size="page"` fills an empty tab; `"inline"` sits inside a list or form.
 */
export function StateView({ icon, title, text, primary, secondary, size = "inline" }: {
  icon: IconName; title: string; text?: string; primary?: StateAction; secondary?: StateAction; size?: "page" | "inline";
}) {
  const { theme } = usePreferences(), page = size === "page";
  return <View style={[s.root, page ? s.page : s.inline]} accessibilityRole="summary">
    <View style={[s.tile, page ? s.tilePage : s.tileInline, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={page ? 38 : 28} color={theme.accent} /></View>
    <T variant={page ? "title" : "subtitle"} accessibilityRole="header" style={[common.center, common.bold]}>{sentenceCase(title)}</T>
    {!!text && <T muted style={[common.center, s.text]}>{text}</T>}
    {(primary || secondary) && <View style={s.actions}>
      {primary && <Button label={primary.label} icon={primary.icon} onPress={primary.onPress} />}
      {secondary && <Button label={secondary.label} icon={secondary.icon} variant="secondary" onPress={secondary.onPress} />}
    </View>}
  </View>;
}
const s = StyleSheet.create({
  root: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  page: { paddingTop: 56, paddingBottom: 40 },
  inline: { paddingVertical: 28 },
  tile: { alignItems: "center", justifyContent: "center", marginBottom: 6 },
  tilePage: { width: 80, height: 80, borderRadius: 24 },
  tileInline: { width: 60, height: 60, borderRadius: 18 },
  text: { maxWidth: 320 },
  actions: { marginTop: 12, gap: 8, minWidth: 180, alignSelf: "center" },
});
