import { createHash } from "node:crypto";
import index from "../../data/menus/catalogue-index.json";
import aliases from "../../data/menus/catalogue-aliases.json";
import { areas } from "../data/areas";
import type { CataloguePage, CatalogueVenue } from "../types/catalogue";
import type { DiscoverySearch } from "../types/discovery";
import { distanceKm } from "../utils/discovery-search";
import { editorialContent, editorialVenue } from "./editorial-content";
import { menuSummary, staffMenu, staffPlaceIds } from "./menu-delivery";
import type { StaffContent, StaffPlaceData } from "../types/staff-content";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const words = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const catalogue = index.venues as CatalogueVenue[];
const revision = index.revision;
const hiddenAliases = new Map(aliases.entries.filter(alias => {
  const old = catalogue.find(venue => venue.id === alias.aliasId), next = catalogue.find(venue => venue.id === alias.canonicalId);
  return old?.name === alias.name && next?.name === alias.name && old?.address === alias.address && next?.address === alias.address;
}).map(alias => [alias.aliasId, alias.canonicalId]));

const noStaff: StaffContent = { revision: "0".repeat(64), items: new Map() };
const packagedIds = new Set(catalogue.map(venue => venue.id));

/** Applies a staff place edit, or builds a staff-created place, with counts from the staff-applied menu. Undefined when hidden or without dishes. */
function staffVenue(id: string, base: CatalogueVenue | undefined, staff: StaffContent, content = editorialContent()): CatalogueVenue | undefined {
  const place = staff.items.get("place:" + id);
  if (!place && !staff.items.has("menu:" + id)) return base;
  if (place?.hidden || !base && place?.origin !== "staff") return undefined;
  const applied = staffMenu(id, staff, content);
  if (!applied) return undefined;
  const { base: _base, sourceUrl: _sourceUrl, photo, hours, ...fields } = (place?.data ?? {}) as StaffPlaceData;
  const venue = { ...(base ?? { point: null, venueDiet: "Vegetarian", alliumFreeClaim: false }), ...fields, ...menuSummary(applied) } as CatalogueVenue;
  if (photo === null) delete venue.photo; else if (photo) venue.photo = photo;
  if (hours === null) delete venue.hours; else if (hours) venue.hours = hours;
  return venue;
}

export function catalogueVenue(id: string, withdrawn: ReadonlySet<string>, staff = noStaff): CatalogueVenue | undefined {
  if (withdrawn.has(id) || withdrawn.has(hiddenAliases.get(id) ?? id)) return undefined;
  const venue = catalogue.find(venue => venue.id === id);
  return staffVenue(id, venue ? editorialVenue(venue, true) : undefined, staff);
}

export function searchCatalogue(search: DiscoverySearch, cursor: string | null, withdrawn: ReadonlySet<string>, staff = noStaff): CataloguePage {
  const content = editorialContent();
  const query = words(search.query), area = words(search.area);
  const known = areas.find(item => words(item.name) === area);
  const center = search.center ?? search.origin ?? (known?.lat && known.lng ? { latitude: known.lat, longitude: known.lng } : undefined);
  const searchRevision = hash({ revision, editorialRevision: content.revision, staffRevision: staff.revision, aliases: [...hiddenAliases], search: { ...search, origin: search.origin
    ? { latitude: search.origin.latitude, longitude: search.origin.longitude } : undefined }, withdrawn: [...withdrawn].sort() });
  let offset = 0;
  if (cursor) {
    if (cursor.length > 250 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error("Invalid page");
    let value: unknown;
    try { value = JSON.parse(Buffer.from(cursor, "base64url").toString()); } catch { throw new Error("Invalid page"); }
    const page = value as { revision?: string; offset?: number };
    if (!page || page.revision !== searchRevision || !Number.isSafeInteger(page.offset) || page.offset! < 0
      || page.offset! > catalogue.length + 2000 || page.offset! % 20 !== 0) throw new Error("Search changed. Refresh results.");
    offset = page.offset!;
  }
  let locationGaps = 0;
  const sources = [...catalogue.map(venue => staffVenue(venue.id, editorialVenue(venue, false, content), staff, content)),
    ...staffPlaceIds(staff).filter(id => !packagedIds.has(id)).map(id => staffVenue(id, undefined, staff, content))];
  const venues = sources.flatMap(venue => venue ? [venue] : []).flatMap(venue => {
    if (hiddenAliases.has(venue.id)) return [];
    const savedAlias = search.savedIds && [...hiddenAliases].some(([alias, id]) => id === venue.id && search.savedIds!.includes("catalogue-" + alias));
    if (search.savedIds && !search.savedIds.includes("catalogue-" + venue.id)
      && !savedAlias && !(venue.googlePlaceId && search.savedIds.includes("google-" + venue.googlePlaceId))) return [];
    if (withdrawn.has(venue.id) || (search.diets ? search.diets.length > 0 && !search.diets.includes(venue.venueDiet) : search.vegan && venue.venueDiet !== "Vegan") || search.alliumFree && !venue.alliumFreeClaim) return [];
    // Unknown cuisine and Google price-band facts cannot pass those filters.
    if (search.priceLevels?.length || search.cuisines?.length || search.priceLevel || search.cuisine && search.cuisine !== "All") return [];
    const text = words([venue.name, venue.branch, venue.address, ...venue.aliases].join(" "));
    if (query && !text.includes(query)) return [];
    if (search.bounds) {
      if (!venue.point) { locationGaps++; return []; }
      if (venue.point.latitude < search.bounds.low.latitude || venue.point.latitude > search.bounds.high.latitude
        || venue.point.longitude < search.bounds.low.longitude || venue.point.longitude > search.bounds.high.longitude) return [];
    }
    if (center && !search.bounds) {
      if (!venue.point) { locationGaps++; return []; }
      const distance = distanceKm(center, venue.point);
      return distance <= search.radius / 1000 ? [{ ...venue, distanceKm: Math.round(distance * 100) / 100 }] : [];
    }
    if (!search.bounds && area !== "singapore" && !text.includes(area)) return [];
    return [venue];
  }).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const next = offset + 20;
  return { version: 1, revision: searchRevision, venues: venues.slice(offset, next), total: venues.length, locationGaps,
    nextCursor: next < venues.length ? Buffer.from(JSON.stringify({ revision: searchRevision, offset: next })).toString("base64url") : null };
}
