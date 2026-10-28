import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useOnAccent } from "../BrowseControls";
import { Chip } from "../food/Controls";
import { Icon, T, common } from "../ui";
import { StepPhoto } from "./StepPhoto";
import { useT } from "../../i18n";

/**
 * The method on the recipe page: numbered steps, each ticked off with a tap on its number while the page is open, and a timer chip
 * on steps that have one, so the recipe can be followed from here as well as in Cook mode.
 */
export function RecipeSteps({ recipe }: { recipe: Recipe }) {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set()), { startTimer, readable } = useFood();
  const { setNotice } = usePreferences(), t = useT("cook"), tc = useT("common");
  const toggle = (index: number) => setDone(current => { const next = new Set(current); if (!next.delete(index)) next.add(index); return next; });
  const timer = async (step: Recipe["steps"][number]) => {
    if (step.timer && await startTimer(recipe.id, step.timer.label, step.timer.seconds)) setNotice({ text: t("timerStarted", { label: step.timer.label }) });
  };
  return <View style={s.list}>{recipe.steps.map((step, index) => {
    const finished = done.has(index), named = !/^step \d+$/i.test(step.title.trim()), minutes = step.timer ? Math.max(1, Math.round(step.timer.seconds / 60)) : 0;
    return <View key={index} testID="recipe-step" style={s.step}>
      <View style={[common.row, s.head]}>
        <StepNumber n={index + 1} finished={finished} onPress={() => toggle(index)} />
        <View style={[common.flex, s.text, finished && s.finished]}>
          {named && <T style={common.bold}>{step.title}</T>}
          <T muted>{step.instruction}</T>
          {!!step.timer && <View style={s.timer}><Chip compact icon="timer-outline" label={tc("minutes", { n: minutes })} a11y={t("startTimerMinutes", { n: minutes })}
            disabled={!readable} onPress={() => void timer(step)} /></View>}
        </View>
      </View>
      {!!step.photo && <View style={s.photo}><StepPhoto path={step.photo} label={t("stepLabel", { n: index + 1, title: step.title })} /></View>}
    </View>;
  })}</View>;
}
/** The step's number in a circle; once ticked it turns into a check. */
function StepNumber({ n, finished, onPress }: { n: number; finished: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={t("stepDone", { n })} accessibilityState={{ checked: finished }} aria-checked={finished}
    onPress={onPress} hitSlop={8} {...focusProps}
    style={({ pressed }) => [s.number, { backgroundColor: finished ? theme.accent : theme.accentSoft, borderColor: focused ? theme.foreground : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    {finished ? <Icon name="checkmark" size={18} color={onAccent} /> : <T variant="small" color={theme.accent} style={common.bold}>{n}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  list: { gap: 16 },
  step: { gap: 10 },
  head: { alignItems: "flex-start", gap: 12 },
  text: { gap: 4, minWidth: 0, paddingTop: 4 },
  // A ticked step fades back so the next one stands out, in light and dark mode alike.
  finished: { opacity: 0.5 },
  timer: { flexDirection: "row", marginTop: 4 },
  photo: { paddingLeft: 44 },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2 },
});
