/**
 * Rush Hour simulation: pure TypeScript, no Phaser or DOM (GAME_PLAN §12.3). The renderer calls actions and tick(),
 * then drains `run.events` for animation. Every service is a Rush (a clock and guests' patience); a seed decides the
 * shuffled jars, arrivals and twists (sim/plan.ts), so a run replays exactly from its inputs and its seed.
 */
import { DISHES, dishesVersion, STATIONS, TURN_TOOL, type Part, type Stage, type StationKind } from "../content/dishes";
import { GUESTS, conflicts, reason, RULES, unionRules, type Rule } from "../content/guests";
import { ITEMS, itemName, type Flip } from "../content/items";
import { BONUS, levelByNumber, MAX_STATIONS, type BonusKind, type Level } from "../content/levels";
import { PETS, SKILLS } from "../content/cosmetics";
import { buildPlan, dishFeasible, FLARE_WARN, VIP_PATIENCE, type Plan } from "./plan";

export { dishFeasible, seedOf } from "./plan";
export const DT = 0.05;
const BOARD_SLOTS = 3, WALK = 1, EAT = 1.4, LEAVE = 1;
/** Heat a flare adds to a burner that is on, and the extra a VIP pays. */
const FLARE_HEAT = 0.22, VIP_TIP = 4;
/** A pot cooked for two guests takes this much longer at every step. */
export const BATCH_SLOW = 1.5;
/** Seconds a dish on the griddle can wait at halfway for its flip before the underside burns. */
export const FLIP_GRACE = 4;
/**
 * Knob and cook timer (prototype, development builds, owner 22 Oct 2026): the flame holds where the player lets go of the heat
 * button, and a heated step ends on the player's Take off as the timer reaches its gold star. rate: how fast the heat settles on
 * the knob (per second); early: progress from which a step can come off. The rest is tuned per service (KnobTune).
 */
export const KNOB = { rate: 3, early: 0.8 } as const;
/**
 * How a knob service is tuned (owner, 23 Oct 2026: harder by chapter, an Assist option, flips and folds on the timer).
 * perfect: seconds either side of done that count as on the star; grace: seconds past done before the step comes off by itself,
 * overcooked; turn: seconds after a flip or fold is due in which it is on time (seeing the call and dragging the tool on takes a second or more); speed and wobble: how fast the held needle climbs
 * (heat a second) and how much it wavers (1 is the first prototype's); snap: how near the band a let-go still lands inside it.
 * Speed, wobble and snap belong to the heat panel (dom/Knob.tsx): the simulation only ever sees where the knob was let go.
 */
export type KnobTune = { chapter: number; assist: boolean; perfect: number; grace: number; turn: number; speed: number; wobble: number; snap: number };
/** Chapter 1 is gentle and Chapter 10 tight; Assist slows and steadies the needle, catches near misses and widens every window. */
export function knobTune(n: number, assist: boolean): KnobTune {
  const chapter = Math.min(10, Math.max(1, Math.ceil(n / 10))), k = (chapter - 1) / 9;
  const t = { chapter, assist, perfect: 0.35 - 0.15 * k, grace: 2.5 - k, turn: 2 - 0.6 * k, speed: 0.75 + 0.35 * k, wobble: 0.8 + 0.8 * k, snap: 0 };
  return assist ? { ...t, perfect: t.perfect * 1.6, grace: t.grace + 1, turn: t.turn * 1.6, speed: t.speed * 0.6, wobble: t.wobble * 0.4, snap: 0.06 } : t;
}

export type PlacedItem = { uid: number; id: string; stage: number; warn: boolean;
  /** A poured paste (Part.makes): the ingredients blended into it, which count for every guest rule. */
  inside?: string[] };
export type PartRun = { dishId: string; partId: string; stage: number; items: PlacedItem[]; progress: number;
  state: "loading" | "cooking" | "waiting" | "ready" | "scorched" | "split"; exposure: number; inBand: number; prog: number;
  /** Guests this pot feeds: 2 when it was started for a party that shares it. */
  portions: number;
  /** This stage's turn (Stage.turn) is done, and how long it has waited for one. */
  turned: boolean; wait: number;
  /** Knob mode: seconds the step has stood done, waiting to come off. */
  over: number };
export type StationRun = { kind: StationKind; heatOn: boolean; F: number; H: number; part: PartRun | null; hotWarned: boolean;
  /** Knob mode: where the knob was let go (0 is off). */
  set: number };
export type PlatePart = { partId: string; items: string[]; hq: number };
/** `portions` is how many guests the plate can still feed; `shared` marks one that was cooked for two. */
export type Plate = { uid: number; dishId: string; parts: PlatePart[]; portions: number; shared: boolean };
export type GuestRun = { orderId: string; guestId: string; dishId: string; seat: number; at: number; rules: Rule[]; party: string | null; vip: boolean; maxPatience: number;
  state: "queue" | "walking" | "waiting" | "eating" | "leaving" | "gone"; st: number; patience: number;
  order: "open" | "served" | "expired"; paid: { base: number; heatTip: number; quick: number; vipTip: number; total: number; left: number } | null };
export type GameEvent =
  | { type: "placed"; station: StationKind; item: string; warn: boolean; uid: number } | { type: "rejected"; item: string }
  | { type: "ready"; station: StationKind } | { type: "scorched"; station: StationKind } | { type: "split"; station: StationKind }
  | { type: "plated"; station: StationKind; slot: number } | { type: "served"; seat: number; slot: number; coins: number }
  | { type: "returned"; seat: number; slot: number } | { type: "arrived"; seat: number } | { type: "left"; seat: number; expired: boolean }
  | { type: "skill"; skill: string } | { type: "stage"; station: StationKind } | { type: "end" }
  | { type: "bell" } | { type: "flare"; station: StationKind; phase: "warn" | "hit" } | { type: "stock"; item: string; phase: "low" | "out" }
  | { type: "changed"; seat: number; to: string } | { type: "gathered"; item: string } | { type: "gatherDone" }
  | { type: "poured"; from: StationKind; station: StationKind; item: string; warn: boolean; uid: number }
  | { type: "turnDue"; station: StationKind }
  /** In knob mode a turn is graded: on time, or late (a late flip has cooked the underside off the band; a late fold costs nothing). */
  | { type: "turned"; station: StationKind; how: "flip" | "fold"; grade?: "perfect" | "late" }
  | { type: "took"; station: StationKind; grade: "perfect" | "early" | "late" };
/** One player input: the tick it happened on, the action and its arguments. The server replays these (sim/replay.ts). */
export type Action = [tick: number, op: string, ...args: (string | number | boolean | null)[]];
/** Which scheduled twist events have already fired. */
type Sched = { flares: { at: number; station: StationKind; warned: boolean; hit: boolean }[]; bell: boolean; low: boolean; out: boolean; change: boolean };
export type Run = {
  level: Level; seed: number; flip: Flip; plan: Plan; sched: Sched; pet: string; t: number; timeLeft: number; started: boolean; paused: boolean; label: string | null;
  ended: boolean; endReason: "" | "time" | "done" | "quit"; focus: string | null; selected: StationKind;
  stations: Partial<Record<StationKind, StationRun>>; board: (Plate | null)[]; guests: GuestRun[]; coins: number; uid: number;
  skill: { used: boolean; freezeUntil: number; halfUntil: number; steadyUntil: number; steadyStation: StationKind | null };
  stats: { inBand: number; prog: number; returned: number; servedBad: number; labels: number; served: number; expired: number; mistakes: number;
    bestHq: number; inOrder: boolean; lastAt: number; minLeft: number };
  say: { who: string | null; text: string; tone: "info" | "warn" | "good" }; seen: Set<string>; events: GameEvent[]; log: string[];
  /** Simulated ticks so far (time only moves while playing) and every input in order, for server replay. */
  ticks: number; actions: Action[];
  /** The Gather round, when the level has one: the shelf it shows (shuffled by the seed) and the item put in for each needed group. */
  gather: { need: string[][]; shelf: string[]; got: (string | null)[]; order: string[] } | null;
  /** Knob and cook timer (KNOB) instead of the burner switch, with its tuning; null with the switch. */
  knob: KnobTune | null;
};

/** Signature level: each guest gets a chosen dish they can eat (round-robin); ABC soup fits every rule as a fallback. */
function resolveOrders(level: Level, signature: string[]) {
  if (!level.signature) return level.orders;
  return level.orders.map((o, i) => {
    if (o.dish !== "*") return o;
    const rules = [...GUESTS[o.guest].rules, ...(level.allRules ?? [])];
    const fits = signature.filter(d => DISHES[d] && dishFeasible(d, rules));
    return { ...o, dish: fits.length ? fits[i % fits.length] : "abc-soup" };
  });
}

/**
 * A run of a numbered level, or of a built level such as Today's special. `hints` overrides the level's hint plan (Play your
 * way); `seed` picks this service's arrivals, jars and twists (the app derives it from the run's id).
 */
/** The stations a signature service needs: those its dishes use, with ABC soup's pot when a guest can eat none of them. */
export function signatureStations(level: Level, signature: string[]) {
  const used = new Set(resolveOrders(level, signature).flatMap(o => DISHES[o.dish]?.parts.map(p => p.station) ?? []));
  return level.stations.filter(k => used.has(k));
}
/** A signature menu that fits a level's stations (MAX_STATIONS): a menu chosen before the limit loses dishes from the end until it fits. */
export function signatureFit(level: Level, signature: string[]) {
  let sig = signature;
  while (sig.length && signatureStations(level, sig).length > MAX_STATIONS) sig = sig.slice(0, -1);
  return sig;
}

export function createRun(which: number | Level, pet: string, signature: string[] = [], hints?: Level["hints"], seed = 1, knob = false, assist = false): Run {
  const base = typeof which === "number" ? levelByNumber(which) : which, sig = base.signature ? signatureFit(base, signature) : signature;
  const sized = base.signature ? { ...base, stations: signatureStations(base, sig) } : base;
  const level = hints && hints !== sized.hints ? { ...sized, hints } : sized;
  const plan = buildPlan(level, resolveOrders(level, sig), seed);
  const stations: Run["stations"] = {};
  level.stations.forEach(kind => { stations[kind] = { kind, heatOn: false, F: 0.1, H: 0.15, part: null, hotWarned: false, set: 0 }; });
  const guests: GuestRun[] = plan.orders.map(o => {
    const vip = o.id === plan.vip, patience = level.patience * (vip ? VIP_PATIENCE : 1);
    return { orderId: o.id, guestId: o.guest, dishId: o.dish, seat: 0, at: o.at, rules: [...new Set([...GUESTS[o.guest].rules, ...(level.allRules ?? [])])],
      party: o.party ?? null, vip, maxPatience: patience, state: "queue", st: 0, patience, order: "open", paid: null };
  });
  return { level, seed, flip: plan.flip, plan, sched: { flares: plan.flares.map(f => ({ ...f, warned: false, hit: false })), bell: false, low: false, out: false, change: false },
    pet: PETS[pet] ? pet : "sprout", t: 0, timeLeft: level.round, started: false, paused: false, label: null,
    ended: false, endReason: "", focus: null, selected: level.stations[0], stations, board: Array(BOARD_SLOTS).fill(null), guests, coins: 0, uid: 1,
    skill: { used: false, freezeUntil: 0, halfUntil: 0, steadyUntil: 0, steadyStation: null },
    stats: { inBand: 0, prog: 0, returned: 0, servedBad: 0, labels: 0, served: 0, expired: 0, mistakes: 0, bestHq: 0, inOrder: true, lastAt: 0, minLeft: 1 },
    say: { who: null, text: level.brief, tone: "info" }, seen: new Set(), events: [], log: [], ticks: 0, actions: [], gather: gatherFor(level, seed),
    knob: knob ? knobTune(level.n, assist) : null };
}

/** The Gather round's shelf: one card per needed group plus the look-alikes, in an order the seed decides. */
function gatherFor(level: Level, seed: number): Run["gather"] {
  if (!level.gather?.need.length) return null;
  const cards = [...new Set([...level.gather.need.map(g => g[0]), ...level.gather.decoys])];
  let h = seed >>> 0;
  for (let i = cards.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; const j = h % (i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return { need: level.gather.need, shelf: cards, got: level.gather.need.map(() => null), order: [] };
}
/** Still gathering: the basket is missing at least one ingredient. Guests wait, and the clock runs. */
export const gathering = (r: Run) => !!r.gather && r.gather.got.some(x => x === null);

// ---------- helpers ----------
const guestByOrder = (r: Run, id: string | null) => (id ? r.guests.find(g => g.orderId === id) : undefined);
export const focusGuest = (r: Run) => guestByOrder(r, r.focus);
export const waiting = (r: Run) => r.guests.filter(g => g.state === "waiting");
const tutorial = (r: Run, key: string) => { if (r.level.hints === "none" || r.seen.has(key)) return false; r.seen.add(key); return true; };
function say(r: Run, text: string, tone: Run["say"]["tone"] = "info", who: string | null = null) { r.say = { who, text, tone }; }
function hintSay(r: Run, key: string, text: string) { if (r.level.hints === "full" || tutorial(r, key)) say(r, text); }
export const dishPart = (dishId: string, station: StationKind): Part | undefined => DISHES[dishId]?.parts.find(p => p.station === station);
export const partOf = (pr: PartRun): Part => DISHES[pr.dishId].parts.find(p => p.id === pr.partId)!;
export const stageOf = (pr: PartRun): Stage => partOf(pr).stages[Math.min(pr.stage, partOf(pr).stages.length - 1)];
export const bandOf = (s: StationRun, pr: PartRun | null) => (pr && stageOf(pr).band) || STATIONS[s.kind].band;
export const dishName = (id: string) => DISHES[id]?.name ?? id;
/** Items a part makes (Part.makes): they come from a station by transfer, never from the shelf. Rebuilt only when a pack adds dishes. */
let made = { version: -1, items: new Set<string>() };
export function madeItems(): ReadonlySet<string> {
  if (made.version !== dishesVersion) made = { version: dishesVersion, items: new Set(Object.values(DISHES).flatMap(d => d.parts.map(p => p.makes).filter((x): x is string => !!x))) };
  return made.items;
}
/** The parts that end on a plate: a part that makes a paste is poured into another station instead. */
export const platedParts = (dishId: string) => DISHES[dishId].parts.filter(p => !p.makes);
/** Everything in a station's dish, with what was blended into any paste poured in. */
const contents = (pr: PartRun) => pr.items.flatMap(i => [i.id, ...(i.inside ?? [])]);
export const maxCoins = (r: Run) => r.guests.reduce((n, g) => n + 16 + (g.vip ? VIP_TIP : 0), 0);
/** Whether an ingredient is plentiful, running low (a warning), or gone for the rest of the service. */
export const stockOf = (r: Run, id: string): "ok" | "low" | "out" => r.plan.stock?.item !== id ? "ok" : r.sched.out ? "out" : r.sched.low ? "low" : "ok";
/** The other guests who would share the pot cooked for `g`: party mates who are at the counter (walking in or waiting) for the same dish. A mate still in the queue does not count. */
export const mates = (r: Run, g: GuestRun) => (g.party ? r.guests.filter(x => x !== g && x.party === g.party && x.dishId === g.dishId && x.order === "open" && (x.state === "walking" || x.state === "waiting")) : []);
/** What a pot cooked for `g` must respect: their rules and those of everyone sharing it. */
export const tableRules = (r: Run, g: GuestRun): Rule[] => unionRules(g.rules, ...mates(r, g).map(x => x.rules));
/** Rule check for items under this run's jars. */
export const runConflicts = (r: Run, ids: string[], rules: Rule[]) => conflicts(ids, rules, r.flip);
const record = (r: Run, line: string) => { r.log.push(r.t.toFixed(2) + " " + line); };
/** Logs every input before it runs, accepted or not, so replaying the same calls on the same ticks rebuilds the run exactly. */
const input = (r: Run, op: string, ...args: (string | number | boolean | null)[]) => { r.actions.push([r.ticks, op, ...args]); };

export function start(r: Run) { input(r, "start"); r.started = true; record(r, "start"); if (gathering(r)) say(r, "Gather the ingredients first: drag each one the recipe needs into the basket."); }
/** Puts an ingredient in the Gather basket: it fills the first group still empty that accepts it, or is refused as not in the recipe. */
export function gatherItem(r: Run, itemId: string) {
  input(r, "gather", itemId);
  if (idle(r) || !gathering(r)) return false;
  const g = r.gather!, slot = g.need.findIndex((group, i) => g.got[i] === null && group.includes(itemId));
  if (slot < 0) {
    const dish = r.guests[0] ? dishName(r.guests[0].dishId).toLowerCase() : "this dish";
    // An optional ingredient is in the recipe but not needed in the basket: no mistake.
    const optional = r.guests.some(x => DISHES[x.dishId].parts.some(p => p.stages.some(st => st.slots.some(sl => sl.optional && sl.accepts.includes(itemId)))));
    const already = g.need.some((group, i) => g.got[i] !== null && group.includes(itemId));
    say(r, already ? "That's already in the basket." : optional ? itemName(itemId) + " is optional. Leave it for now." : itemName(itemId) + " isn't in " + dish + ".", "warn");
    if (!already && !optional) r.stats.mistakes++;
    r.events.push({ type: "rejected", item: itemId }); return false;
  }
  g.got[slot] = itemId; g.order.push(itemId); record(r, "gather " + itemId); r.events.push({ type: "gathered", item: itemId });
  const left = g.got.filter(x => x === null).length;
  if (left) say(r, left + " more to gather.");
  else { say(r, "Everything's in the basket. Here come the guests!", "good"); r.events.push({ type: "gatherDone" }); }
  return true;
}
export function setFocus(r: Run, orderId: string) {
  input(r, "focus", orderId);
  if (idle(r)) return;
  const g = guestByOrder(r, orderId); if (!g || g.state !== "waiting") return;
  r.focus = orderId; record(r, "focus " + orderId);
  const station = DISHES[g.dishId].parts[0].station; if (r.stations[station]) r.selected = station;
  const rules = tableRules(r, g).map(x => RULES[x].spoken).join(" and "), who = [g, ...mates(r, g)].map(x => GUESTS[x.guestId].name).join(" and ");
  say(r, "Cooking " + dishName(g.dishId) + " for " + who + (rules ? ": " + rules + "." : ". No food rules."));
}
export function select(r: Run, station: StationKind) { input(r, "select", station); if (r.stations[station]) { r.selected = station; record(r, "select " + station); } }

/** Where another part of the dish cooks this item, when that is not `kind` ("Tempeh goes in the wok."), or null. */
function goesElsewhere(dishId: string, itemId: string, kind: StationKind): string | null {
  const home = DISHES[dishId]?.parts.find(p => p.station !== kind && p.stages.some(s => s.slots.some(sl => sl.accepts.includes(itemId))));
  return home ? itemName(itemId) + " goes in the " + STATIONS[home.station].name.toLowerCase() + "." : null;
}
function check(r: Run, itemId: string, kind: StationKind): string | null {
  const st = r.stations[kind]; if (!st) return "That station isn't in this kitchen yet.";
  const g = focusGuest(r);
  if (!st.part) {
    if (!g) return "Tap a guest first to choose who you are cooking for.";
    const part = dishPart(g.dishId, kind);
    if (!part) return goesElsewhere(g.dishId, itemId, kind) ?? dishName(g.dishId) + " doesn't use the " + STATIONS[kind].name.toLowerCase() + ".";
    if (!part.stages[0].slots.some(s => s.accepts.includes(itemId)))
      return part.stages.some(s => s.slots.some(sl => sl.accepts.includes(itemId))) ? "Not yet. Start with " + part.stages[0].hint + "."
        : goesElsewhere(g.dishId, itemId, kind) ?? itemName(itemId) + " isn't in " + dishName(g.dishId) + ". The recipe strip shows what goes in.";
    return preheating(st, part.stages[0]);
  }
  const pr = st.part, part = partOf(pr);
  if (pr.state === "ready") return "Plate the ready " + part.name.toLowerCase() + " first.";
  if (pr.state === "scorched" || pr.state === "split") return "Restart this dish first; it's free.";
  const stage = stageOf(pr);
  const slot = stage.slots.find(s => s.accepts.includes(itemId));
  if (!slot) {
    const later = part.stages.findIndex(s => s.slots.some(sl => sl.accepts.includes(itemId)));
    if (later > pr.stage) return "Not yet. This step needs " + stage.hint + ".";
    if (later >= 0) return "That step is done. Add " + stage.hint + ".";
    return goesElsewhere(pr.dishId, itemId, kind) ?? itemName(itemId) + " isn't in " + part.name.toLowerCase() + ".";
  }
  if (pr.items.some(x => x.stage === pr.stage && slot.accepts.includes(x.id))) return "The " + STATIONS[kind].name.toLowerCase() + " already has " + slot.label.toLowerCase() + ".";
  return null;
}

const idle = (r: Run) => !r.started || r.paused || r.ended || !!r.label;
/** A station that must be hot before food goes in (oven, fryer) refuses the first item until it reaches the band. */
function preheating(st: StationRun, first: Stage): string | null {
  const cfg = STATIONS[st.kind];
  if (!cfg.preheat || st.H >= (first.band ?? cfg.band)[0]) return null;
  return "Preheat the " + cfg.name.toLowerCase() + " first: " + (st.heatOn ? "wait" : "turn it on and wait") + " until the needle reaches the band.";
}
const newPart = (dishId: string, partId: string, portions: number): PartRun =>
  ({ dishId, partId, stage: 0, items: [], progress: 0, state: "loading", exposure: 0, inBand: 0, prog: 0, portions, turned: false, wait: 0, over: 0 });
/** Puts an ingredient on a station: play is a drag, so the player always chooses the station. */
export function place(r: Run, itemId: string, kind: StationKind): boolean {
  input(r, "place", itemId, kind);
  if (idle(r)) return false;
  if (gathering(r)) { say(r, "Gather the ingredients first: drag them into the basket.", "warn"); r.events.push({ type: "rejected", item: itemId }); return false; }
  if (madeItems().has(itemId)) {
    const at = Object.values(DISHES).flatMap(d => d.parts).find(p => p.makes === itemId)?.station;
    say(r, itemName(itemId) + " is made " + (at ? "in the " + STATIONS[at].name.toLowerCase() : "at a station") + ", not taken from the shelf.", "warn"); r.events.push({ type: "rejected", item: itemId }); return false;
  }
  if (stockOf(r, itemId) === "out") {
    const who = focusGuest(r); say(r, itemName(itemId) + " has run out. Swap in another one" + (who ? " that suits " + GUESTS[who.guestId].name : "") + ".", "warn");
    r.events.push({ type: "rejected", item: itemId }); return false;
  }
  const why = check(r, itemId, kind);
  if (why) { say(r, why, "warn"); r.events.push({ type: "rejected", item: itemId }); return false; }
  const st = r.stations[kind]!, g = focusGuest(r);
  if (!st.part && g) { const part = dishPart(g.dishId, kind)!; st.part = newPart(g.dishId, part.id, mates(r, g).length ? 2 : 1); }
  const pr = st.part!, rules = g ? tableRules(r, g) : [], warn = !!g && conflicts([itemId], rules, r.flip).length > 0 && pr.dishId === g.dishId;
  const uid = r.uid++;
  pr.items.push({ uid, id: itemId, stage: pr.stage, warn });
  r.selected = kind; record(r, "place " + itemId + " " + kind);
  r.events.push({ type: "placed", station: kind, item: itemId, warn, uid });
  // A wrong ingredient that completes the step starts it cooking, after which it can't be lifted out (the panel shows Restart instead).
  const fills = stageOf(pr).slots.filter(s => !s.optional).every(s => pr.items.some(x => x.stage === pr.stage && s.accepts.includes(x.id)));
  if (warn && g) { r.stats.mistakes++; say(r, reason(itemId, rules, r.flip) + (fills ? " Restart the dish; it's free." : " Lift it out with its ✕ under the heat bar."), "warn"); }
  return added(r, st, kind, itemId, warn);
}

/**
 * Transfer: a ready paste (Part.makes) is poured from its station onto another one whose dish part takes it, carrying what was
 * blended in. It starts that part when the station is free, the way a first ingredient does.
 */
export function transfer(r: Run, from: StationKind, to: StationKind): boolean {
  input(r, "transfer", from, to);
  if (idle(r) || gathering(r)) return false;
  const src = r.stations[from], pr = src?.part, made = pr && pr.state === "ready" ? partOf(pr).makes : undefined;
  if (!src || !pr || !made) return false;
  const st = r.stations[to], part = st ? dishPart(pr.dishId, to) : undefined, name = itemName(made);
  if (!st || from === to || !part?.stages.some(sg => sg.slots.some(sl => sl.accepts.includes(made)))) { say(r, name + " doesn't go there.", "warn"); return false; }
  if (st.part && st.part.dishId !== pr.dishId) { say(r, "The " + STATIONS[to].name.toLowerCase() + " has another dish in it.", "warn"); return false; }
  if (st.part && (st.part.state === "ready" || st.part.state === "scorched" || st.part.state === "split")) { say(r, "Clear the " + STATIONS[to].name.toLowerCase() + " first.", "warn"); return false; }
  const target = st.part ? stageOf(st.part) : part.stages[0], slot = target.slots.find(sl => sl.accepts.includes(made));
  if (!slot) { say(r, "Not yet. This step needs " + target.hint + ".", "warn"); return false; }
  const cold = st.part ? null : preheating(st, part.stages[0]);
  if (cold) { say(r, cold, "warn"); return false; }
  if (st.part?.items.some(x => x.stage === st.part!.stage && slot.accepts.includes(x.id))) { say(r, "The " + STATIONS[to].name.toLowerCase() + " already has " + slot.label.toLowerCase() + ".", "warn"); return false; }
  st.part ??= newPart(pr.dishId, part.id, pr.portions);
  // A dish feeds only as many guests as both halves were made for: a paste for one poured into a pot started for two makes one portion.
  const short = st.part.portions !== pr.portions;
  st.part.portions = Math.min(st.part.portions, pr.portions);
  const inside = contents(pr), g = focusGuest(r), rules = g ? tableRules(r, g) : [];
  const warn = !!g && g.dishId === pr.dishId && conflicts([made, ...inside], rules, r.flip).length > 0, uid = r.uid++;
  st.part.items.push({ uid, id: made, stage: st.part.stage, warn, inside });
  src.part = null; r.selected = to; record(r, "transfer " + from + " " + to);
  r.events.push({ type: "poured", from, station: to, item: made, warn, uid });
  if (warn && g) { r.stats.mistakes++; say(r, reason(conflicts([made, ...inside], rules, r.flip)[0], rules, r.flip) + " Restart the dish; it's free.", "warn"); }
  const ok = added(r, st, to, made, warn);
  // Said after the cooking hint, so the player sees why only one guest will be fed.
  if (!warn && short) say(r, "The " + (pr.portions < 2 ? "paste" : STATIONS[to].name.toLowerCase()) + " was made for one, so this makes one portion.", "warn");
  return ok;
}

/** After an item goes in: a coconut milk splits if too hot, a filled stage starts cooking, and the hints say what is next. */
function added(r: Run, st: StationRun, kind: StationKind, itemId: string, warn: boolean): boolean {
  const pr = st.part!, stage = stageOf(pr), band = bandOf(st, pr);
  if (stage.splitIfHot?.includes(itemId) && STATIONS[kind].heat && st.H > band[1]) {
    pr.state = "split"; say(r, "Too hot: the " + itemName(itemId).toLowerCase() + " split. Restart the dish; it's free. Turn the heat down before adding it.", "warn");
    r.events.push({ type: "split", station: kind }); return true;
  }
  const required = stage.slots.filter(s => !s.optional);
  const filled = required.every(s => pr.items.some(x => x.stage === pr.stage && s.accepts.includes(x.id)));
  if (filled && (pr.state === "loading" || pr.state === "waiting")) {
    pr.state = "cooking";
    if (stage.turn === "fold") hintSay(r, "fold-" + kind, "Now fold it: drag the fold onto the " + STATIONS[kind].name.toLowerCase() + ".");
    else if (!STATIONS[kind].heat && stage.secs === 0) advance(r, st);
    else if (!warn) hintSay(r, "cook-" + kind, !STATIONS[kind].heat ? STATIONS[kind].name + " is cooking. Work on another order meanwhile."
      : r.knob ? (st.heatOn ? "Cooking. Hold Heat again to change the flame." : "Hold Heat and let go when the needle is in the green band.")
      : st.heatOn ? "Cooking. Keep the needle in the green band." : "Turn the heat on and keep the needle in the green band.");
  } else if (!warn && !filled) hintSay(r, "half-" + pr.stage, "Good. Now " + stage.hint + ".");
  return true;
}

export function lift(r: Run, kind: StationKind, uid: number) {
  input(r, "lift", kind, uid);
  if (idle(r)) return;
  const st = r.stations[kind], pr = st?.part; if (!st || !pr) return;
  const item = pr.items.find(i => i.uid === uid); if (!item) return;
  if (item.stage !== pr.stage || pr.progress > 0 || pr.state === "ready") { say(r, "That is already cooking. Restart the dish if you need to; it's free.", "warn"); return; }
  if (item.inside) { say(r, "A poured paste can't go back. Restart the dish if you need to; it's free.", "warn"); return; }
  pr.items.splice(pr.items.indexOf(item), 1); record(r, "lift " + item.id);
  const req = stageOf(pr).slots.filter(s => !s.optional);
  if (pr.state === "cooking" && !req.every(s => pr.items.some(x => x.stage === pr.stage && s.accepts.includes(x.id)))) { pr.state = pr.stage === 0 ? "loading" : "waiting"; pr.turned = false; pr.wait = 0; }
  if (!pr.items.length && pr.stage === 0) st.part = null;
  say(r, itemName(item.id) + " is back on the shelf.");
}
export function restart(r: Run, kind: StationKind) { input(r, "restart", kind); if (idle(r)) return; const st = r.stations[kind]; if (!st) return; st.part = null; record(r, "restart " + kind); say(r, "Fresh start. It's free."); }
export function toggleHeat(r: Run, kind: StationKind) {
  input(r, "heat", kind);
  const st = r.stations[kind]; if (!st || !STATIONS[kind].heat || idle(r)) return;
  st.heatOn = !st.heatOn; r.selected = kind; record(r, "heat " + kind + " " + st.heatOn);
}
/** Knob mode: the flame is set where the player let go of the heat button (0 is off) and holds there. */
export function setKnob(r: Run, kind: StationKind, level: number) {
  input(r, "knob", kind, level);
  const st = r.stations[kind]; if (!r.knob || !st || !STATIONS[kind].heat || STATIONS[kind].thermostat || idle(r)) return;
  st.set = Math.min(1, Math.max(0, level)); st.heatOn = st.set > 0; r.selected = kind; record(r, "knob " + kind + " " + st.set.toFixed(2));
}
/** Knob mode: the step comes off the heat. On the star (within the tune's perfect seconds of done) is perfect; early counts the missing cooking as off the band. */
export function take(r: Run, kind: StationKind) {
  input(r, "take", kind);
  // Only a knob's heat comes off this way: a board or blender (no heat) and the oven (thermostat) finish by themselves.
  const st = r.stations[kind], pr = st?.part, cfg = STATIONS[kind];
  if (!r.knob || !st || !pr || !cfg.heat || cfg.thermostat || pr.state !== "cooking" || pr.progress < KNOB.early || idle(r)) return;
  const early = (1 - pr.progress) * stageOf(pr).secs * (pr.portions > 1 ? BATCH_SLOW : 1);
  const grade = early > r.knob.perfect ? "early" : pr.over > r.knob.perfect ? "late" : "perfect";
  if (grade === "early") { const miss = Math.round(early / DT); pr.prog += miss; r.stats.prog += miss; }
  r.events.push({ type: "took", station: kind, grade }); record(r, "take " + kind + " " + grade);
  pr.over = 0; r.selected = kind; advance(r, st);
}
export function openLabel(r: Run, itemId: string) { input(r, "label", itemId); if (ITEMS[itemId]?.label && r.started && !r.paused && !r.ended) { r.label = itemId; r.stats.labels++; record(r, "label " + itemId); } }
export function closeLabel(r: Run) { input(r, "close"); r.label = null; }
export function pause(r: Run, on: boolean) {
  input(r, "pause", on); r.paused = on;
  // Pausing turns every burner off; with the knob, resuming lights each one again where its knob was left.
  Object.values(r.stations).forEach(s => { if (s) s.heatOn = on ? false : r.knob ? s.set > 0 : s.heatOn; });
}

/**
 * A turn with a tool (Stage.turn): the spatula flips a griddle dish once it is half done, and the fold closes a filled dumpling or
 * pastry on the dough board. A flip before halfway is refused; a fold finishes the step.
 */
export function turn(r: Run, kind: StationKind): boolean {
  input(r, "turn", kind);
  if (idle(r) || gathering(r)) return false;
  const st = r.stations[kind], pr = st?.part; if (!st || !pr) return false;
  const stage = stageOf(pr), how = stage.turn;
  if (!how || pr.turned || pr.state !== "cooking") { say(r, how && pr.turned ? "That's done. Let it finish." : "Nothing to " + (how ? TURN_TOOL[how].verb.toLowerCase() : "turn") + " yet.", "warn"); return false; }
  if (how === "flip" && pr.progress < 0.45) { say(r, "Not yet. Flip it once it's half done.", "warn"); return false; }
  // Knob mode: a turn within the tune's window of it falling due (a flip before halfway has not waited at all) is on time.
  const grade = !r.knob ? undefined : pr.wait <= r.knob.turn ? "perfect" as const : "late" as const;
  pr.turned = true; pr.wait = 0; r.selected = kind; record(r, "turn " + kind);
  r.events.push({ type: "turned", station: kind, how, grade });
  if (how === "fold" && stage.secs === 0) advance(r, st);
  else say(r, how === "flip" ? "Flipped. Let the other side cook." : "Folded.", "good");
  return true;
}

function advance(r: Run, st: StationRun) {
  const pr = st.part!, part = partOf(pr);
  pr.exposure = 0; pr.turned = false; pr.wait = 0;
  if (pr.stage < part.stages.length - 1) {
    pr.stage++; pr.progress = 0; pr.state = "waiting"; r.events.push({ type: "stage", station: st.kind });
    hintSay(r, "stage-" + st.kind + pr.stage, "Step " + pr.stage + " done. Add " + part.stages[pr.stage].hint + ".");
  } else {
    pr.state = "ready"; r.events.push({ type: "ready", station: st.kind });
    const made = part.makes, next = made ? DISHES[pr.dishId].parts.find(p => p.stages.some(sg => sg.slots.some(sl => sl.accepts.includes(made)))) : undefined;
    hintSay(r, "ready-" + st.kind, next ? "Ready! Drag it onto the " + STATIONS[next.station].name.toLowerCase() + "." : "Ready! Drag it to the plates, then to the guest it suits.");
  }
}

export function plate(r: Run, kind: StationKind): boolean {
  input(r, "plate", kind);
  if (idle(r)) return false;
  const st = r.stations[kind], pr = st?.part;
  if (!st || !pr || pr.state !== "ready") { say(r, !pr ? "Nothing to plate yet." : "Not ready yet.", "warn"); return false; }
  const made = partOf(pr).makes;
  if (made) { const next = DISHES[pr.dishId].parts.find(p => p.stages.some(sg => sg.slots.some(sl => sl.accepts.includes(made)))); say(r, "Pour the " + itemName(made).toLowerCase() + " into the " + (next ? STATIONS[next.station].name.toLowerCase() : "next station") + ".", "warn"); return false; }
  const hq = pr.prog ? pr.inBand / pr.prog : STATIONS[kind].heat ? 0 : 1;
  const piece: PlatePart = { partId: pr.partId, items: contents(pr), hq };
  const dish = DISHES[pr.dishId], plated = platedParts(pr.dishId);
  let slot = r.board.findIndex(p => p && p.dishId === pr.dishId && p.parts.length < plated.length && !p.parts.some(x => x.partId === pr.partId));
  if (slot >= 0) { const joined = r.board[slot]!; joined.parts.push(piece); joined.portions = Math.min(joined.portions, pr.portions); joined.shared ||= pr.portions > 1; }
  else {
    slot = r.board.indexOf(null);
    if (slot < 0) { say(r, "The board is full. Serve a plate first.", "warn"); return false; }
    r.board[slot] = { uid: r.uid++, dishId: pr.dishId, parts: [piece], portions: pr.portions, shared: pr.portions > 1 };
  }
  st.part = null; record(r, "plate " + kind + " " + slot);
  r.events.push({ type: "plated", station: kind, slot });
  const p = r.board[slot]!;
  say(r, p.parts.length < plated.length ? "Half a " + dish.name.toLowerCase() + ". Cook the " + plated.find(x => !p.parts.some(y => y.partId === x.id))!.name.toLowerCase() + " too." : p.shared ? "Plated for two. Drag it to one guest, then the other." : "Plated. Drag it to the guest it suits.");
  return true;
}
export const plateComplete = (p: Plate) => p.parts.length === platedParts(p.dishId).length;

export function serve(r: Run, slot: number, orderId: string) {
  input(r, "serve", slot, orderId);
  if (idle(r)) return;
  const p = r.board[slot], g = guestByOrder(r, orderId);
  if (!p || !g || g.state !== "waiting") return;
  if (!plateComplete(p)) { const need = platedParts(p.dishId).find(x => !p.parts.some(y => y.partId === x.id))!; say(r, "This " + dishName(p.dishId).toLowerCase() + " still needs its " + need.name.toLowerCase() + ".", "warn"); return; }
  if (p.dishId !== g.dishId) { say(r, GUESTS[g.guestId].name + " ordered " + dishName(g.dishId) + ".", "warn", g.guestId); r.events.push({ type: "returned", seat: g.seat, slot }); return; }
  const items = p.parts.flatMap(x => x.items), bad = conflicts(items, g.rules, r.flip);
  if (bad.length) {
    r.stats.returned++; record(r, "returned " + orderId);
    say(r, reason(bad[0], g.rules, r.flip) + " Sorry, I can't eat this one.", "warn", g.guestId);
    r.events.push({ type: "returned", seat: g.seat, slot }); return;
  }
  const hq = p.parts.reduce((a, x) => a + x.hq, 0) / p.parts.length, left = g.patience / g.maxPatience;
  const heatTip = Math.round(4 * hq), quick = Math.round(2 * left), vipTip = g.vip ? VIP_TIP : 0;
  g.paid = { base: 10, heatTip, quick, vipTip, total: 10 + heatTip + quick + vipTip, left };
  r.coins += g.paid.total; g.order = "served"; g.state = "eating"; g.st = 0; r.stats.served++;
  // A pot cooked for two stays on the board until its second portion goes out.
  if (--p.portions <= 0) r.board[slot] = null;
  r.stats.bestHq = Math.max(r.stats.bestHq, hq); r.stats.minLeft = Math.min(r.stats.minLeft, left);
  if (g.at < r.stats.lastAt) r.stats.inOrder = false; else r.stats.lastAt = g.at;
  record(r, "served " + orderId + " " + g.paid.total);
  say(r, GUESTS[g.guestId].thanks, "good", g.guestId);
  r.events.push({ type: "served", seat: g.seat, slot, coins: g.paid.total });
}

export function useSkill(r: Run) {
  input(r, "skill");
  if (r.skill.used || idle(r)) return false;
  const skill = PETS[r.pet].skill; r.skill.used = true; record(r, "skill " + skill);
  if (skill === "breath") r.skill.freezeUntil = r.t + 6;
  if (skill === "bubbles") r.skill.halfUntil = r.t + 12;
  if (skill === "minute") r.timeLeft += 12;
  if (skill === "steady") { r.skill.steadyUntil = r.t + 8; r.skill.steadyStation = r.selected; }
  if (skill === "cheer") { const low = waiting(r).sort((a, b) => a.patience - b.patience)[0]; if (low) low.patience = Math.min(low.maxPatience, low.patience + 20); }
  say(r, PETS[r.pet].name + ": " + SKILLS[skill].name + "! " + SKILLS[skill].effect, "good");
  r.events.push({ type: "skill", skill }); return true;
}

function finish(r: Run, why: Run["endReason"]) {
  if (r.ended) return;
  r.guests.forEach(g => { if (g.order === "open") { g.order = "expired"; r.stats.expired++; } });
  r.ended = true; r.endReason = why; Object.values(r.stations).forEach(s => { if (s) s.heatOn = false; });
  record(r, "end " + why); r.events.push({ type: "end" });
}
export function quit(r: Run) { input(r, "quit"); finish(r, "quit"); }

function seatFor(r: Run) {
  const used = new Set(r.guests.filter(g => g.state !== "queue" && g.state !== "gone").map(g => g.seat));
  for (let s = 1; s <= r.level.seats; s++) if (!used.has(s)) return s;
  return 0;
}

/** Twists that fire on the clock: the bell, flares, the ingredient running out, and a guest changing their mind. */
function schedule(r: Run) {
  const p = r.plan, t = r.t, s = r.sched;
  if (p.bell !== null && !s.bell && t >= p.bell) { s.bell = true; r.events.push({ type: "bell" }); say(r, "Bell! The lunch crowd is on its way.", "warn"); }
  for (const f of s.flares) {
    if (!f.warned && t >= f.at - FLARE_WARN) { f.warned = true; r.events.push({ type: "flare", station: f.station, phase: "warn" }); say(r, "The " + STATIONS[f.station].name.toLowerCase() + " is about to flare. Turn the burner off to ride it out.", "warn"); }
    if (!f.hit && t >= f.at) {
      f.hit = true; const st = r.stations[f.station];
      if (st?.heatOn && r.t >= r.skill.steadyUntil) { st.H = Math.min(1, st.H + FLARE_HEAT); st.F = Math.min(1, st.F + 0.2); }
      r.events.push({ type: "flare", station: f.station, phase: "hit" });
    }
  }
  if (p.stock) {
    if (!s.low && t >= p.stock.at - 6) { s.low = true; r.events.push({ type: "stock", item: p.stock.item, phase: "low" }); say(r, itemName(p.stock.item) + " is running low.", "warn"); }
    if (!s.out && t >= p.stock.at) { s.out = true; r.events.push({ type: "stock", item: p.stock.item, phase: "out" }); say(r, itemName(p.stock.item) + " has run out. Use another one.", "warn"); }
  }
  if (p.change && !s.change && t >= p.change.at) {
    const g = guestByOrder(r, p.change.orderId);
    if (!g || g.state === "eating" || g.state === "leaving" || g.state === "gone") s.change = true;
    else if (g.state === "waiting") {
      s.change = true; g.dishId = p.change.to;
      r.events.push({ type: "changed", seat: g.seat, to: g.dishId });
      say(r, "Sorry, could I have the " + dishName(g.dishId).toLowerCase() + " instead?", "warn", g.guestId);
    }
  }
}

export function tick(r: Run) {
  if (!r.started || r.paused || r.label || r.ended) return;
  // While gathering only the clock moves: guests, twists and burners wait for the basket.
  const basket = gathering(r);
  if (!basket) r.t += DT;
  r.ticks++;
  r.timeLeft = Math.max(0, r.timeLeft - DT);
  if (r.timeLeft <= 0) { say(r, "Time. The kitchen closes for this service."); finish(r, "time"); return; }
  if (basket) return;
  const open = () => r.guests.filter(g => g.state === "walking" || g.state === "waiting").length;
  const frozen = r.t < r.skill.freezeUntil, half = r.t < r.skill.halfUntil;
  for (const g of r.guests) {
    g.st += DT;
    if (g.state === "queue" && r.t >= g.at && open() < r.level.maxOpen) { const seat = seatFor(r); if (seat) { g.seat = seat; g.state = "walking"; g.st = 0; } }
    else if (g.state === "walking" && g.st >= WALK) {
      g.state = "waiting"; g.st = 0; r.events.push({ type: "arrived", seat: g.seat });
      if (!focusGuest(r) || focusGuest(r)!.state !== "waiting") r.focus = g.orderId;
      say(r, GUESTS[g.guestId].hello.replace("{dish}", dishName(g.dishId)), "info", g.guestId);
    } else if (g.state === "waiting" && !frozen) {
      g.patience = Math.max(0, g.patience - DT * (half ? 0.5 : 1));
      if (g.patience <= 0) { g.order = "expired"; g.state = "leaving"; g.st = 0; r.stats.expired++; say(r, "Ran out of time. Next time, ah.", "warn", g.guestId); r.events.push({ type: "left", seat: g.seat, expired: true }); }
    } else if (g.state === "eating" && g.st >= EAT) { g.state = "leaving"; g.st = 0; r.events.push({ type: "left", seat: g.seat, expired: false }); }
    else if (g.state === "leaving" && g.st >= LEAVE) g.state = "gone";
  }
  schedule(r);
  // A plate cooked for two is cleared once nobody at the counter is still waiting for that dish (a guest yet to arrive does not count).
  r.board.forEach((p, i) => { if (p?.shared && !r.guests.some(x => x.order === "open" && x.dishId === p.dishId && r.t >= x.at)) r.board[i] = null; });
  const fg = focusGuest(r);
  if (!fg || fg.state !== "waiting") { const next = waiting(r)[0]; r.focus = next ? next.orderId : null; }
  for (const st of Object.values(r.stations)) if (st) heatStation(r, st);
  if (r.guests.every(g => g.state === "gone")) finish(r, "done");
}

function heatStation(r: Run, st: StationRun) {
  const cfg = STATIONS[st.kind], pr = st.part;
  if (!cfg.heat) {
    if (pr && pr.state === "ready") { leftIn(r, st, true); return; }
    // A fold waits for the player; nothing cooks until it is done. With the knob, the cook timer counts how long it has waited.
    if (r.knob && pr && pr.state === "cooking" && stageOf(pr).turn === "fold" && !pr.turned) pr.wait += DT;
    if (pr && pr.state === "cooking" && !(stageOf(pr).turn === "fold" && !pr.turned)) {
      const secs = (stageOf(pr).secs || 0.001) * (pr.portions > 1 ? BATCH_SLOW : 1); pr.progress = Math.min(1, pr.progress + DT / secs); if (pr.progress >= 1) advance(r, st);
    }
    return;
  }
  const steady = r.t < r.skill.steadyUntil && r.skill.steadyStation === st.kind;
  // A thermostat (the oven) settles at the middle of the band of the step in it (empty, the first step of the focused guest's dish
  // there) while on and holds it; off, it cools slowly.
  if (cfg.thermostat) {
    const [a, b] = pr ? bandOf(st, pr) : dishPart(focusGuest(r)?.dishId ?? "", st.kind)?.stages[0].band ?? cfg.band, mid = (a + b) / 2;
    st.H = !st.heatOn ? Math.max(0.15, st.H - cfg.loss * DT) : st.H > mid ? Math.max(mid, st.H - cfg.loss * DT) : Math.min(mid, st.H + cfg.gain * DT);
  }
  else if (r.knob) {
    // The heat settles quickly on the knob (fast mode) and holds there; off, it falls back to the cold floor.
    st.H += ((st.heatOn ? Math.max(0.15, st.set) : 0.15) - st.H) * Math.min(1, KNOB.rate * DT); st.F = st.heatOn ? st.set : 0.1;
  }
  else if (!steady) {
    st.F = st.heatOn ? Math.min(1, st.F + cfg.onRate * DT) : Math.max(0.1, st.F - cfg.offRate * DT);
    st.H = Math.min(1, Math.max(0, st.H + (cfg.gain * st.F - cfg.loss * st.H) * DT));
  }
  const [lo, hi] = bandOf(st, pr);
  if (pr && pr.state === "ready" && cfg.burnAfter) { leftIn(r, st, st.H >= lo); return; }
  if (st.H >= cfg.scorch && !st.hotWarned && pr && (pr.state === "cooking" || pr.state === "waiting")) { st.hotWarned = true; say(r, "Too hot. Turn the heat off and let it settle.", "warn"); }
  if (st.H < hi) st.hotWarned = false;
  // Don't walk away: a finished dish left over a hot burner starts to burn.
  if (pr && pr.state === "ready" && r.plan.neglect !== null) {
    pr.exposure = st.H > hi ? pr.exposure + DT : Math.max(0, pr.exposure - DT / 2);
    if (pr.exposure >= r.plan.neglect) { pr.state = "scorched"; say(r, "It sat on the heat too long and burnt. Plate dishes as soon as they're ready.", "warn"); r.events.push({ type: "scorched", station: st.kind }); }
    return;
  }
  if (!pr || pr.state !== "cooking") return;
  const stage = stageOf(pr);
  if (st.H < cfg.scorch) pr.exposure = Math.max(0, pr.exposure - DT / 2);
  if (st.H >= cfg.scorch) {
    pr.exposure += DT;
    if (pr.exposure >= (stage.scorchSecs ?? cfg.scorchSecs)) { pr.state = "scorched"; say(r, "Scorched. That happens. Restart it; it's free.", "warn"); r.events.push({ type: "scorched", station: st.kind }); }
    return;
  }
  // A flip at halfway: the dish waits there, and the underside burns if nobody turns it in time.
  if (stage.turn === "flip" && !pr.turned && pr.progress >= 0.5) {
    if (pr.wait === 0) { r.events.push({ type: "turnDue", station: st.kind }); hintSay(r, "flip-" + st.kind, "Flip it! Drag the spatula onto the " + cfg.name.toLowerCase() + "."); }
    pr.wait += DT; pr.progress = 0.5;
    // Knob mode: waiting past the flip's window cooks the underside off the band.
    if (r.knob && pr.wait > r.knob.turn) { pr.prog++; r.stats.prog++; }
    if (pr.wait >= FLIP_GRACE) { pr.state = "scorched"; say(r, "The underside burnt. Flip it as soon as it's half done.", "warn"); r.events.push({ type: "scorched", station: st.kind }); }
    return;
  }
  // Knob mode: a done step waits for the player's Take off; standing past the star overcooks it (time off the band), and after
  // the tune's grace it comes off by itself. An oven holds its own heat (no knob), so its steps finish by themselves as with the switch.
  const tune = cfg.thermostat ? null : r.knob;
  if (tune && pr.progress >= 1) {
    pr.over += DT;
    if (pr.over > tune.perfect) { pr.prog++; r.stats.prog++; }
    if (pr.over >= tune.grace) { r.events.push({ type: "took", station: st.kind, grade: "late" }); pr.over = 0; advance(r, st); }
    return;
  }
  const rate = st.H >= lo ? 1 : !cfg.thermostat && st.H >= lo - 0.1 ? 0.5 : 0;
  if (rate > 0) {
    pr.progress = Math.min(stage.turn === "flip" && !pr.turned ? 0.5 : 1, pr.progress + rate * DT / (stage.secs * (pr.portions > 1 ? BATCH_SLOW : 1))); pr.prog++; r.stats.prog++;
    if (st.H >= lo && st.H <= hi) { pr.inBand++; r.stats.inBand++; }
    if (tune && pr.progress >= KNOB.early) hintSay(r, "take-" + st.kind, "Take the " + cfg.name.toLowerCase() + " off as the timer reaches the gold star.");
  }
  if (pr.progress >= 1 && !tune) advance(r, st);
}

/** A ready dish left in a station that spoils it (STATIONS burnAfter): it keeps for that long, then is lost. `hot` counts the time. */
function leftIn(r: Run, st: StationRun, hot: boolean) {
  const cfg = STATIONS[st.kind], pr = st.part!;
  if (!cfg.burnAfter) return;
  pr.exposure = hot ? pr.exposure + DT : Math.max(0, pr.exposure - DT / 2);
  if (pr.exposure >= cfg.burnAfter) { pr.state = "scorched"; say(r, cfg.spoil ?? "It was left too long and spoiled.", "warn"); r.events.push({ type: "scorched", station: st.kind }); }
}

export type Result = { n: number; v: number; max: number; stars: number; hq: number; score: number; cleared: boolean; completed: boolean;
  stamps: { served: boolean; rules: boolean; steady: boolean }; coins: number;
  /** Whole seconds left on the clock when a cleared service ended (0 when it was not cleared). */
  left: number;
  /** The level's optional fourth stamp. It is shown on the results and never gates a clear, stars or Mastery. */
  bonus: { kind: BonusKind; name: string; text: string; done: boolean } | null };
export function results(r: Run): Result {
  const n = r.guests.length, v = r.stats.served, max = maxCoins(r);
  const stars = v === n ? 1 + [0.75, 0.9].filter(f => r.coins >= Math.ceil(f * max)).length : 0;
  const hq = r.stats.prog ? r.stats.inBand / r.stats.prog : 1;
  const paid = r.guests.filter(g => g.paid), quickAvg = paid.length ? paid.reduce((a, g) => a + g.paid!.quick / 2, 0) / paid.length : 0;
  const score = v === n ? Math.round(70 + 20 * hq + 10 * quickAvg) : Math.floor(69 * v / n);
  const kind = r.level.bonus, st = r.stats;
  const done = v === n && !!kind && (kind === "golden" ? st.bestHq >= 0.95 : kind === "clean" ? st.mistakes === 0 && st.returned === 0 : kind === "order" ? st.inOrder
    : kind === "swift" ? st.minLeft >= 0.5 : hq >= 0.9);
  return { n, v, max, stars, hq, score, cleared: v === n, completed: v >= Math.ceil(0.75 * n), coins: r.coins, left: v === n ? Math.floor(r.timeLeft) : 0,
    stamps: { served: v === n, rules: r.stats.returned === 0, steady: hq >= 0.6 }, bonus: kind ? { kind, ...BONUS[kind], done } : null };
}
