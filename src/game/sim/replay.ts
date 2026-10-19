/**
 * Server replay (GAME_PLAN §12.3, Phase B): rebuilds a run from its setup and input log with the same simulation the
 * player used, so the API settles credits from what actually happened rather than from what the client claims.
 * Pure TypeScript, no DOM: the Node API loads this file directly.
 */
import { STATIONS, DISHES, type StationKind } from "../content/dishes";
import { GUESTS, RULES } from "../content/guests";
import { ITEMS } from "../content/items";
import { LEVELS, levelByNumber, type Level } from "../content/levels";
import { CREDIT_REWARDS, PETS, SKILLS } from "../content/cosmetics";
import * as sim from "./engine";
import { emptyGame, type GameProgress } from "../progress";
import { specialFor } from "../special";

/** Bump when engine.ts changes how a run plays out; content changes are picked up by the hash automatically. */
const ENGINE_VERSION = 4;
/**
 * What a run was started with. A Today's special is rebuilt from its Singapore date and the highest level the player had
 * cleared when it started (`top`); `hints` is the Play your way hint setting the run used.
 */
export type RunSetup = { level: number; special?: { day: string; top: number } | null; hints?: Level["hints"] | null; pet: string; signature: string[];
  /** The service's seed: arrivals, shuffled jars and twists. The app derives it from the run's id (`seedOf`), the server from the stored id. */
  seed: number };

/** What the app sends when a service starts; the server turns `special` (a date) into its stored setup. */
export type RunStart = { id: string; level: number; special: string | null; top?: number | null; hints: Level["hints"] | null; pet: string; signature: string[] };

/** A player who has cleared Levels 1..top: enough to rebuild the same special the player saw. */
export const progressAt = (top: number): GameProgress => {
  const g = emptyGame();
  for (let n = 1; n <= top; n++) g.best[n] = { stars: 1, score: 75, served: true, rules: true, steady: false, mastered: false, clears: 1, bonus: false, coins: 0, left: 0 };
  return g;
};
/** The level a setup plays: a numbered level, or the special for its date. Throws ReplayError when it cannot exist. */
export function setupLevel(setup: RunSetup): Level {
  if (setup.special) {
    const top = int(setup.special.top, LEVELS.length), sp = specialFor(progressAt(top), String(setup.special.day));
    if (!sp) throw new ReplayError("no special");
    return sp.level;
  }
  const lv = LEVELS[setup.level - 1];
  if (!lv) throw new ReplayError("bad level");
  return levelByNumber(setup.level);
}
const hintsOf = (setup: RunSetup) => setup.hints === "full" || setup.hints === "chip" || setup.hints === "none" ? setup.hints : undefined;
export const MAX_ACTIONS = 6000;

/** FNV-1a over the rules content and the engine version: client and server must agree before a run can settle. */
function computeRulesVersion() {
  const text = JSON.stringify({ e: ENGINE_VERSION, LEVELS, DISHES, STATIONS, GUESTS, RULES, ITEMS, PETS, SKILLS, CREDIT_REWARDS });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
export const rulesVersion = computeRulesVersion();

export class ReplayError extends Error {}
const kinds = new Set(Object.keys(STATIONS));
const station = (v: unknown) => { if (typeof v !== "string" || !kinds.has(v)) throw new ReplayError("bad station"); return v as StationKind; };
const word = (v: unknown) => { if (typeof v !== "string" || !/^[a-z0-9-]{1,40}$/.test(v)) throw new ReplayError("bad id"); return v; };
const int = (v: unknown, max: number) => { if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > max) throw new ReplayError("bad number"); return v as number; };

function apply(r: sim.Run, [, op, a, b]: sim.Action) {
  switch (op) {
    case "start": return sim.start(r);
    case "focus": return sim.setFocus(r, word(a));
    case "select": return sim.select(r, station(a));
    case "place": return void sim.place(r, word(a), station(b));
    case "lift": return sim.lift(r, station(a), int(b, 1_000_000));
    case "restart": return sim.restart(r, station(a));
    case "heat": return sim.toggleHeat(r, station(a));
    case "label": return sim.openLabel(r, word(a));
    case "close": return sim.closeLabel(r);
    case "pause": if (typeof a !== "boolean") throw new ReplayError("bad pause"); return sim.pause(r, a);
    case "plate": return void sim.plate(r, station(a));
    case "serve": return sim.serve(r, int(a, 10), word(b));
    case "skill": return void sim.useSkill(r);
    case "quit": return sim.quit(r);
    default: throw new ReplayError("unknown action");
  }
}

/** Highest tick count an honest run can reach: the round plus the clock skill. */
export function tickLimit(setup: RunSetup) {
  return Math.ceil((setupLevel(setup).round + 12) / sim.DT) + 2;
}

/**
 * Replays the inputs on their ticks and then lets the run play out. Throws ReplayError when the log could not have come
 * from a real service: out of order, an input while time could not move, too long, or a run that never ends.
 */
export function replay(setup: RunSetup, actions: unknown): sim.Run {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS) throw new ReplayError("bad log");
  const limit = tickLimit(setup), r = sim.createRun(setupLevel(setup), setup.pet, setup.signature, hintsOf(setup), int(setup.seed, 0xffffffff));
  const advanceTo = (tick: number) => {
    while (r.ticks < tick) {
      const before = r.ticks;
      if (r.ended) throw new ReplayError("input after the end");
      sim.tick(r); r.events.length = 0;
      if (r.ticks === before) throw new ReplayError("input while time was stopped");
    }
  };
  for (const raw of actions) {
    if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4 || typeof raw[1] !== "string") throw new ReplayError("bad action");
    const tick = int(raw[0], limit);
    if (tick < r.ticks) throw new ReplayError("out of order");
    advanceTo(tick);
    apply(r, raw as sim.Action); r.events.length = 0;
  }
  while (!r.ended && r.ticks < limit) {
    const before = r.ticks;
    sim.tick(r); r.events.length = 0;
    if (r.ticks === before) break;
  }
  if (!r.ended) throw new ReplayError("run did not finish");
  return r;
}

/** The parts of a result that must match exactly between the player's device and the replay. */
export function sameResult(a: sim.Result, b: Partial<sim.Result> | null | undefined) {
  return !!b && a.stars === b.stars && a.score === b.score && a.cleared === b.cleared && a.coins === b.coins && a.v === b.v && a.n === b.n &&
    a.left === b.left && (a.bonus?.done ?? false) === (b.bonus?.done ?? false) && !!b.stamps && a.stamps.served === b.stamps.served && a.stamps.rules === b.stamps.rules && a.stamps.steady === b.stamps.steady;
}
