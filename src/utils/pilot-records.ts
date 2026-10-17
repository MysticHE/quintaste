import type { PilotSource, PilotVenue, PilotMenu, PilotDish, PilotCandidate } from "../types/pilot-catalogue";
import { areaById } from "../data/areas";
import { pilotObject as object, pilotText as text, pilotChoice as choice, pilotId as id, pilotIds as ids,
  pilotDate as date, pilotCalendarDate, pilotList as list, pilotUrl, pilotAmount } from "./pilot-validation";
const cluster = (value: unknown) => choice(value, ["outram-chinatown", "rochor-bugis", "woodlands"]);
export function readPilotSource(value: unknown): PilotSource {
  const v = object(value);
  return { id: id(v.id), url: pilotUrl(v.url), title: text(v.title), publisher: text(v.publisher),
    kind: choice(v.kind, ["merchant", "merchant-menu", "merchant-ordering", "merchant-social", "directory", "delivery-platform", "unverified"]),
    checkedAt: date(v.checkedAt), publishedAt: pilotCalendarDate(v.publishedAt), notes: text(v.notes, 1600, true) };
}
export function readPilotVenue(value: unknown): PilotVenue {
  const v = object(value), areaId = text(v.areaId, 100), postalCode = text(v.postalCode, 6);
  if (!areaById(areaId) || areaId === "singapore" || !/^\d{6}$/.test(postalCode)) throw new Error("Invalid venue area");
  const googlePlaceId = v.googlePlaceId === null ? null : text(v.googlePlaceId, 200);
  if (googlePlaceId !== null && !/^[A-Za-z0-9_-]{10,200}$/.test(googlePlaceId)) throw new Error("Invalid place ID");
  return { id: id(v.id), name: text(v.name), branch: text(v.branch), clusterId: cluster(v.clusterId), areaId,
    address: text(v.address), postalCode, googlePlaceId, sourceIds: ids(v.sourceIds),
    claims: list(v.claims, value => { const c = object(value);
      if (c.wholeVenue !== undefined && typeof c.wholeVenue !== "boolean") throw new Error("Invalid whole-venue claim");
      return {
      kind: choice(c.kind, ["vegetarian", "vegan", "no-onion-garlic", "no-alcohol"]), scope: choice(c.scope, ["brand", "branch"]),
      sourceId: id(c.sourceId), note: text(c.note, 500, true),
      ...(c.wholeVenue === undefined ? {} : { wholeVenue: c.wholeVenue }) }; }, 10),
    gaps: list(v.gaps, item => text(item, 600), 20), sourceCheck: choice(v.sourceCheck, ["source-checked", "needs-information"]) };
}
export function readPilotMenu(value: unknown): PilotMenu {
  const v = object(value), charges = object(v.charges);
  if (typeof charges.servicePercent === "number" && charges.servicePercent > 100 || typeof charges.gstPercent === "number" && charges.gstPercent > 100)
    throw new Error("Invalid charge rate");
  return { id: id(v.id), venueId: id(v.venueId), sourceId: id(v.sourceId),
    scope: choice(v.scope, ["branch-dine-in", "branch-ordering", "branch-delivery", "brand-menu"]),
    effectiveDate: pilotCalendarDate(v.effectiveDate), notes: text(v.notes, 1200, true),
    ...(v.coverage === undefined ? {} : { coverage: choice(v.coverage, ["source-covered", "partial", "brand-only", "historical"]) }),
    ...(v.notice === undefined ? {} : { notice: text(v.notice, 200, true) }),
    charges: { gst: choice(charges.gst, ["included", "excluded", "unknown"]),
      servicePercent: pilotAmount(charges.servicePercent), gstPercent: pilotAmount(charges.gstPercent),
      sourceId: charges.sourceId === null ? null : id(charges.sourceId) } };
}
export function readPilotDish(value: unknown): PilotDish {
  const v = object(value), price = object(v.price);
  if (v.suitability !== "unconfirmed" || v.ingredientsComplete !== false) throw new Error("Unconfirmed pilot dish required");
  return { id: id(v.id), venueId: id(v.venueId), menuId: id(v.menuId), name: text(v.name),
    ...(v.category === undefined ? {} : { category: text(v.category, 100, true) }),
    ...(v.qualifier === undefined ? {} : { qualifier: text(v.qualifier, 200, true) }),
    price: { amount: pilotAmount(price.amount), currency: choice(price.currency, ["SGD", "unknown"]), type: choice(price.type, ["displayed", "from"]) },
    sourceIds: ids(v.sourceIds), suitability: "unconfirmed", ingredientsComplete: false, note: text(v.note, 700, true) };
}
export function readPilotCandidate(value: unknown): PilotCandidate {
  const v = object(value); return { id: id(v.id), name: text(v.name), clusterId: cluster(v.clusterId), sourceIds: ids(v.sourceIds), reason: text(v.reason, 1500) };
}
