/**
 * The sealed "Your own avatar" slot (AVATAR_LOTUS_PLAN §2 steps 2 and 4): the member's lotus, a pink bud until it
 * blooms, on a soft panel. The lotus floats, breathes and sways in a pulsing glow while sparks rise around it; with
 * reduced motion everything holds still. Purely decorative: the screens around it carry the labels. The Adult and Mini
 * silhouettes once shown behind it were removed on 20 Oct 2026 (owner: they read as a grey backdrop on phones).
 */
import { Image, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import type { Tier } from "../../game/content/cosmetics";
import { useClock } from "../../screens/game/home/Ambient";
import { usePreferences } from "../../state/Preferences";
import { Icon } from "../ui";

export const lotusArt = (tier: Tier | null) => (tier ? "lotus-" + tier : "lotus-bud-pink");

/** A soft glow disc: three stacked discs fake a feathered edge on every platform. */
export function Glow({ size, color, opacity = 0.34 }: { size: number; color: string; opacity?: number }) {
  return <View pointerEvents="none" style={[s.centre, { width: size, height: size }]}>
    {[1, 0.78, 0.56].map(k => <View key={k} style={[s.abs, { width: size * k, height: size * k, borderRadius: size, backgroundColor: color, opacity }]} />)}
  </View>;
}

const SPARKS: [number, number, number][] = [[0.12, 0.2, 0], [0.84, 0.12, 900], [0.9, 0.58, 1700], [0.06, 0.64, 2400]];
function Spark({ x, y, delay, box, color }: { x: number; y: number; delay: number; box: number; color: string }) {
  const t = useClock(false, 3000, delay), r = Math.max(10, box * 0.1);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.3, 0.7, 1], [0, 1, 0.8, 0]),
    transform: [{ translateY: -t.value * box * 0.12 }, { scale: 0.6 + t.value * 0.5 }, { rotate: t.value * 40 + "deg" }],
  }));
  return <Animated.View pointerEvents="none" style={[s.abs, { left: x * box - r / 2, top: y * box - r / 2 }, st]}><Icon name="sparkles" size={r} color={color} /></Animated.View>;
}

/** The lotus itself with its glow, float, sway, rising sparks and (when sealed) a lock badge. */
export function LotusBud({ tier, size, sealed = true }: { tier: Tier | null; size: number; sealed?: boolean }) {
  const { theme, reducedMotion } = usePreferences();
  const breath = useClock(reducedMotion, 1600, 0, true), sway = useClock(reducedMotion, 3200, 400, true);
  const glow = useAnimatedStyle(() => ({ opacity: 1 - breath.value * 0.45, transform: [{ scale: 1 + breath.value * 0.18 }] }));
  const bud = useAnimatedStyle(() => ({
    transform: [{ translateY: -breath.value * size * 0.04 }, { rotate: (sway.value - 0.5) * 4 + "deg" }, { scale: 1 + breath.value * 0.04 }],
  }));
  const art = lotusArt(tier), [w, h] = GAME_ART_SIZE[art], box = size * 1.35, lock = Math.max(22, size * 0.26), tint = theme.lotus[tier ?? "pink"];
  return <View pointerEvents="none" style={[s.centre, { width: box, height: box }]}>
    <Animated.View style={[s.abs, glow]}><Glow size={size * 1.15} color={tint} opacity={0.3} /></Animated.View>
    {!reducedMotion && RISE.map(([x, d]) => <Rise key={d} x={x} delay={d} box={box} color={tint} />)}
    <Animated.View style={[{ width: size, height: size * h / w, transformOrigin: "50% 90%" }, bud]}>
      <Image source={GAME_ART[art]} resizeMode="contain" style={s.fill} accessible={false} />
    </Animated.View>
    {!reducedMotion && SPARKS.map(([x, y, d]) => <Spark key={d} x={x} y={y} delay={d} box={box} color={theme.mediaRating} />)}
    {sealed && <View style={[s.lock, s.centre, { width: lock, height: lock, borderRadius: lock, right: box * 0.16, bottom: box * 0.14, backgroundColor: theme.card, borderColor: theme.border }]}>
      <Icon name="lock-closed" size={lock * 0.56} color={theme.accent} />
    </View>}
  </View>;
}

/** Small glowing sparks rising from under the lotus, like light off the pond. */
const RISE: [number, number][] = [[0.3, 0], [0.62, 700], [0.45, 1400], [0.74, 2100], [0.22, 2800]];
function Rise({ x, delay, box, color }: { x: number; delay: number; box: number; color: string }) {
  const { theme } = usePreferences(), t = useClock(false, 3600, delay), d = Math.max(5, box * 0.03);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
    transform: [{ translateY: -t.value * box * 0.55 }, { translateX: Math.sin(t.value * 6 + delay) * box * 0.02 }, { scale: 0.6 + t.value * 0.4 }],
  }));
  return <Animated.View style={[s.abs, s.centre, { left: x * box - d, top: box * 0.78 - d, width: d * 2, height: d * 2 }, st]}>
    <View style={[s.abs, { width: d * 2, height: d * 2, borderRadius: d, backgroundColor: color, opacity: 0.45 }]} />
    <View style={{ width: d, height: d, borderRadius: d, backgroundColor: theme.lotus.petal }} />
  </Animated.View>;
}

/** The sealed slot: the member's lotus on a soft panel. */
export function LotusSeal({ tier, height }: { tier: Tier | null; height: number }) {
  const { theme } = usePreferences();
  return <View pointerEvents="none" style={[s.seal, s.centre, { height, backgroundColor: theme.accentSoft }]}>
    <LotusBud tier={tier} size={height * 0.5} />
  </View>;
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
  centre: { alignItems: "center", justifyContent: "center" },
  lock: { position: "absolute", borderWidth: 1 },
  seal: { alignSelf: "stretch", borderRadius: 18, overflow: "hidden" },
});
