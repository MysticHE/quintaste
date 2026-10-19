import type { SearchPoint } from "./location-search";

export type PriceLevel = 1 | 2 | 3 | 4;
export type SearchBounds = { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } };
export type MapPlace = { placeId: string; name: string; latitude: number; longitude: number };

export type SearchOrigin = { latitude: number; longitude: number; capturedAt: number; accuracy: number | null };
export type PhotoAuthor = { name: string; uri?: string; photoUri?: string };
export type LivePhoto = { url: string; authors: PhotoAuthor[]; sourceUri?: string };
export type LiveReview = { author: string; authorUri?: string; authorPhotoUri?: string; rating?: number; text: string; publishedAt?: string; uri?: string };
export type LivePlace = MapPlace & {
  address: string; opening: "open" | "closed" | "unknown" | "permanently-closed";
  fetchedAt: number; attributions: { provider: string }[];
  hours: string[]; nextOpen?: string; nextClose?: string;
  rating?: number; reviewCount?: number; photos: LivePhoto[]; reviews?: LiveReview[];
  phone?: string; website?: string; priceLevel?: PriceLevel;
};
export type DiscoverySearch = { area: string; query: string; vegan: boolean; diets?: ("Vegetarian" | "Vegan")[]; alliumFree?: boolean; cuisine?: string; cuisines?: string[]; priceLevel?: PriceLevel; priceLevels?: PriceLevel[]; origin?: SearchOrigin; center?: SearchPoint; bounds?: SearchBounds; radius: number; savedIds?: string[]; includeOptions?: boolean };
