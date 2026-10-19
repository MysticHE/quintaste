import type { Tier } from "../game/content/cosmetics";
import { communityRequest } from "./community-api";

/** The account's lotus as the server records it (server/lotus/router.mjs). */
export type LotusState = {
  tier: Tier | null; blooms: number; freeBloom: boolean;
  bloom: { id: string; number: number; kind: "free" | "rebloom"; tier: Tier; pity: "blue" | "golden" | null; bloomedAt: string } | null;
  odds: { tier: Tier; percent: number }[]; oddsVersion: string;
  pity: { blueWithin: number; goldenBy: number; sinceBlue: number; sinceGolden: number };
};
/** Shown until the server answers; the server's own table replaces it on every lotus screen. */
export const PUBLISHED_ODDS: LotusState["odds"] = [
  { tier: "pink", percent: 55 }, { tier: "purple", percent: 28 }, { tier: "blue", percent: 13 }, { tier: "golden", percent: 4 },
];

export const getLotus = (signal: AbortSignal) => communityRequest<LotusState>("/api/lotus", { signal });
/** The free first bloom. The server decides and records the tier before answering; repeating a requestId returns that record. */
export const bloomLotus = (requestId: string) => communityRequest<LotusState>("/api/lotus/bloom", { method: "POST", body: { requestId } });
