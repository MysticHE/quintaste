import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { duration } from "../../utils/food-format";
import { Sheet } from "../Sheet";
import { WheelPicker, useWheelItem } from "../WheelPicker";
import { TimerAlertControl } from "../food/TimerAlertControl";
import { Button, Field, T, common } from "../ui";
import { useT } from "../../i18n";

const MINUTES = Array.from({ length: 181 }, (_, minute) => minute), SECONDS = Array.from({ length: 12 }, (_, step) => step * 5);
const twoDigits = (value: number) => value.toString().padStart(2, "0");

/**
 * Cook mode's new timer (owner, 28 Oct 2026): minutes and seconds on scroll wheels, an optional name (the step's title when left
 * empty) and the alerts switch, all in one sheet instead of a form at the foot of the page and a separate Timers page.
 */
export function TimerSheet({ visible, onClose, recipeId, defaultName }: { visible: boolean; onClose: () => void; recipeId: string; defaultName: string }) {
  const { startTimer, readable } = useFood(), { theme } = usePreferences(), t = useT("cook"), band = useWheelItem() + 4;
  const [minutes, setMinutes] = useState(5), [seconds, setSeconds] = useState(0), [name, setName] = useState(""), [busy, setBusy] = useState(false);
  const total = minutes * 60 + seconds;
  const start = async () => {
    setBusy(true);
    try { if (await startTimer(recipeId, name.trim() || defaultName, total)) { setName(""); onClose(); } }
    finally { setBusy(false); }
  };
  return <Sheet visible={visible} onClose={onClose} title={t("newTimer")}
    footer={<Button label={t("startTimerFor", { time: duration(total) })} disabled={!readable || busy || total < 1} loading={busy} onPress={() => void start()} />}>
    <View style={s.wheels}>
      <View pointerEvents="none" style={[s.band, { height: band, marginTop: -band / 2, backgroundColor: theme.accentSoft }]} />
      <WheelPicker values={MINUTES} value={minutes} onChange={setMinutes} label={t("timerMinutes")} />
      <T style={[common.bold, s.unit]}>{t("minShort")}</T>
      <WheelPicker values={SECONDS} value={seconds} onChange={setSeconds} label={t("timerSeconds")} format={twoDigits} />
      <T style={[common.bold, s.unit]}>{t("secShort")}</T>
    </View>
    <Field label={t("timerNameOptional")} placeholder={defaultName} maxLength={60} value={name} onChangeText={setName} />
    <TimerAlertControl label={t("alertWhenEnds")} />
  </Sheet>;
}
const s = StyleSheet.create({
  wheels: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  band: { position: "absolute", left: 0, right: 0, top: "50%", borderRadius: 12 },
  unit: { minWidth: 44 },
});
