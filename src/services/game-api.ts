import { Platform } from "react-native";
import type { GameProgress } from "../game/progress";
import type { Action, Result } from "../game/sim/engine";
import type { RunStart } from "../game/sim/replay";
import { apiUrl } from "../utils/api-url";
import { communityRequest } from "./community-api";

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
