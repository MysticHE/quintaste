import { communityRequest as call } from "./community-api";

export type AiJobKind = "video" | "request";
export type AiJob = {
  id: string; kind: AiJobKind; input: string; status: "queued" | "working" | "published" | "review" | "failed"; message: string;
  createdAt: string; finishedAt: string | null; recipeId: string | null;
};
export const aiRecipesStatus = (signal: AbortSignal) => call<{ enabled: boolean; dailyPerMember: number }>("/api/ai-recipes/status", { signal });
export const myAiJobs = (signal: AbortSignal) => call<{ items: AiJob[] }>("/api/ai-recipes/mine", { signal });
export const startAiJob = (kind: AiJobKind, input: string) => call<AiJob>("/api/ai-recipes", { method: "POST", body: { kind, input } });
export const aiJobActive = (job: AiJob) => job.status === "queued" || job.status === "working";
