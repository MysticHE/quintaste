import { emptyMarket, marketCategories, type MarketDocument, type MarketListing, type MarketThread } from "../types/market";
import { ingredientTextLimit, readIngredientInfo } from "../config/market-ingredients";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, limit = 100) => typeof value === "string" ? value.slice(0, limit) : "";
const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const items = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit).map(record) : [];
const strings = (value: unknown, limit: number) => Array.isArray(value) ? [...new Set(value.filter((item): item is string =>
  typeof item === "string" && /^[a-z0-9-]{1,100}$/.test(item)))].slice(0, limit) : [];
const photo = (value: unknown) => typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value) &&
  value.length <= 300000 ? value : undefined;
function readListing(input: Record<string, unknown>): MarketListing | null {
  const id = text(input.id);
  if (!/^market-[a-z0-9-]+$/.test(id) || input.sellerId !== "you") return null;
  const photos = record(input.photos), ingredientInfo = readIngredientInfo(input.ingredientInfo);
  if (typeof input.ingredients !== "string" || input.ingredients.length > ingredientTextLimit) ingredientInfo.reviewed = false;
  return {
    id, sellerId: "you", name: text(input.name, 80), category: marketCategories.includes(input.category as never) ? input.category as MarketListing["category"] : "Pantry",
    priceCents: Math.max(0, Math.min(1000000, Math.round(number(input.priceCents)))),
    quantity: Math.max(0, Math.min(99, Math.floor(number(input.quantity, 1)))), area: text(input.area, 60),
    expires: text(input.expires, 10), ingredients: text(input.ingredients, ingredientTextLimit), ingredientInfo, sealed: input.sealed === true,
    status: ["draft", "active", "paused", "sold"].includes(String(input.status)) ? input.status as MarketListing["status"] : "draft",
    photos: { item: photo(photos.item), label: photo(photos.label), seal: photo(photos.seal), date: photo(photos.date) },
    art: ["pouch", "jar", "box", "bottle"].includes(String(input.art)) ? input.art as MarketListing["art"] : "pouch",
    updatedAt: number(input.updatedAt),
  };
}
function readThread(input: Record<string, unknown>): MarketThread | null {
  if (!/^exchange-[a-z0-9-]+$/.test(text(input.id)) || !/^(market|sample)-[a-z0-9-]+$/.test(text(input.listingId))) return null;
  return {
    id: text(input.id), listingId: text(input.listingId), title: text(input.title, 80), sellerId: text(input.sellerId),
    selling: input.selling === true, status: ["chat", "offered", "reserved", "scheduled", "completed", "declined", "cancelled", "no-show", "disputed"].includes(String(input.status)) ?
      input.status as MarketThread["status"] : "chat",
    quantity: Math.max(1, Math.min(99, Math.floor(number(input.quantity, 1)))), offerCents: Math.max(1, Math.min(1000000, Math.round(number(input.offerCents, 1)))),
    meetup: text(input.meetup, 160), updatedAt: number(input.updatedAt), rating: Math.max(0, Math.min(5, Math.floor(number(input.rating)))),
    review: text(input.review, 300),
    messages: items(input.messages, 100).filter(item => text(item.text)).map((item, index) => ({
      id: text(item.id) || "message-" + index, text: text(item.text, 1000), who: item.who === "other" ? "other" : "you", at: number(item.at),
    })),
  };
}
export function readMarket(value: unknown): MarketDocument {
  if (!value) return emptyMarket();
  const input = record(value);
  return {
    listings: items(input.listings, 30).map(readListing).filter((item): item is MarketListing => !!item),
    threads: items(input.threads, 60).map(readThread).filter((item): item is MarketThread => !!item),
    saved: strings(input.saved, 200), blocked: strings(input.blocked, 100),
  };
}
export class MarketCapacityError extends Error {}
export function mergeMarket(profile: MarketDocument, guest: MarketDocument): MarketDocument {
  const ownIds = new Set(profile.listings.map(item => item.id)), threadIds = new Set(profile.threads.map(item => item.id));
  const merged = {
    listings: [...profile.listings, ...guest.listings.filter(item => !ownIds.has(item.id))],
    threads: [...profile.threads, ...guest.threads.filter(item => !threadIds.has(item.id))],
    saved: [...new Set([...profile.saved, ...guest.saved])], blocked: [...new Set([...profile.blocked, ...guest.blocked])],
  };
  const photos = merged.listings.reduce((total, item) => total + Object.values(item.photos).reduce((sum, uri) => sum + (uri?.length ?? 0), 0), 0);
  if (merged.listings.length > 30 || merged.threads.length > 60 || merged.saved.length > 200 || merged.blocked.length > 100 || photos > 1200000)
    throw new MarketCapacityError("The combined marketplace collection exceeds local storage limits. Nothing was copied. Free space in either collection and try again.");
  return readMarket(merged);
}

