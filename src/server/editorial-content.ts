import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CatalogueHours, CatalogueVenue } from "../types/catalogue";
import type { MenuItem, PublishedMenu } from "../types/menus";
import baseline from "../../data/menus/catalogue-index.json";

type MenuPrice = { sectionId: string; itemId: string; name: string; scope: string; sourceUrl: string; checkedAt: string; price: MenuItem["price"] };
type Closure = { status: "permanently-closed"; sourceUrl: string; quote: string; checkedAt: string };
type Override = { baseHash: string; checkedAt: string; data: Partial<CatalogueVenue> & { sourceUrls?: string[]; evidenceNotes?: string[]; menuPrices?: MenuPrice[]; closed?: Closure } };
let cache: { marker: string; revision: string; records: Record<string, Override> } | undefined;
/** The publisher switches one complete snapshot atomically. No network/provider fallback. */
export function editorialContent() {
  const file = path.join(process.env.QT_EDITORIAL_ROOT ?? path.resolve(".local/editorial"), "active.json");
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

/** A complete veg options place published by QT Explorer (record kind "place", validated by server/editorial/validation.mjs). */
type PlaceItem = { id: string; name: string; category?: string; price: { amount: number; currency: "SGD"; type: "displayed" | "from"; maxAmount?: number }; diet: "V" | "VG" };
type PlaceData = {
  id: string; kitchen: "options"; name: string; branch: string; address: string; postalCode: string; point: { latitude: number; longitude: number };
  googlePlaceId: string | null; venueDiet: "Vegetarian" | "Vegan"; alliumFreeClaim: false; hours?: CatalogueHours; sourceUrls: string[]; checkedAt: string;
  menu: { sourceUrl: string; sourceLabel: string; checkedAt: string; items: PlaceItem[] };
};
export type EditorialPlace = { venue: CatalogueVenue; menu: PublishedMenu; fingerprint: string };
const isText = (value: unknown, max: number, empty = false): value is string => typeof value === "string" && value.length <= max && (empty || value.trim().length > 0)
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isHttps = (value: unknown): value is string => isText(value, 600) && value.startsWith("https://");
const isPrice = (p: PlaceItem["price"] | undefined) => !!p && typeof p.amount === "number" && Number.isFinite(p.amount) && p.amount >= 0 && p.amount <= 10000 && p.currency === "SGD"
  && (p.type === "displayed" || p.type === "from") && (p.maxAmount === undefined || typeof p.maxAmount === "number" && p.maxAmount >= p.amount && p.maxAmount <= 10000);
/** The publisher validates every place; a malformed record is skipped here rather than shown. */
function readPlace(data: PlaceData | undefined): PlaceData | undefined {
  const items = data?.menu?.items;
  if (!data || typeof data.id !== "string" || !/^vo-[a-z0-9][a-z0-9-]{2,110}$/.test(data.id) || data.kitchen !== "options" || data.alliumFreeClaim !== false
    || !isText(data.name, 120) || !isText(data.branch, 120, true) || !isText(data.address, 300) || typeof data.postalCode !== "string" || !/^\d{6}$/.test(data.postalCode)
    || !(data.venueDiet === "Vegetarian" || data.venueDiet === "Vegan") || !isDate(data.checkedAt) || !Array.isArray(data.sourceUrls) || !data.sourceUrls.every(isHttps)
    || !data.point || !(data.point.latitude >= 1.15 && data.point.latitude <= 1.48 && data.point.longitude >= 103.6 && data.point.longitude <= 104.1)
    || !(data.googlePlaceId === null || typeof data.googlePlaceId === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(data.googlePlaceId))
    || !isHttps(data.menu.sourceUrl) || !isText(data.menu.sourceLabel, 80) || !isDate(data.menu.checkedAt) || !Array.isArray(items) || items.length < 2 || items.length > 200) return undefined;
  const ids = new Set(items.map(item => item?.id)), names = new Set(items.map(item => typeof item?.name === "string" ? item.name.trim().toLowerCase() : null));
  if (ids.size !== items.length || names.size !== items.length || !items.every(item => typeof item.id === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(item.id) && isText(item.name, 120)
    && (item.category === undefined || isText(item.category, 40, true)) && (item.diet === "V" || item.diet === "VG") && isPrice(item.price))) return undefined;
  if (data.venueDiet === "Vegan" && !items.every(item => item.diet === "VG")) return undefined;
  if (data.hours && !(isText(data.hours.summary, 120) && Array.isArray(data.hours.schedule) && isHttps(data.hours.sourceUrl) && isDate(data.hours.checkedAt))) return undefined;
  return data;
}
let places: { revision: string; places: Map<string, EditorialPlace> } | undefined;
/** Published veg options places as catalogue venues (with research sources) and their one-section menus, cached per snapshot revision. */
export function editorialPlaces(content = editorialContent()): ReadonlyMap<string, EditorialPlace> {
  if (places?.revision === content.revision) return places.places;
  const result = new Map<string, EditorialPlace>();
  for (const [key, entry] of Object.entries(content.records)) {
    const data = key.startsWith("place:") ? readPlace(entry.data as unknown as PlaceData) : undefined;
    if (!data || key !== "place:" + data.id) continue;
    const fingerprint = createHash("sha256").update(JSON.stringify(entry.data)).digest("hex");
    const identity = { id: data.id, name: data.name, branch: data.branch, address: data.address, postalCode: data.postalCode, aliases: [], googlePlaceId: data.googlePlaceId };
    const menu: PublishedMenu = { ...identity, sections: [{ id: "veg-options", title: "Vegetarian dishes", scope: "branch-dine-in", coverage: "partial", checkedAt: data.menu.checkedAt,
      sourceUrl: data.menu.sourceUrl, sourceLabel: data.menu.sourceLabel, notice: "", charges: "",
      items: data.menu.items.map(item => ({ id: item.id, name: item.name, ...(item.category ? { category: item.category } : {}), price: { ...item.price }, qualifier: "", diet: item.diet })) }] };
    const venue: CatalogueVenue = { ...identity, fingerprint, checkedAt: data.menu.checkedAt, sectionCount: 1, itemCount: data.menu.items.length, point: { latitude: data.point.latitude, longitude: data.point.longitude },
      venueDiet: data.venueDiet, alliumFreeClaim: false, kitchen: "options", ...(data.hours ? { hours: data.hours } : {}),
      research: { sourceUrls: [...new Set([...data.sourceUrls, data.menu.sourceUrl])].slice(0, 12), notes: [], checkedAt: data.checkedAt } };
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
