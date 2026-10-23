/**
 * The coin pickup (first reference reel), drawn in the DOM layer over every panel: the canvas sits under the order card,
 * the bubbles and the HUD, so coins drawn there vanished behind them on the way to the takings (owner, 23 Oct 2026).
 * The takings won pop over the guest, the coins burst out and hang a moment, then a magnet pulls each one in on a curve with
 * a sparkle trail, and a small burst marks each landing. Only runs when motion is on; the caller handles reduced motion.
 */
import type { Point } from "./layout";

/** The plate's glide from the board to the guest (scene serveTo), after which the coins come out. */
export const SERVE_GLIDE = 380;
const SCATTER = 0.18, HANG = 0.34, STEPS = 18, MS = 1500, STAGGER = 90;
/** How long `count` coins take, from the first setting off to the last landing, in milliseconds. */
export const coinFlight = (count: number) => Math.max(0, count - 1) * STAGGER + MS;

const tf = (p: Point, s = 1, r = 0) => "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px) scale(" + s.toFixed(3) + ") rotate(" + r.toFixed(0) + "deg)";
function spot(root: HTMLElement, cls: string, at: Point) {
  const el = document.createElement("div"); el.className = cls; el.style.transform = tf(at); root.appendChild(el); return el;
}
/** A few sparks flung out from a point. */
function sparks(root: HTMLElement, at: Point, n: number, reach: number) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = reach * (0.6 + Math.random() * 0.5), el = spot(root, "flyspark", at);
    el.animate([{ transform: tf(at, 1) , opacity: 1 }, { transform: tf({ x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d }, 0.2), opacity: 0 }],
      { duration: 420 + Math.random() * 160, easing: "cubic-bezier(.2,.8,.3,1)" }).finished.then(() => el.remove(), () => el.remove());
  }
}

/** Starts the pickup; `eat` runs as each coin lands. Returns how long the last coin takes to land, in milliseconds. */
export function flyCoins(root: HTMLElement, from: Point, to: Point, count: number, eat: () => void, won: number) {
  const pop = spot(root, "coinpop", { x: from.x, y: from.y - 26 }); pop.textContent = "+" + won;
  pop.style.left = from.x + "px"; pop.style.top = from.y - 26 + "px"; pop.style.transform = "";
  // Removed once its 1.6 s float and fade (rhcoinpop, styles-panel.ts) has played out.
  setTimeout(() => pop.remove(), 1700);
  sparks(root, from, 12, 52);
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, d = 34 + Math.random() * 36, p0 = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
    const ctl = { x: p0.x + (p0.x - from.x) * 1.4, y: p0.y - 50 };
    const at = (t: number) => { const u = 1 - t; return { x: u * u * p0.x + 2 * u * t * ctl.x + t * t * to.x, y: u * u * p0.y + 2 * u * t * ctl.y + t * t * to.y }; };
    // Pop out with an overshoot, hang, then the magnet: eased in (slow, then fast) along the curve, shrinking and spinning.
    const frames: Keyframe[] = [{ transform: tf(from, 0.35), offset: 0, easing: "cubic-bezier(.2,1.6,.4,1)" }, { transform: tf(p0, 1.2), offset: SCATTER }, { transform: tf(p0, 1.1), offset: HANG }];
    for (let k = 1; k <= STEPS; k++) { const e = (k / STEPS) ** 2.4; frames.push({ transform: tf(at(e), 1.1 - 0.55 * e, 540 * e), offset: HANG + (1 - HANG) * k / STEPS }); }
    const coin = spot(root, "flycoin", from), delay = i * STAGGER;
    coin.animate(frames, { duration: MS, delay, easing: "linear", fill: "both" }).finished.then(() => { coin.remove(); sparks(root, to, 5, 22); eat(); }, () => { coin.remove(); eat(); });
    // The trail: sparkles left behind along the pull.
    for (const k of [0.46, 0.56, 0.66, 0.75, 0.83, 0.9, 0.96]) setTimeout(() => sparks(root, at(((k - HANG) / (1 - HANG)) ** 2.4), 1, 8), delay + MS * k);
  }
  return coinFlight(count);
}
