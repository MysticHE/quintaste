import { CommunityError, list, pick, text } from '../community/http.mjs';
import { ingredients } from '../market/rules.mjs';

// Mirrors src/types/meet.ts; the server is the authority for visibility, invitations and plans.
export const times = ['Weekday lunch', 'Weekday dinner', 'Weekends'];
export const practices = ['No five pungent', 'No egg', 'Lunar 1st & 15th'];
export const sizes = [2, 4, 6];
export const pays = ['own', 'split', 'organiser'];
export const diets = ['Vegan', 'Vegetarian'];
/** "YYYY-MM-DD HH:mm" Singapore wall-clock text for every Social time. */
export const sgText = column => `to_char(${column} AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI')`;
export function readProfile(body) {
  body ??= {};
  const interests = Array.isArray(body.interests) ? body.interests.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 30)).filter(Boolean).slice(0, 5) : [];
  return { firstName: text(body.firstName, 40, { field: 'First name' }), area: text(body.area, 60, { field: 'Neighbourhood' }), diet: pick(body.diet, diets, 'Vegan'),
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
export const profileColumns = `p.user_id AS id, p.first_name AS "firstName", p.area, p.diet, p.practices, p.times, p.group_size AS size, p.about, p.interests, p.excluded, p.visible`;
