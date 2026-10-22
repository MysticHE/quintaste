import { Platform } from "react-native";
import type { GameProgress } from "../game/progress";
import type { Action, Result } from "../game/sim/engine";
import type { RunStart } from "../game/sim/replay";
import { apiUrl } from "../utils/api-url";
import { ApiError, communityRequest } from "./community-api";

/** Rush Hour account progress (server/game). Signed-in, age-checked members only; guests never call these. */
export type ServerProgress = { game: GameProgress; imported: boolean; rules: string };
export type RunReward = { credits: number; first: boolean; mastered: boolean; unlocks: string[]; beat?: string[]; bonus?: boolean };
export type RunOutcome = { status: "open" | "settled" | "rejected"; reason: string; reward: RunReward; progress: ServerProgress };

export const fetchProgress = () => communityRequest<ServerProgress>("/api/game/progress");
export const importDeviceProgress = (game: GameProgress) => communityRequest<ServerProgress & { merged: boolean }>("/api/game/import", { method: "POST", body: { game } });
export const saveCafe = (cafe: Partial<GameProgress>) => communityRequest<ServerProgress>("/api/game/cafe", { method: "PUT", body: { cafe } });
export const buyItem = (item: string) => communityRequest<ServerProgress>("/api/game/purchases", { method: "POST", body: { item } });
export const openRun = (id: string, setup: RunStart, rules: string) =>
  communityRequest<{ id: string; status: string }>("/api/game/runs", { method: "POST", body: { ...setup, id, rules } });
/** A Recipe Kitchen level pack and its approved pictures (`/api/game-art/<sha256>.webp`). Members only for now. */
export type PackResponse = { hash: string; recipeId: string; pack: unknown; pictures: Record<string, string>; private?: boolean };
/** One recipe on the Recipe Kitchen shelf: its newest live level, techniques, approved dish picture and this member's best per tier. */
export type TierBest = { stars: number; score: number; clears: number };
export type KitchenLevel = { hash: string; recipeId: string; name: string; cuisine: string | null; mine: boolean; techniques: string[]; art: string;
  picture: string | null; best: Partial<Record<"learn" | "service" | "memory", TierBest>>;
  /** When it went live, each tier's difficulty and player count, whether quits or dislikes keep it out of the rows, and this member's reaction. */
  added?: string; ratings?: Partial<Record<"learn" | "service" | "memory", { rating: number; players: number }>>; held?: boolean; liked?: boolean | null };
/** The shelf, with the member's own rating (null before their first rated service, or when signed out). */
export type KitchenShelf = { player?: number | null; levels: KitchenLevel[] };
export const fetchKitchen = (signal?: AbortSignal) => communityRequest<KitchenShelf>("/api/game/kitchen", { signal });
/** Liked, disliked, or cleared (null): only after finishing a service of the level. */
export const reactLevel = (hash: string, liked: boolean | null) =>
  communityRequest<{ liked: boolean | null }>("/api/game/levels/" + encodeURIComponent(hash) + "/reaction", { method: "POST", body: { liked } });
/** A member's request for a private level from their own recipe (Phase 4): the level when already made, or the job in line. */
export type LevelRequest = { status: "ready" | "waiting"; hash?: string; job?: string };
export const requestLevel = (recipeId: string) => communityRequest<LevelRequest>("/api/game/levels", { method: "POST", body: { recipeId } });
/** The member's recent level requests: in line, done (with the level) or failed (with the reason). */
export type MyLevel = { id: string; recipeId: string; status: "waiting" | "done" | "failed"; message: string; hash: string | null; createdAt: string };
export const fetchMyLevels = (signal?: AbortSignal) => communityRequest<{ levels: MyLevel[] }>("/api/game/levels/mine", { signal });
/** Member cafés (GAME_CONTENT_PLAN §9): the member's own café with private weekly counts, saving it, open cafés, and one café's menu packs. */
export type MyCafe = { cafe: { name: string; open: boolean; hidden: boolean; termsAccepted: boolean } | null;
  menu: { hash: string; recipeId: string; name: string }[]; week: { visits: number; served: number }; terms: number };
export const fetchMyCafe = (signal?: AbortSignal) => communityRequest<MyCafe>("/api/game/my-cafe", { signal });
export const saveMyCafe = (body: { name: string; open: boolean; menu: string[]; terms?: number }) => communityRequest<MyCafe>("/api/game/my-cafe", { method: "PUT", body });
export type CafeListing = { host: string; name: string; dishes: string[] };
export const fetchCafes = (q: string, signal?: AbortSignal) => communityRequest<{ cafes: CafeListing[] }>("/api/game/cafes?q=" + encodeURIComponent(q), { signal });
export type CafeVisit = { host: string; name: string; packs: unknown[]; pictures: Record<string, string> };
export const fetchCafe = (host: string) => communityRequest<CafeVisit>("/api/game/cafes/" + encodeURIComponent(host));
export const fetchPack = (hash: string) => communityRequest<PackResponse>("/api/game/packs/" + encodeURIComponent(hash));
/** Signed-out players: public live levels only, played as practice on the device. */
async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { signal, credentials: "omit" });
  if (!response.ok) throw new ApiError(response.status === 404 ? "That level is unavailable." : "That did not load. Try again.", response.status);
  return await response.json() as T;
}
export const fetchPublicKitchen = (signal?: AbortSignal) => publicGet<KitchenShelf>("/api/game-public/kitchen", signal);
export const fetchPublicPack = (hash: string) => publicGet<PackResponse>("/api/game-public/packs/" + encodeURIComponent(hash));
/** Whether the Seasons shelf is open (staff switch). Anything but a clear yes keeps it closed. */
export const fetchSeasonsOn = (signal?: AbortSignal) => publicGet<{ on: boolean }>("/api/game-public/seasons", signal);
/** Whether member cafés are open (staff switch). Anything but a clear yes keeps them hidden. */
export const fetchCafesOn = (signal?: AbortSignal) => publicGet<{ on: boolean }>("/api/game-public/cafes", signal);
/** Recipe levels staff hid, so the phone can drop them from the levels it keeps for offline play. */
export const fetchRevoked = () => publicGet<{ hashes: string[] }>("/api/game-public/revoked");
export const finishRun = (id: string, actions: Action[], result: Result) =>
  communityRequest<RunOutcome>("/api/game/runs/" + id + "/finish", { method: "POST", body: { actions, result } });

/** Whether staff have the game switched on. Public: guests and members alike. Null when it could not be read. */
export async function fetchGameStatus(): Promise<boolean | null> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(apiUrl("/api/game/status"), { cache: "no-store", signal: controller.signal, credentials: Platform.OS === "web" ? "include" : "omit" });
    if (!response.ok) return null;
    const value = await response.json() as { enabled?: unknown };
    return typeof value.enabled === "boolean" ? value.enabled : null;
  } catch { return null; } finally { clearTimeout(timer); }
}
