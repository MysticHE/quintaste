/**
 * The intro's timeline, in ms from the moment the native splash hides. One table drives the body (drop, squash,
 * spring), the blush, the haptic taps, and the sound (assets/sounds/mochi-intro.wav is synthesised to LANDINGS).
 *
 * The bounce is computed here as plain numbers and sampled into CSS keyframes (Reanimated 4 CSS animations), so it
 * runs on the browser's compositor or the phone's UI thread: the app loading underneath cannot make it stutter.
 */
import type { CSSAnimationKeyframes } from "react-native-reanimated";

type Ease = (t: number) => number;
const linear: Ease = t => t, inQuad: Ease = t => t * t, outQuad: Ease = t => 1 - (1 - t) * (1 - t);
const outBack = (s: number): Ease => t => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
type Step = [duration: number, to: number, ease: Ease];

const START = 60, DROP = 460, SAMPLE = 20;
/** Each landing: how flat it squashes (0–1), how long it stays down, then the height (× size) and time of the next hop. */
const HOPS = [
  { squash: 0.42, down: 90, height: 0.46, air: 220 },
  { squash: 0.26, down: 70, height: 0.15, air: 120 },
  { squash: 0.12, down: 0, height: 0, air: 0 },
];
/** When each landing happens: 520, 1050 and 1360 ms. */
export const LANDINGS = HOPS.reduce<number[]>((at, hop, i) => [...at, i ? at[i - 1] + HOPS[i - 1].down + 2 * HOPS[i - 1].air : START + DROP], []);
export const SETTLED = LANDINGS[2] + 290;
export const HOLD = SETTLED + 650;

/** Hop height above the resting spot (× size), after the drop: holds while squashed, then hops lower each time. */
const hop: Step[] = [[LANDINGS[0], 0, linear], ...HOPS.slice(0, 2).flatMap((h): Step[] => [
  [h.down, 0, linear], [h.air, h.height, outQuad], [h.air, 0, inQuad],
])];
/** Squash: +1 fully flat, below 0 stretched. Flattens on each landing, springs up stretched, rounds out at the top. */
const squash: Step[] = [[START, 0, linear], [DROP, -0.12, inQuad], ...HOPS.flatMap((h, i): Step[] => {
  const flat = i === 2 ? 50 : Math.min(70, h.down), k = h.squash / 0.42;
  if (i === 2) return [[flat, h.squash, outQuad], [240, 0, outBack(3)]];
  return [[flat, h.squash, outQuad], [h.down - flat, h.squash, linear],
    [h.air / 2, -0.14 * k, outQuad], [h.air / 2, 0, linear], [h.air, -0.05 * k, inQuad]];
})];

/** The value of a step track at time t (it starts at the first step's target). */
function at(track: Step[], t: number) {
  let from = track[0][1], start = 0;
  for (const [duration, to, ease] of track) {
    if (t < start + duration) return from + (to - from) * ease(duration ? (t - start) / duration : 1);
    from = to; start += duration;
  }
  return from;
}

/** Lift above the resting spot in px: the drop from `drop` px up, then the hops. */
function lift(t: number, size: number, drop: number) {
  if (t < START) return drop;
  if (t < LANDINGS[0]) return drop * (1 - inQuad((t - START) / DROP));
  return at(hop, t) * size;
}

function frames<T>(make: (t: number) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (let t = 0; t < SETTLED; t += SAMPLE) out[`${((t / SETTLED) * 100).toFixed(2)}%`] = make(t);
  out["100%"] = make(SETTLED);
  return out;
}

/**
 * Keyframes for the body. `drop` is how far above its spot it starts (px); `foot` is the distance from the box
 * centre to its feet, so every squash flattens onto the ground instead of shrinking towards the middle.
 */
export function bodyKeyframes(size: number, drop: number, foot: number): CSSAnimationKeyframes {
  return frames(t => {
    const k = at(squash, t), sy = 1 - 0.9 * k, sx = 1 + 0.8 * k;
    return { transform: [{ translateY: -lift(t, size, drop) + foot * (1 - sy) }, { scaleX: sx }, { scaleY: sy }] };
  });
}

/** Keyframes for the contact shadow: smaller and fainter the higher the mochi is, wider when it squashes flat. */
export function shadowKeyframes(size: number, drop: number): CSSAnimationKeyframes {
  return frames(t => {
    const near = 1 - Math.min(1, lift(t, size, drop) / (size * 1.6)), flat = Math.max(0, at(squash, t));
    return { opacity: 0.25 + 0.75 * near, transform: [{ scaleX: (0.45 + 0.55 * near) * (1 + 0.6 * flat) }, { scaleY: 0.6 + 0.4 * near }] };
  });
}

/** The art's feet sit at 91% of its height. */
export const FEET_ORIGIN = "50% 91%";
/** One full left-right rock of the hover, in ms. */
export const SWAY = 1900;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Hover while the app is still loading: the body rocks side to side with a slight drift and a soft lift at each
 * turn. It pivots on its feet through the element's transformOrigin (FEET_ORIGIN): keyframes keep one entry per
 * transform type, so a translate-rotate-translate pivot would lose a translate. `rampIn` is the first cycle, which grows from rest so the hover never starts with a jolt;
 * the steady cycle then loops. Both start and end centred and moving, so they join seamlessly.
 */
export function swayKeyframes(size: number, rampIn: boolean): CSSAnimationKeyframes {
  const out: CSSAnimationKeyframes = {};
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, side = Math.sin(2 * Math.PI * t), amp = rampIn ? smooth(t) : 1;
    out[`${(t * 100).toFixed(1)}%`] = { transform: [
      { translateX: 0.035 * size * side * amp },
      { translateY: -0.02 * size * (1 - Math.cos(4 * Math.PI * t)) / 2 * amp },
      { rotate: `${5 * side * amp}deg` },
    ] };
  }
  return out;
}

/** The shadow follows the hover's drift and narrows a touch as the body lifts at each turn. */
export function shadowSwayKeyframes(size: number, rampIn: boolean): CSSAnimationKeyframes {
  const out: CSSAnimationKeyframes = {};
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, amp = rampIn ? smooth(t) : 1;
    out[`${(t * 100).toFixed(1)}%`] = { transform: [
      { translateX: 0.035 * size * Math.sin(2 * Math.PI * t) * amp },
      { scaleX: 1 - 0.06 * (1 - Math.cos(4 * Math.PI * t)) / 2 * amp },
    ] };
  }
  return out;
}
