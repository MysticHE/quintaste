import type { SearchPoint } from "./location-search";
import type { DietLabel } from "../config/diet-labels";

export type PriceLevel = 1 | 2 | 3 | 4;
/** The diet labels a place can prove: Vegan (venue declares vegan) and Vegetarian (venue states no five pungent). Never Plant-Based. */
export type PlaceLabel = Exclude<DietLabel, "Plant-Based">;
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
/** `labels` are the proven labels every place must carry; `vegan`/`alliumFree` mirror them for the live provider and older servers. */
export type DiscoverySearch = { area: string; query: string; vegan: boolean; labels?: PlaceLabel[]; alliumFree?: boolean; cuisine?: string; cuisines?: string[]; priceLevel?: PriceLevel; priceLevels?: PriceLevel[]; origin?: SearchOrigin; center?: SearchPoint; bounds?: SearchBounds; radius: number; savedIds?: string[]; includeOptions?: boolean; kitchen?: "mixed"; openNow?: boolean; sort?: PlaceSort };
/** Explore result order besides the default (nearest, or best match for a keyword): top rated, most liked, recently updated menus. */
export type PlaceSort = "rated" | "liked" | "updated";
