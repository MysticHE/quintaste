import { communityRequest as call } from "./community-api";
import type { PlaceReviewsPage, ReviewSort } from "../types/place-reviews";

const root = (id: string) => "/api/place-reviews/" + encodeURIComponent(id);
export const reviewsPath = (id: string, sort: ReviewSort, cursor?: string,reviewId?:string) => root(id) + "?" + new URLSearchParams({ sort, ...(cursor ? { cursor } : {}),...(reviewId?{reviewId}:{}) }).toString();
export const placeReviews = (path: string, signal?: AbortSignal) => call<PlaceReviewsPage>(path, { signal });
export const savePlaceReview = (id: string, rating: number, body: string, photos?: string[],submissionKey?:string) => call<{workId:string;state:string}>(root(id) + "/me", { method: "PUT", body: { rating, body,submissionKey, ...(photos === undefined ? {} : { photos }) } });
export const deletePlaceReview = (id: string) => call(root(id) + "/me", { method: "DELETE" });
export const reportPlaceReview = (id: string, reviewId: string, reason: string, details: string) => call<{ reference: string }>(root(id) + "/" + reviewId + "/report", { method: "POST", body: { reason, details } });
