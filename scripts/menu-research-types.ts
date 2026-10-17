export type MenuSource = {
  id: string; url: string; publisher: string; title: string; checkedAt: string; status: string;
};
export type MenuLead = {
  id: string; name: string; address?: string; postalCode?: string; unit?: string;
  merchantUrl?: string; orderUrl?: string; sourceIds: string[];
  placeId?: string; placeIdEvidenceUrl?: string;
  status: "lead" | "merchant-confirmed"; notes?: string;
};
export type MenuMatch = {
  leadId: string; query: string; queriedAt: string;
  fieldMask: "places.id,nextPageToken";
  resultIds: string[]; directoryIds: string[];
  status: "no-match" | "candidate" | "ambiguous";
};
export type MenuCoverageStatus = "identity-pending" | "identity-candidate" | "menu-pending"
  | "source-covered" | "partial" | "menu-unavailable" | "held";
export type MenuEligibility = "vegetarian-confirmed" | "mixed-menu" | "supplier" | "food-court" | "out-of-SG" | "unresolved";
export type MenuCoverageRecord = {
  placeId: string; status: MenuCoverageStatus; leadIds: string[];
  candidateNames: string[]; candidateAddresses: string[];
  name?: string; address?: string; menuRows: number;
  sourceMenuIds?: string[]; menuPublication?: string[];
  identityReviewedAt?: string; identityEvidenceUrls?: string[];
  researchDataset?: string; researchBranchId?: string;
  eligibility?: MenuEligibility; eligibilityReviewedAt?: string; eligibilityEvidenceUrls?: string[];
  researchOutcomeBatch?: string; identityResearchStatus?: string; menuResearchStatus?: string;
  nextAction?: string; researchNotes?: string;
  sourceUrls: string[]; gaps: string[];
};
