import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Button, Field, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { TimerCard } from "../food/Timers";
import { useT } from "../../i18n";
export function CookingTools({ recipeId }: { recipeId: string }) {
  const { doc, startTimer, readable } = useFood(), { theme } = usePreferences(), t = useT("cook");
  const [custom, setCustom] = useState(false), [label, setLabel] = useState(""), [minutes, setMinutes] = useState(""), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const add = async () => {
    const value = Number(minutes);
    if (!label.trim() || !Number.isInteger(value) || value < 1 || value > 180) { setError(true); return; }
    setBusy(true);
    try { if (await startTimer(recipeId, label.trim().slice(0, 60), value * 60)) { setCustom(false); setLabel(""); setMinutes(""); setError(false); } }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 10 }}>
    {doc.timers.map(timer => <TimerCard key={timer.id} timer={timer} />)}
    <Chips><Chip label={t("addTimer")} icon="add-outline" selected={custom} onPress={() => setCustom(!custom)} /><Chip label={t("timerSettings")} icon="options-outline" onPress={() => router.push("/timers")} /></Chips>
    {custom && <View style={{ gap: 8 }}><Field label={t("timerName")} maxLength={60} value={label} onChangeText={setLabel} />
      <View style={common.row}><View style={common.flex}><Field label={t("minutesField")} keyboardType="number-pad" maxLength={3} value={minutes} onChangeText={setMinutes} /></View>
        <Button label={t("startTimer")} disabled={!readable || busy} loading={busy} onPress={() => void add()} /></View>
      {error && <T color={theme.error}>{t("timerError")}</T>}
    </View>}
  </View>;
}
