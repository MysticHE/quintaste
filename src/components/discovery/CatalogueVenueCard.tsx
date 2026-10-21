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
import { dishCount, isVegOptions, mixedKitchenLabel, mixedKitchenSpoken, placeLabels, placeTileIcon } from "../../utils/venue-kitchen";
import { DietIcon } from "../food/DietIcon";
import { MenuEntry } from "./MenuEntry";
import { PhotoPostCard, PostFact, PostFacts } from "./PhotoPostCard";

export function CatalogueVenueCard({ venue, more, review }: { venue: CatalogueVenue; more?: () => void; review?: PlaceReviewSummary }) {
  const { isSaved, toggleSave, readable } = useFood(), { theme } = usePreferences();
  const id = "catalogue-" + venue.id, saved = isSaved("place", id), hours = venue.hours;
  const hoursSummary = hours?.summary || "Hours unconfirmed";
  const options = isVegOptions(venue), distance = venue.distanceKm !== undefined ? " · " + venue.distanceKm.toFixed(1) + " km" : "";
  // A Mixed Kitchen place never reads as Vegetarian or Vegan: it is not a vegetarian kitchen. Other places show only proven labels.
  const labels = placeLabels(venue);
  const metadata = options ? mixedKitchenSpoken + " · " + dishCount(venue.itemCount) + distance : [...labels, ...(distance ? [venue.distanceKm!.toFixed(1) + " km"] : [])].join(" · ");
  return <PhotoPostCard testID="catalogue-venue" titleTestID="catalogue-card-name" photo={{ path: venue.photo?.path, emptyIcon: placeTileIcon(venue) }} title={venue.name}
    label={[venue.name, venue.address, metadata, hoursSummary].filter(Boolean).join(". ")} hint="Opens this branch's location and details"
    onPress={() => router.push({ pathname: "/place/[id]", params: { id } } as never)}
    topLeft={venue.itemCount > 0 && <MenuEntry menu={venue} compact />}
    topRight={more && <IconButton label={"More options for " + venue.name} icon="ellipsis-horizontal" appearance="media" onPress={more} />}
    side={<ReactionColumn kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)}
      save={{ saved, busy: false, disabled: !readable, onPress: () => void toggleSave("place", id, venue.name) }} />}>
    <PostFact icon="location-outline">{venue.address}</PostFact>
    <PostFacts>
      {venue.distanceKm !== undefined && <PostFact icon="navigate-outline" shrink>{venue.distanceKm.toFixed(1)} km away</PostFact>}
      {!!review?.count && <View testID="catalogue-card-rating"><PostFact icon="star" iconColor={theme.mediaRating} shrink>
        <T variant="caption" style={common.bold} color={theme.mediaForeground}>{review.rating?.toFixed(1)}</T>{" · " + review.count + " QuinTaste " + (review.count === 1 ? "review" : "reviews")}
      </PostFact></View>}
    </PostFacts>
    <PostFacts>
      {options ? <><VegOptionsChip /><PostFact icon="book-outline" shrink>{dishCount(venue.itemCount)}</PostFact></>
        : labels.map(label => <PostFact key={label} leading={<DietIcon diet={label} size={14} color={theme.mediaForeground} />} shrink>{label}</PostFact>)}
      <PostFact icon="time-outline" shrink>{hoursSummary}</PostFact>
    </PostFacts>
  </PhotoPostCard>;
}

/** Marks a place that is not a vegetarian kitchen, in a warm tone distinct from the vegetarian leaf. */
export function VegOptionsChip() {
  const { theme } = usePreferences();
  return <View testID="veg-options-chip" style={[s.chip, { backgroundColor: theme.warningSoft }]}>
    <Icon name="restaurant-outline" size={13} color={theme.warning} /><T variant="caption" color={theme.warning} style={common.bold}>{mixedKitchenLabel}</T>
  </View>;
}

/** Saved screens batch ratings in one request and pass this place's summary in. */
export function SavedCatalogueVenue({ id, more, review }: { id: string; more: () => void; review?: PlaceReviewSummary }) {
  const { venue, busy, error, retry } = useCatalogueVenue(id);
  const { toggleSave } = useFood(), { theme } = usePreferences();
  if (venue) return <CatalogueVenueCard venue={venue} more={more} review={review} />;
  if (busy) return <Card><ActivityIndicator color={theme.accent} accessibilityLabel="Loading saved place" /></Card>;
  return <Card style={common.stack}><T variant="subtitle">Saved Place</T><T muted accessibilityLiveRegion="polite">{error || "Connect to load this published menu."}</T>
    <Button label="Retry" variant="secondary" onPress={retry} />
    <Button label="Place Details" onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + id } } as never)} />
    <Button label="Remove Saved Place" variant="link" onPress={() => void toggleSave("place", "catalogue-" + id)} />
    <Button label="More Options" variant="link" onPress={more} /></Card>;
}
const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
});
