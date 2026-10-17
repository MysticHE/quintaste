import type { CaseKind } from "../types/explore-local";
export const correctionTopics = ["Menu", "Address", "Opening hours", "Closed or moved", "Other"] as const;
export const reportTopics = ["Food safety", "Incorrect information", "Spam", "Privacy or harassment", "Other"] as const;
export const participationCategories = ["Vegetarian", "Vegan"] as const;
export const participationAudiences = ["Kaki Tables", "All Tables"] as const;
export const caseStatuses = ["submitted", "needs-information", "approved", "declined"] as const;
export const caseStatusLabel = {
  submitted: "Submitted", "needs-information": "Needs information", approved: "Approved", declined: "Declined",
};
export const caseTopics = (kind: CaseKind) => kind === "report" ? reportTopics : correctionTopics;
export const localPhotoLimit = 512 * 1024;
