import { BlurTargetView } from "expo-blur";
import { useIsFocused } from "expo-router";
import Animated from "react-native-reanimated";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type PropsWithChildren, type RefObject } from "react";
import { AccessibilityInfo, Platform, type ViewInstance } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import { useHideOnScroll, useScreenReaderOn } from "../../hooks/useHideOnScroll";

type GlassState = {
  target: RefObject<ViewInstance | null> | undefined;
  height: number;
  setHeight: (height: number) => void;
  register: (target: RefObject<ViewInstance | null>) => () => void;
  reduceTransparency: boolean;
  /** 0 = dock shown, 1 = slid below the screen. */
  slide: SharedValue<number>;
  setHidden: (hidden: boolean) => void;
};
const Context = createContext<GlassState | null>(null);

export function GlassNavigationProvider({ children }: PropsWithChildren) {
  const [target, setTarget] = useState<RefObject<ViewInstance | null>>(), [height, setHeight] = useState(0);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const { reducedMotion } = usePreferences(), slide = useSharedValue(0), screenReader = useScreenReaderOn();
  const hidden = useRef(false), motion = useRef({ reduced: reducedMotion, screenReader });
  useEffect(() => { motion.current.reduced = reducedMotion; }, [reducedMotion]);
  const setHidden = useCallback((next: boolean) => {
    // Screen reader users keep the dock in place: a moving target is hard to find by swipe.
    if ((next && motion.current.screenReader) || hidden.current === next) return;
    hidden.current = next;
    slide.set(withTiming(next ? 1 : 0, { duration: motion.current.reduced ? 0 : 220 }));
  }, [slide]);
  const register = useCallback((next: RefObject<ViewInstance | null>) => {
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
  useEffect(() => { motion.current.screenReader = screenReader; if (screenReader) setHidden(false); }, [screenReader, setHidden]);
  return <Context.Provider value={{ target, height, setHeight, register, reduceTransparency, slide, setHidden }}>{children}</Context.Provider>;
}

export function TabBackdrop({ children }: PropsWithChildren) {
  const state = useContext(Context), focused = useIsFocused(), target = useRef<ViewInstance | null>(null);
  const register = state?.register;
  useEffect(() => { if (focused && register) return register(target); }, [focused, register]);
  return <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>;
}

export function useGlassNavigation() { return useContext(Context); }

/**
 * Scroll handlers for a tab screen: scrolling down hides the dock, scrolling back up (or reaching the top) shows it
 * (useHideOnScroll). It also comes back whenever the screen regains focus.
 */
export function useDockScroll(enabled: boolean): Partial<ReturnType<typeof useHideOnScroll>> {
  const setHidden = useContext(Context)?.setHidden, focused = useIsFocused(), handlers = useHideOnScroll(enabled ? setHidden : undefined);
  useEffect(() => { if (enabled && focused) setHidden?.(false); }, [enabled, focused, setHidden]);
  return enabled ? handlers : {};
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
