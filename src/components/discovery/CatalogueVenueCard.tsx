import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { useOpenStatus } from "../../hooks/useOpenStatus";
import { useDiscovery } from "../../state/Discovery";
import { matchedDish } from "../../utils/menu-display";
import { Button, Card, Icon, T, common } from "../ui";
import type { PlaceReviewSummary } from "../../types/place-reviews";
import { IconButton } from "../food/Controls";
import { ReactionColumn } from "../ReactionBar";
import { placeShareMessage } from "../../utils/place-share";
import { dishCount, isVegOptions, placeLabels, placeTileIcon } from "../../utils/venue-kitchen";
import { useLanguage, useT } from "../../i18n";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { MenuEntry } from "./MenuEntry";
import { PhotoPostCard, PostFact, PostFacts } from "./PhotoPostCard";

export function CatalogueVenueCard({ venue, more, review, edgeToEdge = false }: { venue: CatalogueVenue; more?: () => void; review?: PlaceReviewSummary; edgeToEdge?: boolean }) {
  const { isSaved, toggleSave, readable } = useFood(), { theme } = usePreferences();
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  const id = "catalogue-" + venue.id, saved = isSaved("place", id), hours = venue.hours;
  // Open or closed right now when the hours prove it, otherwise the published summary.
  const status = useOpenStatus(hours);
  const hoursSummary = status?.text || hours?.summary || t("hoursUnconfirmed");
  const price = venue.priceRange && t("priceRange", venue.priceRange), extra = venue.matchCount ? venue.matchCount - 1 : 0;
  const km = venue.distanceKm !== undefined ? tc("kilometres", { km: venue.distanceKm.toFixed(1) }) : "";
  const options = isVegOptions(venue), distance = km ? " · " + km : "";
  // A Mixed Kitchen place never reads as Vegetarian or Vegan: it is not a vegetarian kitchen. Other places show only proven labels.
  const labels = placeLabels(venue), dietText = useDietText();
  // A keyword search shows the dish that matched and carries the search into the place and its menu.
  const { query } = useDiscovery(), dish = venue.match && matchedDish(venue.match, language), search = venue.match ? query.trim() : "";
  const metadata = options ? t("mixedKitchenSpoken") + " · " + dishCount(venue.itemCount, language) + distance : [...labels.map(dietText.spoken), ...(km ? [km] : [])].join(" · ");
  return <PhotoPostCard edgeToEdge={edgeToEdge} testID="catalogue-venue" titleTestID="catalogue-card-name" photo={{ path: venue.photo?.path, thumbhash: venue.photo?.thumbhash, emptyIcon: placeTileIcon(venue) }} title={venue.name}
    label={[venue.name, dish, extra ? t("moreMatchesSpoken", { n: extra }) : "", venue.address, metadata, hoursSummary,
      venue.priceRange ? t("priceRangeSpoken", venue.priceRange) : ""].filter(Boolean).join(". ")} hint={t("cardHint")}
    onPress={() => router.push({ pathname: "/place/[id]", params: search ? { id, q: search } : { id } } as never)}
    topLeft={venue.itemCount > 0 && <MenuEntry menu={venue} compact search={search} />}
    topRight={more && <IconButton label={t("moreOptionsFor", { name: venue.name })} icon="ellipsis-horizontal" appearance="media" onPress={more} />}
    side={<ReactionColumn kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)}
      save={{ saved, busy: false, disabled: !readable, onPress: () => void toggleSave("place", id, venue.name) }} />}>
    {!!dish && <View testID="catalogue-card-dish"><PostFact icon="restaurant-outline">{extra ? dish + "  " + t("moreMatches", { n: extra }) : dish}</PostFact></View>}
    <PostFact icon="location-outline">{venue.address}</PostFact>
    <PostFacts>
      {venue.distanceKm !== undefined && <PostFact icon="navigate-outline" shrink>{tc("kilometresAway", { km: venue.distanceKm.toFixed(1) })}</PostFact>}
      {!!review?.count && <View testID="catalogue-card-rating"><PostFact icon="star" iconColor={theme.mediaRating} shrink>
        <T variant="caption" style={common.bold} color={theme.mediaForeground}>{review.rating?.toFixed(1)}</T>{t("qtReviewCount", { n: review.count })}
      </PostFact></View>}
    </PostFacts>
    {!options && labels.length > 0 && <PostFacts>{labels.map(label => <PostFact key={label} shrink leading={<DietIcon diet={label} size={14} color={theme.mediaForeground} />}>{dietText.name(label)}</PostFact>)}</PostFacts>}
    <PostFacts>
      {options && <><VegOptionsChip /><PostFact icon="book-outline" shrink>{dishCount(venue.itemCount, language)}</PostFact></>}
      <View testID="catalogue-card-hours" style={s.shrink}><PostFact shrink leading={status ? <View style={[s.dot, { backgroundColor: status.color, borderColor: theme.mediaForeground }]} />
        : <Icon name="time-outline" size={14} color={theme.mediaForeground} />}>{hoursSummary}</PostFact></View>
      {!!price && <View testID="catalogue-card-price"><PostFact icon="pricetag-outline" shrink>{price}</PostFact></View>}
    </PostFacts>
  </PhotoPostCard>;
}

/** Marks a place that is not a vegetarian kitchen, in a warm tone distinct from the vegetarian leaf. */
export function VegOptionsChip() {
  const { theme } = usePreferences(), t = useT("explore");
  return <View testID="veg-options-chip" style={[s.chip, { backgroundColor: theme.warningSoft }]}>
    <Icon name="restaurant-outline" size={13} color={theme.warning} /><T variant="caption" color={theme.warning} style={common.bold}>{t("mixedKitchen")}</T>
  </View>;
}

/** Saved screens batch ratings in one request and pass this place's summary in. */
export function SavedCatalogueVenue({ id, more, review }: { id: string; more: () => void; review?: PlaceReviewSummary }) {
  const { venue, busy, error, retry } = useCatalogueVenue(id);
  const { toggleSave } = useFood(), { theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  if (venue) return <CatalogueVenueCard venue={venue} more={more} review={review} />;
  if (busy) return <Card><ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingSavedPlace")} /></Card>;
  return <Card style={common.stack}><T variant="subtitle">{t("savedPlaceTitle")}</T><T muted accessibilityLiveRegion="polite">{error || t("connectToLoadMenu")}</T>
    <Button label={tc("retry")} variant="secondary" onPress={retry} />
    <Button label={t("placeDetailsButton")} onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + id } } as never)} />
    <Button label={t("removeSavedPlace")} variant="link" onPress={() => void toggleSave("place", "catalogue-" + id)} />
    <Button label={t("moreOptions")} variant="link" onPress={more} /></Card>;
}
const s = StyleSheet.create({
  shrink: { flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginHorizontal: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
});
