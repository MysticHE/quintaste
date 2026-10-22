import { communityRequest as call } from "./community-api";
import type { Gathering, GatheringInput, Group, HostApplication, Kaki, KakiSay, NearbyArea, Person, SocialPlace, SocialProfile, Table, TableInput, Unread } from "../types/community";
import type { MeetFilters } from "../types/meet";

export const me = (signal: AbortSignal) => call<{ id: string; accountName: string; profile: SocialProfile }>("/api/social/me", { signal });
export const saveProfile = (profile: SocialProfile) => call<{ profile: SocialProfile; paused: boolean }>("/api/social/me", { method: "PUT", body: { profile } });
export function peopleKey(q: string, f: MeetFilters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (f.diets.length) params.set("diets", f.diets.join(","));
  if (f.time !== "Any") params.set("time", f.time);
  if (f.prefers !== "Any") params.set("prefers", String(f.prefers));
  if (f.hereFor !== "Any") params.set("hereFor", f.hereFor);
  for (const key of ["religions", "languages", "hobbies", "ages"] as const) if (f[key].length) params.set(key, f[key].join(","));
  if (f.sameArea) params.set("sameArea", "1");
  return "/api/social/people?" + params.toString();
}
export const faceUrl = (id: string) => "/api/social/faces/" + encodeURIComponent(id);
export const saveFace = (image: string) => call<{ hasFace: boolean }>("/api/social/me/face", { method: "PUT", body: { image } });
export const removeFace = () => call<{ hasFace: boolean }>("/api/social/me/face", { method: "DELETE" });
export const placesKey = (q: string) => "/api/social/places?q=" + encodeURIComponent(q.trim());
export const placesByIdKey = (ids: readonly string[]) => ids.length ? "/api/social/places?ids=" + ids.map(encodeURIComponent).join(",") : null;
export const places = (path: string, signal: AbortSignal) => call<{ items: SocialPlace[] }>(path, { signal });
export const nearby = (signal: AbortSignal) => call<{ areas: NearbyArea[] }>("/api/social/nearby", { signal });
export const kakis = (signal: AbortSignal) => call<{ items: Kaki[] }>("/api/social/kakis", { signal });
export const repeat = (signal: AbortSignal) => call<{ items: Kaki[] }>("/api/social/repeat", { signal });
export const kakiSays = (signal: AbortSignal) => call<{ items: KakiSay[] }>("/api/social/me/kaki-says", { signal });
export const showKakiSay = (id: string, shown: boolean) => call("/api/social/me/kaki-says/" + id, { method: "PUT", body: { shown } });
export const deleteKakiSay = (id: string) => call("/api/social/me/kaki-says/" + id, { method: "DELETE" });
export function tablesKey(q: string, filters: { area?: string | null; day?: "today" | "week" | "weekend" | null; place?: string | null } = {}) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (filters.area) params.set("area", filters.area);
  if (filters.day) params.set("day", filters.day);
  if (filters.place) params.set("place", filters.place);
  return "/api/social/tables?" + params.toString();
}
export const tables = (path: string, signal: AbortSignal) => call<{ items: Table[] }>(path, { signal });
export const table = (id: string, signal: AbortSignal) => call<Table>("/api/social/tables/" + id, { signal });
export const startTable = (input: TableInput) => call<{ id: string }>("/api/social/tables", { method: "POST", body: { table: input } });
export const openSeat = (id: string) => call("/api/social/tables/" + id + "/open-seat", { method: "POST" });
export const joinTable = (id: string, kakiId: string | null) => call("/api/social/tables/" + id + "/join", { method: "POST", body: { kakiId } });
export const suggest = (id: string, starts: string) => call("/api/social/groups/" + id + "/suggest", { method: "POST", body: { starts } });
export const attend = (id: string, body: { attended: "yes" | "no" | "changed"; eatAgain: string[]; missing: string[]; says: Record<string, string> }) =>
  call<{ recorded: boolean; paused: boolean }>("/api/social/groups/" + id + "/attend", { method: "POST", body });
export type InviteOffer = { placeId: string; starts: string; pay: string; areaCode: string | null };
export const people = (path: string, signal: AbortSignal) => call<{ items: Person[] }>(path, { signal });
export const person = (id: string, signal: AbortSignal) => call<Person>("/api/social/people/" + id, { signal });
export const groups = (signal: AbortSignal) => call<{ items: Group[] }>("/api/social/groups", { signal });
export const group = (id: string, signal: AbortSignal) => call<Group>("/api/social/groups/" + id, { signal });
export const invite = (personId: string, size: number, intro: string, offer: InviteOffer | null = null, kakiId: string | null = null) =>
  call<{ id: string }>("/api/social/groups", { method: "POST", body: { personId, size, intro, offer, kakiId } });
export const respond = (id: string, accept: boolean) => call("/api/social/groups/" + id + "/respond", { method: "POST", body: { accept } });
export const addPerson = (id: string, personId: string) => call("/api/social/groups/" + id + "/invite", { method: "POST", body: { personId } });
export const sendMessage = (id: string, text: string) => call("/api/social/groups/" + id + "/messages", { method: "POST", body: { text } });
export const plan = (id: string, body: { venue: string; starts: string; food: string; pay: string; placeId?: string | null; areaCode?: string | null }) => call("/api/social/groups/" + id + "/plan", { method: "POST", body });
export const confirm = (id: string) => call("/api/social/groups/" + id + "/confirm", { method: "POST" });
export const leave = (id: string) => call("/api/social/groups/" + id + "/leave", { method: "POST" });
export const removeGroup = (id: string) => call("/api/social/groups/" + id, { method: "DELETE" });
export const markRead = (id: string) => call("/api/social/groups/" + id + "/read", { method: "POST" });
export const unread = (signal: AbortSignal) => call<Unread>("/api/social/unread", { signal });
export const gatherings = (q: string, signal: AbortSignal) => call<{ items: Gathering[] }>("/api/social/gatherings" + (q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""), { signal });
export const myGatherings = (signal: AbortSignal) => call<{ items: Gathering[] }>("/api/social/gatherings/mine", { signal });
export const gathering = (id: string, signal: AbortSignal) => call<Gathering>("/api/social/gatherings/" + id, { signal });
export const saveGathering = (id: string | null, gathering: GatheringInput, post: boolean) =>
  call<{ id: string }>(id ? "/api/social/gatherings/" + id : "/api/social/gatherings", { method: id ? "PUT" : "POST", body: { gathering, post } });
export const cancelGathering = (id: string) => call("/api/social/gatherings/" + id + "/cancel", { method: "POST" });
export const deleteGathering = (id: string) => call("/api/social/gatherings/" + id, { method: "DELETE" });
export const joinGathering = (id: string, join: boolean) => call("/api/social/gatherings/" + id + (join ? "/join" : "/leave"), { method: "POST" });
export const applications = (signal: AbortSignal) => call<{ items: HostApplication[] }>("/api/social/applications", { signal });
export const saveApplication = (id: string | null, application: HostApplication, submit: boolean) =>
  call<{ id: string; state: string }>(id ? "/api/social/applications/" + id : "/api/social/applications", { method: id ? "PUT" : "POST", body: { application, submit } });
export const deleteApplication = (id: string) => call("/api/social/applications/" + id, { method: "DELETE" });
export const blocks = (signal: AbortSignal) => call<{ items: { id: string; name: string; createdAt: string }[] }>("/api/community/blocks", { signal });
export const block = (userId: string) => call("/api/community/blocks", { method: "POST", body: { userId } });
export const unblock = (userId: string) => call("/api/community/blocks/" + userId, { method: "DELETE" });
export const report = (body: { kind: "person" | "listing" | "place" | "recipe" | "level"; targetId: string; reason: string; details: string; block?: boolean }) =>
  call<{ reference: string }>("/api/community/reports", { method: "POST", body });
