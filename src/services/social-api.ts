import { communityRequest as call } from "./community-api";
import type { Badges, ChatLine, Dinner, DinnerDetail, DinnerPay, Friends, HandleMatch, Met, Person, PersonPage, PersonWithPosts, SocialMe, SocialPhoto, SocialPlace, SocialProfile, Standing } from "../types/community";
import type { MeetFilters } from "../types/meet";
import type { SearchPoint } from "../types/location-search";

/** Social on the account (server/social). Every call needs a signed-in, age-checked member; People, friends, chat and dinners also need 21+ and a checked photo. */
export const me = (signal: AbortSignal) => call<SocialMe>("/api/social/me", { signal });
/** Saves the profile; Basics also sends the handle, which the server changes in the same save (409 HANDLE_TAKEN when someone has it). */
export const saveProfile = (profile: SocialProfile, handle?: string) =>
  call<{ profile: SocialProfile; standing: Standing }>("/api/social/me", { method: "PUT", body: handle === undefined ? { profile } : { profile, handle } });
export const handleCheckKey = (handle: string) => "/api/social/handles/check?handle=" + encodeURIComponent(handle);
export const checkHandle = (handle: string, signal: AbortSignal) => call<{ handle: string; valid: boolean; available: boolean }>(handleCheckKey(handle), { signal });
/** Add friend: people whose handle contains `q` (typed without @). */
export const findKey = (q: string) => "/api/social/people/find?q=" + encodeURIComponent(q);
export const findPeople = (q: string, signal: AbortSignal) => call<{ items: HandleMatch[] }>(findKey(q), { signal });
type Photos = { photos: SocialPhoto[]; standing: Standing };
/** One photo per request (the edge caps request size); added after the last, up to six. */
export const addPhoto = (image: string) => call<Photos>("/api/social/me/photos", { method: "POST", body: { image } });
export const orderPhotos = (ids: string[]) => call<Photos>("/api/social/me/photos/order", { method: "PUT", body: { ids } });
export const removePhoto = (id: string) => call<Photos>("/api/social/me/photos/" + id, { method: "DELETE" });
export const verifyState = (signal: AbortSignal) => call<{ pose: string | null; standing: Standing }>("/api/social/me/verify", { signal });
export const newPose = () => call<{ pose: string }>("/api/social/me/verify/pose", { method: "POST" });
export const sendSelfie = (selfie: string, pose: string) => call<{ standing: Standing }>("/api/social/me/verify", { method: "POST", body: { selfie, pose } });

export function peopleKey(q: string, f: MeetFilters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  for (const key of ["diets", "ages", "languages", "hobbies"] as const) if (f[key].length) params.set(key, f[key].join(","));
  if (f.km) params.set("km", String(f.km));
  return "/api/social/people?" + params.toString();
}
export const people = (path: string, signal: AbortSignal) => call<{ items: Person[]; canAppear: boolean }>(path, { signal });
export const person = (id: string, signal: AbortSignal) => call<PersonPage>("/api/social/people/" + id, { signal });
/** The person with their posts and friend count, for their profile page. */
export const personPageKey = (id: string) => "/api/social/people/" + id + "?posts=1";
export const personWithPosts = (id: string, signal: AbortSignal) => call<PersonWithPosts>(personPageKey(id), { signal });

export const badges = (signal: AbortSignal) => call<Badges>("/api/social/badges", { signal });
export const friends = (signal: AbortSignal) => call<Friends>("/api/social/friends", { signal });
export const requestFriend = (userId: string, note: string) => call<{ id?: string; friends?: true }>("/api/social/friends/requests", { method: "POST", body: { userId, note } });
export const acceptRequest = (id: string) => call("/api/social/friends/requests/" + id + "/accept", { method: "POST" });
export const declineRequest = (id: string) => call("/api/social/friends/requests/" + id + "/decline", { method: "POST" });
export const cancelRequest = (id: string) => call("/api/social/friends/requests/" + id, { method: "DELETE" });
export const removeFriend = (id: string) => call("/api/social/friends/" + id, { method: "DELETE" });
export const chatKey = (id: string) => "/api/social/chats/" + id;
export const chat = (id: string, signal: AbortSignal) => call<{ items: ChatLine[]; more: boolean }>(chatKey(id), { signal });
export const sendChat = (id: string, body: string) => call<{ id: string; createdAt: string }>(chatKey(id), { method: "POST", body: { body } });

/** `met`: every dinner the member reported going to (the profile's Dinners count). */
export const dinners = (signal: AbortSignal) => call<{ upcoming: Dinner[]; past: Dinner[]; met: number }>("/api/social/dinners", { signal });
export const dinner = (id: string, signal: AbortSignal) => call<DinnerDetail>("/api/social/dinners/" + id, { signal });
export type DinnerInput = { userId: string; placeId: string; starts: string; pay: DinnerPay; message: string };
export const inviteDinner = (input: DinnerInput) => call<{ id: string }>("/api/social/dinners", { method: "POST", body: input });
export const acceptDinner = (id: string) => call("/api/social/dinners/" + id + "/accept", { method: "POST" });
/** A new time, a new place, or both (leave one empty to keep it). */
export const suggestDinner = (id: string, change: { starts?: string; placeId?: string }) => call("/api/social/dinners/" + id + "/suggest", { method: "POST", body: change });
/** Twin of `lateMinutes` in server/social/dinners.mjs, which refuses anything else; change both together. */
export const lateMinutes = [10, 20, 30] as const;
/** Running late on the day: a line in the chat saying how late. */
export const lateDinner = (id: string, minutes: typeof lateMinutes[number]) => call("/api/social/dinners/" + id + "/late", { method: "POST", body: { minutes } });
export const declineDinner = (id: string) => call("/api/social/dinners/" + id + "/decline", { method: "POST" });
export const cancelDinner = (id: string) => call("/api/social/dinners/" + id + "/cancel", { method: "POST" });
export const reportDinner = (id: string, body: { met: Met; eatAgain: boolean | null; note: string }) => call("/api/social/dinners/" + id + "/report", { method: "POST", body });

/**
 * Name search (`q`) and/or nearest-first places: to `near` (rounded to about 100 m so no exact address leaves the phone), or halfway
 * to a friend (`withId`, worked out on the server from both areas).
 */
export const placesKey = (q: string, near?: SearchPoint | null, withId?: string) => "/api/social/places?q=" + encodeURIComponent(q.trim())
  + (withId ? "&with=" + encodeURIComponent(withId) : near ? "&near=" + near.latitude.toFixed(3) + "," + near.longitude.toFixed(3) : "");
export const placesByIdKey = (ids: readonly string[]) => ids.length ? "/api/social/places?ids=" + ids.map(encodeURIComponent).join(",") : null;
export const places = (path: string, signal: AbortSignal) => call<{ items: SocialPlace[] }>(path, { signal });
export const blocks = (signal: AbortSignal) => call<{ items: { id: string; name: string; createdAt: string }[] }>("/api/community/blocks", { signal });
export const block = (userId: string) => call("/api/community/blocks", { method: "POST", body: { userId } });
export const unblock = (userId: string) => call("/api/community/blocks/" + userId, { method: "DELETE" });
export const report = (body: { kind: "person" | "listing" | "place" | "recipe" | "level" | "cafe"; targetId: string; reason: string; details: string; block?: boolean }) =>
  call<{ reference: string }>("/api/community/reports", { method: "POST", body });
