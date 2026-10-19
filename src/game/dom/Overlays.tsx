/** Sheets over the playfield: brief, game label, pause, results, and the station list mode (GAME_PLAN §12.4). */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import { ITEMS, itemName } from "../content/items";
import { PETS, SKILLS } from "../content/cosmetics";
import { levelDishes } from "../content/levels";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";
import { shelfItems } from "./Shelf";
import type { Layout } from "./layout";

export function Brief({ run, art, petArt, leaving, onMode, onStart, onExit }: { run: sim.Run; art: Art; petArt: string; leaving: boolean; onMode(m: "rush" | "calm"): void; onStart(): void; onExit(): void }) {
  const lv = run.level, guests = [...new Set(run.guests.map(g => g.guestId))], pet = PETS[run.pet], skill = SKILLS[pet.skill];
  return <div className={"overlay center" + (leaving ? " out" : "")}><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhBrief">
    <span className="k">Before service · {lv.special ? "Today's special" : "Level " + lv.n}</span><h3 id="rhBrief">{lv.special ? DISHES[lv.special.dish].name : lv.name}</h3><p>{lv.brief}</p>
    {lv.special?.lunar && <span className="chip rule" style={{ justifySelf: "start", fontSize: 11 }}>{lv.special.lunar} · {RULES.five.chip}</span>}
    <span className="k">Regulars</span>
    <div className="guestrow">{guests.map(id => { const g = GUESTS[id], rules = [...new Set([...g.rules, ...(lv.allRules ?? [])])];
      return <div key={id}><img src={art[g.art]} alt="" /><b>{g.name}</b>{rules.map(r => <span key={r} className="chip rule">{RULES[r].chip}</span>)}{!rules.length && <span className="chip">No rules</span>}</div>; })}</div>
    <span className="k">On the menu</span>
    <div className="guestrow">{levelDishes(lv).map(d => <div key={d.id}><img src={art[d.art]} alt="" /><b>{d.name}</b></div>)}</div>
    {lv.round !== null ? <div className="seg" role="group" aria-label="Mode">
      <button aria-pressed={run.mode === "rush"} onClick={() => onMode("rush")}>Rush · {Math.floor(lv.round / 60)}:{String(lv.round % 60).padStart(2, "0")}</button>
      <button aria-pressed={run.mode === "calm"} onClick={() => onMode("calm")}>Calm · no clock</button></div> : <p>Level 1 has no clock.</p>}
    {run.mode === "rush" && <div className="remember" style={{ display: "flex", gap: 8, alignItems: "center" }}><img src={art[petArt] ?? art[pet.art]} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
      <span><b>{pet.name} · {skill.name}</b><br />{skill.effect} Once per service. {skill.best}</span></div>}
    <div className="remember"><b>New: </b>{lv.teach}</div>
    <div className="row"><button className="btn ghost" onClick={onExit} disabled={leaving}>Back to café</button><button className="btn" autoFocus onClick={onStart} disabled={leaving}>Start service</button></div>
  </div></div>;
}

/** Shown over everything when the screen is too short for the portrait playfield (a phone turned sideways); the service waits. */
export function TooShort() {
  return <div className="overlay center" style={{ zIndex: 60 }}><div className="sheet" role="alert">
    <span className="k">Paused</span><h3>Turn your phone upright</h3>
    <p>The kitchen needs more height than this screen has. Turn the phone upright, or make the window taller, and the service carries on where it stopped.</p>
  </div></div>;
}

export function LabelSheet({ run, onClose, onUse }: { run: sim.Run; onClose(): void; onUse(id: string): void }) {
  const it = ITEMS[run.label!], lab = it.label!, g = sim.focusGuest(run);
  const flagged = (lab.flagged ?? "").split(",").map(x => x.trim()).filter(Boolean);
  return <div className="overlay"><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhLabel">
    <span className="paused">Clock and patience paused while reading</span>
    <span className="k">Game label · {itemName(it.id)}</span><h3 id="rhLabel">{lab.title}</h3>
    <div className="label-card"><span className="k">Ingredients</span>
      <span>{lab.ingredients.map((x, i) => <span key={i}>{i ? ", " : ""}{flagged.includes(x) ? <mark>{x}</mark> : x}</span>)}</span>
      <span className="k">Contains: {lab.contains}</span></div>
    {g && flagged.length > 0 && <p>{GUESTS[g.guestId].name} keeps {g.rules.length ? g.rules.map(r => RULES[r].spoken).join(" and ") : "a vegetarian order"}. Check whether the highlighted ingredient fits.</p>}
    <p>Game product. Real brands vary, so always read the actual label.</p>
    <div className="row"><button className="btn ghost" autoFocus onClick={onClose}>Back</button><button className="btn" onClick={() => onUse(it.id)}>Use it</button></div>
  </div></div>;
}

export function PauseSheet({ onResume, onRestart, onQuit, onSettings }: { onResume(): void; onRestart(): void; onQuit(): void; onSettings?(): void }) {
  return <div className="overlay center"><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhPause">
    <div className="sheethead"><span className="k">Paused</span>{onSettings && <button className="linkpill" onClick={onSettings}><Gear />Play your way</button>}</div>
    <h3 id="rhPause">Heat is off. Everything waits.</h3>
    <p>The clock, cooking and every guest&apos;s patience stop together. Resuming never turns the heat back on.</p>
    <div className="row"><button className="btn ghost" onClick={onQuit}>Back to café</button><button className="btn ghost" onClick={onRestart}>Restart</button></div>
    <button className="btn" autoFocus onClick={onResume}>Resume</button>
  </div></div>;
}

/** Settled (or a guest's device save), pending until the account confirms it, practice (started offline) or refused. */
export type Reward = { credits: number; first: boolean; mastered: boolean; unlocks: string[]; status?: "settled" | "pending" | "practice" | "rejected"; note?: string };
export function Results({ run, res, reward, saveFailed, onRetrySave, onAgain, onCafe, onNext, onCook, onNearby }: {
  run: sim.Run; res: sim.Result; reward: Reward | null; saveFailed: boolean; onRetrySave(): void; onAgain(): void; onCafe(): void; onNext(): void;
  /** Bridges into the app (GAME_PLAN §11), when the app has somewhere to send them. */
  onCook?(): void; onNearby?(): void;
}) {
  const head = res.cleared ? (res.stars === 3 ? "Perfect service" : "Level cleared") : res.completed ? "Nearly there" : "Service over";
  const dish = levelDishes(run.level)[0] ?? DISHES[run.guests[0].dishId];
  return <div className="overlay center"><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhRes">
    <span className="k">{run.mode === "rush" ? "Rush" : "Calm"} · {run.level.special ? "Today's special" : "Level " + run.level.n} · {run.endReason === "time" ? "time's up" : "all guests done"}</span>
    <h3 id="rhRes">{head}</h3>
    <div className="bigstars" aria-label={res.stars + " of 3 stars"}>{[0, 1, 2].map(i => <span key={i} className={i < res.stars ? "lit" : ""} style={{ animationDelay: i * 0.18 + "s" }}>★</span>)}</div>
    <div className="stamps">{([["served", "Served"], ["rules", "Rules respected"], ["steady", "Steady heat"]] as const).map(([k, l]) =>
      <div key={k} className={res.stamps[k] ? "on" : "off"}><b>{res.stamps[k] ? "✓" : "○"}</b>{l}</div>)}</div>
    <div className="rgrid"><span>Takings <b>{res.coins} / {res.max}</b></span><span>Served <b>{res.v} of {res.n}</b></span>
      <span>Steady heat <b>{Math.round(res.hq * 100)}%</b></span><span>Service score <b>{res.score}</b></span></div>
    <div className="remember"><b>One thing to remember. </b>{dish?.remember}</div>
    {(onCook || onNearby) && <div className="bridges" role="group" aria-label={"Take " + (dish?.name ?? "it") + " further"}>
      {onCook && <button className="linkpill" onClick={onCook}><Pot />Cook it for real</button>}
      {onNearby && <button className="linkpill" onClick={onNearby}><Pin />Find it nearby</button>}
    </div>}
    {reward && (reward.credits > 0 || reward.unlocks.length > 0) && <div className="remember">
      {reward.credits > 0 && <><b>+{reward.credits} café credits{reward.status === "pending" ? " pending" : ""}</b>{reward.first ? " · first clear" : reward.mastered ? " · mastered" : " · replay"}<br /></>}
      {reward.unlocks.length > 0 && <>Unlocked: {reward.unlocks.join(", ")}</>}</div>}
    {reward?.note && <div className="remember" role="status">{reward.note}</div>}
    {saveFailed && <div className="remember" role="alert"><b>Progress not saved yet.</b> <button className="btn ghost" onClick={onRetrySave} style={{ marginTop: 6, width: "100%" }}>Try saving again</button></div>}
    <p>Coins reset every service. Play again any time; nothing is lost.</p>
    <div className="row"><button className="btn ghost" autoFocus onClick={onCafe}>Back to café</button><button className="btn ghost" onClick={onAgain}>Play again</button></div>
    {res.cleared && !run.level.special && run.level.n < 20 && <button className="btn gold" onClick={onNext}>Next: Level {run.level.n + 1}</button>}
  </div></div>;
}

/** Text-only station list driven by the same simulation, for screen readers and switch access. */
export function ListView({ run, L, act, onBack }: { run: sim.Run; L: Layout; onBack(): void; act: {
  focus(id: string): void; add(id: string, k: StationKind): void; label(id: string): void; heat(k: StationKind): void;
  plate(k: StationKind): void; restart(k: StationKind): void; lift(k: StationKind, uid: number): void; serve(slot: number, id: string): void; } }) {
  const g = sim.focusGuest(run);
  return <div className="list" role="region" aria-label="Station list" style={{ left: L.recipe.x, width: L.recipe.w, top: L.recipe.y, bottom: L.h - L.dialogue.y + 6 }}>
    <button className="btn ghost" onClick={onBack}>Back to the scene</button>
    <section><h4>Guests</h4>{run.guests.filter(x => x.state !== "queue" && x.state !== "gone").map(x => <div key={x.orderId}>
      <div className="line">Seat {x.seat} · {GUESTS[x.guestId].name} · {DISHES[x.dishId].name} · {x.rules.length ? x.rules.map(r => RULES[r].chip).join(", ") : "No rules"} · {x.order === "served" ? "Served" : run.focus === x.orderId ? "Cooking for" : "Waiting"}{run.mode === "rush" && x.state === "waiting" ? " · patience " + Math.ceil(x.patience / run.level.patience * 5) + " of 5" : ""}</div>
      {x.state === "waiting" && run.focus !== x.orderId && <div className="acts"><button onClick={() => act.focus(x.orderId)}>Cook for {GUESTS[x.guestId].name}</button></div>}</div>)}</section>
    {(Object.keys(run.stations) as StationKind[]).map(k => { const st = run.stations[k]!, pr = st.part, cfg = STATIONS[k], [lo, hi] = sim.bandOf(st, pr);
      return <section key={k}><h4>{cfg.name}</h4>
        <div className="line">{cfg.heat ? "Heat " + Math.round(st.H * 100) + "% (target " + Math.round(lo * 100) + "–" + Math.round(hi * 100) + "%) · " : ""}{pr ? sim.partOf(pr).name + ": " + pr.state + " " + Math.round(pr.progress * 100) + "% · step " + (pr.stage + 1) + " needs " + sim.stageOf(pr).hint : "Empty"}</div>
        <div className="acts">{cfg.heat && <button onClick={() => act.heat(k)}>{st.heatOn ? "Turn heat off" : "Turn heat on"}</button>}
          {pr?.state === "ready" && <button onClick={() => act.plate(k)}>Plate</button>}{pr && <button onClick={() => act.restart(k)}>Restart</button>}
          {pr?.items.filter(i => i.stage === pr.stage).map(i => <button key={i.uid} onClick={() => act.lift(k, i.uid)}>Lift {itemName(i.id)}</button>)}</div></section>; })}
    <section><h4>Shelves{g ? " for " + GUESTS[g.guestId].name : ""}</h4><div className="acts">{shelfItems(run).map(id => <span key={id} style={{ display: "contents" }}>
      <button onClick={() => act.add(id, sim.targetStation(run, id))}>Add {itemName(id)}</button>{ITEMS[id].label && <button onClick={() => act.label(id)}>Read label {itemName(id)}</button>}</span>)}</div></section>
    <section><h4>Plating board</h4>{run.board.map((p, i) => p ? <div key={i}><div className="line">Plate {i + 1}: {DISHES[p.dishId].name}{sim.plateComplete(p) ? "" : " (half)"} with {p.parts.flatMap(x => x.items).map(itemName).join(", ")}</div>
      <div className="acts">{sim.plateComplete(p) && sim.waiting(run).map(x => <button key={x.orderId} onClick={() => act.serve(i, x.orderId)}>Serve {GUESTS[x.guestId].name}</button>)}</div></div> : null)}
      {run.board.every(p => !p) && <div className="line">The board is empty.</div>}</section>
  </div>;
}

const svg = { viewBox: "0 0 24 24", "aria-hidden": true, width: 16, height: 16 } as const;
function Gear() { return <svg {...svg}><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /><circle cx="9" cy="7" r="2.6" fill="currentColor" /><circle cx="15" cy="12" r="2.6" fill="currentColor" /><circle cx="8" cy="17" r="2.6" fill="currentColor" /></svg>; }
function Pot() { return <svg {...svg}><path fill="currentColor" d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z" /><path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M9 3.5c1 1.2-1 2.3 0 3.5M12.5 3c1 1.2-1 2.3 0 3.5M16 3.5c1 1.2-1 2.3 0 3.5" /></svg>; }
function Pin() { return <svg {...svg}><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>; }
