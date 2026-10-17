import { useState } from "react";
import { Pressable, View } from "react-native";
import { Initial } from "../GroupedList";
import { Button, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import type { PlaceReview } from "../../types/place-reviews";
import { ReviewStars } from "./ReviewStars";
import { ReviewPhotos } from "./ReviewPhotos";

export function PlaceReviewCard({ review, own, onEdit, onDelete, onReport }: {
  review: PlaceReview; own?: boolean; onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const { theme } = usePreferences(), [expanded, setExpanded] = useState(false), [overflow, setOverflow] = useState(review.body.length > 180);
  const date = new Date(review.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
  return <View testID={own ? "place-review-own" : "place-review"} style={{ gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
    <View style={[common.row, { gap: 8 }]}><Initial name={review.name} size={32} />
      <View style={common.flex}><T variant="small" style={common.bold}>{own ? "Your review" : review.name}</T><T variant="caption" muted>{date}{review.updatedAt !== review.createdAt ? " · Edited" : ""}</T></View>
      <ReviewStars value={review.rating} />
    </View>
    {!!review.body && <><T variant="small" selectable numberOfLines={expanded ? undefined : 4} onTextLayout={event => { if (!expanded) setOverflow(review.body.length > 180 || event.nativeEvent.lines.length >= 4); }}>{review.body}</T>
      {overflow && <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Show less review text" : "Read full review"} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ minHeight: 48, justifyContent: "center" }}><T variant="small" color={theme.accent}>{expanded ? "Show less" : "Read more"}</T></Pressable>}
    </>}
    {!!review.photos?.length && <ReviewPhotos photos={review.photos} />}
    <View style={[common.row, { gap: 6 }]}>{own ? <><Button label="Edit" variant="link" onPress={onEdit} /><Button label="Delete" variant="link" onPress={onDelete} /></>
      : <Button label="Report" accessibilityLabel={"Report review by " + review.name} variant="link" onPress={onReport} />}</View>
  </View>;
}
