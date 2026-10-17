import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, T, common } from "../ui";
import { Chip } from "../food/Controls";
import { ensureMember, useMember } from "../CommunityGate";
import { usePreferences } from "../../state/Preferences";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { ApiError } from "../../services/community-api";
import { placeReviews, reviewsPath } from "../../services/place-reviews-api";
import type { PlaceReview, PlaceReviewsPage, ReviewSort } from "../../types/place-reviews";
import { PlaceReviewDialog } from "./PlaceReviewDialog";
import { PlaceReviewCard } from "./PlaceReviewCard";
import { ReviewStars } from "./ReviewStars";

export function PlaceReviews({ placeId }: { placeId: string }) {
  const member = useMember(), [sort, setSort] = useState<ReviewSort>("newest");
  return <ReviewList key={placeId + ":" + (member.userId ?? "guest") + ":" + sort} placeId={placeId} sort={sort} setSort={setSort} />;
}
function ReviewList({ placeId, sort, setSort }: { placeId: string; sort: ReviewSort; setSort: (value: ReviewSort) => void }) {
  const { theme } = usePreferences(), member = useMember(), params = useLocalSearchParams<{ review?: string }>();
  const prefix = "place-reviews:" + placeId + ":", key = prefix + (member.userId ?? "guest") + ":" + sort;
  const remote = useRemote(key, signal => placeReviews(reviewsPath(placeId, sort), signal)), data = remote.data;
  const latest = useRef(data);
  useEffect(() => { latest.current = data; }, [data]);
  const [extra, setExtra] = useState<{ base: PlaceReviewsPage; items: PlaceReview[]; nextCursor: string | null } | null>(null);
  const extraPage = extra?.base === data ? extra : null, items = [...(data?.items ?? []), ...(extraPage?.items ?? [])];
  const cursor = extraPage ? extraPage.nextCursor : data?.nextCursor;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [dialog, setDialog] = useState<{ action: "write" | "delete" | "report"; review?: PlaceReview } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const activeDialog = dialog ?? (params.review === "1" && member.member && data ? { action: "write" as const, review: data.mine ?? undefined } : null);
  const closeDialog = () => { setDialog(null); if (params.review) router.setParams({ review: undefined }); };
  const write = () => { if (ensureMember(member, "/place/catalogue-" + placeId + "?review=1")) setDialog({ action: "write", review: data?.mine ?? undefined }); };
  const more = async () => {
    if (!cursor || !data || busy) return;
    const base = data, request = new AbortController(); controller.current = request; setBusy(true); setError("");
    try {
      const page = await placeReviews(reviewsPath(placeId, sort, cursor), request.signal);
      if (!request.signal.aborted && latest.current === base) setExtra(previous => ({ base, items: [...new Map([...(previous?.base === base ? previous.items : []), ...page.items].map(item => [item.id, item])).values()], nextCursor: page.nextCursor }));
    } catch (problem) { if (!request.signal.aborted) setError(problem instanceof ApiError ? problem.message : "Reviews could not load."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  const report = (review: PlaceReview) => { if (ensureMember(member, "/place/catalogue-" + placeId)) setDialog({ action: "report", review }); };
  const saved = () => invalidate(prefix, "place-review-summaries:");
  const card = (review: PlaceReview, own = false) => <PlaceReviewCard key={review.id} review={review} own={own}
    onEdit={write} onDelete={() => setDialog({ action: "delete", review })} onReport={() => report(review)} />;
  return <View testID="place-reviews" style={{ gap: 10 }}>
    <View style={[common.row, { flexWrap: "wrap", gap: 8 }]}><View style={[common.flex, { minWidth: 120 }]}><T variant="subtitle" style={common.bold} accessibilityRole="header">Reviews</T><T variant="caption" muted>QuinTaste community</T></View>
      <Button label={data?.mine ? "Edit review" : "Write review"} icon="create-outline" variant="secondary" disabled={member.pending || !member.enabled} onPress={write} />
    </View>
    {remote.loading && !data && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading reviews" />}
    {!!remote.error && <View style={common.row}><T variant="small" color={theme.error} style={common.flex} accessibilityLiveRegion="polite">{remote.error.message}</T><Button label="Retry reviews" variant="link" onPress={remote.refresh} /></View>}
    {data && <>
      {data.count > 0 ? <View style={[common.row, { gap: 12 }]}><T variant="title" style={common.bold}>{data.rating?.toFixed(1)}</T>
        <View style={{ gap: 4 }}><ReviewStars value={data.rating ?? 0} /><T variant="caption" muted>{data.count} {data.count === 1 ? "review" : "reviews"}</T></View>
      </View> : <T variant="small" muted>No reviews yet</T>}
      {data.count > 1 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{([['newest', 'Newest'], ['highest', 'Highest rated'], ['lowest', 'Lowest rated']] as const).map(([value, label]) =>
        <Chip key={value} label={label} compact role="radio" selected={sort === value} onPress={() => setSort(value)} />)}</View>}
      {data.mine && card(data.mine, true)}
      {(showAll ? items : items.slice(0, 2)).map(item => card(item))}
      {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      {!showAll && (items.length > 2 || !!cursor) && <Button label="See all reviews" variant="link" onPress={() => setShowAll(true)} />}
      {showAll && !!cursor && <Button label={error ? "Retry more reviews" : "More reviews"} variant="link" loading={busy} onPress={() => void more()} />}
      {showAll && <Button label="Show fewer reviews" variant="link" onPress={() => setShowAll(false)} />}
    </>}
    {activeDialog && <PlaceReviewDialog {...activeDialog} placeId={placeId} onClose={closeDialog} onSaved={saved} />}
  </View>;
}
