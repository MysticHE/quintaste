import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { CatalogueVenue } from "../../types/catalogue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { Button, Card, Icon, T, common } from "../ui";
import { fontNames } from "../../theme/tokens";
import type { PlaceReviewSummary } from "../../types/place-reviews";
import { IconButton } from "../food/Controls";
import { CataloguePhotoBackdrop } from "./CataloguePhotoBackdrop";
import { usePhotoVisibility } from "./PhotoScrollView";
import { MenuEntry } from "./MenuEntry";

export function CatalogueVenueCard({ venue, more, review }: { venue: CatalogueVenue; more?: () => void; review?: PlaceReviewSummary }) {
  const { isSaved, toggleSave, readable } = useFood(), { theme, textMultiplier } = usePreferences();
  const id = "catalogue-" + venue.id, saved = isSaved("place", id), visibility = usePhotoVisibility(true);
  const [focused, setFocused] = useState(false), [pressed, setPressed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(140), [nameHeight, setNameHeight] = useState(24);
  const photo = venue.photo, hours = venue.hours;
  const hoursSummary = hours?.summary || "Hours unconfirmed";
  // Start above the first line so multi-line names retain contrast at larger text sizes.
  const fadeHeight = Math.max(32, panelHeight - 8 + 32);
  const open = () => router.push({ pathname: "/place/[id]", params: { id } } as never);
  const metadata = venue.venueDiet + (venue.distanceKm !== undefined ? " · " + venue.distanceKm.toFixed(1) + " km" : "");
  return <View style={{ gap: 8 }}><View testID="catalogue-venue" ref={node => visibility.attach(node)} onLayout={visibility.onLayout} collapsable={false}
    style={[s.card, { backgroundColor: theme.mediaSurface, borderColor: focused || pressed ? theme.accent : theme.transparent }]}>
    <CataloguePhotoBackdrop key={(photo?.path || "missing") + visibility.visible} path={photo?.path} enabled={visibility.visible} panelHeight={panelHeight} nameHeight={nameHeight} />
    <View pointerEvents="none" style={[s.blend, { height: fadeHeight }]} testID="photo-blend">
      <LinearGradient colors={theme.photoBlend} locations={[0, 32 / fadeHeight, 1]} style={StyleSheet.absoluteFill} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={[venue.name, venue.address, metadata, hoursSummary].join(". ")}
      accessibilityHint="Opens this branch's location and details" onPress={open} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <View style={{ height: 156 }} />
      <View onLayout={event => setPanelHeight(event.nativeEvent.layout.height)} style={s.information}>
        <T testID="catalogue-card-name" variant="place" style={[s.name, { fontSize: 20 * textMultiplier, lineHeight: 26 * textMultiplier }]} color={theme.mediaForeground} onLayout={event => setNameHeight(event.nativeEvent.layout.height)}>{venue.name}</T>
        <View style={s.line}><Icon name="location-outline" size={14} color={theme.mediaForeground} /><T variant="caption" style={common.flex} color={theme.mediaForeground}>{venue.address}</T></View>
        <View style={s.facts}>
          {venue.distanceKm !== undefined && <View style={s.line}><Icon name="navigate-outline" size={14} color={theme.mediaForeground} /><T variant="caption" color={theme.mediaForeground}>{venue.distanceKm.toFixed(1)} km away</T></View>}
          <View testID="catalogue-card-rating" style={s.line}><Icon name={review?.count ? "star" : "star-outline"} size={15} color={theme.mediaRating} />
            <T variant="caption" color={theme.mediaForeground}>{review ? review.count ? <><T variant="caption" style={common.bold} color={theme.mediaForeground}>{review.rating?.toFixed(1)}</T>{" · " + review.count + " QuinTaste " + (review.count === 1 ? "review" : "reviews")}</> : "No reviews yet" : "QuinTaste reviews"}</T>
          </View>
        </View>
        <View style={s.facts}>
          <View style={s.line}><Icon name="leaf-outline" size={14} color={theme.mediaMutedForeground} /><T variant="caption" color={theme.mediaMutedForeground}>{venue.venueDiet}</T></View>
          <View style={[s.line, { flexShrink: 1 }]}><Icon name="time-outline" size={14} color={theme.mediaMutedForeground} /><T variant="caption" style={{ flexShrink: 1 }} color={theme.mediaMutedForeground}>{hoursSummary}</T></View>
        </View>
      </View>
    </View>
    <View style={s.menu}><MenuEntry menu={venue} compact /></View>
    <View style={s.actions} pointerEvents="box-none">
      {more && <IconButton label={"More options for " + venue.name} icon="ellipsis-horizontal" appearance="media" onPress={more} />}
      <IconButton label={(saved ? "Remove saved " : "Save ") + venue.name} icon={saved ? "bookmark" : "bookmark-outline"}
        selected={saved} disabled={!readable} appearance="media" onPress={() => void toggleSave("place", id, venue.name)} />
    </View>
  </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", borderWidth: 2 },
  blend: { position: "absolute", bottom: 0, left: 0, right: 0 },
  information: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 3 },
  name: { fontFamily: fontNames.bold },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  facts: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 3 },
  menu: { position: "absolute", top: 4, left: 4 },
  actions: { position: "absolute", top: 4, right: 4, flexDirection: "row", gap: 6 },
});

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
