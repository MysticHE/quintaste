/**
 * Knob and cook timer heat (prototype, sim KNOB and KnobTune), in the heat panel. The service's tune sets how fast and how
 * unsteadily the needle climbs (harder by chapter), and with Assist a let-go just outside the band still lands inside it.
 * B, the knob: press and hold Heat and the needle climbs, wobbling like a gas flame, while the stove's flame follows it; let go
 * and the flame holds where the needle was, graded against the band. At the top it sweeps back down, so holding on never
 * parks it there. A quick tap on a lit burner turns it off; a keyboard or switch press (no hold to time) sets the band's middle.
 * C, the cook timer: a bar under the heat bar where a marker rides as the step cooks, to a gold window that is done to the
 * second; Take off (or a tap on the station) in the window is perfect, and past it the bar runs into overcooked.
 */
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from "react";
import * as sim from "../sim/engine";

/** The cold floor, two wobbles (size at a tune's wobble of 1, times a second) and how short a press counts as a tap. */
const FLOOR = 0.15, WOBBLE = [0.035, 6.5, 0.015, 13] as const, TAP_MS = 180;
type Feel = Pick<sim.KnobTune, "speed" | "wobble" | "snap">;
/** The burner switch's services have no tune; their knob hook still runs (hooks always do) at the first prototype's feel. */
const PLAIN: Feel = { speed: 0.85, wobble: 1, snap: 0 };
type Opts = { key: string; tune: Feel | null; from: number; band: [number, number]; onSet(v: number): void; onMove(v: number): void; onTick(): void };
const round2 = (v: number) => Math.round(v * 100) / 100;
type Hold = { base: number; dir: number; t0: number; last: number; frame: number; inBand: boolean; v: number; at: Opts };
export type Grade = { text: string; tone: "gold" | "good" | "cool" | "hot"; at: number; key: number };

/** Where the knob was let go against the band: the middle half of the band is perfect. */
export function knobGrade(v: number, lo: number, hi: number, scorch: number): Grade {
  const mid = (lo + hi) / 2, key = Date.now();
  if (Math.abs(v - mid) <= (hi - lo) / 4) return { text: "Perfect heat!", tone: "gold", at: v, key };
  if (v >= lo && v <= hi) return { text: "Good", tone: "good", at: v, key };
  return v < lo ? { text: "Too cool", tone: "cool", at: v, key } : { text: v >= scorch ? "Too hot!" : "A bit hot", tone: "hot", at: v, key };
}

/** `key` names the station: a hold belongs to the one it began on, even if another is selected before it is let go. */
export function useKnob(opts: Opts) {
  const o = useRef(opts);
  useEffect(() => { o.current = opts; });
  const [held, setHeld] = useState<{ v: number; key: string } | null>(null);
  const hold = useRef<Hold | null>(null);
  useEffect(() => () => { if (hold.current) cancelAnimationFrame(hold.current.frame); }, []);
  /** The held station's options: the latest while it stays selected, else the ones it had when pressed. */
  const own = (h: Hold) => (o.current.key === h.at.key ? o.current : h.at);

  const step = (now: number) => {
    const h = hold.current; if (!h) return;
    const at = own(h), feel = at.tune ?? PLAIN;
    h.base += h.dir * feel.speed * (now - h.last) / 1000; h.last = now;
    if (h.base >= 1) { h.base = 1; h.dir = -1; } else if (h.base <= FLOOR) { h.base = FLOOR; h.dir = 1; }
    const t = (now - h.t0) / 1000, [a1, f1, a2, f2] = WOBBLE;
    h.v = Math.min(1, Math.max(FLOOR, h.base + feel.wobble * (a1 * Math.sin(2 * Math.PI * f1 * t) + a2 * Math.sin(2 * Math.PI * f2 * t + 1.3))));
    // A tick each time the needle crosses into or out of the band, so the hand feels the zone.
    const [lo, hi] = at.band, inBand = h.v >= lo && h.v <= hi;
    if (inBand !== h.inBand) { h.inBand = inBand; at.onTick(); }
    setHeld({ v: h.v, key: h.at.key }); at.onMove(h.v); h.frame = requestAnimationFrame(step);
  };
  const press = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button || hold.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const now = performance.now(), base = Math.max(FLOOR, o.current.from);
    hold.current = { base, dir: 1, t0: now, last: now, frame: requestAnimationFrame(step), inBand: false, v: base, at: o.current }; setHeld({ v: base, key: o.current.key });
  };
  const release = () => {
    const h = hold.current; if (!h) return;
    cancelAnimationFrame(h.frame); hold.current = null; setHeld(null);
    const at = own(h);
    if (performance.now() - h.t0 < TAP_MS && at.from > 0) { at.onSet(0); return; }
    // Assist: a let-go just outside the band lands just inside it.
    const [lo, hi] = at.band, snap = (at.tune ?? PLAIN).snap, v = h.v;
    at.onSet(round2(v < lo && v >= lo - snap ? lo + 0.01 : v > hi && v <= hi + snap ? hi - 0.01 : v));
  };
  const click = (e: RMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) { const [lo, hi] = o.current.band; o.current.onSet(round2((lo + hi) / 2)); } };
  // The held needle shows only on the station it is setting.
  const needle = held && held.key === opts.key ? held.v : null;
  return { needle, handlers: { onPointerDown: press, onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release, onClick: click,
    onContextMenu: (e: RMouseEvent<HTMLButtonElement>) => e.preventDefault() } };
}

/** Where a step stands on the cook timer: cooking, nearly there (can come off, early), on the star, overcooking; or a flip or fold due (on time, or late). */
export type TakePhase = "idle" | "cook" | "near" | "now" | "over" | "turn" | "turnlate";
const secsOf = (pr: sim.PartRun) => sim.stageOf(pr).secs * (pr.portions > 1 ? sim.BATCH_SLOW : 1);
/** The turn this step still waits for: a flip once it is half done, a fold as soon as it is filled. */
export const turnDue = (pr: sim.PartRun) => {
  const how = pr.state === "cooking" && !pr.turned ? sim.stageOf(pr).turn : undefined;
  return how === "fold" || (how === "flip" && pr.progress >= 0.5) ? how : undefined;
};
export function takePhase(pr: sim.PartRun | null, tune: sim.KnobTune | null): TakePhase {
  if (!pr || pr.state !== "cooking" || !tune) return "idle";
  if (turnDue(pr)) return pr.wait <= tune.turn ? "turn" : "turnlate";
  if (pr.progress < sim.KNOB.early) return "cook";
  if (pr.progress < 1) return (1 - pr.progress) * secsOf(pr) <= tune.perfect ? "now" : "near";
  return pr.over <= tune.perfect ? "now" : "over";
}

/** Where done sits on the cook timer: the bar left of it is the step cooking, the bar right of it the overcooking grace. */
const DONE = 0.74;
const TIMER_SAYS: Record<Exclude<TakePhase, "turn" | "turnlate">, string> = { idle: "nothing cooking", cook: "cooking", near: "nearly done", now: "take it off now", over: "overcooking" };
/**
 * The cook timer. A step with a flip shows the spatula at halfway, where the marker waits for it; a filled dumpling or pastry
 * shows the fold at the start. The mark glows while the turn is on time and turns red once it is late.
 */
export function CookTimer({ pr, phase, tune }: { pr: sim.PartRun | null; phase: TakePhase; tune: sim.KnobTune | null }) {
  const secs = pr ? secsOf(pr) : 1, cooking = phase !== "idle" && !!pr && !!tune, perfect = tune?.perfect ?? 0.3, grace = tune?.grace ?? 2;
  const before = Math.max(0.045, DONE * perfect / secs), after = Math.max(0.035, (1 - DONE) * perfect / grace);
  const x = !cooking ? 0 : pr!.progress < 1 ? pr!.progress * DONE : DONE + (1 - DONE) * Math.min(1, pr!.over / grace);
  const how = pr && pr.state === "cooking" && !pr.turned ? sim.stageOf(pr).turn : undefined, due = !!pr && !!turnDue(pr);
  const heated = !(how === "fold" && cooking);
  const p = cooking ? phase : "idle", says = p === "turn" ? how + " it now" : p === "turnlate" ? how + " it, it's late" : TIMER_SAYS[p];
  return <div className={"cooktimer " + phase} role="timer" aria-label={"Cook timer: " + says}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className="watch"><circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M10 2.5h4M12 2.5v3M12 13.5V9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
    <div className="ctrack">
      <i className="cfill" style={{ width: Math.min(x, DONE) * 100 + "%" }} />
      {heated && <span className="cover" style={{ left: (DONE + after) * 100 + "%" }} />}
      {heated && <span className="cwin" style={{ left: (DONE - before) * 100 + "%", width: (before + after) * 100 + "%" }}>★</span>}
      {cooking && how && <span className={"cturn" + (due ? phase === "turnlate" ? " late" : " due" : "")} style={{ left: (how === "flip" ? 0.5 * DONE : 0.03) * 100 + "%" }}>
        {how === "flip" ? <TurnerIcon /> : <FoldIcon />}</span>}
      {cooking && heated && <span className="cmark" style={{ left: x * 100 + "%" }} />}
    </div>
  </div>;
}
function TurnerIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M5 2h8a1.5 1.5 0 0 1 1.5 1.5V9a3 3 0 0 1-3 3h-5A3 3 0 0 1 3.5 9V3.5A1.5 1.5 0 0 1 5 2zM7 4v5h1.4V4zM10.6 4v5H12V4z" /><path d="M9 12.5l4.2 8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" fill="none" /></svg>; }
function FoldIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15a9 9 0 0 1 18 0z" /><path d="M5 15.5c1.2 1.6 2.4 1.6 3.5 0 1.2 1.6 2.4 1.6 3.5 0 1.2 1.6 2.4 1.6 3.5 0 1.1 1.6 2.3 1.6 3.5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
