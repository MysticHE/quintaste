import { communityRequest as call } from "./community-api";

/** A member's "I cooked this" photo on a recipe (server/cooked-photos/router.mjs); `photo` is its server path. */
export type CookedPhoto = { id: string; name: string; note: string; updatedAt: string; photo: string };
export type CookedPhotosPage = { recipeId: string; count: number; mine: (CookedPhoto & { hidden: boolean }) | null; items: CookedPhoto[] };
export const cookedReasons = ["Spam", "Not this recipe", "Offensive content", "Not their photo", "Other"] as const;

const root = (id: string) => "/api/cooked-photos/" + encodeURIComponent(id);
export const cookedPhotos = (recipeId: string, signal?: AbortSignal) => call<CookedPhotosPage>(root(recipeId), { signal });
/** `photo` is a new photo as a data URI, or "keep" to change only the note. */
export const saveCookedPhoto = (recipeId: string, photo: string, note: string) => call(root(recipeId) + "/me", { method: "PUT", body: { photo, note } });
export const deleteCookedPhoto = (recipeId: string) => call(root(recipeId) + "/me", { method: "DELETE" });
export const reportCookedPhoto = (recipeId: string, photoId: string, reason: string, details: string) =>
  call<{ reference: string }>(root(recipeId) + "/" + photoId + "/report", { method: "POST", body: { reason, details } });
