/**
 * Recipe Kitchen missions (docs/game/GAME_CONTENT_PLAN.md §5): a service built from a level pack and a tier, the way
 * special.ts builds Today's special from a date. Pure and deterministic, so the server rebuilds the same level from the
 * pack hash and tier stored with the run. The pack must already be registered (content/pack.ts).
 */
import { DISHES, STATIONS, type StationKind } from "./content/dishes";
import { GUESTS } from "./content/guests";
import type { Level, Order } from "./content/levels";
import { packByHash, packHash, type LevelPack } from "./content/pack";
import { dishFeasible } from "./sim/plan";

export type Tier = "learn" | "service" | "memory";
export const TIERS: readonly Tier[] = ["learn", "service", "memory"];

/** Rough seconds a careful cook needs for one plate: every stage's time, placing each ingredient, then plating and serving. */
function dishSecs(dishId: string) {
  return DISHES[dishId].parts.reduce((sum, p) => sum + p.stages.reduce((s, st) => s + st.secs + st.slots.length * 1.5, 0), 0) + 8;
}

/** Guests who take each tier's orders, in a fixed order so the mission is the same everywhere. */
const SERVICE_GUESTS = ["office", "daniel", "nurul", "lim", "jia"];
const MEMORY_GUESTS = ["mei", "daniel", "asha", "lim", "nurul", "jia", "office"];
const TIER: Record<Tier, { n: number; orders: number; seats: number; hints: Level["hints"]; gap: number; patience: number; brief: string }> = {
  // n picks how the seeded plan treats the level (sim/plan.ts): 1 keeps arrivals as written, 5 also deals dishes to new guests.
  learn: { n: 1, orders: 1, seats: 1, hints: "full", gap: 1.3, patience: 3, brief: "Cook it once with the whole recipe card in front of you." },
  service: { n: 2, orders: 4, seats: 2, hints: "chip", gap: 0.8, patience: 2.4, brief: "Four orders, two at a time. The card shows the next step only." },
  memory: { n: 5, orders: 5, seats: 3, hints: "none", gap: 0.65, patience: 2.1, brief: "No recipe card, and some guests keep diet rules. Cook it from memory." },
};

/** The service a pack plays at a tier. Throws when the pack is not registered. */
export function missionFor(pack: LevelPack, tier: Tier): Level {
  const dishes = pack.dishes.map(d => d.id);
  if (!dishes.length || !packByHash(packHash(pack)) || dishes.some(d => !DISHES[d])) throw new Error("pack not registered");
  const t = TIER[tier], pool = tier === "memory" ? MEMORY_GUESTS : SERVICE_GUESTS;
  // A dish with an ingredient nobody has checked yet goes only to guests who keep no rule (a check that cannot be proven shows nothing).
  const unchecked = new Set(pack.unreviewed ?? []);
  const needsUnchecked = (dish: string) => DISHES[dish].parts.some(p => p.stages.some(s => s.slots.some(sl => !sl.optional && sl.accepts.every(a => unchecked.has(a)))));
  const canEat = (dish: string, g: string) => dishFeasible(dish, GUESTS[g].rules) && (!GUESTS[g].rules.length || !needsUnchecked(dish));
  const orders: Order[] = [];
  let at = 1;
  for (let i = 0; i < Math.max(t.orders, tier === "learn" ? dishes.length : 0); i++) {
    const dish = dishes[i % dishes.length];
    // Each order goes to the next guest in the pool who can eat the dish; the office crowd keeps no rules, so someone always can.
    const guest = tier === "learn" ? "office" : [...pool.slice(i % pool.length), ...pool].find(g => canEat(dish, g)) ?? "office";
    orders.push({ id: tier[0] + i, guest, dish, at: Math.round(at) });
    at += dishSecs(dish) * t.gap;
  }
  const slowest = Math.max(...dishes.map(dishSecs));
  const stations = (Object.keys(STATIONS) as StationKind[]).filter(k => pack.dishes.some(d => d.parts.some(p => p.station === k)));
  const first = pack.dishes[0];
  return {
    n: t.n, name: first.name, brief: t.brief, teach: first.remember, stations, mission: { pack: packHash(pack), tier },
    seats: t.seats, maxOpen: t.seats, hints: t.hints, distractors: [], unlocks: [], orders,
    patience: Math.round(Math.max(55, slowest * t.patience)),
    round: Math.round(at + slowest * 1.5 + 20),
  };
}
