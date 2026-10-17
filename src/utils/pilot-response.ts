import type { PilotCatalogueResponse, PilotReview, PilotReviewStatus } from "../types/pilot-catalogue";
import { readPilotCatalogue } from "./pilot-schema";
import { pilotObject as object, pilotId as id, pilotChoice as choice, pilotList as list, pilotText as text } from "./pilot-validation";
const statuses = ["source-reviewed", "needs-information", "withdrawn"] as const;
export function pilotFingerprint(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("Invalid catalogue fingerprint");
  return value;
}
function time(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > Date.now() + 30000) throw new Error("Invalid review date");
  return value;
}
export function readPilotReview(value: unknown): PilotReview {
  const v = object(value);
  if (!Number.isInteger(v.revision) || Number(v.revision) < 1 || Number(v.revision) > 30 || v.reviewer !== "Local reviewer")
    throw new Error("Invalid catalogue review");
  const history = list(v.history, value => { const e = object(value); return {
    status: choice(e.status, statuses) as PilotReviewStatus, reason: text(e.reason, 1000), at: time(e.at), fingerprint: pilotFingerprint(e.fingerprint) }; }, 30);
  if (history.length !== v.revision) throw new Error("Incomplete catalogue history");
  const review: PilotReview = { venueId: id(v.venueId), fingerprint: pilotFingerprint(v.fingerprint), status: choice(v.status, statuses),
    reason: text(v.reason, 1000), at: time(v.at), revision: Number(v.revision), reviewer: "Local reviewer", history };
  const last = history.at(-1);
  if (!last || ["status", "reason", "at", "fingerprint"].some(key => last[key as keyof typeof last] !== review[key as keyof PilotReview])
    || history.some((event, index) => event.reason.length < 3 || index > 0 && event.at < history[index - 1].at))
    throw new Error("Inconsistent catalogue history");
  return review;
}
export function readPilotResponse(value: unknown): PilotCatalogueResponse {
  const v = object(value), catalogue = readPilotCatalogue(v.catalogue), generatedAt = time(v.generatedAt);
  const states = list(v.states, value => {
    const s = object(value), review = s.review === null ? null : readPilotReview(s.review);
    if (!Number.isInteger(s.revision) || Number(s.revision) < 0 || Number(s.revision) > 30
      || (review?.revision ?? 0) !== s.revision || review && review.venueId !== s.venueId) throw new Error("Invalid catalogue revision");
    return { venueId: id(s.venueId), fingerprint: pilotFingerprint(s.fingerprint), revision: Number(s.revision), review };
  });
  if (states.length !== catalogue.venues.length || new Set(states.map(s => s.venueId)).size !== states.length
    || states.some(s => !catalogue.venues.some(venue => venue.id === s.venueId)) || Date.now() - generatedAt >= 300000)
    throw new Error("Invalid catalogue response");
  return { catalogue, states, generatedAt };
}
