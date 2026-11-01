import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useIsFocused } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import type { CollectionArt } from "../../config/collection-art";
import { Sheen } from "./Sheen";

/**
 * Collection effects, as in the owner's reference video (1 Nov 2026): light passes over an item in its own colours (Sheen)
 * and a small four-point star in the item's highlight colour pops on a bright edge, turns and fades, one item at a time.
 * Nothing moves while Reduce motion is on or the screen is not in view.
 */
const STAR = "M0-10L1.5-1.5L10 0L1.5 1.5L0 10L-1.5 1.5L-10 0L-1.5-1.5Z";

/** A clock for one screen of items: ticks about every 1.2 s while the screen is in view and motion is allowed. */
export function useGlintClock(count: number) {
  const { reducedMotion } = usePreferences(), focused = useIsFocused(), [tick, setTick] = useState(0);
  useEffect(() => {
    if (reducedMotion || !focused || count === 0) return;
    const timer = setInterval(() => setTick(n => n + 1), 1200);
    return () => clearInterval(timer);
  }, [reducedMotion, focused, count]);
  /** The pulse for grid item `index`: only one item, picked by the tick, glints at a time. */
  const tile = (index: number) => (tick > 0 && (tick * 7919 + 13) % count === index ? tick : 0);
  /** The featured item glints every other tick. */
  return { tile, feature: Math.floor(tick / 2) };
}

/** One glint on an item `size` points wide, at one of its edge `points`, in its `tone`; it plays each time `pulse` changes to a new non-zero value. */
export function Glint({ points, pulse, size, tone }: { points: [number, number][]; pulse: number; size: number; tone: string }) {
  // The glint takes the item's own highlight colour (art.tone), so it reads as the item catching light, not a white sticker.
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!pulse) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
  }, [pulse, progress]);
  const style = useAnimatedStyle(() => {
    const v = progress.value, rising = v < 0.35, k = rising ? v / 0.35 : (v - 0.35) / 0.65;
    return { opacity: v === 0 || v === 1 ? 0 : rising ? k : 1 - k, transform: [{ scale: rising ? 1.1 * k : 1.1 - 0.9 * k }, { rotate: `${v * 110}deg` }] };
  });
  if (!pulse || points.length === 0) return null;
  const at = points[(pulse * 31) % points.length], star = Math.max(10, size * 0.18);
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: at[0] * size - star / 2, top: at[1] * size - star / 2, width: star, height: star }, style]}>
    <Svg viewBox="-10 -10 20 20" width={star} height={star}>
      <Circle r={6} fill={tone} opacity={0.3} />
      <Path d={STAR} fill={tone} />
      <Path d={STAR} fill={tone} opacity={0.7} transform="rotate(45) scale(0.5)" />
      <Circle r={1.8} fill={tone} />
    </Svg>
  </Animated.View>;
}

/**
 * A Collection item's picture with light sweeping across its surface (`Sheen`, each time `pulse` changes, or over and over
 * with `loop`) and a star glint. A border also holds `inside` (the member's picture) in its opening; `dim` fades an item the
 * member hasn't earned yet, which stays still.
 */
export function ItemArt({ art, size, pulse = 0, loop = false, dim = false, inside }: {
  art: CollectionArt | undefined; size: number; pulse?: number; loop?: boolean; dim?: boolean; inside?: ReactNode;
}) {
  if (!art) return <View style={{ width: size, height: size }} />;
  const hole = art.hole;
  return <View style={{ width: size, height: size }} accessible={false}>
    {hole && inside && <View style={{ position: "absolute", left: (hole[0] / 100) * size, top: (hole[1] / 100) * size, width: (hole[2] / 100) * size, height: (hole[2] / 100) * size,
      borderRadius: size, overflow: "hidden" }}>{inside}</View>}
    <Image source={art.image} style={{ width: size, height: size, opacity: dim ? 0.35 : 1 }} contentFit="contain" accessible={false} />
    {!dim && <Sheen art={art} size={size} pulse={pulse} loop={loop} />}
    {!dim && <Glint points={art.glints} pulse={pulse} size={size} tone={art.tone} />}
  </View>;
}

/**
 * Wraps a round picture `size` wide in a border without moving anything around it: the ring spills past the picture.
 * `shine` sweeps light across the ring now and then (profile pictures; lists stay still).
 */
export function BorderFrame({ art, size, shine = false, children }: { art: CollectionArt | undefined; size: number; shine?: boolean; children: ReactNode }) {
  if (!art?.hole) return <>{children}</>;
  const [left, top, width] = art.hole, ring = (size * 100) / width;
  return <View style={{ width: size, height: size }}>
    {children}
    <View pointerEvents="none" style={{ position: "absolute", width: ring, height: ring, left: -(left / 100) * ring, top: -(top / 100) * ring }}>
      <Image source={art.image} accessible={false} contentFit="contain" style={{ width: ring, height: ring }} />
      {shine && <Sheen art={art} size={ring} loop />}
    </View>
  </View>;
}
