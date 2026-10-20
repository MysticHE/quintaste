import { CommunityError, list, pick, text } from '../community/http.mjs';
import { ingredients } from '../market/rules.mjs';
import { dietLabels } from '../diet-labels.mjs';
import * as options from './options.mjs';

// Mirrors src/types/meet.ts; the server is the authority for visibility, invitations and plans.
export const times = ['Weekday lunch', 'Weekday dinner', 'Weekends'];
export const practices = ['No egg', 'Lunar 1st & 15th'];
/** A practice before 20 Oct 2026, now the Vegetarian label. Stored profiles keep it in step for older app images. */
export const fivePungent = 'No five pungent';
export const sizes = [2, 4, 6];
export const pays = ['own', 'split', 'organiser'];
/** Labels a person keeps or a gathering serves (server/diet-labels.mjs): Plant-Based alone, or Vegan and/or Vegetarian. */
export function readDiets(value) {
  const strict = Array.isArray(value) ? dietLabels.filter(label => label !== 'Plant-Based' && value.includes(label)) : [];
  return strict.length ? strict : ['Plant-Based'];
}
/** For one release, apps that send a single `diet`: Vegan stays Vegan, the old Vegetarian (eggs and dairy) is Plant-Based, the old practice adds Vegetarian. */
export function legacyDiets(diet, kept) {
  const pungentFree = Array.isArray(kept) && kept.includes(fivePungent);
  if (diet === 'Vegan') return pungentFree ? ['Vegan', 'Vegetarian'] : ['Vegan'];
  return pungentFree ? ['Vegetarian'] : ['Plant-Based'];
}
/** The old single `diet` column value that older app images read and write. */
export const legacyDiet = labels => labels.includes('Vegan') ? 'Vegan' : 'Vegetarian';
/** Labels from a request body; `legacy` is true when an older app sent only `diet`. */
export const dietsFrom = (body, kept) => Array.isArray(body.diets) ? { diets: readDiets(body.diets), legacy: false } : { diets: legacyDiets(body.diet, kept), legacy: true };
/**
 * Gatherings only: an older app cannot show Vegetarian on a gathering, so when it re-saves the same old diet the labels
 * already stored stay. Profiles need no such rule: older apps still see and send the No five pungent practice.
 */
export const keepStored = (next, stored, legacy) => legacy && stored && legacyDiet(stored) === legacyDiet(next) && !next.includes('Vegetarian') ? stored : next;
/** Stored practices also carry the old No five pungent practice whenever Vegetarian is kept, for older app images. */
export const storedPractices = (kept, labels) => labels.includes('Vegetarian') ? [...kept, fivePungent] : kept;
/** "YYYY-MM-DD HH:mm" Singapore wall-clock text for every Social time. */
export const sgText = column => `to_char(${column} AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI')`;
const optional = (value, choices) => choices.includes(value) ? value : '';
const whole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : null;
/** Up to three answered prompts from the bank, one answer each, 100 characters. */
export function readPrompts(value) {
  const seen = new Set(), out = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (!item || typeof item !== 'object' || !options.prompts.includes(item.q) || seen.has(item.q)) continue;
    const a = typeof item.a === 'string' ? item.a.trim().slice(0, 100) : '';
    if (a) { seen.add(item.q); out.push({ q: item.q, a }); }
    if (out.length === 3) break;
  }
  return out;
}
const spotIds = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{2,119}$/.test(id)))].slice(0, 3) : [];
export function readProfile(body) {
  body ??= {};
  const interests = Array.isArray(body.interests) ? body.interests.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 30)).filter(Boolean).slice(0, 5) : [];
  const { diets, legacy } = dietsFrom(body, body.practices);
  return { firstName: text(body.firstName, 40, { field: 'First name' }), area: text(body.area, 60, { field: 'Neighbourhood' }), diets, diet: legacyDiet(diets), legacy,
    practices: list(body.practices, practices), times: list(body.times, times), size: pick(Number(body.size), sizes, 4), about: text(body.about, 180, { field: 'About' }),
    interests, excluded: list(body.excluded, ingredients), visible: body.visible === true,
    hereFor: pick(body.hereFor, options.hereFor, 'makan'), gender: optional(body.gender, options.genders), birthYear: whole(body.birthYear, 1920, new Date().getFullYear() - 18),
    religion: optional(body.religion, options.religions), ethnicity: optional(body.ethnicity, options.ethnicities), why: list(body.why, options.whyPlantBased),
    hobbies: list(body.hobbies, options.hobbies, 12), languages: list(body.languages, options.languages), education: optional(body.education, options.educations),
    work: text(body.work, 40, { field: 'Work' }), grewUp: text(body.grewUp, 40, { field: 'Grew up in' }), height: whole(body.height, 120, 230),
    drinking: optional(body.drinking, options.habits), smoking: optional(body.smoking, options.habits), family: optional(body.family, options.families),
    pets: list(body.pets, options.pets), spots: spotIds(body.spots), prompts: readPrompts(body.prompts), opening: text(body.opening, 120, { field: 'Opening question' }),
    hidden: list(body.hidden, options.hideable) };
}
/** What Open to plans needs; age comes from the account check enforced by the session gate. */
export const profileIssue = p => !p?.firstName ? 'Add your first name.' : !p.area ? 'Choose a neighbourhood.' : !p.times?.length ? 'Choose when you are usually free.' : null;
/** A plan or gathering time: valid Singapore text, in the future and within two years. */
export function readFuture(value, field = 'Date and time') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new CommunityError(400, `Choose a ${field.toLowerCase()}.`);
  const at = Date.parse(value.replace(' ', 'T') + ':00+08:00');
  if (!Number.isFinite(at)) throw new CommunityError(400, `Choose a valid ${field.toLowerCase()}.`);
  if (at <= Date.now()) throw new CommunityError(400, 'Choose a future date and time.');
  if (at - Date.now() > 2 * 365 * 86400000) throw new CommunityError(400, 'Choose a date within the next two years.');
  return new Date(at);
}
// `diet` and the No five pungent practice stay for one release so older apps show and can change Vegetarian; the new
// app hides that practice because its Vegetarian label says the same.
/**
 * Tablemates reported this member (`m`) as not coming: one report at a table of two people, two reports at a bigger table,
 * so one unhappy tablemate alone cannot mark someone at a table of four or six.
 */
const reportedSql = m => `((SELECT count(*) FROM social.no_show ns WHERE ns.group_id=${m}.group_id AND ns.about_id=${m}.user_id)
  >= CASE WHEN (SELECT count(*) FROM social.member x WHERE x.group_id=${m}.group_id AND x.accepted_at IS NOT NULL) <= 2 THEN 1 ELSE 2 END)`;
/**
 * Meals that count: the member said they went and at least one tablemate at the same table said so too. A lone
 * self-report never counts, so the two-person unlock and the "tables" record cannot be earned alone.
 */
export const mealsSql = column => `(SELECT count(*)::int FROM social.member sm WHERE sm.user_id=${column} AND sm.attended='yes'
  AND EXISTS (SELECT 1 FROM social.member so WHERE so.group_id=sm.group_id AND so.user_id<>sm.user_id AND so.attended='yes') AND NOT ${reportedSql('sm')})`;
/** No-shows in the last `days`: the member said they did not go, or tablemates reported it (`reportedSql`). */
export const noShowSql = (column, days) => `(SELECT count(*)::int FROM social.member sm JOIN social."group" sg ON sg.id=sm.group_id
  WHERE sm.user_id=${column} AND sg.starts > now() - interval '${Number(days)} days' AND (sm.attended='no' OR ${reportedSql('sm')}))`;
/** The profile fields added on 20 Oct 2026 (older apps never send them). */
export const newerColumns = `p.here_for AS "hereFor", p.gender, p.birth_year AS "birthYear", p.religion, p.ethnicity, p.why, p.hobbies, p.languages, p.education, p.work,
  p.grew_up AS "grewUp", p.height, p.drinking, p.smoking, p.family, p.pets, p.spots, p.prompts, p.opening, p.hidden`;
export const profileColumns = `p.user_id AS id, p.first_name AS "firstName", p.area, p.diets, p.diet, p.practices, p.times, p.group_size AS size, p.about, p.interests, p.excluded, p.visible,
  ${newerColumns}, p.paused_until AS "pausedUntil",
  EXISTS (SELECT 1 FROM social.face f WHERE f.user_id=p.user_id) AS "hasFace",
  ${mealsSql('p.user_id')} AS tables,
  ${noShowSql('p.user_id', 180)} AS "noShows"`;
/** Age from the year the member gave; the year itself never leaves the server except to its owner. */
export const ageOf = year => year ? new Date().getFullYear() - year : null;
/**
 * What another member may see: hidden fields are removed, never blanked into look-alike values, and the birth year,
 * hidden list and pause date stay private. `gender` is shown only when the member chose to show it.
 */
export function shareable(row) {
  const { birthYear, hidden = [], pausedUntil: _paused, ...rest } = row, out = { ...rest, age: hidden.includes('age') ? null : ageOf(birthYear) };
  const fields = { gender: 'gender', religion: 'religion', ethnicity: 'ethnicity', why: 'why', hobbies: 'hobbies', languages: 'languages', education: 'education',
    work: 'work', grewUp: 'grewUp', height: 'height', drinking: 'drinking', smoking: 'smoking', family: 'family', pets: 'pets', spots: 'spots' };
  for (const [key, field] of Object.entries(fields)) if (hidden.includes(key)) out[field] = Array.isArray(rest[field]) ? [] : typeof rest[field] === 'number' ? null : '';
  if (out.hereFor !== 'more') out.family = '';
  return out;
}
