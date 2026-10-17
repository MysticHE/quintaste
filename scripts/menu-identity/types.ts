import type { MenuLead } from "../menu-research-types";

export const IDENTITY_FIELDS = "id,displayName,formattedAddress,location,types,businessStatus,googleMapsUri,attributions";
export const IDENTITY_REQUEST_CAP = 2500;
export type IdentityLead = MenuLead & { leadFile: string; sourceUrls: string[] };
export type TransientPlace = {
  id: string; displayName?: { text?: string }; formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[]; businessStatus?: string; googleMapsUri?: string; attributions?: unknown[];
};
export type IdentityCandidate = {
  placeId: string; observedPlaceId: string; leadId: string; leadFile: string;
  name: string; address: string; sourceUrls: string[]; status: "candidate"; checkedAt: string;
  proof: {
    name: "normalized-exact" | "normalized-branch-alias";
    address: "postal-and-street" | "exact-address";
    unit: "exact" | "absent-in-one-source" | "absent-in-both";
    independentSourceFields: true; reviewRequired: true;
  };
};
export type Resolution = {
  placeId: string; observedPlaceId?: string; queriedAt: string; completedAt: string;
  httpStatus: number | null; requestNumber: number;
  status: "candidate" | "unmatched" | "invalid-response" | "http-error" | "network-error";
  candidates: IdentityCandidate[];
};
export type Reservation = { event: "request"; placeId: string; at: string; number: number };
export type Completion = { event: "complete"; result: Resolution };
export type LedgerEvent = Reservation | Completion;
