/**
 * Today's special on the chalkboard (GAME_PLAN §10): one dish the member has learned, cooked for regulars they have met,
 * picked by the Singapore date. On lunar 1st and 15th and Nine Emperor Gods days every order is five pungent-free.
 * Optional and replayable: a clear earns the normal replay grant, nothing is recorded per day, so there is no streak
 * and nothing to miss.
 */
import { lunarMoment } from "../data/lunar";
import { sgDay } from "../utils/sg-datetime";
import { CREDIT_REWARDS } from "./content/cosmetics";
import { DISHES, type StationKind } from "./content/dishes";
import { GUESTS, type Rule } from "./content/guests";
import { LEVELS, type Level } from "./content/levels";
import { applyResult, cleared, highestCleared, type GameProgress } from "./progress";
import { dishFeasible } from "./sim/engine";

export type Special = { day: string; dish: string; lunar: string | null; level: Level };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The chalkboard opens once Level 5 is cleared, as the café sheet and scene already show. */
export const menuBoardOpen = (g: GameProgress) => cleared(g, 5);

function random(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 | 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
}

/** The special for one Singapore date (YYYY-MM-DD), or null before the chalkboard opens. */
export function specialFor(game: GameProgress, day: string): Special | null {
  if (!DAY.test(day) || !menuBoardOpen(game)) return null;
  const moment = lunarMoment(Date.parse(day + "T12:00:00+08:00")), extra: Rule[] = moment ? ["five"] : [];
  const top = highestCleared(game), rand = random("qt-special:" + day);
  const met = Object.values(GUESTS).filter(g => g.first <= top);
  const eaters = (dish: string) => met.filter(g => dishFeasible(dish, [...g.rules, ...extra]));
  const learned = [...new Set(LEVELS.filter(l => l.n <= top).flatMap(l => l.orders.map(o => o.dish)))].filter(d => d !== "*" && DISHES[d] && eaters(d).length >= 2).sort();
  if (!learned.length) return null;
  const dish = learned[Math.floor(rand() * learned.length)];
  const guests = eaters(dish);
  for (let i = guests.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [guests[i], guests[j]] = [guests[j], guests[i]]; }
  const d = DISHES[dish], stations = [...new Set(d.parts.map(p => p.station))] as StationKind[];
  const level: Level = {
    n: 0, name: "Today's special", teach: d.remember, stations, seats: 3, maxOpen: 3, round: 150, patience: 90, hints: "none", distractors: [], unlocks: [],
    brief: "Four orders from your regulars today." + (moment ? " It's the " + moment.label + (moment.label === "Nine Emperor Gods" ? " festival" : "") + ", so every order is five pungent-free." : ""),
    orders: [1, 8, 34, 58].map((at, i) => ({ id: "s" + (i + 1), guest: guests[i % guests.length].id, dish, at })),
    ...(moment ? { allRules: ["five"] as Rule[] } : {}), special: { day, dish, lunar: moment?.label ?? null },
  };
  return { day, dish, lunar: moment?.label ?? null, level };
}
export const todaysSpecial = (game: GameProgress, now = Date.now()) => specialFor(game, sgDay(now));

/** A finished special: the normal replay grant on a clear, and nothing else is recorded. */
export function applySpecial(game: GameProgress, res: { cleared: boolean }) {
  const credits = res.cleared ? CREDIT_REWARDS.replay : 0;
  return { game: { ...game, credits: game.credits + credits }, reward: { credits, first: false, mastered: false, unlocks: [] as string[] } };
}

/** Applies a finished service on the device: a special pays the replay grant, a numbered level the full applyResult. */
export function applyRun(game: GameProgress, start: { level: number; special?: string | null }, res: Parameters<typeof applyResult>[2]) {
  return start.special ? applySpecial(game, res) : applyResult(game, start.level, res);
}
