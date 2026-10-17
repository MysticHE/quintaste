import type { IngredientInfo } from "../config/market-ingredients";
export const marketCategories = ["Pantry", "Grains", "Snacks", "Seasonings", "Drinks"] as const;
export type MarketCategory = typeof marketCategories[number];
export type ListingStatus = "draft" | "active" | "paused" | "sold";
export type PhotoSlot = "item" | "detail" | "label" | "seal" | "date";
export type MarketPhotos = Partial<Record<PhotoSlot, string>>;
export type MarketListing = {
  id: string; sellerId: string; name: string; category: MarketCategory;
  priceCents: number; quantity: number; area: string; expires: string;
  ingredients: string; ingredientInfo?: IngredientInfo; sealed: boolean; photos: MarketPhotos;
  status: ListingStatus; updatedAt: number; art: "pouch" | "jar" | "box" | "bottle";
};
export type ExchangeStatus = "chat" | "offered" | "reserved" | "scheduled" | "completed" | "declined" | "cancelled" | "no-show" | "disputed";
export type MarketMessage = { id: string; who: "you" | "other"; text: string; at: number };
export type MarketThread = {
  id: string; listingId: string; title: string; sellerId: string; selling: boolean;
  status: ExchangeStatus; quantity: number; offerCents: number; meetup: string;
  messages: MarketMessage[]; updatedAt: number; rating: number; review: string;
};
export type MarketDocument = {
  listings: MarketListing[]; saved: string[]; threads: MarketThread[]; blocked: string[];
};
export const emptyMarket = (): MarketDocument => ({ listings: [], saved: [], threads: [], blocked: [] });

