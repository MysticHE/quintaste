/**
 * Companions, accessories, decor and skins. Everything is cosmetic or a sidegrade skill of equal value
 * (AVATAR_LOTUS_PLAN §3b); credits are earned only (QT-056); nothing is time-limited (QT-057).
 */
export type Tier = "pink" | "purple" | "blue" | "golden";
export const TIERS: Tier[] = ["pink", "purple", "blue", "golden"];
export type Unlock = { kind: "free" } | { kind: "level"; level: number } | { kind: "tier"; tier: Tier } | { kind: "credits"; price: number };

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
};
export const DECOR_ORDER = ["plant", "painting", "bowl", "herbs", "windowplant", "teaset", "lamp", "lanterns"];

export type Skin = { id: string; name: string; art: string | null; unlock: Unlock };
export const SKINS: Record<string, Skin> = {
  sunny: { id: "sunny", name: "Sunny garden", art: "skin-sunny", unlock: { kind: "free" } },
  lantern: { id: "lantern", name: "Lantern night", art: "skin-lantern", unlock: { kind: "level", level: 18 } },
  lotus: { id: "lotus", name: "Lotus pond", art: "skin-lotus", unlock: { kind: "tier", tier: "golden" } },
};
export const SKIN_ORDER = ["sunny", "lantern", "lotus"];

export const CREDIT_REWARDS = { firstClear: 30, replay: 8, mastered: 20 };

export function unlockText(u: Unlock): string {
  if (u.kind === "free") return "Free";
  if (u.kind === "level") return "Clear Level " + u.level;
  if (u.kind === "tier") return u.tier[0].toUpperCase() + u.tier.slice(1) + " lotus";
  return u.price + " credits";
}
