import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../components/Screen";
import { Icon, T, common, type IconName } from "../components/ui";
import { ListGroup } from "../components/GroupedList";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { useDietText } from "../components/food/DietLabels";
import { useT } from "../i18n";
import type meMessages from "../i18n/en/me";

type Answer = { icon: IconName; question: keyof typeof meMessages; answer: keyof typeof meMessages };
/** Task questions members actually ask. Every answer states what QuinTaste does and does not check. */
const answers: Answer[] = [
  { icon: "leaf-outline", question: "helpPungentQ", answer: "helpPungentA" },
  { icon: "shield-checkmark-outline", question: "helpLabelsQ", answer: "helpLabelsA" },
  { icon: "bag-handle-outline", question: "helpMarketQ", answer: "helpMarketA" },
  { icon: "people-outline", question: "helpSocialQ", answer: "helpSocialA" },
  { icon: "phone-portrait-outline", question: "helpDataQ", answer: "helpDataA" },
  { icon: "flag-outline", question: "helpReportQ", answer: "helpReportA" },
];
export function HelpScreen() {
  const t = useT("me"), diet = useDietText();
  const labels = { vegan: diet.name("Vegan"), vegetarian: diet.name("Vegetarian") };
  return <Screen title={t("help")}>
    <ListGroup>{answers.map(item => <Question key={item.question} question={t(item.question)} answer={t(item.answer, labels)} icon={item.icon} />)}</ListGroup>
  </Screen>;
}
function Question({ question, answer, icon }: { question: string; answer: string; icon: IconName }) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), { focused, focusProps } = useKeyboardFocus();
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={question} onPress={() => setOpen(!open)} {...focusProps}
      style={({ pressed }) => [common.row, s.row, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[s.icon, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={20} color={theme.accent} /></View>
      <T style={[common.flex, common.bold]}>{question}</T>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
    </Pressable>
    {open && <T muted style={s.answer}>{answer}</T>}
  </View>;
}
const s = StyleSheet.create({
  row: { gap: 12, minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderRadius: 14 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  answer: { paddingLeft: 62, paddingRight: 16, paddingBottom: 14 },
});
