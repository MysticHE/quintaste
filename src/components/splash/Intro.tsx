/**
 * Opening screen, played once per cold start over the first app screen. The native splash is the plain brand
 * background, so the Mochi Chef drops in from above it: it lands flat, springs back up and bounces twice more
 * (./motion), its cheeks blushing once it settles (./Face), with a boing (./sound) and a light tap on the first two landings. Then
 * the wordmark rises in and the layer fades away. Tap anywhere to skip. Reduced motion shows the settled frame and
 * a short fade, without sound or haptics; the Sounds switch in Accessibility mutes the boing.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { MochiFace } from "./Face";
import { HOLD, LANDINGS, useBlush, useBounce } from "./motion";
import { playIntroSound, prepareIntroSound, releaseIntroSound } from "./sound";

const EXIT = 380;

let played = false;
let started = false;
const listeners = new Set<() => void>();
/** Fired by the root layout when it hides the native splash: the intro plays from that moment. */
export function startSplashIntro() {
  if (started) return;
  started = true;
  listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const isStarted = () => started;

/** The native splash's colours: the coral brand background, whatever palette the member picked. */
function useBrand() {
  const { theme } = usePreferences(), coral = theme.swatches.coral;
  return { background: theme.dark ? coral.dark[0] : coral.light[0], ink: theme.dark ? coral.accentDark : coral.accent, shadow: theme.shadow };
}

/** The native splash frame (plain brand background), shown while the app loads where no native splash exists (web). */
export function SplashMark() {
  const { background } = useBrand();
  return <View accessible accessibilityLabel="Loading QuinTaste" style={[s.fill, { backgroundColor: background }]} />;
}

/** Mount once above the navigation tree, so the owner remount at start-up cannot cut it short. */
export function SplashIntro() {
  const { draft } = usePreferences();
  const go = useSyncExternalStore(subscribe, isStarted, isStarted);
  const [done, setDone] = useState(played);
  useEffect(() => { if (!played && draft.sounds) prepareIntroSound(); }, [draft.sounds]);
  if (done) return null;
  return go ? <Play onDone={() => setDone(true)} /> : <View style={StyleSheet.absoluteFill}><SplashMark /></View>;
}

function tap(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(style).catch(error => { if (__DEV__) console.warn("Intro haptic unavailable", error); });
}

function Shadow({ size, cx, base, y, squash }: { size: number; cx: number; base: number; y: SharedValue<number>; squash: SharedValue<number> }) {
  const { shadow } = useBrand(), w = size * 0.74, h = size * 0.13;
  // Smaller and fainter the higher the mochi is; full size on contact, wider when it squashes flat.
  const st = useAnimatedStyle(() => {
    const near = 1 - Math.min(1, Math.max(0, y.value) / (size * 1.6)), flat = Math.max(0, squash.value);
    return { opacity: 0.25 + 0.75 * near, transform: [{ scaleX: (0.45 + 0.55 * near) * (1 + 0.6 * flat) }, { scaleY: 0.6 + 0.4 * near }] };
  });
  return <Animated.View pointerEvents="none" style={[s.abs, { left: cx - w / 2, top: base - h / 2, width: w, height: h }, st]}>
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="mochiShadow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={shadow} stopOpacity={0.32} />
          <Stop offset="1" stopColor={shadow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="url(#mochiShadow)" />
    </Svg>
  </Animated.View>;
}

function Play({ onDone }: { onDone: () => void }) {
  const { reducedMotion: still, draft } = usePreferences(), { background, ink } = useBrand();
  const { width: W, height: H } = useWindowDimensions();
  const size = Math.min(W * 0.46, H * 0.26, 220), cx = W / 2, cy = H * 0.43;
  // The art's feet sit at 91% of its height; the shadow and squash pivot sit there.
  const foot = size * 0.41, base = cy + foot, word = Math.min(44, W * 0.11);
  const { y, squash, breathe } = useBounce(still, size, cy + size * 1.2);
  const blush = useBlush(still);
  const exit = useSharedValue(0), title = useSharedValue(still ? 1 : 0), leaving = useRef(false);

  const leave = (skipped: boolean) => {
    if (leaving.current) return;
    leaving.current = true;
    releaseIntroSound(skipped ? EXIT : 0);
    exit.value = withTiming(1, { duration: still ? 250 : EXIT, easing: Easing.in(Easing.cubic) });
    setTimeout(onDone, (still ? 250 : EXIT) + 40);
  };
  useEffect(() => {
    played = true;
    const timers = [setTimeout(() => leave(false), still ? 600 : HOLD)];
    if (!still) {
      if (draft.sounds) playIntroSound();
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Light), LANDINGS[0]));
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Soft), LANDINGS[1]));
      title.value = withDelay(LANDINGS[0] + 180, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layer = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const mochi = useAnimatedStyle(() => {
    const k = squash.value, sy = 1 - 0.9 * k + breathe.value * 0.02, sx = 1 + 0.8 * k - breathe.value * 0.01;
    // Scale about the feet, not the centre, so a squash flattens onto the ground.
    return { transform: [{ translateY: -y.value + foot * (1 - sy) - exit.value * 10 }, { scaleX: sx }, { scaleY: sy }] };
  });
  const wordmark = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: (1 - title.value) * 14 }] }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: background }, layer]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Skip QuinTaste intro" onPress={() => leave(true)} style={StyleSheet.absoluteFill}>
      <Shadow size={size} cx={cx} base={base} y={y} squash={squash} />
      <Animated.View pointerEvents="none" style={[s.abs, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }, mochi]}>
        <MochiFace size={size} blush={blush} />
      </Animated.View>
      <Animated.Text pointerEvents="none" style={[s.abs, s.word, { top: base + size * 0.12, width: W, fontSize: word, color: ink }, wordmark]}>QuinTaste</Animated.Text>
    </Pressable>
  </Animated.View>;
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
  fill: { flex: 1, width: "100%", height: "100%" },
  word: { left: 0, textAlign: "center", fontFamily: fontNames.display, letterSpacing: 0.5 },
});
