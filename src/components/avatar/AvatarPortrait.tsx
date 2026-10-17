import { useEffect, useState } from "react";
import { Animated, AppState, Easing, Image, Platform, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { useIsFocused } from "expo-router/react-navigation";
import { usePreferences } from "../../state/Preferences";
import type { Avatar, AvatarState } from "../../types/avatar";
const samples: Record<AvatarState, ImageSourcePropType> = {
  base: require("../../../assets/avatar/sample-base.webp"), blink: require("../../../assets/avatar/sample-blink.webp"),
  mid: require("../../../assets/avatar/sample-mid.webp"), open: require("../../../assets/avatar/sample-open.webp"),
};
export function AvatarPortrait({ avatar, size = 280, animate = false, speaking = false, label = "Your avatar" }: {
  avatar: Avatar | null; size?: number; animate?: boolean; speaking?: boolean; label?: string;
}) {
  const { reducedMotion } = usePreferences(), focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== "background"), [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState<AvatarState>("base"), [failed, setFailed] = useState<string[]>([]);
  const [breathe] = useState(() => new Animated.Value(0));
  const enabled = !!avatar && animate && !reducedMotion && focused && foreground;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    const visibility = () => setForeground(!document.hidden);
    if (Platform.OS === "web") { visibility(); document.addEventListener("visibilitychange", visibility); }
    return () => { subscription.remove(); if (Platform.OS === "web") document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    breathe.setValue(0);
    if (!enabled) return;
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(breathe, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
    ]));
    motion.start(); return () => { motion.stop(); breathe.setValue(0); };
  }, [breathe, enabled]);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>, closed = false;
    const tick = () => { closed = !closed; setBlink(closed); timer = setTimeout(tick, closed ? 130 : 2600 + Math.random() * 3000); };
    timer = setTimeout(tick, 2600); return () => clearTimeout(timer);
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !speaking) return;
    const sequence: AvatarState[] = ["mid", "open", "mid", "base", "mid", "open", "base"];
    let index = 0;
    const timer = setInterval(() => setMouth(sequence[index++ % sequence.length]), 170);
    return () => clearInterval(timer);
  }, [enabled, speaking]);
  const sources: Partial<Record<AvatarState, ImageSourcePropType>> = avatar?.sample ? samples
    : avatar ? Object.fromEntries(Object.entries(avatar.frames).map(([state, uri]) => [state, { uri }])) : {};
  const desired = enabled && speaking ? mouth : enabled && blink ? "blink" : "base";
  const sourceKey = (state: AvatarState) => avatar?.id + ":" + state;
  const state = sources[desired] && !failed.includes(sourceKey(desired)) ? desired : "base";
  const unavailable = !avatar || failed.includes(sourceKey("base"));
  return <View accessibilityRole={label ? "image" : undefined} accessibilityLabel={label || undefined} accessible={!!label}
    aria-hidden={!label} style={{ width: size, height: size, overflow: "hidden" }} testID="avatar-portrait">
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }]}>
      {unavailable ? <Image source={require("../../../assets/chef.png")} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: size, height: size }]} accessible={false} />
        : Object.entries(sources).map(([key, source]) => <Image key={sourceKey(key as AvatarState)} source={source} resizeMode="contain" accessible={false}
          testID={"avatar-frame-" + key} onError={() => setFailed(current => [...current, sourceKey(key as AvatarState)])}
          style={[StyleSheet.absoluteFill, { width: size, height: size, opacity: key === state ? 1 : 0 }]} />)}
    </Animated.View>
  </View>;
}
