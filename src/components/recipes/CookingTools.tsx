import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Button, Field, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { TimerCard } from "../food/Timers";
export function CookingTools({ recipeId }: { recipeId: string }) {
  const { doc, startTimer, readable } = useFood(), { theme } = usePreferences();
  const [custom, setCustom] = useState(false), [label, setLabel] = useState(""), [minutes, setMinutes] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const add = async () => {
    const value = Number(minutes);
    if (!label.trim() || !Number.isInteger(value) || value < 1 || value > 180) { setError("Add a name and 1–180 minutes."); return; }
    setBusy(true);
    try { if (await startTimer(recipeId, label.trim().slice(0, 60), value * 60)) { setCustom(false); setLabel(""); setMinutes(""); setError(""); } }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 10 }}>
    {doc.timers.map(timer => <TimerCard key={timer.id} timer={timer} />)}
    <Chips><Chip label="Add Timer" icon="add-outline" selected={custom} onPress={() => setCustom(!custom)} /><Chip label="Timer Settings" icon="options-outline" onPress={() => router.push("/timers")} /></Chips>
    {custom && <View style={{ gap: 8 }}><Field label="Timer Name" maxLength={60} value={label} onChangeText={setLabel} />
      <View style={common.row}><View style={common.flex}><Field label="Minutes" keyboardType="number-pad" maxLength={3} value={minutes} onChangeText={setMinutes} /></View>
        <Button label="Start Timer" disabled={!readable || busy} loading={busy} onPress={() => void add()} /></View>
      {!!error && <T color={theme.error}>{error}</T>}
    </View>}
  </View>;
}
