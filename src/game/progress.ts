/**
 * Game progress saved in the owner's local document (GAME_PLAN Phase A; Phase B moves it to the account with server replay).
 * Credits are earned only and never bought (QT-056); nothing expires (QT-057).
 */
import { ACCESSORIES, CREDIT_REWARDS, DECOR, DECOR_SLOTS, PETS, SKINS, TIERS, type Tier, type Unlock } from "./content/cosmetics";
import { defaultSettings, readSettings, type PlaySettings } from "./settings";
import { LEVELS } from "./content/levels";
import { BUILTIN } from "./content/pack";
import { SEASONS, seasonKey } from "./content/seasons";

/**
 * Best result per level. `bonus` is the level's optional fourth stamp, earned at least once. `coins` (takings) and `left`
 * (whole seconds left on the clock) are the best of the cleared services; 0 means none recorded yet (levels cleared before
 * these were stored), so a first record is never shown as a new best.
 */
export type LevelBest = { stars: number; score: number; served: boolean; rules: boolean; steady: boolean; mastered: boolean; clears: number; bonus: boolean; coins: number; left: number };
export type GameProgress = {
  version: 1; best: Record<string, LevelBest>; credits: number; owned: string[];
  pet: string; equip: Record<string, string | null>; decor: Record<string, string | null>; skin: string; cafeName: string;
  menu: "chinese" | "malay" | "peranakan"; mode: "rush"; signature: string[]; introSeen: boolean;
  /** Unlocks already revealed on the New find screen. */
  seen: string[];
  /** The account's lotus tier from the server (useGame adds it). Never saved or read from the device, so it is always null in storage. */
  tier: Tier | null;
  /** Play your way. */
  settings: PlaySettings;
  /** Season level bests by `seasonKey` ("zhai-days-1"). Guests keep them on the device only; members' come from the account. */
  seasons: Record<string, LevelBest>;
  /** Recipe Kitchen tier bests by recipe id. Guests keep them on the device (tiers open in order, no kitchen credits); members' are the account's. */
  kitchen: Record<string, Partial<Record<KitchenTier, LevelBest>>>;
};
export const KITCHEN_TIERS = ["learn", "service", "memory"] as const;
export type KitchenTier = (typeof KITCHEN_TIERS)[number];
/** How many recipes' Kitchen bests a device keeps: the most recently updated, which are the last keys (applyKitchen moves a recipe to the end). */
const KITCHEN_KEEP = 300;
const recentKitchen = (k: GameProgress["kitchen"]): GameProgress["kitchen"] => Object.fromEntries(Object.entries(k).slice(-KITCHEN_KEEP));
export const emptyGame = (): GameProgress => ({
  version: 1, best: {}, credits: 0, owned: [], pet: "sprout", equip: {}, decor: { ceiling: null, wall: "painting", floorL: "plant", floorR: null },
  skin: "sunny", cafeName: "My Café", menu: "chinese", mode: "rush", signature: [], introSeen: false, seen: [], tier: null, settings: { ...defaultSettings }, seasons: {}, kitchen: {},
});
/** Every season level the app has, so a stored best for anything else is dropped. */
const SEASON_KEYS = new Set(SEASONS.flatMap(s => s.levels.map(l => seasonKey(s.id, l.season!.n))));

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});

/** Own keys only: stored or client-sent ids such as "toString" must never match a built-in property. */
const own = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key);
export function readGame(value: unknown): GameProgress {
  const input = rec(value), base = emptyGame();
  const best: Record<string, LevelBest> = {}, seasons: Record<string, LevelBest> = {};
  for (const [k, v] of Object.entries(rec(input.best))) {
    // Only levels this app has: bests for levels that do not exist yet must never count (the device import caps credits by them).
    if (!/^[1-9]\d{0,2}$/.test(k) || +k > LEVELS.length) continue;
    best[k] = readBest(v);
  }
  for (const [k, v] of Object.entries(rec(input.seasons))) if (SEASON_KEYS.has(k)) seasons[k] = readBest(v);
  const kitchen: GameProgress["kitchen"] = {};
  for (const [k, v] of Object.entries(rec(input.kitchen)).filter(([k]) => /^[a-z0-9][a-z0-9-]{2,150}$/.test(k)).slice(-KITCHEN_KEEP)) {
    const tiers: Partial<Record<KitchenTier, LevelBest>> = {};
    for (const t of KITCHEN_TIERS) if (own(rec(v), t)) tiers[t] = readBest(rec(v)[t]);
    kitchen[k] = tiers;
  }
  const equip: Record<string, string | null> = {};
  for (const [p, a] of Object.entries(rec(input.equip))) if (own(PETS, p)) equip[p] = typeof a === "string" && own(ACCESSORIES, a) ? a : null;
  const decor = { ...base.decor };
  for (const slot of DECOR_SLOTS) { const d = rec(input.decor)[slot]; if (d === null || (typeof d === "string" && own(DECOR, d))) decor[slot] = d as string | null; }
  const name = typeof input.cafeName === "string" ? input.cafeName.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 18) : "";
  return {
    version: 1, best, credits: num(input.credits, 0, 1_000_000, 0),
    owned: Array.isArray(input.owned) ? [...new Set(input.owned.filter((x): x is string => typeof x === "string" && own(DECOR, x)))] : [],
    pet: typeof input.pet === "string" && own(PETS, input.pet) ? input.pet : base.pet, equip, decor,
    skin: typeof input.skin === "string" && own(SKINS, input.skin) ? input.skin : base.skin, cafeName: name || base.cafeName,
    menu: input.menu === "malay" || input.menu === "peranakan" ? input.menu : "chinese", mode: "rush",
    signature: Array.isArray(input.signature) ? input.signature.filter((x): x is string => typeof x === "string" && own(BUILTIN.dishes, x)).slice(0, 3) : [],
    introSeen: input.introSeen === true, seen: Array.isArray(input.seen) ? [...new Set(input.seen.filter((x): x is string => typeof x === "string" && x.length < 40))].slice(0, 200) : [],
    tier: null,
    settings: readSettings(input.settings), seasons, kitchen,
  };
}
function readBest(v: unknown): LevelBest {
  const b = rec(v);
  return { stars: num(b.stars, 0, 3, 0), score: num(b.score, 0, 100, 0), served: b.served === true, rules: b.rules === true, steady: b.steady === true,
    mastered: b.mastered === true, clears: num(b.clears, 0, 100000, 0), bonus: b.bonus === true, coins: num(b.coins, 0, 1000, 0), left: num(b.left, 0, 600, 0) };
}
const bestOf = (b: LevelBest, g: LevelBest | undefined): LevelBest => !g ? b : { stars: Math.max(b.stars, g.stars), score: Math.max(b.score, g.score),
  served: b.served || g.served, rules: b.rules || g.rules, steady: b.steady || g.steady, mastered: b.mastered || g.mastered, clears: Math.max(b.clears, g.clears),
  bonus: b.bonus || g.bonus, coins: Math.max(b.coins, g.coins), left: Math.max(b.left, g.left) };
/** Merges two tables of bests: the better of each stamp and record, key by key. */
const mergeBests = (a: Record<string, LevelBest>, b: Record<string, LevelBest>) => {
  const out = { ...b };
  for (const [k, x] of Object.entries(a)) out[k] = bestOf(x, out[k]);
  return out;
};
export function mergeGame(profile: GameProgress, guest: GameProgress): GameProgress {
  const best = mergeBests(profile.best, guest.best), seasons = mergeBests(profile.seasons, guest.seasons);
  const kitchen: GameProgress["kitchen"] = { ...guest.kitchen };
  for (const [k, tiers] of Object.entries(profile.kitchen)) kitchen[k] = mergeBests(tiers as Record<string, LevelBest>, (kitchen[k] ?? {}) as Record<string, LevelBest>);
  const profileStarted = Object.keys(profile.best).length > 0;
  return { ...(profileStarted ? profile : guest), best, seasons, kitchen: recentKitchen(kitchen), credits: Math.max(profile.credits, guest.credits),
    owned: [...new Set([...profile.owned, ...guest.owned])], seen: [...new Set([...profile.seen, ...guest.seen])] };
}

// ---------- derived ----------
export const cleared = (g: GameProgress, n: number) => (g.best[String(n)]?.clears ?? 0) > 0;
export const highestCleared = (g: GameProgress) => { let n = 0; while (n < LEVELS.length && cleared(g, n + 1)) n++; return n; };
export const nextLevel = (g: GameProgress) => Math.min(LEVELS.length, highestCleared(g) + 1);
export const levelOpen = (g: GameProgress, n: number) => n <= nextLevel(g);
export function isUnlocked(g: GameProgress, u: Unlock, id?: string) {
  if (u.kind === "free") return true;
  if (u.kind === "level") return cleared(g, u.level);
  if (u.kind === "season") return (g.seasons[seasonKey(u.season, u.n)]?.clears ?? 0) > 0;
  if (u.kind === "tier") return !!g.tier && TIERS.indexOf(g.tier) >= TIERS.indexOf(u.tier);
  return !!id && g.owned.includes(id);
}

/**
 * The game as shown: the account's lotus tier from the server, with any companion, accessory or skin that tier does not
 * cover shown as the free choice. The saved choice is kept and returns once the tier is known again (for example back online).
 */
export function withTier(g: GameProgress, tier: Tier | null): GameProgress {
  const view = { ...g, tier };
  const equip = Object.fromEntries(Object.entries(g.equip).map(([p, a]) => [p, a && isUnlocked(view, ACCESSORIES[a].unlock) ? a : null]));
  return { ...view, equip, pet: isUnlocked(view, PETS[g.pet].unlock) ? g.pet : "sprout", skin: isUnlocked(view, SKINS[g.skin].unlock) ? g.skin : "sunny" };
}

/** What a finished service must tell the progress rules (the simulation's Result has all of it). */
export type ServiceResult = { stars: number; score: number; cleared: boolean; coins: number; left: number; stamps: { served: boolean; rules: boolean; steady: boolean }; bonus: { done: boolean } | null };
/** Which personal bests a clear improved: only against a record that exists, so a first clear is a first clear. */
export type Beat = "score" | "coins" | "time";

/** Applies a finished service: best stamps, personal bests, clears and earned credits. Returns the reward line to show. */
export function applyResult(g: GameProgress, level: number, res: ServiceResult) {
  const key = String(level), { next, reward } = scored(g.best[key], res);
  const unlocks = reward.first ? LEVELS[level - 1].unlocks : [];
  return { game: { ...g, best: { ...g.best, [key]: next }, credits: g.credits + reward.credits }, reward: { ...reward, unlocks } };
}
/**
 * A finished season level (GAME_CONTENT_PLAN §6): the same stamps and grants as a numbered level (first clear and Mastered once ever,
 * replays the normal grant), kept by season key. Season levels unlock nothing yet; their rewards wait for their art.
 */
export function applySeason(g: GameProgress, key: string, res: ServiceResult) {
  const { next, reward } = scored(g.seasons[key], res);
  return { game: { ...g, seasons: { ...g.seasons, [key]: next }, credits: g.credits + reward.credits }, reward: { ...reward, unlocks: [] as string[] } };
}
/**
 * A guest's finished Recipe Kitchen tier: the same stamps and personal bests, kept by recipe id on the device. It pays no credits
 * (kitchen credits are the account's, server/game/router.mjs) and unlocks nothing.
 */
export function applyKitchen(g: GameProgress, recipeId: string, tier: KitchenTier, res: ServiceResult) {
  const { next, reward } = scored(g.kitchen[recipeId]?.[tier], res);
  const { [recipeId]: before, ...rest } = g.kitchen, kitchen = recentKitchen({ ...rest, [recipeId]: { ...before, [tier]: next } });
  return { game: { ...g, kitchen }, reward: { ...reward, credits: 0, mastered: false, unlocks: [] as string[] } };
}
/** One service against the best before it: the new best, and the reward line (credits, first clear, Mastered, bests beaten, bonus). */
function scored(prev: LevelBest | undefined, res: ServiceResult) {
  const left = res.left || 0;   // a result queued by an older build has no `left`
  const first = res.cleared && !(prev && prev.clears > 0);
  const masteredNow = res.stamps.served && res.stamps.rules && res.stamps.steady;
  const firstMastered = masteredNow && !prev?.mastered;
  const credits = res.cleared ? (first ? CREDIT_REWARDS.firstClear : CREDIT_REWARDS.replay) + (firstMastered ? CREDIT_REWARDS.mastered : 0) : 0;
  const next: LevelBest = {
    stars: Math.max(prev?.stars ?? 0, res.stars), score: Math.max(prev?.score ?? 0, res.score),
    served: !!prev?.served || res.stamps.served, rules: !!prev?.rules || res.stamps.rules, steady: !!prev?.steady || res.stamps.steady,
    mastered: !!prev?.mastered || masteredNow, clears: (prev?.clears ?? 0) + (res.cleared ? 1 : 0),
    bonus: !!prev?.bonus || (res.cleared && !!res.bonus?.done), coins: Math.max(prev?.coins ?? 0, res.cleared ? res.coins : 0), left: Math.max(prev?.left ?? 0, res.cleared ? left : 0),
  };
  const beat: Beat[] = [];
  if (prev && prev.clears > 0 && res.cleared) {
    if (res.score > prev.score) beat.push("score");
    if (prev.coins > 0 && res.coins > prev.coins) beat.push("coins");
    if (prev.left > 0 && left > prev.left) beat.push("time");
  }
  return { next, reward: { credits, first, mastered: firstMastered, beat, bonus: res.cleared && !!res.bonus?.done && !prev?.bonus } };
}
