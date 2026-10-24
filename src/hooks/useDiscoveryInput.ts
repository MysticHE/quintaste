import { useMemo } from "react";
import { useFood } from "../state/Food";
import { useDiscovery } from "../state/Discovery";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";
import type { LocationSuggestion } from "../types/location-search";
import type { PlaceLabel } from "../types/discovery";
import { originIsFresh } from "../utils/discovery-search";
import { defaultPrivatePlace, privateOrigin, privatePlaceKind } from "../utils/private-places";
import { discoveryLabels, selectedCuisines, selectedPrices, withLocationMode } from "../utils/discovery-filters";

export function useDiscoveryInput(now: number) {
  const { doc, filters, setFilters, followDefault, setSearch } = useFood();
  const discovery = useDiscovery(), { draft } = usePreferences(), t = useT("explore");
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
  const radius = discovery.radius, query = discovery.query, cuisine = filters.cuisine, priceLevel = filters.priceLevel ?? undefined;
  const labelKey = JSON.stringify(discoveryLabels(filters, draft.diets)), cuisineKey = JSON.stringify(selectedCuisines(filters)), priceKey = JSON.stringify(selectedPrices(filters));
  // vegan/alliumFree mirror the labels for the live provider and servers from before the label change.
  const choices = useMemo(() => {
    const labels = JSON.parse(labelKey) as PlaceLabel[];
    return { labels, vegan: labels.includes("Vegan"), alliumFree: labels.includes("Vegetarian"), cuisines: JSON.parse(cuisineKey), priceLevels: JSON.parse(priceKey) };
  }, [labelKey, cuisineKey, priceKey]);
  const savedKey = filters.savedOnly ? JSON.stringify(doc.saves.filter(item => item.kind === "place").map(item => item.id).sort()) : "";
  const savedIds = useMemo(() => savedKey ? JSON.parse(savedKey) as string[] : undefined, [savedKey]);
  // Veg Kitchen sends no kitchen field; Mixed Kitchen lists only places that also serve meat or seafood.
  const kitchen = discovery.mixed ? "mixed" as const : undefined;
  const input = useMemo(() => ({ area, query, cuisine, priceLevel, ...choices, origin, center, radius, savedIds, kitchen }),
    [area, query, cuisine, priceLevel, choices, origin, center, radius, savedIds, kitchen]);
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
  const areaLabel = privateKind ? t(privateKind === "home" ? "nearHome" : "nearWork")
    : automaticKind ? t(automaticKind === "home" ? "nearHome" : automaticKind === "work" ? "nearWork" : "nearDefault")
    : selection?.name ?? (origin ? t("nearMe") : area === "Singapore" ? t("singapore") : area);
  return { input, locationExpired, privateMissing,
    privateKind: privateKind ?? (automaticKind === "home" || automaticKind === "work" ? automaticKind : undefined),
    followingCustom: automaticKind === "custom", point: center ?? origin, areaLabel, choose, searchPlaces };
}
