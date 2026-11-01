import { marketIngredients } from "../config/market-ingredients";
import { ageBands, distanceOptions, hobbyOptions, languageOptions } from "../config/social-profile";
import { defaultMeetFilters, emptyMeet, groupSizes, keptLabels, legacyLabels, meetPractices, meetTimes, payOptions, reminderLimit, remindersOffLimit, type MeetFilters, type MeetNetwork, type MeetProfile, type PlanReminder } from "../types/meet";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, max = 100) => typeof v === "string" ? v.trim().slice(0, max) : "";
const strings = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string"))] : [];
export class MeetCapacityError extends Error {
  constructor(readonly count: number) { super(`Together there are ${count} plan reminders; the limit is ${reminderLimit}. Nothing was merged.`); }
}
export function readMeetProfile(input: unknown): MeetProfile {
  const p = record(input);
  return { name: text(p.name, 40), diets: Array.isArray(p.diets) ? keptLabels(p.diets) : legacyLabels(p.diet, p.practices), area: text(p.area, 60), about: text(p.about, 180),
    interests: strings(p.interests).map(s => s.trim().slice(0, 30)).filter(Boolean).slice(0, 5), times: meetTimes.filter(t => strings(p.times).includes(t)),
    size: groupSizes.find(n => n === p.size) ?? 4, excluded: marketIngredients.filter(t => strings(p.excluded).includes(t)),
    practices: meetPractices.filter(t => strings(p.practices).includes(t)) };
}
function readReminders(input: unknown): PlanReminder[] {
  const rows = (Array.isArray(input) ? input : []).map(record)
    .filter(r => text(r.groupId, 80) && text(r.venue, 160) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text(r.starts, 16)));
  const unique = new Map(rows.map(r => [text(r.groupId, 80), { groupId: text(r.groupId, 80), venue: text(r.venue, 160), starts: text(r.starts, 16),
    pay: r.pay === "organiser" ? "host" as const : payOptions.find(option => option === r.pay) ?? "own", with: text(r.with, 40) }]));
  return [...unique.values()].slice(-reminderLimit);
}
/** People filters; before 20 Oct 2026 a single `diet` and `fivePungentFree` (now Vegetarian). Old Vegetarian (eggs and dairy) matches everyone. */
function readFilterDiets(f: Record<string, unknown>): MeetFilters["diets"] {
  const chosen = Array.isArray(f.diets) ? f.diets : [...(f.diet === "Vegan" ? ["Vegan"] : []), ...(f.fivePungentFree === true ? ["Vegetarian"] : [])];
  return (["Vegan", "Vegetarian"] as const).filter(label => chosen.includes(label));
}
/** Earlier local-only groups, gatherings and sample people are not carried forward; Social now lives on the account. Old People filters (time, group size, religion, same area) drop. */
export function readMeet(input: unknown): MeetNetwork {
  const v = record(input), f = record(v.filters);
  return { ...emptyMeet(), profile: readMeetProfile(v.profile), dismissedMoment: text(v.dismissedMoment, 10), reminders: readReminders(v.reminders),
    remindersOff: strings(v.remindersOff).map(id => id.trim().slice(0, 80)).filter(Boolean).slice(-remindersOffLimit),
    filters: { ...defaultMeetFilters(), diets: readFilterDiets(f), ages: ageBands.filter(a => strings(f.ages).includes(a)),
      languages: languageOptions.filter(l => strings(f.languages).includes(l)), hobbies: hobbyOptions.filter(h => strings(f.hobbies).includes(h)).slice(0, 12),
      km: distanceOptions.find(n => n === f.km) ?? 0 } };
}
export function mergeMeet(profile: MeetNetwork, guest: MeetNetwork): MeetNetwork {
  const reminders = [...profile.reminders, ...guest.reminders.filter(r => !profile.reminders.some(p => p.groupId === r.groupId))];
  if (reminders.length > reminderLimit) throw new MeetCapacityError(reminders.length);
  return readMeet({ ...profile, profile: profile.profile.name ? profile.profile : guest.profile, reminders,
    remindersOff: [...new Set([...guest.remindersOff, ...profile.remindersOff])] });
}
