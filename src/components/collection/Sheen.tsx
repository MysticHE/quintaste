import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { usePreferences } from "../../state/Preferences";
import type { CollectionArt } from "../../config/collection-art";

/** One sweep: the light crosses the item in this time, tilted by this angle. */
const SWEEP_MS = 1300, ANGLE = 22, RAD = (ANGLE * Math.PI) / 180;
/** Nested windows from wide and faint to narrow and strong, so the light's edges fade instead of cutting. */
const LAYERS = [{ width: 0.62, opacity: 0.45 }, { width: 0.4, opacity: 0.6 }, { width: 0.2, opacity: 0.8 }];

/**
 * Light passing over a Collection item in its own colours (owner, 1 Nov 2026: no white reflection; the shine must match the
 * design): a tilted window slides across the item and shows, inside it, the item lit up (`art.lit`, made by
 * scripts/import-collection-art.py), so gold flares brighter gold and petals glow deeper pink. It sweeps once each time
 * `pulse` changes to a new non-zero value, or over and over with a rest between when `loop` is set. Nothing is drawn with
 * Reduce motion on.
 */
export function Sheen({ art, size, pulse = 0, loop = false }: { art: CollectionArt; size: number; pulse?: number; loop?: boolean }) {
  const { reducedMotion } = usePreferences(), progress = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    if (loop) {
      progress.value = 0;
      progress.value = withRepeat(withDelay(1000, withTiming(1, { duration: SWEEP_MS * 1.3, easing: Easing.inOut(Easing.quad) })), -1, false);
      return () => cancelAnimation(progress);
    }
    if (!pulse) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) });
  }, [pulse, loop, reducedMotion, progress]);
  if (reducedMotion) return null;
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
