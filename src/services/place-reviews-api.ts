import { communityRequest as call } from "./community-api";
import type { PlaceReviewsPage, ReviewGalleryPage, ReviewSort } from "../types/place-reviews";

const root = (id: string) => "/api/place-reviews/" + encodeURIComponent(id);
export const reviewsPath = (id: string, sort: ReviewSort, cursor?: string,reviewId?:string) => root(id) + "?" + new URLSearchParams({ sort, ...(cursor ? { cursor } : {}),...(reviewId?{reviewId}:{}) }).toString();
export const placeReviews = (path: string, signal?: AbortSignal) => call<PlaceReviewsPage>(path, { signal });
export const savePlaceReview = (id: string, rating: number, body: string, photos?: string[],submissionKey?:string) => call<{workId:string;state:string}>(root(id) + "/me", { method: "PUT", body: { rating, body,submissionKey, ...(photos === undefined ? {} : { photos }) } });
export const deletePlaceReview = (id: string) => call(root(id) + "/me", { method: "DELETE" });
export const reportPlaceReview = (id: string, reviewId: string, reason: string, details: string) => call<{ reference: string }>(root(id) + "/" + reviewId + "/report", { method: "POST", body: { reason, details } });
export const galleryPath = (id: string, cursor?: string) => root(id) + "/gallery" + (cursor ? "?" + new URLSearchParams({ cursor }).toString() : "");
export const reviewGallery = (path: string, signal?: AbortSignal) => call<ReviewGalleryPage>(path, { signal });
/** The 480 px square of a review photo, for grid tiles. */
export const thumbPath = (url: string) => url + (url.includes("?") ? "&" : "?") + "size=thumb";
