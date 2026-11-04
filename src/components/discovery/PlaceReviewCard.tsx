import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Initial } from "../GroupedList";
import { useListingSource } from "../market/ListingPhoto";
import { Button, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { thumbPath } from "../../services/place-reviews-api";
import type { PlaceReview, ReviewGalleryPhoto } from "../../types/place-reviews";
import { ReviewStars } from "./ReviewStars";
import { useLanguage, useT } from "../../i18n";
import { reviewDate } from "../../utils/review-date";

/** A review's photos as the viewer's items. */
export const reviewGalleryPhotos = (review: PlaceReview): ReviewGalleryPhoto[] => (review.photos ?? []).map(url =>
  ({ url, reviewId: review.id, name: review.name, rating: review.rating, body: review.body, createdAt: review.createdAt }));

export function PlaceReviewCard({ review, own, onEdit, onDelete, onReport, onPhoto }: {
  review: PlaceReview; own?: boolean; onEdit: () => void; onDelete: () => void; onReport: () => void; onPhoto: (index: number) => void;
}) {
  const { theme } = usePreferences(), [expanded, setExpanded] = useState(false), [overflow, setOverflow] = useState(review.body.length > 180);
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  return <View testID={own ? "place-review-own" : "place-review"} style={[s.card, { backgroundColor: own ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
    <View style={[common.row, { gap: 10 }]}><Initial name={review.name} size={36} />
      <View style={[common.flex, { minWidth: 0 }]}>
        <T variant="small" style={common.bold} numberOfLines={1}>{own ? t("yourReview") : review.name}</T>
        <T variant="caption" muted numberOfLines={1}>{reviewDate(review.updatedAt, language)}{review.updatedAt !== review.createdAt ? " · " + t("edited") : ""}</T>
      </View>
      <ReviewStars value={review.rating} />
    </View>
    {!!review.body && <><T variant="small" selectable numberOfLines={expanded ? undefined : 4} onTextLayout={event => { if (!expanded) setOverflow(review.body.length > 180 || event.nativeEvent.lines.length >= 4); }}>{review.body}</T>
      {overflow && <Pressable accessibilityRole="button" accessibilityLabel={t(expanded ? "showLessReview" : "readFullReview")} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpanded(!expanded)} style={s.more}><T variant="small" color={theme.accent} style={common.bold} numberOfLines={1}>{t(expanded ? "showLess" : "readMore")}</T></Pressable>}
    </>}
    {!!review.photos?.length && <CardPhotos photos={review.photos} name={review.name} rating={review.rating} onPhoto={onPhoto} />}
    <View style={[common.row, { gap: 6, justifyContent: own ? "flex-start" : "flex-end" }]}>{own ? <><Button label={tc("edit")} variant="link" onPress={onEdit} /><Button label={tc("delete")} variant="link" onPress={onDelete} /></>
      : <Button label={t("report")} accessibilityLabel={t("reportReviewBy", { name: review.name })} variant="link" onPress={onReport} />}</View>
  </View>;
}
/** One photo shows wide (4:3); two or three sit side by side as equal squares, whatever shape the member uploaded. */
function CardPhotos({ photos, name, rating, onPhoto }: { photos: string[]; name: string; rating: number; onPhoto: (index: number) => void }) {
  const single = photos.length === 1, t = useT("explore"), by = t("photoBy", { name, stars: rating });
  return <View testID="review-photos" style={[common.row, { gap: 6 }]}>
    {photos.map((path, i) => <CardPhoto key={path} path={path} wide={single} onPress={() => onPhoto(i)}
      label={single ? by : by + ", " + t("reviewPhotoOf", { n: i + 1, total: photos.length })} />)}
  </View>;
}
function CardPhoto({ path, wide, label, onPress }: { path: string; wide: boolean; label: string; onPress: () => void }) {
  const { theme } = usePreferences(), source = useListingSource(), { focused, focusProps } = useKeyboardFocus(), [failed, setFailed] = useState(false);
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.photo, { aspectRatio: wide ? 4 / 3 : 1, backgroundColor: theme.muted, borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.8 : 1 }]}>
    {failed ? <Icon name="image-outline" color={theme.mutedForeground} />
      : <Image source={source(wide ? path : thumbPath(path))} recyclingKey={path} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessible={false} transition={120} />}
  </Pressable>;
}
const s = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1 },
  more: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  photo: { flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
