/**
 * Opening screen, played once per cold start over the first app screen. The native splash is the plain brand
 * background, so the Mochi Chef drops in from above it: it falls with a slight stretch, lands with a squash,
 * bounces twice with less height each time and settles over its contact shadow; then the wordmark rises in and the
 * layer fades away, with a matching sound (./sound). Tap anywhere to skip. Reduced motion shows the settled frame
 * and a short fade, without sound.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { playIntroSound, prepareIntroSound, releaseIntroSound } from "./sound";

const MOCHI = require("../../../assets/chef.png");
const HOLD = 2200, EXIT = 380;
const fall = Easing.in(Easing.quad), rise = Easing.out(Easing.quad);

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
  const go = useSyncExternalStore(subscribe, isStarted, isStarted);
  const [done, setDone] = useState(played);
  useEffect(() => { if (!played) prepareIntroSound(); }, []);
  if (done) return null;
  return go ? <Play onDone={() => setDone(true)} /> : <View style={StyleSheet.absoluteFill}><SplashMark /></View>;
}

/**
 * Drop and bounce. `y` is the lift above the resting spot in px; `squash` is +1 for a full squash, −1 for a stretch.
 * Each impact squashes as the bounce starts; bounce heights fall to about a third each time, as a soft toy's would.
 */
function useBounce(still: boolean, size: number, drop: number) {
  const y = useSharedValue(still ? 0 : drop), squash = useSharedValue(0), breathe = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const h1 = size * 0.42, h2 = size * 0.13, t1 = 230, t2 = 130;
    y.value = withDelay(60, withSequence(
      withTiming(0, { duration: 460, easing: fall }),
      withTiming(h1, { duration: t1, easing: rise }), withTiming(0, { duration: t1, easing: fall }),
      withTiming(h2, { duration: t2, easing: rise }), withTiming(0, { duration: t2, easing: fall }),
    ));
    const hit = (k: number, back: number) => [withTiming(k, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: back, easing: Easing.out(Easing.back(2)) })];
    squash.value = withDelay(60, withSequence(
      withTiming(-0.1, { duration: 460, easing: fall }), ...hit(0.24, 170),
      withTiming(-0.04, { duration: t1 + t1 - 240 }), ...hit(0.11, 120),
      withTiming(0, { duration: 2 * t2 - 190 }), ...hit(0.05, 110),
    ));
    breathe.value = withDelay(1500, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => { cancelAnimation(y); cancelAnimation(squash); cancelAnimation(breathe); };
  }, [still, size, drop, y, squash, breathe]);
  return { y, squash, breathe };
}

function Shadow({ size, cx, base, y }: { size: number; cx: number; base: number; y: SharedValue<number> }) {
  const { shadow } = useBrand(), w = size * 0.74, h = size * 0.13;
  // Smaller and fainter the higher the mochi is; full size on contact.
  const st = useAnimatedStyle(() => {
    const near = 1 - Math.min(1, Math.max(0, y.value) / (size * 1.6));
    return { opacity: 0.25 + 0.75 * near, transform: [{ scaleX: 0.45 + 0.55 * near }, { scaleY: 0.6 + 0.4 * near }] };
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
  const { reducedMotion: still } = usePreferences(), { background, ink } = useBrand();
  const { width: W, height: H } = useWindowDimensions();
  const size = Math.min(W * 0.46, H * 0.26, 220), cx = W / 2, cy = H * 0.43;
  // The art's feet sit at 91% of its height; the shadow and squash pivot sit there.
  const foot = size * 0.41, base = cy + foot, word = Math.min(44, W * 0.11);
  const { y, squash, breathe } = useBounce(still, size, cy + size * 1.2);
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
    if (!still) playIntroSound();
    if (!still) title.value = withDelay(640, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => leave(false), still ? 600 : HOLD);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layer = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const mochi = useAnimatedStyle(() => {
    const k = squash.value, sy = 1 - 0.9 * k + breathe.value * 0.02, sx = 1 + 0.75 * k - breathe.value * 0.01;
    // Scale about the feet, not the centre, so a squash flattens onto the ground.
    return { transform: [{ translateY: -y.value + foot * (1 - sy) - exit.value * 10 }, { scaleX: sx }, { scaleY: sy }] };
  });
  const wordmark = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: (1 - title.value) * 14 }] }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: background }, layer]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Skip QuinTaste intro" onPress={() => leave(true)} style={StyleSheet.absoluteFill}>
      <Shadow size={size} cx={cx} base={base} y={y} />
      <Animated.View pointerEvents="none" style={[s.abs, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }, mochi]}>
        <Image source={MOCHI} style={s.fill} resizeMode="contain" />
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
