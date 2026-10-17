import { useState } from "react";
import { useAuth } from "../state/Auth";
import { useRemote } from "./useRemote";
import { communityRequest } from "../services/community-api";
import type { PlaceReviewSummary } from "../types/place-reviews";

type Summaries = { items: PlaceReviewSummary[] };
/**
 * Batch public ratings for the visible catalogue; isolated by the actual signed-in account.
 * While a new set of places loads (Load More, filter changes), the previous ratings stay visible.
 */
export function usePlaceReviewSummaries(ids: string[], enabled = true) {
  const { user } = useAuth(), account = user?.id ?? "guest", chosen = [...new Set(ids)].slice(0, 160).sort().join(",");
  const key = enabled && chosen ? "place-review-summaries:" + account + ":" + chosen : null;
  const remote = useRemote<Summaries>(key, signal => communityRequest<Summaries>("/api/place-reviews/summaries?ids=" + encodeURIComponent(chosen), { signal }));
  const [last, setLast] = useState<{ account: string; data: Summaries }>();
  if (remote.data && (last?.data !== remote.data || last.account !== account)) setLast({ account, data: remote.data });
  const previous = key && last?.account === account ? last.data : undefined;
  return { ...remote, data: remote.data ?? previous };
}
