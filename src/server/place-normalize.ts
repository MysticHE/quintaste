import { discoveryPrices } from "../config/discovery-options";
import type { LivePlace, LivePhoto, LiveReview } from "../types/discovery";
import { inSingapore } from "../utils/discovery-search";
import { object, placeIdValid, safeHttps } from "./google-provider";
import { photoUrl } from "./google-photo";

function strings(value: unknown, max = 7) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, max).map(item => item.slice(0, 300)) : []; }
function date(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined; }
function photos(value: unknown, now: number): LivePhoto[] {
  return Array.isArray(value) ? value.slice(0, 3).flatMap(item => {
    if (!object(item) || typeof item.name !== "string") return [];
    const url = photoUrl(item.name, now); if (!url) return [];
    const authors = Array.isArray(item.authorAttributions) ? item.authorAttributions.slice(0, 10).flatMap(author =>
      object(author) && typeof author.displayName === "string" ? [{ name: author.displayName.slice(0, 200), uri: safeHttps(author.uri), photoUri: safeHttps(author.photoUri) }] : []) : [];
    return [{ url, authors, sourceUri: safeHttps(item.googleMapsUri) }];
  }) : [];
}
function reviews(value: unknown): LiveReview[] {
  return Array.isArray(value) ? value.slice(0, 5).flatMap(item => {
    if (!object(item) || !object(item.authorAttribution) || typeof item.authorAttribution.displayName !== "string") return [];
    const text = object(item.originalText) ? item.originalText.text : object(item.text) ? item.text.text : "";
    return [{ author: item.authorAttribution.displayName.slice(0, 200), authorUri: safeHttps(item.authorAttribution.uri), authorPhotoUri: safeHttps(item.authorAttribution.photoUri),
      rating: typeof item.rating === "number" && item.rating >= 1 && item.rating <= 5 ? item.rating : undefined,
      text: typeof text === "string" ? text.slice(0, 10000) : "", publishedAt: date(item.publishTime), uri: safeHttps(item.googleMapsUri) }];
  }) : [];
}
export function normalizePlace(value: unknown, now = Date.now()): LivePlace | null {
  if (!object(value) || !placeIdValid(value.id) || !object(value.displayName) || typeof value.displayName.text !== "string"
    || !value.displayName.text.length || value.displayName.text.length > 300 || !object(value.location)
    || typeof value.location.latitude !== "number" || typeof value.location.longitude !== "number") throw new Error("Invalid place response.");
  const point = { latitude: value.location.latitude, longitude: value.location.longitude };
  const country = Array.isArray(value.addressComponents) ? value.addressComponents.find(item => object(item)
    && Array.isArray(item.types) && item.types.includes("country")) : undefined;
  if (!inSingapore(point) || !object(country) || country.shortText !== "SG" || value.businessStatus === "CLOSED_PERMANENTLY") return null;
  const current = object(value.currentOpeningHours) ? value.currentOpeningHours : {};
  const regular = object(value.regularOpeningHours) ? value.regularOpeningHours : {};
  const hours = strings(current.weekdayDescriptions); const opening = current.openNow;
  return { placeId: value.id, name: value.displayName.text, address: typeof value.formattedAddress === "string" ? value.formattedAddress.slice(0, 500) : "",
    ...point, opening: value.businessStatus === "CLOSED_TEMPORARILY" ? "closed" : opening === true ? "open" : opening === false ? "closed" : "unknown",
    fetchedAt: now, hours: hours.length ? hours : strings(regular.weekdayDescriptions), nextClose: date(current.nextCloseTime), nextOpen: date(current.nextOpenTime),
    rating: typeof value.rating === "number" && value.rating >= 1 && value.rating <= 5 ? value.rating : undefined,
    reviewCount: typeof value.userRatingCount === "number" && Number.isInteger(value.userRatingCount) && value.userRatingCount >= 0 ? value.userRatingCount : undefined,
    priceLevel: discoveryPrices.find(price => price.google === value.priceLevel)?.value,
    photos: photos(value.photos, now), reviews: value.reviews === undefined ? undefined : reviews(value.reviews),
    phone: typeof value.nationalPhoneNumber === "string" ? value.nationalPhoneNumber.slice(0, 80) : undefined, website: safeHttps(value.websiteUri),
    attributions: Array.isArray(value.attributions) ? value.attributions.slice(0, 20).flatMap(item => object(item) && typeof item.provider === "string"
      ? [{ provider: item.provider.slice(0, 200) }] : []) : [] };
}
