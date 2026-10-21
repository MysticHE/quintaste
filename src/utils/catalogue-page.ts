import type { CatalogueHours, CataloguePage, CataloguePhoto, CatalogueVenue } from "../types/catalogue";
import { inSingapore } from "./discovery-search";
export const catalogueFreshMs = 15 * 60 * 1000;
export const catalogueOfflineMs = 24 * 60 * 60 * 1000;
export const cataloguePageByteLimit = 40_000;
export function readCataloguePhoto(value: unknown): CataloguePhoto {
  const p = value as CataloguePhoto;
  const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  const link = (v: unknown) => {
    if (!text(v, 600)) return false;
    try { const u = new URL(v as string); return u.protocol === "https:" && !u.username && !u.password; }
    catch { return false; }
  };
  if (!p || typeof p !== "object" || !/^\/api\/catalogue-photos\/[a-f0-9]{64}\.jpg$/.test(p.path)
    || !Number.isInteger(p.width) || p.width < 1 || p.width > 1600
    || !Number.isInteger(p.height) || p.height < 1 || p.height > 1600
    || !text(p.author, 180) || !text(p.license, 80) || !text(p.changes, 300)
    || !link(p.sourceUrl) || (p.licenseUrl !== null && !link(p.licenseUrl))
    || (p.capturedAt !== null && !validDate(p.capturedAt)) || !validDate(p.checkedAt)
    || (p.provider !== undefined && p.provider !== "Google Maps")
    || Object.keys(p).some(key => !["path", "width", "height", "author", "sourceUrl", "license", "licenseUrl", "capturedAt", "checkedAt", "changes", "provider"].includes(key))) {
    throw new Error("Invalid catalogue photo");
  }
  return p;
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function readCatalogueHours(value: unknown): CatalogueHours {
  const h = value as CatalogueHours;
  const text = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  let source = false;
  try { const u = new URL(h?.sourceUrl); source = u.protocol === "https:" && !u.username && !u.password && u.href.length <= 600; } catch { /* Invalid source. */ }
  if (!h || typeof h !== "object" || !text(h.summary, 120) || !Array.isArray(h.schedule)
    || h.schedule.length < 1 || h.schedule.length > 8 || !h.schedule.every(line => text(line, 220))
    || typeof h.notes !== "string" || h.notes.length > 500 || !source || !validDate(h.checkedAt)
    || h.timezone !== "Asia/Singapore"
    || Object.keys(h).some(key => !["summary", "schedule", "notes", "sourceUrl", "checkedAt", "timezone"].includes(key))) {
    throw new Error("Invalid catalogue opening hours");
  }
  return h;
}
export function readCatalogueVenue(value: unknown): CatalogueVenue {
  const v = value as CatalogueVenue;
  if (!v || typeof v !== "object" || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(v.id)
    || typeof v.name !== "string" || v.name.length > 300 || typeof v.address !== "string" || v.address.length > 600
    || typeof v.branch !== "string" || typeof v.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(v.fingerprint)
    || !["Vegetarian", "Vegan"].includes(v.venueDiet) || typeof v.alliumFreeClaim !== "boolean"
    // 0 dishes: a Veg Kitchen place proven by its name or the owner, with no menu online (owner, 21 Oct 2026)
    || !Number.isSafeInteger(v.itemCount) || v.itemCount < 0 || !Number.isSafeInteger(v.sectionCount) || v.sectionCount < 0
    || (v.point !== null && (!v.point || !inSingapore(v.point)))
    || (v.distanceKm !== undefined && (!Number.isFinite(v.distanceKm) || v.distanceKm < 0))
    // A veg options place is never fully vegetarian and never carries an allium-free claim.
    || (v.kitchen !== undefined && (v.kitchen !== "options" || v.alliumFreeClaim))
    || (v.menuTotal !== undefined && (!Number.isSafeInteger(v.menuTotal) || v.menuTotal < 1 || v.menuTotal > 2000))
    || "sections" in v || "items" in v) throw new Error("Invalid venue summary");
  if (v.photo !== undefined) readCataloguePhoto(v.photo);
  if (v.hours !== undefined) readCatalogueHours(v.hours);
  if (v.research) {
    if (!Array.isArray(v.research.sourceUrls) || v.research.sourceUrls.length > 12 || !v.research.sourceUrls.every(url => {
      try { const u = new URL(url); return url.length <= 600 && u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
    }) || !Array.isArray(v.research.notes) || v.research.notes.length > 6 || !v.research.notes.every(n => typeof n === "string" && n.length <= 700) || !validDate(v.research.checkedAt)) throw new Error("Invalid source notes");
  }
  return v;
}
export function readCataloguePage(value: unknown): CataloguePage {
  const p = value as CataloguePage;
  if (!p || p.version !== 1 || !/^[a-f0-9]{64}$/.test(p.revision) || !Array.isArray(p.venues) || p.venues.length > 20
    || !Number.isSafeInteger(p.total) || p.total < p.venues.length || !Number.isSafeInteger(p.locationGaps) || p.locationGaps < 0
    || p.nextCursor !== null && (typeof p.nextCursor !== "string" || p.nextCursor.length > 250)) throw new Error("Invalid results");
  p.venues.forEach(readCatalogueVenue);
  if (new Set(p.venues.map(v => v.id)).size !== p.venues.length) throw new Error("Duplicate results");
  return p;
}
