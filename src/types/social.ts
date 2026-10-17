import { emptyMeet, type MeetNetwork } from "./meet";
import type { MarketIngredient } from "../config/market-ingredients";
export const socialKinds = ["Kaki", "Women", "Hosted"] as const;
export const ageBands = ["18–24", "25–34", "35–44", "45+"] as const;
export const socialLanguages = ["English", "Mandarin", "Malay", "Tamil"] as const;
export type SocialKind = typeof socialKinds[number];
export type AgeBand = typeof ageBands[number];
export type SocialProfile = {
  firstName: string; diet: "Vegan" | "Vegetarian"; ageBand: AgeBand | "";
  languages: string[]; interests: string[]; excluded: MarketIngredient[];
  budget: number; adult: boolean; womenEligible: boolean;
};
export type SocialDish = { name: string; ingredients: string; contains: MarketIngredient[]; mayContain: MarketIngredient[] };
export type SocialTemplate = {
  id: string; title: string; kind: SocialKind; area: string; photo: "bowl" | "laksa" | "greens";
  diet: "Vegan" | "Vegetarian"; ageBand: AgeBand | "All adults"; language: string;
  guests: string[]; capacity: number; foodCents: number; ticketCents: number;
  host: string; venue: string; menu: SocialDish[];
};
export type SocialSlot = { eventId: string; startsAt: number; endsAt: number; cancelled: boolean };
export type SocialEvent = SocialTemplate & SocialSlot;
export type SocialBooking = {
  eventId: string; status: "reserved" | "checked-in" | "completed" | "cancelled" | "no-show";
  createdAt: number; reason: string; creditCents: number; homeSafe: boolean; rating: number; review: string;
};
export type SocialMark = { eventId: string; personId: string; choice: "Kaki" | "Pass"; reciprocal: boolean };
export type SocialConnection = { personId: string; eventId: string; status: "pending" | "connected" | "ended" };
export type SocialMessage = { id: string; threadId: string; text: string; createdAt: number };
export type SocialReport = { id: string; personId: string; reason: string; text: string; createdAt: number };
export type HostDraft = {
  id: string; organisation: string; title: string; area: string; venue: string; starts: string;
  capacity: string; price: string; menu: string; ingredients: string; cancellation: string;
  diet: "Vegan" | "Vegetarian"; updatedAt: number;
};
export type SocialFilters = { kind: "All" | SocialKind; diet: "All" | "Vegan" | "Vegetarian"; maxPrice: number | null; excluded: MarketIngredient[] };
export type SocialDocument = {
  network: MeetNetwork;
  profile: SocialProfile; rulesAccepted: boolean; slots: SocialSlot[]; bookings: SocialBooking[];
  marks: SocialMark[]; connections: SocialConnection[]; messages: SocialMessage[]; blocked: string[];
  reports: SocialReport[]; drafts: HostDraft[]; filters: SocialFilters;
};
export const emptySocialProfile = (): SocialProfile => ({ firstName: "", diet: "Vegan", ageBand: "", languages: [], interests: [], excluded: [], budget: 35, adult: false, womenEligible: false });
export const defaultSocialFilters = (): SocialFilters => ({ kind: "All", diet: "All", maxPrice: null, excluded: [] });
export const emptySocial = (): SocialDocument => ({ network: emptyMeet(), profile: emptySocialProfile(), rulesAccepted: false, slots: [], bookings: [], marks: [], connections: [], messages: [], blocked: [], reports: [], drafts: [], filters: defaultSocialFilters() });
