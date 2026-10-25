export type SearchPoint = { latitude: number; longitude: number };
type SuggestionLabel = { id: string; name: string; address: string };
export type LocationSuggestion = SuggestionLabel & (
  | { kind: "area"; areaId: string }
  | { kind: "address"; postalCode?: string; latitude: number; longitude: number }
);
export type LocationSearchResult = { suggestions: LocationSuggestion[]; warning?: string };
/** A dish name offered above the locations in Explore's search box; choosing it searches for places serving it. */
export type DishSuggestion = SuggestionLabel & { kind: "dish" };
export type SearchSuggestion = LocationSuggestion | DishSuggestion;
