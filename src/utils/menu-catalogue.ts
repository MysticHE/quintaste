import type { MenuCatalogue, MenuIndex, MenuSummary, PublishedMenu } from "../types/menus";
import { pilotAmount, pilotChoice, pilotDate, pilotId, pilotList, pilotObject, pilotText, pilotUnique, pilotUrl } from "./pilot-validation";
import { readCataloguePhoto } from "./catalogue-page";

export const menuRefreshMs = 300000;
export const menuOfflineMs = 7 * 86400000;
export const menuSourceMs = 90 * 86400000;
/** A sanity bound, not a working limit: the index lists packaged and staff-created places only (QT Explorer places are served one at a time). */
export const menuIndexVenueLimit = 20000;

function readSection(value: unknown): PublishedMenu["sections"][number] {
  const v = pilotObject(value);
  const items = pilotUnique(pilotList(v.items, value => {
    const item = pilotObject(value), price = pilotObject(item.price);
    const amount = pilotAmount(price.amount), maxAmount = price.maxAmount === undefined ? undefined : pilotAmount(price.maxAmount);
    if (maxAmount !== undefined && (maxAmount === null || amount === null || maxAmount < amount)) throw new Error("Invalid menu price range");
    return { id: pilotId(item.id), name: pilotText(item.name), category: item.category === undefined ? undefined : pilotText(item.category, 100, true),
      qualifier: pilotText(item.qualifier, 4000, true),
      ...(item.photo === undefined ? {} : { photo: item.photo === null ? null : readCataloguePhoto(item.photo) }),
      ...(item.availability === undefined ? {} : { availability: pilotText(item.availability, 1000, true) }),
      ...(item.diet === undefined ? {} : { diet: pilotChoice(item.diet, ["V", "VG"]) }),
      ...(item.details === undefined ? {} : { details: pilotList(item.details, value => pilotText(value, 12000), 80) }),
      price: { amount, ...(maxAmount === undefined ? {} : { maxAmount: maxAmount! }),
      currency: pilotChoice(price.currency, ["SGD", "unknown"]), type: pilotChoice(price.type, ["displayed", "from"]) } };
  }, 2000));
  if (!items.length) throw new Error("Menu has no items");
  return { id: pilotId(v.id), scope: pilotChoice(v.scope, ["branch-dine-in", "branch-ordering", "branch-delivery", "brand-menu"]),
    ...(v.title === undefined ? {} : { title: pilotText(v.title, 300) }),
    ...(v.itemNotice === undefined ? {} : { itemNotice: pilotText(v.itemNotice, 4000) }),
    coverage: v.coverage === undefined ? "partial" : pilotChoice(v.coverage, ["source-covered", "partial", "brand-only", "historical"]),
    checkedAt: pilotDate(v.checkedAt), sourceUrl: pilotUrl(v.sourceUrl), sourceLabel: pilotText(v.sourceLabel),
    notice: pilotText(v.notice, 8000, true), charges: pilotText(v.charges, 1000, true), items };
}

function readIdentity(value: unknown): Omit<PublishedMenu, "sections"> {
  const v = pilotObject(value), postalCode = pilotText(v.postalCode, 6);
  if (!/^\d{6}$/.test(postalCode) || v.googlePlaceId !== null && (typeof v.googlePlaceId !== "string"
    || !/^[A-Za-z0-9_-]{10,255}$/.test(v.googlePlaceId))) throw new Error("Invalid menu branch");
  return { id: pilotId(v.id), name: pilotText(v.name), branch: pilotText(v.branch, 300, true), address: pilotText(v.address, 500),
    postalCode, googlePlaceId: v.googlePlaceId as string | null,
    aliases: pilotList(v.aliases, value => pilotText(value), 10) };
}

function readVenue(value: unknown): PublishedMenu {
  const v = pilotObject(value), identity = readIdentity(value);
  const sections = pilotUnique(pilotList(v.sections, readSection, 20));
  if (!sections.length) throw new Error("Menu unavailable");
  return { ...identity, sections };
}

export function readMenuIndex(value: unknown, now = Date.now(), cached = false): MenuIndex {
  const v = pilotObject(value);
  if (v.version !== 2 || !Number.isSafeInteger(v.generatedAt) || Number(v.generatedAt) <= 0
    || Number(v.generatedAt) > now + 30000 || now - Number(v.generatedAt) >= (cached ? menuOfflineMs : menuRefreshMs))
    throw new Error("Menus need refreshing");
  const venues = pilotUnique(pilotList(v.venues, value => {
    const row = pilotObject(value), identity = readIdentity(value), fingerprint = pilotText(row.fingerprint, 64);
    if (!/^[a-f0-9]{64}$/.test(fingerprint) || !Number.isSafeInteger(row.itemCount) || Number(row.itemCount) < 1
      || Number(row.itemCount) > 20000 || !Number.isSafeInteger(row.sectionCount) || Number(row.sectionCount) < 1
      || Number(row.sectionCount) > 20) throw new Error("Invalid menu index");
    return { ...identity, fingerprint, checkedAt: pilotDate(row.checkedAt), itemCount: Number(row.itemCount),
      sectionCount: Number(row.sectionCount) } satisfies MenuSummary;
  }, menuIndexVenueLimit));
  return { version: 2, generatedAt: Number(v.generatedAt), venues };
}

export function readMenuCatalogue(value: unknown, now = Date.now(), cached = false): MenuCatalogue {
  const v = pilotObject(value);
  if (v.version !== 1 || typeof v.generatedAt !== "number" || !Number.isSafeInteger(v.generatedAt)
    || v.generatedAt <= 0 || v.generatedAt > now + 30000 || now - v.generatedAt >= (cached ? menuOfflineMs : menuRefreshMs))
    throw new Error("Menus need refreshing");
  return { version: 1, generatedAt: v.generatedAt, venues: pilotUnique(pilotList(v.venues, readVenue, 100)) };
}

