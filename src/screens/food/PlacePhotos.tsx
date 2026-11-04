import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { useListingSource } from "../../components/market/ListingPhoto";
import { ReviewPhotoViewer } from "../../components/discovery/ReviewPhotoViewer";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useReviewGallery } from "../../hooks/useReviewGallery";
import { thumbPath } from "../../services/place-reviews-api";
import { usePreferences } from "../../state/Preferences";
import type { ReviewGalleryPhoto } from "../../types/place-reviews";
import { useT } from "../../i18n";

const GAP = 4, COLUMNS = 3;

/** Every approved review photo of a place, newest review first, as equal squares; a tap opens the full-screen viewer. */
export function PlacePhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), placeId = typeof id === "string" ? id : "";
  const { venue } = useCatalogueVenue(placeId), gallery = useReviewGallery(placeId || null);
  const { theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  const [width, setWidth] = useState(0), [start, setStart] = useState<number | null>(null);
  const size = width ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 0;
  const placePath = "/place/catalogue-" + placeId;
  return <Screen title={t("photos")} backTo={placePath} headerAction={gallery.total > 0 ? <T variant="small" muted>{gallery.total}</T> : undefined}>
    {gallery.loading && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingPhotos")} />}
    {!!gallery.error && !gallery.items.length && <EmptyState icon="cloud-offline-outline" title={t("photosCouldNotLoad")} text=""
      primary={{ label: tc("tryAgain"), onPress: gallery.refresh }} />}
    {!gallery.loading && !gallery.error && !gallery.items.length && <EmptyState icon="images-outline" title={t("noReviewPhotos")} text="" />}
    {gallery.items.length > 0 && <View testID="place-photos-grid" accessibilityLabel={venue ? t("allPhotosOf", { name: venue.name }) : t("photos")}
      onLayout={event => setWidth(event.nativeEvent.layout.width)} style={s.grid}>
      {size > 0 && gallery.items.map((photo, i) => <Tile key={photo.url} photo={photo} size={size} label={t("photoBy", { name: photo.name, stars: photo.rating })} onPress={() => setStart(i)} />)}
    </View>}
    {gallery.hasMore && <Button label={gallery.moreError ? tc("tryAgain") : t("morePhotos")} variant="secondary" loading={gallery.loadingMore} onPress={gallery.loadMore} />}
    {!!gallery.moreError && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{gallery.moreError === "load" ? t("photosCouldNotLoad") : gallery.moreError}</T>}
    {start !== null && <ReviewPhotoViewer photos={gallery.items} total={gallery.total} start={start} onClose={() => setStart(null)} onEnd={gallery.loadMore} />}
  </Screen>;
}
function Tile({ photo, size, label, onPress }: { photo: ReviewGalleryPhoto; size: number; label: string; onPress: () => void }) {
  const { theme } = usePreferences(), source = useListingSource(), { focused, focusProps } = useKeyboardFocus(), [failed, setFailed] = useState(false);
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.tile, { width: size, height: size, backgroundColor: theme.muted, borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.8 : 1 }]}>
    {failed ? <Icon name="image-outline" color={theme.mutedForeground} />
      : <Image source={source(thumbPath(photo.url))} recyclingKey={photo.url} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessible={false} transition={120} />}
  </Pressable>;
}
const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: { borderRadius: 6, overflow: "hidden", borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
