import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View, AppState, StyleSheet } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, MeButton } from "../../components/food/Controls";
import { FilterButton } from "../../components/BrowseControls";
import { LocationSearchField } from "../../components/discovery/LocationSearchField";
import { LocationFeedback } from "../../components/discovery/LocationFeedback";
import { CatalogueVenueCard } from "../../components/discovery/CatalogueVenueCard";
import { MixedKitchenList } from "../../components/discovery/MixedKitchenList";
import { useMinuteClock } from "../../components/food/Timers";
import { useDiscovery } from "../../state/Discovery";
import { useDiscoveryInput } from "../../hooks/useDiscoveryInput";
import { useNearbyLocation } from "../../hooks/useNearbyLocation";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { activeFilterCount } from "../../utils/catalog";
import { sameSearchContext } from "../../utils/discovery-search";
import { usePlaceReviewSummaries } from "../../hooks/usePlaceReviewSummaries";
import { useReactions } from "../../hooks/useReactions";
import { useMixedKitchenCount } from "../../hooks/useMixedKitchenCount";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { LinkRow } from "../../components/LinkRow";
import { discoveryRadii } from "../../config/discovery";

const kitchens = [{ id: "veg", label: "Veg Kitchen" }, { id: "mixed", label: "Mixed Kitchen" }] as const;

export function ExploreScreen() {
  const { discoveryScope, search, setSearch, filters, ready, readable } = useFood();
  const { theme, draft } = usePreferences(), discovery = useDiscovery();
  const { input, locationExpired, privateMissing, privateKind, point, areaLabel, choose, searchPlaces } = useDiscoveryInput(useMinuteClock());
  const nearby = useNearbyLocation(), { ensure } = discovery;
  const eligible = ready && !privateMissing && !locationExpired;
  // Find it nearby (the game's bridges, GAME_PLAN §11): /?q=laksa runs the same search as typing it, once.
  const { q } = useLocalSearchParams<{ q?: string }>();
  useEffect(() => {
    if (typeof q !== "string" || !ready || !readable) return;
    router.setParams({ q: undefined });
    const term = q.trim().slice(0, 80);
    if (term) searchPlaces(term);
  }, [q, ready, readable]); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => {
    const refresh = () => { if (eligible && AppState.currentState !== "background" && AppState.currentState !== "inactive") ensure(input); };
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => subscription.remove();
  }, [eligible, ensure, input]));
  const accepted = eligible && !!discovery.accepted && sameSearchContext(discovery.accepted, input);
  const currentRequest = !!discovery.requested && sameSearchContext(discovery.requested, input);
  const venues = accepted ? discovery.venues : [], count = activeFilterCount(filters, draft.diet), total = discovery.catalogue?.total ?? 0;
  // A short Veg Kitchen list points to Mixed Kitchen places for the same search; Saved already lists both kinds.
  const mixedCount = useMixedKitchenCount(input, accepted && !discovery.mixed && !input.savedIds && total < 5);
  const wider = point ? discoveryRadii.find(value => value > input.radius) : undefined;
  const reviews = usePlaceReviewSummaries(venues.map(venue => venue.id), accepted);
  useReactions("place", accepted ? venues.map(venue => venue.id) : []);
  return <Screen back={false} compact>
    <View style={[common.row, { gap: 8, zIndex: 50, alignItems: "flex-start" }]}><View style={common.flex}>
      <LocationSearchField key={discoveryScope} value={search} disabled={!readable} onChange={setSearch} onChoose={choose}
        onSearch={searchPlaces} suggestionsInFlow trailing={<FilterButton label="Filters" count={count} onPress={() => router.push("/filters")} />} /></View>
      <IconButton label="Search By My Location" icon="locate-outline" disabled={!readable} loading={nearby.busy}
        selected={!!input.origin} onPress={() => void nearby.locate()} />
      <MeButton /></View>
    <View style={common.row}><SegmentedTabs label="Kitchen" options={kitchens} value={discovery.mixed ? "mixed" : "veg"}
      onChange={id => discovery.setMixed(id === "mixed")} /></View>
    <View testID="explore-search-context" style={s.context}>
    {!!point && !privateMissing && <View testID="explore-location-label" style={[s.locationLabel, { backgroundColor: theme.accentSoft }]}>
      <Icon name="location-outline" size={14} color={theme.foreground} />
      <T variant="caption" style={{ flexShrink: 1 }}><T variant="caption" style={common.bold}>{areaLabel}</T>
        <T variant="caption">{" · " + input.radius / 1000 + " km"}</T></T>
    </View>}
    {accepted && <View testID="explore-places-count" style={[s.countLabel, { backgroundColor: theme.accentSoft }]}>
      <Icon name="storefront-outline" size={14} color={theme.foreground} />
      <T variant="caption" accessibilityLiveRegion="polite"><T variant="caption" style={common.bold}>{discovery.catalogue?.total ?? 0}</T>{(discovery.catalogue?.total ?? 0) === 1 ? " place" : " places"}</T>
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
    {discovery.mixed ? <MixedKitchenList venues={venues} />
      : venues.map(venue => <CatalogueVenueCard key={venue.id} venue={venue} review={reviews.data?.items.find(item => item.id === venue.id)} />)}
    {accepted && !!venues.length && <View style={common.row}><T variant="caption" muted style={common.flex}>{venues.length} of {discovery.catalogue?.total} published places</T>
      <IconButton label="Refresh Places" icon="refresh-outline" loading={discovery.busy} onPress={() => void discovery.load(input, true)} /></View>}
    {accepted && discovery.capped && <Button label="Load More Places" variant="secondary" loading={discovery.busy} onPress={discovery.loadMore} />}
    {accepted && !discovery.busy && !venues.length && discovery.mixed && <View style={common.stack}>
      <T variant="subtitle" accessibilityRole="header">No Mixed Kitchen Places Here</T>
      {!!wider && <Button label="Widen Area" variant="secondary" onPress={() => { void discovery.setRadius(wider); }} />}
      <Button label="Edit Filters" variant="secondary" onPress={() => router.push("/filters")} /></View>}
    {accepted && !discovery.busy && !venues.length && !discovery.mixed && <View style={common.stack}>
      <T variant="subtitle" accessibilityRole="header">No Published Places Match This Search</T>
      <T muted>Try a wider distance, another location or fewer filters.</T>
      <Button label="Edit Filters" variant="secondary" onPress={() => router.push("/filters")} /></View>}
    {!!mixedCount && <LinkRow label={"Mixed Kitchen nearby · " + mixedCount + (mixedCount === 1 ? " place" : " places")}
      icon="arrow-forward" hint="Shows the Mixed Kitchen list" onPress={() => discovery.setMixed(true)} />}
    {accepted && !!discovery.catalogue?.locationGaps && <T variant="caption" muted>Some published places have unconfirmed map locations and are omitted from nearby results.</T>}
  </Screen>;
}

const s = StyleSheet.create({
  context: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  countLabel: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  locationLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    flexShrink: 1, paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, borderRadius: 10 },
});
