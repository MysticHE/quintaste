import { communityRequest as call } from "./community-api";
import type { BadgeTier, Rarity } from "../config/collection";

/** Collection on the account (server/collection): credits from tasks, avatar borders and badges. Every call settles first. */
export type TaskProgress = { key: string; done: number; of: number };
export type Collection = {
  /** `owed`: credits to be taken back for hidden posts, which can't be spent meanwhile. `master`: everything unlocked. */
  credits: number; owed: number; lifetime: number; hasProfile: boolean; master: boolean;
  tasks: {
    start: { key: string; credits: number; done: boolean }[];
    everyday: { key: string; credits: number; limit: number; per: "day" | "week"; used: number; waiting: number }[];
    milestones: { key: string; count: number; steps: { at: number; credits: number; done: boolean }[] }[];
  };
  borders: { id: string; rarity: Rarity; credits: number; owned: boolean; equipped: boolean }[];
  badges: { id: string; tier: BadgeTier; earned: boolean; revoked: boolean; earnedAt: string | null; tasks: TaskProgress[] }[];
  shown: string[];
  /** What this request paid and awarded, for a short notice. */
  just: { credits: number; badges: string[] };
};
export const collectionKey = "/api/collection";
export const loadCollection = (signal: AbortSignal) => call<Collection>(collectionKey, { signal });
export const buyBorder = (id: string) => call<Collection>("/api/collection/borders/" + encodeURIComponent(id), { method: "POST" });
/** Wears an owned border, or none with null. */
export const wearBorder = (id: string | null) => call<Collection>("/api/collection/border", { method: "PUT", body: { id } });
export const showBadges = (ids: string[]) => call<Collection>("/api/collection/badges", { method: "PUT", body: { ids } });
