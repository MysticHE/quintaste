import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import type { CollectionArt } from "../../config/collection-art";
import { hashOf } from "./Fx";

/** One sweep: the light crosses the item in this time, tilted by this angle. */
const SWEEP_MS = 1800, ANGLE = 22, RAD = (ANGLE * Math.PI) / 180;
/** Nested windows from wide and faint to narrow and strong, so the light's edges fade instead of cutting. */
const LAYERS = [{ width: 0.62, opacity: 0.3 }, { width: 0.4, opacity: 0.42 }, { width: 0.2, opacity: 0.6 }];

/**
 * Light passing over a Collection item in its own colours (owner, 1 Nov 2026: no white reflection; the shine must match the
 * design): a tilted window slides across the item and shows, inside it, the item lit up (`art.lit`, made by
 * scripts/import-collection-art.py), so gold flares brighter gold and petals glow deeper pink. It sweeps once each time
 * `pulse` changes to a new non-zero value, or over and over with a rest between when `loop` is set. A loop runs only while
 * its screen is in view and starts at the item's own moment, so items on one screen do not flash together; a single
 * sweep's lit layers exist only while it plays. Nothing is drawn with Reduce motion on.
 */
export function Sheen({ art, size, pulse = 0, loop = false }: { art: CollectionArt; size: number; pulse?: number; loop?: boolean }) {
  const { reducedMotion } = usePreferences(), focused = useIsFocused(), progress = useSharedValue(0), [active, setActive] = useState(false);
  const looping = loop && focused && !reducedMotion, phase = hashOf(art.tone, 1701);
  // A new pulse mounts the layers for its sweep (state adjusted during render, so they exist when the sweep starts).
  const [lastPulse, setLastPulse] = useState(pulse);
  if (pulse !== lastPulse) { setLastPulse(pulse); if (pulse && !loop && !reducedMotion) setActive(true); }
  useEffect(() => {
    if (!looping) return;
    progress.set(0);
    progress.set(withDelay(phase, withRepeat(withDelay(4500, withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) })), -1, false)));
    return () => { cancelAnimation(progress); progress.set(0); };
  }, [looping, phase, progress]);
  useEffect(() => {
    if (!pulse || loop || reducedMotion) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }, done => { if (done) runOnJS(setActive)(false); }));
  }, [pulse, loop, reducedMotion, progress]);
  if (reducedMotion || !(looping || active)) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: size, height: size, overflow: "hidden" }]}>
    {LAYERS.map(layer => <Window key={layer.width} art={art} size={size} width={layer.width * size} opacity={layer.opacity} progress={progress} />)}
  </View>;
}

/**
 * One tilted window. It moves across the item while the lit picture inside moves and turns the opposite way, so the picture
 * stays exactly over the item and only the window travels.
 */
function Window({ art, size, width, opacity, progress }: { art: CollectionArt; size: number; width: number; opacity: number; progress: SharedValue<number> }) {
  const height = size * 1.8;
  const frame = useAnimatedStyle(() => {
    const at = progress.value, x = -size * 0.85 + at * size * 1.7;
    return { opacity: at <= 0 || at >= 1 ? 0 : opacity, transform: [{ translateX: x }, { rotate: ANGLE + "deg" }] };
  });
  const picture = useAnimatedStyle(() => {
    const x = -size * 0.85 + progress.value * size * 1.7;
    return { transform: [{ translateX: -x * Math.cos(RAD) }, { translateY: x * Math.sin(RAD) }, { rotate: -ANGLE + "deg" }] };
  });
  return <Animated.View style={[{ position: "absolute", left: (size - width) / 2, top: (size - height) / 2, width, height, overflow: "hidden" }, frame]}>
    <Animated.View style={[{ position: "absolute", left: (width - size) / 2, top: (height - size) / 2, width: size, height: size }, picture]}>
      <Image source={art.lit} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
    </Animated.View>
  </Animated.View>;
}
