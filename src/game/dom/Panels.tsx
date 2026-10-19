/** DOM panels over the Phaser playfield (GAME_PLAN §13): HUD, recipe strip, order bubbles, shelves, heat panel, dialogue. */
import { memo, useEffect, useMemo, useRef, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactElement } from "react";
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES, conflicts } from "../content/guests";
import { ITEMS, itemName } from "../content/items";
import { PETS, SKILLS } from "../content/cosmetics";
import * as sim from "../sim/engine";
import type { Layout, Rect } from "./layout";

export type Art = Record<string, string>;
const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });
const inset = (r: Rect, d: number) => ({ left: r.x + d, top: r.y + d / 2, width: r.w - d * 2, height: r.h - d });
const heatWord = (h: number, lo: number, hi: number, scorch: number) => (h >= scorch ? "Too hot" : h > hi ? "Hot" : h >= lo ? "Target" : "Cool");

export function Hud({ run, L, coins, eatKey, onPause }: { run: sim.Run; L: Layout; coins: number; eatKey: number; onPause(): void }) {
  const max = sim.maxCoins(run), rush = run.mode === "rush";
  const frac = rush && run.level.round ? Math.min(1, run.timeLeft / run.level.round) : 1, secs = Math.ceil(run.timeLeft);
  const allServed = run.guests.every(g => g.order === "served") && coins >= run.coins;
  const left = run.guests.filter(g => g.order === "open").length;
  return <div className="layer hud" style={box(L.hud)}>
    <div className={"timer" + (rush && secs <= 10 && run.started && !run.ended ? " late" : rush && secs <= 30 ? " warm" : "")} role="timer" aria-label={rush ? secs + " seconds left" : "Calm, no clock"}>
      <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" fill="var(--cream)" stroke="var(--panel-edge)" strokeWidth="4" />
        <circle className="arc" cx="22" cy="22" r="19" fill="none" stroke="var(--sage-deep)" strokeWidth="4" strokeDasharray="119.4" strokeDashoffset={(119.4 * (1 - frac)).toFixed(1)} strokeLinecap="round" /></svg>
      <b>{rush ? Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0") : "Calm"}</b>
    </div>
    <div className="lvl">{run.level.special ? "Today's special" : "Level " + run.level.n}<small>{run.level.special ? DISHES[run.level.special.dish]?.name : run.level.name}</small></div>
    <div className="takings" aria-label={"Takings " + coins + " of " + max}>
      <div className="coins"><span key={eatKey} className={"ico" + (eatKey ? " eat" : "")} />{coins}<small style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-2)" }}>{left} left</small></div>
      <div className="bar"><i style={{ width: Math.min(100, coins / max * 100) + "%" }} />
        {[[0, 25], [0.75, 75], [0.9, 90]].map(([f, at], i) => <span key={i} className={"star" + (allServed && coins >= Math.ceil(f * max) ? " lit" : "")} style={{ left: at + "%" }}>★</span>)}
      </div>
    </div>
    <button className="pill" onClick={onPause} aria-label="Pause">❚❚</button>
  </div>;
}

/** Slots for the focused guest's dish: done, filled, wanted next, or empty. */
export function RecipeStrip({ run, L, art }: { run: sim.Run; L: Layout; art: Art }) {
  const g = sim.focusGuest(run);
  if (!g) return <div className="layer recipe" style={inset(L.recipe, 8)}><span className="t">Waiting for guests<small>tap a guest to cook for them</small></span></div>;
  const dish = DISHES[g.dishId];
  const chips: ReactElement[] = [];
  dish.parts.forEach((part, pi) => {
    const st = run.stations[part.station], pr = st?.part && st.part.partId === part.id ? st.part : null;
    const onBoard = run.board.some(p => p && p.dishId === dish.id && p.parts.some(x => x.partId === part.id));
    if (pi) chips.push(<span key={"s" + pi} className="sep" />);
    part.stages.forEach((stage, si) => stage.slots.forEach(slot => {
      const found = pr?.items.find(x => x.stage === si && slot.accepts.includes(x.id));
      const done = onBoard || (pr ? si < pr.stage || pr.state === "ready" : false) || !!found;
      const want = !done && (pr ? si === pr.stage : si === 0);
      const safe = slot.accepts.find(id => !conflicts([id], g.rules)) ?? slot.accepts[0];
      const key = ITEMS[(found?.id ?? safe)]?.art;
      chips.push(<span key={part.id + si + slot.key} className={"step" + (done ? "" : want ? " want" : " empty") + (slot.optional ? " opt" : "") + (found?.warn ? " bad" : "")} title={slot.label}>
        {key && <img src={art[key]} alt="" />}{done && <span className="tick">{found?.warn ? "!" : "✓"}</span>}</span>);
    }));
  });
  const rules = g.rules.length ? g.rules.map(r => RULES[r].chip).join(" · ") : "No food rules";
  return <div className="layer recipe" style={inset(L.recipe, 8)}>
    <img className="bowl" src={art[dish.art]} alt="" />
    <div style={{ minWidth: 0 }}><div className="t">{dish.name}<small>for {GUESTS[g.guestId].name}</small></div><div className="steps">{chips}</div></div>
    <span className="hint">{rules}</span>
  </div>;
}

export function Bubbles({ run, L, art, selectedPlate, onGuest }: { run: sim.Run; L: Layout; art: Art; selectedPlate: number | null; onGuest(id: string): void }) {
  return <>{run.guests.filter(g => g.state === "waiting" || g.state === "eating").map(g => {
    const s = L.seats[g.seat - 1]; if (!s) return null;
    const hearts = Math.ceil(g.patience / run.level.patience * 5), guest = GUESTS[g.guestId];
    return <button key={g.orderId} className={"bubble" + (run.focus === g.orderId ? " focus" : "") + (run.mode === "rush" && hearts <= 1 && g.state === "waiting" ? " low" : "")}
      style={{ left: s.x + s.w / 2, top: L.guests.y + 4, maxWidth: s.w - 4 }} onClick={() => onGuest(g.orderId)}
      aria-label={guest.name + ", seat " + g.seat + ", " + DISHES[g.dishId].name + (g.rules.length ? ", " + g.rules.map(r => RULES[r].spoken).join(", ") : "") + (selectedPlate !== null ? ". Serve the selected plate" : "")}>
      {g.state === "eating" ? <span className="chip">Enjoying it</span> : <>
        <img src={art[DISHES[g.dishId].art]} alt="" />
        {g.rules.map(r => <span key={r} className="chip rule">{RULES[r].chip}</span>)}
        {run.mode === "rush" ? <span className="hearts" aria-hidden>{[0, 1, 2, 3, 4].map(i => <span key={i} className={i < hearts ? "" : "off"}>♥</span>)}</span> : <span className="chip">{guest.name}</span>}
      </>}
    </button>;
  })}</>;
}

export function shelfItems(run: sim.Run): string[] {
  const ids = new Set<string>();
  run.guests.forEach(g => DISHES[g.dishId].parts.forEach(p => p.stages.forEach(s => s.slots.forEach(sl => sl.accepts.forEach(a => ids.add(a))))));
  run.level.distractors.forEach(d => ids.add(d));
  return [...ids].filter(id => ITEMS[id]);
}

type ShelvesProps = {
  run: sim.Run; L: Layout; art: Art; tab: "fresh" | "pantry"; setTab(t: "fresh" | "pantry"): void; selected: string | null;
  onPick(id: string | null, origin?: { x: number; y: number }): void; onDrop(id: string, x: number, y: number, origin: { x: number; y: number }): void;
  onLabel(id: string): void; listMode: boolean; setList(v: boolean): void;
  /** Play your way tap only: no drags, so a shaky tap never turns into a drop. */
  tapOnly: boolean;
};
/**
 * Ingredient trays. A plain click (mouse, touch, keyboard or assistive tech) selects; a pointer drag of 8 px or more drops on a station.
 * The label button sits beside the card, never inside it. Memoised: the trays only change with tab, selection, layout or input mode.
 */
export const Shelves = memo(function Shelves({ run, L, art, tab, setTab, selected, onPick, onDrop, onLabel, listMode, setList, tapOnly }: ShelvesProps) {
  const drag = useRef<{ id: string; x0: number; y0: number; moved: boolean; ghost: HTMLImageElement | null; root: HTMLElement | null } | null>(null);
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const items = useMemo(() => shelfItems(run).filter(id => ITEMS[id].tray === tab), [run, tab]);
  const rel = (e: { clientX: number; clientY: number }, root: HTMLElement) => { const b = root.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  function down(e: RPointerEvent<HTMLButtonElement>, id: string) {
    if (e.button || tapOnly) return;
    const root = (e.currentTarget.closest(".rh") as HTMLElement) ?? null;
    drag.current = { id, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, root };
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d || !d.root) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 8) return;
      if (!d.moved) { d.moved = true; const g = document.createElement("img"); g.className = "dragghost"; g.src = art[ITEMS[id].art]; g.alt = ""; d.root.appendChild(g); d.ghost = g; }
      const p = rel(ev, d.root); d.ghost!.style.left = p.x + "px"; d.ghost!.style.top = p.y + "px";
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); cleanup.current = null; };
    const cancel = () => { stop(); drag.current?.ghost?.remove(); drag.current = null; };
    const up = (ev: PointerEvent) => {
      stop(); const d = drag.current; drag.current = null; if (!d || !d.root || !d.moved) return;
      d.ghost?.remove(); const p = rel(ev, d.root);
      // Swallow only the click this same gesture may fire on the card; it arrives before any timer runs.
      suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0);
      onDrop(d.id, p.x, p.y, rel({ clientX: d.x0, clientY: d.y0 }, d.root));
    };
    cleanup.current?.(); cleanup.current = cancel;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }
  function click(e: RMouseEvent<HTMLButtonElement>, id: string) {
    if (suppressClick.current) { suppressClick.current = false; return; }
    const root = e.currentTarget.closest(".rh") as HTMLElement | null, b = e.currentTarget.getBoundingClientRect(), r = root?.getBoundingClientRect();
    onPick(selected === id ? null : id, r ? { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 } : undefined);
  }
  return <div className="layer shelves" style={box(L.shelves)}>
    <div className="tabs" role="tablist" aria-label="Shelves">
      <button role="tab" aria-selected={tab === "fresh"} onClick={() => setTab("fresh")}>Fresh</button>
      <button role="tab" aria-selected={tab === "pantry"} onClick={() => setTab("pantry")}>Pantry</button>
      <button className="view" aria-pressed={listMode} onClick={() => setList(!listMode)}>{listMode ? "Scene" : "List"}</button>
    </div>
    <div className="tray">{items.map(id => {
      const it = ITEMS[id];
      return <div key={id} className="cardwrap">
        <button className={"card" + (selected === id ? " sel" : "")} onPointerDown={e => down(e, id)} onClick={e => click(e, id)} aria-pressed={selected === id}
          aria-label={itemName(id) + (selected === id ? ", selected: tap a station" : "")}>
          <img src={art[it.art]} alt="" draggable={false} /><span>{it.name}</span>{it.variant && <span className="tag">{it.variant}</span>}
        </button>
        {it.label && <button className="lab" onClick={() => onLabel(id)} aria-label={"Read the label of " + itemName(id)}>Label</button>}
      </div>;
    })}</div>
  </div>;
}, (a, b) => a.run === b.run && a.L === b.L && a.tab === b.tab && a.selected === b.selected && a.listMode === b.listMode && a.tapOnly === b.tapOnly);

export function HeatPanel({ run, L, art, petArt, hold, onHeat, onHeatTo, onLift, onRestart, onPlate, onSkill }: {
  run: sim.Run; L: Layout; art: Art; petArt: string; hold: boolean; onHeat(k: StationKind): void; onHeatTo(k: StationKind, on: boolean): void;
  onLift(k: StationKind, uid: number): void; onRestart(k: StationKind): void; onPlate(k: StationKind): void; onSkill(): void;
}) {
  const kind = run.selected, st = run.stations[kind]!, cfg = STATIONS[kind], pr = st.part;
  const [lo, hi] = sim.bandOf(st, pr), g = sim.focusGuest(run);
  const bad = pr && g ? conflicts(pr.items.map(i => i.id), g.rules) : [];
  const state = !pr ? "Empty" : pr.state === "cooking" ? "Cooking " + Math.round(pr.progress * 100) + "%" : pr.state === "waiting" ? "Ready for step " + (pr.stage + 1)
    : pr.state === "ready" ? "Ready" : pr.state === "scorched" ? "Scorched, restart" : pr.state === "split" ? "Split, restart" : "Loading";
  const pet = PETS[run.pet], skill = SKILLS[pet.skill];
  return <div className="layer heat" style={box(L.heat)}>
    {cfg.heat ? <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(st.H * 100)} aria-label={cfg.name + " heat: " + heatWord(st.H, lo, hi, cfg.scorch)}>
      <span className="band" style={{ left: lo * 100 + "%", width: (hi - lo) * 100 + "%" }} />
      <span className="needle" style={{ left: st.H * 100 + "%" }} />
      <span className="words"><span>Cool</span><span>Target</span><span>Too hot</span></span>
    </div> : <div className="status" style={{ fontSize: 11 }}>{cfg.name}: no heat to manage</div>}
    <div style={{ gridRow: "span 2", display: "flex", gap: 6 }}>
      <button className="burner" aria-pressed={st.heatOn} disabled={!cfg.heat} {...burnerInput(hold, kind, onHeat, onHeatTo)}
        aria-label={cfg.heat ? (hold ? (st.heatOn ? "Heat on, release to turn it off" : "Heat off, hold to heat") : st.heatOn ? "Heat on, tap to turn it off" : "Heat off, tap to turn it on") : cfg.name + " has no heat"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.4c.5 3.2 4.1 5 4.1 9.6a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.7 2.5-4.9-.1 2 .6 3.4 1.9 3.8.2-3.2 1.7-5.4.9-8.5z" /></svg>
        <span>{cfg.heat ? (st.heatOn ? "On" : "Off") : "No heat"}</span>
      </button>
      {run.mode === "rush" && <button className="skill" onClick={onSkill} disabled={run.skill.used || !run.started} aria-label={pet.name + ": " + skill.name + ". " + skill.effect + (run.skill.used ? " Used." : "")}>
        <img src={art[petArt] ?? art[pet.art]} alt="" /><span>{run.skill.used ? "Used" : skill.name}</span></button>}
    </div>
    <div className="status" aria-live="polite">
      <b>{cfg.name}:</b> {cfg.heat ? heatWord(st.H, lo, hi, cfg.scorch) + " · " : ""}{state}
      {pr?.items.filter(i => i.stage === pr.stage).map(i => <button key={i.uid} className={"hchip" + (bad.includes(i.id) ? " alert" : "")} onClick={() => onLift(kind, i.uid)} aria-label={"Lift " + itemName(i.id) + " out"}>{bad.includes(i.id) ? "! " : ""}{itemName(i.id)}</button>)}
      {pr && pr.state === "ready" && <button className="hchip act" onClick={() => onPlate(kind)}>Plate</button>}
      {pr && pr.state !== "ready" && <button className="hchip" onClick={() => onRestart(kind)}>Restart</button>}
    </div>
  </div>;
}

/**
 * Burner input. Toggle: a tap switches. Hold: heat stays on while a finger or mouse is down; a click without a pointer
 * (keyboard, switch access, screen reader) still toggles, so hold never locks anyone out (QT-050/051).
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
  return <div className="layer dialogue" style={box(L.dialogue)}>
    <span className="face"><img src={art[who ? who.art : chefArt]} alt="" /></span>
    <div className={"say " + run.say.tone} aria-live="polite"><span className="who">{who ? who.name : "Chef"}</span><p>{run.say.text}</p></div>
  </div>;
}
