/**
 * The cook and companion on the Game tab (docs/game/LOBBY_MOTION_PLAN.md): Lian stirs in a steady rhythm with steam
 * rising beside the wok, and every few seconds tosses the wok so vegetables arc out and land back in the pan; the
 * companion breathes, bounces as the toss lands and pops a heart. Tapping either one makes it react. The Mochi Chef's
 * closed happy eyes never change: only whole images move. Reduced motion keeps both still.
 */
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { GAME_ART } from "../../game/art";
import { usePreferences } from "../../state/Preferences";
import { Steam, useClock } from "./home/Ambient";
import { artRatio } from "./home/Scene";
import { HeartPop, popOnce } from "./home/SceneFx";
import { useT } from "../../i18n";

const TOSS_EVERY = 5200, TOSS_FOR = 900;
const BITS: { art: string; side: number; reach: number; lift: number }[] = [
  { art: "broccoli", side: -1, reach: 0.42, lift: 0.36 }, { art: "carrot", side: 1, reach: 0.38, lift: 0.42 },
  { art: "corn", side: -1, reach: 0.24, lift: 0.5 }, { art: "tomato", side: 1, reach: 0.5, lift: 0.3 },
];

type Props = { width: number; height: number; petKey: string; onCook(): void; onPet(): void };

export function LobbyCast({ width, height, petKey, onCook, onPet }: Props) {
  const { reducedMotion } = usePreferences(), say = useT("game");
  const stir = useClock(reducedMotion, 520, 0, true), toss = useSharedValue(0), heart = useSharedValue(0), poke = useSharedValue(0), petPoke = useSharedValue(0);
  // A tap's heart is its own value, so it never cancels the heart that follows each toss.
  const tapHeart = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) { cancelAnimation(toss); cancelAnimation(heart); toss.value = 0; heart.value = 0; return; }
    const cycle = (dur: number) => withRepeat(withSequence(withDelay(TOSS_EVERY - dur, withTiming(1, { duration: dur, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })), -1);
    toss.value = cycle(TOSS_FOR);
    heart.value = withDelay(TOSS_FOR - 150, cycle(900));
    return () => { cancelAnimation(toss); cancelAnimation(heart); };
  }, [reducedMotion, toss, heart]);

  // Layout in pixels inside the cast box: the cook fills half the width, the companion stands at its right.
  const cookR = artRatio("avatar-lian"), petR = artRatio(petKey);
  const cookW = Math.min(width * 0.5, height / cookR), cookH = cookW * cookR;
  const cookLeft = width * 0.16 + (width * 0.5 - cookW) / 2, cookTop = height - cookH;
  const petW = Math.min(width * 0.26, (height * 0.52) / petR), petH = petW * petR;
  const petLeft = width * 0.58 + (width * 0.26 - petW) / 2, petTop = height - petH;
  // The wok's rim in the cook art (avatar-lian): 52% across, 78% down.
  const wokX = cookLeft + cookW * 0.52, wokY = cookTop + cookH * 0.78, u = cookW / 70;

  const cook = useAnimatedStyle(() => {
    const jump = Math.sin(toss.value * Math.PI), k = poke.value, wiggle = k > 0 && k < 1 ? Math.sin(k * Math.PI * 4) * (1 - k) * 6 : 0;
    return { transform: [{ translateY: -Math.sin(stir.value * Math.PI) * 4 - jump * 16 }, { rotate: (stir.value - 0.5) * 5 + wiggle + "deg" }] };
  });
  const pet = useAnimatedStyle(() => {
    const t = toss.value, land = t > 0.78 ? Math.sin(((t - 0.78) / 0.22) * Math.PI) : 0, k = petPoke.value, tap = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
    const breath = Math.sin(stir.value * Math.PI) * 0.02;
    return { transform: [{ translateY: -Math.sin(Math.min(1, t * 1.3) * Math.PI) * petH * 0.1 - tap * petH * 0.18 }, { scaleY: 1 + breath - land * 0.1 }, { scaleX: 1 - breath / 2 + land * 0.08 }] };
  });

  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[s.abs, { left: cookLeft, top: cookTop, width: cookW, height: cookH, transformOrigin: "50% 100%" }, cook]}>
      <Pressable accessibilityRole="button" accessibilityLabel={say("lianSayHello")} style={s.fill}
        onPress={() => { if (!reducedMotion) { poke.value = 0; poke.value = withTiming(1, { duration: 620 }); } onCook(); }}>
        <Image source={GAME_ART["avatar-lian"]} style={s.fill} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Pressable>
    </Animated.View>
    {!reducedMotion && <View pointerEvents="none" style={[s.abs, { left: wokX - 50 * u, top: wokY - 40 * u, width: 100 * u, height: 40 * u }]}>
      <Steam x={22} y={40} u={u} /><Steam x={78} y={40} u={u} />
    </View>}
    {!reducedMotion && BITS.map((b, i) => <Bit key={b.art} bit={b} i={i} toss={toss} x={wokX} y={wokY} w={cookW} />)}
    <Animated.View style={[s.abs, { left: petLeft, top: petTop, width: petW, height: petH, transformOrigin: "50% 100%" }, pet]}>
      <Pressable accessibilityRole="button" accessibilityLabel={say("companionSayHello")} style={s.fill}
        onPress={() => { if (!reducedMotion) { petPoke.value = 0; petPoke.value = withTiming(1, { duration: 520 }); popOnce(tapHeart); } onPet(); }}>
        <Image source={GAME_ART[petKey]} style={s.fill} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Pressable>
    </Animated.View>
    <HeartPop left={petLeft + petW * 0.72} top={petTop + petH * 0.05} pop={heart} />
    <HeartPop left={petLeft + petW * 0.3} top={petTop + petH * 0.05} pop={tapHeart} />
  </View>;
}

/** One vegetable thrown by the wok toss: out, up and back into the pan, spinning. */
function Bit({ bit, i, toss, x, y, w }: { bit: (typeof BITS)[number]; i: number; toss: SharedValue<number>; x: number; y: number; w: number }) {
  const d = w * 0.13, h = d * artRatio(bit.art);
  const st = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, toss.value * 1.1 - i * 0.03)), arc = Math.sin(k * Math.PI);
    return {
      opacity: k > 0.02 && k < 0.98 ? 1 : 0,
      transform: [{ translateX: bit.side * arc * w * bit.reach }, { translateY: -arc * w * bit.lift }, { rotate: k * 360 * bit.side + "deg" }, { scale: interpolate(arc, [0, 1], [0.6, 1]) }],
    };
  });
  return <Animated.View pointerEvents="none" style={[s.abs, { left: x - d / 2, top: y - h / 2, width: d, height: h }, st]}>
    <Image source={GAME_ART[bit.art]} style={s.fill} resizeMode="contain" />
  </Animated.View>;
}

const s = StyleSheet.create({ abs: { position: "absolute" }, fill: { width: "100%", height: "100%" } });
