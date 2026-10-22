/** Labels over the café scene: order bubbles above each guest, seat tags, a state tag under every station and a portion tag on a shared plate. */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";
import { takePhase } from "./Knob";
import type { Layout } from "./layout";

export function Bubbles({ run, L, art, plateSel, onGuest }: { run: sim.Run; L: Layout; art: Art; plateSel: number | null; onGuest(id: string): void }) {
  const serving = plateSel !== null && !!run.board[plateSel];
  return <>{run.guests.filter(g => g.state === "waiting" || g.state === "eating").map(g => {
    const s = L.seats[g.seat - 1]; if (!s) return null;
    const hearts = Math.ceil(g.patience / g.maxPatience * 5), guest = GUESTS[g.guestId], waiting = g.state === "waiting", mates = sim.mates(run, g);
    const cls = "bubble" + (run.focus === g.orderId && !serving ? " focus" : "") + (serving && waiting ? " target" : "") + (g.vip ? " vip" : "") + (hearts <= 1 && waiting ? " low" : "");
    return <button key={g.orderId} className={cls} style={{ left: s.bubble.x, top: s.bubble.y, maxWidth: L.seatW - 2 }} onClick={() => onGuest(g.orderId)} disabled={!waiting}
      aria-label={guest.name + ", seat " + g.seat + ", " + DISHES[g.dishId].name + (g.rules.length ? ", " + g.rules.map(r => RULES[r].spoken).join(", ") : "")
        + (g.vip ? ", VIP" : "") + (mates.length ? ", shares the pot with " + mates.map(m => GUESTS[m.guestId].name).join(" and ") : "") + (serving && waiting ? ". Drop the plate here" : "")}>
      {!waiting ? <span className="chip yum">Enjoying it ♥</span> : <>
        <span className="row"><img src={art[DISHES[g.dishId].art]} alt="" />{serving && <span className="chip serve">Drop</span>}{g.vip && <span className="chip crown">♛ VIP</span>}</span>
        {g.rules.map(r => <span key={r} className={"chip rule " + r}>{RULES[r].short}</span>)}
        {mates.length > 0 && <span className="chip pair">⇄ Shared pot</span>}
        <span className="hearts" aria-hidden>{[0, 1, 2, 3, 4].map(i => <span key={i} className={i < hearts ? "" : "off"}>♥</span>)}</span>
      </>}
    </button>;
  })}</>;
}

export function SeatTags({ L }: { L: Layout }) {
  return <>{L.seats.map((s, i) => <span key={i} className="seattag" style={{ left: s.tag.x, top: s.tag.y }} aria-hidden="true">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0z" /></svg>{i + 1}</span>)}</>;
}

const SHORT: Record<StationKind, string> = { pan: "Wok", pot: "Pot", rice: "Rice", dessert: "Sweet", board: "Board", blender: "Blend", steamer: "Steam", oven: "Oven", griddle: "Griddle", fryer: "Fry", dough: "Dough", fridge: "Fridge" };
/** A station's state in two or three words (`short` for a narrow station), and how it reads. */
type Tone = "idle" | "cook" | "ready" | "warn" | "take";
export function stationState(run: sim.Run, kind: StationKind): { text: string; short: string; tone: Tone } {
  const st = run.stations[kind]!, pr = st.part, cfg = STATIONS[kind], [lo, hi] = sim.bandOf(st, pr), many = Object.keys(run.stations).length > 1;
  const pct = pr ? Math.round(pr.progress * 100) + "%" : "";
  // A pot cooked for two says so while it cooks (not once it is ready, scorched or split).
  const two = pr?.portions === 2 ? "×2 " : "", cook = (text: string, short: string, tone: Exclude<Tone, "ready">) => ({ text: two + text, short: two + short, tone });
  if (!pr) {
    // An oven or fryer says when it is hot enough for food.
    if (cfg.preheat && st.H >= lo) return { text: "Hot · Add food", short: "Hot", tone: "ready" };
    if (cfg.preheat && st.heatOn) return { text: "Preheating", short: "Heating", tone: "cook" };
    return { text: many ? cfg.name : "Empty", short: many ? SHORT[kind] : "Empty", tone: "idle" };
  }
  if (pr.state === "ready") {
    if (pr.exposure > 0 && run.plan.neglect !== null) return { text: "Burning! Drag it out", short: "Burning!", tone: "warn" };
    // A steamer or oven spoils a ready dish left in, a made one too: say so once it has started.
    if (cfg.burnAfter && pr.exposure > 1.5) return { text: "Take it out!", short: "Out!", tone: "warn" };
    // A blended paste is poured onto the station that takes it, not plated.
    if (sim.partOf(pr).makes) return { text: "Ready · Pour it", short: "Pour it", tone: "ready" };
    return { text: "Ready · Drag it", short: "Drag it", tone: "ready" };
  }
  if (pr.state === "scorched") return { text: "Scorched · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "split") return { text: "Split · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "loading" || pr.state === "waiting") return cook("Add more", "Add", "idle");
  const turn = !pr.turned ? sim.stageOf(pr).turn : undefined;
  if (turn === "fold") return cook("Fold it", "Fold", "warn");
  if (turn === "flip" && pr.progress >= 0.5) return cook("Flip it!", "Flip!", "warn");
  if (!cfg.heat) return cook("Cooking " + pct, pct, "cook");
  // Knob mode: the tag calls the take window (C) on every station, so a step nearly done is never missed while cooking elsewhere.
  const phase = run.knob && !cfg.thermostat ? takePhase(pr) : "idle";
  if (phase === "now") return cook("Take off!", "Now!", "take");
  if (phase === "over") return cook("Overcooking!", "Over!", "warn");
  if (phase === "near") return cook("Almost · " + pct, pct, "take");
  if (run.knob && !cfg.thermostat && !st.heatOn) return cook("Hold heat", "Heat", "warn");
  if (!st.heatOn && st.H < lo) return cook("Heat off", "Heat off", "warn");
  if (st.H >= cfg.scorch) return cook("Too hot!", "Hot!", "warn");
  if (st.H < lo) return cook("Heating up", "Heating", "cook");
  return cook((st.H > hi ? "Hot · " : "Cooking ") + pct, pct, "cook");
}

/** A station's state under it. A tap on the tag selects the station, or restarts a scorched or split dish as the tag says; a ready dish is only ever dragged. */
export function StationTags({ run, L, plateSel, dragging, onSelect, onRestart }: {
  run: sim.Run; L: Layout; plateSel: number | null; dragging: StationKind | null; onSelect(k: StationKind): void; onRestart(k: StationKind): void;
}) {
  // Three or more stations share the row with the plating board, so their tags use short words in a compact size.
  const serving = plateSel !== null && !!run.board[plateSel], narrow = Object.keys(L.stations).length >= 3, roomy = !narrow && 13 * 8 + 46 <= L.plating.w;
  return <>
    <span className={"stag plating" + (narrow ? " narrow" : "") + (serving || dragging ? " ready" : "")} style={{ left: L.plating.tag.x, top: L.plating.tag.y, maxWidth: L.plating.w }} aria-hidden="true">
      <TagIcon tone="plate" /><span className="tx">{serving ? (roomy ? "Drop on a guest" : "Drop") : dragging ? "Drop here" : roomy ? "Plating board" : "Plates"}</span></span>
    {(Object.keys(L.stations) as StationKind[]).map(k => {
      // The full words when they fit the tag (about 8 px a letter beside the icon), else the short ones, never cut off.
      const r = L.stations[k]!, s = stationState(run, k), cfg = STATIONS[k], long = !narrow && s.text.length * 8 + 46 <= r.w - 2;
      return <button key={k} className={"stag " + s.tone + (narrow ? " narrow" : "")} style={{ left: r.tag.x, top: r.tag.y, maxWidth: r.w - 2 }}
        onClick={() => { const state = run.stations[k]?.part?.state; if (state === "scorched" || state === "split") onRestart(k); else onSelect(k); }}
        aria-label={cfg.name + ": " + s.text}><TagIcon tone={s.tone === "cook" && cfg.heat ? "flame" : s.tone} /><span className="tx">{long ? s.text : s.short}</span></button>;
    })}
  </>;
}

/** The small icon at the front of a station tag, as in the owner's mockup: a plate, a flame while it cooks, a plus while it wants more. */
function TagIcon({ tone }: { tone: Tone | "plate" | "flame" }) {
  const p = { viewBox: "0 0 24 24", "aria-hidden": true, className: "ti ti-" + tone } as const;
  if (tone === "plate") return <svg {...p}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
  if (tone === "flame") return <svg {...p}><path d="M12.6 2.4c.5 3.2 4.1 5 4.1 9.6a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.7 2.5-4.9-.1 2 .6 3.4 1.9 3.8.2-3.2 1.7-5.4.9-8.5z" /></svg>;
  if (tone === "ready") return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (tone === "warn") return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6.5v7M12 17v.5" style={{ stroke: "var(--warn)" }} strokeWidth="2.6" strokeLinecap="round" /></svg>;
  if (tone === "cook") return <svg {...p}><circle cx="12" cy="13" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 13V8.5M10 2.5h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  if (tone === "take") return <svg {...p}><path fillRule="evenodd" d="M5 2h8a1.5 1.5 0 0 1 1.5 1.5V9a3 3 0 0 1-3 3h-5A3 3 0 0 1 3.5 9V3.5A1.5 1.5 0 0 1 5 2zM7 4v5h1.4V4zM10.6 4v5H12V4z" /><path d="M9 12.5l4.2 8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" fill="none" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7.5v9M7.5 12h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}

/** How many portions a plate cooked for two still holds, on the plate itself (not while the plate is still flying in). */
export function PlateTags({ run, L, incoming }: { run: sim.Run; L: Layout; incoming?: ReadonlySet<number> }) {
  return <>{run.board.map((p, i) => {
    const b = L.board[i]; if (!p || !p.shared || !b || incoming?.has(i)) return null;
    return <span key={i} className="ptag" role="img" style={{ left: b.x + b.w - 4, top: b.y + b.h * 0.1 }} aria-label={p.portions + (p.portions === 1 ? " portion" : " portions") + " left on plate " + (i + 1)}>{p.portions === 1 ? "1 left" : "×2"}</span>;
  })}</>;
}
