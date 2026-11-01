import { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useIsFocused } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import type { CollectionArt } from "../../config/collection-art";

/**
 * Collection item effects beyond the light sweep (owner, 1 Nov 2026, from the reference video): its glowing parts blinking
 * softly, light travelling clockwise along a border's metal, gems twinkling, and the gift flaring as it opens. Every effect is made from the item's own artwork or colours (the layers from scripts/import-collection-art.py),
 * never floating dots or discs, so it blends with the design (owner: "pristine", no bubbles). Richer for rarer items
 * (art.level 1 to 4). Nothing moves with Reduce motion on or while the screen is out of view.
 */
export const HALO_PAD = 1.4;
/** A slim four-point star: long fine rays and a narrow waist, so it reads as a glint, not a blob. */
export const STAR = "M0-10L0.9-0.9L10 0L0.9 0.9L0 10L-0.9 0.9L-10 0L-0.9-0.9Z";

/** A whole number from 0 to range - 1 from `text` (an item's colour), so each item gets its own stable timing. */
export function hashOf(text: string, range: number) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % range;
  return h;
}

/** Whether effects may move here: the screen is in view and Reduce motion is off. */
export function useFxOn() {
  const { reducedMotion } = usePreferences(), focused = useIsFocused();
  return focused && !reducedMotion;
}

/** 0 to 1 over `duration`, forever while `on` (back and forth when `reverse`), after `delay`. */
export function useLoop(on: boolean, duration: number, { delay = 0, reverse = true, linear = false } = {}) {
  const value = useSharedValue(0);
  useEffect(() => {
    if (!on) return;
    value.set(0);
    value.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: linear ? Easing.linear : Easing.inOut(Easing.sin) }), -1, reverse)));
    return () => { cancelAnimation(value); value.set(0); };
  }, [on, duration, delay, reverse, linear, value]);
  return value;
}

/**
 * The soft blink of an item's glow (owner, 1 Nov 2026: "blinking softly"): rises to full, fades gently, rests a moment,
 * about every 2.6 seconds. Each item starts at its own moment (from its colour) so several on one screen don't
 * blink together.
 */
export function useBlink(on: boolean, tone: string) {
  const value = useSharedValue(0), delay = hashOf(tone, 1201);
  useEffect(() => {
    if (!on) return;
    value.set(0);
    value.set(withDelay(delay, withRepeat(withSequence(
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 600 })), -1, false)));
    return () => { cancelAnimation(value); value.set(0); };
  }, [on, delay, value]);
  return value;
}

/** The item's glowing parts (lotus petals, gems, leaves) lit up exactly over it, glowing from within as `breath` rises. */
export function Core({ art, size, breath }: { art: CollectionArt; size: number; breath: SharedValue<number> }) {
  const peak = art.level === 1 ? 0.5 : 0.75, style = useAnimatedStyle(() => ({ opacity: peak * breath.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, style]}>
    <Image source={art.core} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
  </Animated.View>;
}

/**
 * Light shining from the glowing parts (the purple lotus glows purple, leaves green, hearts red): a soft, vivid layer of
 * their own colours over the item, spreading a little past their edges, breathing from faint to radiant. The "light" blend
 * is already baked into the picture (scripts/import-collection-art.py), so it looks the same on every phone and the web
 * without relying on blend-mode support.
 */
export function Bloom({ art, size, breath }: { art: CollectionArt; size: number; breath: SharedValue<number> }) {
  // Common items glow more gently than rarer ones.
  const peak = art.level === 1 ? 0.55 : 0.85, side = size * HALO_PAD, style = useAnimatedStyle(() => ({ opacity: peak * breath.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (size - side) / 2, top: (size - side) / 2, width: side, height: side }, style]}>
    <Image source={art.bloom} style={{ width: side, height: side }} contentFit="contain" accessible={false} />
  </Animated.View>;
}

/**
 * Light travelling clockwise along a border's metal: windows onto the ring's hot copy (art.hot) turn round the ring's centre,
 * a bright head and a fading trail behind it, so the metal itself lights up as the light passes. Rarer borders go faster.
 * Four windows in all, to keep the number of moving layers low on phones.
 */
export function RingLight({ art, size, on }: { art: CollectionArt; size: number; on: boolean }) {
  const turn = useLoop(on && !!art.orbit, [0, 11000, 10000, 9000, 8000][art.level], { reverse: false, linear: true });
  if (!art.orbit) return null;
  // Head: a wide faint window and a narrow bright one (soft edges); trail: two fainter windows behind.
  const parts = [{ offset: 0, width: 0.26, opacity: 0.45 }, { offset: 0, width: 0.1, opacity: 0.75 },
    { offset: -8, width: 0.22, opacity: 0.28 }, { offset: -16, width: 0.22, opacity: 0.12 }];
  return <>{parts.map((part, i) => <RingWindow key={i} art={art} orbit={art.orbit!} size={size} turn={turn} offset={part.offset} width={part.width * size} opacity={part.opacity} />)}</>;
}

function RingWindow({ art, orbit, size, turn, offset, width, opacity }: {
  art: CollectionArt; orbit: [number, number, number]; size: number; turn: SharedValue<number>; offset: number; width: number; opacity: number;
}) {
  const [cx, cy, r] = orbit, side = size * 2, height = size * 0.22;
  const left = (side - width) / 2, top = side / 2 - r * size - height / 2;
  // The outer square turns round the ring's centre; the picture inside turns back by the same angle, so it stays put.
  const outer = useAnimatedStyle(() => ({ transform: [{ rotate: turn.value * 360 + offset + "deg" }] }));
  const inner = useAnimatedStyle(() => ({ transform: [{ rotate: -(turn.value * 360 + offset) + "deg" }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: cx * size - side / 2, top: cy * size - side / 2, width: side, height: side }, outer]}>
    <View style={{ position: "absolute", left, top, width, height, overflow: "hidden", opacity }}>
      <Animated.View style={[{ position: "absolute", left: -left, top: -top, width: side, height: side }, inner]}>
        <Image source={art.hot ?? art.lit} style={{ position: "absolute", left: side / 2 - cx * size, top: side / 2 - cy * size, width: size, height: size }} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  </Animated.View>;
}

/** A slim star glint in the item's colours: its colour outside, a paler core of the same hue, no round backing. */
export function StarGlint({ tone, spark, size }: { tone: string; spark: string; size: number }) {
  return <Svg viewBox="-10 -10 20 20" width={size} height={size}>
    <Path d={STAR} fill={tone} />
    <Path d={STAR} fill={spark} transform="scale(0.55)" />
    <Path d={STAR} fill={spark} opacity={0.7} transform="rotate(45) scale(0.38)" />
  </Svg>;
}

/** One gem's twinkle: a slim star that pops, turns and fades, then rests. */
function Twinkle({ art, size, on, at, delay, cycle }: { art: CollectionArt; size: number; on: boolean; at: [number, number]; delay: number; cycle: number }) {
  const value = useSharedValue(0), star = Math.max(9, size * 0.11);
  useEffect(() => {
    if (!on) return;
    value.set(withDelay(delay, withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
      withDelay(cycle - 900, withTiming(0, { duration: 0 }))), -1, false)));
    return () => { cancelAnimation(value); value.set(0); };
  }, [on, delay, cycle, value]);
  const style = useAnimatedStyle(() => {
    const v = value.value, rising = v < 0.35, k = rising ? v / 0.35 : (v - 0.35) / 0.65;
    return { opacity: v === 0 || v === 1 ? 0 : rising ? k : 1 - k, transform: [{ scale: rising ? k : 1 - 0.8 * k }, { rotate: `${v * 70}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: at[0] * size - star / 2, top: at[1] * size - star / 2, width: star, height: star }, style]}>
    <StarGlint tone={art.tone} spark={art.spark} size={star} />
  </Animated.View>;
}

/** The item's gems twinkling in turn, one star at a time about every 1.8 s, never overlapping (up to three gems). */
export function Twinkles({ art, size, on }: { art: CollectionArt; size: number; on: boolean }) {
  const points = art.gems.slice(0, Math.min(3, art.level + 1)), cycle = points.length * 1800;
  return <>{points.map((at, i) => <Twinkle key={i} art={art} size={size} on={on} at={at} delay={(i * cycle) / points.length} cycle={cycle} />)}</>;
}

/** The moment a gift opens: it flares to its lit state and settles, with a few slim star sparks leaving it, once. */
export function Burst({ art, size }: { art: CollectionArt; size: number }) {
  const { reducedMotion } = usePreferences(), value = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    value.set(0);
    value.set(withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [reducedMotion, value]);
  const flare = useAnimatedStyle(() => {
    const v = value.value;
    return { opacity: v <= 0 || v >= 1 ? 0 : v < 0.15 ? v / 0.15 : (1 - v) / 0.85 };
  });
  if (reducedMotion) return null;
  return <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, flare]}>
      <Image source={art.lit} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
    </Animated.View>
    {Array.from({ length: 6 }, (_, i) => <Spark key={i} art={art} size={size} angle={(i / 6) * 360 + 30} value={value} />)}
  </View>;
}

function Spark({ art, size, angle, value }: { art: CollectionArt; size: number; angle: number; value: SharedValue<number> }) {
  const star = Math.max(10, size * 0.08), rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const v = value.value, d = size * (0.22 + 0.3 * v);
    return { opacity: v <= 0.05 || v >= 1 ? 0 : (1 - v) * 0.9, transform: [{ translateX: Math.sin(rad) * d }, { translateY: -Math.cos(rad) * d }, { scale: 1 - 0.5 * v }] };
  });
  return <Animated.View style={[{ position: "absolute", left: size / 2 - star / 2, top: size / 2 - star / 2, width: star, height: star }, style]}>
    <StarGlint tone={art.tone} spark={art.spark} size={star} />
  </Animated.View>;
}
