export type SearchPoint = { latitude: number; longitude: number };
type SuggestionLabel = { id: string; name: string; address: string };
export type LocationSuggestion = SuggestionLabel & (
  | { kind: "area"; areaId: string }
  | { kind: "address"; postalCode?: string; latitude: number; longitude: number }
);
export type LocationSearchResult = { suggestions: LocationSuggestion[]; warning?: string };
