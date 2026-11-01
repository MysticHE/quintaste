export type SearchPoint = { latitude: number; longitude: number };
type SuggestionLabel = { id: string; name: string; address: string };
export type LocationSuggestion = SuggestionLabel & (
  | { kind: "area"; areaId: string }
  | { kind: "address"; postalCode?: string; latitude: number; longitude: number; /** The line under the name: the address without the name in it. */ street?: string }
);
export type LocationSearchResult = { suggestions: LocationSuggestion[]; warning?: string };
/** A dish name offered above the locations in Explore's search box; choosing it searches for places serving it. */
export type DishSuggestion = SuggestionLabel & { kind: "dish" };
/** A vegetarian or vegan place whose name matches what is typed; `id` is its catalogue id and choosing it opens the place. */
export type PlaceSuggestion = SuggestionLabel & { kind: "place" };
export type SearchSuggestion = LocationSuggestion | DishSuggestion | PlaceSuggestion;
