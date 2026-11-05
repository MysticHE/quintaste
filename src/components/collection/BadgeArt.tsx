import { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { COLLECTION_ART, type CollectionArt } from "../../config/collection-art";
import { HALO_PAD, StarGlint } from "./Fx";
import { lightEnvelope, useCollectionMotion } from "./Motion";
import { SheenPass } from "./Sheen";

const badges = ["tea-for-two", "good-company", "explorer", "home-cook", "lotus-legend"];
export const badgeMotionIndex = (art: CollectionArt) => badges.findIndex(id => COLLECTION_ART["badge-" + id] === art);
const CYCLE = 5600;

/** Always luminous, breathing twice per sweep cycle; no multi-second dark interval. */
function luminosity(time: number) {
  "worklet";
  return 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(time * Math.PI * 2 / 2800));
}

/** Golden Lotus's material-coloured light, coordinated on one clock at every badge size. */
export function BadgeArt({ art, size, index, dim }: { art: CollectionArt; size: number; index: number; dim: boolean }) {
  const { host, on } = useCollectionMotion(!dim);
  const clock = useSharedValue(0);
  useEffect(() => {
    const phase = index * 430;
    clock.set(phase);
    if (on) clock.set(withRepeat(withSequence(
      withTiming(CYCLE + phase, { duration: CYCLE, easing: Easing.linear }),
      withTiming(phase, { duration: 0 }),
    ), -1, false));
    return () => { cancelAnimation(clock); clock.set(0); };
  }, [on, index, clock]);
  const small = size < 64;
  // The luminous material stays vivid at profile sizes and on dark backgrounds too.
  const strength = (0.88 + art.level * 0.03) * (small ? 0.9 : 1);
  const core = useAnimatedStyle(() => ({ opacity: luminosity(clock.value) * 0.85 * strength }));
  const bloom = useAnimatedStyle(() => ({ opacity: luminosity(clock.value) * 0.95 * strength }));
  const sweep = useDerivedValue(() => Math.max(0, Math.min(1, ((clock.value % CYCLE) - 350) / 1500)));
  const side = size * HALO_PAD;
  // Pin each glint to a real highlight and time it to the light crossing that horizontal position.
  const points = art.glints.filter(p => p[0] >= 0.2 && p[0] <= 0.8);
  const stars = points.length ? [points[Math.floor(points.length / 4)], points[Math.floor(points.length * 3 / 4)]] : [];
  return <View ref={host} testID="badge-art" style={{ width: size, height: size }} accessible={false}>
    <Image source={art.image} style={{ width: size, height: size, opacity: dim ? 0.35 : 1 }} contentFit="contain" accessible={false} />
    {on && <View pointerEvents="none" testID="badge-effects" style={{ position: "absolute", width: size, height: size }}>
      <Animated.View testID="badge-core" style={[{ position: "absolute", width: size, height: size }, core]}>
        <Image source={art.core} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
      </Animated.View>
      <Animated.View testID="badge-bloom" style={[{ position: "absolute", left: (size - side) / 2, top: (size - side) / 2, width: side, height: side }, bloom]}>
        <Image source={art.bloom} style={{ width: side, height: side }} contentFit="contain" accessible={false} />
      </Animated.View>
      <SheenPass art={art} size={size} progress={sweep} strength={strength} />
      {stars.slice(0, small ? 1 : 2).map((at, i) => <BadgeSpark key={i} art={art} size={size} at={at} clock={clock} strength={strength} />)}
    </View>}
  </View>;
}

function BadgeSpark({ art, size, at, clock, strength }: { art: CollectionArt; size: number; at: [number, number]; clock: SharedValue<number>; strength: number }) {
  const star = Math.max(4, size * 0.095), arrival = 350 + ((at[0] - 0.5 + 0.85) / 1.7) * 1500;
  const style = useAnimatedStyle(() => {
    const value = lightEnvelope(clock.value % CYCLE, arrival - 180, arrival, arrival + 240);
    return { opacity: value * strength, transform: [{ scale: 0.65 + value * 0.35 }] };
  });
  return <Animated.View style={[{ position: "absolute", left: at[0] * size - star / 2, top: at[1] * size - star / 2, width: star, height: star }, style]}>
    <StarGlint tone={art.tone} spark={art.spark} size={star} />
  </Animated.View>;
}
