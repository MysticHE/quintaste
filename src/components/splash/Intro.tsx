/**
 * Opening screen. It mounts at the root, above sign-in restore and every provider, and starts as soon as the code
 * runs (after the device-level intro settings and the wordmark font, both local). The native splash is the plain
 * brand background, so the Mochi Chef drops in from above it: it lands flat, springs back up and bounces twice more
 * (./motion), its cheeks blush (./Face), with a boing (./sound) and a light tap on the first two landings, then the
 * wordmark rises in. The bounce always plays to the end. If the app is still loading, the mochi then hovers side
 * to side until the root layout calls markAppReady(), and the layer fades away. Tap anywhere to skip.
 * Reduced motion (system or the app's switch) shows the settled mochi without sound or haptics.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from "react-native-reanimated";
import { fontNames, themeFor } from "../../theme/tokens";
import { MochiFace } from "./Face";
import { FEET_ORIGIN, HOLD, LANDINGS, SETTLED, SWAY, bodyKeyframes, shadowKeyframes, shadowSwayKeyframes, swayKeyframes } from "./motion";
import { loadIntroSettings, type IntroSettings } from "./settings";
import { resolveLanguage, systemLanguage, translate, type Language } from "../../i18n";
import { playIntroSound, prepareIntroSound, releaseIntroSound } from "./sound";

const EXIT = 380;
/** Never cover the app longer than this, even if it never reports ready. */
const MAX_WAIT = 15000;

let ready = false;
const listeners = new Set<() => void>();
/** Called by the root layout once the app can show its first screen (or its sign-in error). */
export function markAppReady() {
  if (ready) return;
  ready = true;
  listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const isReady = () => ready;

type Brand = { background: string; quin: string; taste: string; shadow: string; blush: string };
/** The native splash's colours (the coral brand, light or dark with the phone), used before any preferences load. */
function useBrand(): Brand {
  const dark = useColorScheme() === "dark";
  return useMemo(() => {
    const t = themeFor("coral", dark), coral = t.swatches.coral;
    // Wordmark: "Quin" in the mochi's brown (warm cream on dark), "Taste" in coral.
    return { background: dark ? coral.dark[0] : coral.light[0], quin: dark ? coral.light[1] : t.mascot.ink, taste: dark ? coral.accentDark : coral.accent, shadow: t.shadow, blush: t.mascot.blush };
  }, [dark]);
}

/** The native splash frame (plain brand background), shown while the app loads where no native splash exists (web). */
export function SplashMark({ language = systemLanguage() }: { language?: Language }) {
  const { background } = useBrand();
  return <View accessible accessibilityLabel={translate(language, "common", "loadingApp")} style={[s.fill, { backgroundColor: background }]} />;
}

/** Mount once, at the root. */
export function SplashIntro() {
  const [done, setDone] = useState(false);
  const [settings, setSettings] = useState<IntroSettings | null>(null);
  const [fonts, fontError] = useFonts({ Nunito_800ExtraBold });
  const systemStill = useReducedMotion();
  useEffect(() => {
    let live = true;
    loadIntroSettings().then(value => {
      if (!live) return;
      if (value.sounds && !value.reduceMotion && !systemStill) prepareIntroSound();
      setSettings(value);
    });
    return () => { live = false; };
  }, [systemStill]);
  const go = !!settings && (fonts || !!fontError);
  useEffect(() => { if (go) void SplashScreen.hideAsync().catch(() => {}); }, [go]);
  if (done) return null;
  if (!go) return <View style={StyleSheet.absoluteFill}><SplashMark /></View>;
  return <Play still={systemStill || settings.reduceMotion} sounds={settings.sounds} language={resolveLanguage(settings.language)} onDone={() => setDone(true)} />;
}

function tap(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(style).catch(error => { if (__DEV__) console.warn("Intro haptic unavailable", error); });
}

/** Play keyframes once over `duration` ms and hold the last frame. */
function play(frames: CSSAnimationKeyframes, duration: number, delay = 0) {
  return { animationName: frames, animationDuration: duration, animationDelay: delay, animationTimingFunction: "linear", animationFillMode: "both" } as const;
}
/** An ease-in cycle, then the steady cycle forever. */
function loop(rampIn: CSSAnimationKeyframes, steady: CSSAnimationKeyframes) {
  return {
    animationName: [rampIn, steady], animationDuration: [SWAY, SWAY], animationDelay: [0, SWAY],
    animationIterationCount: [1, "infinite" as const], animationTimingFunction: "linear" as const, animationFillMode: "both" as const,
  };
}

function Shadow({ size, cx, base, brand, bounce, sway }: { size: number; cx: number; base: number; brand: Brand; bounce: object | null; sway: object | null }) {
  const w = size * 0.74, h = size * 0.13;
  return <Animated.View pointerEvents="none" style={[s.abs, { left: cx - w / 2, top: base - h / 2, width: w, height: h }, sway]}>
    <Animated.View style={[s.fill, bounce]}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="mochiShadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={brand.shadow} stopOpacity={0.32} />
            <Stop offset="1" stopColor={brand.shadow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="url(#mochiShadow)" />
      </Svg>
    </Animated.View>
  </Animated.View>;
}

const FADE_OUT = { to: { opacity: 0 } };
const TITLE_IN = { from: { opacity: 0, transform: [{ translateY: 14 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

function Play({ still, sounds, language, onDone }: { still: boolean; sounds: boolean; language: Language; onDone: () => void }) {
  const brand = useBrand(), appReady = useSyncExternalStore(subscribe, isReady, isReady);
  const { width: W, height: H } = useWindowDimensions();
  const size = Math.min(W * 0.46, H * 0.26, 220), cx = W / 2, cy = H * 0.43;
  // The art's feet sit at 91% of its height; the shadow, squash and hover all pivot there.
  const foot = size * 0.41, base = cy + foot, word = Math.min(44, W * 0.11), drop = cy + size * 1.2;
  const frames = useMemo(() => ({
    body: bodyKeyframes(size, drop, foot), ground: shadowKeyframes(size, drop),
    swayIn: swayKeyframes(size, true), sway: swayKeyframes(size, false),
    groundIn: shadowSwayKeyframes(size, true), groundSway: shadowSwayKeyframes(size, false),
    breath: { to: { transform: [{ translateY: -0.02 * foot }, { scaleX: 0.99 }, { scaleY: 1.02 }] } },
  }), [size, drop, foot]);
  const [bounced, setBounced] = useState(still), [leaving, setLeaving] = useState(false), left = useRef(false);
  // Once the hover starts it keeps going through the fade, so the mochi never snaps back to the middle.
  const [hovering, setHovering] = useState(false);

  const leave = (skipped: boolean) => {
    if (left.current) return;
    left.current = true;
    releaseIntroSound(skipped ? EXIT : 0);
    setLeaving(true);
    setTimeout(onDone, (still ? 250 : EXIT) + 40);
  };
  useEffect(() => {
    const settle = () => { setBounced(true); if (!isReady() && !still) setHovering(true); };
    const timers = [setTimeout(settle, still ? 600 : HOLD), setTimeout(() => leave(false), MAX_WAIT)];
    if (!still) {
      if (sounds) playIntroSound();
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Light), LANDINGS[0]));
      timers.push(setTimeout(() => tap(Haptics.ImpactFeedbackStyle.Soft), LANDINGS[1]));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The bounce always finishes; then leave as soon as the app is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (bounced && appReady) leave(false); }, [bounced, appReady]);

  const fade = leaving ? { animationName: FADE_OUT, animationDuration: still ? 250 : EXIT, animationTimingFunction: "ease-in", animationFillMode: "forwards" } as const : null;
  const breathe = still ? null : { animationName: frames.breath, animationDuration: 1300, animationDelay: SETTLED, animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate" } as const;
  const title = still ? null : { animationName: TITLE_IN, animationDuration: 420, animationDelay: LANDINGS[0] + 180, animationTimingFunction: "ease-out", animationFillMode: "both" } as const;
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: brand.background }, fade]}>
    <Pressable accessibilityRole="button" accessibilityLabel={translate(language, "common", "skipIntro")} onPress={() => leave(true)} style={StyleSheet.absoluteFill}>
      <Shadow size={size} cx={cx} base={base} brand={brand} bounce={still ? null : play(frames.ground, SETTLED)} sway={hovering ? loop(frames.groundIn, frames.groundSway) : null} />
      <Animated.View pointerEvents="none" style={[s.abs, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }, still ? null : play(frames.body, SETTLED)]}>
        <Animated.View style={[s.feet, hovering ? loop(frames.swayIn, frames.sway) : null]}>
          <Animated.View style={breathe}>
            <MochiFace size={size} still={still} blush={brand.blush} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" accessible accessibilityRole="header" accessibilityLabel="QuinTaste" style={[s.abs, s.word, { top: base + size * 0.12, width: W }, title]}>
        <Text style={[s.wordPart, { fontSize: word, color: brand.quin }]}>Quin</Text>
        <Text style={[s.wordPart, { fontSize: word, color: brand.taste }]}>Taste</Text>
      </Animated.View>
    </Pressable>
  </Animated.View>;
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
  feet: { transformOrigin: FEET_ORIGIN },
  fill: { flex: 1, width: "100%", height: "100%" },
  // The wordmark is two side-by-side pieces, one per colour.
  word: { left: 0, flexDirection: "row", justifyContent: "center" },
  wordPart: { fontFamily: fontNames.display, letterSpacing: 0.5 },
});
