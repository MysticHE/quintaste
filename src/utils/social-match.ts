import type { Person, SocialProfile } from "../types/community";
import type { HideableField } from "../config/social-profile";
import { translate, type Language } from "../i18n";
import { dietName } from "./meet";
import { sgDateTile, sgDateTimeText, sgDay } from "./sg-datetime";

const shared = <T extends string>(a: readonly T[] = [], b: readonly string[] = []) => a.filter(item => b.includes(item));
const shown = (p: SocialProfile, field: HideableField) => !p.hidden.includes(field);
/**
 * What the viewer and another member have in common, most telling first. Only fields both show count: a hidden field of
 * yours is never used to suggest people, and the server already empties the other member's hidden fields.
 */
export function inCommon(me: SocialProfile | undefined, them: Person, language: Language = "en"): string[] {
  if (!me) return [];
  type Key = Parameters<typeof translate<"social">>[2];
  const out: string[] = [], add = (key: Key, option: Key, item: string, lower = false) => {
    const value = translate(language, "social", option, { value: item });
    out.push(translate(language, "social", key, { value: lower && language === "en" ? value.toLowerCase() : value }));
  };
  if (shown(me, "hobbies")) for (const hobby of shared(me.hobbies, them.hobbies)) add("bothHobby", "optHobby", hobby, true);
  if (shown(me, "religion") && me.religion && me.religion === them.religion && !/^(Other|Prefer not to say)$/.test(me.religion)) add("bothReligion", "optReligion", me.religion);
  for (const time of shared(me.times, them.times)) add("bothFree", "optTime", time, true);
  if (shown(me, "languages")) for (const spoken of shared(me.languages, them.languages).filter(l => l !== "English" && l !== "Other")) add("bothSpeak", "optLanguage", spoken);
  if (shown(me, "why")) for (const why of shared(me.why, them.why)) add("bothWhy", "optWhy", why, true);
  if (shown(me, "spots") && shared(me.spots, them.spots).length) out.push(translate(language, "social", "sameSpot"));
  for (const label of shared(me.diets.filter(d => d !== "Plant-Based"), them.diets)) out.push(translate(language, "social", "bothDiet", { value: dietName(language, label) }));
  return out;
}
/** Profile completion counts only the fields that drive suggestions. */
export function completion(p: SocialProfile, language: Language = "en") {
  const step = (key: Parameters<typeof translate<"social">>[2], done: boolean) => ({ label: translate(language, "social", key), done });
  const steps = [
    step("doPicture", !!p.hasFace), step("doReligion", !!p.religion), step("doHobbies", p.hobbies.length >= 3), step("doPrompt", p.prompts.length > 0),
    step("doLanguages", p.languages.length > 0), step("doSpots", p.spots.length > 0), step("doTimes", p.times.length > 0), step("doArea", !!p.area.trim()),
    step("doFirstName", !!p.firstName.trim()), step("doHereFor", !!p.hereFor),
  ];
  return { done: steps.filter(item => item.done).length, total: steps.length, missing: steps.filter(item => !item.done).map(item => item.label) };
}
export const ageOf = (birthYear: number | null) => birthYear ? new Date().getFullYear() - birthYear : null;
const slotTimes: Record<string, { weekend: boolean; times: string[] }> = {
  "Weekday lunch": { weekend: false, times: ["12:30"] }, "Weekday dinner": { weekend: false, times: ["19:00"] }, Weekends: { weekend: true, times: ["11:00", "18:30"] },
};
/** The next few times both people are usually free (or yours, when nothing overlaps), at least two hours from now, within a week. */
export function suggestedSlots(mine: readonly string[], theirs: readonly string[], now: number, count = 4) {
  const both = mine.filter(time => theirs.includes(time)), use = both.length ? both : mine.length ? [...mine] : ["Weekday lunch", "Weekends"];
  const out: string[] = [];
  for (let day = 0; day < 8 && out.length < count; day++) {
    const date = sgDay(now + day * 86400000), weekday = new Date(date + "T12:00:00+08:00").getUTCDay(), weekend = weekday === 0 || weekday === 6;
    for (const time of use.flatMap(key => slotTimes[key]?.weekend === weekend ? slotTimes[key].times : []).sort()) {
      const text = date + " " + time, at = Date.parse(date + "T" + time + ":00+08:00");
      if (at - now >= 2 * 3600000 && !out.includes(text)) out.push(text);
      if (out.length === count) break;
    }
  }
  return out;
}
/** "Today 12:30", "Tomorrow 19:00" or "Sat 11:00". */
export function slotLabel(text: string, now: number, language: Language = "en") {
  const tile = sgDateTile(text, language), day = text.slice(0, 10);
  if (!tile) return text;
  const name = day === sgDay(now) ? translate(language, "social", "today") : day === sgDay(now + 86400000) ? translate(language, "social", "tomorrow") : tile.weekday;
  return translate(language, "social", "slotDay", { day: name, time: text.slice(11) });
}
export const isToday = (text: string, now: number) => text.slice(0, 10) === sgDateTimeText(now).slice(0, 10);
/** Your profile as another member receives it (mirrors server/social/rules.mjs `shareable`): hidden fields empty, age instead of the year. */
export function asSeenByOthers(p: SocialProfile, id: string): Person {
  const hide = (field: HideableField) => p.hidden.includes(field), { birthYear: _year, hidden: _hidden, pausedUntil: _paused, ...rest } = p;
  return { ...rest, id, age: hide("age") ? null : ageOf(p.birthYear), hasFace: !!p.hasFace, tables: p.tables ?? 0, noShows: p.noShows ?? 0, cooked: 0,
    gender: hide("gender") ? "" : p.gender, religion: hide("religion") ? "" : p.religion, ethnicity: hide("ethnicity") ? "" : p.ethnicity,
    why: hide("why") ? [] : p.why, hobbies: hide("hobbies") ? [] : p.hobbies, languages: hide("languages") ? [] : p.languages,
    education: hide("education") ? "" : p.education, work: hide("work") ? "" : p.work, grewUp: hide("grewUp") ? "" : p.grewUp, height: hide("height") ? null : p.height,
    drinking: hide("drinking") ? "" : p.drinking, smoking: hide("smoking") ? "" : p.smoking, family: hide("family") || p.hereFor !== "more" ? "" : p.family,
    pets: hide("pets") ? [] : p.pets, spots: hide("spots") ? [] : p.spots, prompts: p.prompts.filter(item => item.a.trim()) };
}
