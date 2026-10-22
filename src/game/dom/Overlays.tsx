/** Sheets over the playfield: brief, game label, pause and results (GAME_PLAN §12.4). */
import { DISHES } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import { factsOf, ITEMS, itemName } from "../content/items";
import { PETS, SKILLS } from "../content/cosmetics";
import { BONUS, hasShare, levelDishes, levelTitle, nextService, SHARE, TWISTS } from "../content/levels";
import type { LevelBest } from "../progress";
import * as sim from "../sim/engine";
import type { Art } from "./Hud";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
/** The personal best of a level that has been cleared before, or null. */
const cleared = (best?: LevelBest | null) => (best && best.clears > 0 ? best : null);

export function Brief({ run, art, petArt, best, leaving, onStart, onExit }: { run: sim.Run; art: Art; petArt: string; best?: LevelBest | null; leaving: boolean; onStart(): void; onExit(): void }) {
  const lv = run.level, record = cleared(best), guests = [...new Set(run.guests.map(g => g.guestId))], pet = PETS[run.pet], skill = SKILLS[pet.skill];
  return <div className={"overlay center" + (leaving ? " out" : "")}><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhBrief">
    <span className="k">Rush · {Math.floor(lv.round / 60)}:{String(lv.round % 60).padStart(2, "0")} · {levelTitle(lv)}</span><h3 id="rhBrief">{lv.special ? DISHES[lv.special.dish].name : lv.name}</h3><p>{lv.brief}</p>
    {lv.special?.lunar && <span className="chip rule" style={{ justifySelf: "start", fontSize: 11 }}>{lv.special.lunar} · {RULES.five.chip}</span>}
    <span className="k">Regulars</span>
    <div className="guestrow">{guests.map(id => { const g = GUESTS[id], rules = [...new Set([...g.rules, ...(lv.allRules ?? [])])];
      return <div key={id}><img src={art[g.art]} alt="" /><b>{g.name}</b>{rules.map(r => <span key={r} className="chip rule">{RULES[r].chip}</span>)}{!rules.length && <span className="chip">No rules</span>}</div>; })}</div>
    <span className="k">On the menu</span>
    <div className="guestrow">{levelDishes(lv).map(d => <div key={d.id}><img src={art[d.art]} alt="" /><b>{d.name}</b></div>)}</div>
    {(lv.twists ?? []).map(t => <div key={t.kind} className="remember twist"><b>{TWISTS[t.kind].name}. </b>{TWISTS[t.kind].text}</div>)}
    {hasShare(lv) && <div className="remember twist"><b>{SHARE.name}. </b>{SHARE.text}</div>}
    <div className="remember" style={{ display: "flex", gap: 8, alignItems: "center" }}><img src={art[petArt] ?? art[pet.art]} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
      <span><b>{pet.name} · {skill.name}</b><br />{skill.effect} Once per service. {skill.best}</span></div>
    <div className="remember"><b>New: </b>{lv.teach}</div>
    {lv.bonus && <div className="remember"><b>{best?.bonus ? "✓ " : ""}Bonus goal · {BONUS[lv.bonus].name}. </b>{BONUS[lv.bonus].text}{best?.bonus ? " Earned before." : ""}</div>}
    {record && <div className="remember pbest"><b>Your best</b><span>{stars(record.stars)}</span><span>{record.score} pts</span>{record.coins > 0 && <span>{record.coins} coins</span>}{record.left > 0 && <span>{record.left} s left</span>}</div>}
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

export function LabelSheet({ run, onClose }: { run: sim.Run; onClose(): void }) {
  const it = ITEMS[run.label!], lab = factsOf(run.label!, run.flip).label!, g = sim.focusGuest(run);
  const flagged = (lab.flagged ?? "").split(",").map(x => x.trim()).filter(Boolean);
  return <div className="overlay"><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhLabel">
    <span className="paused">Clock and patience paused while reading</span>
    <span className="k">Game label · {itemName(it.id)}</span><h3 id="rhLabel">{lab.title}</h3>
    <div className="label-card"><span className="k">Ingredients</span>
      <span>{lab.ingredients.map((x, i) => <span key={i}>{i ? ", " : ""}{flagged.includes(x) ? <mark>{x}</mark> : x}</span>)}</span>
      <span className="k">Contains: {lab.contains}</span></div>
    {g && flagged.length > 0 && <p>{GUESTS[g.guestId].name} keeps {g.rules.length ? g.rules.map(r => RULES[r].spoken).join(" and ") : "a plant-based order"}. Check whether the highlighted ingredient fits.</p>}
    <p>Game product. Real brands vary, so always read the actual label.</p>
    <button className="btn" autoFocus onClick={onClose}>Back to the kitchen</button>
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
export type Reward = { credits: number; first: boolean; mastered: boolean; unlocks: string[]; status?: "settled" | "pending" | "practice" | "rejected"; note?: string;
  /** Which personal bests this service beat ("score", "coins", "time") and whether it earned the bonus stamp for the first time. */
  beat?: string[]; bonus?: boolean };
export function Results({ run, res, reward, best, saveFailed, onRetrySave, onAgain, onCafe, onNext, onCook, onNearby }: {
  run: sim.Run; res: sim.Result; reward: Reward | null; best?: LevelBest | null; saveFailed: boolean; onRetrySave(): void; onAgain(): void; onCafe(): void; onNext(): void;
  /** Bridges into the app (GAME_PLAN §11), when the app has somewhere to send them. */
  onCook?(): void; onNearby?(): void;
}) {
  const head = res.cleared ? (res.stars === 3 ? "Perfect service" : "Level cleared") : res.completed ? "Nearly there" : "Service over";
  const dish = levelDishes(run.level)[0] ?? DISHES[run.guests[0].dishId], record = run.level.special ? null : cleared(best), beat = reward?.beat ?? [];
  const marks = record ? ([["score", record.score + " pts"], ["coins", record.coins > 0 ? record.coins + " coins" : ""], ["time", record.left > 0 ? record.left + " s left" : ""]] as const).filter(([, text]) => text) : [];
  return <div className="overlay center"><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rhRes">
    <span className="k">Rush · {levelTitle(run.level)} · {run.endReason === "time" ? "time's up" : "all guests done"}</span>
    <h3 id="rhRes">{head}</h3>
    <div className="bigstars" aria-label={res.stars + " of 3 stars"}>{[0, 1, 2].map(i => <span key={i} className={i < res.stars ? "lit" : ""} style={{ animationDelay: i * 0.18 + "s" }}>★</span>)}</div>
    <div className="stamps">{([["served", "Served"], ["rules", "Rules respected"], ["steady", "Steady heat"]] as const).map(([k, l]) =>
      <div key={k} className={res.stamps[k] ? "on" : "off"}><b>{res.stamps[k] ? "✓" : "○"}</b>{l}</div>)}</div>
    {res.bonus && <div className={"bonus" + (res.bonus.done ? " on" : "")}><b>{res.bonus.done ? "✓" : "○"} Bonus goal · {res.bonus.name}{reward?.bonus ? " · first time" : ""}</b><span>{res.bonus.text}</span></div>}
    <div className="rgrid"><span>Takings <b>{res.coins} / {res.max}</b></span><span>Served <b>{res.v} of {res.n}</b></span>
      <span>Steady heat <b>{Math.round(res.hq * 100)}%</b></span><span>Service score <b>{res.score}</b></span></div>
    {record && <div className="remember pbest" role="group" aria-label="Personal best"><b>Personal best</b>
      {marks.map(([k, text]) => <span key={k} className={beat.includes(k) ? "new" : ""}>{text}{beat.includes(k) ? " · new" : ""}</span>)}</div>}
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
    {res.cleared && nextService(run.level) && <button className="btn gold" onClick={onNext}>Next: {nextService(run.level)}</button>}
  </div></div>;
}

const svg = { viewBox: "0 0 24 24", "aria-hidden": true, width: 16, height: 16 } as const;
function Gear() { return <svg {...svg}><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /><circle cx="9" cy="7" r="2.6" fill="currentColor" /><circle cx="15" cy="12" r="2.6" fill="currentColor" /><circle cx="8" cy="17" r="2.6" fill="currentColor" /></svg>; }
function Pot() { return <svg {...svg}><path fill="currentColor" d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z" /><path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M9 3.5c1 1.2-1 2.3 0 3.5M12.5 3c1 1.2-1 2.3 0 3.5M16 3.5c1 1.2-1 2.3 0 3.5" /></svg>; }
function Pin() { return <svg {...svg}><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>; }
