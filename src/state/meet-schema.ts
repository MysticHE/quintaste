import { marketIngredients } from "../config/market-ingredients";
import { defaultMeetFilters, emptyMeet, groupSizes, meetPractices, meetTimes, payOptions, reminderLimit, type MeetNetwork, type MeetProfile, type PlanReminder } from "../types/meet";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, max = 100) => typeof v === "string" ? v.trim().slice(0, max) : "";
const strings = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string"))] : [];
export class MeetCapacityError extends Error {}
export function readMeetProfile(input: unknown): MeetProfile {
  const p = record(input);
  return { name: text(p.name, 40), diet: p.diet === "Vegetarian" ? "Vegetarian" : "Vegan", area: text(p.area, 60), about: text(p.about, 180),
    interests: strings(p.interests).map(s => s.trim().slice(0, 30)).filter(Boolean).slice(0, 5), times: meetTimes.filter(t => strings(p.times).includes(t)),
    size: groupSizes.find(n => n === p.size) ?? 4, excluded: marketIngredients.filter(t => strings(p.excluded).includes(t)),
    practices: meetPractices.filter(t => strings(p.practices).includes(t)) };
}
function readReminders(input: unknown): PlanReminder[] {
  const rows = (Array.isArray(input) ? input : []).map(record)
    .filter(r => text(r.groupId, 80) && text(r.venue, 160) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text(r.starts, 16)));
  const unique = new Map(rows.map(r => [text(r.groupId, 80), { groupId: text(r.groupId, 80), venue: text(r.venue, 160), starts: text(r.starts, 16),
    pay: payOptions.find(option => option === r.pay) ?? "own" }]));
  return [...unique.values()].slice(-reminderLimit);
}
/** Earlier local-only groups, gatherings and sample people are not carried forward; Social now lives on the account. */
export function readMeet(input: unknown): MeetNetwork {
  const v = record(input), f = record(v.filters);
  return { ...emptyMeet(), profile: readMeetProfile(v.profile), dismissedMoment: text(v.dismissedMoment, 10), reminders: readReminders(v.reminders),
    filters: { ...defaultMeetFilters(), diet: f.diet === "Vegan" || f.diet === "Vegetarian" ? f.diet : "All", time: meetTimes.find(t => t === f.time) ?? "Any",
      prefers: f.prefers === "Any" ? "Any" : groupSizes.find(n => n === f.prefers) ?? "Any", fivePungentFree: f.fivePungentFree === true } };
}
export function mergeMeet(profile: MeetNetwork, guest: MeetNetwork): MeetNetwork {
  const reminders = [...profile.reminders, ...guest.reminders.filter(r => !profile.reminders.some(p => p.groupId === r.groupId))];
  if (reminders.length > reminderLimit) throw new MeetCapacityError(`Together there are ${reminders.length} plan reminders; the limit is ${reminderLimit}. Nothing was merged.`);
  return readMeet({ ...profile, profile: profile.profile.name ? profile.profile : guest.profile, reminders });
}
