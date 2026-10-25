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
import { useLanguage, useT } from "../../i18n";

export function LivePlaceDetailScreen({ id }: { id: string }) {
  const { place, busy, error, expired, offline, load } = usePlaceDetails(id);
  const { theme, setNotice } = usePreferences(), now = useMinuteClock();
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  const { menus } = useMenus(), menu = place ? menuForPlace(menus, place) : undefined;
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: t("linkFailedConnection"), error: true }); }
  };
  return <Screen title={place?.name ?? t("placeDetails")}>
    {busy && <ActivityIndicator color={theme.accent} accessibilityLabel={t("updatingPlace")} />}
    {offline && <T variant="caption" muted>{t(place ? "offlineLastDetails" : "offlineBookmarkOnly")}</T>}
    {!!error && !offline && <View style={common.stack}><T color={theme.error} accessibilityLiveRegion="polite">{error}</T>
      <Button label={tc("retry")} variant="secondary" onPress={() => void load()} /></View>}
    {expired && <Button label={t("refreshDetails")} variant="secondary" onPress={() => void load()} />}
    {place && <>
      {!!place.photos.length && <GooglePhotoGallery key={place.placeId + "|" + place.fetchedAt} photos={place.photos}
        name={place.name} expiresAt={place.fetchedAt + 300000} />}
      <T muted>{place.address || t("addressUnavailable")}</T>
      <LivePlaceActions place={place} />
      {menu && <MenuEntry menu={menu} />}
      <View style={common.row}>
        <T variant="small" numberOfLines={1} ellipsizeMode="tail" style={[common.flex, { minWidth: 0 }]} color={place.opening === "open" ? theme.success : theme.mutedForeground}>{placeOpeningLine(place, now, language)}</T>
        {!!googleRating(place) && <T variant="caption" numberOfLines={1} style={[common.bold, { maxWidth: "64%", flexShrink: 1 }]}>{googleRating(place, language)}</T>}
      </View>
      <SectionTitle title={t("openingHoursTitle")} />
      {place.hours.length ? <View style={{ gap: 5 }}>{place.hours.map(day => <T key={day}>{day}</T>)}</View> : <T muted>{t("hoursUnavailable")}</T>}
      {!!place.website && <Button label={t("website")} variant="link" icon="open-outline" onPress={() => void open(place.website!)} />}
      <SectionTitle title={t("googleReviewsTitle")} />
      {place.reviews?.length ? place.reviews.map((review, index) => <GoogleReview key={index} review={review} />) : <T muted>{t("noReviews")}</T>}
      <Button label={t("allReviews")} variant="link" icon="open-outline" onPress={() => void open(googlePlaceUrl(id, place.name))} />
      {place.attributions.map((item, index) => <T key={index} variant="small" muted>{item.provider}</T>)}
      <PlaceFeedbackActions name={place.name} menuId={menu?.id} />
    </>}
    {!place && <OfflinePlaceBookmark placeId={id} />}
    {!place && <Button label={t("openMap")} variant="secondary" icon="open-outline" onPress={() => void open(googlePlaceUrl(id, "Saved place"))} />}
  </Screen>;
}
