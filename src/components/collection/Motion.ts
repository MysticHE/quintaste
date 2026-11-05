import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AppState, Platform, View } from "react-native";
import { useIsFocused } from "expo-router";
import { usePreferences } from "../../state/Preferences";

/** Decorative motion follows screen focus, app visibility, and the web viewport. */
export function useCollectionMotion(enabled: boolean) {
  const { reducedMotion } = usePreferences(), focused = useIsFocused();
  const host = useRef<ComponentRef<typeof View>>(null), [visible, setVisible] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== "background" && AppState.currentState !== "inactive");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined") return;
    const element = host.current as unknown as Element | null;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { host, on: enabled && !reducedMotion && focused && foreground && visible };
}

export function lightEnvelope(time: number, start: number, peak: number, end: number) {
  "worklet";
  const t = time < peak ? (time - start) / (peak - start) : (end - time) / (end - peak);
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}
