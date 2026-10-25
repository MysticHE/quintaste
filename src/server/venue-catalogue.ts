import { createHash } from "node:crypto";
import index from "../../data/menus/catalogue-index.json";
import aliases from "../../data/menus/catalogue-aliases.json";
import previews from "../../data/menus/catalogue-photo-previews.json";
import { areas } from "../data/areas";
import type { CataloguePage, CatalogueVenue } from "../types/catalogue";
import type { DiscoverySearch } from "../types/discovery";
import { distanceKm } from "../utils/discovery-search";
import { editorialContent, editorialPlaces, editorialPlaceVenue, editorialVenue } from "./editorial-content";
import { editorialPlaceIds, menuSummary, staffMenu, staffPlaceIds } from "./menu-delivery";
import type { StaffContent, StaffPlaceData } from "../types/staff-content";
import type { MenuItem } from "../types/menus";
import { matchTier, searchWords } from "../utils/search-words";
import { dishTerms } from "./dish-search";
import type { PlaceSignals } from "./place-signals";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const words = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const catalogue = index.venues as CatalogueVenue[];
const revision = index.revision;
const photoPreviews: Record<string, string> = previews.previews, previewRevision = hash(photoPreviews);
/**
 * Adds a packaged photo's ThumbHash (scripts/build-photo-previews.ts) after the editorial and staff overlays, which are tied to the
 * exact catalogue index venue hashes and so must never see it.
 */
function withPreview(venue: CatalogueVenue): CatalogueVenue {
  const sha = venue.photo?.path.match(/([a-f0-9]{64})\.jpg$/)?.[1], thumbhash = sha ? photoPreviews[sha] : undefined;
  return thumbhash && venue.photo ? { ...venue, photo: { ...venue.photo, thumbhash } } : venue;
}
const hiddenAliases = new Map(aliases.entries.filter(alias => {
  const old = catalogue.find(venue => venue.id === alias.aliasId), next = catalogue.find(venue => venue.id === alias.canonicalId);
  return old?.name === alias.name && next?.name === alias.name && old?.address === alias.address && next?.address === alias.address;
}).map(alias => [alias.aliasId, alias.canonicalId]));

const noStaff: StaffContent = { revision: "0".repeat(64), catalogueRevision: "0".repeat(64), items: new Map() };
const packagedIds = new Set(catalogue.map(venue => venue.id));

// Facts from each place's current menu: each dish name in search words, so a keyword never matches across two dishes,
// and the venue's own V/VG labels, which decide what a veg options place may show.
type MenuFacts = { dishes: { text: string; item: MenuItem }[]; tagged: boolean; anyVegan: boolean; allVegan: boolean };
let facts: { key: string; menus: Map<string, MenuFacts> } = { key: "", menus: new Map() };
function menuFacts(id: string, staff: StaffContent, content: ReturnType<typeof editorialContent>) {
  const key = staff.catalogueRevision + ":" + content.revision;
  if (facts.key !== key) facts = { key, menus: new Map() };
  let value = facts.menus.get(id);
  if (value === undefined) {
    const items = staffMenu(id, staff, content)?.menu.sections.flatMap(section => section.items) ?? [];
    value = { dishes: items.map(item => ({ text: searchWords(item.name), item })), tagged: items.length > 0 && items.every(item => item.diet === "V" || item.diet === "VG"),
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
  const found = kitchenVenue(staffVenue(id, base, staff, content), staff, content);
  return found && withPreview(found);
}

const hiddenAliasEntries = [...hiddenAliases];
// Everything Explore can list, built once per editorial snapshot and staff revision: a nightly run adds hundreds of places, and rebuilding every
// venue on each search page would grow with them. A search only filters, sorts and slices this list.
type Listed = { venue: CatalogueVenue; text: string; names: string[]; search: string };
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
    if (venue && !hiddenAliases.has(venue.id)) venues.push({ venue: withPreview(venue), text: words([venue.name, venue.branch, venue.address, ...venue.aliases].join(" ")),
      names: [venue.name, ...venue.aliases].map(searchWords), search: searchWords([venue.name, venue.branch, venue.address, ...venue.aliases].join(" ")) });
  }
  listed = { key, venues };
  return venues;
}

/** A place's closest match for a keyword (matchTier, -1 for none): its name, its address, or its best matching dish, which the card shows. */
function keywordMatch({ names, search }: Listed, query: string, facts: MenuFacts) {
  const best = (tiers: number[]) => tiers.reduce((low, tier) => tier >= 0 && (low < 0 || tier < low) ? tier : low, -1);
  let tier = best(names.map(name => matchTier(name, query)));
  if (tier < 0 && search.includes(query)) tier = 3;
  let dish: MenuItem | undefined, dishTier = -1;
  for (const { text, item } of facts.dishes) {
    const found = matchTier(text, query);
    if (found >= 0 && (dishTier < 0 || found < dishTier)) { dishTier = found; dish = item; }
    if (dishTier === 0) break;
  }
  if (dish && (tier < 0 || dishTier < tier)) tier = dishTier;
  return { tier, match: dish && { name: dish.name, price: dish.price } };
}
// Keyword results (owner, 25 Oct 2026): whole-word matches before partial ones, then nearness in bands (under 1 km, 1-3, 3-5,
// 5-10, further), then a dish named exactly the search, then QuinTaste reviews pulled toward an average rating until a place
// has about five, with a small lift for likes. An exact name never jumps a band: "Olive Fried Rice" is still fried rice.
const wordTier = (tier: number) => Math.max(tier, 1);
const distanceBands = [1, 3, 5, 10], priorReviews = 5, priorRating = 3.5, likeWeight = 0.15;
const distanceBand = (km: number | undefined) => km === undefined ? 0 : distanceBands.filter(limit => km >= limit).length;
function placeScore(signals: PlaceSignals, id: string) {
  const signal = signals.places.get(id);
  return signal ? (priorReviews * priorRating + signal.total) / (priorReviews + signal.reviews) + likeWeight * Math.log1p(signal.likes) : priorRating;
}
const noSignals: PlaceSignals = { revision: "0".repeat(64), places: new Map() };

type Eligible = { listing: Listed; venue: CatalogueVenue; gap?: true };
/**
 * The places a search may list before any keyword: kitchen, saved, labels, filters and location, with distances. A place
 * the location filter cannot judge (no map point) comes back as a gap, counted only if it would otherwise be listed.
 */
function eligibleVenues(search: DiscoverySearch, withdrawn: ReadonlySet<string>, staff: StaffContent, content: ReturnType<typeof editorialContent>): Eligible[] {
  const area = words(search.area), known = areas.find(item => words(item.name) === area);
  const center = search.center ?? search.origin ?? (known?.lat && known.lng ? { latitude: known.lat, longitude: known.lng } : undefined);
  const places: Eligible[] = [];
  // Unknown cuisine and Google price-band facts cannot pass those filters.
  if (search.priceLevels?.length || search.cuisines?.length || search.priceLevel || search.cuisine && search.cuisine !== "All") return places;
  for (const listing of listedVenues(staff, content)) {
    const { venue, text } = listing;
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
    if (search.bounds) {
      if (!venue.point) { places.push({ listing, venue, gap: true }); continue; }
      if (venue.point.latitude < search.bounds.low.latitude || venue.point.latitude > search.bounds.high.latitude
        || venue.point.longitude < search.bounds.low.longitude || venue.point.longitude > search.bounds.high.longitude) continue;
    }
    if (center && !search.bounds) {
      if (!venue.point) { places.push({ listing, venue, gap: true }); continue; }
      const distance = distanceKm(center, venue.point);
      if (distance <= search.radius / 1000) places.push({ listing, venue: { ...venue, distanceKm: Math.round(distance * 100) / 100 } });
      continue;
    }
    if (!search.bounds && area !== "singapore" && !text.includes(area)) continue;
    places.push({ listing, venue });
  }
  return places;
}

export function searchCatalogue(search: DiscoverySearch, cursor: string | null, withdrawn: ReadonlySet<string>, staff = noStaff, signals = noSignals): CataloguePage {
  const content = editorialContent(), query = searchWords(search.query);
  let page: { revision?: string; offset?: number; signals?: string } | undefined;
  if (cursor) {
    if (cursor.length > 250 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error("Invalid page");
    try { page = JSON.parse(Buffer.from(cursor, "base64url").toString()); } catch { throw new Error("Invalid page"); }
    if (!page || typeof page !== "object") throw new Error("Invalid page");
  }
  // Keyword results keep the review and like snapshot their first page used, so a refresh between pages never reorders a
  // list being scrolled; the loader keeps the snapshot before the latest. Browsing never uses them.
  const ranking = !query ? noSignals : [signals, signals.previous].find(item => item && page?.signals === item.revision.slice(0, 16)) ?? signals;
  const searchRevision = hash({ revision, previewRevision, editorialRevision: content.revision, staffRevision: staff.catalogueRevision,
    signals: query ? ranking.revision : undefined, aliases: [...hiddenAliases], search: { ...search, origin: search.origin
    ? { latitude: search.origin.latitude, longitude: search.origin.longitude } : undefined }, withdrawn: [...withdrawn].sort() });
  let offset = 0;
  if (page) {
    if (page.revision !== searchRevision || !Number.isSafeInteger(page.offset) || page.offset! < 0
      || page.offset! % 20 !== 0) throw new Error("Search changed. Refresh results.");
    offset = page.offset!;
  }
  let locationGaps = 0;
  const venues: CatalogueVenue[] = [], tiers = new Map<string, number>();
  for (const { listing, venue, gap } of eligibleVenues(search, withdrawn, staff, content)) {
    // A keyword finds places by name, branch or address, or by a dish on the published menu (the game's Find it nearby).
    let listed = venue;
    if (query) {
      const { tier, match } = keywordMatch(listing, query, menuFacts(venue.id, staff, content));
      if (tier < 0) continue;
      tiers.set(venue.id, tier);
      if (match) listed = { ...venue, match };
    }
    if (gap) locationGaps++; else venues.push(listed);
  }
  const nearest = (a: CatalogueVenue, b: CatalogueVenue) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  if (query) {
    const scores = new Map(venues.map(venue => [venue.id, placeScore(ranking, venue.id)]));
    venues.sort((a, b) => wordTier(tiers.get(a.id)!) - wordTier(tiers.get(b.id)!) || distanceBand(a.distanceKm) - distanceBand(b.distanceKm)
      || tiers.get(a.id)! - tiers.get(b.id)! || scores.get(b.id)! - scores.get(a.id)! || nearest(a, b));
  } else venues.sort(nearest);
  // The page must exist in this result set; QT Explorer places can take it well past the packaged catalogue.
  if (offset > 0 && offset >= venues.length) throw new Error("Search changed. Refresh results.");
  const next = offset + 20, nextPage = { revision: searchRevision, offset: next, ...(query ? { signals: ranking.revision.slice(0, 16) } : {}) };
  return { version: 1, revision: searchRevision, venues: venues.slice(offset, next), total: venues.length, locationGaps,
    nextCursor: next < venues.length ? Buffer.from(JSON.stringify(nextPage)).toString("base64url") : null };
}

let terms: { key: string; byQuery: Map<string, string[]> } = { key: "", byQuery: new Map() };
/** Dish names to suggest for what a member is typing, from the menus of the places the same search (tab, labels, area) may list. */
export function dishSuggestions(query: string, search: DiscoverySearch, withdrawn: ReadonlySet<string>, staff = noStaff): string[] {
  const content = editorialContent(), q = searchWords(query);
  const key = hash([staff.catalogueRevision, content.revision, [...withdrawn].sort()]), scope = hash({ ...search, query: "", origin: search.origin
    ? { latitude: search.origin.latitude, longitude: search.origin.longitude } : undefined }) + ":" + q;
  if (terms.key !== key) terms = { key, byQuery: new Map() };
  const cached = terms.byQuery.get(scope);
  if (cached) return cached;
  const menus = eligibleVenues(search, withdrawn, staff, content).filter(place => !place.gap)
    .map(({ venue }) => menuFacts(venue.id, staff, content).dishes.map(dish => dish.text));
  const found = dishTerms(q, menus);
  if (terms.byQuery.size >= 200) terms.byQuery.delete(terms.byQuery.keys().next().value!);
  terms.byQuery.set(scope, found);
  return found;
}
