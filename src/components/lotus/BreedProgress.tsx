/**
 * Breeding (AVATAR_LOTUS_PLAN §2 step 8): the lotus breathes while the server makes the Adult form, then the Mini form,
 * then the four expressions. Progress comes from the server, so it resumes after a reload or on another device.
 */
import { StyleSheet, View } from "react-native";
import type { Tier } from "../../game/content/cosmetics";
import type { BreedJob } from "../../services/lotus-api";
import { usePreferences } from "../../state/Preferences";
import { Button, Icon, T, common } from "../ui";
import { LotusBud } from "./LotusSeal";

export function BreedProgress({ tier, job, error, onReconnect }: { tier: Tier; job: BreedJob | null; error: string; onReconnect(): void }) {
  const { theme } = usePreferences(), done = job?.completed ?? 0;
  const steps = [
    { label: "Adult form", finished: done >= 1, current: done === 0 },
    { label: "Mini form", finished: done >= 2, current: done === 1 },
    { label: done >= 2 && done < 6 ? `Expressions · ${done - 2} of 4` : "Expressions", finished: done >= 6, current: done >= 2 && done < 6 },
  ];
  return <View style={s.stack}>
    <View style={[s.stage, { backgroundColor: theme.accentSoft }]}><LotusBud tier={tier} size={150} sealed={false} /></View>
    <T variant="title" style={common.center} accessibilityLiveRegion="polite">Breeding your avatar…</T>
    <View style={s.steps} accessible accessibilityLabel={steps.map(st => st.label + (st.finished ? ", done" : st.current ? ", in progress" : "")).join("; ")}>
      {steps.map(st => <View key={st.label} style={[common.row, s.step]}>
        <Icon name={st.finished ? "checkmark-circle" : st.current ? "ellipse" : "ellipse-outline"} size={20}
          color={st.finished ? theme.success : st.current ? theme.accent : theme.mutedForeground} />
        <T style={st.current ? common.bold : undefined} muted={!st.finished && !st.current}>{st.label}</T>
      </View>)}
    </View>
    {error ? <><T variant="small" color={theme.error} accessibilityLiveRegion="polite" style={common.center}>{error}</T>
      <Button label="Reconnect" variant="link" onPress={onReconnect} /></>
      : <T variant="small" muted style={common.center}>You can leave this screen. Breeding carries on, and nothing is used twice.</T>}
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 14, alignItems: "center" },
  stage: { alignSelf: "stretch", minHeight: 240, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  steps: { gap: 8, alignSelf: "center" },
  step: { gap: 10, minHeight: 28 },
});
