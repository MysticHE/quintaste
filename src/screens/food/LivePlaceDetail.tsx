import * as Linking from "expo-linking";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { SectionTitle } from "../../components/food/Controls";
import { GooglePhotoGallery } from "../../components/discovery/GooglePhotoGallery";
import { GoogleReview } from "../../components/discovery/GoogleReview";
import { LivePlaceActions } from "../../components/discovery/LivePlaceActions";
import { PlaceFeedbackActions } from "../../components/discovery/PlaceFeedbackActions";
import { usePlaceDetails } from "../../hooks/usePlaceDetails";
import { usePreferences } from "../../state/Preferences";
import { OfflinePlaceBookmark } from "../../components/discovery/OfflinePlaceBookmark";
import { useMinuteClock } from "../../components/food/Timers";
import { googlePlaceUrl } from "../../utils/place-directory";
import { googleRating, placeOpeningLine } from "../../utils/live-place-format";
import { useMenus } from "../../state/Menus";
import { menuForPlace } from "../../utils/menu-match";
import { MenuEntry } from "../../components/discovery/MenuEntry";

export function LivePlaceDetailScreen({ id }: { id: string }) {
  const { place, busy, error, expired, offline, load } = usePlaceDetails(id);
  const { theme, setNotice } = usePreferences(), now = useMinuteClock();
  const { menus } = useMenus(), menu = place ? menuForPlace(menus, place) : undefined;
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: "This link could not open. Check your connection.", error: true }); }
  };
  return <Screen title={place?.name ?? "Place details"}>
    {busy && <ActivityIndicator color={theme.accent} accessibilityLabel="Updating place" />}
    {offline && <T variant="caption" muted>Offline · {place ? "last available details" : "bookmark only"}</T>}
    {!!error && !offline && <View style={common.stack}><T color={theme.error} accessibilityLiveRegion="polite">{error}</T>
      <Button label="Retry" variant="secondary" onPress={() => void load()} /></View>}
    {expired && <Button label="Refresh Details" variant="secondary" onPress={() => void load()} />}
    {place && <>
      {!!place.photos.length && <GooglePhotoGallery key={place.placeId + "|" + place.fetchedAt} photos={place.photos}
        name={place.name} expiresAt={place.fetchedAt + 300000} />}
      <T muted>{place.address || "Address unavailable"}</T>
      <LivePlaceActions place={place} />
      {menu && <MenuEntry menu={menu} />}
      <View style={common.row}>
        <T variant="small" numberOfLines={1} ellipsizeMode="tail" style={[common.flex, { minWidth: 0 }]} color={place.opening === "open" ? theme.success : theme.mutedForeground}>{placeOpeningLine(place, now)}</T>
        {!!googleRating(place) && <T variant="caption" numberOfLines={1} style={[common.bold, { maxWidth: "64%", flexShrink: 1 }]}>{googleRating(place)}</T>}
      </View>
      <SectionTitle title="Opening Hours" />
      {place.hours.length ? <View style={{ gap: 5 }}>{place.hours.map(day => <T key={day}>{day}</T>)}</View> : <T muted>Hours unavailable</T>}
      {!!place.website && <Button label="Website" variant="link" icon="open-outline" onPress={() => void open(place.website!)} />}
      <SectionTitle title="Google Reviews" />
      {place.reviews?.length ? place.reviews.map((review, index) => <GoogleReview key={index} review={review} />) : <T muted>No reviews</T>}
      <Button label="All Reviews" variant="link" icon="open-outline" onPress={() => void open(googlePlaceUrl(id, place.name))} />
      {place.attributions.map((item, index) => <T key={index} variant="small" muted>{item.provider}</T>)}
      <PlaceFeedbackActions name={place.name} placeId={place.placeId} menuId={menu?.id} />
    </>}
    {!place && <OfflinePlaceBookmark placeId={id} />}
    {!place && <Button label="Open Map" variant="secondary" icon="open-outline" onPress={() => void open(googlePlaceUrl(id, "Saved place"))} />}
  </Screen>;
}
