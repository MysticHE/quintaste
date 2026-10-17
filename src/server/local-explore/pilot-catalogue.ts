import type { PilotCatalogueResponse, PilotReview, PilotReviewStatus } from "../../types/pilot-catalogue";
import { pilotCatalogue, currentPilotFingerprint } from "../pilot-catalogue";
import { pilotObject as object, pilotId, pilotChoice, pilotText } from "../../utils/pilot-validation";
import { pilotFingerprint, readPilotReview } from "../../utils/pilot-response";
import { withLocalStore, readLocalStoreSnapshot, LocalServiceError, type LocalStore } from "./store";

function storedReview(store: LocalStore, venueId: string): PilotReview | null {
  if (store.pilotReviews === undefined) return null;
  try {
    const reviews = object(store.pilotReviews);
    if (!Object.hasOwn(reviews, venueId)) return null;
    const review = readPilotReview(reviews[venueId]);
    if (review.venueId !== venueId) throw new Error("Invalid review entry");
    return review;
  } catch { throw new LocalServiceError(503, "Catalogue review records could not be read."); }
}
function snapshot(store: LocalStore): PilotCatalogueResponse {
  const catalogue = pilotCatalogue();
  return { catalogue, generatedAt: Date.now(), states: catalogue.venues.map(venue => {
    const review = storedReview(store, venue.id);
    return { venueId: venue.id, fingerprint: currentPilotFingerprint(venue), revision: review?.revision ?? 0, review };
  }) };
}
export const readLocalPilotCatalogue = () => withLocalStore(snapshot, false);
export const readLocalMenuWithdrawals = () => readLocalStoreSnapshot(store => {
  const withdrawn = new Set<string>();
  for (const id of Object.keys(object(store.pilotReviews === undefined ? {} : store.pilotReviews)))
    if (storedReview(store, id)?.status === "withdrawn") withdrawn.add(id);
  return withdrawn;
});
function reviewInput(value: unknown) {
  try {
    const v = object(value), reason = pilotText(v.reason, 1000);
    if (reason.length < 3 || !Number.isInteger(v.revision) || Number(v.revision) < 0 || Number(v.revision) > 30)
      throw new Error("invalid review");
    return { venueId: pilotId(v.venueId), fingerprint: pilotFingerprint(v.fingerprint), revision: Number(v.revision), reason,
      status: pilotChoice(v.status, ["source-reviewed", "needs-information", "withdrawn"]) as PilotReviewStatus };
  } catch { throw new LocalServiceError(400, "Choose a review status and give a reason."); }
}
export async function reviewLocalPilotCatalogue(value: unknown) {
  const input = reviewInput(value), catalogue = pilotCatalogue(), venue = catalogue.venues.find(item => item.id === input.venueId);
  if (!venue) throw new LocalServiceError(404, "Catalogue entry unavailable.");
  const fingerprint = currentPilotFingerprint(venue);
  if (input.fingerprint !== fingerprint) throw new LocalServiceError(409, "Source data changed. Refresh before reviewing.");
  return withLocalStore(store => {
    const previous = storedReview(store, venue.id);
    if ((previous?.revision ?? 0) !== input.revision) throw new LocalServiceError(409, "This entry changed. Refresh before reviewing.");
    if ((previous?.revision ?? 0) >= 30) throw new LocalServiceError(409, "This entry has reached its review limit.");
    const at = Date.now(), event = { fingerprint, status: input.status, reason: input.reason, at };
    const review: PilotReview = { venueId: venue.id, fingerprint, status: input.status, reason: input.reason,
      at, revision: (previous?.revision ?? 0) + 1, reviewer: "Local reviewer", history: [...(previous?.history ?? []), event] };
    store.pilotReviews ??= {}; store.pilotReviews[venue.id] = review; return snapshot(store);
  });
}
