/**
 * Bottom panel (GAME_PLAN §13, owner mockup 22 Oct 2026): the heat panel for the selected station, and the toast that replaced
 * the chat panel. The heat bar is one gradient (blue, green across this step's band, amber, red) with the band outlined as the
 * sweet spot; in knob mode (prototype) the burner is a held knob and a cook timer runs under the bar (Knob.tsx).
 */
import { useEffect, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from "react";
import { STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, conflicts } from "../content/guests";
import { itemName } from "../content/items";
import { PETS, SKILLS } from "../content/cosmetics";
import * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import { CookTimer, knobGrade, takePhase, useKnob, type Grade } from "./Knob";
import type { Layout } from "./layout";

const heatWord = (h: number, lo: number, hi: number, scorch: number) => (h >= scorch ? "Too hot" : h > hi ? "Hot" : h >= lo ? "Target" : "Cool");
const pct = (v: number) => v * 100 + "%";
const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** The bar's colours follow this step's band: blue below it, green across it, then amber and red. */
const gradient = (lo: number, hi: number, scorch: number) => "linear-gradient(90deg, var(--cool-deep) 0%, var(--cool) " + pct(Math.max(0.02, lo - 0.12)) +
  ", var(--target) " + pct(lo) + ", var(--target) " + pct(hi) + ", var(--amber) " + pct((hi + scorch) / 2) + ", var(--hot) " + pct(scorch) + ", var(--burner) 100%)";

/** The heat bar: needle, the band outlined as the sweet spot, and with the knob the notch where it was let go and the grade it earned. */
function Meter({ name, H, lo, hi, scorch, needle, set, grade }: { name: string; H: number; lo: number; hi: number; scorch: number; needle: number | null; set: number; grade: Grade | null }) {
  // Labels sit under their part of the bar; one too close to the last is left out rather than overlapping it.
  const labels = ([["cool", Math.max(0.07, lo / 2), "Cool"], ["target", (lo + hi) / 2, "Target"], ["hot", (hi + scorch) / 2, "Hot"], ["toohot", Math.min(0.92, (scorch + 1) / 2), "Too hot"]] as const)
    .reduce<(readonly [string, number, string])[]>((out, l) => (out.length && l[1] - out[out.length - 1][1] < 0.17 ? out : [...out, l]), []);
  return <div className="meterbox">
    <div className={"meter" + (needle !== null ? " held" : "")} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(H * 100)} aria-label={name + " heat: " + heatWord(H, lo, hi, scorch)}>
      <div className="track" style={{ background: gradient(lo, hi, scorch) }} />
      <span className="zone" style={{ left: pct(lo), width: pct(hi - lo) }} />
      <span className={"needle" + (needle !== null ? " knob" : "")} style={{ left: pct(clamp(needle ?? H)) }} />
      {set > 0 && needle === null && <span className="set" style={{ left: pct(set) }} />}
      {grade && <span key={grade.key} className={"grade " + grade.tone} style={{ left: pct(Math.min(0.85, Math.max(0.15, grade.at))) }}>{grade.text}</span>}
    </div>
    <div className="ticks" aria-hidden="true">{labels.map(([k, at, word]) => <span key={k} className={k} style={{ left: pct(at) }}>{word}</span>)}</div>
  </div>;
}

export function HeatPanel({ run, L, art, petArt, hold, nudge, onHeat, onHeatTo, onKnob, onPreview, onTick, onTake, onLift, onRestart, onSkill }: {
  run: sim.Run; L: Layout; art: Art; petArt: string; hold: boolean; nudge: boolean; onHeat(k: StationKind): void; onHeatTo(k: StationKind, on: boolean): void;
  /** Knob mode: the knob was let go at this heat (0 is off), the held needle as it moves (null when let go), a tick as it crosses the band, and Take off. */
  onKnob(k: StationKind, v: number, perfect: boolean): void; onPreview(k: StationKind, v: number | null): void; onTick(): void; onTake(k: StationKind): void;
  onLift(k: StationKind, uid: number): void; onRestart(k: StationKind): void; onSkill(): void;
}) {
  const kind = run.selected, st = run.stations[kind]!, cfg = STATIONS[kind], pr = st.part, [lo, hi] = sim.bandOf(st, pr), g = sim.focusGuest(run);
  const bad = pr && g ? conflicts(pr.items.map(i => i.id), sim.tableRules(run, g), run.flip) : [];
  const knobbed = run.knob && !!cfg.heat && !cfg.thermostat;
  const [grade, setGrade] = useState<Grade | null>(null);
  useEffect(() => { if (!grade) return; const t = setTimeout(() => setGrade(null), 1300); return () => clearTimeout(t); }, [grade]);
  const knob = useKnob({ from: st.set, band: [lo, hi], onTick, onMove: v => onPreview(kind, v),
    onSet: v => { const gr = knobGrade(v, lo, hi, cfg.scorch); setGrade(v > 0 ? gr : null); onPreview(kind, null); onKnob(kind, v, gr.tone === "gold"); } });
  const held = knob.needle !== null, phase = knobbed ? takePhase(pr) : "idle";
  const pet = PETS[run.pet], skill = SKILLS[pet.skill], liftable = pr && pr.progress === 0 && pr.state !== "ready" ? pr.items.filter(i => i.stage === pr.stage && !i.inside && (i.warn || bad.includes(i.id))) : [];
  const restartable = !!pr && pr.state !== "ready" && pr.items.length > 0;
  return <div className={"layer heat panel" + (knobbed ? " knobbed" : "")} style={box(L.heat)}>
    {cfg.heat ? <Meter name={cfg.name} H={st.H} lo={lo} hi={hi} scorch={cfg.scorch} needle={knobbed ? knob.needle : null} set={knobbed && st.heatOn ? st.set : 0} grade={grade} />
      : <div className="noheat">{cfg.name}: no heat to manage</div>}
    {run.knob && <CookTimer pr={knobbed ? pr : null} phase={phase} />}
    <div className="hrow">
      <button className={"burner" + (nudge ? " nudge" : "") + (held ? " held" : "") + (st.heatOn ? " on" : "")} aria-pressed={st.heatOn} disabled={!cfg.heat}
        {...(knobbed ? knob.handlers : burnerInput(hold, kind, onHeat, onHeatTo))}
        aria-label={!cfg.heat ? cfg.name + " has no heat" : knobbed ? "Hold to raise the flame, let go to set it" + (st.heatOn ? "; tap to turn it off" : "")
          : hold ? (st.heatOn ? "Heat on, release to turn it off" : "Heat off, hold to heat") : st.heatOn ? "Heat on, tap to turn it off" : "Heat off, tap to turn it on"}>
        {knobbed ? <KnobIcon turn={held ? knob.needle! : st.set} /> : <Flame />}
        <span>{!cfg.heat ? "No heat" : held ? "Let go" : st.heatOn ? "Heat on" : knobbed ? "Hold heat" : "Heat off"}</span>
      </button>
      {phase === "near" || phase === "now" || phase === "over"
        ? <button className={"take " + phase} onClick={() => onTake(kind)} aria-label={"Take the " + cfg.name.toLowerCase() + " off the heat"}><Spatula />Take off</button>
        : liftable.length > 0 ? <button className="restart alert" onClick={() => onLift(kind, liftable[0].uid)} aria-label={"Lift " + itemName(liftable[0].id) + " out"}>
          <span className="tx">{itemName(liftable[0].id)}</span> ✕</button>
        : restartable && <button className="restart" onClick={() => onRestart(kind)}><Refresh />Restart</button>}
      <button className={"skill" + (run.skill.used ? " used" : "")} onClick={onSkill} disabled={run.skill.used || !run.started}
        aria-label={pet.name + ": " + skill.name + ". " + skill.effect + (run.skill.used ? " Used." : "")}>
        <span className="pic"><img src={art[petArt] ?? art[pet.art]} alt="" />{run.skill.used && <i className="ok">✓</i>}</span>
        <span className="line"><b>Skill</b><span className="how">{run.skill.used ? "Used" : skill.name}</span></span>
      </button>
    </div>
  </div>;
}

/**
 * Burner input. Toggle: a press switches. Hold: heat stays on while a finger or mouse is down. The burner is a control, not
 * food, so it keeps its tap (a click without a pointer still toggles it, which keeps it usable with a keyboard or switch).
 */
function burnerInput(hold: boolean, kind: StationKind, onHeat: (k: StationKind) => void, onHeatTo: (k: StationKind, on: boolean) => void) {
  // Toggle switches on press, not on click: a phone sends no click for a tap made while another finger holds a card.
  if (!hold) return {
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => { if (!e.button) onHeat(kind); },
    onClick: (e: RMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) onHeat(kind); },
  };
  const off = () => onHeatTo(kind, false);
  return {
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => { if (e.button) return; e.currentTarget.setPointerCapture?.(e.pointerId); onHeatTo(kind, true); },
    onPointerUp: off, onPointerCancel: off, onLostPointerCapture: off,
    onClick: (e: RMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) onHeat(kind); },
    onContextMenu: (e: RMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  };
}

/**
 * A mistake the chef or a guest calls out, as a short toast just under the shelf, over the worktop (no chat panel, owner 22 Oct; never
 * over a guest's face, 23 Oct); it fades on its own. Routine lines and thanks are already shown by the bubbles, order card and heat bar.
 */
export function SayToast({ run, L, art, chefArt }: { run: sim.Run; L: Layout; art: Art; chefArt: string }) {
  // The line shows until its time is up; `gone` remembers which line has faded, so a new one shows at once.
  const { text, who, tone } = run.say, [gone, setGone] = useState<string | null>(null);
  const shown = run.started && !!text && tone === "warn" && gone !== text ? text : null;
  useEffect(() => { if (!shown) return; const t = setTimeout(() => setGone(shown), 4500); return () => clearTimeout(t); }, [shown]);
  if (!shown) return null;
  const guest = who ? GUESTS[who] : null;
  return <div key={shown} className={"saytoast " + tone} role="status" style={{ left: L.col.x + L.col.w / 2, top: L.shelves.y + L.shelves.h + 6, maxWidth: L.col.w - 40 }}>
    <img src={art[guest ? guest.art : chefArt]} alt="" /><p><b>{guest ? guest.name : "Chef"}</b>{shown}</p></div>;
}

const svg = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
function Flame() { return <svg {...svg}><path d="M12.6 2.4c.5 3.2 4.1 5 4.1 9.6a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.7 2.5-4.9-.1 2 .6 3.4 1.9 3.8.2-3.2 1.7-5.4.9-8.5z" /></svg>; }
/** A gas knob that turns with the heat it is set to (or held at): off points left, full points right. */
function KnobIcon({ turn }: { turn: number }) {
  return <svg {...svg} className="knobicon"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <g style={{ transform: "rotate(" + Math.round(-120 + 240 * clamp(turn)) + "deg)", transformOrigin: "12px 12px" }}><rect x="10.6" y="3.6" width="2.8" height="9" rx="1.4" /></g></svg>;
}
/** A slotted turner: lifting the food off the heat. */
function Spatula() { return <svg {...svg}><path fillRule="evenodd" d="M5 2h8a1.5 1.5 0 0 1 1.5 1.5V9a3 3 0 0 1-3 3h-5A3 3 0 0 1 3.5 9V3.5A1.5 1.5 0 0 1 5 2zM7 4v5h1.4V4zM10.6 4v5H12V4z" /><path d="M9 12.5l4.2 8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" fill="none" /></svg>; }
function Refresh() { return <svg {...svg}><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5v3.6h-3.6" /></svg>; }
