/**
 * Slide to enter (docs/game/LOBBY_MOTION_PLAN.md): a dark glass track with a gold thumb. Drag the thumb to the end to
 * go in; letting go early springs it back. A tap anywhere on the track slides it across by itself (a single-pointer
 * alternative, WCAG 2.5.7), Enter or Space does the same from a keyboard, and screen readers get one plain button.
 * At rest a light sweeps across the track, the chevrons pulse and the thumb nudges right; all hold still with reduced motion.
 */
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View, type GestureResponderEvent } from "react-native";
import Animated, { cancelAnimation, Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Icon, T } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import { Glint, useClock } from "./Ambient";

const H = 60, PAD = 6, THUMB = H - PAD * 2;

type Props = { title: string; label: string; width: number; onTick(): void; onComplete(): void };

export function SlideToEnter({ title, label, width, onTick, onComplete }: Props) {
  const { theme, reducedMotion } = usePreferences();
  const travel = Math.max(1, width - THUMB - PAD * 2);
  const x = useSharedValue(0), nudge = useSharedValue(0);
  const [done, setDone] = useState(false);
  const startX = useSharedValue(0), startT = useSharedValue(0), ticked = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || done) { cancelAnimation(nudge); nudge.set(0); return; }
    nudge.set(withRepeat(withSequence(withDelay(2600, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })), withSpring(0, { damping: 6, stiffness: 160 })), -1));
    return () => cancelAnimation(nudge);
  }, [reducedMotion, done, nudge]);

  const finish = () => { setDone(true); onComplete(); };
  const go = (fromTap: boolean) => {
    if (done) return;
    cancelAnimation(nudge); nudge.set(0);
    if (reducedMotion) { x.set(travel); finish(); return; }
    x.set(withTiming(travel, { duration: fromTap ? 420 : 140, easing: Easing.out(Easing.cubic) }, ok => { if (ok) runOnJS(finish)(); }));
  };
  const back = () => x.set(withSpring(0, { damping: 14, stiffness: 180 }));
  const drag = {
    onStartShouldSetResponder: () => !done,
    onMoveShouldSetResponder: () => !done,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => { startX.set(e.nativeEvent.pageX); startT.set(Date.now()); ticked.set(0); cancelAnimation(nudge); nudge.set(0); },
    onResponderMove: (e: GestureResponderEvent) => {
      const at = Math.max(0, Math.min(travel, e.nativeEvent.pageX - startX.get()));
      x.set(at);
      if (!ticked.get() && at > travel * 0.9) { ticked.set(1); onTick(); }
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - startX.get();
      if (Math.abs(dx) < 8 && Date.now() - startT.get() < 350) go(true);
      else if (dx > travel * 0.75) go(false);
      else back();
    },
    onResponderTerminate: back,
  };

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + nudge.value * 8 }] }));
  const trail = useAnimatedStyle(() => ({ width: PAD * 2 + THUMB + x.value, opacity: Math.min(1, (x.value / travel) * 3) * 0.95 }));
  const words = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - (x.value / travel) * 1.8) }));
  const keys = Platform.OS === "web" ? { tabIndex: 0 as const, onKeyDown: (e: { key: string; preventDefault(): void }) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(true); } } } : {};

  return <View {...drag} {...keys} accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: done }}
    accessibilityActions={[{ name: "activate" }]} onAccessibilityAction={() => go(true)}
    style={[s.track, { width, backgroundColor: theme.mediaControl, borderColor: theme.mediaDivider }]}>
    <Animated.View pointerEvents="none" style={[s.trail, { backgroundColor: theme.mediaRating }, trail]} />
    {!done && <Glint box={[0, 0, width, H]} u={1} every={2200} radius={H / 2} />}
    <Animated.View pointerEvents="none" style={[s.words, { left: THUMB + PAD * 2 }, words]}>
      <T color={theme.mediaForeground} style={s.title} numberOfLines={1}>{title}</T>
      <Chevrons still={reducedMotion || done} />
    </Animated.View>
    <Animated.View pointerEvents="none" style={[s.thumb, { backgroundColor: done ? theme.mediaSurface : theme.mediaRating, shadowColor: theme.mediaRating }, thumb]}>
      <Icon name={done ? "checkmark" : "arrow-forward"} size={24} color={done ? theme.mediaRating : theme.mediaSurface} />
    </Animated.View>
  </View>;
}

function Chevrons({ still }: { still: boolean }) {
  const t = useClock(still, 1300, 0, false, 500);
  return <View style={s.chevrons}>{[0, 1, 2].map(i => <Chevron key={i} i={i} t={t} still={still} />)}</View>;
}
function Chevron({ i, t, still }: { i: number; t: ReturnType<typeof useClock>; still: boolean }) {
  const { theme } = usePreferences();
  const st = useAnimatedStyle(() => ({ opacity: still ? 0.7 : interpolate(Math.sin(Math.max(0, Math.min(1, t.value * 1.6 - i * 0.3)) * Math.PI), [0, 1], [0.3, 1]) }));
  return <Animated.View style={[{ marginLeft: i ? -8 : 0 }, st]}><Icon name="chevron-forward" size={16} color={theme.mediaRating} /></Animated.View>;
}

const s = StyleSheet.create({
  track: { height: H, borderRadius: H / 2, borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  trail: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: H / 2 },
  words: { position: "absolute", right: 18, top: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  title: { fontWeight: "800" },
  chevrons: { flexDirection: "row", alignItems: "center" },
  thumb: { position: "absolute", left: PAD, top: PAD, width: THUMB, height: THUMB, borderRadius: THUMB / 2, alignItems: "center", justifyContent: "center",
    shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
});
