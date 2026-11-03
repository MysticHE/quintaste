import { ApiError, communityRequest as call } from "./community-api";
import { ownedApiRequest } from "./owned-api";
import { readMentions, readSwapOption } from "../utils/swaps";
import type { SwapAiStatus, SwapLine, SwapOption, SwapPlan } from "../types/swaps";

const options = (value: unknown) => (Array.isArray(value) ? value : []).map(readSwapOption).filter((option): option is SwapOption => !!option);
/** Swaps for a published recipe (server/swaps/router.mjs), readable signed out; lines or options the app cannot show are dropped. */
export async function recipeSwaps(recipeId: string, signal?: AbortSignal): Promise<SwapPlan> {
  const response = await ownedApiRequest(`/api/swaps/recipe/${encodeURIComponent(recipeId)}`, { signal });
  if (!response.ok) throw new ApiError("Swaps did not load.", response.status, "LOAD_FAILED");
  const plan = await response.json() as { revision?: unknown; offered?: unknown; ai?: unknown; lines?: unknown };
  const lines = (Array.isArray(plan.lines) ? plan.lines : []).flatMap((value): SwapLine[] => {
    const line = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const shown = options(line.options), more = options(line.more);
    if (typeof line.id !== "string" || typeof line.key !== "string" || !shown.length) return [];
    return [{ id: line.id, key: line.key, mentions: readMentions(line.mentions), options: shown, more }];
  });
  return { id: recipeId, revision: Number.isInteger(plan.revision) ? Number(plan.revision) : 0, offered: plan.offered === true, ai: plan.ai === true, lines };
}
/** Find More With AI for one line: `ask` starts the ask (or returns the answer kept for it); otherwise only where it stands. */
export async function swapAi(recipeId: string, lineId: string, ask: boolean, signal?: AbortSignal): Promise<SwapAiStatus> {
  const value = await call<{ status?: unknown; options?: unknown }>(`/api/swaps/recipe/${encodeURIComponent(recipeId)}/lines/${encodeURIComponent(lineId)}/ai`,
    { method: ask ? "POST" : "GET", ...(ask ? { body: {} } : {}), signal });
  const status = value.status === "pending" || value.status === "done" || value.status === "failed" ? value.status : "none";
  return { status, options: options(value.options).map(option => ({ ...option, ai: true as const })) };
}
/** "Did the swap work?" answered No, for one swap: staff get a case to check the rule. */
export const swapDidNotWork = (recipeId: string, lineId: string, to: string | null) =>
  call<void>("/api/swaps/feedback", { method: "POST", body: { recipeId, lineId, to } });
