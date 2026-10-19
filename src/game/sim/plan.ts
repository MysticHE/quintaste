/**
 * One particular service of a level: a seed turns the level's script into the arrivals, shuffled jars and twists a player
 * will actually meet. Everything is decided here, before the first tick, so the simulation needs no randomness while it
 * runs and the server can replay a run from its inputs and its seed alone (the seed is derived from the run's id).
 * Pure TypeScript: the Node API loads this file directly.
 */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { GUESTS, conflicts, type Rule } from "../content/guests";
import { PAIRS, type Flip } from "../content/items";
import type { Level, Order } from "../content/levels";

/** FNV-1a over text, as an unsigned 32-bit seed. A run's id (a UUID) becomes its seed. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Mulberry32: a small, fast seeded generator. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** True when every required slot has at least one accepted item that fits the rules (with this run's jars). */
export function dishFeasible(dishId: string, rules: Rule[], flip?: Flip) {
  return DISHES[dishId].parts.every(p => p.stages.every(s => s.slots.every(sl => sl.optional || sl.accepts.some(a => !conflicts([a], rules, flip).length))));
}

export type Flare = { at: number; station: StationKind };
export type Plan = {
  orders: Order[]; flip: Flip; flares: Flare[];
  /** When the lunch-wave bell rings, and the ingredient that runs out (low a few seconds before `at`). */
  bell: number | null; stock: { item: string; at: number } | null;
  /** A guest who changes their mind: the order, when, and the dish they ask for instead. */
  change: { orderId: string; at: number; to: string } | null;
  vip: string | null; neglect: number | null;
};
/** Seconds before a flare that the warning shows. */
export const FLARE_WARN = 2.5;
/** A VIP's patience, as a share of the level's. */
export const VIP_PATIENCE = 0.65;

export function buildPlan(level: Level, base: Order[], seed: number): Plan {
  const rand = rng(seed), twist = (k: string) => level.twists?.find(t => t.kind === k);
  const rulesOf = (o: Order): Rule[] => [...GUESTS[o.guest].rules, ...(level.allRules ?? [])];
  // Which look-alike jar hides the problem is decided per run, so nobody can learn "always take B".
  const flip: Flip = {};
  for (const [a, b] of PAIRS) if (rand() < 0.5) { flip[a] = b; flip[b] = a; }

  let orders = base.map(o => ({ ...o }));
  // From Level 5 the same dishes are dealt to different guests. Dishes are swapped only between orders that use the same
  // stations, so the level's pacing (which station is busy when) is kept, and each deal must be cookable for its guest.
  if (level.n >= 5 && !level.signature) {
    const kit = (dish: string) => [...new Set(DISHES[dish].parts.map(p => p.station))].sort().join("+");
    for (const group of [...new Set(orders.map(o => kit(o.dish)))]) {
      const at = orders.map((o, i) => (kit(o.dish) === group ? i : -1)).filter(i => i >= 0);
      for (let attempt = 0; attempt < 8 && at.length > 1; attempt++) {
        const dishes = at.map(i => orders[i].dish);
        for (let i = dishes.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [dishes[i], dishes[j]] = [dishes[j], dishes[i]]; }
        if (at.every((oi, k) => dishFeasible(dishes[k], rulesOf(orders[oi]), flip))) { at.forEach((oi, k) => { orders[oi] = { ...orders[oi], dish: dishes[k] }; }); break; }
      }
    }
  }
  // Arrivals keep the level's rhythm but not its exact timing: each gap between guests stretches or shrinks by up to a fifth
  // (the first guest moves a second), so a tightly paced level is never bunched up. Level 1 and a wave stay as written.
  const wave = twist("wave")?.n, sorted = [...orders].sort((a, b) => a.at - b.at);
  let prevOld = 0, prevNew = 0;
  orders = sorted.map((o, i) => {
    const gap = o.at - prevOld, near = wave != null && Math.abs(o.at - wave) <= 6;
    const at = level.n === 1 || near ? o.at : i === 0 ? Math.max(1, Math.round(o.at + (rand() * 2 - 1))) : Math.max(prevNew + 1, Math.round(prevNew + gap * (1 + (rand() * 2 - 1) * 0.2)));
    prevOld = o.at; prevNew = at; return { ...o, at };
  });

  const round = level.round, heat = level.stations.filter(k => STATIONS[k].heat);
  const flares: Flare[] = [], flare = twist("flare");
  if (flare && heat.length) {
    const n = flare.n ?? 1;
    for (let i = 0; i < n; i++) {
      const lo = round * (0.22 + 0.5 * i / n), hi = round * (0.22 + 0.5 * (i + 1) / n);
      flares.push({ at: Math.round(lo + rand() * (hi - lo)), station: heat[Math.floor(rand() * heat.length)] });
    }
  }
  let change: Plan["change"] = null;
  if (twist("change") && orders.length >= 2) {
    const i = 1 + Math.floor(rand() * Math.min(2, orders.length - 1)), pool = [...new Set(orders.map(o => o.dish))].sort();
    const to = pool.filter(d => d !== orders[i].dish && dishFeasible(d, rulesOf(orders[i]), flip));
    if (to.length) change = { orderId: orders[i].id, at: orders[i].at + 5, to: to[Math.floor(rand() * to.length)] };
  }
  // An ingredient may run out only when every guest can still be served without it.
  let stock: Plan["stock"] = null;
  if (twist("stockout")) {
    const wanted = orders.map(o => ({ dish: change?.orderId === o.id ? [o.dish, change.to] : [o.dish], rules: rulesOf(o) }));
    const candidates = new Set<string>();
    for (const { dish } of wanted) for (const d of dish) for (const p of DISHES[d].parts) for (const st of p.stages) for (const sl of st.slots) if (sl.accepts.length > 1) sl.accepts.forEach(a => candidates.add(a));
    const safe = [...candidates].sort().filter(x => wanted.every(({ dish, rules }) => dish.every(d => DISHES[d].parts.every(p => p.stages.every(st => st.slots.every(sl =>
      !sl.accepts.includes(x) || sl.optional || sl.accepts.some(y => y !== x && !conflicts([y], rules, flip).length)))))));
    if (safe.length) stock = { item: safe[Math.floor(rand() * safe.length)], at: Math.round(round * (0.28 + 0.3 * rand())) };
  }
  const vip = twist("vip") && orders.length >= 2 ? orders[1 + Math.floor(rand() * (orders.length - 1))].id : null;
  return { orders, flip, flares, bell: wave != null ? Math.max(0, wave - 6) : null, stock, change, vip, neglect: twist("neglect")?.n ?? null };
}
