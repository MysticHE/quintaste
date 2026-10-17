import { createHash } from "node:crypto";
import data from "../../data/pilot/catalogue.json";
import { readPilotCatalogue } from "../utils/pilot-schema";
import { pilotSourcesForVenue } from "../utils/pilot-evidence";
import type { PilotVenue } from "../types/pilot-catalogue";

export const pilotCatalogue = () => readPilotCatalogue(data);
export function currentPilotFingerprint(venue: PilotVenue) {
  const catalogue = pilotCatalogue(), sort = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify({ venue,
    menus: sort(catalogue.menus.filter(item => item.venueId === venue.id)),
    dishes: sort(catalogue.dishes.filter(item => item.venueId === venue.id)),
    sources: sort(pilotSourcesForVenue(venue, catalogue)), rights: catalogue.rights })).digest("hex");
}
