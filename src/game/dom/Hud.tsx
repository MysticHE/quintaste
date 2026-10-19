/** Top panels over the café (GAME_PLAN §13): the HUD and the recipe card for the guest being cooked for. */
import type { ReactElement, Ref } from "react";
import { DISHES } from "../content/dishes";
import { GUESTS, RULES, conflicts } from "../content/guests";
import { ITEMS } from "../content/items";
import * as sim from "../sim/engine";
import type { Layout, Rect } from "./layout";

export type Art = Record<string, string>;
export const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });

export function Hud({ run, L, coins, eatKey, coinRef, list, quietList, onList, onPause }: {
  run: sim.Run; L: Layout; coins: number; eatKey: number; coinRef: Ref<HTMLSpanElement>; list: boolean; quietList: boolean; onList(): void; onPause(): void;
}) {
  const max = sim.maxCoins(run), secs = Math.ceil(run.timeLeft);
  const frac = Math.min(1, run.timeLeft / run.level.round);
  const allServed = run.guests.every(g => g.order === "served") && coins >= run.coins, left = run.guests.filter(g => g.order === "open").length;
  const live = run.started && !run.ended, late = secs <= 10 && live;
  return <div className="layer hud panel" style={box(L.hud)}>
    <button className="round" onClick={onPause} aria-label="Pause"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg></button>
    <div className={"timer" + (late ? " late" : secs <= 30 && live ? " warm" : "")} role="timer" aria-label={secs + " seconds left"}>
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" className="track" />
        <circle className="arc" cx="22" cy="22" r="19" strokeDasharray="119.4" strokeDashoffset={(119.4 * (1 - frac)).toFixed(1)} /></svg>
      <b>{Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0")}</b>
    </div>
    <div className="takings" aria-label={"Takings " + coins + " of " + max}>
      <div className="coins"><span ref={coinRef} key={eatKey} className={"ico" + (eatKey ? " eat" : "")} /><b>{coins}</b>
        <small>{run.level.special ? "Today's special" : "Level " + run.level.n}</small></div>
      <div className="bar"><i style={{ width: Math.min(100, coins / max * 100) + "%" }} />
        {[[0, 25], [0.75, 75], [0.9, 90]].map(([f, at], i) => <span key={i} className={"star" + (allServed && coins >= Math.ceil(f * max) ? " lit" : "")} style={{ left: at + "%" }}>★</span>)}
      </div>
    </div>
    <div className="left" aria-label={left + " orders left"}><b>{left}</b><small>left</small></div>
    <button className={"listbtn" + (quietList ? " quiet" : "")} aria-pressed={list} onClick={onList} aria-label={list ? "Back to the scene" : "Station list"}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="3" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>{list ? "Scene" : "List"}</button>
  </div>;
}

/** What to do next for the focused dish, from the first part that is not finished. */
function nextStep(run: sim.Run, dishId: string, tapOnly: boolean): string {
  const dish = DISHES[dishId];
  for (const part of dish.parts) {
    if (run.board.some(p => p && p.dishId === dishId && p.parts.some(x => x.partId === part.id))) continue;
    const pr = run.stations[part.station]?.part;
    if (pr && pr.partId === part.id) {
      if (pr.state === "ready") return tapOnly ? "Ready: tap to plate" : "Ready: drag to the plates";
      if (pr.state === "scorched" || pr.state === "split") return "Restart it, it's free";
      if (pr.state === "cooking") return "Keep it in the heat band";
      return "Add " + sim.stageOf(pr).hint;
    }
    return "Add " + part.stages[0].hint;
  }
  return tapOnly ? "Plated: tap the guest" : "Plated: drag it to the guest";
}

/** Slots for the focused guest's dish: done, filled, wanted next, or empty; then the next step (or the rules once hints fade). */
export function RecipeCard({ run, L, art, tapOnly }: { run: sim.Run; L: Layout; art: Art; tapOnly: boolean }) {
  const g = sim.focusGuest(run);
  if (!g) return <div className="layer recipe panel" style={box(L.recipe)}><span className="idle">{run.started ? "Waiting for the next guest" : "Orders show here"}</span></div>;
  const dish = DISHES[g.dishId], chips: ReactElement[] = [];
  dish.parts.forEach((part, pi) => {
    const st = run.stations[part.station], pr = st?.part && st.part.partId === part.id ? st.part : null;
    const onBoard = run.board.some(p => p && p.dishId === dish.id && p.parts.some(x => x.partId === part.id));
    if (pi) chips.push(<span key={"s" + pi} className="sep" />);
    part.stages.forEach((stage, si) => stage.slots.forEach(slot => {
      const found = pr?.items.find(x => x.stage === si && slot.accepts.includes(x.id));
      const done = onBoard || (pr ? si < pr.stage || pr.state === "ready" : false) || !!found;
      const want = !done && (pr ? si === pr.stage : si === 0);
      // Early levels show the ingredient that suits the guest; once hints fade, an unfilled slot shows its first option in grey, which gives nothing away.
      const safe = run.level.hints !== "none" ? slot.accepts.find(id => !conflicts([id], g.rules, run.flip).length) ?? slot.accepts[0] : slot.accepts[0], key = ITEMS[found?.id ?? safe]?.art;
      chips.push(<span key={part.id + si + slot.key} className={"step" + (done ? " done" : want ? " want" : " empty") + (slot.optional ? " opt" : "") + (found?.warn ? " bad" : "")} title={slot.label}>
        {key && <img src={art[key]} alt="" />}{done && <span className="tick">{found?.warn ? "!" : "✓"}</span>}</span>);
    }));
  });
  const rules = g.rules.map(r => <span key={r} className="rule">{RULES[r].chip}</span>), hints = run.level.hints !== "none";
  return <div className="layer recipe panel" style={box(L.recipe)} aria-label={dish.name + " for " + GUESTS[g.guestId].name}>
    <img className="bowl" src={art[dish.art]} alt="" />
    <div className="mid"><div className="t"><b>{dish.name}</b><small> for {GUESTS[g.guestId].name}</small>{hints && rules}</div><div className="steps">{chips}</div></div>
    {hints ? <span className="hint">{nextStep(run, g.dishId, tapOnly)}</span> : rules.length > 0 && <span className="hint rules">{rules}</span>}
  </div>;
}
