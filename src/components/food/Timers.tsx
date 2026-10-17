import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, Vibration, View } from "react-native";
import type { CookingTimer } from "../../types/food";
import { duration, timerRemaining } from "../../utils/food-format";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Card, Icon, T, common } from "../ui";
import { Chip, Chips, IconButton } from "./Controls";
import { useCompactUI } from "../ui-density";

export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    const subscription = AppState.addEventListener("change", () => setNow(Date.now()));
    return () => { clearInterval(interval); subscription.remove(); };
  }, [intervalMs]);
  return now;
}
export function useMinuteClock() { return useClock(60000); }
export function TimerCard({ timer }: { timer: CookingTimer }) {
  const compact = useCompactUI();
  const now = useClock(), remaining = timerRemaining(timer, now);
  const [more, setMore] = useState(false);
  const { changeTimer, readable } = useFood();
  const { theme } = usePreferences();
  return <Card style={common.stack}>
    <View style={common.spread}><T style={[common.bold, common.flex]}>{timer.label}</T>
      <T variant="subtitle" color={remaining === 0 ? theme.warning : theme.accent}>{remaining ? duration(remaining) : "Ready"}</T></View>
    <T variant="small" muted>{remaining === 0 ? "Check your food" : timer.endsAt === null ? "Paused" : compact ? "Running" : "Running · follows elapsed time"}</T>
    <Chips>
      {remaining > 0 && <Chip label={timer.endsAt === null ? compact ? "Resume" : "Resume Timer" : compact ? "Pause" : "Pause Timer"} icon={timer.endsAt === null ? "play-outline" : "pause-outline"} disabled={!readable}
        onPress={() => void changeTimer(timer.id, timer.endsAt === null ? "resume" : "pause")} />}
      <Chip label="+1 Min" disabled={!readable} onPress={() => void changeTimer(timer.id, "extend")} />
      <IconButton label={"More timer actions: " + timer.label} icon="ellipsis-horizontal" selected={more} onPress={() => setMore(!more)} />
    </Chips>
    {more && <Chips>
      <Chip label="Restart Timer" icon="refresh-outline" disabled={!readable} onPress={() => void changeTimer(timer.id, "restart")} />
      <Chip label="Dismiss Timer" icon="close-outline" disabled={!readable} onPress={() => void changeTimer(timer.id, "dismiss")} />
    </Chips>}
  </Card>;
}
/** Vibrates once when a running timer reaches zero while the app is open; background delivery stays with local alerts. */
export function TimerFinishHaptics() {
  const { doc } = useFood();
  return Platform.OS !== "web" && doc.timers.length ? <TimerFinishWatcher timers={doc.timers} /> : null;
}
function TimerFinishWatcher({ timers }: { timers: CookingTimer[] }) {
  const now = useClock(), seen = useRef(new Map<string, number>());
  useEffect(() => {
    let finished = false;
    const live = new Set(timers.map(timer => timer.id));
    for (const id of seen.current.keys()) if (!live.has(id)) seen.current.delete(id);
    for (const timer of timers) {
      const remaining = timerRemaining(timer, now), previous = seen.current.get(timer.id);
      if (previous && !remaining && timer.endsAt !== null && now - timer.endsAt < 5000) finished = true;
      seen.current.set(timer.id, remaining);
    }
    if (finished) Vibration.vibrate([0, 400, 200, 400]);
  }, [now, timers]);
  return null;
}
export function TimerDock() {
  const { doc } = useFood(), { theme } = usePreferences();
  const now = useClock();
  if (!doc.timers.length) return null;
  const priority = (timer: CookingTimer) => !timerRemaining(timer, now) ? 0 : timer.endsAt !== null ? 1 : 2;
  const next = [...doc.timers].sort((a, b) => priority(a) - priority(b) || timerRemaining(a, now) - timerRemaining(b, now))[0];
  const remaining = timerRemaining(next, now);
  const paused = remaining > 0 && next.endsAt === null;
  return <Pressable accessibilityRole="button" accessibilityHint="Open cooking timers"
    onPress={() => router.push("/timers")} style={[s.dock, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Icon name="timer-outline" color={remaining ? theme.accent : theme.warning} />
    <View style={common.flex}><T variant="small" style={common.bold}>{next.label}</T><T variant="small" muted>{doc.timers.length} {doc.timers.length === 1 ? "timer" : "timers"}{paused ? " · Paused" : ""}</T></View>
    <T color={remaining ? theme.accent : theme.warning} style={common.bold}>{remaining ? duration(remaining) : "Ready"}</T><Icon name="chevron-forward" />
  </Pressable>;
}
export function FoodStorageBanner() {
  const { error, retry, saving, overCapacity } = useFood(), { theme, setNotice } = usePreferences();
  const pathname = usePathname();
  if (overCapacity && pathname === "/storage-cleanup") return null;
  if (overCapacity) return <View style={[s.dock, { backgroundColor: theme.card, borderColor: theme.error }]} accessibilityLiveRegion="assertive">
    <T variant="small" style={common.flex}>This collection exceeds safe storage. Select photos to remove together.</T>
    <Chip label="Manage Storage" onPress={() => { setNotice(null); router.push("/storage-cleanup"); }} />
  </View>;
  if (!error) return null;
  return <View style={[s.dock, { backgroundColor: theme.card, borderColor: theme.error }]} accessibilityLiveRegion="assertive">
    <Icon name="alert-circle-outline" color={theme.error} /><T variant="small" style={common.flex}>{error.message}</T>
    <Chip label={saving ? "Saving…" : "Retry"} disabled={saving} onPress={() => void retry()} />
  </View>;
}
const s = StyleSheet.create({ dock: { margin: 8, padding: 10, borderWidth: 1, borderRadius: 16, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" } });
