import { CommunityError, list, pick, text } from '../community/http.mjs';
import { ingredients } from '../market/rules.mjs';
import { dietLabels } from '../diet-labels.mjs';

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
/** An older app cannot show Vegetarian: when it re-saves the same old diet, the labels already stored stay. */
export const keepStored = (next, stored, legacy) => legacy && stored && legacyDiet(stored) === legacyDiet(next) && !next.includes('Vegetarian') ? stored : next;
/** Stored practices also carry the old No five pungent practice whenever Vegetarian is kept, for older app images. */
export const storedPractices = (kept, labels) => labels.includes('Vegetarian') ? [...kept, fivePungent] : kept;
/** "YYYY-MM-DD HH:mm" Singapore wall-clock text for every Social time. */
export const sgText = column => `to_char(${column} AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI')`;
export function readProfile(body) {
  body ??= {};
  const interests = Array.isArray(body.interests) ? body.interests.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 30)).filter(Boolean).slice(0, 5) : [];
  const { diets, legacy } = dietsFrom(body, body.practices);
  return { firstName: text(body.firstName, 40, { field: 'First name' }), area: text(body.area, 60, { field: 'Neighbourhood' }), diets, diet: legacyDiet(diets), legacy,
    practices: list(body.practices, practices), times: list(body.times, times), size: pick(Number(body.size), sizes, 4), about: text(body.about, 180, { field: 'About' }),
    interests, excluded: list(body.excluded, ingredients), visible: body.visible === true };
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
// `diet` stays for one release for older apps; practices drop the old No five pungent, which is now the Vegetarian label.
export const profileColumns = `p.user_id AS id, p.first_name AS "firstName", p.area, p.diets, p.diet, array_remove(p.practices, '${fivePungent}') AS practices, p.times, p.group_size AS size, p.about, p.interests, p.excluded, p.visible`;
