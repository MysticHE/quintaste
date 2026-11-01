import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import type { CollectionArt } from "../../config/collection-art";
import { Sheen } from "./Sheen";
import { Bloom, Core, RingLight, StarGlint, Twinkles, useBlink, useFxOn } from "./Fx";

/**
 * Collection effects, as in the owner's reference video (1 Nov 2026): light passes over an item in its own colours (Sheen),
 * a small four-point star in the item's highlight colour pops on a bright edge, and featured items get the full set (Fx.tsx).
 * Nothing moves while Reduce motion is on or the screen is not in view.
 */
/** A clock for one screen of items: ticks every 3 s while the screen is in view and motion is allowed (calm, not busy). */
export function useGlintClock(count: number) {
  const { reducedMotion } = usePreferences(), focused = useIsFocused(), [tick, setTick] = useState(0);
  // A new set of items (a sheet opened again, another tab) starts the clock afresh.
  const [lastCount, setLastCount] = useState(count);
  if (count !== lastCount) { setLastCount(count); setTick(0); }
  useEffect(() => {
    if (reducedMotion || !focused || count === 0) return;
    const timer = setInterval(() => setTick(n => n + 1), 3000);
    return () => clearInterval(timer);
  }, [reducedMotion, focused, count]);
  /** The pulse for grid item `index`: only one item, picked by the tick, glints at a time. */
  const tile = (index: number) => (tick > 0 && (tick * 7919 + 13) % count === index ? tick : 0);
  return { tile };
}

/** One glint on an item `size` points wide, at one of its edge `points`, in its `tone`; it plays each time `pulse` changes to a new non-zero value. */
export function Glint({ points, pulse, size, tone, spark }: { points: [number, number][]; pulse: number; size: number; tone: string; spark: string }) {
  // The glint takes the item's own highlight colour (art.tone) with a paler core of the same hue (art.spark), so it reads as
  // the item catching light, not a white sticker, and still stands out where it sits over the same colour.
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
  const at = points[(pulse * 31) % points.length], star = Math.max(10, size * 0.16);
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: at[0] * size - star / 2, top: at[1] * size - star / 2, width: star, height: star }, style]}>
    <StarGlint tone={tone} spark={spark} size={star} />
  </Animated.View>;
}

/**
 * A Collection item's picture. On its own it gets light sweeping across it (`Sheen`, each time `pulse` changes) and a star
 * glint; with `fx` (the featured item, a gift opening, badges on a profile) it gets the full set in its own colours: halo
 * and its glowing parts breathing (inner glow and bloom), light travelling along a border's metal and twinkling gems (Fx.tsx). A border also holds
 * `inside` (the member's picture) in its opening; `dim` fades an item the member hasn't earned yet, which stays still.
 */
export function ItemArt({ art, size, pulse = 0, fx = false, dim = false, inside }: {
  art: CollectionArt | undefined; size: number; pulse?: number; fx?: boolean; dim?: boolean; inside?: ReactNode;
}) {
  if (!art) return <View style={{ width: size, height: size }} />;
  return <ItemLayers art={art} size={size} pulse={pulse} fx={fx && !dim} dim={dim} inside={inside} />;
}

function ItemLayers({ art, size, pulse, fx, dim, inside }: { art: CollectionArt; size: number; pulse: number; fx: boolean; dim: boolean; inside?: ReactNode }) {
  // Small items (badges under a name) only blink; the sweep, ring light and twinkles need room to read and cost layers.
  const on = useFxOn() && fx, breath = useBlink(on, art.tone), roomy = size >= 64, hole = art.hole;
  return <View style={{ width: size, height: size }} accessible={false}>
    {hole && inside && <View style={{ position: "absolute", left: (hole[0] / 100) * size, top: (hole[1] / 100) * size, width: (hole[2] / 100) * size, height: (hole[2] / 100) * size,
      borderRadius: size, overflow: "hidden" }}>{inside}</View>}
    <Image source={art.image} style={{ width: size, height: size, opacity: dim ? 0.35 : 1 }} contentFit="contain" accessible={false} />
    {on && <Core art={art} size={size} breath={breath} />}
    {on && <Bloom art={art} size={size} breath={breath} />}
    {!dim && (!fx || roomy) && <Sheen art={art} size={size} pulse={pulse} loop={fx} />}
    {on && roomy && <RingLight art={art} size={size} on={on} />}
    {on && roomy && <Twinkles art={art} size={size} on={on} />}
    {!dim && !fx && <Glint points={art.glints} pulse={pulse} size={size} tone={art.tone} spark={art.spark} />}
  </View>;
}

/**
 * Wraps a round picture `size` wide in a border without moving anything around it: the ring spills past the picture.
 * `shine` gives the ring its full effects (profile pictures; lists stay still).
 */
export function BorderFrame({ art, size, shine = false, children }: { art: CollectionArt | undefined; size: number; shine?: boolean; children: ReactNode }) {
  if (!art?.hole) return <>{children}</>;
  return <RingLayers art={art} hole={art.hole} size={size} shine={shine}>{children}</RingLayers>;
}

function RingLayers({ art, hole, size, shine, children }: { art: CollectionArt; hole: [number, number, number]; size: number; shine: boolean; children: ReactNode }) {
  const on = useFxOn() && shine, breath = useBlink(on, art.tone);
  const [left, top, width] = hole, ring = (size * 100) / width, box = { position: "absolute" as const, width: ring, height: ring, left: -(left / 100) * ring, top: -(top / 100) * ring };
  return <View style={{ width: size, height: size }}>
    {children}
    <View pointerEvents="none" style={box}>
      <Image source={art.image} accessible={false} contentFit="contain" style={{ width: ring, height: ring }} />
      {on && <Core art={art} size={ring} breath={breath} />}
      {on && <Bloom art={art} size={ring} breath={breath} />}
      {shine && <Sheen art={art} size={ring} loop />}
      {on && <RingLight art={art} size={ring} on={on} />}
      {on && <Twinkles art={art} size={ring} on={on} />}
    </View>
  </View>;
}
