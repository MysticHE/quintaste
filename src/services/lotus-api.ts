import type { Tier } from "../game/content/cosmetics";
import { avatarRequest } from "../utils/avatar-api";
import { communityRequest } from "./community-api";

/** One breed attempt as the server reports it (server/lotus/state.mjs jobView). */
export type BreedJob = {
  requestId: string; breedId: string; kind: "breed" | "regenerate"; status: "working" | "complete" | "failed";
  completed: number; total: number; message: string | null;
};
/** The latest breed: its lotus, state, free tries left and where its Adult and Mini forms sit in the avatar library. */
export type LotusBreed = {
  id: string; tier: Tier; status: "breeding" | "bred" | "returned"; regenerationsLeft: number;
  adultId: string | null; miniId: string | null; job: BreedJob | null;
};
/** The account's lotus as the server records it (server/lotus/state.mjs). Prices and balances are always the server's. */
export type LotusState = {
  tier: Tier | null; blooms: number; freeBloom: boolean;
  bloom: { id: string; number: number; kind: "free" | "rebloom"; tier: Tier; pity: "blue" | "golden" | null; bloomedAt: string } | null;
  odds: { tier: Tier; percent: number }[]; oddsVersion: string;
  pity: { blueWithin: number; goldenBy: number; sinceBlue: number; sinceGolden: number };
  /** Earned café credits; null while the game service is unavailable. Missing on servers without the credit path. */
  credits?: number | null;
  prices?: { rebloom: number; breed: number };
  breeds?: { available: number; held: number; used: number };
  breed?: LotusBreed | null;
  /** Whether avatar generation is switched on, so a breed can start now. */
  generation?: boolean;
};
/** Shown until the server answers; the server's own table replaces it on every lotus screen. */
export const PUBLISHED_ODDS: LotusState["odds"] = [
  { tier: "pink", percent: 55 }, { tier: "purple", percent: 28 }, { tier: "blue", percent: 13 }, { tier: "golden", percent: 4 },
];
export const lotusConsentVersion = "cloudflare-openai-lotus-v1";
/** Request ids double as ledger sources on the server, so they stay within 64 characters. */
export const newRequestId = (tag: string) => (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12) + "-" + tag).slice(0, 64);

export const getLotus = (signal: AbortSignal) => communityRequest<LotusState>("/api/lotus", { signal });
/** The free first bloom. The server decides and records the tier before answering; repeating a requestId returns that record. */
export const bloomLotus = (requestId: string) => communityRequest<LotusState>("/api/lotus/bloom", { method: "POST", body: { requestId } });
/** A re-bloom for earned café credits; the answer's `bloom` is the one this request rolled. Never spends twice per requestId. */
export const rebloomLotus = (requestId: string) => communityRequest<LotusState>("/api/lotus/rebloom", { method: "POST", body: { requestId } });
/** Turns 600 earned café credits into one breed. Never spends twice per requestId. */
export const buyBreed = (requestId: string) => communityRequest<LotusState>("/api/lotus/breeds/credits", { method: "POST", body: { requestId } });

/** Uploads the selfie for a breed, or for a free regeneration of `breedId`. The same requestId returns the same attempt. */
export const startBreed = (requestId: string, photo: string, breedId?: string, signal?: AbortSignal) => avatarRequest<BreedJob>("profile", "lotus/breeds", {
  method: "POST", signal, body: JSON.stringify({ requestId, consent: lotusConsentVersion, photo, ...(breedId ? { breedId } : {}) }),
});
export const breedProgress = (requestId: string, signal?: AbortSignal) =>
  avatarRequest<BreedJob>("profile", "lotus/breeds?requestId=" + encodeURIComponent(requestId), { signal });
