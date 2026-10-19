import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ReactionBar } from "../../components/ReactionBar";
import { useReactions } from "../../hooks/useReactions";
import { placeShareMessage } from "../../utils/place-share";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { StatusPill } from "../../components/GroupedList";
import { CataloguePhotoBackdrop } from "../../components/discovery/CataloguePhotoBackdrop";
import { PlaceDetailAction, PlaceDetailSection, PlaceSources } from "../../components/discovery/PlaceDetailParts";
import { PlaceReviews } from "../../components/discovery/PlaceReviews";
import { GoogleReviewsLink } from "../../components/discovery/GoogleReviewsLink";
import { PlaceFeedbackActions } from "../../components/discovery/PlaceFeedbackActions";
import { PrivateNote } from "../../components/food/DetailParts";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { isVegOptions } from "../../utils/venue-kitchen";

export function CataloguePlaceDetailScreen({ id }: { id: string }) {
  const { venue, busy, error, offline, retry } = useCatalogueVenue(id);
  useReactions("place", venue ? [venue.id] : []);
  const { theme, setNotice } = usePreferences(), { owner, isSaved, toggleSave, readable } = useFood();
  const [saving, setSaving] = useState(false);
  const savedId = "catalogue-" + id, saved = isSaved("place", savedId);
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: "This link could not open. Please try again.", error: true }); }
  };
  const save = async () => {
    if (!venue) return;
    setSaving(true);
    try { await toggleSave("place", savedId, venue.name); } finally { setSaving(false); }
  };
  const directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(venue?.address ?? "")
    + (venue?.googlePlaceId ? "&destination_place_id=" + encodeURIComponent(venue.googlePlaceId) : "");
  return <Screen title={venue?.name ?? "Place details"}>
    {busy && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading place details" />}
    {offline && <T variant="caption" muted>Offline · {venue ? "saved place details" : "bookmark only"}</T>}
    {!!error && (venue ? <View style={common.row}><T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">Showing saved details</T><Button label="Try Again" variant="link" onPress={retry} /></View>
      : <EmptyState icon="cloud-offline-outline" title="Couldn't load this place" text={offline ? "You're offline. Connect and try again." : "Check your connection and try again."} primary={{ label: "Try Again", onPress: retry }}
        action="Back To Explore" onPress={() => router.navigate("/")} />)}
    {venue && <>
      {venue.photo ? <View testID="catalogue-place-photo" style={[s.hero, { backgroundColor: theme.mediaSurface }]}>
        <CataloguePhotoBackdrop key={venue.photo.path} path={venue.photo.path} enabled panelHeight={0} nameHeight={0} />
      </View> : <View style={[s.missing, { backgroundColor: theme.muted }]}><Icon name="image-outline" size={20} /><T variant="small" muted>Photo unavailable</T></View>}
      <ReactionBar kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)} />
      <View style={[common.row, { flexWrap: "wrap", gap: 8 }]}>
        {isVegOptions(venue) ? <StatusPill label="Veg options · Not a vegetarian kitchen" tone="warning" lines={2} /> : <StatusPill label={venue.venueDiet} />}
        {!!venue.branch && !venue.address.toLowerCase().includes(venue.branch.toLowerCase()) && <T variant="caption" muted>{venue.branch}</T>}</View>
      {isVegOptions(venue) && <T testID="veg-options-notice" variant="small" muted>Also serves meat or seafood. Cooking tools may be shared.</T>}
      <View style={[s.overview, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[common.row, { gap: 10, paddingHorizontal: 4 }]}><Icon name="location-outline" size={18} /><T variant="small" selectable style={common.flex}>{venue.address}</T></View>
        <PlaceDetailSection title="Opening hours" summary={venue.hours?.summary || "Hours unconfirmed"} icon="time-outline">
          {venue.hours ? venue.hours.schedule.map((line, i) => <T variant="small" key={i}>{line}</T>) : <T variant="small" muted>Hours unconfirmed</T>}
        </PlaceDetailSection>
      </View>
      <View testID="place-primary-actions" style={[s.actions, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <PlaceDetailAction label="Directions" icon="navigate-outline" onPress={() => void open(directionsUrl)} />
        <PlaceDetailAction label="Menu" icon="book-outline" accessibleLabel={"View menu for " + venue.name} onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id } } as never)} />
        <PlaceDetailAction label={saved ? "Saved" : "Save"} accessibleLabel={(saved ? "Remove saved " : "Save ") + venue.name} icon={saved ? "bookmark" : "bookmark-outline"}
          selected={saved} disabled={!readable || saving} onPress={() => void save()} />
      </View>
      <PlaceReviews placeId={venue.id} />
      <GoogleReviewsLink id={venue.googlePlaceId} name={venue.name} address={venue.address} />
      <View style={[s.secondary, { borderTopColor: theme.divider }]}>
        <PlaceDetailSection title="Private note" icon="document-text-outline"><PrivateNote key={owner + savedId} noteKey={"place:" + savedId} /></PlaceDetailSection>
        <PlaceDetailSection title="Sources & credits" icon="information-circle-outline"><PlaceSources venue={venue} open={url => void open(url)} /></PlaceDetailSection>
        <PlaceDetailSection title="Suggest an update" icon="create-outline"><PlaceFeedbackActions name={venue.name} placeId={venue.googlePlaceId ?? venue.id} menuId={venue.id} /></PlaceDetailSection>
      </View>
    </>}
  </Screen>;
}
const s = StyleSheet.create({
  hero: { height: 176, borderRadius: 18, overflow: "hidden" },
  missing: { minHeight: 64, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  overview: { padding: 10, borderRadius: 14, borderWidth: 1, gap: 4 },
  actions: { flexDirection: "row", gap: 4, padding: 4, borderWidth: 1, borderRadius: 14 },
  secondary: { borderTopWidth: 1, paddingTop: 4 },
});
