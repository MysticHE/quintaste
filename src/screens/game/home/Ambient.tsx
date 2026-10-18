/**
 * Ambient motion for My little café: wok steam, dust in the sunlight, a glint across the window, swaying decor,
 * the cook's sway, the companion's hop and first-visit sparkles. Everything is decorative (no pointer events) and
 * disappears or holds still when the member asks for reduced motion.
 */
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { Icon } from "../../../components/ui";
import { usePreferences } from "../../../state/Preferences";
import type { Box } from "./sceneLayout";

const sine = Easing.inOut(Easing.sin);
/** A 0→1 clock that loops (optionally back and forth) after a delay; reset to 0 when still. */
function useClock(still: boolean, duration: number, delay = 0, yoyo = false, pause = 0) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) { cancelAnimation(t); t.value = 0; return; }
    const step = withTiming(1, { duration, easing: yoyo ? sine : Easing.linear });
    t.value = withDelay(delay, withRepeat(pause ? withSequence(step, withDelay(pause, withTiming(1, { duration: 0 }))) : step, -1, yoyo));
    return () => cancelAnimation(t);
  }, [still, duration, delay, yoyo, pause, t]);
  return t;
}

/** Three soft puffs rising from the wok. */
export function Steam({ x, y, u }: { x: number; y: number; u: number }) {
  const { reducedMotion } = usePreferences();
  if (reducedMotion) return null;
  return <>{[0, 900, 1800].map(d => <Puff key={d} x={x} y={y} u={u} delay={d} />)}</>;
}
function Puff({ x, y, u, delay }: { x: number; y: number; u: number; delay: number }) {
  const { theme } = usePreferences(), t = useClock(false, 2700, delay), r = 6 * u;
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 0.9, 0]),
    transform: [{ translateY: -t.value * 15 * u }, { translateX: Math.sin(t.value * 5 + delay) * 1.4 * u }, { scale: 0.45 + t.value * 1.25 }],
  }));
  // Three stacked discs with rising opacity fake a soft edge on every platform.
  return <Animated.View pointerEvents="none" style={[s.abs, s.centre, { left: x * u - r / 2, top: y * u - r / 2, width: r, height: r }, st]}>
    {[1, 0.72, 0.46].map(k => <View key={k} style={[s.abs, { width: r * k, height: r * k, borderRadius: r, backgroundColor: theme.mediaForeground, opacity: 0.32 }]} />)}
  </Animated.View>;
}

/** Dust motes drifting in the sunbeam; positions are scene units. */
const MOTES: [number, number, number][] = [[24, 48, 0], [33, 62, 1], [41, 44, 2], [47, 74, 3], [29, 82, 4], [56, 57, 5], [38, 90, 6], [52, 38, 7], [62, 80, 8]];
export function Motes({ u }: { u: number }) {
  const { reducedMotion } = usePreferences();
  if (reducedMotion) return null;
  return <>{MOTES.map(([x, y, i]) => <Mote key={i} x={x} y={y} i={i} u={u} />)}</>;
}
function Mote({ x, y, i, u }: { x: number; y: number; i: number; u: number }) {
  const { theme } = usePreferences(), t = useClock(false, 4200 + i * 530, i * 260, true), r = (0.7 + (i % 3) * 0.25) * u, dir = i % 2 ? 1 : -1;
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.5, 1], [0.1, 0.85, 0.1]),
    transform: [{ translateY: (t.value - 0.5) * 7 * u * dir }, { translateX: (t.value - 0.5) * 3 * u }],
  }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: x * u, top: y * u, width: r, height: r, borderRadius: r, backgroundColor: theme.mediaRating }, st]} />;
}

/** A soft diagonal glint that crosses the window every few seconds. */
export function Glint({ box, u }: { box: Box; u: number }) {
  const { theme, reducedMotion } = usePreferences(), t = useClock(reducedMotion, 2000, 1200, false, 6500);
  const [x, y, w, h] = box;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(t.value, [0, 1], [-0.5 * w * u, 1.3 * w * u]) }, { rotate: "18deg" }] }));
  if (reducedMotion) return null;
  return <View pointerEvents="none" style={[s.abs, { left: x * u, top: y * u, width: w * u, height: h * u, overflow: "hidden", borderRadius: 2 * u }]}>
    <Animated.View style={[s.abs, { top: -0.25 * h * u, width: 0.28 * w * u, height: 1.5 * h * u }, st]}>
      <LinearGradient colors={[theme.transparent, theme.mediaDivider, theme.transparent]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.fill} />
    </Animated.View>
  </View>;
}

/** Gentle rotation about the top (hanging decor) or bottom (plants, the cook). */
export function Sway({ children, style, deg, origin, duration = 3400, delay = 0 }: { children: ReactNode; style: StyleProp<ViewStyle>; deg: number; origin: "top" | "bottom"; duration?: number; delay?: number }) {
  const { reducedMotion } = usePreferences(), t = useClock(reducedMotion, duration, delay, true);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: (t.value - 0.5) * 2 * deg + "deg" }] }));
  return <Animated.View pointerEvents="box-none" style={[style, { transformOrigin: origin === "top" ? "50% 0%" : "50% 100%" }, st]}>{children}</Animated.View>;
}

/** The companion breathes and hops every few seconds. */
export function Hop({ children, style, u }: { children: ReactNode; style: StyleProp<ViewStyle>; u: number }) {
  const { reducedMotion } = usePreferences(), y = useSharedValue(0), breath = useClock(reducedMotion, 1500, 0, true);
  useEffect(() => {
    if (reducedMotion) { cancelAnimation(y); y.value = 0; return; }
    y.value = withRepeat(withSequence(withDelay(3600, withTiming(-3.2 * u, { duration: 230, easing: Easing.out(Easing.quad) })),
      withTiming(0, { duration: 420, easing: Easing.bounce })), -1);
    return () => cancelAnimation(y);
  }, [reducedMotion, u, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scaleY: 1 + breath.value * 0.025 }, { scaleX: 1 - breath.value * 0.012 }] }));
  return <Animated.View style={[style, { transformOrigin: "50% 100%" }, st]}>{children}</Animated.View>;
}

/** First-visit hint: a pulsing sparkle at the corner of something worth tapping. */
export function Sparkle({ left, top, size }: { left: number; top: number; size: number }) {
  const { theme, reducedMotion } = usePreferences(), t = useClock(reducedMotion, 1100, 0, true);
  const st = useAnimatedStyle(() => ({ opacity: 0.55 + t.value * 0.45, transform: [{ scale: 0.82 + t.value * 0.3 }, { rotate: t.value * 14 + "deg" }] }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: left - size / 2, top: top - size / 2 }, st]}>
    <Icon name="sparkles" size={size} color={theme.mediaRating} />
  </Animated.View>;
}

/** A press glow for an invisible hotspot: a soft light that blooms from the centre. */
export function PressGlow({ p, w, h }: { p: SharedValue<number>; w: number; h: number }) {
  const { theme } = usePreferences(), d = Math.max(44, Math.min(w, h) * 1.1);
  const st = useAnimatedStyle(() => ({ opacity: p.value * 0.32, transform: [{ scale: 0.6 + p.value * 0.5 }] }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: (w - d) / 2, top: (h - d) / 2, width: d, height: d, borderRadius: d, backgroundColor: theme.mediaForeground }, st]} />;
}

/** Fade-and-rise entrance used by the HUD, controls and scene. */
export function useEnter(delay: number, from: number, scaleFrom = 1) {
  const { reducedMotion } = usePreferences(), t = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => { if (!reducedMotion) t.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })); }, [delay, reducedMotion, t]);
  return useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * from }, { scale: scaleFrom + (1 - scaleFrom) * t.value }] }));
}

const s = StyleSheet.create({ abs: { position: "absolute" }, fill: { width: "100%", height: "100%" }, centre: { alignItems: "center", justifyContent: "center" } });
