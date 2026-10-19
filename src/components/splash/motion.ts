/**
 * The intro's timeline, in ms from the moment the native splash hides. One table drives the body (drop, squash,
 * spring), the blush, the haptic taps, and the sound (assets/sounds/mochi-intro.wav is synthesised to LANDINGS).
 */
import { useEffect } from "react";
import { cancelAnimation, Easing, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

const fall = Easing.in(Easing.quad), rise = Easing.out(Easing.quad), pop = Easing.out(Easing.quad);
const START = 60, DROP = 460;
/** Each landing: how flat it squashes (0–1), how long it stays down, then the height (× size) and time of the next hop. */
const HOPS = [
  { squash: 0.42, down: 90, height: 0.46, air: 220 },
  { squash: 0.26, down: 70, height: 0.15, air: 120 },
  { squash: 0.12, down: 0, height: 0, air: 0 },
];
/** When each landing happens: 520, 1050 and 1360 ms. */
export const LANDINGS = HOPS.reduce<number[]>((at, hop, i) => [...at, i ? at[i - 1] + HOPS[i - 1].down + 2 * HOPS[i - 1].air : START + DROP], []);
const SETTLED = LANDINGS[2] + 290;
export const HOLD = SETTLED + 650;

/**
 * `y` is the lift above the resting spot in px; `squash` is +1 for fully flat and below 0 for a stretch.
 * On each landing the body flattens, stays down for a moment, then springs up stretched tall and rounds out
 * at the top of the hop; the last landing jiggles to rest.
 */
export function useBounce(still: boolean, size: number, drop: number) {
  const y = useSharedValue(still ? 0 : drop), squash = useSharedValue(0), breathe = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const ys: number[] = [withTiming(0, { duration: DROP, easing: fall })];
    const ks: number[] = [withTiming(-0.12, { duration: DROP, easing: fall })];
    HOPS.forEach((hop, i) => {
      const flat = i === 2 ? 50 : Math.min(70, hop.down);
      ks.push(withTiming(hop.squash, { duration: flat, easing: pop }));
      if (i === 2) { ks.push(withTiming(0, { duration: 240, easing: Easing.out(Easing.back(3)) })); return; }
      ks.push(withTiming(hop.squash, { duration: hop.down - flat }));
      ks.push(withTiming(-0.14 * (hop.squash / 0.42), { duration: hop.air / 2, easing: pop }));
      ks.push(withTiming(0, { duration: hop.air / 2 }));
      ks.push(withTiming(-0.05 * (hop.squash / 0.42), { duration: hop.air, easing: fall }));
      ys.push(withTiming(0, { duration: hop.down }));
      ys.push(withTiming(hop.height * size, { duration: hop.air, easing: rise }));
      ys.push(withTiming(0, { duration: hop.air, easing: fall }));
    });
    y.value = withDelay(START, withSequence(...ys));
    squash.value = withDelay(START, withSequence(...ks));
    breathe.value = withDelay(SETTLED, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => { cancelAnimation(y); cancelAnimation(squash); cancelAnimation(breathe); };
  }, [still, size, drop, y, squash, breathe]);
  return { y, squash, breathe };
}

/** The cheeks glow pink once the mochi has settled, then ease back a little. */
export function useBlush(still: boolean) {
  const blush = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    blush.value = withDelay(SETTLED, withSequence(withTiming(1, { duration: 300 }), withTiming(0.55, { duration: 500 })));
    return () => cancelAnimation(blush);
  }, [still, blush]);
  return blush;
}
