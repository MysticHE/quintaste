import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T } from "../../components/ui";
import { FilterSection } from "../../components/BrowseControls";
import { goBack } from "../../utils/navigation";
import { Chip, Chips } from "../../components/food/Controls";
import { DiscoveryPlaceFilters } from "../../components/discovery/DiscoveryPlaceFilters";
import { DiscoveryFilterOptions } from "../../components/discovery/DiscoveryFilterOptions";
import { useFood } from "../../state/Food";
import { useDiscovery } from "../../state/Discovery";
import { usePreferences } from "../../state/Preferences";
import { useDiscoveryInput } from "../../hooks/useDiscoveryInput";
import { useMinuteClock } from "../../components/food/Timers";
import { privateOrigin } from "../../utils/private-places";
import { discoveryLabels, locationMode, withLocationMode, type LocationMode } from "../../utils/discovery-filters";
import { sameSearchContext } from "../../utils/discovery-search";
import { discoveryRadii } from "../../config/discovery";
import { useT } from "../../i18n";

export function FiltersScreen() {
  const { filters, setFilters, doc, discoveryQuery, setSearch, ready, readable } = useFood();
  const { radius, setRadius, selection, location, requested, busy, error, ensure, load } = useDiscovery();
  const { draft: preferences, theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  const { input, locationExpired, privateMissing, privateKind, followingCustom, point } = useDiscoveryInput(useMinuteClock());
  const home = !!privateOrigin(doc.privatePlaces, "home"), work = !!privateOrigin(doc.privatePlaces, "work");
  useFocusEffect(useCallback(() => {
    if (ready && !locationExpired && !privateMissing) ensure(input);
  }, [ready, locationExpired, privateMissing, ensure, input]));
  const eligible = ready && !locationExpired && !privateMissing;
  const currentRequest = !!requested && sameSearchContext(requested, input);
  const selectLocation = (mode: LocationMode) => {
    if (mode !== locationMode(filters)) {
      setSearch(mode === "selected" && selection ? selection.name : discoveryQuery);
      void setFilters(current => withLocationMode(current, mode));
    }
    else void setFilters({ ...withLocationMode(filters, mode) });
    if (mode === "home" && !home || mode === "work" && !work)
      router.push({ pathname: "/location-place", params: { kind: mode } });
  };
  return <Screen title={t("placeFilters")} compact
    headerAction={<Button label={tc("done")} variant="link" onPress={() => goBack("/")} />}>
    <DiscoveryFilterOptions filters={privateKind ? { ...filters, home: privateKind === "home", work: privateKind === "work", near: false } : filters} change={change => { void setFilters(change); }}
      labels={discoveryLabels(filters, preferences.diets)} disabled={!readable}
      selected={!!selection || !!location} followingCustom={followingCustom} selectLocation={selectLocation} />
    {!!point && <FilterSection title={t("distance")} icon="navigate-outline">
      <Chips label={t("distance")}>{discoveryRadii.map(value => <Chip compact key={value} label={tc("kilometres", { km: value / 1000 })} role="radio"
        selected={radius === value} disabled={!readable} onPress={() => { void setRadius(value); }} />)}</Chips>
    </FilterSection>}
    <DiscoveryPlaceFilters filters={filters} change={change => { void setFilters(change); }} disabled={!readable} />
    <Button label={t("resetFilters")} variant="link" disabled={!readable} onPress={() => { void setFilters(current => ({ ...current, labels: [], savedOnly: false })); }} />
    {eligible && currentRequest && busy && <ActivityIndicator color={theme.accent} accessibilityLabel={t("updatingPlaces")} />}
    {eligible && currentRequest && !!error && <><T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>
      <Button label={t("retryPlaces")} variant="link" onPress={() => { void load(input, true); }} /></>}
  </Screen>;
}
