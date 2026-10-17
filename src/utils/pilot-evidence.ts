import { pilotEvidenceDays, pilotReviewLabels } from "../config/pilot-catalogue";
import type { PilotCatalogue, PilotVenue, PilotVenueState, PilotDish } from "../types/pilot-catalogue";

export function sourceAge(checkedAt: string, now = Date.now()) {
  const time = Date.parse(checkedAt);
  return !Number.isFinite(time) || time > now + 30000 ? Infinity : Math.max(0, (now - time) / 86400000);
}
export function pilotSourcesForVenue(venue: PilotVenue, catalogue: PilotCatalogue) {
  const menus = catalogue.menus.filter(item => item.venueId === venue.id);
  const ids = new Set([...venue.sourceIds, ...venue.claims.map(item => item.sourceId),
    ...menus.flatMap(item => [item.sourceId, ...(item.charges.sourceId ? [item.charges.sourceId] : [])]),
    ...catalogue.dishes.filter(item => item.venueId === venue.id).flatMap(item => item.sourceIds)]);
  return catalogue.sources.filter(item => ids.has(item.id));
}
export function pilotEvidenceState(venue: PilotVenue, catalogue: PilotCatalogue, state?: PilotVenueState, now = Date.now()) {
  const review = state?.review;
  if (review?.status === "withdrawn") return { label: "Withdrawn", kind: "withdrawn" as const };
  const sources = pilotSourcesForVenue(venue, catalogue);
  if (!sources.length || sources.some(item => sourceAge(item.checkedAt, now) > pilotEvidenceDays))
    return { label: "Sources stale · recheck", kind: "stale" as const };
  if (review && review.fingerprint !== state?.fingerprint) return { label: "Source data changed · recheck", kind: "changed" as const };
  if (review) return { label: pilotReviewLabels[review.status], kind: review.status };
  return venue.sourceCheck === "needs-information"
    ? { label: "Needs information", kind: "needs-information" as const }
    : { label: "Sources checked · not confirmed", kind: "not-reviewed" as const };
}
export function pilotPrice(dish: Pick<PilotDish, "price">) {
  if (dish.price.amount === null) return "Price unavailable";
  const value = dish.price.amount.toFixed(2), prefix = dish.price.type === "from" ? "From " : "";
  return prefix + (dish.price.currency === "SGD" ? "S$" + value : value + " · currency unstated");
}
export const pilotCheckedDate = (value: string) => new Date(value).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
