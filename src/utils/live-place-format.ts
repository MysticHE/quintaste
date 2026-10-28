import type { Language } from "../config/preferences";
import type { LivePlace } from "../types/discovery";
import type { SearchPoint } from "../types/location-search";
import { distanceKm } from "./discovery-search";
import { zhTime, zhWeekday } from "./food-format";
import { liveOpening } from "./live-place-cache";
import { exploreWords } from "./location-feedback";

export function placeOpeningLine(place: LivePlace, now: number, language: Language = "en") {
  const opening = liveOpening(place, now);
  return openingLine(opening, opening === "open" ? place.nextClose : opening === "closed" ? place.nextOpen : undefined, now, language);
}
/** "Open · until 9:00 pm", "Closed · opens 5:30 pm Sat", "Open now" or "Closed now" for a live Google place or a catalogue place. */
export function openingLine(opening: LivePlace["opening"], boundary: string | number | undefined, now: number, language: Language = "en") {
  const words = exploreWords(language);
  if (!boundary) return opening === "open" ? words.openNow : opening === "closed" ? words.closedNow : words.hoursUnavailable;
  const date = new Date(boundary), zh = language === "zh";
  const today = new Intl.DateTimeFormat("en", { timeZone: "Asia/Singapore", dateStyle: "short" });
  const time = zh ? zhTime(date) : new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit" }).format(date);
  const day = today.format(date) === today.format(now) ? "" : zh ? zhWeekday(date) : new Intl.DateTimeFormat("en", { timeZone: "Asia/Singapore", weekday: "short" }).format(date);
  return opening === "open" ? words.openUntil({ time, day }) : words.closedOpens({ time, day });
}
export function googleRating(place: LivePlace, language: Language = "en") {
  return typeof place.rating === "number" && (place.reviewCount ?? 0) >= 5
    ? exploreWords(language).googleRatingLine({ rating: place.rating.toFixed(1), n: place.reviewCount ?? 0 }) : "";
}

export function livePlaceMetadata(place: LivePlace, now: number, origin?: SearchPoint, language: Language = "en") {
  const distance = origin ? distanceKm(origin, place) : undefined, words = exploreWords(language);
  const distanceLabel = distance === undefined ? "" : distance < 1 ? words.distanceMetres({ m: Math.round(distance * 1000) }) : words.distanceKmAway({ km: distance.toFixed(1) });
  return { distanceLabel, rating: googleRating(place, language), hours: placeOpeningLine(place, now, language) };
}
