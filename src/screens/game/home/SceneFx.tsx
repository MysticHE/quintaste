/**
 * Scene effects shared by the Game tab and My little café (docs/game/LOBBY_MOTION_PLAN.md): sunbeams from the window,
 * leaves drifting off the vines, the sparkle that marks a tappable object, the soft gold glow that shows every
 * tappable thing one at a time after a tap on empty space, and the companion's heart. All decorative (no pointer
 * events); each holds still or disappears when the game asks for reduced motion.
 */
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, interpolate, useAnimatedStyle, useDerivedValue, withDelay, withTiming, type DerivedValue, type SharedValue } from "react-native-reanimated";
import { Glow } from "../../../components/lotus/LotusSeal";
import { Icon } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import { useClock } from "./Ambient";
import type { Box } from "./sceneLayout";

/** Light falling through the window onto the floor, each beam slowly brightening and dimming. */
export function SunRays({ box, u }: { box: Box; u: number }) {
  const { reducedMotion } = usePreferences();
  const [x, y, w, h] = box;
  // Beams start along the lower window and lean right as they fall, like the painted floor light.
  const beams: [number, number, number, number][] = [[0.08, 0.16, 5200, 0], [0.34, 0.12, 6100, 900], [0.58, 0.18, 4700, 1800], [0.82, 0.08, 5600, 2600]];
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {beams.map(([at, width, duration, delay], i) =>
      <Beam key={i} left={(x + w * at) * u} top={(y + h * 0.35) * u} width={w * width * u} length={95 * u} still={reducedMotion} duration={duration} delay={delay} />)}
  </View>;
}
function Beam({ left, top, width, length, still, duration, delay }: { left: number; top: number; width: number; length: number; still: boolean; duration: number; delay: number }) {
  const { theme } = usePreferences(), t = useClock(still, duration, delay, true);
  const st = useAnimatedStyle(() => ({ opacity: still ? 0.45 : 0.25 + t.value * 0.5 }));
  // Three nested widths fake a soft edge on every platform.
  return <Animated.View style={[s.abs, { left, top, width, height: length, transformOrigin: "50% 0%", transform: [{ rotate: "-24deg" }] }, st]}>
    {[1, 0.66, 0.36].map(k => <LinearGradient key={k} colors={[theme.scene.sun, theme.scene.sunSoft]} locations={[0, 1]}
      style={[s.abs, { top: 0, left: (width * (1 - k)) / 2, width: width * k, height: length, opacity: 0.32, borderRadius: width }]} />)}
  </Animated.View>;
}

/** A few leaves drifting down from the hanging vines; positions are scene units. */
const LEAVES: [number, number, number][] = [[14, 20, 0], [55, 14, 2400], [80, 18, 4700]];
export function Leaves({ u }: { u: number }) {
  const { reducedMotion } = usePreferences();
  if (reducedMotion) return null;
  return <>{LEAVES.map(([x, y, delay], i) => <Leaf key={i} x={x * u} y={y * u} fall={70 * u} delay={delay} deep={i === 1} />)}</>;
}
function Leaf({ x, y, fall, delay, deep }: { x: number; y: number; fall: number; delay: number; deep: boolean }) {
  const { theme } = usePreferences(), t = useClock(false, 6800, delay, false, 1800);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateY: t.value * fall }, { translateX: Math.sin(t.value * 9) * 18 + t.value * 26 }, { rotate: Math.sin(t.value * 7) * 70 + t.value * 140 + "deg" }],
  }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: x, top: y }, st]}>
    <Icon name="leaf" size={18} color={deep ? theme.scene.leafDeep : theme.scene.leaf} />
  </Animated.View>;
}

/** Four-point sparkle with a soft glow, driven by `k` (0 hidden → 1 bright). */
export function Sparkle({ x, y, size, k }: { x: number; y: number; size: number; k: SharedValue<number> | DerivedValue<number> }) {
  const { theme } = usePreferences();
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.55 + k.value * 0.45 }, { rotate: k.value * 45 + "deg" }] }));
  const glow = useAnimatedStyle(() => ({ opacity: k.value * 0.55, transform: [{ scale: 0.6 + k.value * 0.6 }] }));
  const d = size * 1.8;
  return <View pointerEvents="none" style={[s.abs, { left: x - d / 2, top: y - d / 2, width: d, height: d }, s.centre]}>
    <Animated.View style={[StyleSheet.absoluteFill, s.centre, glow]}><Glow size={d} color={theme.mediaRating} opacity={0.22} /></Animated.View>
    <Animated.View style={st}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={theme.mediaRating} />
        <Path d="M12 6 C12.5 10 14 11.5 18 12 C14 12.5 12.5 14 12 18 C11.5 14 10 12.5 6 12 C10 11.5 11.5 10 12 6 Z" fill={theme.mediaForeground} />
      </Svg>
    </Animated.View>
  </View>;
}

/**
 * Marks tappable objects without labels: a sparkle twinkles on one object at a time. `strong` (first visit) twinkles
 * more often; `steady` keeps one sparkle lit (something new there). Reduced motion keeps a still, dim sparkle on each.
 */
export function SparkleCycle({ points, strong, steady }: { points: [number, number][]; strong: boolean; steady: number | null }) {
  const { reducedMotion } = usePreferences(), n = points.length, slot = 1500, rest = strong ? 600 : 3200;
  const t = useClock(reducedMotion, slot * n, 600, false, rest);
  return <>{points.map(([x, y], i) => <CycleSparkle key={i} x={x} y={y} i={i} n={n} t={t} still={reducedMotion} steady={steady === i} />)}</>;
}
function CycleSparkle({ x, y, i, n, t, still, steady }: { x: number; y: number; i: number; n: number; t: SharedValue<number>; still: boolean; steady: boolean }) {
  const pulse = useClock(still || !steady, 1400, 0, true);
  const k = useDerivedValue(() => {
    if (still) return steady ? 1 : 0.55;
    const local = (t.value - i / n) * n, cycle = local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0;
    return steady ? Math.max(cycle, 0.55 + pulse.value * 0.45) : cycle;
  });
  return <Sparkle x={x} y={y} size={28} k={k} />;
}

/**
 * After a tap on empty space, each tappable area lights with a soft gold glow in turn (`order` of `count`), so the eye
 * follows them one at a time. `run` goes 0 → 1 over the whole sequence.
 */
export function RevealGlow({ run, order, count }: { run: SharedValue<number>; order: number; count: number }) {
  const { theme, reducedMotion } = usePreferences();
  const st = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: run.value > 0 && run.value < 1 ? 0.8 : 0 };
    const step = 1 / (count + 1), local = (run.value - order * step) / (step * 2);
    return { opacity: local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0 };
  });
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.glow, { borderColor: theme.mediaRating }, st]}>
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.mediaRating, opacity: 0.1, borderRadius: 18 }]} />
  </Animated.View>;
}
/** Starts a reveal sequence on `run`; reduced motion shows every glow briefly at once instead of a moving sequence. */
export function startReveal(run: SharedValue<number>, count: number, still: boolean) {
  run.value = still ? 0.5 : 0;
  run.value = still ? withDelay(1400, withTiming(1, { duration: 0 })) : withTiming(1, { duration: 420 * (count + 1), easing: Easing.linear });
}

/** A small heart that rises and fades above the companion each time `pop` runs 0 → 1. */
export function HeartPop({ left, top, pop }: { left: number; top: number; pop: SharedValue<number> }) {
  const { theme } = usePreferences();
  const st = useAnimatedStyle(() => ({
    opacity: pop.value > 0 && pop.value < 1 ? interpolate(pop.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]) : 0,
    transform: [{ translateY: -pop.value * 36 }, { scale: interpolate(pop.value, [0, 0.2, 1], [0.4, 1.15, 1]) }],
  }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: left - 14, top: top - 14 }, st]}><Icon name="heart" size={28} color={theme.scene.heart} /></Animated.View>;
}
export const popOnce = (v: SharedValue<number>) => { v.value = 0; v.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }); };

const s = StyleSheet.create({
  abs: { position: "absolute" }, centre: { alignItems: "center", justifyContent: "center" },
  glow: { borderRadius: 18, borderWidth: 2 },
});
