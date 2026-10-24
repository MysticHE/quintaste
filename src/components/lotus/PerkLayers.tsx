/**
 * Tier perks drawn on the device around the member's own avatar (AVATAR_LOTUS_PLAN §5 step 3): perks are layers, not
 * generations, so a re-bloom upgrades them instantly with no new image call. Purple adds the purple portrait frame and
 * Mochi, Blue the water-ripple aura and Ripple, Golden the sparkle frame and Golden Dewdrop; each includes the tiers
 * below, and the highest companion sits on the frame. `reveal` pops the perks on one by one (a fade with reduced motion).
 */
import { useEffect, type ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { GAME_ART, GAME_ART_SIZE } from "../../game/art";
import { TIERS, type Tier } from "../../game/content/cosmetics";
import { useClock } from "../../screens/game/home/Ambient";
import { usePreferences } from "../../state/Preferences";
import { Icon } from "../ui";
import type { GameT } from "../../screens/game/home/bits";

const rank = (tier: Tier) => TIERS.indexOf(tier);
/** The companion that sits on the frame: the lotus's own pet wearing its accessory. */
const PET_ART: Partial<Record<Tier, string>> = { purple: "wear-purple-hat", blue: "pet-blue", golden: "wear-golden-crown" };
export const PET_NAMES: Partial<Record<Tier, string>> = { purple: "Mochi", blue: "Ripple", golden: "Golden Dewdrop" };
/** Words for screen readers: the perks shown with the avatar. Companion names stay as game content. */
export function perkLabel(tier: Tier, t: GameT) {
  if (tier === "pink") return "";
  const parts = [t(tier === "golden" ? "lotusPerkSparkleFrame" : "lotusPerkPurpleFrame"), ...(rank(tier) >= rank("blue") ? [t("lotusPerkRippleAura")] : []), PET_NAMES[tier]!];
  return t("lotusPerksWith", { parts: parts.join(t("lotusListSep")) });
}

function useReveal(reveal: boolean, step: number) {
  const { reducedMotion } = usePreferences(), k = useSharedValue(reveal ? 0 : 1);
  useEffect(() => {
    if (!reveal) { k.value = 1; return; }
    k.value = withDelay(400 + step * 420, withTiming(1, { duration: reducedMotion ? 250 : 420, easing: Easing.out(Easing.back(1.6)) }));
  }, [reveal, step, reducedMotion, k]);
  return useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: reducedMotion ? 1 : 0.6 + k.value * 0.4 }] }));
}
function Ripple({ size, color, delay }: { size: number; color: string; delay: number }) {
  const { reducedMotion } = usePreferences(), t = useClock(reducedMotion, 3200, delay);
  const st = useAnimatedStyle(() => ({ opacity: reducedMotion ? 0.35 : 0.5 * (1 - t.value), transform: [{ scale: reducedMotion ? 1.08 : 1 + t.value * 0.16 }] }));
  return <Animated.View style={[s.abs, { width: size, height: size, borderRadius: size, borderWidth: 2, borderColor: color }, st]} />;
}
function Layer({ style, children }: { style: ReturnType<typeof useReveal>; children: ReactNode }) {
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.centre, style]}>{children}</Animated.View>;
}
function Pet({ tier, size }: { tier: Tier; size: number }) {
  const art = PET_ART[tier]!, [w, h] = GAME_ART_SIZE[art] ?? [1, 1], box = size * 0.36;
  return <Image source={GAME_ART[art]} resizeMode="contain" accessible={false}
    style={{ position: "absolute", right: -box * 0.12, bottom: -box * 0.04, width: box, height: box * Math.min(1.2, h / w) }} />;
}

export function PerkLayers({ tier, size, reveal = false, children }: { tier: Tier; size: number; reveal?: boolean; children: ReactNode }) {
  const { theme } = usePreferences();
  const frame = useReveal(reveal, 0), aura = useReveal(reveal, 1), pet = useReveal(reveal, 2);
  const golden = tier === "golden", ring = golden ? theme.lotus.golden : theme.lotus.purple, inner = size * 0.86;
  return <View style={[s.centre, { width: size, height: size }]}>
    {rank(tier) >= rank("blue") && <Layer style={aura}>
      <Ripple size={inner * 1.08} color={theme.lotus.blue} delay={0} /><Ripple size={inner * 1.08} color={theme.lotus.blue} delay={1600} />
    </Layer>}
    <View style={[s.portrait, { width: inner, height: inner, borderRadius: inner, backgroundColor: theme.accentSoft }]}>{children}</View>
    {tier !== "pink" && <Layer style={frame}>
      <View style={{ width: inner, height: inner, borderRadius: inner, borderWidth: Math.max(3, size * 0.035), borderColor: ring }} />
      {golden && <Sparkles size={inner} color={theme.lotus.golden} />}
    </Layer>}
    {tier !== "pink" && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pet]}><Pet tier={tier} size={size} /></Animated.View>}
  </View>;
}
const SPARKS: [number, number, number][] = [[0.08, 0.14, 0.16], [0.86, 0.06, 0.13], [0.94, 0.52, 0.1], [0.02, 0.62, 0.11]];
function Sparkles({ size, color }: { size: number; color: string }) {
  return <View style={[s.abs, { width: size, height: size }]}>
    {SPARKS.map(([x, y, k]) => <View key={x} style={[s.abs, { left: x * size - size * k / 2, top: y * size - size * k / 2 }]}>
      <Icon name="sparkles" size={size * k} color={color} /></View>)}
  </View>;
}
const s = StyleSheet.create({
  abs: { position: "absolute" },
  centre: { alignItems: "center", justifyContent: "center" },
  portrait: { overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
});
