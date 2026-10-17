import { createHash } from "node:crypto";
import type { MenuItem, PublishedMenu } from "../../src/types/menus";
import { isRecord } from "../menu-research-files";
import { displayPriceRange } from "./price-range";

export type Raw = Record<string, unknown>;
export const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const publicId = (value: unknown) => /^[a-z0-9][a-z0-9-]{2,119}$/.test(text(value))
  ? text(value) : "menu-" + hash(value).slice(0, 32);
export const rows = (value: unknown): Raw[] => {
  if (!Array.isArray(value) || value.some(item => !isRecord(item))) throw new Error("Invalid research rows");
  return value as Raw[];
};
export const text = (value: unknown) => typeof value === "string"
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : "";
export const strings = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
export const held = (value: unknown) => /hold|held|historical|expired|unassigned|inactive/i.test(text(value));
const label = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^source /, "Source ");

function describe(value: unknown, depth = 0): string {
  if (depth > 12) throw new Error("Menu option nesting exceeds review limit");
  if (value === null || value === undefined) return "unstated";
  if (typeof value !== "object") return typeof value === "string" ? text(value) : String(value);
  if (Array.isArray(value)) return value.map(item => describe(item, depth + 1)).join("; ");
  return Object.entries(value).filter(([key]) => !/(?:^id$|Ids?$|^rawStatus$)/.test(key))
    .map(([key, item]) => label(key) + ": " + describe(item, depth + 1)).join(" · ");
}

const detailFields = ["portion", "priceVariants", "portionOptions", "modifierGroups", "optionGroups", "packagePriceOptions",
  "printedExtras", "foodChoiceGroups", "channelPrices", "componentPrice", "componentPrices", "setComponents",
  "setComponentsText", "includedDishes", "foodComponents", "printedPerSetAmount", "conditionalAlternatePrice",
  "conditionalPrices", "packingFee", "packagingFee", "publishedPreparationMinutes", "preparationChoices",
  "publishedTemperatureOptions", "additionalChargeText", "configurationNotice", "unlabelledVariationPrices",
  "compositionRule", "sourceCodeConflict", "priceObservationBasis", "sourcePriceText", "sourcePriceTexts", "listingPrice",
  "namedFlavourExamples", "sourceCategorySchedules", "optionNotes", "customizationFields", "bundleContents"];

function details(item: Raw) {
  const result: string[] = [];
  for (const key of detailFields) {
    const value = item[key];
    if (value === undefined) continue;
    const values = Array.isArray(value) && value.every(isRecord) ? value : [value];
    for (const entry of values) {
      const line = label(key) + ": " + describe(entry);
      if (line.length > 12000) throw new Error("Menu detail needs an explicit smaller option grouping: " + item.id);
      result.push(line);
    }
  }
  if (result.length > 80) throw new Error("Menu has too many option groups: " + item.id);
  return result;
}

export function normalizeItem(item: Raw): MenuItem {
  const price = isRecord(item.price) ? item.price : undefined;
  const variants = rows(item.priceVariants ?? []).map(row => row.amount).filter((v): v is number => typeof v === "number");
  const amount = item.quoteRequired || item.individualPricePublished === false || item.sourceTitlePriceConflict === true ? null
    : typeof price?.amount === "number" ? price.amount : variants.length ? Math.min(...variants) : null;
  const currency = price?.currency === "SGD" || !price && variants.length && rows(item.priceVariants).every(v => v.currency === "SGD")
    ? "SGD" as const : "unknown" as const;
  const notices = [text(item.qualifier), text(item.priceBasis), text(item.priceUnit), text(item.pricingNotice),
    text(item.availabilityNote), text(item.orderRestriction), text(item.taxNotice), text(item.sourceDateNotice),
    text(item.sourceLabelNotice), text(item.servingSizeNotice), text(item.customizationStatus)];
  if (item.sourceUnavailable === true) notices.push("Source marked unavailable at last check");
  if (item.availabilityNotes) notices.push(describe(item.availabilityNotes));
  if (isRecord(item.sourceAvailability) && item.sourceAvailability.availableDays)
    notices.push("Published days: " + describe(item.sourceAvailability.availableDays));
  if (item.sourceDateWindow) notices.push("Published dates: " + describe(item.sourceDateWindow));
  if (item.publishedWeekdays) notices.push("Published weekdays: " + describe(item.publishedWeekdays));
  if (item.hasUnreadChoices === true) notices.push("Some ordering choices are unavailable in the source");
  if (item.minimumOrderQuantity) notices.push("Minimum order: " + item.minimumOrderQuantity + " " + text(item.minimumOrderUnit));
  if (item.minimumAdvanceDays) notices.push("Preorder: at least " + item.minimumAdvanceDays + " days");
  if (item.minimumAdvanceHours) notices.push("Preorder: at least " + item.minimumAdvanceHours + " hours");
  if (item.publishedSchedule) notices.push("Published schedule: " + describe(item.publishedSchedule));
  if (item.publishedTimeWindow) notices.push("Published hours: " + text(item.publishedTimeWindow));
  if (item.sourcePriceSuffix) notices.push("Printed price suffix: " + text(item.sourcePriceSuffix));
  const qualifier = [...new Set(notices.filter(Boolean))].join(" · "), extra = details(item);
  return { id: publicId(item.id), name: text(item.name), category: text(item.category), qualifier,
    price: displayPriceRange(item, { amount, currency, type: price?.kind === "from" || !price && variants.length > 0 ? "from" : "displayed" }),
    ...(extra.length ? { details: extra } : {}) };
}

export function normalizeSection(menu: Raw, sources: Raw[], excluded: ReadonlySet<string>, checkedAt: string): PublishedMenu["sections"][number] {
  const sourceIds = strings(menu.sourceIds), source = sources.find(source => source.id === sourceIds[0]);
  if (!source) throw new Error("Menu source missing: " + menu.id);
  const url = text(source.url);
  const declaredScope = text(menu.scope);
  const scope = declaredScope === "branch-ordering" || declaredScope === "branch-delivery" || declaredScope === "branch-dine-in"
    ? declaredScope : /brand/.test(declaredScope) ? "brand-menu" : /foodpanda|deliveroo|grab/.test(url) ? "branch-delivery"
      : /oddle|getz|order|restosuite|cococart|maynuu|take\.app/.test(url) ? "branch-ordering" : "branch-dine-in";
  let items = rows(menu.items).filter(item => !!text(item.name) && !excluded.has(text(item.id)) && !held(item.publicationStatus)
    && !held(item.status) && !(typeof item.sourceStatusCode === "number" && item.sourceStatusCode !== 0)
    && !(typeof item.sourceCategoryStatusCode === "number" && item.sourceCategoryStatusCode !== 0)).map(normalizeItem);
  const shortest = items.reduce((shortest, item) => item.qualifier.length < shortest.length ? item.qualifier : shortest,
    items[0]?.qualifier ?? "");
  const itemNotice = shortest.length >= 100 && items.every(item => item.qualifier === shortest || item.qualifier.startsWith(shortest + " · "))
    ? shortest : "";
  if (itemNotice) items = items.map(item => ({ ...item, qualifier: item.qualifier.slice(itemNotice.length).replace(/^ · /, "") }));
  const dates = sources.filter(source => sourceIds.includes(text(source.id))).map(source => text(source.checkedAt) || checkedAt)
    .map(value => new Date(value).toISOString()).sort();
  const omitted = items.length < rows(menu.items).length;
  return { id: publicId(menu.id), title: text(menu.name), ...(itemNotice ? { itemNotice } : {}), scope,
    coverage: menu.coverage === "source-covered" && !omitted ? "source-covered" : "partial",
    checkedAt: dates[0] ?? new Date(checkedAt).toISOString(), sourceUrl: url,
    sourceLabel: text(source.publisher) || text(source.title) || "Menu source",
    notice: [text(menu.notice), omitted ? "Some source entries remain excluded pending review." : ""].filter(Boolean).join(" "),
    charges: menu.charges ? describe(menu.charges) : "See source for tax and service charges", items };
}
