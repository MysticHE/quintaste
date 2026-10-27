import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View, AppState, StyleSheet, useWindowDimensions } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { LocationFeedback } from "../../components/discovery/LocationFeedback";
import { CatalogueVenueTile, CatalogueTileSkeleton } from "../../components/discovery/CatalogueVenueTile";
import { ScreenList } from "../../components/ScreenList";
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
import { LoadingShapes, SkeletonBlock } from "../../components/Skeleton";
import { catalogueLayout } from "../../theme/layout";
import { discoveryRadii } from "../../config/discovery";
import { useT } from "../../i18n";

export function ExploreScreen() {
  const { filters, ready, readable } = useFood();
  const { theme, draft, textMultiplier } = usePreferences(), discovery = useDiscovery(), t = useT("explore"), tc = useT("common");
  const { width, fontScale } = useWindowDimensions(), [frameWidth, setFrameWidth] = useState(Math.min(width, 760));
  // Keep readable text and 48-point actions on small phones or enlarged text; wider frames fit an extra column.
  const columns = textMultiplier * fontScale >= 1.15 ? (frameWidth >= 720 ? 2 : 1) : frameWidth >= 700 ? 3 : frameWidth >= 360 ? 2 : 1;
  const cellWidth = (frameWidth - catalogueLayout.gap * (columns + 1)) / columns, searching = !!discovery.query.trim();
  const kitchens = [{ id: "veg", label: t("vegKitchen") }, { id: "mixed", label: t("mixedKitchen") }] as const;
  const { input, locationExpired, privateMissing, privateKind, point, areaLabel, searchPlaces } = useDiscoveryInput(useMinuteClock());
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
  const venues = accepted ? discovery.venues : [], count = activeFilterCount(filters, draft.diets), total = discovery.catalogue?.total ?? 0;
  // A short Veg Kitchen list points to Mixed Kitchen places for the same search; Saved already lists both kinds.
  const mixedCount = useMixedKitchenCount(input, accepted && !discovery.mixed && !input.savedIds && total < 5);
  const wider = point ? discoveryRadii.find(value => value > input.radius) : undefined;
  const reviews = usePlaceReviewSummaries(venues.map(venue => venue.id), accepted);
  useReactions("place", accepted ? venues.map(venue => venue.id) : []);
  const loading = !ready || (currentRequest && discovery.busy && !venues.length);
  const showFooter = accepted && (discovery.capped || !discovery.busy && !venues.length) || !!mixedCount;
  return <Screen back={false} compact list contentInset={catalogueLayout.gap} header={<TopBar testID="explore-toolbar" actions={<>
      <IconButton appearance="plain" label={count ? tc("filterOn", { label: t("searchAndFilters") }) : t("searchAndFilters")} icon="search-outline" disabled={!readable}
        dot={count > 0} onPress={() => router.push("/explore-search")} />
      <IconButton appearance="plain" label={t("searchByLocation")} icon="locate-outline" disabled={!readable} loading={nearby.busy}
        selected={!!input.origin} onPress={() => void nearby.locate()} /></>}>
      <TopTabs label={t("kitchenTabs")} tabs={kitchens} value={discovery.mixed ? "mixed" : "veg"} onChange={id => discovery.setMixed(id === "mixed")} />
    </TopBar>}>
    {/* Each kitchen is its own list, so switching starts at the top with the bars showing. Only cards near the screen are drawn. */}
    <View testID="explore-grid" style={common.flex} onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}>
    <ScreenList key={(discovery.mixed ? "mixed" : "veg") + columns} data={venues} keyExtractor={venue => venue.id} extraData={[reviews.data, searching]}
      numColumns={columns} columnGap={columns > 1 ? catalogueLayout.gap : 0} rowGap={catalogueLayout.gap} trimEndGap
      renderItem={({ item }) => <CatalogueVenueTile venue={item} searching={searching} review={reviews.data?.items.find(review => review.id === item.id)} />}
      header={<>
        <View testID="explore-search-context" style={s.context}>
        {!!point && !privateMissing && <View testID="explore-location-label" style={[s.locationLabel, { backgroundColor: theme.accentSoft }]}>
          <Icon name="location-outline" size={14} color={theme.foreground} />
          <T variant="caption" style={{ flexShrink: 1 }}><T variant="caption" style={common.bold}>{areaLabel}</T>
            <T variant="caption">{" · " + tc("kilometres", { km: input.radius / 1000 })}</T></T>
        </View>}
        {accepted ? <View testID="explore-places-count" style={[s.countLabel, { backgroundColor: theme.accentSoft }]}>
          <Icon name="storefront-outline" size={14} color={theme.foreground} />
          <T variant="caption" accessibilityLiveRegion="polite"><T variant="caption" style={common.bold}>{discovery.catalogue?.total ?? 0}</T>{t("placeCountSuffix", { n: discovery.catalogue?.total ?? 0 })}</T>
        </View> : loading && <SkeletonBlock style={s.countShape} />}
        </View>
        <LocationFeedback nearby={nearby} />
        {privateMissing && <Button label={t(privateKind === "home" ? "addHomeAddress" : "addWorkAddress")} variant="secondary"
          onPress={() => router.push({ pathname: "/location-place", params: { kind: privateKind } })} />}
        {locationExpired && <Button label={t("updateMyLocation")} variant="link" loading={nearby.busy} onPress={() => void nearby.locate()} />}
        {loading && <LoadingShapes testID="explore-loading" label={t(ready ? "loadingPlaces" : "loadingSettings")}>
          <View style={s.loadingGrid}>{Array.from({ length: columns * 2 }, (_, index) => <View key={index} style={{ width: cellWidth }}>
            <CatalogueTileSkeleton searching={searching} /></View>)}</View>
        </LoadingShapes>}
        {currentRequest && !!discovery.error && <View style={common.row}><T variant="caption" accessibilityLiveRegion="polite" style={common.flex}>{discovery.error}</T>
          <IconButton label={t("retryPlaces")} icon="refresh-outline" onPress={() => { if (eligible) void discovery.load(input, true); }} /></View>}
      </>}
      footer={showFooter ? <>
        {accepted && discovery.capped && <Button label={t("loadMorePlaces")} variant="secondary" loading={discovery.busy} onPress={discovery.loadMore} />}
        {accepted && !discovery.busy && !venues.length && discovery.mixed && <View style={common.stack}>
          <T variant="subtitle" accessibilityRole="header">{t("noMixedHere")}</T>
          {!!wider && <Button label={t("widenArea")} variant="secondary" onPress={() => { void discovery.setRadius(wider); }} />}
          <Button label={t("editFilters")} variant="secondary" onPress={() => router.push("/explore-search")} /></View>}
        {accepted && !discovery.busy && !venues.length && !discovery.mixed && <View style={common.stack}>
          <T variant="subtitle" accessibilityRole="header">{t("noPublishedMatch")}</T>
          <T muted>{t("tryWider")}</T>
          <Button label={t("editFilters")} variant="secondary" onPress={() => router.push("/explore-search")} /></View>}
        {!!mixedCount && <LinkRow label={t("mixedNearby", { n: mixedCount })}
          icon="arrow-forward" hint={t("mixedNearbyHint")} onPress={() => discovery.setMixed(true)} />}
      </> : undefined} />
    </View>
  </Screen>;
}

const s = StyleSheet.create({
  loadingGrid: { flexDirection: "row", flexWrap: "wrap", gap: catalogueLayout.gap },
  context: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  countLabel: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  // Holds the place count's space while places load, so the cards arrive where their shapes were.
  countShape: { width: 96, height: 32, borderRadius: 10 },
  locationLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    flexShrink: 1, paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, borderRadius: 10 },
});
