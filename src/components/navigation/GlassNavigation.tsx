import { BlurTargetView } from "expo-blur";
import { useIsFocused } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren, type RefObject } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";

type GlassState = {
  target: RefObject<View | null> | undefined;
  height: number;
  setHeight: (height: number) => void;
  register: (target: RefObject<View | null>) => () => void;
  reduceTransparency: boolean;
};
const Context = createContext<GlassState | null>(null);

export function GlassNavigationProvider({ children }: PropsWithChildren) {
  const [target, setTarget] = useState<RefObject<View | null>>(), [height, setHeight] = useState(0);
  const [reduceTransparency, setReduceTransparency] = useState(false);
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
  return <Context.Provider value={{ target, height, setHeight, register, reduceTransparency }}>{children}</Context.Provider>;
}

export function TabBackdrop({ children }: PropsWithChildren) {
  const state = useContext(Context), focused = useIsFocused(), target = useRef<View | null>(null);
  const register = state?.register;
  useEffect(() => { if (focused && register) return register(target); }, [focused, register]);
  return <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>;
}

export function useGlassNavigation() { return useContext(Context); }
