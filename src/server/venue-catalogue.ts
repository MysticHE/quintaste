import { createHash } from "node:crypto";
import index from "../../data/menus/catalogue-index.json";
import aliases from "../../data/menus/catalogue-aliases.json";
import { areas } from "../data/areas";
import type { CataloguePage, CatalogueVenue } from "../types/catalogue";
import type { DiscoverySearch } from "../types/discovery";
import { distanceKm } from "../utils/discovery-search";
import { editorialContent, editorialPlaces, editorialPlaceVenue, editorialVenue } from "./editorial-content";
import { editorialPlaceIds, menuSummary, staffMenu, staffPlaceIds } from "./menu-delivery";
import type { StaffContent, StaffPlaceData } from "../types/staff-content";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const words = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const catalogue = index.venues as CatalogueVenue[];
const revision = index.revision;
const hiddenAliases = new Map(aliases.entries.filter(alias => {
  const old = catalogue.find(venue => venue.id === alias.aliasId), next = catalogue.find(venue => venue.id === alias.canonicalId);
  return old?.name === alias.name && next?.name === alias.name && old?.address === alias.address && next?.address === alias.address;
}).map(alias => [alias.aliasId, alias.canonicalId]));

const noStaff: StaffContent = { revision: "0".repeat(64), catalogueRevision: "0".repeat(64), items: new Map() };
const packagedIds = new Set(catalogue.map(venue => venue.id));

// Facts from each place's current menu: dish names one per line, so a keyword never matches across two dishes,
// and the venue's own V/VG labels, which decide what a veg options place may show.
type MenuFacts = { text: string; tagged: boolean; anyVegan: boolean; allVegan: boolean };
let facts: { key: string; menus: Map<string, MenuFacts> } = { key: "", menus: new Map() };
function menuFacts(id: string, staff: StaffContent, content: ReturnType<typeof editorialContent>) {
  const key = staff.catalogueRevision + ":" + content.revision;
  if (facts.key !== key) facts = { key, menus: new Map() };
  let value = facts.menus.get(id);
  if (value === undefined) {
    const items = staffMenu(id, staff, content)?.menu.sections.flatMap(section => section.items) ?? [];
    value = { text: items.map(item => words(item.name)).join("\n"), tagged: items.length > 0 && items.every(item => item.diet === "V" || item.diet === "VG"),
      anyVegan: items.some(item => item.diet === "VG"), allVegan: items.length > 0 && items.every(item => item.diet === "VG") };
    facts.menus.set(id, value);
  }
  return value;
}
/** A veg options place is listed only while every published dish carries the venue's V/VG label: an untagged dish could be meat or seafood. */
function kitchenVenue(venue: CatalogueVenue | undefined, staff: StaffContent, content: ReturnType<typeof editorialContent>): CatalogueVenue | undefined {
  if (!venue || venue.kitchen === undefined) return venue;
  const menu = menuFacts(venue.id, staff, content);
  if (venue.kitchen !== "options" || !menu.tagged) return undefined;
  const { menuTotal, ...rest } = venue;
  const total = menuTotal !== undefined && Number.isSafeInteger(menuTotal) && menuTotal >= venue.itemCount && menuTotal <= 2000 ? { menuTotal } : {};
  return { ...rest, ...total, alliumFreeClaim: false, venueDiet: menu.allVegan ? "Vegan" : "Vegetarian" };
}

/** Applies a staff place edit, or builds a staff-created place, with counts from the staff-applied menu. Undefined when hidden or without dishes. */
function staffVenue(id: string, base: CatalogueVenue | undefined, staff: StaffContent, content = editorialContent()): CatalogueVenue | undefined {
  const place = staff.items.get("place:" + id);
  if (!place && !staff.items.has("menu:" + id)) return base;
  if (place?.hidden || !base && place?.origin !== "staff") return undefined;
  const applied = staffMenu(id, staff, content);
  const { base: _base, sourceUrl: _sourceUrl, photo, hours, kitchen, menuTotal, ...fields } = (place?.data ?? {}) as StaffPlaceData;
  // A staff-created Veg Kitchen place may have no dishes (owner, 21 Oct 2026), like a bot place proven by its name: it lists without a menu.
  const menuless = !applied && place?.origin === "staff" && !kitchen;
  if (!applied && !menuless) return undefined;
  const summary = applied ? menuSummary(applied) : { id, name: fields.name ?? "", branch: fields.branch ?? "", address: fields.address ?? "", postalCode: fields.postalCode ?? "",
    aliases: fields.aliases ?? [], googlePlaceId: null, fingerprint: hash({ staffPlace: id, data: place!.data }), checkedAt: new Date(place!.updated_at).toISOString(), itemCount: 0, sectionCount: 0 };
  const venue = { ...(base ?? { point: null, venueDiet: "Vegetarian", alliumFreeClaim: false }), ...fields, ...summary } as CatalogueVenue;
  if (photo === null) delete venue.photo; else if (photo) venue.photo = photo;
  if (hours === null) delete venue.hours; else if (hours) venue.hours = hours;
  if (kitchen === null) delete venue.kitchen; else if (kitchen) venue.kitchen = kitchen;
  if (menuTotal === null) delete venue.menuTotal; else if (menuTotal !== undefined) venue.menuTotal = menuTotal;
  return venue;
}

export function catalogueVenue(id: string, withdrawn: ReadonlySet<string>, staff = noStaff): CatalogueVenue | undefined {
  if (withdrawn.has(id) || withdrawn.has(hiddenAliases.get(id) ?? id)) return undefined;
  const venue = catalogue.find(venue => venue.id === id), content = editorialContent(), place = venue ? undefined : editorialPlaces(content).get(id);
  const base = venue ? editorialVenue(venue, true, content) : place ? editorialPlaceVenue(place, true) : undefined;
  return kitchenVenue(staffVenue(id, base, staff, content), staff, content);
}

const hiddenAliasEntries = [...hiddenAliases];
// Everything Explore can list, built once per editorial snapshot and staff revision: a nightly run adds hundreds of places, and rebuilding every
// venue on each search page would grow with them. A search only filters, sorts and slices this list.
type Listed = { venue: CatalogueVenue; text: string };
let listed: { key: string; venues: Listed[] } | undefined;
/** Packaged, QT Explorer and staff-created venues after staff edits and the Mixed Kitchen rule, with the lower-case name/branch/address text a keyword is matched against. */
function listedVenues(staff: StaffContent, content: ReturnType<typeof editorialContent>): Listed[] {
  const key = staff.catalogueRevision + ":" + content.revision;
  if (listed?.key === key) return listed.venues;
  // QT Explorer places (Mixed Kitchen and fully vegetarian) join packaged and staff-created places; each id is listed once.
  const explorer = editorialPlaces(content), explorerIds = editorialPlaceIds(content);
  const sources = [...catalogue.map(venue => staffVenue(venue.id, editorialVenue(venue, false, content), staff, content)),
    ...explorerIds.map(id => staffVenue(id, editorialPlaceVenue(explorer.get(id)!, false), staff, content)),
    ...staffPlaceIds(staff).filter(id => !packagedIds.has(id) && !explorer.has(id)).map(id => staffVenue(id, undefined, staff, content))];
  const venues: Listed[] = [];
  for (const source of sources) {
    const venue = kitchenVenue(source, staff, content);
    if (venue && !hiddenAliases.has(venue.id)) venues.push({ venue, text: words([venue.name, venue.branch, venue.address, ...venue.aliases].join(" ")) });
  }
  listed = { key, venues };
  return venues;
}

export function searchCatalogue(search: DiscoverySearch, cursor: string | null, withdrawn: ReadonlySet<string>, staff = noStaff): CataloguePage {
  const content = editorialContent();
  const query = words(search.query), area = words(search.area);
  const known = areas.find(item => words(item.name) === area);
  const center = search.center ?? search.origin ?? (known?.lat && known.lng ? { latitude: known.lat, longitude: known.lng } : undefined);
  const searchRevision = hash({ revision, editorialRevision: content.revision, staffRevision: staff.catalogueRevision, aliases: [...hiddenAliases], search: { ...search, origin: search.origin
    ? { latitude: search.origin.latitude, longitude: search.origin.longitude } : undefined }, withdrawn: [...withdrawn].sort() });
  let offset = 0;
  if (cursor) {
    if (cursor.length > 250 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error("Invalid page");
    let value: unknown;
    try { value = JSON.parse(Buffer.from(cursor, "base64url").toString()); } catch { throw new Error("Invalid page"); }
    const page = value as { revision?: string; offset?: number };
    if (!page || page.revision !== searchRevision || !Number.isSafeInteger(page.offset) || page.offset! < 0
      || page.offset! % 20 !== 0) throw new Error("Search changed. Refresh results.");
    offset = page.offset!;
  }
  let locationGaps = 0;
  const venues: CatalogueVenue[] = [];
  for (const { venue, text } of listedVenues(staff, content)) {
    const savedAlias = search.savedIds && hiddenAliasEntries.some(([alias, id]) => id === venue.id && search.savedIds!.includes("catalogue-" + alias));
    if (search.savedIds && !search.savedIds.includes("catalogue-" + venue.id)
      && !savedAlias && !(venue.googlePlaceId && search.savedIds.includes("google-" + venue.googlePlaceId))) continue;
    // Veg Kitchen and Mixed Kitchen are separate lists; Saved and older clients sending includeOptions get both kinds.
    const options = venue.kitchen === "options", labels = search.labels ?? [];
    if (!search.savedIds && (search.kitchen === "mixed" ? !options : options && !search.includeOptions)) continue;
    // Each chosen label must be proven: Vegan by the venue's vegan declaration (or, at a Mixed Kitchen, at least one
    // VG dish); Vegetarian (no five pungent) by the venue's own claim, which a Mixed Kitchen never carries.
    const vegan = venue.venueDiet === "Vegan" || options && menuFacts(venue.id, staff, content).anyVegan;
    const vegetarian = venue.alliumFreeClaim && !options;
    if (withdrawn.has(venue.id) || labels.includes("Vegan") && !vegan || labels.includes("Vegetarian") && !vegetarian) continue;
    // Unknown cuisine and Google price-band facts cannot pass those filters.
    if (search.priceLevels?.length || search.cuisines?.length || search.priceLevel || search.cuisine && search.cuisine !== "All") continue;
    // A keyword finds places by name, branch or address, or by a dish on the published menu (the game's Find it nearby).
    if (query && !text.includes(query) && !menuFacts(venue.id, staff, content).text.includes(query)) continue;
    if (search.bounds) {
      if (!venue.point) { locationGaps++; continue; }
      if (venue.point.latitude < search.bounds.low.latitude || venue.point.latitude > search.bounds.high.latitude
        || venue.point.longitude < search.bounds.low.longitude || venue.point.longitude > search.bounds.high.longitude) continue;
    }
    if (center && !search.bounds) {
      if (!venue.point) { locationGaps++; continue; }
      const distance = distanceKm(center, venue.point);
      if (distance <= search.radius / 1000) venues.push({ ...venue, distanceKm: Math.round(distance * 100) / 100 });
      continue;
    }
    if (!search.bounds && area !== "singapore" && !text.includes(area)) continue;
    venues.push(venue);
  }
  venues.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  // The page must exist in this result set; QT Explorer places can take it well past the packaged catalogue.
  if (offset > 0 && offset >= venues.length) throw new Error("Search changed. Refresh results.");
  const next = offset + 20;
  return { version: 1, revision: searchRevision, venues: venues.slice(offset, next), total: venues.length, locationGaps,
    nextCursor: next < venues.length ? Buffer.from(JSON.stringify({ revision: searchRevision, offset: next })).toString("base64url") : null };
}
