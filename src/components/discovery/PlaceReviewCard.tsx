import { useState } from "react";
import { Pressable, View } from "react-native";
import { Initial } from "../GroupedList";
import { Button, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import type { PlaceReview } from "../../types/place-reviews";
import { ReviewStars } from "./ReviewStars";
import { ReviewPhotos } from "./ReviewPhotos";
import { useLanguage, useT } from "../../i18n";
import { zhDate } from "../../utils/food-format";

export function PlaceReviewCard({ review, own, onEdit, onDelete, onReport }: {
  review: PlaceReview; own?: boolean; onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const { theme } = usePreferences(), [expanded, setExpanded] = useState(false), [overflow, setOverflow] = useState(review.body.length > 180);
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  const date = language === "zh" ? zhDate(new Date(review.updatedAt))
    : new Date(review.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
  return <View testID={own ? "place-review-own" : "place-review"} style={{ gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
    <View style={[common.row, { gap: 8 }]}><Initial name={review.name} size={32} />
      <View style={common.flex}><T variant="small" style={common.bold}>{own ? t("yourReview") : review.name}</T><T variant="caption" muted>{date}{review.updatedAt !== review.createdAt ? " · " + t("edited") : ""}</T></View>
      <ReviewStars value={review.rating} />
    </View>
    {!!review.body && <><T variant="small" selectable numberOfLines={expanded ? undefined : 4} onTextLayout={event => { if (!expanded) setOverflow(review.body.length > 180 || event.nativeEvent.lines.length >= 4); }}>{review.body}</T>
      {overflow && <Pressable accessibilityRole="button" accessibilityLabel={t(expanded ? "showLessReview" : "readFullReview")} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ minHeight: 48, justifyContent: "center" }}><T variant="small" color={theme.accent}>{t(expanded ? "showLess" : "readMore")}</T></Pressable>}
    </>}
    {!!review.photos?.length && <ReviewPhotos photos={review.photos} />}
    <View style={[common.row, { gap: 6 }]}>{own ? <><Button label={tc("edit")} variant="link" onPress={onEdit} /><Button label={tc("delete")} variant="link" onPress={onDelete} /></>
      : <Button label={t("report")} accessibilityLabel={t("reportReviewBy", { name: review.name })} variant="link" onPress={onReport} />}</View>
  </View>;
}
