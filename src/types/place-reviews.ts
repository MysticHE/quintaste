export type PlaceReview = {
  id: string; rating: number; body: string; name: string; createdAt: string; updatedAt: string; photos?: string[];
  state?:string;message?:string;workId?:string;
};
export type PlaceReviewSummary = { id: string; count: number; rating: number | null };
export type ReviewSort = "newest" | "photos" | "highest" | "lowest";
export type PlaceReviewsPage = {
  placeId: string; rating: number | null; count: number; distribution: number[];
  mine: PlaceReview | null; items: PlaceReview[]; nextCursor: string | null;
  pending?:PlaceReview|null;
};
/** One review photo with its review's author, stars and opening words (GET /api/place-reviews/:id/gallery). */
export type ReviewGalleryPhoto = { url: string; reviewId: string; name: string; rating: number; body: string; createdAt: string };
export type ReviewGalleryPage = { total: number; items: ReviewGalleryPhoto[]; nextCursor: string | null };
