/** Top panels over the café (GAME_PLAN §13): the HUD and the recipe card for the guest being cooked for. */
import { useLayoutEffect, useRef, type ReactElement, type Ref } from "react";
import { DISHES, STATIONS } from "../content/dishes";
import { GUESTS, conflicts } from "../content/guests";
import { ITEMS } from "../content/items";
import { levelTitle } from "../content/levels";
import * as sim from "../sim/engine";
import type { Layout, Rect } from "./layout";

export type Art = Record<string, string>;
export const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });

export function Hud({ run, L, coins, eatKey, combo, coinRef, onPause }: {
  run: sim.Run; L: Layout; coins: number; eatKey: number; coinRef: Ref<HTMLSpanElement>; onPause(): void;
  /** Good serves in a row (two or more), keyed so each one pops the chip again. */
  combo: { n: number; key: number } | null;
}) {
  const max = sim.maxCoins(run), secs = Math.ceil(run.timeLeft);
  const frac = Math.min(1, run.timeLeft / run.level.round);
  const allServed = run.guests.every(g => g.order === "served") && coins >= run.coins, left = run.guests.filter(g => g.order === "open").length;
  const live = run.started && !run.ended, late = secs <= 10 && live;
  // As in the owner's mockup: a round gear (pause and Play your way), the clock and takings in one panel, and orders left in a card of its own.
  return <div className="layer hud" style={box(L.hud)}>
    <button className="round gear" onClick={onPause} aria-label="Pause and settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d={GEAR} /></svg></button>
    <div className="hudmain panel">
    <div className={"timer" + (late ? " late" : secs <= 30 && live ? " warm" : "")} role="timer" aria-label={secs + " seconds left"}>
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" className="track" />
        <circle className="arc" cx="22" cy="22" r="19" strokeDasharray="119.4" strokeDashoffset={(119.4 * (1 - frac)).toFixed(1)} /></svg>
      <b>{Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0")}</b>
    </div>
    <div className="takings" aria-label={"Takings " + coins + " of " + max}>
      <div className="coins"><span ref={coinRef} key={eatKey} className={"ico" + (eatKey ? " eat" : "")} /><b key={"b" + eatKey} className={eatKey ? "bump" : undefined}>{coins}</b>
        {combo && <span key={combo.key} className="combo" aria-label={combo.n + " good serves in a row"}>×{combo.n}</span>}
        <small>{levelTitle(run.level)}</small></div>
      <div className="bar"><i style={{ width: Math.min(100, coins / max * 100) + "%" }} />
        {[[0, 25], [0.75, 75], [0.9, 90]].map(([f, at], i) => <span key={i} className={"star" + (allServed && coins >= Math.ceil(f * max) ? " lit" : "")} style={{ left: at + "%" }}>★</span>)}
      </div>
    </div>
    </div>
    <div className="left panel" aria-label={left + " orders left"}><b>{left}</b><small>left</small></div>
  </div>;
}

const GEAR = "M10.3 2h3.4l.5 2.6a7.6 7.6 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.7 7.7 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.6 7.6 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.6 7.6 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.7 7.7 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.6 7.6 0 0 1 1.9-1.1zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z";

/** What to do next for the focused dish, from the first part that is not finished. */
/**
 * Whether this guest's paste is already poured: pastes of the dish in a station or on a plate, by portions, cover the guests waiting for
 * it in queue order (as the test player counts them), so a second order of the same dish still shows its own blend.
 */
function poured(run: sim.Run, g: sim.GuestRun, made?: string) {
  if (!made) return false;
  const has = (items: string[]) => items.includes(made);
  const ready = Object.values(run.stations).reduce((n, s) => n + (s?.part?.dishId === g.dishId && has(s.part.items.map(i => i.id)) ? s.part.portions : 0), 0)
    + run.board.reduce((n, p) => n + (p && p.dishId === g.dishId && p.parts.some(x => has(x.items)) ? p.portions : 0), 0);
  return ready >= sim.waiting(run).filter(x => x.dishId === g.dishId).indexOf(g) + 1;
}
/** "Add the ginger" from a hint that names ingredients; a hint that already gives the move ("soften onion in warm oil") reads as it is. */
const addHint = (hint: string) => /^(add|soften|fry|stir|toss|cook|warm|heat|simmer|steam|bake|blend|fold|chill|mix|spread|toast|pour|drain|blanch|brown|sear)/i.test(hint.trim())
  ? hint.trim()[0].toUpperCase() + hint.trim().slice(1) : "Add " + hint;

function nextStep(run: sim.Run, g: sim.GuestRun): string {
  const dishId = g.dishId;
  const dish = DISHES[dishId];
  for (const part of dish.parts) {
    if (run.board.some(p => p && p.dishId === dishId && p.parts.some(x => x.partId === part.id))) continue;
    if (poured(run, g, part.makes)) continue;
    const pr = run.stations[part.station]?.part;
    if (pr && pr.partId === part.id) {
      if (pr.state === "ready" && STATIONS[part.station].burnAfter && pr.exposure > 1.5) return "Take it out now, before it spoils";
      if (pr.state === "ready" && part.makes) { const to = dish.parts.find(p => p !== part && p.stages.some(sg => sg.slots.some(sl => sl.accepts.includes(part.makes!)))); return "Ready: pour it onto the " + (to ? STATIONS[to.station].name.toLowerCase() : "next station"); }
      if (pr.state === "ready") return "Ready: drag to the plates";
      if (pr.state === "scorched" || pr.state === "split") return "Restart it, it's free";
      const turn = !pr.turned ? sim.stageOf(pr).turn : undefined, cfg = STATIONS[part.station];
      if (pr.state === "cooking" && turn === "fold") return "Fold it: drag the fold onto the board";
      if (pr.state === "cooking" && turn === "flip") return pr.progress >= 0.5 ? "Flip it: drag the spatula on" : "Flip it at halfway";
      if (pr.state === "cooking" && run.knob && cfg.heat && !cfg.thermostat) return pr.progress >= sim.KNOB.early ? "Take it off on the gold star"
        : run.stations[part.station]!.heatOn ? "Cooking: hold Heat to change the flame" : "Hold Heat, let go in the band";
      if (pr.state === "cooking") return cfg.heat ? "Keep it in the heat band" : cfg.name + " is cooking";
      return addHint(sim.stageOf(pr).hint);
    }
    // An oven or fryer must be hot before the first ingredient goes in.
    const st = run.stations[part.station], cfg = STATIONS[part.station];
    if (cfg.preheat && st && !st.part && st.H < (part.stages[0].band ?? cfg.band)[0]) return "Preheat the " + cfg.name.toLowerCase() + " first";
    return addHint(part.stages[0].hint);
  }
  return run.board.some(p => p && p.dishId === dishId && p.shared) ? "Plated for two: drag it to each guest" : "Plated: drag it to the guest";
}

/** A long dish and guest name steps the title down a size or two rather than cutting it off. */
/**
 * Sizes the order title to the card: the largest of 18, 15, 13, 12 and 11 px (times the text size) at which the dish name and
 * "for <guest>" both show in full, measured on the page after the fonts load. The guest line keeps at most 12 px.
 */
function useTitleFit(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => {
      const [b, small] = [el.querySelector("b"), el.querySelector("small")] as (HTMLElement | null)[];
      for (const px of [18, 15, 13, 12, 11]) {
        el.style.fontSize = `calc(${px}px * var(--ts, 1))`; if (small) small.style.fontSize = `calc(${Math.min(12, px - 1)}px * var(--ts, 1))`;
        if ((!b || b.scrollWidth <= b.clientWidth + 1) && (!small || small.scrollWidth <= small.clientWidth + 1)) break;
      }
    };
    fit(); let live = true; document.fonts?.ready.then(() => { if (live) fit(); });
    return () => { live = false; };
  }, [key]);
  return ref;
}

/** Slots for the focused guest's dish: done, filled, wanted next, or empty; then the next step while hints are on. */
export function RecipeCard({ run, L, art }: { run: sim.Run; L: Layout; art: Art }) {
  const g = sim.focusGuest(run);
  // Measured whenever what the title says or its room changes (called before the empty card returns, as hooks must be).
  const title = useTitleFit(g ? [g.orderId, g.dishId, sim.mates(run, g).length, L.recipe.w, L.ts, run.level.hints].join("|") : "");
  if (!g) return <div className="layer recipe panel" style={box(L.recipe)}><span className="idle">{run.started ? "Waiting for the next guest" : "Orders show here"}</span></div>;
  const dish = DISHES[g.dishId], chips: ReactElement[] = [], table = sim.tableRules(run, g), pot = sim.mates(run, g), who = [g, ...pot].map(x => GUESTS[x.guestId].name).join(" + ");
  dish.parts.forEach((part, pi) => {
    const st = run.stations[part.station], pr = st?.part && st.part.partId === part.id ? st.part : null;
    const onBoard = run.board.some(p => p && p.dishId === dish.id && p.parts.some(x => x.partId === part.id)) || poured(run, g, part.makes);
    if (pi) chips.push(<span key={"s" + pi} className="sep" />);
    part.stages.forEach((stage, si) => stage.slots.forEach(slot => {
      const found = pr?.items.find(x => x.stage === si && slot.accepts.includes(x.id));
      const done = onBoard || (pr ? si < pr.stage || pr.state === "ready" : false) || !!found;
      const want = !done && (pr ? si === pr.stage : si === 0);
      // Early levels show the ingredient that suits the guest; once hints fade, an unfilled slot shows its first option in grey, which gives nothing away.
      const safe = run.level.hints !== "none" ? slot.accepts.find(id => !conflicts([id], table, run.flip).length) ?? slot.accepts[0] : slot.accepts[0], key = ITEMS[found?.id ?? safe]?.art;
      chips.push(<span key={part.id + si + slot.key} className={"step" + (done ? " done" : want ? " want" : " empty") + (slot.optional ? " opt" : "") + (found?.warn ? " bad" : "")} title={slot.label}>
        {key && <img src={art[key]} alt="" />}{done && <span className="tick">{found?.warn ? "!" : "✓"}</span>}</span>);
    }));
  });
  // The guest's bubble shows their rules, so the card never repeats them (owner, 22 Oct).
  const hints = run.level.hints !== "none", forWho = GUESTS[g.guestId].name + (pot.length > 0 ? " +" + pot.length : "");
  // Keyed by order, so the card slides in fresh when the cook switches guests.
  return <div key={g.orderId} className="layer recipe panel" style={box(L.recipe)} aria-label={dish.name + " for " + who}>
    <img className="bowl" src={art[dish.art]} alt="" />
    {/* The title spans the card; the next-step hint sits beside the ingredient strip, so a long dish and guest name both fit. */}
    <div className="mid"><div ref={title} className="t"><b>{dish.name}</b><small> for {forWho}</small></div>
      <div className="row2"><div className="steps">{chips}</div>{hints && <span className="hint">{nextStep(run, g)}</span>}</div></div>
  </div>;
}
