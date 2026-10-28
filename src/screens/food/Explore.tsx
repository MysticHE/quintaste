import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { View, AppState, StyleSheet } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { LocationFeedback } from "../../components/discovery/LocationFeedback";
import { CatalogueVenueCard } from "../../components/discovery/CatalogueVenueCard";
import { CatalogueVenueRow } from "../../components/discovery/MixedKitchenList";
import { FeedGap, ScreenList } from "../../components/ScreenList";
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
import { TopBar, TopTabs } from "../../components/TopTabs";
import { LinkRow } from "../../components/LinkRow";
import { LoadingShapes, PostCardSkeleton, RowSkeleton } from "../../components/Skeleton";
import { discoveryRadii } from "../../config/discovery";
import { useT } from "../../i18n";
import { OpenClock } from "../../hooks/useOpenStatus";
import { openState } from "../../utils/catalogue-hours";

export function ExploreScreen() {
  const { filters, setFilters, ready, readable } = useFood();
  const { draft } = usePreferences(), discovery = useDiscovery(), t = useT("explore"), tc = useT("common");
  const kitchens = [{ id: "veg", label: t("vegKitchen") }, { id: "mixed", label: t("mixedKitchen") }] as const;
  const now = useMinuteClock(), { input, locationExpired, privateMissing, privateKind, point, searchPlaces } = useDiscoveryInput(now);
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
  // Open now results can be a few minutes old: a place that has closed since then leaves the list rather than showing as closed.
  const venues = !accepted ? [] : filters.openNow ? discovery.venues.filter(venue => openState(venue.hours, now).state === "open") : discovery.venues;
  const count = activeFilterCount(filters, draft.diets), total = discovery.catalogue?.total ?? 0;
  // A short Veg Kitchen list points to Mixed Kitchen places for the same search; Saved already lists both kinds.
  const mixedCount = useMixedKitchenCount(input, accepted && !discovery.mixed && !input.savedIds && total < 5);
  const wider = point ? discoveryRadii.find(value => value > input.radius) : undefined;
  const reviews = usePlaceReviewSummaries(venues.map(venue => venue.id), accepted);
  useReactions("place", accepted ? venues.map(venue => venue.id) : []);
  const loading = !ready || (currentRequest && discovery.busy && !venues.length);
  const showHeader = privateMissing || locationExpired || loading || currentRequest && !!discovery.error;
  const showFooter = accepted && (discovery.capped || !discovery.busy && !venues.length) || !!mixedCount;
  return <Screen back={false} compact list contentInset={0} header={<TopBar testID="explore-toolbar" actions={<>
      <IconButton appearance="plain" label={count ? tc("filterOn", { label: t("searchAndFilters") }) : t("searchAndFilters")} icon="search-outline" disabled={!readable}
        dot={count > 0} onPress={() => router.push("/explore-search")} />
      <IconButton appearance="plain" label={t("searchByLocation")} icon="locate-outline" disabled={!readable} loading={nearby.busy}
        selected={!!input.origin} onPress={() => void nearby.locate()} /></>}>
      <TopTabs label={t("kitchenTabs")} tabs={kitchens} value={discovery.mixed ? "mixed" : "veg"} onChange={id => discovery.setMixed(id === "mixed")} />
    </TopBar>}>
    {/* Each kitchen is its own list, so switching starts at the top with the bars showing. Only cards near the screen are drawn. */}
    <LocationFeedback nearby={nearby} />
    <View testID="explore-feed" style={common.flex}><OpenClock now={now}>
    <ScreenList key={discovery.mixed ? "mixed" : "veg"} data={venues} keyExtractor={venue => venue.id} extraData={reviews.data} feedGap
      // Rows and photo cards recycle in their own pools, so a scroll never rebuilds a row's cell as a card.
      getItemType={item => discovery.mixed || !item.photo?.path ? "row" : "card"}
      renderItem={({ item }) => discovery.mixed || !item.photo?.path
        ? <CatalogueVenueRow venue={item} review={reviews.data?.items.find(review => review.id === item.id)} />
        : <CatalogueVenueCard edgeToEdge venue={item} review={reviews.data?.items.find(review => review.id === item.id)} />}
      header={showHeader ? <>
        {privateMissing && <View style={s.feedback}><Button label={t(privateKind === "home" ? "addHomeAddress" : "addWorkAddress")} variant="secondary"
          onPress={() => router.push({ pathname: "/location-place", params: { kind: privateKind } })} /></View>}
        {locationExpired && <View style={s.feedback}><Button label={t("updateMyLocation")} variant="link" loading={nearby.busy} onPress={() => void nearby.locate()} /></View>}
        {/* Cards (or Mixed Kitchen rows) the size of the results, so the list does not grow from a spinner when places arrive. */}
        {loading && <LoadingShapes testID="explore-loading" label={t(ready ? "loadingPlaces" : "loadingSettings")}>
          <View>{[0, 1, 2].map(index => <View key={index}>
            {index > 0 && <FeedGap />}
            {discovery.mixed ? <View style={s.feedback}><RowSkeleton leading={false} /></View> : <PostCardSkeleton edgeToEdge />}
          </View>)}</View>
        </LoadingShapes>}
        {currentRequest && !!discovery.error && <View style={[common.row, s.feedback]}><T variant="caption" accessibilityLiveRegion="polite" style={common.flex}>{discovery.error}</T>
          <IconButton label={t("retryPlaces")} icon="refresh-outline" onPress={() => { if (eligible) void discovery.load(input, true); }} /></View>}
      </> : undefined}
      footer={showFooter ? <View style={[common.stack, s.feedback]}>
        {accepted && discovery.capped && <Button label={t("loadMorePlaces")} variant="secondary" loading={discovery.busy} onPress={discovery.loadMore} />}
        {/* Open now hides places whose hours are unknown too, so the way out is one tap rather than a trip to filters. */}
        {accepted && !discovery.busy && !venues.length && filters.openNow && <View testID="explore-none-open" style={common.stack}>
          <T variant="subtitle" accessibilityRole="header">{t("noneOpenNow")}</T>
          <Button label={t("showClosedToo")} variant="secondary" onPress={() => { void setFilters({ openNow: false }); }} /></View>}
        {accepted && !discovery.busy && !venues.length && !filters.openNow && discovery.mixed && <View style={common.stack}>
          <T variant="subtitle" accessibilityRole="header">{t("noMixedHere")}</T>
          {!!wider && <Button label={t("widenArea")} variant="secondary" onPress={() => { void discovery.setRadius(wider); }} />}
          <Button label={t("editFilters")} variant="secondary" onPress={() => router.push("/explore-search")} /></View>}
        {accepted && !discovery.busy && !venues.length && !filters.openNow && !discovery.mixed && <View style={common.stack}>
          <T variant="subtitle" accessibilityRole="header">{t("noPublishedMatch")}</T>
          <T muted>{t("tryWider")}</T>
          <Button label={t("editFilters")} variant="secondary" onPress={() => router.push("/explore-search")} /></View>}
        {!!mixedCount && <LinkRow label={t("mixedNearby", { n: mixedCount })}
          icon="arrow-forward" hint={t("mixedNearbyHint")} onPress={() => discovery.setMixed(true)} />}
      </View> : undefined} />
    </OpenClock></View>
  </Screen>;
}

const s = StyleSheet.create({
  feedback: { paddingHorizontal: 16 },
});
