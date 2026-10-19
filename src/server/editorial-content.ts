import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CatalogueVenue } from "../types/catalogue";
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
