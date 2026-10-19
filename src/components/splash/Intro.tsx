/**
 * Opening screen, played once per cold start over the first app screen. The native splash is the plain brand
 * background, so the Mochi Chef drops in from above it: it lands flat, springs back up and bounces twice more
 * (./motion), its cheeks blushing once it settles (./Face), with a boing (./sound) and a light tap on the first two landings. Then
 * the wordmark rises in and the layer fades away. Tap anywhere to skip. Reduced motion shows the settled frame and
 * a short fade, without sound or haptics; the Sounds switch in Accessibility mutes the boing.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, { type CSSAnimationKeyframes } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { MochiFace } from "./Face";
import { HOLD, LANDINGS, SETTLED, bodyKeyframes, shadowKeyframes } from "./motion";
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

function Shadow({ size, cx, base, frames }: { size: number; cx: number; base: number; frames?: CSSAnimationKeyframes }) {
  const { shadow } = useBrand(), w = size * 0.74, h = size * 0.13;
  const motion = frames ? { animationName: frames, animationDuration: SETTLED, animationTimingFunction: "linear", animationFillMode: "both" } as const : null;
  return <Animated.View pointerEvents="none" style={[s.abs, { left: cx - w / 2, top: base - h / 2, width: w, height: h }, motion]}>
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

const FADE_OUT = { to: { opacity: 0 } };
const TITLE_IN = { from: { opacity: 0, transform: [{ translateY: 14 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

function Play({ onDone }: { onDone: () => void }) {
  const { reducedMotion: still, draft } = usePreferences(), { background, ink } = useBrand();
  const { width: W, height: H } = useWindowDimensions();
  const size = Math.min(W * 0.46, H * 0.26, 220), cx = W / 2, cy = H * 0.43;
  // The art's feet sit at 91% of its height; the shadow and squash pivot sit there.
  const foot = size * 0.41, base = cy + foot, word = Math.min(44, W * 0.11), drop = cy + size * 1.2;
  const body = useMemo(() => bodyKeyframes(size, drop, foot), [size, drop, foot]);
  const ground = useMemo(() => shadowKeyframes(size, drop), [size, drop]);
  // A gentle breath once settled, scaled about the feet like the squash.
  const breath = useMemo(() => ({ to: { transform: [{ translateY: -0.02 * foot }, { scaleX: 0.99 }, { scaleY: 1.02 }] } }), [foot]);
  const [leaving, setLeaving] = useState(false), left = useRef(false);

  const leave = (skipped: boolean) => {
    if (left.current) return;
    left.current = true;
    releaseIntroSound(skipped ? EXIT : 0);
    setLeaving(true);
    setTimeout(onDone, (still ? 250 : EXIT) + 40);
  };
  useEffect(() => {
    played = true;
    const timers = [setTimeout(() => leave(false), still ? 600 : HOLD)];
    if (!still) {
      if (draft.sounds) playIntroSound();
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Light), LANDINGS[0]));
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Soft), LANDINGS[1]));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fade = leaving ? { animationName: FADE_OUT, animationDuration: still ? 250 : EXIT, animationTimingFunction: "ease-in", animationFillMode: "forwards" } as const : null;
  const fall = still ? null : { animationName: body, animationDuration: SETTLED, animationTimingFunction: "linear", animationFillMode: "both" } as const;
  const breathe = still ? null : { animationName: breath, animationDuration: 1300, animationDelay: SETTLED, animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate" } as const;
  const title = still ? null : { animationName: TITLE_IN, animationDuration: 420, animationDelay: LANDINGS[0] + 180, animationTimingFunction: "ease-out", animationFillMode: "both" } as const;
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: background }, fade]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Skip QuinTaste intro" onPress={() => leave(true)} style={StyleSheet.absoluteFill}>
      <Shadow size={size} cx={cx} base={base} frames={still ? undefined : ground} />
      <Animated.View pointerEvents="none" style={[s.abs, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }, fall]}>
        <Animated.View style={breathe}>
          <MochiFace size={size} still={still} />
        </Animated.View>
      </Animated.View>
      <Animated.Text pointerEvents="none" style={[s.abs, s.word, { top: base + size * 0.12, width: W, fontSize: word, color: ink }, title]}>QuinTaste</Animated.Text>
    </Pressable>
  </Animated.View>;
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
  fill: { flex: 1, width: "100%", height: "100%" },
  word: { left: 0, textAlign: "center", fontFamily: fontNames.display, letterSpacing: 0.5 },
});
