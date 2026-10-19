/**
 * Rush Hour simulation: pure TypeScript, no Phaser or DOM (GAME_PLAN §12.3). The renderer calls actions and tick(),
 * then drains `run.events` for animation. Generalised from the tested Level 5 sketch.
 */
import { DISHES, STATIONS, type Part, type Stage, type StationKind } from "../content/dishes";
import { GUESTS, conflicts, reason, RULES, type Rule } from "../content/guests";
import { ITEMS, itemName } from "../content/items";
import { levelByNumber, type Level } from "../content/levels";
import { PETS, SKILLS } from "../content/cosmetics";

export const DT = 0.05;
const BOARD_SLOTS = 3, WALK = 1, EAT = 1.4, LEAVE = 1;

export type PlacedItem = { uid: number; id: string; stage: number; warn: boolean };
export type PartRun = { dishId: string; partId: string; stage: number; items: PlacedItem[]; progress: number;
  state: "loading" | "cooking" | "waiting" | "ready" | "scorched" | "split"; exposure: number; inBand: number; prog: number };
export type StationRun = { kind: StationKind; heatOn: boolean; F: number; H: number; part: PartRun | null; hotWarned: boolean };
export type PlatePart = { partId: string; items: string[]; hq: number };
export type Plate = { uid: number; dishId: string; parts: PlatePart[] };
export type GuestRun = { orderId: string; guestId: string; dishId: string; seat: number; at: number; rules: Rule[];
  state: "queue" | "walking" | "waiting" | "eating" | "leaving" | "gone"; st: number; patience: number;
  order: "open" | "served" | "expired"; paid: { base: number; heatTip: number; quick: number; total: number } | null };
export type GameEvent =
  | { type: "placed"; station: StationKind; item: string; warn: boolean } | { type: "rejected"; item: string }
  | { type: "ready"; station: StationKind } | { type: "scorched"; station: StationKind } | { type: "split"; station: StationKind }
  | { type: "plated"; station: StationKind; slot: number } | { type: "served"; seat: number; slot: number; coins: number }
  | { type: "returned"; seat: number; slot: number } | { type: "arrived"; seat: number } | { type: "left"; seat: number; expired: boolean }
  | { type: "skill"; skill: string } | { type: "stage"; station: StationKind } | { type: "end" };
/** One player input: the tick it happened on, the action and its arguments. The server replays these (sim/replay.ts). */
export type Action = [tick: number, op: string, ...args: (string | number | boolean | null)[]];
export type Run = {
  level: Level; mode: "rush" | "calm"; pet: string; t: number; timeLeft: number; started: boolean; paused: boolean; label: string | null;
  ended: boolean; endReason: "" | "time" | "done" | "quit"; focus: string | null; selected: StationKind;
  stations: Partial<Record<StationKind, StationRun>>; board: (Plate | null)[]; guests: GuestRun[]; coins: number; uid: number;
  skill: { used: boolean; freezeUntil: number; halfUntil: number; steadyUntil: number; steadyStation: StationKind | null };
  stats: { inBand: number; prog: number; returned: number; servedBad: number; labels: number; served: number; expired: number; mistakes: number };
  say: { who: string | null; text: string; tone: "info" | "warn" | "good" }; seen: Set<string>; events: GameEvent[]; log: string[];
  /** Simulated ticks so far (time only moves while playing) and every input in order, for server replay. */
  ticks: number; actions: Action[];
};

/** True when every required slot has at least one accepted item that fits the rules. */
export function dishFeasible(dishId: string, rules: Rule[]) {
  return DISHES[dishId].parts.every(p => p.stages.every(s => s.slots.every(sl => sl.optional || sl.accepts.some(a => !conflicts([a], rules).length))));
}
/** Signature level: each guest gets a chosen dish they can eat (round-robin); ABC soup fits every rule as a fallback. */
function resolveOrders(level: Level, signature: string[]) {
  return level.orders.map((o, i) => {
    if (o.dish !== "*") return o;
    const rules = [...GUESTS[o.guest].rules, ...(level.allRules ?? [])];
    const fits = signature.filter(d => DISHES[d] && dishFeasible(d, rules));
    return { ...o, dish: fits.length ? fits[i % fits.length] : "abc-soup" };
  });
}

/** A run of a numbered level, or of a built level such as Today's special. `hints` overrides the level's hint plan (Play your way). */
export function createRun(which: number | Level, mode: "rush" | "calm", pet: string, signature: string[] = [], hints?: Level["hints"]): Run {
  const base = typeof which === "number" ? levelByNumber(which) : which, level = hints && hints !== base.hints ? { ...base, hints } : base;
  const rush = mode === "rush" && level.round !== null;
  const stations: Run["stations"] = {};
  level.stations.forEach(kind => { stations[kind] = { kind, heatOn: false, F: 0.1, H: 0.15, part: null, hotWarned: false }; });
  const guests: GuestRun[] = resolveOrders(level, signature).map(o => ({
    orderId: o.id, guestId: o.guest, dishId: o.dish, seat: 0, at: o.at, rules: [...new Set([...GUESTS[o.guest].rules, ...(level.allRules ?? [])])],
    state: "queue", st: 0, patience: level.patience, order: "open", paid: null,
  }));
  return { level, mode: rush ? "rush" : "calm", pet: PETS[pet] ? pet : "sprout", t: 0, timeLeft: level.round ?? 0, started: false, paused: false, label: null,
    ended: false, endReason: "", focus: null, selected: level.stations[0], stations, board: Array(BOARD_SLOTS).fill(null), guests, coins: 0, uid: 1,
    skill: { used: false, freezeUntil: 0, halfUntil: 0, steadyUntil: 0, steadyStation: null },
    stats: { inBand: 0, prog: 0, returned: 0, servedBad: 0, labels: 0, served: 0, expired: 0, mistakes: 0 },
    say: { who: null, text: level.brief, tone: "info" }, seen: new Set(), events: [], log: [], ticks: 0, actions: [] };
}

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
export const maxCoins = (r: Run) => r.guests.length * (r.mode === "rush" ? 16 : 14);
const record = (r: Run, line: string) => { r.log.push(r.t.toFixed(2) + " " + line); };
/** Logs every input before it runs, accepted or not, so replaying the same calls on the same ticks rebuilds the run exactly. */
const input = (r: Run, op: string, ...args: (string | number | boolean | null)[]) => { r.actions.push([r.ticks, op, ...args]); };

export function start(r: Run) { input(r, "start"); r.started = true; record(r, "start " + r.mode); }
export function setFocus(r: Run, orderId: string) {
  input(r, "focus", orderId);
  if (idle(r)) return;
  const g = guestByOrder(r, orderId); if (!g || g.state !== "waiting") return;
  r.focus = orderId; record(r, "focus " + orderId);
  const station = DISHES[g.dishId].parts[0].station; if (r.stations[station]) r.selected = station;
  const rules = g.rules.map(x => RULES[x].spoken).join(" and ");
  say(r, "Cooking " + dishName(g.dishId) + " for " + GUESTS[g.guestId].name + (rules ? ": " + rules + "." : ". No food rules."));
}
export function select(r: Run, station: StationKind) { input(r, "select", station); if (r.stations[station]) { r.selected = station; record(r, "select " + station); } }

/** Which station an item should go to for the focused guest: the part that uses it, else the selected station. */
export function targetStation(r: Run, itemId: string): StationKind {
  const g = focusGuest(r);
  if (g) for (const p of DISHES[g.dishId].parts) if (r.stations[p.station] && p.stages.some(s => s.slots.some(sl => sl.accepts.includes(itemId)))) {
    const st = r.stations[p.station]!; if (!st.part || st.part.dishId === g.dishId) return p.station;
  }
  return r.selected;
}

function check(r: Run, itemId: string, kind: StationKind): string | null {
  const st = r.stations[kind]; if (!st) return "That station isn't in this kitchen yet.";
  const g = focusGuest(r);
  if (!st.part) {
    if (!g) return "Tap a guest first to choose who you are cooking for.";
    const part = dishPart(g.dishId, kind);
    if (!part) return dishName(g.dishId) + " doesn't use the " + STATIONS[kind].name.toLowerCase() + ".";
    if (!part.stages[0].slots.some(s => s.accepts.includes(itemId)))
      return part.stages.some(s => s.slots.some(sl => sl.accepts.includes(itemId))) ? "Not yet. Start with " + part.stages[0].hint + "." : itemName(itemId) + " isn't in " + dishName(g.dishId) + ". The recipe strip shows what goes in.";
    return null;
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
    return itemName(itemId) + " isn't in " + part.name.toLowerCase() + ".";
  }
  if (pr.items.some(x => x.stage === pr.stage && slot.accepts.includes(x.id))) return "The " + STATIONS[kind].name.toLowerCase() + " already has " + slot.label.toLowerCase() + ".";
  return null;
}

const idle = (r: Run) => !r.started || r.paused || r.ended || !!r.label;
export function place(r: Run, itemId: string, at?: StationKind): boolean {
  input(r, "place", itemId, at ?? null);
  if (idle(r)) return false;
  const kind = at ?? targetStation(r, itemId);
  const why = check(r, itemId, kind);
  if (why) { say(r, why, "warn"); r.events.push({ type: "rejected", item: itemId }); return false; }
  const st = r.stations[kind]!, g = focusGuest(r);
  if (!st.part && g) { const part = dishPart(g.dishId, kind)!; st.part = { dishId: g.dishId, partId: part.id, stage: 0, items: [], progress: 0, state: "loading", exposure: 0, inBand: 0, prog: 0 }; }
  const pr = st.part!, stage = stageOf(pr), band = bandOf(st, pr);
  const warn = !!g && conflicts([itemId], g.rules).length > 0 && pr.dishId === g.dishId;
  pr.items.push({ uid: r.uid++, id: itemId, stage: pr.stage, warn });
  r.selected = kind; record(r, "place " + itemId + " " + kind);
  r.events.push({ type: "placed", station: kind, item: itemId, warn });
  if (warn && g) { r.stats.mistakes++; say(r, reason(itemId, g.rules) + " Tap it in the pan chips to lift it out.", "warn"); }
  if (stage.splitIfHot?.includes(itemId) && STATIONS[kind].heat && st.H > band[1]) {
    pr.state = "split"; say(r, "Too hot: the " + itemName(itemId).toLowerCase() + " split. Restart the dish; it's free. Turn the heat down before adding it.", "warn");
    r.events.push({ type: "split", station: kind }); return true;
  }
  const required = stage.slots.filter(s => !s.optional);
  const filled = required.every(s => pr.items.some(x => x.stage === pr.stage && s.accepts.includes(x.id)));
  if (filled && (pr.state === "loading" || pr.state === "waiting")) {
    pr.state = "cooking";
    if (!STATIONS[kind].heat && stage.secs === 0) advance(r, st);
    else if (!warn) hintSay(r, "cook-" + kind, STATIONS[kind].heat ? (st.heatOn ? "Cooking. Keep the needle in the striped band." : "Turn the heat on and keep the needle in the striped band.") : STATIONS[kind].name + " is cooking. Work on another order meanwhile.");
  } else if (!warn && !filled) hintSay(r, "half-" + pr.stage, "Good. Now " + stage.hint + ".");
  return true;
}

export function lift(r: Run, kind: StationKind, uid: number) {
  input(r, "lift", kind, uid);
  if (idle(r)) return;
  const st = r.stations[kind], pr = st?.part; if (!st || !pr) return;
  const item = pr.items.find(i => i.uid === uid); if (!item) return;
  if (item.stage !== pr.stage || pr.progress > 0 || pr.state === "ready") { say(r, "That is already cooking. Restart the dish if you need to; it's free.", "warn"); return; }
  pr.items.splice(pr.items.indexOf(item), 1); record(r, "lift " + item.id);
  const req = stageOf(pr).slots.filter(s => !s.optional);
  if (pr.state === "cooking" && !req.every(s => pr.items.some(x => x.stage === pr.stage && s.accepts.includes(x.id)))) pr.state = pr.stage === 0 ? "loading" : "waiting";
  if (!pr.items.length && pr.stage === 0) st.part = null;
  say(r, itemName(item.id) + " is back on the shelf.");
}
export function restart(r: Run, kind: StationKind) { input(r, "restart", kind); if (idle(r)) return; const st = r.stations[kind]; if (!st) return; st.part = null; record(r, "restart " + kind); say(r, "Fresh start. It's free."); }
export function toggleHeat(r: Run, kind: StationKind) {
  input(r, "heat", kind);
  const st = r.stations[kind]; if (!st || !STATIONS[kind].heat || idle(r)) return;
  st.heatOn = !st.heatOn; r.selected = kind; record(r, "heat " + kind + " " + st.heatOn);
}
export function openLabel(r: Run, itemId: string) { input(r, "label", itemId); if (ITEMS[itemId]?.label && r.started && !r.paused && !r.ended) { r.label = itemId; r.stats.labels++; record(r, "label " + itemId); } }
export function closeLabel(r: Run) { input(r, "close"); r.label = null; }
export function pause(r: Run, on: boolean) { input(r, "pause", on); r.paused = on; if (on) Object.values(r.stations).forEach(s => { if (s) s.heatOn = false; }); }

function advance(r: Run, st: StationRun) {
  const pr = st.part!, part = partOf(pr);
  pr.exposure = 0;
  if (pr.stage < part.stages.length - 1) {
    pr.stage++; pr.progress = 0; pr.state = "waiting"; r.events.push({ type: "stage", station: st.kind });
    hintSay(r, "stage-" + st.kind + pr.stage, "Step " + pr.stage + " done. Add " + part.stages[pr.stage].hint + ".");
  } else {
    pr.state = "ready"; r.events.push({ type: "ready", station: st.kind });
    hintSay(r, "ready-" + st.kind, "Ready! Plate it, then serve the guest it suits.");
  }
}

export function plate(r: Run, kind: StationKind): boolean {
  input(r, "plate", kind);
  if (idle(r)) return false;
  const st = r.stations[kind], pr = st?.part;
  if (!st || !pr || pr.state !== "ready") { say(r, !pr ? "Nothing to plate yet." : "Not ready yet.", "warn"); return false; }
  const hq = pr.prog ? pr.inBand / pr.prog : STATIONS[kind].heat ? 0 : 1;
  const piece: PlatePart = { partId: pr.partId, items: pr.items.map(i => i.id), hq };
  const dish = DISHES[pr.dishId];
  let slot = r.board.findIndex(p => p && p.dishId === pr.dishId && p.parts.length < dish.parts.length && !p.parts.some(x => x.partId === pr.partId));
  if (slot >= 0) r.board[slot]!.parts.push(piece);
  else {
    slot = r.board.indexOf(null);
    if (slot < 0) { say(r, "The board is full. Serve a plate first.", "warn"); return false; }
    r.board[slot] = { uid: r.uid++, dishId: pr.dishId, parts: [piece] };
  }
  st.part = null; record(r, "plate " + kind + " " + slot);
  r.events.push({ type: "plated", station: kind, slot });
  const p = r.board[slot]!;
  say(r, p.parts.length < dish.parts.length ? "Half a " + dish.name.toLowerCase() + ". Cook the " + dish.parts.find(x => !p.parts.some(y => y.partId === x.id))!.name.toLowerCase() + " too." : "Plated. Serve it to the guest it suits.");
  return true;
}
export const plateComplete = (p: Plate) => p.parts.length === DISHES[p.dishId].parts.length;

export function serve(r: Run, slot: number, orderId: string) {
  input(r, "serve", slot, orderId);
  if (idle(r)) return;
  const p = r.board[slot], g = guestByOrder(r, orderId);
  if (!p || !g || g.state !== "waiting") return;
  if (!plateComplete(p)) { say(r, "That plate is missing part of the dish.", "warn"); return; }
  if (p.dishId !== g.dishId) { say(r, GUESTS[g.guestId].name + " ordered " + dishName(g.dishId) + ".", "warn", g.guestId); r.events.push({ type: "returned", seat: g.seat, slot }); return; }
  const items = p.parts.flatMap(x => x.items), bad = conflicts(items, g.rules);
  if (bad.length) {
    r.stats.returned++; record(r, "returned " + orderId);
    say(r, reason(bad[0], g.rules) + " Sorry, I can't eat this one.", "warn", g.guestId);
    r.events.push({ type: "returned", seat: g.seat, slot }); return;
  }
  const hq = p.parts.reduce((a, x) => a + x.hq, 0) / p.parts.length;
  const heatTip = Math.round(4 * hq), quick = r.mode === "rush" ? Math.round(2 * g.patience / r.level.patience) : 0;
  g.paid = { base: 10, heatTip, quick, total: 10 + heatTip + quick };
  r.coins += g.paid.total; g.order = "served"; g.state = "eating"; g.st = 0; r.board[slot] = null; r.stats.served++;
  record(r, "served " + orderId + " " + g.paid.total);
  say(r, GUESTS[g.guestId].thanks, "good", g.guestId);
  r.events.push({ type: "served", seat: g.seat, slot, coins: g.paid.total });
}

export function useSkill(r: Run) {
  input(r, "skill");
  if (r.skill.used || r.mode !== "rush" || idle(r)) return false;
  const skill = PETS[r.pet].skill; r.skill.used = true; record(r, "skill " + skill);
  if (skill === "breath") r.skill.freezeUntil = r.t + 6;
  if (skill === "bubbles") r.skill.halfUntil = r.t + 12;
  if (skill === "minute") r.timeLeft += 12;
  if (skill === "steady") { r.skill.steadyUntil = r.t + 8; r.skill.steadyStation = r.selected; }
  if (skill === "cheer") { const low = waiting(r).sort((a, b) => a.patience - b.patience)[0]; if (low) low.patience = Math.min(r.level.patience, low.patience + 20); }
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

export function tick(r: Run) {
  if (!r.started || r.paused || r.label || r.ended) return;
  r.t += DT; r.ticks++;
  if (r.mode === "rush") { r.timeLeft = Math.max(0, r.timeLeft - DT); if (r.timeLeft <= 0) { say(r, "Time. The kitchen closes for this service."); finish(r, "time"); return; } }
  const open = () => r.guests.filter(g => g.state === "walking" || g.state === "waiting").length;
  const frozen = r.t < r.skill.freezeUntil, half = r.t < r.skill.halfUntil;
  for (const g of r.guests) {
    g.st += DT;
    if (g.state === "queue" && r.t >= g.at && open() < r.level.maxOpen) { const seat = seatFor(r); if (seat) { g.seat = seat; g.state = "walking"; g.st = 0; } }
    else if (g.state === "walking" && g.st >= WALK) {
      g.state = "waiting"; g.st = 0; r.events.push({ type: "arrived", seat: g.seat });
      if (!focusGuest(r) || focusGuest(r)!.state !== "waiting") r.focus = g.orderId;
      say(r, GUESTS[g.guestId].hello.replace("{dish}", dishName(g.dishId)), "info", g.guestId);
    } else if (g.state === "waiting" && r.mode === "rush" && !frozen) {
      g.patience = Math.max(0, g.patience - DT * (half ? 0.5 : 1));
      if (g.patience <= 0) { g.order = "expired"; g.state = "leaving"; g.st = 0; r.stats.expired++; say(r, "Ran out of time. Next time, ah.", "warn", g.guestId); r.events.push({ type: "left", seat: g.seat, expired: true }); }
    } else if (g.state === "eating" && g.st >= EAT) { g.state = "leaving"; g.st = 0; r.events.push({ type: "left", seat: g.seat, expired: false }); }
    else if (g.state === "leaving" && g.st >= LEAVE) g.state = "gone";
  }
  const fg = focusGuest(r);
  if (!fg || fg.state !== "waiting") { const next = waiting(r)[0]; r.focus = next ? next.orderId : null; }
  for (const st of Object.values(r.stations)) if (st) heatStation(r, st);
  if (r.guests.every(g => g.state === "gone")) finish(r, "done");
}

function heatStation(r: Run, st: StationRun) {
  const cfg = STATIONS[st.kind], pr = st.part;
  if (!cfg.heat) {
    if (pr && pr.state === "cooking") { const secs = stageOf(pr).secs || 0.001; pr.progress = Math.min(1, pr.progress + DT / secs); if (pr.progress >= 1) advance(r, st); }
    return;
  }
  const steady = r.t < r.skill.steadyUntil && r.skill.steadyStation === st.kind;
  if (!steady) {
    st.F = st.heatOn ? Math.min(1, st.F + cfg.onRate * DT) : Math.max(0.1, st.F - cfg.offRate * DT);
    st.H = Math.min(1, Math.max(0, st.H + (cfg.gain * st.F - cfg.loss * st.H) * DT));
  }
  const [lo, hi] = bandOf(st, pr);
  if (st.H >= cfg.scorch && !st.hotWarned && pr && (pr.state === "cooking" || pr.state === "waiting")) { st.hotWarned = true; say(r, "Too hot. Turn the heat off and let it settle.", "warn"); }
  if (st.H < hi) st.hotWarned = false;
  if (!pr || pr.state !== "cooking") return;
  const stage = stageOf(pr);
  if (st.H < cfg.scorch) pr.exposure = Math.max(0, pr.exposure - DT / 2);
  if (st.H >= cfg.scorch) {
    pr.exposure += DT;
    if (pr.exposure >= (stage.scorchSecs ?? cfg.scorchSecs)) { pr.state = "scorched"; say(r, "Scorched. That happens. Restart it; it's free.", "warn"); r.events.push({ type: "scorched", station: st.kind }); }
    return;
  }
  const rate = st.H >= lo ? 1 : st.H >= lo - 0.1 ? 0.5 : 0;
  if (rate > 0) {
    pr.progress = Math.min(1, pr.progress + rate * DT / stage.secs); pr.prog++; r.stats.prog++;
    if (st.H >= lo && st.H <= hi) { pr.inBand++; r.stats.inBand++; }
  }
  if (pr.progress >= 1) advance(r, st);
}

export type Result = { n: number; v: number; max: number; stars: number; hq: number; score: number; cleared: boolean; completed: boolean;
  stamps: { served: boolean; rules: boolean; steady: boolean }; coins: number };
export function results(r: Run): Result {
  const n = r.guests.length, v = r.stats.served, max = maxCoins(r);
  const stars = v === n ? 1 + [0.75, 0.9].filter(f => r.coins >= Math.ceil(f * max)).length : 0;
  const hq = r.stats.prog ? r.stats.inBand / r.stats.prog : 1;
  const paid = r.guests.filter(g => g.paid), quickAvg = paid.length ? paid.reduce((a, g) => a + g.paid!.quick / 2, 0) / paid.length : 0;
  const score = v === n ? Math.round(70 + (r.mode === "rush" ? 20 * hq + 10 * quickAvg : 30 * hq)) : Math.floor(69 * v / n);
  return { n, v, max, stars, hq, score, cleared: v === n, completed: v >= Math.ceil(0.75 * n), coins: r.coins,
    stamps: { served: v === n, rules: r.stats.returned === 0, steady: hq >= 0.6 } };
}
