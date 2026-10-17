import { createHash } from "node:crypto";
import compiled from "../../data/menus/published-research.json";
import publication from "../../data/menus/research-publication.json";
import identities from "../../data/menu-research/venue-menu-identity-reviews.json";
import type { MenuDetail, MenuIndex, MenuSummary, PublishedMenu } from "../types/menus";
import { readMenuCatalogue } from "../utils/menu-catalogue";
import { publishedMenus } from "./published-menus";
import { researchMenuPackets } from "./research-menu-packets";
import { editorialContent, editorialMenu } from "./editorial-content";

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
    id: item.id, name: item.name, category: item.category, price: item.price, qualifier: "",
  })) })),
}));
const details = new Map(published.map(menu => [menu.id, menu]));
const summaries: MenuSummary[] = published.map(menu => {
  const { sections, ...identity } = menu;
  return { ...identity, fingerprint: fingerprint(menu), checkedAt: sections.map(section => section.checkedAt).sort()[0],
    itemCount: sections.reduce((sum, section) => sum + section.items.length, 0), sectionCount: sections.length };
});
const revisions = new Map(summaries.map(menu => [menu.id, menu.fingerprint]));

export function publishedMenuIndex(now = Date.now(), withdrawn: ReadonlySet<string> = new Set()): MenuIndex {
  const content = editorialContent();
  return { version: 2, generatedAt: now, venues: summaries.filter(menu => !withdrawn.has(menu.id)).map(summary => ({ ...summary,
    fingerprint: editorialMenu(details.get(summary.id)!, summary.fingerprint, content).fingerprint })) };
}

export function publishedMenuDetail(id: string, now = Date.now(), withdrawn: ReadonlySet<string> = new Set()): MenuDetail | undefined {
  const menu = withdrawn.has(id) ? undefined : details.get(id);
  const current = menu ? editorialMenu(menu, revisions.get(id)!) : undefined;
  return current ? { version: 1, generatedAt: now, fingerprint: current.fingerprint, venues: [current.menu] } : undefined;
}
