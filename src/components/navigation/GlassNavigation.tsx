import { BlurTargetView } from "expo-blur";
import { useIsFocused } from "expo-router";
import Animated from "react-native-reanimated";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type PropsWithChildren, type RefObject } from "react";
import { AccessibilityInfo, Platform, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";

type GlassState = {
  target: RefObject<View | null> | undefined;
  height: number;
  setHeight: (height: number) => void;
  register: (target: RefObject<View | null>) => () => void;
  reduceTransparency: boolean;
  /** 0 = dock shown, 1 = slid below the screen. */
  slide: SharedValue<number>;
  setHidden: (hidden: boolean) => void;
};
const Context = createContext<GlassState | null>(null);
const SCROLL_STEP = 24;

export function GlassNavigationProvider({ children }: PropsWithChildren) {
  const [target, setTarget] = useState<RefObject<View | null>>(), [height, setHeight] = useState(0);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const { reducedMotion } = usePreferences(), slide = useSharedValue(0);
  const hidden = useRef(false), motion = useRef({ reduced: reducedMotion, screenReader: false });
  useEffect(() => { motion.current.reduced = reducedMotion; }, [reducedMotion]);
  const setHidden = useCallback((next: boolean) => {
    // Screen reader users keep the dock in place: a moving target is hard to find by swipe.
    if ((next && motion.current.screenReader) || hidden.current === next) return;
    hidden.current = next;
    slide.set(withTiming(next ? 1 : 0, { duration: motion.current.reduced ? 0 : 220 }));
  }, [slide]);
  const register = useCallback((next: RefObject<View | null>) => {
    setTarget(next);
    return () => setTarget(current => current === next ? undefined : current);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (alive) setReduceTransparency(value); })
      .catch(() => { if (alive) setReduceTransparency(true); });
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    // React Native Web always answers "enabled", which would pin the dock for everyone in a browser.
    if (Platform.OS === "web") return;
    let alive = true;
    const apply = (on: boolean) => { if (!alive) return; motion.current.screenReader = on; if (on) setHidden(false); };
    void AccessibilityInfo.isScreenReaderEnabled().then(apply).catch(() => apply(false));
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", apply);
    return () => { alive = false; subscription.remove(); };
  }, [setHidden]);
  return <Context.Provider value={{ target, height, setHeight, register, reduceTransparency, slide, setHidden }}>{children}</Context.Provider>;
}

export function TabBackdrop({ children }: PropsWithChildren) {
  const state = useContext(Context), focused = useIsFocused(), target = useRef<View | null>(null);
  const register = state?.register;
  useEffect(() => { if (focused && register) return register(target); }, [focused, register]);
  return <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>;
}

export function useGlassNavigation() { return useContext(Context); }

/**
 * Scroll handlers for a tab screen: scrolling down hides the dock, scrolling back up (or reaching the top) shows it.
 * It also comes back whenever the screen regains focus or its content fits without scrolling, so it can never be
 * left hidden with no scroll to bring it back.
 */
export function useDockScroll(enabled: boolean) {
  const setHidden = useContext(Context)?.setHidden, track = useRef({ y: 0, anchor: 0, content: 0, frame: 0 }), focused = useIsFocused();
  useEffect(() => { if (enabled && focused) setHidden?.(false); }, [enabled, focused, setHidden]);
  const fits = useCallback(() => {
    const t = track.current;
    if (t.frame > 0 && t.content <= t.frame + SCROLL_STEP) setHidden?.(false);
  }, [setHidden]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!setHidden) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent, t = track.current;
    // Clamped so the bounce past either end reads as no movement.
    const y = Math.max(0, Math.min(contentOffset.y, contentSize.height - layoutMeasurement.height));
    if ((y - t.y) * (t.y - t.anchor) < 0) t.anchor = t.y;
    t.y = y;
    if (y < SCROLL_STEP || t.anchor - y > SCROLL_STEP) setHidden(false);
    else if (y - t.anchor > SCROLL_STEP) setHidden(true);
  }, [setHidden]);
  const onContentSizeChange = useCallback((_width: number, height: number) => { track.current.content = height; fits(); }, [fits]);
  const onLayout = useCallback((event: LayoutChangeEvent) => { track.current.frame = event.nativeEvent.layout.height; fits(); }, [fits]);
  return enabled ? { onScroll, onContentSizeChange, onLayout } : {};
}

/** Moves a view down with the dock, so things pinned above it follow it off screen. */
export function useDockSlideStyle() {
  const state = useContext(Context), fallback = useSharedValue(0), slide = state?.slide ?? fallback, height = state?.height ?? 0;
  return useAnimatedStyle(() => ({ transform: [{ translateY: slide.get() * height }] }), [slide, height]);
}
/** A view pinned above the dock that slides with it; used only on screens that have the dock. */
export function DockFollow({ style, ...props }: ComponentProps<typeof Animated.View>) {
  const slide = useDockSlideStyle();
  return <Animated.View {...props} style={[style, slide]} />;
}
