import { useMemo } from "react";
import { useFood } from "../state/Food";
import { useDiscovery } from "../state/Discovery";
import { usePreferences } from "../state/Preferences";
import type { LocationSuggestion } from "../types/location-search";
import { originIsFresh } from "../utils/discovery-search";
import { defaultPrivatePlace, privateOrigin, privatePlaceKind } from "../utils/private-places";
import { discoveryDiet, discoveryDiets, selectedCuisines, selectedPrices, withLocationMode } from "../utils/discovery-filters";

export function useDiscoveryInput(now: number) {
  const { doc, filters, setFilters, followDefault, setSearch } = useFood();
  const discovery = useDiscovery(), { draft } = usePreferences();
  const privateKind = filters.home ? "home" : filters.work ? "work" : undefined;
  // The default location drives Explore unless the user typed a search, chose a place, used GPS, picked Near Home/Work
  // or explicitly chose all of Singapore. A "Current search" left over from an earlier session also falls back to it.
  const singaporeChosen = doc.discoverySettings.locationModeChosen === true && !filters.near && !privateKind;
  const automatic = !singaporeChosen && !privateKind && !discovery.query && !discovery.selection && !discovery.location
    ? defaultPrivatePlace(doc.privatePlaces) : undefined;
  const privatePlace = privateKind ? privateOrigin(doc.privatePlaces, privateKind) : automatic;
  const privateMissing = !!privateKind && !privatePlace;
  const selection = filters.near && !privateKind ? discovery.selection : null;
  const locationExpired = filters.near && !privateKind && !selection && !!discovery.location && !originIsFresh(discovery.location, Math.max(now, discovery.location.capturedAt));
  const origin = filters.near && !privateKind && !selection && !locationExpired ? discovery.location ?? undefined : undefined;
  const center = useMemo(() => privatePlace?.point ?? (selection?.kind === "address"
    ? { latitude: selection.latitude, longitude: selection.longitude } : undefined), [privatePlace?.point, selection]);
  const area = center || origin ? "Singapore" : selection?.name ?? "Singapore";
  const vegan = discoveryDiet(filters, draft.diet) === "Vegan", radius = discovery.radius, query = discovery.query, alliumFree = filters.noAlliums;
  const cuisine = filters.cuisine, priceLevel = filters.priceLevel ?? undefined;
  const dietKey = JSON.stringify(discoveryDiets(filters, draft.diet)), cuisineKey = JSON.stringify(selectedCuisines(filters)), priceKey = JSON.stringify(selectedPrices(filters));
  const choices = useMemo(() => ({ diets: JSON.parse(dietKey), cuisines: JSON.parse(cuisineKey), priceLevels: JSON.parse(priceKey) }), [dietKey, cuisineKey, priceKey]);
  const savedKey = filters.savedOnly ? JSON.stringify(doc.saves.filter(item => item.kind === "place").map(item => item.id).sort()) : "";
  const savedIds = useMemo(() => savedKey ? JSON.parse(savedKey) as string[] : undefined, [savedKey]);
  // Veg options places stay out of Explore until the member opts in; the flag is sent only when on.
  const includeOptions = filters.includeOptions ? true : undefined;
  const input = useMemo(() => ({ area, query, vegan, alliumFree, cuisine, priceLevel, ...choices, origin, center, radius, savedIds, includeOptions }),
    [area, query, vegan, alliumFree, cuisine, priceLevel, choices, origin, center, radius, savedIds, includeOptions]);
  const choose = (suggestion: LocationSuggestion) => {
    // Re-selecting the accepted location must not clear results when the search
    // input is unchanged: the focus effect would have no new input to reload.
    if (selection?.id === suggestion.id && !discovery.query) {
      setSearch(suggestion.name); return;
    }
    discovery.setSelection(suggestion); discovery.setLocation(null); discovery.clear();
    setSearch(suggestion.name); setFilters(withLocationMode(filters, "selected"));
  };
  const searchPlaces = (value: string) => {
    discovery.setSelection(null); discovery.setLocation(null); discovery.clear();
    setSearch(value.trim()); discovery.setQuery(value.trim());
    // Clearing the search returns to the default location rather than locking Explore to all of Singapore.
    if (value.trim()) setFilters(withLocationMode(filters, "singapore")); else void followDefault();
  };
  const automaticKind = automatic ? privatePlaceKind(automatic) : undefined;
  const areaLabel = privateKind ? privateKind === "home" ? "Near Home" : "Near Work"
    : automaticKind ? automaticKind === "home" ? "Near Home" : automaticKind === "work" ? "Near Work" : "Near default location"
    : selection?.name ?? (origin ? "Near me" : area);
  return { input, locationExpired, privateMissing,
    privateKind: privateKind ?? (automaticKind === "home" || automaticKind === "work" ? automaticKind : undefined),
    followingCustom: automaticKind === "custom", point: center ?? origin, areaLabel, choose, searchPlaces };
}
