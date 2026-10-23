import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { GAME_ART, GAME_ART_SIZE } from "../../../game/art";
import { usePreferences } from "../../../state/Preferences";
import { useClock } from "./Ambient";
import { Art } from "./bits";
import { Sparkle } from "./SceneFx";

const STAGE = 300, C = STAGE / 2;
/** Tapered beams from the centre: [count, half-width in degrees, length, rotation offset in degrees]. Each set fades out over its own length. */
type Beam = [number, number, number, number];
function beams([count, half, r, offset]: Beam) {
  return Array.from({ length: count }, (_, i) => {
    const a = ((i / count) * 360 + offset) * Math.PI / 180, h = (half * Math.PI) / 180;
    const pt = (t: number) => (C + Math.cos(t) * r).toFixed(1) + "," + (C + Math.sin(t) * r).toFixed(1);
    return `M${C},${C} L${pt(a - h)} L${pt(a + h)} Z`;
  }).join(" ");
}
/** A layer's beam sets as paths, worked out once; a wide set (`soft`) is a faint underlay that softens the narrow ones' edges. */
type Layer = { d: string; r: number; soft: boolean }[];
const layer = (sets: Beam[]): Layer => sets.map(b => ({ d: beams(b), r: b[2], soft: b[1] > 4 }));
const FRONT = layer([[8, 2.2, 150, 0], [8, 1.4, 112, 22.5], [8, 5, 150, 0]]), BACK = layer([[10, 1.2, 140, 9]]);
/** Sparkles around the find: x and y from the centre, and size. */
const SPARKLES: [number, number, number][] = [[-112, -68, 16], [104, -96, 12], [122, 38, 18], [-126, 58, 11], [-36, -128, 10], [64, 116, 13]];

/**
 * The find on a spotlight: a warm glow, two layers of fine light beams turning slowly in opposite directions, twinkling
 * sparkles and a soft pool of light the find floats over. It arrives with a flash and a springy pop. Reduced motion
 * keeps one still layer of beams and dim sparkles, and shows the find in place. A café skin (`card`) shows as a
 * rounded picture card with a soft shadow rather than a cut-out. `fit` (0.6 to 1) shrinks the whole stage for a short screen.
 */
export function FindLight({ art, size, still, card = false, fit = 1 }: { art: string; size: number; still: boolean; card?: boolean; fit?: number }) {
  const { theme } = usePreferences(), gold = theme.mediaRating;
  const pop = useSharedValue(still ? 1 : 0), flash = useSharedValue(0), spin = useSharedValue(0), bob = useSharedValue(0);
  useEffect(() => {
    if (still) { pop.value = 1; return; }
    pop.value = withDelay(180, withSpring(1, { damping: 8, stiffness: 150 }));
    flash.value = withDelay(160, withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) })));
    spin.value = withRepeat(withTiming(1, { duration: 60000, easing: Easing.linear }), -1);
    bob.value = withDelay(900, withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => [pop, flash, spin, bob].forEach(cancelAnimation);
  }, [still, pop, flash, spin, bob]);
  const turn = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value), transform: [{ rotate: spin.value * 360 + "deg" }, { scale: 0.6 + Math.min(1, pop.value) * 0.4 }] }));
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value) * 0.7, transform: [{ rotate: -spin.value * 540 + "deg" }] }));
  const burst = useAnimatedStyle(() => ({ opacity: flash.value * 0.7, transform: [{ scale: 0.4 + (1 - flash.value) * 0.9 }] }));
  const item = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.5), transform: [{ translateY: -bob.value * 7 }, { scale: 0.3 + pop.value * 0.7 }, { rotate: (1 - pop.value) * -10 + "deg" }] }));
  const pool = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value) * (1 - bob.value * 0.25), transform: [{ scaleX: 1 - bob.value * 0.08 }] }));
  return <View style={{ width: STAGE * fit, height: STAGE * fit, alignItems: "center", justifyContent: "center" }} pointerEvents="none"><View style={[s.stage, { transform: [{ scale: fit }] }]}>
    <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="findGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={gold} stopOpacity={0.5} /><Stop offset="0.42" stopColor={gold} stopOpacity={0.16} /><Stop offset="1" stopColor={gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={C} cy={C} r={C} fill="url(#findGlow)" />
    </Svg>
    {!still && <Animated.View style={[StyleSheet.absoluteFill, back]}><Beams layer={BACK} id="findBack" color={theme.mediaForeground} strength={0.3} /></Animated.View>}
    <Animated.View style={[StyleSheet.absoluteFill, turn]}><Beams layer={FRONT} id="findFront" color={gold} strength={still ? 0.34 : 0.5} /></Animated.View>
    {!still && <Animated.View style={[s.burst, { backgroundColor: theme.mediaForeground }, burst]} />}
    <Animated.View style={[s.pool, { top: C + size / 2 - 14 }, pool]}>
      <Svg width={180} height={40}>
        <Defs><RadialGradient id="findPool" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={gold} stopOpacity={0.55} /><Stop offset="1" stopColor={gold} stopOpacity={0} />
        </RadialGradient></Defs>
        <Ellipse cx={90} cy={20} rx={90} ry={20} fill="url(#findPool)" />
      </Svg>
    </Animated.View>
    {SPARKLES.map(([x, y, size], i) => <Twinkle key={i} x={C + x} y={C + y} size={size} delay={500 + i * 330} still={still} />)}
    <Animated.View style={item}>{card && GAME_ART[art]
      ? <Image source={GAME_ART[art]} accessibilityIgnoresInvertColors style={[s.card, { width: size * (GAME_ART_SIZE[art] ? GAME_ART_SIZE[art][0] / GAME_ART_SIZE[art][1] : 1), height: size, shadowColor: theme.shadow }]} />
      : <Art k={art} size={size} />}</Animated.View>
  </View></View>;
}

/** One SVG per beam layer, each set fading out over its own length. */
function Beams({ layer, id, color, strength }: { layer: Layer; id: string; color: string; strength: number }) {
  return <Svg width={STAGE} height={STAGE}>
    <Defs>{layer.map(({ r, soft }, i) => <RadialGradient key={i} id={id + i} cx={C} cy={C} r={r} gradientUnits="userSpaceOnUse">
      <Stop offset="0.2" stopColor={color} stopOpacity={strength * (soft ? 0.3 : 1)} /><Stop offset="0.6" stopColor={color} stopOpacity={strength * (soft ? 0.12 : 0.4)} /><Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>)}</Defs>
    {layer.map(({ d }, i) => <Path key={i} d={d} fill={`url(#${id + i})`} />)}
  </Svg>;
}

/** The café's sparkle (SceneFx), twinkling on its own beat; reduced motion keeps it still and dim. */
function Twinkle({ x, y, size, delay, still }: { x: number; y: number; size: number; delay: number; still: boolean }) {
  const t = useClock(still, 1100, delay, true), k = useDerivedValue(() => (still ? 0.5 : t.value));
  return <Sparkle x={x} y={y} size={size} k={k} />;
}

const s = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: "center", justifyContent: "center" },
  burst: { position: "absolute", width: 220, height: 220, borderRadius: 110 },
  pool: { position: "absolute", left: C - 90 },
  card: { borderRadius: 16, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
});
