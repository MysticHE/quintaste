export type PlaceReview = {
  id: string; rating: number; body: string; name: string; createdAt: string; updatedAt: string; photos?: string[];
};
export type PlaceReviewSummary = { id: string; count: number; rating: number | null };
export type ReviewSort = "newest" | "highest" | "lowest";
export type PlaceReviewsPage = {
  placeId: string; rating: number | null; count: number; distribution: number[];
  mine: PlaceReview | null; items: PlaceReview[]; nextCursor: string | null;
};
