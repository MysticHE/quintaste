import type { LivePlace } from "../types/discovery";
import type { SearchPoint } from "../types/location-search";
import { distanceKm } from "./discovery-search";
import { liveOpening } from "./live-place-cache";

export function placeOpeningLine(place: LivePlace, now: number) {
  const opening = liveOpening(place, now);
  const boundary = opening === "open" ? place.nextClose : opening === "closed" ? place.nextOpen : undefined;
  if (!boundary) return opening === "open" ? "Open now" : opening === "closed" ? "Closed now" : "Hours unavailable";
  const date = new Date(boundary);
  const today = new Intl.DateTimeFormat("en", { timeZone: "Asia/Singapore", dateStyle: "short" });
  const time = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit" }).format(date);
  const day = today.format(date) === today.format(now) ? "" : " " + new Intl.DateTimeFormat("en", { timeZone: "Asia/Singapore", weekday: "short" }).format(date);
  return opening === "open" ? "Open · until " + time + day : "Closed · opens " + time + day;
}
export function googleRating(place: LivePlace) {
  return typeof place.rating === "number" && (place.reviewCount ?? 0) >= 5 ? place.rating.toFixed(1) + " · " + place.reviewCount + " Google reviews" : "";
}

export function livePlaceMetadata(place: LivePlace, now: number, origin?: SearchPoint) {
  const distance = origin ? distanceKm(origin, place) : undefined;
  const distanceLabel = distance === undefined ? "" : "≈ " + (distance < 1 ? Math.round(distance * 1000) + " m" : distance.toFixed(1) + " km") + " away";
  return { distanceLabel, rating: googleRating(place), hours: placeOpeningLine(place, now) };
}
