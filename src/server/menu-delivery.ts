import { createHash } from "node:crypto";
import compiled from "../../data/menus/published-research.json";
import publication from "../../data/menus/research-publication.json";
import identities from "../../data/menu-research/venue-menu-identity-reviews.json";
import catalogueIndex from "../../data/menus/catalogue-index.json";
import type { MenuDetail, MenuIndex, MenuSummary, PublishedMenu } from "../types/menus";
import { readMenuCatalogue } from "../utils/menu-catalogue";
import { publishedMenus } from "./published-menus";
import { researchMenuPackets } from "./research-menu-packets";
import { editorialContent, editorialMenu, editorialPlaces } from "./editorial-content";
import type { StaffContent, StaffMenuData, StaffPlaceData } from "../types/staff-content";

type Entry = { dataset: string; branchId: string; fingerprint: string; menu: PublishedMenu };
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function researchMenus() {
  const approved = new Map((publication.entries as Record<string, unknown>[]).map(entry =>
    [JSON.stringify([entry.dataset, entry.branchId]), entry]));
  return (compiled.entries as Entry[]).filter(entry => {
    const review = approved.get(JSON.stringify([entry.dataset, entry.branchId]));
    if (!review || review.fingerprint !== entry.fingerprint || !researchMenuPackets[entry.dataset]) return false;
    const { fingerprint: _fingerprint, ...fields } = review;
    return fingerprint({ packet: researchMenuPackets[entry.dataset], review: fields }) === entry.fingerprint;
  }).map(entry => {
    const review = approved.get(JSON.stringify([entry.dataset, entry.branchId]));
    const matches = identities.reviews.filter(identity => identity.dataset === entry.dataset && identity.branchId === entry.branchId);
    const identity = matches.length === 1 && matches[0].reviewStatus === "approved" ? matches[0] : undefined;
    const uniquePlace = identities.reviews.filter(identity => identity.placeId === entry.menu.googlePlaceId).length === 1;
    const menu = entry.menu.googlePlaceId && (identity?.placeId !== entry.menu.googlePlaceId
      || !uniquePlace || fingerprint(identity) !== review?.identityFingerprint)
      ? { ...entry.menu, googlePlaceId: null } : entry.menu;
    return readMenuCatalogue({ version: 1, generatedAt: Date.now(), venues: [menu] }).venues[0];
  });
}
// Detailed extraction stays in local reviewed source packets. Public clients
// receive the compact price projection, never long modifier/publication notes.
const published = [...publishedMenus().venues, ...researchMenus()].map(menu => ({ ...menu,
  sections: menu.sections.map(section => ({ ...section, items: section.items.map(item => ({
    id: item.id, name: item.name, category: item.category, price: item.price, qualifier: "", ...(item.diet ? { diet: item.diet } : {}),
  })) })),
}));
const details = new Map(published.map(menu => [menu.id, menu]));
const summaries: MenuSummary[] = published.map(menu => menuSummary({ menu, fingerprint: fingerprint(menu) }));
const revisions = new Map(summaries.map(menu => [menu.id, menu.fingerprint]));

type Applied = { menu: PublishedMenu; fingerprint: string };
const noStaff: StaffContent = { revision: "0".repeat(64), catalogueRevision: "0".repeat(64), items: new Map() };
// Applied staff menus are computed once per staff and bot revision, not on every search or index request.
let applied: { key: string; menus: Map<string, Applied | undefined> } = { key: "", menus: new Map() };
const staffSection = "quintaste-additions";

/** The packaged menu with bot price updates, or a QT Explorer veg options place's menu, before staff changes. */
export function baseMenu(id: string, content = editorialContent()): Applied | undefined {
  const menu = details.get(id);
  if (menu) return editorialMenu(menu, revisions.get(id)!, content);
  const place = editorialPlaces(content).get(id);
  return place ? { menu: place.menu, fingerprint: place.fingerprint } : undefined;
}
/** Staff changes win over packaged and bot content: hidden dishes leave, edited fields replace, added dishes form one section. */
export function staffMenu(id: string, staff: StaffContent, content = editorialContent()): Applied | undefined {
  const key = staff.catalogueRevision + ":" + content.revision;
  if (applied.key !== key) applied = { key, menus: new Map() };
  if (!applied.menus.has(id)) applied.menus.set(id, applyStaff(id, staff, content));
  return applied.menus.get(id);
}
function applyStaff(id: string, staff: StaffContent, content: ReturnType<typeof editorialContent>): Applied | undefined {
  const place = staff.items.get("place:" + id), edit = staff.items.get("menu:" + id);
  if (place?.hidden || edit?.hidden) return undefined;
  const created = place?.origin === "staff", base = created ? undefined : baseMenu(id, content);
  if (!place && !edit || !base && !created) return base;
  const p = (place?.data ?? {}) as StaffPlaceData, m = (edit?.data ?? {}) as StaffMenuData;
  const sections = (base?.menu.sections ?? []).map(section => ({ ...section, items: section.items.flatMap(item => {
    const change = m.items?.[section.id + "/" + item.id];
    if (!change) return [item];
    if (change.hidden) return [];
    return [{ ...item, ...(change.name ? { name: change.name } : {}), ...(change.category !== undefined ? { category: change.category || undefined } : {}),
      ...(change.price ? { price: change.price } : {}), ...(change.diet ? { diet: change.diet } : {}) }];
  }) })).filter(section => section.items.length);
  const sourceUrl = m.sourceUrl ?? p.sourceUrl ?? base?.menu.sections[0]?.sourceUrl;
  if (m.added?.length && sourceUrl && edit) sections.push({ id: staffSection, title: "Added by QuinTaste", scope: "branch-dine-in", coverage: "partial",
    checkedAt: edit.updated_at, sourceUrl, sourceLabel: "QuinTaste team", notice: "", charges: "", items: m.added });
  if (!sections.length) return undefined;
  const identity = base?.menu ?? { id, name: "", branch: "", address: "", postalCode: "", aliases: [], googlePlaceId: null };
  const menu: PublishedMenu = { id, name: p.name ?? identity.name, branch: p.branch ?? identity.branch, address: p.address ?? identity.address,
    postalCode: p.postalCode ?? identity.postalCode, aliases: p.aliases ?? identity.aliases, googlePlaceId: identity.googlePlaceId, sections };
  return { menu, fingerprint: fingerprint({ base: base?.fingerprint ?? null, menu }) };
}
export function menuSummary({ menu, fingerprint }: Applied): MenuSummary {
  const { sections, ...identity } = menu;
  return { ...identity, fingerprint, checkedAt: sections.map(section => section.checkedAt).sort()[0],
    itemCount: sections.reduce((sum, section) => sum + section.items.length, 0), sectionCount: sections.length };
}
const touched = (id: string, staff: StaffContent) => staff.items.has("place:" + id) || staff.items.has("menu:" + id);
const packagedKitchens = new Map((catalogueIndex.venues as { id: string; kitchen?: string }[]).flatMap(venue => venue.kitchen === undefined ? [] : [[venue.id, venue.kitchen] as const]));
/** A staff place edit decides the kitchen (null = fully vegetarian), else the packaged place; QT Explorer places are always veg options. */
function kitchenOf(id: string, staff: StaffContent) {
  const place = staff.items.get("place:" + id)?.data as StaffPlaceData | undefined;
  if (place?.kitchen !== undefined) return place.kitchen;
  return packagedKitchens.get(id) ?? (!details.has(id) && editorialPlaces().has(id) ? "options" : undefined);
}
/** A veg options place only ever serves dishes carrying the venue's V/VG label; an untagged dish could be meat or seafood. */
function servable(id: string, staff: StaffContent, current: Applied | undefined): Applied | undefined {
  if (!current || kitchenOf(id, staff) == null) return current;
  const sections = current.menu.sections.map(section => ({ ...section, items: section.items.filter(item => item.diet === "V" || item.diet === "VG") }))
    .filter(section => section.items.length);
  const unchanged = sections.length === current.menu.sections.length && sections.every((section, i) => section.items.length === current.menu.sections[i].items.length);
  if (unchanged) return current;
  return sections.length ? { menu: { ...current.menu, sections }, fingerprint: fingerprint({ base: current.fingerprint, sections }) } : undefined;
}
/** Staff-created places, published once they have at least one dish. */
export const staffPlaceIds = (staff: StaffContent) => [...staff.items.values()].filter(item => item.kind === "place" && item.origin === "staff").map(item => item.id);
/** QT Explorer veg options places that do not reuse a packaged place id. */
export const editorialPlaceIds = (content = editorialContent()) => [...editorialPlaces(content).keys()].filter(id => !details.has(id));

export function publishedMenuIndex(now = Date.now(), withdrawn: ReadonlySet<string> = new Set(), staff = noStaff): MenuIndex {
  const content = editorialContent();
  const packaged = summaries.filter(menu => !withdrawn.has(menu.id)).flatMap(summary => {
    if (!touched(summary.id, staff) && !packagedKitchens.has(summary.id)) return [{ ...summary, fingerprint: editorialMenu(details.get(summary.id)!, summary.fingerprint, content).fingerprint }];
    const applied = servable(summary.id, staff, staffMenu(summary.id, staff, content));
    return applied ? [menuSummary(applied)] : [];
  });
  const explorer = editorialPlaceIds(content), ids = [...explorer, ...staffPlaceIds(staff).filter(id => !details.has(id) && !explorer.includes(id))];
  const created = ids.filter(id => !withdrawn.has(id)).flatMap(id => {
    const applied = servable(id, staff, staffMenu(id, staff, content));
    return applied ? [menuSummary(applied)] : [];
  });
  return { version: 2, generatedAt: now, venues: [...packaged, ...created] };
}

export function publishedMenuDetail(id: string, now = Date.now(), withdrawn: ReadonlySet<string> = new Set(), staff = noStaff): MenuDetail | undefined {
  const current = withdrawn.has(id) ? undefined : servable(id, staff, staffMenu(id, staff));
  return current ? { version: 1, generatedAt: now, fingerprint: current.fingerprint, venues: [current.menu] } : undefined;
}
