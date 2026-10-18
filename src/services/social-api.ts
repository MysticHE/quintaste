import { communityRequest as call } from "./community-api";
import type { Gathering, GatheringInput, Group, HostApplication, Person, SocialProfile, Unread } from "../types/community";
import type { MeetFilters } from "../types/meet";

export const me = (signal: AbortSignal) => call<{ id: string; accountName: string; profile: SocialProfile }>("/api/social/me", { signal });
export const saveProfile = (profile: SocialProfile) => call<{ profile: SocialProfile }>("/api/social/me", { method: "PUT", body: { profile } });
export function peopleKey(q: string, f: MeetFilters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (f.diet !== "All") params.set("diet", f.diet);
  if (f.time !== "Any") params.set("time", f.time);
  if (f.prefers !== "Any") params.set("prefers", String(f.prefers));
  if (f.fivePungentFree) params.set("fivePungentFree", "1");
  return "/api/social/people?" + params.toString();
}
export const people = (path: string, signal: AbortSignal) => call<{ items: Person[] }>(path, { signal });
export const person = (id: string, signal: AbortSignal) => call<Person>("/api/social/people/" + id, { signal });
export const groups = (signal: AbortSignal) => call<{ items: Group[] }>("/api/social/groups", { signal });
export const group = (id: string, signal: AbortSignal) => call<Group>("/api/social/groups/" + id, { signal });
export const invite = (personId: string, size: number, intro: string) => call<{ id: string }>("/api/social/groups", { method: "POST", body: { personId, size, intro } });
export const respond = (id: string, accept: boolean) => call("/api/social/groups/" + id + "/respond", { method: "POST", body: { accept } });
export const addPerson = (id: string, personId: string) => call("/api/social/groups/" + id + "/invite", { method: "POST", body: { personId } });
export const sendMessage = (id: string, text: string) => call("/api/social/groups/" + id + "/messages", { method: "POST", body: { text } });
export const plan = (id: string, body: { venue: string; starts: string; food: string; pay: string }) => call("/api/social/groups/" + id + "/plan", { method: "POST", body });
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
export const report = (body: { kind: "person" | "listing" | "place" | "recipe"; targetId: string; reason: string; details: string; block?: boolean }) =>
  call<{ reference: string }>("/api/community/reports", { method: "POST", body });
