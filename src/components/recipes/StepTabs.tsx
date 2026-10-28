import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useSwipe } from "../../hooks/useSwipe";
import { useTabRow, type TabRowItem } from "../../hooks/useTabRow";
import { useOnAccent } from "../BrowseControls";
import { Icon, T, common } from "../ui";
import { useT } from "../../i18n";

/**
 * Cook mode's row of step numbers (owner, 28 Oct 2026): the current step filled, steps already opened checked, the rest plain. A tap
 * jumps to that step; the row scrolls sideways when there are many steps and keeps the current one in view. Jumping ahead does not
 * check the steps passed over.
 */
export function StepTabs({ titles, current, seen, disabled, onSelect }: {
  titles: string[]; current: number | null; seen: readonly number[]; disabled: boolean; onSelect: (index: number) => void;
}) {
  const { scroll, item } = useTabRow(titles.length, current, index => { if (!disabled) onSelect(index); }), t = useT("cook");
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.row} accessibilityRole="tablist"
    accessibilityLabel={t("stepTabs")}>
    {titles.map((title, index) => <StepTab key={index} n={index + 1} total={titles.length} title={title} item={item(index)}
      state={index === current ? "current" : seen.includes(index) ? "done" : "next"} disabled={disabled} onPress={() => onSelect(index)} />)}
  </ScrollView>;
}
/** The step's content in Cook mode: swipe left for the next step, right for the previous one. */
export function StepSwipe({ onNext, onPrevious, children }: { onNext: () => void; onPrevious: () => void; children: ReactNode }) {
  // On the web a mouse drag would otherwise start a text selection, which ends the swipe.
  return <View testID="step-swipe" style={[s.swipe, Platform.OS === "web" && noSelect]} {...useSwipe(onNext, onPrevious)}>{children}</View>;
}
function StepTab({ n, total, title, state, disabled, item: { attach, onLayout, keyboard }, onPress }: {
  n: number; total: number; title: string; state: "done" | "current" | "next"; disabled: boolean; item: TabRowItem; onPress: () => void;
}) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  const colors = state === "current" ? { bg: theme.accent, fg: onAccent, border: theme.accent }
    : state === "done" ? { bg: theme.successSoft, fg: theme.success, border: theme.success } : { bg: theme.card, fg: theme.foreground, border: theme.border };
  return <Pressable ref={attach} {...keyboard} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: state === "current", disabled }}
    aria-selected={state === "current"} accessibilityLabel={t("stepTab", { n, total, title })} disabled={disabled} onPress={onPress} {...focusProps}
    style={({ pressed }) => [common.row, s.tab, { backgroundColor: colors.bg, borderColor: focused ? theme.foreground : colors.border, opacity: pressed ? 0.7 : 1 },
      Platform.OS === "web" && s.noOutline]}>
    {state === "done" && <Icon name="checkmark" size={14} color={colors.fg} />}
    <T variant="small" color={colors.fg} style={common.bold}>{n}</T>
  </Pressable>;
}
// Web only: React Native Web passes this through to CSS; native views have no text selection to stop.
const noSelect = { userSelect: "none" } as object as ViewStyle;
const s = StyleSheet.create({
  // A horizontal ScrollView grows to fill spare height on short steps unless told not to.
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 2, alignItems: "center" },
  swipe: { gap: 12 },
  noOutline: { outlineStyle: "solid", outlineWidth: 0 },
  tab: { minWidth: 48, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, justifyContent: "center", gap: 3 },
});
