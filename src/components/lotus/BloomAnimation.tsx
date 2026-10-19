/**
 * The bloom (AVATAR_LOTUS_PLAN §2 step 3). It only ever plays a result the server has already recorded.
 * The bud spins and slows while the colours cycle pink → purple → blue → golden at one steady pace, the same sequence
 * for every result, so the animation never lingers on Golden or fakes a near miss. Light gathers, then the lotus bursts
 * open into the result with petals and rays. Reduced motion swaps all of it for a cross-fade. The screen around it
 * shows Skip and the odds.
 */
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import { TIERS, type Tier } from "../../game/content/cosmetics";
import { usePreferences } from "../../state/Preferences";
import { Glow, lotusArt } from "./LotusSeal";

const SPIN = 2800, GATHER = 450, BURST = 1000, STEP = 260;
/** How long the full animation runs, so the screen can finish it. */
export const bloomDuration = (reduced: boolean) => (reduced ? 900 : SPIN + GATHER + BURST + 250);

function LotusImage({ art, size }: { art: string; size: number }) {
  const [w, h] = GAME_ART_SIZE[art];
  return <Image source={GAME_ART[art]} resizeMode="contain" accessible={false} style={{ width: size, height: size * h / w }} />;
}
/** One colour in the cycle, shown while the steady clock is on its step. */
function Cycle({ clock, gather, index, size }: { clock: SharedValue<number>; gather: SharedValue<number>; index: number; size: number }) {
  const st = useAnimatedStyle(() => ({ opacity: (Math.floor(clock.value / STEP) % 4 === index ? 1 : 0) * (1 - gather.value) }));
  return <Animated.View style={[s.abs, s.centre, st]}><LotusImage art={lotusArt(TIERS[index])} size={size} /></Animated.View>;
}
function Petal({ burst, i, size, color }: { burst: SharedValue<number>; i: number; size: number; color: string }) {
  const angle = (i / 10) * Math.PI * 2 + 0.3, reach = size * (0.55 + (i % 3) * 0.08);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.1, 0.75, 1], [0, 1, 0.8, 0]),
    transform: [{ translateX: Math.cos(angle) * reach * burst.value }, { translateY: Math.sin(angle) * reach * burst.value + burst.value * size * 0.12 },
      { rotate: angle * 57.3 + burst.value * 120 + "deg" }],
  }));
  return <Animated.View style={[s.abs, { width: size * 0.07, height: size * 0.13, borderRadius: size, backgroundColor: color }, st]} />;
}
function Ray({ burst, i, size, color }: { burst: SharedValue<number>; i: number; size: number; color: string }) {
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.15, 1], [0, 0.9, 0]),
    transform: [{ rotate: i * 22.5 + "deg" }, { scaleY: 0.2 + burst.value * 0.9 }],
  }));
  return <Animated.View style={[s.abs, { width: size * 0.035, height: size * 1.5, borderRadius: size, backgroundColor: color }, st]} />;
}

export function BloomAnimation({ tier, size }: { tier: Tier; size: number }) {
  const { theme, reducedMotion } = usePreferences();
  const clock = useSharedValue(0), spin = useSharedValue(0), gather = useSharedValue(0), burst = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) { burst.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }); return; }
    clock.value = withTiming(SPIN + GATHER, { duration: SPIN + GATHER, easing: Easing.linear });
    spin.value = withTiming(1, { duration: SPIN, easing: Easing.out(Easing.cubic) });
    gather.value = withDelay(SPIN, withTiming(1, { duration: GATHER, easing: Easing.in(Easing.quad) }));
    burst.value = withDelay(SPIN + GATHER, withTiming(1, { duration: BURST, easing: Easing.out(Easing.cubic) }));
  }, [reducedMotion, clock, spin, gather, burst]);
  const spinning = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: spin.value * 1080 + "deg" }, { scale: 1 - gather.value * 0.2 }] }));
  const light = useAnimatedStyle(() => ({ opacity: reducedMotion ? 0 : gather.value * (1 - burst.value), transform: [{ scale: 0.4 + gather.value * 0.9 + burst.value * 0.5 }] }));
  const bud = useAnimatedStyle(() => ({ opacity: 1 - burst.value }));
  const result = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, reducedMotion ? 1 : 0.2], [0, 1], "clamp"),
    transform: [{ scale: reducedMotion ? 1 : interpolate(burst.value, [0, 0.6, 1], [0.35, 1.08, 1]) }],
  }));
  const colour = theme.lotus[tier];
  return <View style={[s.centre, { width: size * 1.6, height: size * 1.6 }]} pointerEvents="none">
    {!reducedMotion && <>
      {Array.from({ length: 8 }, (_, i) => <Ray key={"r" + i} burst={burst} i={i} size={size} color={theme.lotus.ray} />)}
      <Animated.View style={[s.abs, s.centre, { width: size, height: size }, spinning]}>
        {TIERS.map((_, i) => <Cycle key={i} clock={clock} gather={gather} index={i} size={size * 0.8} />)}
      </Animated.View>
      <Animated.View style={[s.abs, light]}><Glow size={size * 1.2} color={theme.lotus.ray} opacity={0.6} /></Animated.View>
    </>}
    {reducedMotion && <Animated.View style={[s.abs, bud]}><LotusImage art="lotus-bud-pink" size={size * 0.8} /></Animated.View>}
    <Animated.View style={[s.abs, s.centre, result]}>
      <Glow size={size * 1.3} color={colour} opacity={0.3} />
      <View style={s.abs}><LotusImage art={lotusArt(tier)} size={size} /></View>
    </Animated.View>
    {!reducedMotion && Array.from({ length: 10 }, (_, i) => <Petal key={"p" + i} burst={burst} i={i} size={size} color={i % 2 ? colour : theme.lotus.petal} />)}
  </View>;
}
const s = StyleSheet.create({ abs: { position: "absolute" }, centre: { alignItems: "center", justifyContent: "center" } });
