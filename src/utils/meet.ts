import { hostDeclarations, shownPractices } from "../types/meet";
import { dietLabels, type DietLabel } from "../config/diet-labels";
import { translate, type Language } from "../i18n";
import type { GatheringInput, Group, GroupMember, HostApplication, SocialProfile } from "../types/community";
import { formatSgText, parseSgDateTime, planDateProblem } from "./sg-datetime";

const say = (language: Language, key: Parameters<typeof translate<"social">>[2], vars?: Record<string, string | number>) => translate(language, "social", key, vars);
/** A diet label's name in the interface language, for text built outside React. */
export const dietName = (language: Language, label: DietLabel) =>
  translate(language, "diet", label === "Vegan" ? "nameVegan" : label === "Vegetarian" ? "nameVegetarian" : "namePlantBased");
/** What Open to plans needs from the profile itself; age comes from the account's date-of-birth check. */
export const profileChecklist = (p: SocialProfile, language: Language = "en") => [
  { label: say(language, "checkFirstName"), done: !!p.firstName.trim() }, { label: say(language, "checkNeighbourhood"), done: !!p.area.trim() },
  { label: say(language, "checkTimes"), done: p.times.length > 0 },
];
export const profileReady = (p?: SocialProfile) => !!p && profileChecklist(p).every(step => step.done);
const active = (m: GroupMember) => m.status === "invited" || m.status === "accepted";
const others = (g: Group) => g.members.filter(m => !m.isMe);
/** Named after everyone else; people who declined or left keep the name so a group never collapses to "Your group". */
export function groupName(g: Group, language: Language = "en") {
  if (g.listed && g.place) return g.place.name;
  const names = (list: GroupMember[]) => list.map(m => m.name).join(say(language, "listSep"));
  return names(others(g).filter(active)) || names(others(g)) || say(language, "yourGroup");
}
export const acceptedCount = (g: Group) => g.members.filter(m => m.status === "accepted").length;
export const reservedCount = (g: Group) => g.members.filter(active).length;
export const groupFull = (g: Group) => acceptedCount(g) === g.size;
export const planAt = (g: { starts: string | null }) => g.starts ? parseSgDateTime(g.starts) : null;
export const isPast = (g: { starts: string | null }, now: number) => { const at = planAt(g); return at !== null && at <= now; };
export const chatOpen = (g: Group) => g.myStatus === "accepted" && acceptedCount(g) >= 2;
export type GroupStatus = { label: string; section: "needs" | "upcoming" | "waiting" | "past" | "closed"; tone: "accent" | "muted" | "warning" | "success" };
/** The single state machine behind Inbox, My plans and Chat; labels are short enough for a status pill. */
export function groupStatus(g: Group, now: number, language: Language = "en"): GroupStatus {
  const status = (key: Parameters<typeof say>[1], section: GroupStatus["section"], tone: GroupStatus["tone"], vars?: Record<string, number>) => ({ label: say(language, key, vars), section, tone });
  if (g.myStatus === "left" || g.myStatus === "declined") return status("statusClosed", "closed", "muted");
  if (g.myStatus === "invited") return g.expired ? status("expired", "closed", "muted") : status("invitation", "needs", "accent");
  if (g.afterMeal) return status("statusHowWas", "needs", "accent");
  if (g.venue && isPast(g, now)) return status("past", "past", "muted");
  if (!others(g).some(active)) return others(g).some(m => m.status === "left") ? status("statusEnded", "past", "muted") : status("statusDeclined", "needs", "warning");
  if (acceptedCount(g) < 2) return status("invited", "waiting", "muted");
  if (!g.venue) return status("statusMakePlan", "needs", "accent");
  const confirmed = g.members.filter(m => m.confirmed).length;
  if (confirmed === g.size) return status("confirmed", "upcoming", "success");
  if (!g.members.find(m => m.isMe)?.confirmed) return groupFull(g) ? status("statusConfirm", "needs", "warning")
    : status("statusJoinedOf", "upcoming", "accent", { n: acceptedCount(g), size: g.size });
  return status("statusInOf", "upcoming", "accent", { n: confirmed, size: g.size });
}
/** Shared needs, grouped so each diet, practice and ingredient appears once with the people it applies to. */
export function tableNeeds(g: Group, language: Language = "en") {
  const sep = say(language, "listSep"), members = g.members.filter(m => m.status === "accepted").map(m => ({ ...m, name: m.isMe ? say(language, "you") : m.name }));
  const grouped = (pick: (m: GroupMember) => readonly string[] | null, show: (item: string) => string = item => item) => {
    const map = new Map<string, string[]>();
    for (const m of members) for (const item of pick(m) ?? []) map.set(item, [...(map.get(item) ?? []), m.name]);
    return [...map].map(([item, who]) => say(language, "needsWho", { item: show(item), who: who.join(sep) }));
  };
  const diets = dietLabels.map(d => [d, members.filter(m => m.diets?.includes(d)).length] as const).filter(([, n]) => n).map(([d, n]) => dietName(language, d) + " ×" + n);
  const avoid = grouped(m => m.excluded, item => say(language, "optIngredient", { value: item }));
  const practices = grouped(m => m.practices ? shownPractices(m.practices) : m.practices, item => say(language, "optPractice", { value: item }));
  return { diet: diets.join(" · "), detail: [...practices, ...(avoid.length ? [say(language, "needsAvoid", { list: avoid.join(sep) })] : [])].join(" · ") };
}
export const overlap = (mine: readonly string[], theirs: readonly string[]) => theirs.filter(time => mine.includes(time));
export function planShareText(g: Group, language: Language = "en") {
  return [say(language, "foodPlan"), g.venue, formatSgText(g.starts, language), say(language, "groupOf", { n: g.size }) + " · " + say(language, "optPay", { value: g.pay })]
    .filter(Boolean).join("\n");
}
export function gatheringIssue(g: GatheringInput, now: number, publish: boolean, language: Language = "en") {
  if (!g.title.trim()) return say(language, "issueTitle");
  if (!Number.isInteger(g.seats) || g.seats < 2 || g.seats > 30) return say(language, "issueSeats");
  if (g.starts && parseSgDateTime(g.starts) === null) return say(language, "dateIssueInvalid");
  if (publish && (!g.area.trim() || !g.venue.trim())) return say(language, "issuePlace");
  const problem = publish ? planDateProblem(g.starts, now) : null;
  return problem ? say(language, problem) : null;
}
export function applicationIssue(a: HostApplication, language: Language = "en") {
  if (!a.name.trim()) return say(language, "issueHostName");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) return say(language, "issueEmail");
  if (![a.area, a.experience, a.menu, a.ingredients, a.details].every(v => v.trim())) return say(language, "issueDetails");
  if (!a.premises || !/^\d+$/.test(a.capacity) || +a.capacity < 1) return say(language, "issuePremises");
  if (!a.halal) return say(language, "issueHalal");
  if (hostDeclarations.some(d => !a.declarations.includes(d))) return say(language, "issueDeclarations");
  return !a.consent ? say(language, "issueConsent") : null;
}
/** HDB home classes and dining are commonly limited to small numbers; flag larger sessions for review. */
export const largeHdbSession = (a: HostApplication) => a.premises === "HDB flat" && +a.capacity > 3;
const outdoor = /void deck|\bpark\b|\bbbq\b|barbecue|\bbeach\b/i;
export const outdoorVenue = (venue: string) => outdoor.test(venue);
