/** Labels over the café scene: order bubbles above each guest, seat tags, a state tag under every station and a portion tag on a shared plate. */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";
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
        {g.rules.map(r => <span key={r} className="chip rule">{RULES[r].short}</span>)}
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

const SHORT: Record<StationKind, string> = { pan: "Wok", pot: "Pot", rice: "Rice", dessert: "Sweet", board: "Board", blender: "Blend" };
/** A station's state in two or three words (`short` for a narrow station), and how it reads. */
export function stationState(run: sim.Run, kind: StationKind): { text: string; short: string; tone: "idle" | "cook" | "ready" | "warn" } {
  const st = run.stations[kind]!, pr = st.part, cfg = STATIONS[kind], [lo, hi] = sim.bandOf(st, pr), many = Object.keys(run.stations).length > 1;
  const pct = pr ? Math.round(pr.progress * 100) + "%" : "";
  // A pot cooked for two says so while it cooks (not once it is ready, scorched or split).
  const two = pr?.portions === 2 ? "×2 " : "", cook = (text: string, short: string, tone: "idle" | "cook" | "warn") => ({ text: two + text, short: two + short, tone });
  if (!pr) return { text: many ? cfg.name : "Empty", short: many ? SHORT[kind] : "Empty", tone: "idle" };
  // A blended paste is poured onto the station that takes it, not plated.
  if (pr.state === "ready" && sim.partOf(pr).makes) return { text: "Ready · Pour it", short: "Pour it", tone: "ready" };
  if (pr.state === "ready") {
    if (pr.exposure > 0 && run.plan.neglect !== null) return { text: "Burning! Drag it out", short: "Burning!", tone: "warn" };
    return { text: "Ready · Drag it", short: "Drag it", tone: "ready" };
  }
  if (pr.state === "scorched") return { text: "Scorched · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "split") return { text: "Split · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "loading" || pr.state === "waiting") return cook("Add more", "Add", "idle");
  if (!cfg.heat) return cook("Cooking " + pct, pct, "cook");
  if (!st.heatOn && st.H < lo) return cook("Heat off", "Heat off", "warn");
  if (st.H >= cfg.scorch) return cook("Too hot!", "Hot!", "warn");
  if (st.H < lo) return cook("Heating up", "Heating", "cook");
  return cook((st.H > hi ? "Hot · " : "Cooking ") + pct, pct, "cook");
}

/** A station's state under it. A tap on the tag selects the station, or restarts a scorched or split dish as the tag says; a ready dish is only ever dragged. */
export function StationTags({ run, L, plateSel, dragging, onSelect, onRestart }: {
  run: sim.Run; L: Layout; plateSel: number | null; dragging: StationKind | null; onSelect(k: StationKind): void; onRestart(k: StationKind): void;
}) {
  const serving = plateSel !== null && !!run.board[plateSel], narrow = Object.keys(L.stations).length > 3;
  return <>
    <span className={"stag plating" + (serving || dragging ? " ready" : "")} style={{ left: L.plating.tag.x, top: L.plating.tag.y, maxWidth: L.plating.w }} aria-hidden="true">{serving ? "Drop on a guest" : dragging ? "Drop here" : narrow ? "Plates" : "Plating board"}</span>
    {(Object.keys(L.stations) as StationKind[]).map(k => {
      const r = L.stations[k]!, s = stationState(run, k), cfg = STATIONS[k];
      return <button key={k} className={"stag " + s.tone} style={{ left: r.tag.x, top: r.tag.y, maxWidth: r.w - 2 }}
        onClick={() => { const state = run.stations[k]?.part?.state; if (state === "scorched" || state === "split") onRestart(k); else onSelect(k); }}
        aria-label={cfg.name + ": " + s.text}>{narrow ? s.short : s.text}</button>;
    })}
  </>;
}

/** How many portions a plate cooked for two still holds, on the plate itself (not while the plate is still flying in). */
export function PlateTags({ run, L, incoming }: { run: sim.Run; L: Layout; incoming?: ReadonlySet<number> }) {
  return <>{run.board.map((p, i) => {
    const b = L.board[i]; if (!p || !p.shared || !b || incoming?.has(i)) return null;
    return <span key={i} className="ptag" role="img" style={{ left: b.x + b.w - 4, top: b.y + b.h * 0.1 }} aria-label={p.portions + (p.portions === 1 ? " portion" : " portions") + " left on plate " + (i + 1)}>{p.portions === 1 ? "1 left" : "×2"}</span>;
  })}</>;
}
