import type { PilotCatalogue } from "../types/pilot-catalogue";
import { pilotObject as object, pilotDate as date, pilotList as list, pilotUnique as unique } from "./pilot-validation";
import { readPilotSource, readPilotVenue, readPilotMenu, readPilotDish, readPilotCandidate } from "./pilot-records";

function references(c: PilotCatalogue) {
  const sources = new Map(c.sources.map(item => [item.id, item])), venues = new Map(c.venues.map(item => [item.id, item]));
  const menus = new Map(c.menus.map(item => [item.id, item]));
  const requireSource = (id: string) => { const source = sources.get(id); if (!source) throw new Error("Missing catalogue source"); return source; };
  for (const venue of c.venues) {
    venue.sourceIds.forEach(requireSource);
    for (const claim of venue.claims) if (!["merchant", "merchant-menu", "merchant-ordering", "merchant-social"].includes(requireSource(claim.sourceId).kind))
      throw new Error("Diet claim requires merchant evidence");
  }
  for (const menu of c.menus) {
    if (!venues.has(menu.venueId) || !["merchant-menu", "merchant-ordering", "delivery-platform"].includes(requireSource(menu.sourceId).kind))
      throw new Error("Menu evidence mismatch");
    if (menu.charges.sourceId) requireSource(menu.charges.sourceId);
    if ((menu.charges.gst !== "unknown" || menu.charges.servicePercent !== null || menu.charges.gstPercent !== null) && !menu.charges.sourceId)
      throw new Error("Charges require a source");
  }
  for (const dish of c.dishes) {
    const menu = menus.get(dish.menuId);
    if (!venues.has(dish.venueId) || !menu || menu.venueId !== dish.venueId || !dish.sourceIds.includes(menu.sourceId)) throw new Error("Dish branch mismatch");
    dish.sourceIds.forEach(requireSource);
  }
  c.candidates.forEach(item => item.sourceIds.forEach(requireSource));
}
export function readPilotCatalogue(value: unknown): PilotCatalogue {
  const v = object(value), rights = object(v.rights);
  if (v.version !== 1 || v.mode !== "local-research" || rights.content !== "facts-and-links-only"
    || rights.artworkCopied !== false || rights.photosCopied !== false || rights.merchantConsent !== "not-requested")
    throw new Error("Invalid local research rights");
  const result: PilotCatalogue = { version: 1, mode: "local-research", checkedAt: date(v.checkedAt),
    rights: { content: "facts-and-links-only", artworkCopied: false, photosCopied: false, merchantConsent: "not-requested" },
    sources: unique(list(v.sources, readPilotSource, 500)), venues: unique(list(v.venues, readPilotVenue)),
    menus: unique(list(v.menus, readPilotMenu, 200)), dishes: unique(list(v.dishes, readPilotDish, 5000)),
    candidates: unique(list(v.candidates, readPilotCandidate)) };
  references(result); return result;
}
