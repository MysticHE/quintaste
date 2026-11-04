import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, T, common } from "../ui";
import { Chip, HorizontalChips } from "../food/Controls";
import { ensureMember, useMember } from "../CommunityGate";
import { usePreferences } from "../../state/Preferences";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { ApiError } from "../../services/community-api";
import { placeReviews, reviewsPath } from "../../services/place-reviews-api";
import type { PlaceReview, PlaceReviewsPage, ReviewGalleryPhoto, ReviewSort } from "../../types/place-reviews";
import type { ReviewGallery } from "../../hooks/useReviewGallery";
import { PlaceReviewDialog } from "./PlaceReviewDialog";
import { PlaceReviewCard, reviewGalleryPhotos } from "./PlaceReviewCard";
import { ReviewStars } from "./ReviewStars";
import { ReviewPhotoGrid } from "./ReviewPhotoGrid";
import { ReviewPhotoViewer } from "./ReviewPhotoViewer";
import { useT,useLanguage } from "../../i18n";
import { contributionWords } from "../../config/explore-work";

/** The viewer's photos: the place's whole gallery (with paging), or one review's photos. */
export type Viewing = { photos: ReviewGalleryPhoto[]; total: number; start: number; gallery: boolean };
const sortChoices = [["newest", "sortNewest"], ["photos", "sortWithPhotos"], ["highest", "sortHighest"], ["lowest", "sortLowest"]] as const;

type Photos = { gallery: ReviewGallery; viewing: Viewing | null; setViewing: (value: Viewing | null) => void };

/** `viewing` lives with the place page, so its photo carousel opens the same viewer (with Report and See review) as the grid. */
export function PlaceReviews({ placeId, ...photos }: { placeId: string } & Photos) {
  const member = useMember(), [sort, setSort] = useState<ReviewSort>("newest");
  return <ReviewList key={placeId + ":" + (member.userId ?? "guest") + ":" + sort} placeId={placeId} sort={sort} setSort={setSort} {...photos} />;
}
function ReviewList({ placeId, sort, setSort, gallery, viewing, setViewing }: { placeId: string; sort: ReviewSort; setSort: (value: ReviewSort) => void } & Photos) {
  const { theme } = usePreferences(), member = useMember(), params = useLocalSearchParams<{ review?: string;reviewId?:string }>(), t = useT("explore"), tc = useT("common"),cw=contributionWords(useLanguage());
  const prefix = "place-reviews:" + placeId + ":", key = prefix + (member.userId ?? "guest") + ":" + sort+":"+(params.reviewId??"");
  const remote = useRemote(key, signal => placeReviews(reviewsPath(placeId, sort,undefined,params.reviewId), signal), { keepPrevious: true }), data = remote.data;
  const refresh=remote.refresh;
  useFocusEffect(useCallback(()=>{if(!data?.pending)return;const timer=setInterval(()=>{if(AppState.currentState==='active')refresh();},5000);return()=>clearInterval(timer);},[data?.pending,refresh]));
  const latest = useRef(data);
  useEffect(() => { latest.current = data; }, [data]);
  // A pending review that publishes brings its photos: refresh the gallery (the 5-second poll only reloads the reviews).
  const pendingWork = data?.pending?.workId ?? null, wasPending = useRef(pendingWork), refreshGallery = gallery.refresh;
  useEffect(() => { if (wasPending.current && !pendingWork) refreshGallery(); wasPending.current = pendingWork; }, [pendingWork, refreshGallery]);
  const [extra, setExtra] = useState<{ base: PlaceReviewsPage; items: PlaceReview[]; nextCursor: string | null } | null>(null);
  const extraPage = extra?.base === data ? extra : null, items = [...(data?.items ?? []), ...(extraPage?.items ?? [])];
  const cursor = extraPage ? extraPage.nextCursor : data?.nextCursor;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [dialog, setDialog] = useState<{ action: "write" | "delete" | "report"; review?: PlaceReview } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const activeDialog = dialog ?? (params.review === "1" && member.member && data ? { action: "write" as const, review: data.pending ?? data.mine ?? undefined } : null);
  const closeDialog = () => { setDialog(null); if (params.review) router.setParams({ review: undefined }); };
  const write = () => { if (ensureMember(member, "/place/catalogue-" + placeId + "?review=1")) setDialog({ action: "write", review: data?.pending ?? data?.mine ?? undefined }); };
  const more = async () => {
    // The faded list from the last sort has that sort's cursor; more pages wait for the new sort.
    if (!cursor || !data || busy || remote.stale) return;
    const base = data, request = new AbortController(); controller.current = request; setBusy(true); setError("");
    try {
      const page = await placeReviews(reviewsPath(placeId, sort, cursor), request.signal);
      if (!request.signal.aborted && latest.current === base) setExtra(previous => ({ base, items: [...new Map([...(previous?.base === base ? previous.items : []), ...page.items].map(item => [item.id, item])).values()], nextCursor: page.nextCursor }));
    } catch (problem) { if (!request.signal.aborted) setError(problem instanceof ApiError ? problem.message : t("reviewsCouldNotLoad")); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  const report = (review: PlaceReview) => { if (ensureMember(member, "/place/catalogue-" + placeId)) setDialog({ action: "report", review }); };
  const reportPhoto = (photo: ReviewGalleryPhoto) => {
    setViewing(null);
    report(items.find(item => item.id === photo.reviewId) ?? { id: photo.reviewId, name: photo.name, rating: photo.rating, body: photo.body, createdAt: photo.createdAt, updatedAt: photo.createdAt });
  };
  const allPhotos = () => router.push({ pathname: "/place-photos/[id]", params: { id: placeId } } as never);
  const saved = () => invalidate(prefix, "place-review-summaries:");
  const card = (review: PlaceReview, own = false) => <PlaceReviewCard key={review.id} review={review} own={own}
    onEdit={write} onDelete={() => setDialog({ action: "delete", review })} onReport={() => report(review)}
    onPhoto={start => { const photos = reviewGalleryPhotos(review); setViewing({ photos, total: photos.length, start, gallery: false }); }} />;
  return <View testID="place-reviews" style={{ gap: 10 }}>
    <View style={[common.row, { flexWrap: "wrap", gap: 8 }]}><View style={[common.flex, { minWidth: 120 }]}><T variant="subtitle" style={common.bold} accessibilityRole="header">{t("reviews")}</T><T variant="caption" muted>{t("community")}</T></View>
      <Button label={t(data?.mine ? "editReview" : "writeReview")} icon="create-outline" variant="link" disabled={member.pending || !member.enabled} onPress={write} />
    </View>
    {remote.loading && !data && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingReviews")} />}
    {!!remote.error && <View style={common.row}><T variant="small" color={theme.error} style={common.flex} accessibilityLiveRegion="polite">{remote.error.code === "LOAD_FAILED" ? tc("loadFailed") : remote.error.message}</T><Button label={t("retryReviews")} variant="link" onPress={remote.refresh} /></View>}
    {data && <>
      {data.count > 0 ? <View style={[common.row, { gap: 12 }]}><T variant="title" style={common.bold}>{data.rating?.toFixed(1)}</T>
        <View style={{ gap: 4 }}><ReviewStars value={data.rating ?? 0} /><T variant="caption" muted>{t("reviewCount", { n: data.count })}</T></View>
      </View> : <T variant="small" muted>{t("noReviewsYet")}</T>}
      {gallery.items.length > 0 && <View testID="place-review-photos" accessibilityRole="none" accessibilityLabel={t("reviewPhotos")}>
        <ReviewPhotoGrid photos={gallery.items} total={gallery.total} onAll={allPhotos}
          onOpen={start => setViewing({ photos: gallery.items, total: gallery.total, start, gallery: true })} /></View>}
      {data.count > 1 && <View accessibilityRole="radiogroup" accessibilityLabel={t("reviews")}><HorizontalChips>{sortChoices.filter(([value]) => value !== "photos" || gallery.total > 0 || sort === "photos").map(([value, label]) =>
        <Chip key={value} label={t(label)} compact role="radio" selected={sort === value} onPress={() => setSort(value)} />)}</HorizontalChips></View>}
      {data.mine && card(data.mine, true)}
      {data.pending&&<View style={{gap:6}}><T variant="small" accessibilityLiveRegion="polite">{data.pending.state==="needs-changes"?cw["needs-changes"]:data.pending.state==="staff"?cw.staff:cw.pending}</T>
        <Button label={cw.title} variant="link" onPress={()=>router.push(("/explore-contributions/"+data.pending!.workId) as never)}/></View>}
      {items.length > 0 && <View style={{ gap: 10, opacity: remote.stale ? 0.55 : 1 }}>{(showAll ? items : items.slice(0, 2)).map(item => card(item))}</View>}
      {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      {!showAll && (items.length > 2 || !!cursor) && <Button label={t("seeAllReviews")} variant="link" onPress={() => setShowAll(true)} />}
      {showAll && !!cursor && <Button label={t(error ? "retryMoreReviews" : "moreReviews")} variant="link" loading={busy} disabled={remote.stale} onPress={() => void more()} />}
      {showAll && <Button label={t("showFewerReviews")} variant="link" onPress={() => setShowAll(false)} />}
    </>}
    {viewing && <ReviewPhotoViewer photos={viewing.gallery ? gallery.items : viewing.photos} total={viewing.gallery ? gallery.total : viewing.total} start={viewing.start}
      onClose={() => setViewing(null)} onEnd={viewing.gallery ? gallery.loadMore : undefined}
      onReport={reportPhoto} reportable={photo => photo.reviewId !== data?.mine?.id} />}
    {activeDialog && <PlaceReviewDialog {...activeDialog} placeId={placeId} onClose={closeDialog} onSaved={saved} />}
  </View>;
}
