/** Labels over the café scene: order bubbles above each guest, seat tags, a state tag under every station and a portion tag on a shared plate. */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";
import { useLayoutEffect, useRef } from "react";
import { takePhase } from "./Knob";
import type { Layout } from "./layout";

export function Bubbles({ run, L, art, plateSel, onGuest }: { run: sim.Run; L: Layout; art: Art; plateSel: number | null; onGuest(id: string): void }) {
  const serving = plateSel !== null && !!run.board[plateSel];
  return <>{run.guests.filter(g => g.state === "waiting" || g.state === "eating").map(g => <Bubble key={g.orderId} g={g} run={run} L={L} art={art} serving={serving} onGuest={onGuest} />)}</>;
}

/** One guest's order bubble. A tall one (two diet rules, large text) moves down over the guest rather than up over the order card. */
function Bubble({ g, run, L, art, serving, onGuest }: { g: sim.GuestRun; run: sim.Run; L: Layout; art: Art; serving: boolean; onGuest(id: string): void }) {
  const ref = useRef<HTMLButtonElement>(null), s = L.seats[g.seat - 1], floor = L.recipe.y + L.recipe.h + 6, waiting = g.state === "waiting", mates = sim.mates(run, g), paired = mates.length > 0;
  // Measured only when the bubble's height can change (its lines, the layout and text size), not on every frame of service.
  useLayoutEffect(() => { const el = ref.current; if (el && s) el.style.top = Math.max(s.bubble.y, floor + el.offsetHeight + 8) + "px"; },
    [s, floor, waiting, g.rules.length, paired]);
  if (!s) return null;
  const hearts = Math.ceil(g.patience / g.maxPatience * 5), guest = GUESTS[g.guestId];
  const cls = "bubble" + (run.focus === g.orderId && !serving ? " focus" : "") + (serving && waiting ? " target" : "") + (g.vip ? " vip" : "") + (hearts <= 1 && waiting ? " low" : "");
  return <button ref={ref} className={cls} style={{ left: s.bubble.x, top: s.bubble.y, maxWidth: L.seatW - 2 }} onClick={() => onGuest(g.orderId)} disabled={!waiting}
    aria-label={guest.name + ", seat " + g.seat + ", " + DISHES[g.dishId].name + (g.rules.length ? ", " + g.rules.map(r => RULES[r].spoken).join(", ") : "")
      + (g.vip ? ", VIP" : "") + (mates.length ? ", shares the pot with " + mates.map(m => GUESTS[m.guestId].name).join(" and ") : "") + (serving && waiting ? ". Drop the plate here" : "")}>
    {!waiting ? <span className="chip yum">Enjoying it ♥</span> : <>
      <span className="row"><img src={art[DISHES[g.dishId].art]} alt="" />{serving && <span className="chip serve">Drop</span>}{g.vip && <span className="chip crown">♛ VIP</span>}</span>
      {g.rules.map(r => <span key={r} className={"chip rule " + r}>{RULES[r].short}</span>)}
      {paired && <span className="chip pair">⇄ Shared pot</span>}
      <span className="hearts" aria-hidden>{[0, 1, 2, 3, 4].map(i => <span key={i} className={i < hearts ? "" : "off"}>♥</span>)}</span>
    </>}
  </button>;
}

export function SeatTags({ L }: { L: Layout }) {
  return <>{L.seats.map((s, i) => <span key={i} className="seattag" style={{ left: s.tag.x, top: s.tag.y }} aria-hidden="true">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0z" /></svg>{i + 1}</span>)}</>;
}

export const SHORT: Record<StationKind, string> = { pan: "Wok", pot: "Pot", rice: "Rice", dessert: "Sweet", board: "Board", blender: "Blend", steamer: "Steam", oven: "Oven", griddle: "Griddle", fryer: "Fry", dough: "Dough", fridge: "Fridge" };
/** A station's state in two or three words (`short` when the full words do not fit its tag), and how it reads. */
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
  // Knob mode: the tag calls the take window and the turns on every station, so a step nearly done is never missed while cooking
  // elsewhere; a turn on time is gold, a late one a warning.
  const phase = run.knob && !cfg.thermostat ? takePhase(pr, run.knob) : "idle";
  const turn = !pr.turned ? sim.stageOf(pr).turn : undefined;
  if (turn === "fold") return phase === "turn" ? cook("Fold now!", "Fold!", "take") : cook("Fold it", "Fold", "warn");
  if (turn === "flip" && pr.progress >= 0.5) return phase === "turn" ? cook("Flip now!", "Flip!", "take") : cook("Flip it!", "Flip!", "warn");
  if (!cfg.heat) return cook("Cooking " + pct, pct, "cook");
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
  const serving = plateSel !== null && !!run.board[plateSel], roomy = wordsWidth("Drop on a guest", 13 * L.ts) + TAG_ICON + TAG_PAD <= L.plating.w;
  // A dish of two parts waits on the tray, faded, until the other part is plated: the tag names what it still needs.
  const half = run.board.find(p => p && !sim.plateComplete(p)), need = half && sim.platedParts(half.dishId).find(pt => !half.parts.some(x => x.partId === pt.id));
  const needText = need && ("Needs " + need.name.toLowerCase()), needFits = !!needText && wordsWidth(needText, 13 * L.ts) + TAG_ICON + TAG_PAD <= L.plating.w;
  return <>
    {(serving || dragging) && <span className="stag plating ready" style={{ left: L.plating.tag.x, top: L.plating.tag.y, maxWidth: L.plating.w }} aria-hidden="true">
      <TagIcon tone="plate" /><span className="tx">{serving ? (roomy ? "Drop on a guest" : "Drop") : "Drop here"}</span></span>}
    {!serving && !dragging && need && <span className="stag plating cook" role="status" style={{ left: L.plating.tag.x, top: L.plating.tag.y, maxWidth: L.plating.w }}>
      <TagIcon tone="plate" /><span className="tx">{needFits ? needText : "1 of " + sim.platedParts(half!.dishId).length + " ready"}</span></span>}
    {(Object.keys(L.stations) as StationKind[]).map(k => {
      const r = L.stations[k]!, s = stationState(run, k), cfg = STATIONS[k], room = r.w - 2 + 2 * TAG_LEAN, fit = fitTag(s, room, L.ts);
      // Idle tags (the station's name, Add more, Empty) are not shown unless the pot is cooking for two; they stay in the page, invisible,
      // so a screen reader or keyboard can still reach the station, and show while focused. Cooking shows how far it has got.
      const quiet = s.tone === "idle" && run.stations[k]?.part?.portions !== 2;
      return <button key={k} className={"stag " + s.tone + fit.cls + (quiet ? " quiet" : "")} style={{ left: r.tag.x, top: r.tag.y, maxWidth: room, fontSize: fit.px }}
        onClick={() => { const state = run.stations[k]?.part?.state; if (state === "scorched" || state === "split") onRestart(k); else onSelect(k); }}
        aria-label={cfg.name + ": " + s.text}><TagIcon tone={s.tone === "cook" && cfg.heat ? "flame" : s.tone} /><span className="tx">{fit.text}</span></button>;
    })}
  </>;
}

/** Room a tag's icon (with its gap) and padding take, with the icon and without, and how far a tag may lean past its station on each side. */
const TAG_ICON = 23, TAG_PAD = 22, TAG_BARE = 16, TAG_LEAN = 4;
/** Tag words in the tags' own font, measured (and kept once the font has loaded), so a tag never chooses words it must cut off. */
const measured = new Map<string, number>();
let pen: CanvasRenderingContext2D | null | undefined;
function wordsWidth(text: string, px: number) {
  const font = "800 " + px.toFixed(2) + "px Nunito_800ExtraBold, Nunito, ui-rounded, 'Segoe UI', system-ui, sans-serif", key = font + "|" + text;
  const known = measured.get(key); if (known !== undefined) return known;
  if (pen === undefined) pen = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!pen) return text.length * px * 0.62;
  pen.font = font; const w = pen.measureText(text).width;
  if (document.fonts?.check(font)) measured.set(key, w);
  return w;
}
/**
 * The words a tag shows, the first that fits its room: the full words with the icon, the short words with the icon, the short
 * words alone (the tag's colour still says its state), without the "×2", or on two lines; a word still too long steps down a
 * size, never under 11 px. Tags are 13 px times the text size.
 */
function fitTag(s: { text: string; short: string }, room: number, ts: number): { text: string; cls: string; px?: number } {
  const px = 13 * ts, fits = (text: string, extra: number) => wordsWidth(text, px) + extra <= room, plain = s.short.replace(/^×2 /, "");
  if (fits(s.text, TAG_ICON + TAG_PAD)) return { text: s.text, cls: "" };
  if (fits(s.short, TAG_ICON + TAG_PAD)) return { text: s.short, cls: "" };
  if (fits(s.short, TAG_BARE)) return { text: s.short, cls: " bare" };
  if (fits(plain, TAG_BARE)) return { text: plain, cls: " bare" };
  const wrap = plain.includes(" "), need = wrap ? Math.max(...plain.split(" ").map(w => wordsWidth(w, px))) : wordsWidth(plain, px);
  return { text: plain, cls: " bare" + (wrap ? " wrap" : ""), px: need + TAG_BARE <= room ? undefined : Math.max(11, px * (room - TAG_BARE) / need) };
}

/** The small icon at the front of a state tag: a plate (carrying a dish), a tick (ready), a warning, or the turner (take it off). */
export function TagIcon({ tone }: { tone: Tone | "plate" | "flame" }) {
  const p = { viewBox: "0 0 24 24", "aria-hidden": true, className: "ti ti-" + tone } as const;
  if (tone === "plate") return <svg {...p}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
  if (tone === "flame") return <svg {...p}><path d="M12.6 2.4c.5 3.2 4.1 5 4.1 9.6a4.7 4.7 0 0 1-9.4 0c0-2.2 1.1-3.7 2.5-4.9-.1 2 .6 3.4 1.9 3.8.2-3.2 1.7-5.4.9-8.5z" /></svg>;
  if (tone === "cook") return <svg {...p}><circle cx="12" cy="13" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 13V8.5M10 2.5h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  if (tone === "ready") return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (tone === "warn") return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6.5v7M12 17v.5" style={{ stroke: "var(--warn)" }} strokeWidth="2.6" strokeLinecap="round" /></svg>;
  if (tone === "take") return <svg {...p}><path fillRule="evenodd" d="M5 2h8a1.5 1.5 0 0 1 1.5 1.5V9a3 3 0 0 1-3 3h-5A3 3 0 0 1 3.5 9V3.5A1.5 1.5 0 0 1 5 2zM7 4v5h1.4V4zM10.6 4v5H12V4z" /><path d="M9 12.5l4.2 8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" fill="none" /></svg>;
  return null;
}

/** How many portions a plate cooked for two still holds, on the plate itself (not while the plate is still flying in). */
export function PlateTags({ run, L, incoming }: { run: sim.Run; L: Layout; incoming?: ReadonlySet<number> }) {
  return <>{run.board.map((p, i) => {
    const b = L.board[i]; if (!p || !p.shared || !b || incoming?.has(i)) return null;
    return <span key={i} className="ptag" role="img" style={{ left: b.x + b.w - 4, top: b.y + b.h * 0.1 }} aria-label={p.portions + (p.portions === 1 ? " portion" : " portions") + " left on plate " + (i + 1)}>{p.portions === 1 ? "1 left" : "×2"}</span>;
  })}</>;
}
