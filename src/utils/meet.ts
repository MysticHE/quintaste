import { hostDeclarations, payLabels, shownPractices } from "../types/meet";
import { dietLabels } from "../config/diet-labels";
import type { GatheringInput, Group, GroupMember, HostApplication, SocialProfile } from "../types/community";
import { formatSgText, parseSgDateTime, planDateIssue } from "./sg-datetime";

/** What Open to plans needs from the profile itself; age comes from the account's date-of-birth check. */
export const profileChecklist = (p: SocialProfile) => [
  { label: "first name", done: !!p.firstName.trim() }, { label: "neighbourhood", done: !!p.area.trim() }, { label: "when you're free", done: p.times.length > 0 },
];
export const profileReady = (p?: SocialProfile) => !!p && profileChecklist(p).every(step => step.done);
const active = (m: GroupMember) => m.status === "invited" || m.status === "accepted";
const others = (g: Group) => g.members.filter(m => !m.isMe);
/** Named after everyone else; people who declined or left keep the name so a group never collapses to "Your group". */
export function groupName(g: Group) {
  const names = (list: GroupMember[]) => list.map(m => m.name).join(", ");
  return names(others(g).filter(active)) || names(others(g)) || "Your group";
}
export const acceptedCount = (g: Group) => g.members.filter(m => m.status === "accepted").length;
export const reservedCount = (g: Group) => g.members.filter(active).length;
export const groupFull = (g: Group) => acceptedCount(g) === g.size;
export const planAt = (g: { starts: string | null }) => g.starts ? parseSgDateTime(g.starts) : null;
export const isPast = (g: { starts: string | null }, now: number) => { const at = planAt(g); return at !== null && at <= now; };
export const chatOpen = (g: Group) => g.myStatus === "accepted" && acceptedCount(g) >= 2;
export type GroupStatus = { label: string; section: "needs" | "upcoming" | "waiting" | "past" | "closed"; tone: "accent" | "muted" | "warning" | "success" };
/** The single state machine behind Inbox, My plans and Chat; labels are short enough for a status pill. */
export function groupStatus(g: Group, now: number): GroupStatus {
  if (g.myStatus === "left" || g.myStatus === "declined") return { label: "Closed", section: "closed", tone: "muted" };
  if (g.myStatus === "invited") return { label: "Invitation", section: "needs", tone: "accent" };
  if (g.venue && isPast(g, now)) return { label: "Past", section: "past", tone: "muted" };
  if (!others(g).some(active)) return others(g).some(m => m.status === "left") ? { label: "Ended", section: "past", tone: "muted" } : { label: "Declined", section: "needs", tone: "warning" };
  if (acceptedCount(g) < 2) return { label: "Invited", section: "waiting", tone: "muted" };
  if (!g.venue) return { label: "Make a plan", section: "needs", tone: "accent" };
  const confirmed = g.members.filter(m => m.confirmed).length;
  if (confirmed === g.size) return { label: "Confirmed", section: "upcoming", tone: "success" };
  if (!g.members.find(m => m.isMe)?.confirmed) return { label: groupFull(g) ? "Confirm" : acceptedCount(g) + " of " + g.size + " joined", section: groupFull(g) ? "needs" : "upcoming", tone: groupFull(g) ? "warning" : "accent" };
  return { label: confirmed + " of " + g.size + " in", section: "upcoming", tone: "accent" };
}
/** Shared needs, grouped so each diet, practice and ingredient appears once with the people it applies to. */
export function tableNeeds(g: Group) {
  const members = g.members.filter(m => m.status === "accepted").map(m => ({ ...m, name: m.isMe ? "You" : m.name }));
  const grouped = (pick: (m: GroupMember) => readonly string[] | null) => {
    const map = new Map<string, string[]>();
    for (const m of members) for (const item of pick(m) ?? []) map.set(item, [...(map.get(item) ?? []), m.name]);
    return [...map].map(([item, who]) => item + " (" + who.join(", ") + ")");
  };
  const diets = dietLabels.map(d => [d, members.filter(m => m.diets?.includes(d)).length] as const).filter(([, n]) => n).map(([d, n]) => d + " ×" + n);
  const avoid = grouped(m => m.excluded);
  return { diet: diets.join(" · "), detail: [...grouped(m => m.practices ? shownPractices(m.practices) : m.practices), ...(avoid.length ? ["Avoid " + avoid.join(", ")] : [])].join(" · ") };
}
export const overlap = (mine: readonly string[], theirs: readonly string[]) => theirs.filter(time => mine.includes(time));
export function planShareText(g: Group) {
  return ["My food plan", g.venue, formatSgText(g.starts), "Group of " + g.size + " · " + payLabels[g.pay]].filter(Boolean).join("\n");
}
export function gatheringIssue(g: GatheringInput, now: number, publish: boolean) {
  if (!g.title.trim()) return "Add a gathering name.";
  if (!Number.isInteger(g.seats) || g.seats < 2 || g.seats > 30) return "Choose 2–30 people, including you.";
  if (g.starts && parseSgDateTime(g.starts) === null) return "Choose a Singapore date and time.";
  if (publish && (!g.area.trim() || !g.venue.trim())) return "Add a neighbourhood and a public meeting place.";
  return publish ? planDateIssue(g.starts, now) : null;
}
export function applicationIssue(a: HostApplication) {
  if (!a.name.trim()) return "Add the host or business name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) return "Enter a valid contact email.";
  if (![a.area, a.experience, a.menu, a.ingredients, a.details].every(v => v.trim())) return "Complete all application details.";
  if (!a.premises || !/^\d+$/.test(a.capacity) || +a.capacity < 1) return "Choose the premises type and how many guests or students attend.";
  if (!a.halal) return "State the halal status.";
  if (hostDeclarations.some(d => !a.declarations.includes(d))) return "Confirm each Singapore home-food declaration.";
  return !a.consent ? "Confirm the application information is accurate." : null;
}
/** HDB home classes and dining are commonly limited to small numbers; flag larger sessions for review. */
export const largeHdbSession = (a: HostApplication) => a.premises === "HDB flat" && +a.capacity > 3;
const outdoor = /void deck|\bpark\b|\bbbq\b|barbecue|\bbeach\b/i;
export const outdoorVenue = (venue: string) => outdoor.test(venue);
