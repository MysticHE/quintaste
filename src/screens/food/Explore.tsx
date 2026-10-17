import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View, AppState, StyleSheet } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { LocationSearchField } from "../../components/discovery/LocationSearchField";
import { LocationFeedback } from "../../components/discovery/LocationFeedback";
import { CatalogueVenueCard } from "../../components/discovery/CatalogueVenueCard";
import { useMinuteClock } from "../../components/food/Timers";
import { useDiscovery } from "../../state/Discovery";
import { useDiscoveryInput } from "../../hooks/useDiscoveryInput";
import { useNearbyLocation } from "../../hooks/useNearbyLocation";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { activeFilterCount } from "../../utils/catalog";
import { sameSearchContext } from "../../utils/discovery-search";
import { usePlaceReviewSummaries } from "../../hooks/usePlaceReviewSummaries";

export function ExploreScreen() {
  const { discoveryScope, search, setSearch, filters, ready, readable } = useFood();
  const { theme, draft } = usePreferences(), discovery = useDiscovery();
  const { input, locationExpired, privateMissing, privateKind, point, areaLabel, choose, searchPlaces } = useDiscoveryInput(useMinuteClock());
  const nearby = useNearbyLocation(), { ensure } = discovery;
  const eligible = ready && !privateMissing && !locationExpired;
  useFocusEffect(useCallback(() => {
    const refresh = () => { if (eligible && AppState.currentState !== "background" && AppState.currentState !== "inactive") ensure(input); };
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => subscription.remove();
  }, [eligible, ensure, input]));
  const accepted = eligible && !!discovery.accepted && sameSearchContext(discovery.accepted, input);
  const currentRequest = !!discovery.requested && sameSearchContext(discovery.requested, input);
  const venues = accepted ? discovery.venues : [], count = activeFilterCount(filters, draft.diet);
  const reviews = usePlaceReviewSummaries(venues.map(venue => venue.id), accepted);
  return <Screen back={false} compact contentStyle={{ paddingHorizontal: 4 }}>
    <View style={[common.row, { gap: 6, zIndex: 50, alignItems: "flex-start" }]}><View style={common.flex}>
      <LocationSearchField key={discoveryScope} value={search} disabled={!readable} onChange={setSearch} onChoose={choose}
        onSearch={searchPlaces} suggestionsInFlow /></View>
      <IconButton label={count ? "Filters, " + count + " active" : "Filters"} icon="options-outline" badge={count > 0 ? count : undefined}
        selected={count > 0} onPress={() => router.push("/filters")} />
      <IconButton label="Search By My Location" icon="locate-outline" disabled={!readable} loading={nearby.busy}
        selected={!!input.origin} onPress={() => void nearby.locate()} /></View>
    <View testID="explore-search-context" style={s.context}>
    {!!point && !privateMissing && <View testID="explore-location-label" style={[s.locationLabel, { backgroundColor: theme.accentSoft }]}>
      <Icon name="location-outline" size={14} color={theme.mutedForeground} />
      <T variant="caption" style={{ flexShrink: 1 }}><T variant="caption" style={common.bold}>{areaLabel}</T>
        <T variant="caption" muted>{" · " + input.radius / 1000 + " km"}</T></T>
    </View>}
    {accepted && <View testID="explore-places-count" style={[s.countLabel, { backgroundColor: theme.muted }]}>
      <Icon name="storefront-outline" size={14} color={theme.mutedForeground} />
      <T variant="caption" muted accessibilityLiveRegion="polite">{discovery.catalogue?.total ?? 0} {(discovery.catalogue?.total ?? 0) === 1 ? "place" : "places"}</T>
    </View>}
    </View>
    <LocationFeedback nearby={nearby} />
    {privateMissing && <Button label={"Add " + (privateKind === "home" ? "Home" : "Work") + " address"} variant="secondary"
      onPress={() => router.push({ pathname: "/location-place", params: { kind: privateKind } })} />}
    {locationExpired && <Button label="Update My Location" variant="link" loading={nearby.busy} onPress={() => void nearby.locate()} />}
    {!ready && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your settings" />}
    {currentRequest && discovery.busy && !venues.length && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading places" />}
    {currentRequest && !!discovery.error && <View style={common.row}><T variant="caption" accessibilityLiveRegion="polite" style={common.flex}>{discovery.error}</T>
      <IconButton label="Retry Places" icon="refresh-outline" onPress={() => { if (eligible) void discovery.load(input, true); }} /></View>}
    {accepted && discovery.cached && <T variant="caption" muted>{discovery.offline ? "Offline - saved results" : "Saved results - checking for changes"}</T>}
    {venues.map(venue => <CatalogueVenueCard key={venue.id} venue={venue} review={reviews.data?.items.find(item => item.id === venue.id)} />)}
    {accepted && !!venues.length && <View style={common.row}><T variant="caption" muted style={common.flex}>{venues.length} of {discovery.catalogue?.total} published places</T>
      <IconButton label="Refresh Places" icon="refresh-outline" loading={discovery.busy} onPress={() => void discovery.load(input, true)} /></View>}
    {accepted && discovery.capped && <Button label="Load More Places" variant="secondary" loading={discovery.busy} onPress={discovery.loadMore} />}
    {accepted && !discovery.busy && !venues.length && <View style={common.stack}>
      <T variant="subtitle" accessibilityRole="header">No Published Places Match This Search</T>
      <T muted>Try a wider distance, another location or fewer filters.</T>
      <Button label="Edit Filters" variant="secondary" onPress={() => router.push("/filters")} /></View>}
    {accepted && !!discovery.catalogue?.locationGaps && <T variant="caption" muted>Some published places have unconfirmed map locations and are omitted from nearby results.</T>}
  </Screen>;
}

const s = StyleSheet.create({
  context: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginHorizontal: 8 },
  countLabel: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  locationLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    flexShrink: 1, paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, borderRadius: 10 },
});
