/**
 * Knob and ring heat (prototype, sim KNOB), in the heat panel.
 * B, the knob: press and hold Heat and the needle climbs, wobbling like a gas flame, while the stove's flame follows it; let go
 * and the flame holds where the needle was, graded against the band. At the top it sweeps back down, so holding on never
 * parks it there. A quick tap on a lit burner turns it off; a keyboard or switch press (no hold to time) sets the band's middle.
 * C, the cook timer: a bar under the heat bar where a marker rides as the step cooks, to a gold window that is done to the
 * second; Take off (or a tap on the station) in the window is perfect, and past it the bar runs into overcooked.
 */
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from "react";
import * as sim from "../sim/engine";

/** Sweep speed (heat per second), the cold floor, two wobbles (size, times a second) and how short a press counts as a tap. */
const SPEED = 0.85, FLOOR = 0.15, WOBBLE = [0.035, 6.5, 0.015, 13] as const, TAP_MS = 180;
type Hold = { base: number; dir: number; t0: number; last: number; frame: number; inBand: boolean; v: number };
export type Grade = { text: string; tone: "gold" | "good" | "cool" | "hot"; at: number; key: number };

/** Where the knob was let go against the band: the middle half of the band is perfect. */
export function knobGrade(v: number, lo: number, hi: number, scorch: number): Grade {
  const mid = (lo + hi) / 2, key = Date.now();
  if (Math.abs(v - mid) <= (hi - lo) / 4) return { text: "Perfect heat!", tone: "gold", at: v, key };
  if (v >= lo && v <= hi) return { text: "Good", tone: "good", at: v, key };
  return v < lo ? { text: "Too cool", tone: "cool", at: v, key } : { text: v >= scorch ? "Too hot!" : "A bit hot", tone: "hot", at: v, key };
}

export function useKnob(opts: { from: number; band: [number, number]; onSet(v: number): void; onMove(v: number): void; onTick(): void }) {
  const o = useRef(opts);
  useEffect(() => { o.current = opts; });
  const [needle, setNeedle] = useState<number | null>(null);
  const hold = useRef<Hold | null>(null);
  useEffect(() => () => { if (hold.current) cancelAnimationFrame(hold.current.frame); }, []);

  const step = (now: number) => {
    const h = hold.current; if (!h) return;
    h.base += h.dir * SPEED * (now - h.last) / 1000; h.last = now;
    if (h.base >= 1) { h.base = 1; h.dir = -1; } else if (h.base <= FLOOR) { h.base = FLOOR; h.dir = 1; }
    const t = (now - h.t0) / 1000, [a1, f1, a2, f2] = WOBBLE;
    h.v = Math.min(1, Math.max(FLOOR, h.base + a1 * Math.sin(2 * Math.PI * f1 * t) + a2 * Math.sin(2 * Math.PI * f2 * t + 1.3)));
    // A tick each time the needle crosses into or out of the band, so the hand feels the zone.
    const [lo, hi] = o.current.band, inBand = h.v >= lo && h.v <= hi;
    if (inBand !== h.inBand) { h.inBand = inBand; o.current.onTick(); }
    setNeedle(h.v); o.current.onMove(h.v); h.frame = requestAnimationFrame(step);
  };
  const press = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button || hold.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const now = performance.now(), base = Math.max(FLOOR, o.current.from);
    hold.current = { base, dir: 1, t0: now, last: now, frame: requestAnimationFrame(step), inBand: false, v: base }; setNeedle(base);
  };
  const release = () => {
    const h = hold.current; if (!h) return;
    cancelAnimationFrame(h.frame); hold.current = null; setNeedle(null);
    o.current.onSet(performance.now() - h.t0 < TAP_MS && o.current.from > 0 ? 0 : Math.round(h.v * 100) / 100);
  };
  const click = (e: RMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) { const [lo, hi] = o.current.band; o.current.onSet(Math.round((lo + hi) * 50) / 100); } };
  return { needle, handlers: { onPointerDown: press, onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release, onClick: click,
    onContextMenu: (e: RMouseEvent<HTMLButtonElement>) => e.preventDefault() } };
}

export type TakePhase = "idle" | "cook" | "near" | "now" | "over";
const secsOf = (pr: sim.PartRun) => sim.stageOf(pr).secs * (pr.portions > 1 ? sim.BATCH_SLOW : 1);
/** Where a cooking step stands against its take window: cooking, nearly there (can come off, early), on the ring, or overcooking. */
export function takePhase(pr: sim.PartRun | null): TakePhase {
  if (!pr || pr.state !== "cooking") return "idle";
  if (pr.progress < sim.KNOB.early) return "cook";
  if (pr.progress < 1) return (1 - pr.progress) * secsOf(pr) <= sim.KNOB.perfect ? "now" : "near";
  return pr.over <= sim.KNOB.perfect ? "now" : "over";
}

/** Where done sits on the cook timer: the bar left of it is the step cooking, the bar right of it the overcooking grace. */
const DONE = 0.74;
export function CookTimer({ pr, phase }: { pr: sim.PartRun | null; phase: TakePhase }) {
  const secs = pr ? secsOf(pr) : 1, cooking = phase !== "idle" && !!pr;
  const before = Math.max(0.045, DONE * sim.KNOB.perfect / secs), after = Math.max(0.035, (1 - DONE) * sim.KNOB.perfect / sim.KNOB.grace);
  const x = !cooking ? 0 : pr!.progress < 1 ? pr!.progress * DONE : DONE + (1 - DONE) * Math.min(1, pr!.over / sim.KNOB.grace);
  return <div className={"cooktimer " + phase} role="timer" aria-label={!cooking ? "Cook timer: nothing cooking" : phase === "now" ? "Take it off now" : phase === "over" ? "Overcooking" : "Cooking"}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className="watch"><circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M10 2.5h4M12 2.5v3M12 13.5V9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
    <div className="ctrack">
      <i className="cfill" style={{ width: Math.min(x, DONE) * 100 + "%" }} />
      <span className="cover" style={{ left: (DONE + after) * 100 + "%" }} />
      <span className="cwin" style={{ left: (DONE - before) * 100 + "%", width: (before + after) * 100 + "%" }}>★</span>
      {cooking && <span className="cmark" style={{ left: x * 100 + "%" }} />}
    </div>
  </div>;
}
