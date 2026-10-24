import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
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

export function CatalogueVenueCard({ venue, more, review }: { venue: CatalogueVenue; more?: () => void; review?: PlaceReviewSummary }) {
  const { isSaved, toggleSave, readable } = useFood(), { theme } = usePreferences();
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  const id = "catalogue-" + venue.id, saved = isSaved("place", id), hours = venue.hours;
  const hoursSummary = hours?.summary || t("hoursUnconfirmed");
  const km = venue.distanceKm !== undefined ? tc("kilometres", { km: venue.distanceKm.toFixed(1) }) : "";
  const options = isVegOptions(venue), distance = km ? " · " + km : "";
  // A Mixed Kitchen place never reads as Vegetarian or Vegan: it is not a vegetarian kitchen. Other places show only proven labels.
  const labels = placeLabels(venue), dietText = useDietText();
  const metadata = options ? t("mixedKitchenSpoken") + " · " + dishCount(venue.itemCount, language) + distance : [...labels.map(dietText.line), ...(km ? [km] : [])].join(" · ");
  return <PhotoPostCard testID="catalogue-venue" titleTestID="catalogue-card-name" photo={{ path: venue.photo?.path, emptyIcon: placeTileIcon(venue) }} title={venue.name}
    label={[venue.name, venue.address, metadata, hoursSummary].filter(Boolean).join(". ")} hint={t("cardHint")}
    onPress={() => router.push({ pathname: "/place/[id]", params: { id } } as never)}
    topLeft={venue.itemCount > 0 && <MenuEntry menu={venue} compact />}
    topRight={more && <IconButton label={t("moreOptionsFor", { name: venue.name })} icon="ellipsis-horizontal" appearance="media" onPress={more} />}
    side={<ReactionColumn kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)}
      save={{ saved, busy: false, disabled: !readable, onPress: () => void toggleSave("place", id, venue.name) }} />}>
    <PostFact icon="location-outline">{venue.address}</PostFact>
    <PostFacts>
      {venue.distanceKm !== undefined && <PostFact icon="navigate-outline" shrink>{tc("kilometresAway", { km: venue.distanceKm.toFixed(1) })}</PostFact>}
      {!!review?.count && <View testID="catalogue-card-rating"><PostFact icon="star" iconColor={theme.mediaRating} shrink>
        <T variant="caption" style={common.bold} color={theme.mediaForeground}>{review.rating?.toFixed(1)}</T>{t("qtReviewCount", { n: review.count })}
      </PostFact></View>}
    </PostFacts>
    {!options && labels.map(label => <PostFact key={label} leading={<DietIcon diet={label} size={14} color={theme.mediaForeground} />}>{dietText.line(label)}</PostFact>)}
    <PostFacts>
      {options && <><VegOptionsChip /><PostFact icon="book-outline" shrink>{dishCount(venue.itemCount, language)}</PostFact></>}
      <PostFact icon="time-outline" shrink>{hoursSummary}</PostFact>
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
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
});
