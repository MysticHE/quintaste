/**
 * What each lotus brings (AVATAR_LOTUS_PLAN §3, §3b). Every lotus gives the same Adult and Mini forms; higher lotuses add
 * a café companion and avatar extras, and each includes everything below it. Companions join Rush Hour as soon as the
 * lotus blooms; the avatar extras arrive with the member's own avatar.
 */
import { TIERS, type Tier } from "./cosmetics";

export const TIER_NAMES: Record<Tier, string> = { pink: "Pink", purple: "Purple", blue: "Blue", golden: "Golden" };
export type LotusPerk = { id: string; tier: Tier; name: string; kind: "companion" | "frame" | "aura" | "decor"; art?: string };
export const LOTUS_PERKS: LotusPerk[] = [
  { id: "mochi", tier: "purple", name: "Mochi in a chef hat", kind: "companion", art: "wear-purple-hat" },
  { id: "purple-frame", tier: "purple", name: "Purple portrait frame", kind: "frame" },
  { id: "ripple", tier: "blue", name: "Ripple and its wave scarf", kind: "companion", art: "pet-blue" },
  { id: "ripple-aura", tier: "blue", name: "Water-ripple aura", kind: "aura" },
  { id: "dewdrop", tier: "golden", name: "Golden Dewdrop in a lotus crown", kind: "companion", art: "wear-golden-crown" },
  { id: "pond", tier: "golden", name: "Golden lotus pond", kind: "decor", art: "skin-lotus" },
  { id: "sparkle-frame", tier: "golden", name: "Sparkle frame", kind: "frame" },
];
/** The perks a lotus includes: its own and every lower lotus's. */
export const perksFor = (tier: Tier) => LOTUS_PERKS.filter(p => TIERS.indexOf(p.tier) <= TIERS.indexOf(tier));
