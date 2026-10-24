import * as Linking from "expo-linking";
import { router } from "expo-router";
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
import { PlaceDetailAction, PlaceDetailSection } from "../../components/discovery/PlaceDetailParts";
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

export function CataloguePlaceDetailScreen({ id }: { id: string }) {
  const { venue, busy, error, gone, offline, retry } = useCatalogueVenue(id);
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
  const directions = directionsUrl(venue?.address ?? "", venue?.googlePlaceId);
  return <Screen title={venue?.name ?? t("placeDetails")} header={<View style={common.row}>
    <IconButton appearance="plain" label={tc("goBack")} icon="arrow-back" onPress={() => goBack("/")} />
  </View>}>
    {busy && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingPlaceDetails")} />}
    {offline && <T variant="caption" muted>{t(venue ? "offlineSavedDetails" : "offlineBookmarkOnly")}</T>}
    {gone && <EmptyState icon="close-circle-outline" title={t("noLongerInExplore")} text={t("removedOrClosed")}
      primary={{ label: t("backToExplore"), onPress: () => router.navigate("/") }} />}
    {!!error && !gone && (venue ? <View style={common.row}><T variant="small" muted style={common.flex} accessibilityLiveRegion="polite">{t("showingSavedDetails")}</T><Button label={tc("tryAgain")} variant="link" onPress={retry} /></View>
      : <EmptyState icon="cloud-offline-outline" title={t("couldntLoadPlace")} text={t(offline ? "offlineConnect" : "checkConnection")} primary={{ label: tc("tryAgain"), onPress: retry }}
        action={t("backToExplore")} onPress={() => router.navigate("/")} />)}
    {venue && <>
      <View testID={venue.photo ? "catalogue-place-photo" : "catalogue-place-tile"} style={[s.hero, { backgroundColor: theme.mediaSurface }]}>
        <CataloguePhotoBackdrop key={venue.photo?.path ?? "none"} path={venue.photo?.path} emptyIcon={placeTileIcon(venue)} enabled panelHeight={0} nameHeight={0} />
      </View>
      <View style={{ gap: 4 }}>
        <T variant="title" accessibilityRole="header">{venue.name}</T>
        <View style={[common.row, { flexWrap: "wrap" }]}>
          <View style={common.flex}>{isVegOptions(venue) ? <StatusPill label={t("mixedKitchen")} tone="warning" /> : <T variant="small" muted>{t("vegKitchen")}</T>}</View>
          <ReactionBar kind="place" id={venue.id} name={venue.name} shareMessage={() => placeShareMessage(venue)} />
        </View>
      </View>
      <View style={[common.row, { flexWrap: "wrap", gap: 8 }]}>
        {!isVegOptions(venue) && <DietLabels labels={placeLabels(venue)} />}
        {!!venue.branch && !venue.address.toLowerCase().includes(venue.branch.toLowerCase()) && <T variant="caption" muted>{venue.branch}</T>}</View>
      {isVegOptions(venue) && <T testID="veg-options-notice" variant="small" muted>{t("mixedKitchenSafety")}</T>}
      <View style={s.overview}>
        <View style={[common.row, { gap: 10, paddingHorizontal: 4 }]}><Icon name="location-outline" size={18} /><T variant="small" selectable style={common.flex}>{venue.address}</T></View>
        <PlaceDetailSection title={t("openingHours")} summary={venue.hours?.summary || t("hoursUnconfirmed")} icon="time-outline">
          {venue.hours ? venue.hours.schedule.map((line, i) => <T variant="small" key={i}>{line}</T>) : <T variant="small" muted>{t("hoursUnconfirmed")}</T>}
        </PlaceDetailSection>
      </View>
      <View testID="place-primary-actions" style={s.actions}>
        <PlaceDetailAction variant="primary" label={t("directions")} icon="navigate-outline" onPress={() => void open(directions)} />
        {venue.itemCount > 0 && <PlaceDetailAction variant="secondary" label={t("menu")} icon="book-outline" accessibleLabel={t("viewMenuFor", { name: venue.name })} onPress={() => router.push({ pathname: "/menu/[id]", params: { id: venue.id } } as never)} />}
        <PlaceDetailAction label={tc(saved ? "saved" : "save")} accessibleLabel={t(saved ? "removeSavedName" : "saveName", { name: venue.name })} icon={saved ? "bookmark" : "bookmark-outline"}
          selected={saved} disabled={!readable || saving} onPress={() => void save()} />
      </View>
      <PlaceReviews placeId={venue.id} />
      <GoogleReviewsLink id={venue.googlePlaceId} name={venue.name} address={venue.address} />
      <View style={[s.secondary, { borderTopColor: theme.divider }]}>
        <PlaceDetailSection title={t("suggestUpdate")} icon="create-outline"><PlaceFeedbackActions name={venue.name} placeId={venue.googlePlaceId ?? venue.id} menuId={venue.id} /></PlaceDetailSection>
      </View>
    </>}
  </Screen>;
}
const s = StyleSheet.create({
  hero: { aspectRatio: 1.65, maxHeight: 280, borderRadius: 18, overflow: "hidden" },
  overview: { gap: 4 },
  actions: { flexDirection: "row", gap: 8, marginBottom: 8 },
  secondary: { borderTopWidth: 1, paddingTop: 4 },
});
