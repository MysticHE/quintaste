import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { Chip } from "../food/Controls";
import { Dialog } from "../Dialog";
import { T, common } from "../ui";
import { StepPhoto } from "./StepPhoto";
import { useT } from "../../i18n";

/**
 * The method on the recipe page as one compact list (owner, 28 Oct 2026): the step number runs inline with the text ("1. Combine
 * the ingredients") rather than in a column of its own, the step's photo sits beside it as a thumbnail that opens full size, and a
 * timer chip starts the step's timer. Tapping a step ticks it off while the page is open: its number turns into a check and it fades.
 * Cook mode is the one-step-at-a-time view.
 */
export function RecipeSteps({ recipe }: { recipe: Recipe }) {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set()), [opened, setOpened] = useState<number | null>(null);
  const { startTimer, readable } = useFood(), { setNotice } = usePreferences(), t = useT("cook"), tc = useT("common");
  const toggle = (index: number) => setDone(current => { const next = new Set(current); if (!next.delete(index)) next.add(index); return next; });
  const timer = async (step: Recipe["steps"][number]) => {
    if (step.timer && await startTimer(recipe.id, step.timer.label, step.timer.seconds)) setNotice({ text: t("timerStarted", { label: step.timer.label }) });
  };
  const shown = opened === null ? undefined : recipe.steps[opened];
  return <View style={s.list}>
    {recipe.steps.map((step, index) => {
      const finished = done.has(index), minutes = step.timer ? Math.max(1, Math.round(step.timer.seconds / 60)) : 0;
      return <View key={index} testID="recipe-step" style={[common.row, s.step]}>
        <View style={[common.flex, s.text]}>
          <StepText n={index + 1} title={step.title} instruction={step.instruction} finished={finished} onPress={() => toggle(index)} />
          {!!step.timer && <View style={[s.timer, finished && s.finished]}><Chip compact icon="timer-outline" label={tc("minutes", { n: minutes })}
            a11y={t("startTimerMinutes", { n: minutes })} disabled={!readable} onPress={() => void timer(step)} /></View>}
        </View>
        {!!step.photo && <StepThumb path={step.photo} label={t("stepLabel", { n: index + 1, title: step.title })} finished={finished} onPress={() => setOpened(index)} />}
      </View>;
    })}
    <Dialog visible={!!shown} label={shown ? t("stepLabel", { n: (opened ?? 0) + 1, title: shown.title }) : ""} onClose={() => setOpened(null)}>
      {shown?.photo && <StepPhoto path={shown.photo} label={shown.title} />}
      {shown && <T muted>{shown.instruction}</T>}
    </Dialog>
  </View>;
}
/** "1. Title" with the instruction under it (or "1. Instruction" for a step without its own title); a tap ticks it off. */
function StepText({ n, title, instruction, finished, onPress }: { n: number; title: string; instruction: string; finished: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  const named = !/^step \d+$/i.test(title.trim()), mark = <T style={common.bold} color={finished ? theme.success : theme.accent}>{finished ? "✓ " : n + ". "}</T>;
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={named ? t("stepCheckNamed", { n, title, instruction }) : t("stepCheck", { n, instruction })}
    accessibilityState={{ checked: finished }} aria-checked={finished} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.press, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : finished ? 0.5 : 1 }, Platform.OS === "web" && s.noOutline]}>
    {named ? <><T style={common.bold}>{mark}{title}</T><T muted>{instruction}</T></> : <T muted>{mark}{instruction}</T>}
  </Pressable>;
}
/** The step's photo as a thumbnail that opens it full size. */
function StepThumb({ path, label, finished, onPress }: { path: string; label: string; finished: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.thumb, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : finished ? 0.5 : 1 }, Platform.OS === "web" && s.noOutline]}>
    <StepPhoto path={path} height={THUMB - 4} label="" />
  </Pressable>;
}
const THUMB = 76;
const s = StyleSheet.create({
  list: { gap: 14 },
  step: { alignItems: "flex-start", gap: 12 },
  text: { gap: 6, minWidth: 0 },
  // The focus outline needs a border; it stays transparent until the step has keyboard focus.
  press: { gap: 2, borderWidth: 2, borderRadius: 8, margin: -2 },
  timer: { flexDirection: "row" },
  finished: { opacity: 0.5 },
  // The border above is the focus outline, so the browser's own ring is switched off.
  noOutline: { outlineStyle: "solid", outlineWidth: 0 },
  // The thumbnail's 2-point border is its keyboard focus outline; it stays transparent otherwise.
  thumb: { width: THUMB, height: THUMB, borderRadius: 14, borderWidth: 2, overflow: "hidden" },
});
