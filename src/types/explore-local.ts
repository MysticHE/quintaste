export type LocalOwner = "guest" | "profile";
export type ParticipationLayer = "home" | "work";
export type ParticipationCategory = "Vegetarian" | "Vegan";
export type ParticipationAudience = "Kaki Tables" | "All Tables";
export type CaseStatus = "submitted" | "needs-information" | "approved" | "declined";
export type CaseKind = "correction" | "report";
export type MenuChange = {
  action: "add" | "edit" | "remove";
  venueId: string; itemId: string;
  originalName: string; originalPrice: string;
  name: string; price: string; category: string;
};
export type CaseDraft = {
  id: string; placeId: string; target: string; kind: CaseKind; category: string;
  details: string; source: string; observedOn: string; photoUri?: string;
  menuChange?: MenuChange;
  menuVenueId?: string;
  createdAt: number; updatedAt: number; delivery: "draft" | "queued";
};
export type CaseEvent = { status: CaseStatus; reason: string; at: number };
export type CaseReceipt = Omit<CaseDraft, "delivery" | "photoUri"> & {
  caseId: string; reference: string; status: CaseStatus; reason: string;
  revision: number; history: CaseEvent[]; hasPhoto: boolean; reviewer: string;
};
export type CaseDetail = CaseReceipt & { photoUri?: string };
export type AreaParticipation = {
  layer: ParticipationLayer; areaId: string; category: ParticipationCategory;
  audience: ParticipationAudience; joinedAt: number;
};
export type ParticipationSnapshot = {
  home: AreaParticipation | null; work: AreaParticipation | null;
  snapshotAt: number; counts: { layer: ParticipationLayer; count: null; suppressed: true }[];
  mode: "local-development";
};
export type ExploreLocalDocument = {
  drafts: CaseDraft[]; receipts: CaseReceipt[]; labels: Record<string, string>;
  participation: ParticipationSnapshot | null; pendingWithdrawals: ParticipationLayer[];
};
export const emptyExploreLocal = (): ExploreLocalDocument => ({
  drafts: [], receipts: [], labels: {}, participation: null, pendingWithdrawals: [],
});
