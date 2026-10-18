/**
 * Game progress saved in the owner's local document (GAME_PLAN Phase A; Phase B moves it to the account with server replay).
 * Credits are earned only and never bought (QT-056); nothing expires (QT-057).
 */
import { ACCESSORIES, CREDIT_REWARDS, DECOR, DECOR_SLOTS, PETS, SKINS, TIERS, type Tier, type Unlock } from "./content/cosmetics";
import { gamePreviewTools } from "../config/game";
import { LEVELS } from "./content/levels";
import { DISHES } from "./content/dishes";

export type LevelBest = { stars: number; score: number; served: boolean; rules: boolean; steady: boolean; mastered: boolean; clears: number };
export type GameProgress = {
  version: 1; best: Record<string, LevelBest>; credits: number; owned: string[];
  pet: string; equip: Record<string, string | null>; decor: Record<string, string | null>; skin: string; cafeName: string;
  menu: "chinese" | "malay" | "peranakan"; mode: "rush" | "calm"; signature: string[]; introSeen: boolean;
  /** Unlocks already revealed on the New find screen. */
  seen: string[];
  /** Lotus tier from the Lotus Avatar flow; null until that ships. Development builds can preview tiers. */
  tier: Tier | null;
};
export const emptyGame = (): GameProgress => ({
  version: 1, best: {}, credits: 0, owned: [], pet: "sprout", equip: {}, decor: { ceiling: null, wall: "painting", floorL: "plant", floorR: null },
  skin: "sunny", cafeName: "My Café", menu: "chinese", mode: "rush", signature: [], introSeen: false, seen: [], tier: null,
});

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});

export function readGame(value: unknown): GameProgress {
  const input = rec(value), base = emptyGame();
  const best: Record<string, LevelBest> = {};
  for (const [k, v] of Object.entries(rec(input.best))) {
    if (!/^([1-9]|1\d|20)$/.test(k)) continue;
    const b = rec(v);
    best[k] = { stars: num(b.stars, 0, 3, 0), score: num(b.score, 0, 100, 0), served: b.served === true, rules: b.rules === true, steady: b.steady === true,
      mastered: b.mastered === true, clears: num(b.clears, 0, 100000, 0) };
  }
  const equip: Record<string, string | null> = {};
  for (const [p, a] of Object.entries(rec(input.equip))) if (PETS[p]) equip[p] = typeof a === "string" && ACCESSORIES[a] ? a : null;
  const decor = { ...base.decor };
  for (const slot of DECOR_SLOTS) { const d = rec(input.decor)[slot]; if (d === null || (typeof d === "string" && DECOR[d])) decor[slot] = d as string | null; }
  const name = typeof input.cafeName === "string" ? input.cafeName.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 18) : "";
  return {
    version: 1, best, credits: num(input.credits, 0, 1_000_000, 0),
    owned: Array.isArray(input.owned) ? [...new Set(input.owned.filter((x): x is string => typeof x === "string" && !!DECOR[x]))] : [],
    pet: typeof input.pet === "string" && PETS[input.pet] ? input.pet : base.pet, equip, decor,
    skin: typeof input.skin === "string" && SKINS[input.skin] ? input.skin : base.skin, cafeName: name || base.cafeName,
    menu: input.menu === "malay" || input.menu === "peranakan" ? input.menu : "chinese", mode: input.mode === "calm" ? "calm" : "rush",
    signature: Array.isArray(input.signature) ? input.signature.filter((x): x is string => typeof x === "string" && !!DISHES[x]).slice(0, 3) : [],
    introSeen: input.introSeen === true, seen: Array.isArray(input.seen) ? [...new Set(input.seen.filter((x): x is string => typeof x === "string" && x.length < 40))].slice(0, 200) : [], // Lotus tiers are paid entitlements: until the Lotus flow has a server record, only development previews may set one.
    tier: gamePreviewTools && typeof input.tier === "string" && (TIERS as string[]).includes(input.tier) ? input.tier as Tier : null,
  };
}
export function mergeGame(profile: GameProgress, guest: GameProgress): GameProgress {
  const best = { ...guest.best };
  for (const [k, b] of Object.entries(profile.best)) {
    const g = best[k];
    best[k] = !g ? b : { stars: Math.max(b.stars, g.stars), score: Math.max(b.score, g.score), served: b.served || g.served, rules: b.rules || g.rules,
      steady: b.steady || g.steady, mastered: b.mastered || g.mastered, clears: Math.max(b.clears, g.clears) };
  }
  const profileStarted = Object.keys(profile.best).length > 0;
  return { ...(profileStarted ? profile : guest), best, credits: Math.max(profile.credits, guest.credits), owned: [...new Set([...profile.owned, ...guest.owned])], seen: [...new Set([...profile.seen, ...guest.seen])] };
}

// ---------- derived ----------
export const cleared = (g: GameProgress, n: number) => (g.best[String(n)]?.clears ?? 0) > 0;
export const highestCleared = (g: GameProgress) => { let n = 0; while (n < LEVELS.length && cleared(g, n + 1)) n++; return n; };
export const nextLevel = (g: GameProgress) => Math.min(LEVELS.length, highestCleared(g) + 1);
export const levelOpen = (g: GameProgress, n: number) => n <= nextLevel(g);
export function isUnlocked(g: GameProgress, u: Unlock, id?: string) {
  if (u.kind === "free") return true;
  if (u.kind === "level") return cleared(g, u.level);
  if (u.kind === "tier") return !!g.tier && TIERS.indexOf(g.tier) >= TIERS.indexOf(u.tier);
  return !!id && g.owned.includes(id);
}

/** Applies a finished service: best stamps, clears and earned credits. Returns the reward line to show. */
export function applyResult(g: GameProgress, level: number, res: { stars: number; score: number; cleared: boolean; stamps: { served: boolean; rules: boolean; steady: boolean } }) {
  const key = String(level), prev = g.best[key];
  const first = res.cleared && !(prev && prev.clears > 0);
  const masteredNow = res.stamps.served && res.stamps.rules && res.stamps.steady;
  const firstMastered = masteredNow && !prev?.mastered;
  const credits = res.cleared ? (first ? CREDIT_REWARDS.firstClear : CREDIT_REWARDS.replay) + (firstMastered ? CREDIT_REWARDS.mastered : 0) : 0;
  const next: LevelBest = {
    stars: Math.max(prev?.stars ?? 0, res.stars), score: Math.max(prev?.score ?? 0, res.score),
    served: !!prev?.served || res.stamps.served, rules: !!prev?.rules || res.stamps.rules, steady: !!prev?.steady || res.stamps.steady,
    mastered: !!prev?.mastered || masteredNow, clears: (prev?.clears ?? 0) + (res.cleared ? 1 : 0),
  };
  const unlocks = first ? LEVELS[level - 1].unlocks : [];
  return { game: { ...g, best: { ...g.best, [key]: next }, credits: g.credits + credits }, reward: { credits, first, mastered: firstMastered, unlocks } };
}
