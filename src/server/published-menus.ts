import publication from "../../data/pilot/publication.json";
import type { MenuCatalogue, PublishedMenu } from "../types/menus";
import type { PilotMenu } from "../types/pilot-catalogue";
import { pilotCatalogue, currentPilotFingerprint } from "./pilot-catalogue";

function itemQualifier(note: string) {
  const schedule = note.match(/^Published menu marks ([A-Za-z ]+)\./)?.[1];
  if (schedule) return "Published schedule: " + schedule;
  return note.startsWith("Merchant description mentions egg.") ? "Merchant lists egg" : "";
}

function charges(menu: PilotMenu) {
  const parts: string[] = [];
  if (menu.charges.gst === "included") parts.push("GST included");
  if (menu.charges.gst === "excluded") parts.push(menu.charges.gstPercent === null ? "GST extra" : menu.charges.gstPercent + "% GST extra");
  if (menu.charges.servicePercent !== null) parts.push(menu.charges.servicePercent + "% service charge");
  if (menu.charges.gst === "unknown") parts.push("GST / service charge unstated");
  return parts.join(" · ");
}

export function publishedMenus(now = Date.now(), withdrawn: ReadonlySet<string> = new Set()): MenuCatalogue {
  const catalogue = pilotCatalogue();
  const venues: PublishedMenu[] = [];
  for (const entry of publication.venues) {
    const venue = catalogue.venues.find(item => item.id === entry.id);
    if (!venue || entry.status !== "published" || withdrawn.has(entry.id)
      || currentPilotFingerprint(venue) !== entry.fingerprint) continue;
    const sections = catalogue.menus.filter(menu => menu.venueId === venue.id).map(menu => {
      const source = catalogue.sources.find(item => item.id === menu.sourceId)!;
      const sourceIds = new Set([menu.sourceId, ...(menu.charges.sourceId ? [menu.charges.sourceId] : []),
        ...catalogue.dishes.filter(item => item.menuId === menu.id).flatMap(item => item.sourceIds)]);
      const dates = catalogue.sources.filter(item => sourceIds.has(item.id)).map(item => item.checkedAt).sort();
      return { id: menu.id, scope: menu.scope, coverage: menu.coverage ?? "partial", checkedAt: dates[0], sourceUrl: source.url, sourceLabel: source.publisher,
        notice: menu.notice ?? entry.notice, charges: charges(menu), items: catalogue.dishes.filter(item => item.menuId === menu.id)
          .map(item => ({ id: item.id, name: item.name, category: item.category, price: item.price, qualifier: item.qualifier ?? itemQualifier(item.note) })) };
    }).filter(section => section.items.length);
    if (sections.length) venues.push({ id: venue.id, name: venue.name, branch: venue.branch, address: venue.address,
      postalCode: venue.postalCode, aliases: entry.aliases, googlePlaceId: venue.googlePlaceId, sections });
  }
  return { version: 1, generatedAt: now, venues };
}
