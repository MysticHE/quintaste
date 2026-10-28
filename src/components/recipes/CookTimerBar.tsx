import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import type { CookingTimer } from "../../types/food";
import { duration, timerRemaining } from "../../utils/food-format";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useClock } from "../food/Timers";
import { IconButton } from "../food/Controls";
import { Icon, T, common } from "../ui";
import { useT } from "../../i18n";

/**
 * The soonest running timer, pinned above Cook mode's step buttons: name, time left, pause or resume, one more minute and dismiss.
 * One row only, so a small phone keeps room for the step; the name opens the Timers page, which lists every timer and restart.
 */
export function CookTimerBar() {
  const { doc, changeTimer, readable } = useFood(), { theme, textMultiplier } = usePreferences(), now = useClock(), t = useT("cook");
  if (!doc.timers.length) return null;
  const order = (timer: CookingTimer) => !timerRemaining(timer, now) ? 0 : timer.endsAt !== null ? 1 : 2;
  const timer = [...doc.timers].sort((a, b) => order(a) - order(b) || timerRemaining(a, now) - timerRemaining(b, now))[0];
  const remaining = timerRemaining(timer, now), done = remaining === 0, paused = !done && timer.endsAt === null, color = done ? theme.warning : theme.accent;
  const others = doc.timers.length - 1;
  return <View style={[common.row, s.row, { backgroundColor: theme.accentSoft }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t("timerOpenAll", { label: timer.label, n: doc.timers.length })} onPress={() => router.push("/timers")}
      style={({ pressed }) => [common.row, common.flex, s.open, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="timer-outline" color={color} />
      <View style={[common.flex, s.text]}>
        <T style={common.bold} numberOfLines={1}>{timer.label}</T>
        {others > 0 && <T variant="small" muted numberOfLines={1}>{t("moreTimers", { n: others })}</T>}
      </View>
      <T style={[common.bold, s.clock, { fontSize: 20 * textMultiplier }]} color={color} accessibilityLiveRegion={done ? "polite" : "none"}>{done ? t("timerReady") : duration(remaining)}</T>
    </Pressable>
    {!done && <IconButton label={t(paused ? "timerResumeNamed" : "timerPauseNamed", { label: timer.label })} icon={paused ? "play" : "pause"} disabled={!readable}
      onPress={() => void changeTimer(timer.id, paused ? "resume" : "pause")} />}
    {!done && <IconButton label={t("timerExtendNamed", { label: timer.label })} icon="add" disabled={!readable} onPress={() => void changeTimer(timer.id, "extend")} />}
    <IconButton label={t("timerDismissNamed", { label: timer.label })} icon="close" disabled={!readable} onPress={() => void changeTimer(timer.id, "dismiss")} />
  </View>;
}
const s = StyleSheet.create({
  row: { minHeight: 56, borderRadius: 16, paddingLeft: 12, paddingRight: 4, gap: 6 },
  open: { minHeight: 48, gap: 8 },
  text: { minWidth: 0 },
  clock: { fontVariant: ["tabular-nums"] },
});
