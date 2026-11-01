import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ReactionBar } from "../../components/ReactionBar";
import { useReactions } from "../../hooks/useReactions";
import { placeShareMessage } from "../../utils/place-share";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { StatusPill } from "../../components/GroupedList";
import { CataloguePhotoBackdrop } from "../../components/discovery/CataloguePhotoBackdrop";
import { PhotoCredit, PlaceDetailAction, PlaceDetailSection, PlaceDivider, PlaceRow } from "../../components/discovery/PlaceDetailParts";
import { PlaceReviews } from "../../components/discovery/PlaceReviews";
import { GoogleReviewsLink } from "../../components/discovery/GoogleReviewsLink";
import { PlaceFeedbackActions } from "../../components/discovery/PlaceFeedbackActions";
import { DietLabels } from "../../components/food/DietLabels";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { isVegOptions, placeLabels, placeTileIcon } from "../../utils/venue-kitchen";
import { directionsUrl } from "../../utils/directions";
import { useT } from "../../i18n";
import { goBack } from "../../utils/navigation";
import { OpenClock, useOpenStatus } from "../../hooks/useOpenStatus";

/** The place page, with one minute clock so its open status stays current while it is shown. */
export function CataloguePlaceDetailScreen({ id }: { id: string }) {
  return <OpenClock><CataloguePlaceDetail id={id} /></OpenClock>;
}
function CataloguePlaceDetail({ id }: { id: string }) {
  const { venue, busy, error, gone, offline, retry } = useCatalogueVenue(id);
  // An Explore keyword search carries on into the menu.
  const { q } = useLocalSearchParams<{ q?: string }>(), search = typeof q === "string" ? q.trim().slice(0, 100) : "";
  useReactions("place", venue ? [venue.id] : []);
  const { theme, setNotice } = usePreferences(), { isSaved, toggleSave, readable } = useFood();
  const t = useT("explore"), tc = useT("common");
  const [saving, setSaving] = useState(false);
  const savedId = "catalogue-" + id, saved = isSaved("place", savedId);
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: t("linkFailed"), error: true }); }
  };
  const save = async () => {
    if (!venue) return;
    setSaving(true);
    try { await toggleSave("place", savedId, venue.name); } finally { setSaving(false); }
  };
  const status = useOpenStatus(venue?.hours);
  const directions = directionsUrl(venue?.address ?? "", venue?.googlePlaceId);
  const branch = venue?.branch && !venue.address.toLowerCase().includes(venue.branch.toLowerCase()) ? venue.branch : "";
  return <Screen title={venue?.name ?? t("placeDetails")} header={<View style={common.row}>
    <IconButton appearance="plain" label={tc("goBack")} icon="chevron-back" onPress={() => goBack("/")} />
    <View style={common.flex} />
    {venue && <ReactionBar kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)} />}
  </View>}>
    {/* A refresh of details already shown stays quiet; the spinner is only for a first load. */}
    {busy && !venue && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingPlaceDetails")} />}
    {gone && <EmptyState icon="close-circle-outline" title={t("noLongerInExplore")} text={t("removedOrClosed")}
      primary={{ label: t("backToExplore"), onPress: () => router.navigate("/") }} />}
    {!!error && !gone && (venue ? <View style={common.row}><T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">{t("showingSavedDetails")}</T><Button label={tc("tryAgain")} variant="link" onPress={retry} /></View>
      : <EmptyState icon="cloud-offline-outline" title={t("couldntLoadPlace")} text={t(offline ? "offlineConnect" : "checkConnection")} primary={{ label: tc("tryAgain"), onPress: retry }}
        action={t("backToExplore")} onPress={() => router.navigate("/")} />)}
    {venue && <View style={s.page}>
      {venue.photo && <View style={s.media}>
        <View testID="catalogue-place-photo" style={[s.hero, { backgroundColor: theme.mediaSurface }]}>
          <CataloguePhotoBackdrop key={venue.photo.path} path={venue.photo.path} thumbhash={venue.photo.thumbhash} enabled panelHeight={0} />
        </View>
        <PhotoCredit photo={venue.photo} open={url => void open(url)} />
      </View>}
      <View style={s.identity}>
        <View style={[common.row, { gap: 12 }]}>
          {!venue.photo && <View testID="catalogue-place-tile" style={[s.tile, { backgroundColor: theme.accentSoft }]}>
            <Icon name={placeTileIcon(venue)} size={26} color={theme.accent} /></View>}
          <View style={[common.flex, { gap: 2 }]}>
            <T variant="title" accessibilityRole="header">{venue.name}</T>
            {isVegOptions(venue) ? <View style={[common.row, { flexWrap: "wrap", gap: 6 }]}>
              <StatusPill label={t("mixedKitchen")} tone="warning" />{!!branch && <T variant="small" muted>{branch}</T>}
            </View> : <T variant="small" muted>{t("vegKitchen") + (branch ? " · " + branch : "")}</T>}
          </View>
        </View>
        {!isVegOptions(venue) && <DietLabels labels={placeLabels(venue)} />}
        {isVegOptions(venue) && <T testID="veg-options-notice" variant="small" muted>{t("mixedKitchenSafety")}</T>}
      </View>
      <View testID="place-primary-actions" style={s.actions}>
        <PlaceDetailAction inline variant="primary" label={t("directions")} icon="navigate-outline" onPress={() => void open(directions)} />
        {!!venue.contact && <PlaceDetailAction inline variant="secondary" label={t("call")} icon="call-outline"
          accessibleLabel={t("callPlace", { name: venue.name, phone: venue.contact.phone })} onPress={() => void open("tel:" + venue.contact!.phone.replace(/\s/g, ""))} />}
        {venue.itemCount > 0 && <PlaceDetailAction inline variant="secondary" label={t("menu")} icon="book-outline" accessibleLabel={t("viewMenuFor", { name: venue.name })} onPress={() => router.push({ pathname: "/menu/[id]", params: search ? { id: venue.id, q: search } : { id: venue.id } } as never)} />}
        <PlaceDetailAction inline label={tc(saved ? "saved" : "save")} accessibleLabel={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} icon={saved ? "bookmark" : "bookmark-outline"}
          selected={saved} disabled={!readable || saving} onPress={() => void save()} />
      </View>
      <View>
        <PlaceDivider />
        <PlaceRow icon="location-outline" text={venue.address} selectable />
        <PlaceDivider />
        <PlaceDetailSection title={t("openingHours")} summary={status ? status.text : venue.hours?.summary || t("hoursUnconfirmed")} icon="time-outline">
          {venue.hours ? <>{!!status && <T variant="small" muted>{venue.hours.summary}</T>}
            {venue.hours.schedule.map((line, i) => <T variant="small" key={i}>{line}</T>)}</> : <T variant="small" muted>{t("hoursUnconfirmed")}</T>}
        </PlaceDetailSection>
        <PlaceDivider />
        {venue.priceRange && <><PlaceRow testID="place-price" icon="pricetag-outline" text={t("typicalPrice") + " · " + t("priceRange", venue.priceRange)}
          accessibilityLabel={t("priceRangeSpoken", venue.priceRange)} /><PlaceDivider /></>}
      </View>
      <View style={{ gap: 4 }}>
        <PlaceReviews placeId={venue.id} />
        <GoogleReviewsLink id={venue.googlePlaceId} name={venue.name} address={venue.address} />
      </View>
      <View>
        <PlaceDivider />
        <PlaceFeedbackActions name={venue.name} menuId={venue.id} />
      </View>
    </View>}
  </Screen>;
}
const s = StyleSheet.create({
  page: { gap: 18 },
  media: { gap: 2 },
  hero: { aspectRatio: 16 / 9, maxHeight: 240, borderRadius: 18, overflow: "hidden" },
  identity: { gap: 10 },
  tile: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
