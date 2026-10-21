import { useEffect, type PropsWithChildren } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import { photos } from "../../data/photos";
import type { PhotoKey } from "../../types/food";
import { Icon } from "../ui";

/**
 * Motion for the AI Recipes screens: every movement plays once when the screen opens (nothing loops: this is product UI)
 * and everything holds still with reduced motion. The Mochi Chef keeps its own closed happy eyes; only its body moves.
 */
const MOCHI = require("../../../assets/mochi/mochi-happy.webp");
const spring = { damping: 14, stiffness: 140, mass: 0.9 };

/** Rises into place after `delay` ms; plain when motion is reduced. */
export function Rise({ delay = 0, style, children }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const { reducedMotion } = usePreferences();
  return <Animated.View style={style} entering={reducedMotion ? undefined : FadeInDown.delay(delay).springify().damping(16).stiffness(140)}>{children}</Animated.View>;
}

const FAN: { photo: PhotoKey; x: number; rotate: number; delay: number; z: number }[] = [
  { photo: "laksa", x: -84, rotate: -11, delay: 60, z: 1 },
  { photo: "kaya-toast", x: 84, rotate: 11, delay: 140, z: 1 },
  { photo: "claypot-rice", x: 0, rotate: 0, delay: 220, z: 2 },
];
/** One dish photo that springs from the middle into its place in the fan. */
function FanCard({ photo, x, rotate, delay, z }: (typeof FAN)[number]) {
  const { theme, reducedMotion } = usePreferences(), t = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => { if (!reducedMotion) t.value = withDelay(delay, withSpring(1, spring)); }, [delay, reducedMotion, t]);
  const moved = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.6),
    transform: [{ translateX: x * t.value }, { translateY: (1 - t.value) * 48 }, { rotate: rotate * t.value + "deg" }, { scale: 0.82 + 0.18 * t.value }],
  }));
  return <Animated.View style={[s.card, { zIndex: z, borderColor: theme.frameBorder, shadowColor: theme.shadow }, moved]}>
    <Image source={photos[photo]} style={s.photo} accessibilityIgnoresInvertColors />
  </Animated.View>;
}
/** The mascot pops up in front of the fan with a small overshoot. */
function Mochi() {
  const { reducedMotion } = usePreferences(), t = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => { if (!reducedMotion) t.value = withDelay(420, withSpring(1, { damping: 9, stiffness: 160 })); }, [reducedMotion, t]);
  const pop = useAnimatedStyle(() => ({ opacity: Math.min(1, t.value * 2), transform: [{ translateY: (1 - t.value) * 30 }, { scale: 0.4 + 0.6 * t.value }] }));
  return <Animated.View style={[s.mochi, pop]}><Image source={MOCHI} style={s.mochiImage} accessibilityIgnoresInvertColors /></Animated.View>;
}
const SPARKS = [{ left: "12%", top: "16%", size: 18, delay: 560 }, { left: "82%", top: "12%", size: 22, delay: 660 }, { left: "86%", top: "62%", size: 14, delay: 760 }] as const;

/** The plans hero: a gradient stage, three real dishes fanning out, the Mochi Chef and three sparkles. Decorative only. */
export function AiShowcase({ height = 228 }: { height?: number }) {
  const { theme, reducedMotion } = usePreferences();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.stage, { height }]}>
    <LinearGradient colors={[...theme.gradient] as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={[s.halo, { backgroundColor: theme.accentSoft }]} />
    <View style={s.fan}>{FAN.map(card => <FanCard key={card.photo} {...card} />)}</View>
    <Mochi />
    {SPARKS.map(sp => <Animated.View key={sp.left} style={[s.spark, { left: sp.left, top: sp.top }]}
      entering={reducedMotion ? undefined : FadeIn.delay(sp.delay).duration(420)}>
      <Icon name="sparkles" size={sp.size} color={theme.accent} />
    </Animated.View>)}
  </View>;
}

const s = StyleSheet.create({
  stage: { borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 220, height: 220, borderRadius: 110, opacity: 0.7 },
  fan: { width: 120, height: 150, alignItems: "center", justifyContent: "center", marginTop: -8 },
  card: { position: "absolute", width: 112, height: 144, borderRadius: 18, borderWidth: 3, overflow: "hidden",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 6 },
  photo: { width: "100%", height: "100%" },
  mochi: { position: "absolute", bottom: 10, right: "22%", width: 78, height: 78, zIndex: 3 },
  mochiImage: { width: "100%", height: "100%", resizeMode: "contain" },
  spark: { position: "absolute" },
});
