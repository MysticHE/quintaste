/** Labels over the café scene: order bubbles above each guest, seat tags, and a state tag under every station. */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";
import type { Layout } from "./layout";

export function Bubbles({ run, L, art, plateSel, onGuest }: { run: sim.Run; L: Layout; art: Art; plateSel: number | null; onGuest(id: string): void }) {
  const serving = plateSel !== null && !!run.board[plateSel];
  return <>{run.guests.filter(g => g.state === "waiting" || g.state === "eating").map(g => {
    const s = L.seats[g.seat - 1]; if (!s) return null;
    const hearts = Math.ceil(g.patience / run.level.patience * 5), guest = GUESTS[g.guestId], waiting = g.state === "waiting";
    const cls = "bubble" + (run.focus === g.orderId && !serving ? " focus" : "") + (serving && waiting ? " target" : "") + (run.mode === "rush" && hearts <= 1 && waiting ? " low" : "");
    return <button key={g.orderId} className={cls} style={{ left: s.bubble.x, top: s.bubble.y, maxWidth: L.seatW - 2 }} onClick={() => onGuest(g.orderId)} disabled={!waiting}
      aria-label={guest.name + ", seat " + g.seat + ", " + DISHES[g.dishId].name + (g.rules.length ? ", " + g.rules.map(r => RULES[r].spoken).join(", ") : "")
        + (serving && waiting ? ". Serve the selected plate" : "")}>
      {!waiting ? <span className="chip yum">Enjoying it ♥</span> : <>
        <span className="row"><img src={art[DISHES[g.dishId].art]} alt="" />{serving && <span className="chip serve">Serve</span>}</span>
        {g.rules.map(r => <span key={r} className="chip rule">{RULES[r].short}</span>)}
        {run.mode === "rush" ? <span className="hearts" aria-hidden>{[0, 1, 2, 3, 4].map(i => <span key={i} className={i < hearts ? "" : "off"}>♥</span>)}</span> : <span className="chip">{guest.name}</span>}
      </>}
    </button>;
  })}</>;
}

export function SeatTags({ L }: { L: Layout }) {
  return <>{L.seats.map((s, i) => <span key={i} className="seattag" style={{ left: s.tag.x, top: s.tag.y }} aria-hidden="true">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0z" /></svg>{i + 1}</span>)}</>;
}

const SHORT: Record<StationKind, string> = { pan: "Wok", pot: "Pot", rice: "Rice", dessert: "Sweet", board: "Board" };
/** A station's state in two or three words (`short` for a narrow station), and how it reads. */
export function stationState(run: sim.Run, kind: StationKind): { text: string; short: string; tone: "idle" | "cook" | "ready" | "warn" } {
  const st = run.stations[kind]!, pr = st.part, cfg = STATIONS[kind], [lo, hi] = sim.bandOf(st, pr), many = Object.keys(run.stations).length > 1;
  const pct = pr ? Math.round(pr.progress * 100) + "%" : "";
  if (!pr) return { text: many ? cfg.name : "Empty", short: many ? SHORT[kind] : "Empty", tone: "idle" };
  if (pr.state === "ready") return { text: "Ready · Plate", short: "Plate!", tone: "ready" };
  if (pr.state === "scorched") return { text: "Scorched · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "split") return { text: "Split · Restart", short: "Restart", tone: "warn" };
  if (pr.state === "loading" || pr.state === "waiting") return { text: "Add more", short: "Add", tone: "idle" };
  if (!cfg.heat) return { text: "Cooking " + pct, short: pct, tone: "cook" };
  if (!st.heatOn && st.H < lo) return { text: "Heat off", short: "Heat off", tone: "warn" };
  if (st.H >= cfg.scorch) return { text: "Too hot!", short: "Hot!", tone: "warn" };
  if (st.H < lo) return { text: "Heating up", short: "Heating", tone: "cook" };
  return { text: (st.H > hi ? "Hot · " : "Cooking ") + pct, short: pct, tone: "cook" };
}

export function StationTags({ run, L, plateSel, onStation }: { run: sim.Run; L: Layout; plateSel: number | null; onStation(k: StationKind): void }) {
  const serving = plateSel !== null && !!run.board[plateSel], narrow = Object.keys(L.stations).length > 3;
  return <>
    <span className={"stag plating" + (serving ? " ready" : "")} style={{ left: L.plating.tag.x, top: L.plating.tag.y, maxWidth: L.plating.w }} aria-hidden="true">{serving ? "Tap a guest" : narrow ? "Plates" : "Plating board"}</span>
    {(Object.keys(L.stations) as StationKind[]).map(k => {
      const r = L.stations[k]!, s = stationState(run, k), cfg = STATIONS[k];
      return <button key={k} className={"stag " + s.tone} style={{ left: r.tag.x, top: r.tag.y, maxWidth: r.w - 2 }} onClick={() => onStation(k)}
        aria-label={cfg.name + ": " + s.text}>{narrow ? s.short : s.text}</button>;
    })}
  </>;
}
