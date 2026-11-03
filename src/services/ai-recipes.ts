import { Platform } from "react-native";
import { File, UploadType } from "expo-file-system";
import type { Language } from "../config/preferences";
import { translate } from "../i18n";
import { apiUrl } from "../utils/api-url";
import { ApiError, communityRequest as call, responseError, sessionHeaders } from "./community-api";
import { savedLanguage } from "./saved-language";

export type AiJobKind = "video" | "request" | "photo" | "ingredients";
export type AiJob = {
  id: string; kind: AiJobKind; input: string; status: "queued" | "working" | "published" | "review" | "failed"; message: string;
  createdAt: string; finishedAt: string | null; recipeId: string | null; retryable?: boolean;
  /** The written recipe's title once there is one. */
  title?: string | null;
  /** False when the recipe was hidden or withdrawn after it was written. */
  openable?: boolean;
  /** Tasks ahead of this one while it waits in line. */
  ahead?: number;
};
/** `plan` stays null until payments are connected (src/config/ai-plans.ts); `usedThisMonth` counts recipes started this month. */
/** `usedToday` covers the rolling 24 hours the daily limit uses; `fullToday` means everyone's daily total is used; `limits` come from the server. */
/** `unlimited`: the master account (no daily count); `snap`: Snap a dish and My ingredients are open to this member; `paused`: open, but their recipe writing is not answering right now. */
export type AiRecipesStatus = { enabled: boolean; dailyPerMember: number; plan: null | { id: string; renewsAt: string }; needsPlan?: boolean; usedThisMonth?: number;
  usedToday?: number; fullToday?: boolean; unlimited?: boolean; snap?: boolean; paused?: boolean; limits?: { videoMinutes: number; videoMb: number; atOnce: number } };
export const aiRecipesStatus = (signal: AbortSignal) => call<AiRecipesStatus>("/api/ai-recipes/status", { signal });
export const myAiJobs = (signal: AbortSignal) => call<{ items: AiJob[] }>("/api/ai-recipes/mine", { signal });
export const startAiJob = (kind: AiJobKind, input: string) => call<AiJob>("/api/ai-recipes", { method: "POST", body: { kind, input } });
/** Snap a dish (server/ai-recipes/snap.mjs): the notice version the member accepted, and the AI's guesses for a photo. */
export const SNAP_CONSENT = "gemini-dish-photo-v1";
export type SnapDiet = "vegan" | "vegetarian" | "both";
export type SnapGuess = { name: { en: string; zh: string }; card: string | null };
export const snapDish = (photo: string) => call<{ snap: string; guesses: SnapGuess[] }>("/api/ai-recipes/snap", { method: "POST", body: { photo, consent: SNAP_CONSENT } });
/** Create recipe for a snapped dish: one of the guesses (`choice`) or a typed name (`dish`). */
export const startPhotoJob = (body: { snap: string; choice?: number; dish?: string; diet: SnapDiet; private: boolean }) =>
  call<AiJob>("/api/ai-recipes", { method: "POST", body: { kind: "photo", ...body } });
/** My ingredients (server/ai-recipes/ingredients.mjs): the foods the AI found in one photo; `sure` is false for a doubtful one. */
export type SeenItem = { name: { en: string; zh: string }; sure: boolean };
export const seeIngredients = (photo: string) => call<{ items: SeenItem[] }>("/api/ai-recipes/ingredients/see", { method: "POST", body: { photo, consent: SNAP_CONSENT } });
/** "Matching recipes": our recipes ranked by the member's items and basics; `missing` names at most two lines they lack. */
export type CookableRecipe = { id: string; name: string; minutes: number | null; missing: string[] };
export const cookableRecipes = (body: { items: string[]; pantry: string[]; recent: string[] }, signal?: AbortSignal) =>
  call<{ items: CookableRecipe[] }>("/api/ai-recipes/ingredients/recipes", { method: "POST", body, signal });
/** "Create a new one with these": a recipe from mostly the member's items. */
export const startIngredientsJob = (body: { items: string[]; pantry: string[]; diet: SnapDiet; private: boolean }) =>
  call<AiJob>("/api/ai-recipes", { method: "POST", body: { kind: "ingredients", ...body } });
/** Clears finished requests from the member's list on every device (requests in progress stay). */
export const clearAiJobs = () => call<{ cleared: number }>("/api/ai-recipes/mine/clear", { method: "POST", body: {} });
export const aiJobActive = (job: AiJob) => job.status === "queued" || job.status === "working";
export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
const tooLarge = (language: Language) => new ApiError(translate(language, "cook", "videoTooLarge"), 413);

/** Sends a video from the phone when its site blocks our server; `source` is the optional original link for credit. */
export async function uploadAiVideo(video: { uri: string; mimeType?: string | null; fileSize?: number | null }, source: string) {
  const type = video.mimeType?.startsWith("video/") ? video.mimeType : "video/mp4", language = await savedLanguage();
  if (video.fileSize && video.fileSize > MAX_UPLOAD_BYTES) throw tooLarge(language);
  const link = source.trim(), path = "/api/ai-recipes/upload" + (/^https:\/\//.test(link) ? "?source=" + encodeURIComponent(link) : "");
  let status: number, text: string;
  try {
    if (Platform.OS === "web") {
      const blob = await (await fetch(video.uri)).blob();
      if (blob.size > MAX_UPLOAD_BYTES) throw tooLarge(language);
      const response = await fetch(apiUrl(path), { method: "POST", body: blob, credentials: "include", headers: { "Content-Type": type } });
      status = response.status; text = await response.text();
    } else {
      const file = new File(video.uri);
      if (file.size > MAX_UPLOAD_BYTES) throw tooLarge(language);
      const result = await file.upload(apiUrl(path), { httpMethod: "POST", uploadType: UploadType.BINARY_CONTENT, mimeType: type,
        headers: { "Content-Type": type, ...await sessionHeaders() } });
      status = result.status; text = result.body;
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(translate(language, "cook", "uploadDidNotFinish"), 0, "OFFLINE");
  }
  let value: { error?: unknown; code?: unknown } = {};
  try { value = JSON.parse(text); } catch { value = {}; }
  if (status < 200 || status >= 300) throw responseError(status, value, translate(language, "cook", "aiUploadFailed"));
  return value as AiJob;
}
