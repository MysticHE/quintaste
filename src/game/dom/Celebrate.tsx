/**
 * The level-clear moment, in five beats: the takings bar fills from empty with a rising tick, holds a breath at each star line,
 * then that star bursts; the heading slams in (with confetti on a clear) and the rest of the results rise one by one. A tap
 * anywhere skips to the end. With motion reduced, everything is simply there.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Sfx } from "./audio";

/** Where the three stars sit on the bar, as in the HUD: all served, then 75% and 90% of the takings. */
const MARKS = [0.25, 0.75, 0.9];
const FILL_MS = 1100, HOLD_MS = 240, TICK = 0.08;
export type Cue = (kind: Sfx, n?: number) => void;

type Beat = { fill: number; lit: number; hold: boolean; done: boolean; skipped: boolean };

export function useCelebrate(res: { coins: number; max: number; stars: number; cleared: boolean }, still: boolean, cue: Cue) {
  const final = Math.min(1, res.coins / Math.max(1, res.max));
  const end: Beat = { fill: final, lit: res.stars, hold: false, done: true, skipped: still };
  const [beat, setBeat] = useState<Beat>(still ? end : { fill: 0, lit: 0, hold: false, done: false, skipped: false });
  const frame = useRef(0), cueRef = useRef(cue);
  useEffect(() => { cueRef.current = cue; });

  useEffect(() => {
    if (still) return;
    // Each star lights where the fill passes its mark, or at the end of the fill if the takings stop short of it.
    const at = Array.from({ length: res.stars }, (_, i) => Math.min(MARKS[i], final));
    let fill = 0, lit = 0, ticks = 0, holdUntil = 0, last = performance.now();
    const step = (now: number) => {
      const dt = now - last; last = now;
      if (now < holdUntil) { frame.current = requestAnimationFrame(step); return; }
      if (holdUntil) { holdUntil = 0; cueRef.current("star", lit); lit++; setBeat(b => ({ ...b, lit, hold: false })); }
      fill = Math.min(final, fill + dt / FILL_MS);
      if (lit < at.length && fill >= at[lit]) { fill = at[lit]; holdUntil = now + HOLD_MS; setBeat(b => ({ ...b, fill, hold: true })); frame.current = requestAnimationFrame(step); return; }
      if (fill >= (ticks + 1) * TICK) { ticks++; cueRef.current("fill", ticks - 1); }
      setBeat(b => ({ ...b, fill }));
      if (fill < final || lit < at.length) { frame.current = requestAnimationFrame(step); return; }
      if (res.cleared) cueRef.current("slam");
      setBeat({ ...end, skipped: false });
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per results sheet

  /** A tap during the sequence jumps to the end. */
  const skip = () => { if (beat.done) return; cancelAnimationFrame(frame.current); setBeat({ ...end, skipped: true }); };
  return { ...beat, skip };
}

/** The takings bar with its three stars and a count that runs up with the fill. */
export function FillBar({ fill, lit, hold, max }: { fill: number; lit: number; hold: boolean; max: number }) {
  return <div className="rfill">
    <div className={"rbar" + (hold ? " hold" : "")}><i style={{ width: fill * 100 + "%" }} />
      {MARKS.map((m, i) => <span key={i} className={"star" + (i < lit ? " lit" : i === lit && hold ? " next" : "")} style={{ left: m * 100 + "%" }}>★</span>)}</div>
    <span className="rcount"><span className="ico" /><b>{Math.round(fill * max)}</b> / {max}</span>
  </div>;
}

const CONFETTI = ["var(--gold)", "var(--coral)", "var(--sage)", "var(--peach)", "var(--gold-hi)"];
/** A short shower of paper confetti over the whole screen; it plays once and never catches a tap. */
export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 7) * 0.04, dx: ((i * 53) % 60) - 30, spin: 180 + ((i * 71) % 360), w: 6 + (i % 3) * 2, color: CONFETTI[i % CONFETTI.length],
  })), []);
  return <div className="confetti" aria-hidden="true">{bits.map((b, i) =>
    <i key={i} style={{ left: b.left + "%", width: b.w, background: b.color, animationDelay: b.delay + "s", "--dx": b.dx + "px", "--spin": b.spin + "deg" } as CSSProperties} />)}</div>;
}
