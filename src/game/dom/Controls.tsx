/** Bottom panels (GAME_PLAN §13): the heat panel for the selected station and the dialogue line. */
import type { MouseEvent as RMouseEvent, PointerEvent as RPointerEvent } from "react";
import { STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, conflicts } from "../content/guests";
import { itemName } from "../content/items";
import { PETS, SKILLS } from "../content/cosmetics";
import * as sim from "../sim/engine";
import { box, type Art } from "./Hud";
import type { Layout } from "./layout";

const heatWord = (h: number, lo: number, hi: number, scorch: number) => (h >= scorch ? "Too hot" : h > hi ? "Hot" : h >= lo ? "Target" : "Cool");
const pct = (v: number) => v * 100 + "%";

function Meter({ name, H, lo, hi, scorch }: { name: string; H: number; lo: number; hi: number; scorch: number }) {
  const segs = [["cool", 0, lo, "Cool"], ["target", lo, hi, "Target"], ["hot", hi, scorch, "Hot"], ["toohot", scorch, 1, "Too hot"]] as const;
  return <div className="meterbox">
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(H * 100)} aria-label={name + " heat: " + heatWord(H, lo, hi, scorch)}>
      <div className="track">{segs.map(([k, a, b]) => <span key={k} className={"mseg " + k} style={{ left: pct(a), width: pct(Math.max(0, b - a)) }} />)}</div>
      <span className="needle" style={{ left: pct(Math.min(1, Math.max(0, H))) }} />
    </div>
    <div className="ticks" aria-hidden="true">{segs.filter(([, a, b]) => b - a >= 0.12).map(([k, a, b, word]) =>
      <span key={k} style={{ left: pct(Math.min(0.94, Math.max(0.06, (a + b) / 2))) }}>{word}</span>)}</div>
  </div>;
}

export function HeatPanel({ run, L, art, petArt, hold, nudge, onHeat, onHeatTo, onLift, onRestart, onSkill }: {
  run: sim.Run; L: Layout; art: Art; petArt: string; hold: boolean; nudge: boolean; onHeat(k: StationKind): void; onHeatTo(k: StationKind, on: boolean): void;
  onLift(k: StationKind, uid: number): void; onRestart(k: StationKind): void; onSkill(): void;
}) {
  const kind = run.selected, st = run.stations[kind]!, cfg = STATIONS[kind], pr = st.part, [lo, hi] = sim.bandOf(st, pr), g = sim.focusGuest(run);
  const bad = pr && g ? conflicts(pr.items.map(i => i.id), sim.tableRules(run, g), run.flip) : [];
  const state = !pr ? "Empty" : pr.state === "cooking" ? "Cooking " + Math.round(pr.progress * 100) + "%" : pr.state === "waiting" ? "Step " + (pr.stage + 1) + " next"
    : pr.state === "ready" ? "Ready" : pr.state === "scorched" ? "Scorched" : pr.state === "split" ? "Split" : "Loading";
  const pet = PETS[run.pet], skill = SKILLS[pet.skill], liftable = pr && pr.progress === 0 && pr.state !== "ready" ? pr.items.filter(i => i.stage === pr.stage) : [];
  return <div className="layer heat panel" style={box(L.heat)}>
    {cfg.heat ? <Meter name={cfg.name} H={st.H} lo={lo} hi={hi} scorch={cfg.scorch} /> : <div className="noheat">{cfg.name}: no heat to manage</div>}
    <div className="hrow">
      <button className={"burner" + (nudge ? " nudge" : "")} aria-pressed={st.heatOn} disabled={!cfg.heat} {...burnerInput(hold, kind, onHeat, onHeatTo)}
        aria-label={cfg.heat ? (hold ? (st.heatOn ? "Heat on, release to turn it off" : "Heat off, hold to heat") : st.heatOn ? "Heat on, tap to turn it off" : "Heat off, tap to turn it on") : cfg.name + " has no heat"}>
        {st.heatOn ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 2.4c.5 3.2 4.1 5 4.1 9.6a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.7 2.5-4.9-.1 2 .6 3.4 1.9 3.8.2-3.2 1.7-5.4.9-8.5z" /></svg> : <span className="dot" />}
        <span>{cfg.heat ? (st.heatOn ? "Heat on" : "Heat off") : "No heat"}</span>
      </button>
      <div className="status" aria-live="polite">
        <span className="line"><b>{cfg.name}:</b> {cfg.heat ? heatWord(st.H, lo, hi, cfg.scorch) + " · " : ""}{state}</span>
        <span className="chips">
          {liftable.map(i => <button key={i.uid} className={"hchip" + (bad.includes(i.id) ? " alert" : "")} onClick={() => onLift(kind, i.uid)} aria-label={"Lift " + itemName(i.id) + " out"}>{bad.includes(i.id) ? "! " : ""}{itemName(i.id)} ✕</button>)}
          {pr && pr.state !== "ready" && pr.items.length > 0 && <button className="hchip" onClick={() => onRestart(kind)}>Restart</button>}
        </span>
      </div>
      {<button className="skill" onClick={onSkill} disabled={run.skill.used || !run.started} aria-label={pet.name + ": " + skill.name + ". " + skill.effect + (run.skill.used ? " Used." : "")}>
        <img src={art[petArt] ?? art[pet.art]} alt="" /><span>{run.skill.used ? "Used" : skill.name}</span></button>}
    </div>
  </div>;
}

/**
 * Burner input. Toggle: a tap switches. Hold: heat stays on while a finger or mouse is down. The burner is a control, not
 * food, so it keeps its tap (a click without a pointer still toggles it, which keeps Hold usable with a switch).
 */
function burnerInput(hold: boolean, kind: StationKind, onHeat: (k: StationKind) => void, onHeatTo: (k: StationKind, on: boolean) => void) {
  if (!hold) return { onClick: () => onHeat(kind) };
  const off = () => onHeatTo(kind, false);
  return {
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => { if (e.button) return; e.currentTarget.setPointerCapture?.(e.pointerId); onHeatTo(kind, true); },
    onPointerUp: off, onPointerCancel: off, onLostPointerCapture: off,
    onClick: (e: RMouseEvent<HTMLButtonElement>) => { if (e.detail === 0) onHeat(kind); },
    onContextMenu: (e: RMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  };
}

export function Dialogue({ run, L, art, chefArt }: { run: sim.Run; L: Layout; art: Art; chefArt: string }) {
  const who = run.say.who ? GUESTS[run.say.who] : null;
  return <div className="layer dialogue panel" style={box(L.dialogue)}>
    <span className="face"><img src={art[who ? who.art : chefArt]} alt="" /></span>
    <div className={"say " + run.say.tone} aria-live="polite"><span className="who">{who ? who.name : "Chef"}</span>
      <p key={run.say.text}>{run.say.text}</p></div>
  </div>;
}
