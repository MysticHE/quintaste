import { useEffect, useRef, useState } from "react";
import { useMember } from "../components/CommunityGate";
import { useRemote } from "./useRemote";
import { ApiError } from "../services/community-api";
import { galleryPath, reviewGallery } from "../services/place-reviews-api";
import type { ReviewGalleryPage, ReviewGalleryPhoto } from "../types/place-reviews";

export type ReviewGallery = {
  items: ReviewGalleryPhoto[]; total: number; loading: boolean; error: string; moreError: string;
  hasMore: boolean; loadingMore: boolean; loadMore: () => void; refresh: () => void;
};

/**
 * Every visible review photo of a place, 60 a page. The key starts with the place's review prefix, so saving or deleting a
 * review refreshes it with the reviews; later pages belong to the first page they followed and drop when it reloads.
 */
export function useReviewGallery(placeId: string | null): ReviewGallery {
  const member = useMember(), key = placeId ? "place-reviews:" + placeId + ":gallery:" + (member.userId ?? "guest") : null;
  const remote = useRemote(key, signal => reviewGallery(galleryPath(placeId ?? ""), signal)), first = remote.data;
  const [extra, setExtra] = useState<{ base: ReviewGalleryPage; items: ReviewGalleryPhoto[]; nextCursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false), [moreError, setMoreError] = useState("");
  const latest = useRef(first), request = useRef<AbortController | null>(null);
  useEffect(() => { latest.current = first; }, [first]);
  useEffect(() => () => request.current?.abort(), []);
  const page = extra?.base === first ? extra : null, cursor = page ? page.nextCursor : first?.nextCursor ?? null;
  const items = first ? [...first.items, ...(page?.items ?? [])] : [];
  const loadMore = () => {
    if (!placeId || !first || !cursor || loadingMore) return;
    const base = first, controller = new AbortController();
    request.current = controller; setLoadingMore(true); setMoreError("");
    reviewGallery(galleryPath(placeId, cursor), controller.signal).then(next => {
      if (controller.signal.aborted || latest.current !== base) return;
      setExtra(previous => {
        const seen = new Set([...base.items, ...(previous?.base === base ? previous.items : [])].map(item => item.url));
        return { base, items: [...(previous?.base === base ? previous.items : []), ...next.items.filter(item => !seen.has(item.url))], nextCursor: next.nextCursor };
      });
    }).catch(problem => { if (!controller.signal.aborted) setMoreError(problem instanceof ApiError ? problem.message : "load"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingMore(false); });
  };
  const error = remote.error ? (remote.error.code === "LOAD_FAILED" ? "load" : remote.error.message) : "";
  return { items, total: first?.total ?? 0, loading: remote.loading && !first, error, moreError, hasMore: !!cursor, loadingMore, loadMore, refresh: remote.refresh };
}
