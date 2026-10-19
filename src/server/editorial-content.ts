import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CatalogueHours, CataloguePhoto, CatalogueVenue } from "../types/catalogue";
import type { MenuItem, PublishedMenu } from "../types/menus";
import baseline from "../../data/menus/catalogue-index.json";
import { validPlaces } from "../../server/editorial/places.mjs";

type MenuPrice = { sectionId: string; itemId: string; name: string; scope: string; sourceUrl: string; checkedAt: string; price: MenuItem["price"] };
type Closure = { status: "permanently-closed"; sourceUrl: string; quote: string; checkedAt: string };
type Override = { baseHash: string; checkedAt: string; data: Partial<CatalogueVenue> & { sourceUrls?: string[]; evidenceNotes?: string[]; menuPrices?: MenuPrice[]; closed?: Closure } };
let cache: { marker: string; revision: string; records: Record<string, Override> } | undefined;
/** The publisher switches one complete snapshot atomically. No network/provider fallback. */
export function editorialContent() {
  const file = path.join(process.env.QT_EDITORIAL_ROOT || path.resolve(".local/editorial"), "active.json");
  try {
    const stat = fs.statSync(file), marker = file + ":" + stat.ino + ":" + stat.mtimeMs + ":" + stat.size;
    if (cache?.marker === marker) return cache;
    if (stat.size > 8 * 1024 * 1024) throw new Error("Invalid content snapshot");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.version !== 1 || !/^[a-f0-9]{64}$/.test(data.revision) || !data.records) throw new Error("Invalid content snapshot");
    cache = { marker, revision: data.revision, records: data.records }; return cache;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { revision: "0".repeat(64), records: {} as Record<string, Override> };
    throw error;
  }
}
export function editorialVenue(base: CatalogueVenue, includeResearch = false, content = editorialContent()): CatalogueVenue {
  const entry = content.records["venue:" + base.id];
  if (!entry || entry.baseHash !== createHash("sha256").update(JSON.stringify(base)).digest("hex")) return base;
  const { sourceUrls, evidenceNotes, menuPrices, closed: _closed, ...fields } = entry.data;
  return { ...base, ...fields, ...(menuPrices?.length ? { fingerprint: createHash("sha256").update(JSON.stringify({ base: base.fingerprint, menuPrices })).digest("hex") } : {}), ...(includeResearch ? { research: { sourceUrls: [...new Set([...(sourceUrls ?? []), ...(menuPrices ?? []).map(p => p.sourceUrl)])].slice(0, 12), notes: evidenceNotes ?? [], checkedAt: entry.checkedAt.slice(0, 10) } } : {}) };
}
/** Venues QT Explorer found permanently closed (removed from Explore and menus until the owner reverts the change). */
export function closedVenues(content = editorialContent()) {
  return Object.entries(content.records).flatMap(([key, entry]) => key.startsWith("venue:") && entry.data.closed ? [key.slice(6)] : []);
}
export function editorialMenu(menu: PublishedMenu, fingerprint: string, content = editorialContent()) {
  const entry = content.records["venue:" + menu.id], base = baseline.venues.find(v => v.id === menu.id), updates = entry?.data.menuPrices;
  if (!updates?.length || !base || entry.baseHash !== createHash("sha256").update(JSON.stringify(base)).digest("hex")) return { menu, fingerprint };
  const changed = { ...menu, sections: menu.sections.map(section => ({ ...section, items: section.items.map(item => {
    const change = updates.find(p => p.sectionId === section.id && p.itemId === item.id && p.name === item.name && p.scope === section.scope && p.sourceUrl === section.sourceUrl);
    return change ? { ...item, price: change.price } : item;
  }) })) };
  return { menu: changed, fingerprint: createHash("sha256").update(JSON.stringify({ base: fingerprint, menuPrices: updates })).digest("hex") };
}

/** A place published by QT Explorer (record kind "place", validated by server/editorial/validation.mjs): a Mixed Kitchen place (vo-,
 * kitchen "options", labelled dishes only) or a fully vegetarian one (vk-, no kitchen, whole menu, with a stored quote from the venue). */
type PlaceItem = { id: string; name: string; category?: string; price: { amount: number; currency: "SGD"; type: "displayed" | "from"; maxAmount?: number }; diet?: "V" | "VG" };
type PlaceData = {
  id: string; kitchen?: "options"; name: string; branch: string; address: string; postalCode: string; point: { latitude: number; longitude: number };
  googlePlaceId: string | null; venueDiet: "Vegetarian" | "Vegan"; alliumFreeClaim: false; hours?: CatalogueHours; photo?: CataloguePhoto; sourceUrls: string[]; checkedAt: string;
  dietProof?: { sourceUrl: string; quote: string; checkedAt: string };
  menu: { sourceUrl: string; sourceLabel: string; checkedAt: string; items: PlaceItem[] };
};
export type EditorialPlace = { venue: CatalogueVenue; menu: PublishedMenu; fingerprint: string };
/** The menu readers require a full UTC timestamp that is never in the future; a place stores only the Singapore day it
 * was checked, so use that day's Singapore midnight (UTC midnight of today's SGT date is still ahead before 8 am SGT).
 * A day still ahead of today (the validator allows a day of slack) is held at now, so one record can never fail every reader. */
const dayStamp = (day: string) => new Date(Math.min(Date.parse(day + "T00:00:00+08:00"), Date.now())).toISOString();
let places: { revision: string; places: Map<string, EditorialPlace> } | undefined;
/** Published QT Explorer places as catalogue venues (with research sources) and their one-section menus, cached per snapshot revision. */
export function editorialPlaces(content = editorialContent()): ReadonlyMap<string, EditorialPlace> {
  if (places?.revision === content.revision) return places.places;
  const result = new Map<string, EditorialPlace>();
  // The publisher's own validator (shared with the member routes) decides; a malformed or future-schema record is skipped rather than shown or thrown.
  for (const data of (validPlaces(content.records) as ReadonlyMap<string, PlaceData>).values()) {
    // Bump placeFormat when the served shape changes, so clients holding an older copy (same data) refetch it.
    const fingerprint = createHash("sha256").update(JSON.stringify({ placeFormat: 2, data })).digest("hex");
    const identity = { id: data.id, name: data.name, branch: data.branch, address: data.address, postalCode: data.postalCode, aliases: [], googlePlaceId: data.googlePlaceId };
    // A Mixed Kitchen place keeps the venue's V/VG label on each dish; a fully vegetarian place serves every dish unlabelled, like a packaged Veg Kitchen one.
    const options = data.kitchen === "options";
    const items: MenuItem[] = data.menu.items.map(item => ({ id: item.id, name: item.name, ...(item.category ? { category: item.category } : {}), price: { ...item.price }, qualifier: "", ...(options && item.diet ? { diet: item.diet } : {}) }));
    const menu: PublishedMenu = { ...identity, sections: [{ id: options ? "veg-options" : "menu", title: options ? "Vegetarian dishes" : "Menu", scope: "branch-dine-in", coverage: "partial", checkedAt: dayStamp(data.menu.checkedAt),
      sourceUrl: data.menu.sourceUrl, sourceLabel: data.menu.sourceLabel, notice: "", charges: "", items }] };
    // For a fully vegetarian place the quote's page and the menu page come first, so the 12-source limit can never drop the evidence for the diet.
    const sources = options ? [...data.sourceUrls, data.menu.sourceUrl] : [...(data.dietProof ? [data.dietProof.sourceUrl] : []), data.menu.sourceUrl, ...data.sourceUrls];
    const sourceUrls = [...new Set(sources)].slice(0, 12);
    const venue: CatalogueVenue = { ...identity, fingerprint, checkedAt: dayStamp(data.menu.checkedAt), sectionCount: 1, itemCount: data.menu.items.length, point: { latitude: data.point.latitude, longitude: data.point.longitude },
      venueDiet: data.venueDiet, alliumFreeClaim: false, ...(options ? { kitchen: "options" as const } : {}), ...(data.hours ? { hours: data.hours } : {}), ...(data.photo ? { photo: data.photo } : {}),
      research: { sourceUrls, notes: [], checkedAt: data.checkedAt } };
    result.set(data.id, { venue, menu, fingerprint });
  }
  places = { revision: content.revision, places: result };
  return result;
}
/** The catalogue form of a place: research sources only on the place page, never in search results. */
export function editorialPlaceVenue(place: EditorialPlace, includeResearch: boolean): CatalogueVenue {
  if (includeResearch) return place.venue;
  const { research: _research, ...venue } = place.venue;
  return venue;
}
