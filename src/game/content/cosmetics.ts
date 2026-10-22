/**
 * Companions, accessories, decor and skins. Everything is cosmetic or a sidegrade skill of equal value
 * (AVATAR_LOTUS_PLAN §3b); credits are earned only (QT-056); nothing is time-limited (QT-057).
 */
import { SEASONS } from "./seasons";

export type Tier = "pink" | "purple" | "blue" | "golden";
export const TIERS: Tier[] = ["pink", "purple", "blue", "golden"];
/** `season`: earned by clearing that season level (content/seasons.ts), in any year. */
export type Unlock = { kind: "free" } | { kind: "level"; level: number } | { kind: "season"; season: string; n: number } | { kind: "tier"; tier: Tier } | { kind: "credits"; price: number };

export type SkillId = "breath" | "steady" | "cheer" | "bubbles" | "minute";
export type Pet = { id: string; name: string; art: string; skill: SkillId; unlock: Unlock; builtIn?: string; scale: number };
export const SKILLS: Record<SkillId, { name: string; effect: string; best: string }> = {
  breath: { name: "Deep breath", effect: "Freezes every guest's patience for 6 seconds.", best: "Best when several guests are waiting at once." },
  steady: { name: "Steady paws", effect: "Holds the selected station's heat exactly where it is for 8 seconds.", best: "Best for leaves, coconut milk and palm sugar that burn or split." },
  cheer: { name: "Cheer up", effect: "Gives 20 seconds of patience back to the guest who has the least.", best: "Best for saving one guest who is about to leave." },
  bubbles: { name: "Bubble show", effect: "Patience drains at half speed for 12 seconds.", best: "Best for long dishes like rice and soup." },
  minute: { name: "Golden minute", effect: "Adds 12 seconds to the round timer.", best: "Best near the end of a busy service." },
};
export const PETS: Record<string, Pet> = {
  sprout: { id: "sprout", name: "Sprout", art: "pet-sprout", skill: "breath", unlock: { kind: "free" }, scale: 1 },
  pip: { id: "pip", name: "Pip", art: "pet-pip", skill: "steady", unlock: { kind: "level", level: 6 }, scale: 1.05 },
  purple: { id: "purple", name: "Mochi", art: "pet-purple", skill: "cheer", unlock: { kind: "tier", tier: "purple" }, scale: 1.05 },
  blue: { id: "blue", name: "Ripple", art: "pet-blue", skill: "bubbles", unlock: { kind: "tier", tier: "blue" }, builtIn: "scarf", scale: 1.1 },
  golden: { id: "golden", name: "Golden Dewdrop", art: "pet-golden", skill: "minute", unlock: { kind: "tier", tier: "golden" }, scale: 0.92 },
};
export const PET_ORDER = ["sprout", "pip", "purple", "blue", "golden"];

export type Accessory = { id: string; name: string; art: string; unlock: Unlock };
export const ACCESSORIES: Record<string, Accessory> = {
  clip: { id: "clip", name: "Lotus clip", art: "acc-pink", unlock: { kind: "level", level: 5 } },
  coral: { id: "coral", name: "Coral scarf", art: "acc-coral", unlock: { kind: "level", level: 8 } },
  lilac: { id: "lilac", name: "Lilac scarf", art: "acc-lilac", unlock: { kind: "level", level: 11 } },
  mushroom: { id: "mushroom", name: "Mushroom cap", art: "acc-mushroom", unlock: { kind: "level", level: 13 } },
  lantern: { id: "lantern", name: "Lantern charm", art: "acc-lantern", unlock: { kind: "level", level: 18 } },
  hat: { id: "hat", name: "Chef hat", art: "acc-purple", unlock: { kind: "tier", tier: "purple" } },
  scarf: { id: "scarf", name: "Wave scarf", art: "acc-blue", unlock: { kind: "tier", tier: "blue" } },
  crown: { id: "crown", name: "Lotus crown", art: "acc-golden", unlock: { kind: "tier", tier: "golden" } },
};
export const ACCESSORY_ORDER = ["clip", "coral", "lilac", "mushroom", "lantern", "hat", "scarf", "crown"];
/** Art key for a companion wearing an accessory: every accessory is drawn fitted to each companion. */
export const wearArt = (pet: string, acc: string | null) => (acc ? "wear-" + pet + "-" + acc : PETS[pet].art);

export const DECOR_SLOTS = ["ceiling", "wall", "floorL", "floorR"] as const;
export type SlotId = (typeof DECOR_SLOTS)[number];
export type DecorFit = "hanging" | "wall" | "floor";
export type Decor = { id: string; name: string; art: string; fits: DecorFit; unlock: Unlock };
export const DECOR: Record<string, Decor> = {
  plant: { id: "plant", name: "Monstera", art: "decor-plant", fits: "floor", unlock: { kind: "free" } },
  painting: { id: "painting", name: "Lotus painting", art: "decor-painting", fits: "wall", unlock: { kind: "free" } },
  bowl: { id: "bowl", name: "Lotus bowl", art: "decor-lotusbowl", fits: "floor", unlock: { kind: "level", level: 4 } },
  herbs: { id: "herbs", name: "Herb planter", art: "decor-herbs", fits: "floor", unlock: { kind: "credits", price: 40 } },
  windowplant: { id: "windowplant", name: "Window plant", art: "decor-windowplant", fits: "floor", unlock: { kind: "credits", price: 40 } },
  teaset: { id: "teaset", name: "Tea set", art: "decor-teaset", fits: "floor", unlock: { kind: "credits", price: 80 } },
  lamp: { id: "lamp", name: "Peach lamp", art: "decor-lamp", fits: "hanging", unlock: { kind: "credits", price: 80 } },
  lanterns: { id: "lanterns", name: "Paper lanterns", art: "decor-lanterns", fits: "hanging", unlock: { kind: "level", level: 18 } },
  // Chapter finale and season rewards (22 Oct 2026): earned by clears, never bought.
  trays: { id: "trays", name: "Banquet trays", art: "decor-trays", fits: "floor", unlock: { kind: "level", level: 91 } },
  medal: { id: "medal", name: "Head chef medal", art: "decor-medal", fits: "wall", unlock: { kind: "level", level: 100 } },
  lotuslamp: { id: "lotuslamp", name: "Lotus lamp", art: "decor-lotuslamp", fits: "hanging", unlock: { kind: "season", season: "zhai-days", n: 2 } },
  jadevase: { id: "jadevase", name: "Jade lotus vase", art: "decor-jadevase", fits: "floor", unlock: { kind: "season", season: "zhai-days", n: 4 } },
  plumblossom: { id: "plumblossom", name: "Plum blossom", art: "decor-plumblossom", fits: "hanging", unlock: { kind: "season", season: "reunion-kitchen", n: 2 } },
  mandarins: { id: "mandarins", name: "Mandarin tree", art: "decor-mandarins", fits: "floor", unlock: { kind: "season", season: "reunion-kitchen", n: 4 } },
  ketupat: { id: "ketupat", name: "Ketupat", art: "decor-ketupat", fits: "hanging", unlock: { kind: "season", season: "sunset-bazaar", n: 2 } },
  pelita: { id: "pelita", name: "Pelita lamps", art: "decor-pelita", fits: "floor", unlock: { kind: "season", season: "sunset-bazaar", n: 4 } },
  yellowlamp: { id: "yellowlamp", name: "Yellow lantern", art: "decor-yellowlamp", fits: "hanging", unlock: { kind: "season", season: "nine-days", n: 2 } },
  whiteflowers: { id: "whiteflowers", name: "White chrysanthemums", art: "decor-whiteflowers", fits: "floor", unlock: { kind: "season", season: "nine-days", n: 4 } },
  marigold: { id: "marigold", name: "Marigold garland", art: "decor-marigold", fits: "wall", unlock: { kind: "season", season: "festival-lights", n: 2 } },
  diya: { id: "diya", name: "Oil lamp stand", art: "decor-diya", fits: "floor", unlock: { kind: "season", season: "festival-lights", n: 4 } },
  pinegarland: { id: "pinegarland", name: "Pine garland", art: "decor-pinegarland", fits: "wall", unlock: { kind: "season", season: "year-end-table", n: 2 } },
  gifts: { id: "gifts", name: "Gift stack", art: "decor-gifts", fits: "floor", unlock: { kind: "season", season: "year-end-table", n: 4 } },
  rabbitlantern: { id: "rabbitlantern", name: "Rabbit lantern", art: "decor-rabbitlantern", fits: "hanging", unlock: { kind: "season", season: "lantern-bakery", n: 2 } },
  mooncaketins: { id: "mooncaketins", name: "Mooncake tins", art: "decor-mooncaketins", fits: "floor", unlock: { kind: "season", season: "lantern-bakery", n: 4 } },
  zongzibunch: { id: "zongzibunch", name: "Dumpling bunch", art: "decor-zongzibunch", fits: "hanging", unlock: { kind: "season", season: "dumpling-day", n: 2 } },
  dragonboat: { id: "dragonboat", name: "Dragon boat painting", art: "decor-dragonboat", fits: "wall", unlock: { kind: "season", season: "dumpling-day", n: 4 } },
};
export const DECOR_ORDER = ["plant", "painting", "bowl", "herbs", "windowplant", "teaset", "lamp", "lanterns", "trays", "medal", "lotuslamp", "jadevase", "plumblossom", "mandarins", "ketupat", "pelita", "yellowlamp", "whiteflowers", "marigold", "diya", "pinegarland", "gifts", "rabbitlantern", "mooncaketins", "zongzibunch", "dragonboat"];

export type Skin = { id: string; name: string; art: string | null; unlock: Unlock };
export const SKINS: Record<string, Skin> = {
  sunny: { id: "sunny", name: "Sunny garden", art: "skin-sunny", unlock: { kind: "free" } },
  lantern: { id: "lantern", name: "Lantern night", art: "skin-lantern", unlock: { kind: "level", level: 18 } },
  lotus: { id: "lotus", name: "Lotus pond", art: "skin-lotus", unlock: { kind: "tier", tier: "golden" } },
  signature: { id: "signature", name: "Signature café", art: "skin-signature", unlock: { kind: "level", level: 20 } },
  // Chapter finales (Levels 30 to 100) and seasons; painted from the sunny room, so they share its tap areas.
  spice: { id: "spice", name: "Spice market", art: "skin-spice", unlock: { kind: "level", level: 30 } },
  steamer: { id: "steamer", name: "Bamboo steamer", art: "skin-steamer", unlock: { kind: "level", level: 40 } },
  bakery: { id: "bakery", name: "Bakery", art: "skin-bakery", unlock: { kind: "level", level: 50 } },
  kopitiam: { id: "kopitiam", name: "Kopitiam", art: "skin-kopitiam", unlock: { kind: "level", level: 60 } },
  nightstall: { id: "nightstall", name: "Night stall", art: "skin-nightstall", unlock: { kind: "level", level: 70 } },
  dumpling: { id: "dumpling", name: "Dumpling house", art: "skin-dumpling", unlock: { kind: "level", level: 80 } },
  garden: { id: "garden", name: "Garden terrace", art: "skin-garden", unlock: { kind: "level", level: 90 } },
  headchef: { id: "headchef", name: "Head chef", art: "skin-headchef", unlock: { kind: "level", level: 100 } },
  zhai: { id: "zhai", name: "Zhai days", art: "skin-zhai", unlock: { kind: "season", season: "zhai-days", n: 6 } },
  reunion: { id: "reunion", name: "Reunion kitchen", art: "skin-reunion", unlock: { kind: "season", season: "reunion-kitchen", n: 6 } },
  bazaar: { id: "bazaar", name: "Sunset bazaar", art: "skin-bazaar", unlock: { kind: "season", season: "sunset-bazaar", n: 6 } },
  ninedays: { id: "ninedays", name: "Nine days", art: "skin-ninedays", unlock: { kind: "season", season: "nine-days", n: 6 } },
  lights: { id: "lights", name: "Festival of lights", art: "skin-lights", unlock: { kind: "season", season: "festival-lights", n: 6 } },
  yearend: { id: "yearend", name: "Year-end table", art: "skin-yearend", unlock: { kind: "season", season: "year-end-table", n: 6 } },
  lanternbakery: { id: "lanternbakery", name: "Lantern bakery", art: "skin-lanternbakery", unlock: { kind: "season", season: "lantern-bakery", n: 6 } },
  dumplingday: { id: "dumplingday", name: "Dumpling day", art: "skin-dumplingday", unlock: { kind: "season", season: "dumpling-day", n: 6 } },
};
export const SKIN_ORDER = ["sunny", "lantern", "lotus", "signature", "spice", "steamer", "bakery", "kopitiam", "nightstall", "dumpling", "garden", "headchef", "zhai", "reunion", "bazaar", "ninedays", "lights", "yearend", "lanternbakery", "dumplingday"];

export const CREDIT_REWARDS = { firstClear: 30, replay: 8, mastered: 20 };
/**
 * Daily limits the server applies (owner, 22 Oct 2026; GAME_CONTENT_PLAN §14). Replays (the main path and Today's special) pay on
 * the first five clears of a Singapore day; later ones still count for stars and bests. A Recipe Kitchen recipe pays once, on its
 * first clear, for the first three such recipes a day, and never for a member's own recipe. Kept apart from CREDIT_REWARDS so a
 * change here never asks older apps to update.
 */
export const DAILY_CREDITS = { replays: 5, kitchen: 3, kitchenClear: 8 };

export function unlockText(u: Unlock): string {
  if (u.kind === "free") return "Free";
  if (u.kind === "level") return "Clear Level " + u.level;
  if (u.kind === "season") return "Clear " + (SEASONS.find(s => s.id === u.season)?.name ?? "the season") + " " + u.n;
  if (u.kind === "tier") return u.tier[0].toUpperCase() + u.tier.slice(1) + " lotus";
  return u.price + " credits";
}
