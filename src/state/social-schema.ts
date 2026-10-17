import { readMeet, mergeMeet } from "./meet-schema";
import { marketIngredients, type MarketIngredient } from "../config/market-ingredients";
import { socialPerson, socialTemplates } from "../data/social";
import { ageBands, socialKinds, socialLanguages, emptySocial, emptySocialProfile, type SocialDocument, type SocialProfile, type HostDraft } from "../types/social";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, n = 100) => typeof v === "string" ? v.slice(0, n).trim() : "";
const finite = (v: unknown, fallback = 0) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
const eventId = (v: unknown) => socialTemplates.some(item => item.id === v);
const personId = (v: unknown) => !!socialPerson(String(v));
function rows(v: unknown, max: number) { if (!Array.isArray(v)) return []; if (v.length > max) throw new Error("Your social collection is full. Remove an older item first."); return v.map(record); }
function tags(v: unknown): MarketIngredient[] { return Array.isArray(v) ? marketIngredients.filter(tag => v.includes(tag)) : []; }
function unique<T>(items: T[], key: (item: T) => string) { const seen = new Set<string>(); return items.filter(item => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; }); }
export function readSocialProfile(value: unknown): SocialProfile {
  const p = record(value), base = emptySocialProfile();
  return { ...base, firstName: text(p.firstName, 40), diet: p.diet === "Vegetarian" ? "Vegetarian" : "Vegan",
    ageBand: ageBands.find(age => age === p.ageBand) ?? "", languages: socialLanguages.filter(language => Array.isArray(p.languages) && p.languages.includes(language)),
    interests: Array.isArray(p.interests) ? [...new Set(p.interests.filter((item): item is string => typeof item === "string").map(item => item.trim().slice(0, 30)).filter(Boolean))].slice(0, 5) : [],
    excluded: tags(p.excluded), budget: [20, 35, 100].includes(finite(p.budget)) ? p.budget as number : 35,
    adult: p.adult === true, womenEligible: p.womenEligible === true };
}
export function readHostDraft(value: unknown): HostDraft {
  const d = record(value);
  return { id: text(d.id, 80), title: text(d.title, 80), organisation: text(d.organisation, 80), area: text(d.area, 60), venue: text(d.venue, 160),
    starts: text(d.starts, 16), capacity: text(d.capacity, 2), price: text(d.price, 6), menu: text(d.menu, 2000), ingredients: text(d.ingredients, 5000),
    cancellation: text(d.cancellation, 1000), diet: d.diet === "Vegetarian" ? "Vegetarian" : "Vegan", updatedAt: finite(d.updatedAt) };
}
export function readSocial(value: unknown): SocialDocument {
  const v = record(value), base = emptySocial(), filters = record(v.filters);
  const slots = unique(rows(v.slots, 10).filter(item => eventId(item.eventId) && finite(item.startsAt) > 0 && finite(item.endsAt) > finite(item.startsAt))
    .map(item => ({ eventId: String(item.eventId), startsAt: finite(item.startsAt), endsAt: finite(item.endsAt), cancelled: item.cancelled === true })), item => item.eventId);
  const bookedIds = new Set(slots.map(slot => slot.eventId));
  const bookings = unique(rows(v.bookings, 50).filter(item => bookedIds.has(String(item.eventId)) && ["reserved", "checked-in", "completed", "cancelled", "no-show"].includes(String(item.status)))
    .map(item => ({ eventId: String(item.eventId), status: item.status as SocialDocument["bookings"][number]["status"], createdAt: finite(item.createdAt), reason: text(item.reason, 160),
      creditCents: Math.max(0, Math.min(50000, finite(item.creditCents))), homeSafe: item.homeSafe === true, rating: [1, 2, 3, 4, 5].includes(finite(item.rating)) ? item.rating as number : 0, review: text(item.review, 1000) })), item => item.eventId);
  const shared = (id: unknown, event: unknown) => personId(id) && bookings.some(item => item.eventId === event && item.status === "completed") && socialTemplates.some(item => item.id === event && item.guests.includes(String(id)));
  const blocked = Array.isArray(v.blocked) ? [...new Set(v.blocked.filter((id): id is string => typeof id === "string" && personId(id)))] : [];
  return { ...base, network: readMeet(v.network ?? { blocked, profile: { name: record(v.profile).firstName, diet: record(v.profile).diet, adult: record(v.profile).adult, excluded: record(v.profile).excluded, interests: record(v.profile).interests, visible: false } }), profile: readSocialProfile(v.profile), rulesAccepted: v.rulesAccepted === true, slots, bookings, blocked,
    filters: { kind: socialKinds.find(kind => kind === filters.kind) ?? "All", diet: filters.diet === "Vegan" || filters.diet === "Vegetarian" ? filters.diet : "All",
      maxPrice: [20, 35, 50].includes(finite(filters.maxPrice)) ? filters.maxPrice as number : null, excluded: tags(filters.excluded) },
    marks: unique(rows(v.marks, 100).filter(item => shared(item.personId, item.eventId) && ["Kaki", "Pass"].includes(String(item.choice)))
      .map(item => ({ eventId: String(item.eventId), personId: String(item.personId), choice: item.choice as "Kaki" | "Pass", reciprocal: item.reciprocal === true && !blocked.includes(String(item.personId)) })), item => item.eventId + item.personId),
    connections: unique(rows(v.connections, 50).filter(item => shared(item.personId, item.eventId) && ["pending", "connected", "ended"].includes(String(item.status)))
      .map(item => ({ eventId: String(item.eventId), personId: String(item.personId), status: blocked.includes(String(item.personId)) ? "ended" as const : item.status as SocialDocument["connections"][number]["status"] })), item => item.personId),
    messages: unique(rows(v.messages, 300).filter(item => text(item.id) && text(item.text, 1000) && (bookedIds.has(String(item.threadId)) || (String(item.threadId).startsWith("friend-") && personId(String(item.threadId).slice(7)))))
      .map(item => ({ id: text(item.id), threadId: text(item.threadId), text: text(item.text, 1000), createdAt: finite(item.createdAt) })), item => item.id),
    reports: unique(rows(v.reports, 50).filter(item => text(item.id) && personId(item.personId) && text(item.reason))
      .map(item => ({ id: text(item.id), personId: String(item.personId), reason: text(item.reason, 80), text: text(item.text, 1000), createdAt: finite(item.createdAt) })), item => item.id),
    drafts: unique(rows(v.drafts, 30).map(readHostDraft).filter(item => item.id && item.title), item => item.id),
  };
}
export function mergeSocial(profile: SocialDocument, guest: SocialDocument): SocialDocument {
  const incoming = guest.slots.filter(slot => !profile.slots.some(item => item.eventId === slot.eventId)).map(slot => slot.eventId);
  const people = guest.connections.filter(item => incoming.includes(item.eventId)).map(item => item.personId);
  return readSocial({ ...profile, network: mergeMeet(profile.network, guest.network), slots: [...profile.slots, ...guest.slots.filter(slot => incoming.includes(slot.eventId))],
    bookings: [...profile.bookings, ...guest.bookings.filter(item => incoming.includes(item.eventId))],
    marks: [...profile.marks, ...guest.marks.filter(item => incoming.includes(item.eventId))],
    connections: [...profile.connections, ...guest.connections.filter(item => incoming.includes(item.eventId))],
    messages: [...profile.messages, ...guest.messages.filter(item => incoming.includes(item.threadId) || people.some(id => item.threadId === "friend-" + id))],
    blocked: [...profile.blocked, ...guest.blocked], reports: unique([...profile.reports, ...guest.reports], item => item.id), drafts: unique([...profile.drafts, ...guest.drafts], item => item.id) });
}
