import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../components/Screen";
import { Icon, T, common, type IconName } from "../components/ui";
import { ListGroup } from "../components/GroupedList";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";

type Answer = { icon: IconName; question: string; answer: string };
/** Task questions members actually ask. Every answer states what QuinTaste does and does not check. */
const answers: Answer[] = [
  { icon: "leaf-outline", question: "How do I find food with no five pungent (五辛)?",
    answer: "In QuinTaste, Vegetarian means no five pungent: garlic, onion, shallots, spring onion, leeks, chives and asafoetida. Vegan means no dairy, egg or honey. In Explore or Cook, open the filter in the search box and choose Vegetarian. Sauces can still hide garlic or onion, so ask the stall when it matters." },
  { icon: "shield-checkmark-outline", question: "Are the diet labels checked?",
    answer: "A place shows Vegan or Vegetarian only when the venue's own information says so; otherwise it shows no label. Each place lists its sources and the date they were checked. Market sellers and recipe authors declare their own food. QuinTaste does not certify any food or seller." },
  { icon: "bag-handle-outline", question: "How do I buy from Market?",
    answer: "Choose an item, pick a collection slot and send the order. The seller confirms it, and you pay them in cash or PayNow when you collect. QuinTaste does not take payment." },
  { icon: "people-outline", question: "How do I find people to eat with?",
    answer: "In Social, finish your profile and turn on Open to plans. Invite one, three or five people, agree a public place and time in the group chat, and everyone confirms before the meal." },
  { icon: "phone-portrait-outline", question: "Where is my data kept?",
    answer: "Saves, notes, recipe drafts, your shopping list and Home and Work addresses stay on this phone. Your account, Social plans, Market orders and reviews are kept by QuinTaste so other members can see them. Manage both in Privacy & Data." },
  { icon: "flag-outline", question: "How do I report a problem?",
    answer: "On a place, use Suggest an update. On a person, item, recipe or event, use Report. Reports go to the QuinTaste team." },
];
export function HelpScreen() {
  return <Screen title="Help">
    <ListGroup>{answers.map(item => <Question key={item.question} item={item} />)}</ListGroup>
  </Screen>;
}
function Question({ item }: { item: Answer }) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), { focused, focusProps } = useKeyboardFocus();
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={item.question} onPress={() => setOpen(!open)} {...focusProps}
      style={({ pressed }) => [common.row, s.row, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[s.icon, { backgroundColor: theme.accentSoft }]}><Icon name={item.icon} size={20} color={theme.accent} /></View>
      <T style={[common.flex, common.bold]}>{item.question}</T>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.mutedForeground} />
    </Pressable>
    {open && <T muted style={s.answer}>{item.answer}</T>}
  </View>;
}
const s = StyleSheet.create({
  row: { gap: 12, minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderRadius: 14 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  answer: { paddingLeft: 62, paddingRight: 16, paddingBottom: 14 },
});
