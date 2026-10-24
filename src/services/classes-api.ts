import { communityRequest as call } from "./community-api";
import type { ClassInput, ClassLine, ClassPerson, CookingClass, Teacher, TeacherApplication } from "../types/community";
export type ClassConversation = { id: string; classId: string; title: string; starts: string; memberId: string; hosting: boolean; updatedAt: string; name: string; last: string | null; unread: boolean };
export const classConversations = (signal: AbortSignal) => call<{ items: ClassConversation[] }>("/api/market/class-conversations", { signal });

/** Cooking classes in Market > Events (server/market/classes.mjs, teaching.mjs). Browsing works for guests; joining, questions and teaching need a member. */
export const classes = (signal: AbortSignal) => call<{ items: CookingClass[] }>("/api/market/classes", { signal });
export const cookingClass = (id: string, signal: AbortSignal) => call<CookingClass>("/api/market/classes/" + id, { signal });
export const myClasses = (signal: AbortSignal) => call<{ items: CookingClass[] }>("/api/market/me/classes", { signal });
export const joinClass = (id: string, join: boolean) => call("/api/market/classes/" + id + (join ? "/join" : "/leave"), { method: "POST" });
/** The chat about one class: a member with the teacher, or (for the teacher) with `member`. */
export const classChatKey = (id: string, member?: string | null) => "/api/market/classes/" + id + "/chat" + (member ? "?member=" + encodeURIComponent(member) : "");
export const classChat = (path: string, signal: AbortSignal) => call<{ items: ClassLine[] }>(path, { signal });
export const sendClassChat = (id: string, body: string, member?: string | null) => call("/api/market/classes/" + id + "/chat", { method: "POST", body: { body, member: member ?? undefined } });
export const teaching = (signal: AbortSignal) => call<{ host: Teacher | null; classes: CookingClass[] }>("/api/market/teaching", { signal });
export const applyToTeach = (input: TeacherApplication) => call<{ host: Teacher }>("/api/market/teaching/apply", { method: "POST", body: input });
export const saveClass = (id: string | null, input: ClassInput, post: boolean) =>
  call<{ id?: string }>(id ? "/api/market/teaching/classes/" + id : "/api/market/teaching/classes", { method: id ? "PUT" : "POST", body: { class: input, post } });
export const cancelClass = (id: string) => call("/api/market/teaching/classes/" + id + "/cancel", { method: "POST" });
export const deleteClass = (id: string) => call("/api/market/teaching/classes/" + id, { method: "DELETE" });
export const classPeople = (id: string, signal: AbortSignal) => call<{ items: ClassPerson[] }>("/api/market/teaching/classes/" + id + "/people", { signal });
export const removeSeat = (id: string, userId: string) => call("/api/market/teaching/classes/" + id + "/seats/" + userId, { method: "DELETE" });
