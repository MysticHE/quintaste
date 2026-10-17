import type { PrivatePlace, PrivatePlaceKind } from "../types/food";
import type { SearchPoint } from "../types/location-search";
import { inSingapore } from "./discovery-search";

export function readPrivatePoint(value: unknown): SearchPoint | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const point = value as Record<string, unknown>;
  if (typeof point.latitude !== "number" || typeof point.longitude !== "number"
    || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
  const result = { latitude: point.latitude, longitude: point.longitude };
  return inSingapore(result) ? result : undefined;
}
export function privatePlaceKind(place: { kind?: unknown; label: string }): PrivatePlaceKind {
  if (place.kind === "home" || place.kind === "work" || place.kind === "custom") return place.kind;
  const label = place.label.trim().toLowerCase();
  return label === "home" ? "home" : label === "work" ? "work" : "custom";
}
export function privatePlaceFor(places: PrivatePlace[], kind: "home" | "work") {
  const matching = places.filter(place => privatePlaceKind(place) === kind);
  return matching.find(place => place.isDefault) ?? matching[0];
}
export function privateOrigin(places: PrivatePlace[], kind: "home" | "work") {
  const place = privatePlaceFor(places, kind);
  return place && readPrivatePoint(place.point) ? place : undefined;
}
export function savePrivatePlace(places: PrivatePlace[], next: PrivatePlace): PrivatePlace[] {
  const kind = privatePlaceKind(next), original = places.find(place => place.id === next.id);
  if (kind !== "custom" && (!original || privatePlaceKind(original) !== kind) && places.some(place => place.id !== next.id && privatePlaceKind(place) === kind))
    throw new Error("You already have " + (kind === "home" ? "Home" : "Work") + ". Edit its address instead.");
  if (!places.some(place => place.id === next.id) && places.length >= 20)
    throw new Error("You can keep up to 20 private places.");
  const result = places.some(place => place.id === next.id)
    ? places.map(place => place.id === next.id ? next : place) : [...places, next];
  const defaultId = result.find(place => place.isDefault)?.id ?? result[0]?.id;
  return result.map(place => ({ ...place, isDefault: place.id === defaultId }));
}
/** Removing the default hands the default to the next place, so Explore always has one to follow. */
export function removePrivatePlace(places: PrivatePlace[], id: string): PrivatePlace[] {
  const rest = places.filter(place => place.id !== id);
  const defaultId = rest.find(place => place.isDefault)?.id ?? rest[0]?.id;
  return rest.map(place => ({ ...place, isDefault: place.id === defaultId }));
}
/** The place Explore uses when nothing else is chosen: the default, else Home, else Work, each only with a resolved address. */
export function defaultPrivatePlace(places: PrivatePlace[]) {
  return places.find(place => place.isDefault && readPrivatePoint(place.point)) ?? privateOrigin(places, "home") ?? privateOrigin(places, "work");
}
