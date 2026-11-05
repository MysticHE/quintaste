import { useEffect, useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Image, Mask, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { COLLECTION_ART, type CollectionArt } from "../../config/collection-art";
import { lightEnvelope, useCollectionMotion } from "./Motion";

const Light = Animated.createAnimatedComponent(Circle);
const Crown = Animated.createAnimatedComponent(Ellipse);
const LuminousImage = Animated.createAnimatedComponent(Image);
type Point = readonly [number, number];
type Curve = readonly [Point, Point, Point];
// Short curves follow each artwork's upper metal, not the circular photo opening.
const paths: { id: string; crown: Point; left: Curve; right: Curve }[] = [
  { id: "sprout", crown: [50, 6], left: [[37, 11], [15, 17], [10, 37]], right: [[63, 11], [85, 17], [90, 37]] },
  { id: "bamboo", crown: [50, 6], left: [[38, 13], [19, 17], [13, 38]], right: [[62, 13], [81, 17], [87, 38]] },
  { id: "lotus-pond", crown: [50, 5], left: [[38, 10], [16, 19], [10, 39]], right: [[62, 10], [84, 19], [90, 39]] },
  { id: "mochi", crown: [50, 7], left: [[37, 10], [16, 17], [10, 38]], right: [[63, 10], [84, 17], [90, 38]] },
  { id: "golden-lotus", crown: [50, 16], left: [[36, 21], [20, 18], [17, 39]], right: [[64, 21], [80, 18], [83, 39]] },
];

/** Fixed copies of the original coloured art; only soft masks move over its contours. */
export function BorderEffects({ art, size, enabled = true }: { art: CollectionArt; size: number; enabled?: boolean }) {
  const { host, on } = useCollectionMotion(enabled);
  const rawId = useId(), id = "border" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const index = paths.findIndex(p => COLLECTION_ART["border-" + p.id] === art), path = paths[index];
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.set(0);
    if (on && index >= 0) clock.set(withDelay(400 + index * 850, withRepeat(withSequence(
      withTiming(5600, { duration: 5600, easing: Easing.linear }), withTiming(0, { duration: 0 }),
    ), -1, false)));
    return () => { cancelAnimation(clock); clock.set(0); };
  }, [on, index, clock]);
  const strength = size < 80 ? 0.9 : 1;
  const glow = useAnimatedProps(() => ({ opacity: (0.35 + 0.5 * (0.5 - 0.5 * Math.cos(clock.value * Math.PI * 2 / 2800))) * strength }));
  const crown = useAnimatedProps(() => ({ opacity: lightEnvelope(clock.value, 0, 700, 1700) * strength * 0.85 }));
  return <View ref={host} pointerEvents="none" testID="border-motion-host" style={{ position: "absolute", width: size, height: size }}>
    {on && path && <Svg testID="border-effects" width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id + "fade"}>
          <Stop offset="0" stopColor="white" stopOpacity="0.9" />
          <Stop offset="0.45" stopColor="white" stopOpacity="0.5" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </RadialGradient>
        <Mask id={id + "rim"} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
          <ContourLight curve={path.left} clock={clock} delay={500} fill={`url(#${id}fade)`} strength={strength} />
          <ContourLight curve={path.right} clock={clock} delay={850} fill={`url(#${id}fade)`} strength={strength} />
        </Mask>
        <Mask id={id + "crown"} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
          <Crown cx={path.crown[0]} cy={path.crown[1]} rx="13" ry="11" fill={`url(#${id}fade)`} animatedProps={crown} />
        </Mask>
      </Defs>
      <LuminousImage href={art.core} width="100" height="100" preserveAspectRatio="xMidYMid meet" animatedProps={glow} />
      <Image href={art.core} width="100" height="100" preserveAspectRatio="xMidYMid meet" mask={`url(#${id}crown)`} />
      <Image href={art.hot ?? art.lit} width="100" height="100" preserveAspectRatio="xMidYMid meet" mask={`url(#${id}rim)`} />
    </Svg>}
  </View>;
}

function ContourLight({ curve, clock, delay, fill, strength }: { curve: Curve; clock: SharedValue<number>; delay: number; fill: string; strength: number }) {
  const props = useAnimatedProps(() => {
    const t = Math.max(0, Math.min(1, (clock.value - delay) / 1700)), u = 1 - t;
    return { cx: u * u * curve[0][0] + 2 * u * t * curve[1][0] + t * t * curve[2][0],
      cy: u * u * curve[0][1] + 2 * u * t * curve[1][1] + t * t * curve[2][1],
      opacity: lightEnvelope(clock.value, delay, delay + 700, delay + 1700) * strength };
  });
  return <Light r="11" fill={fill} animatedProps={props} />;
}
