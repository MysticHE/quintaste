import { pool } from '../config.mjs';
import { CommunityError } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';

/** Social (People, friends, chat and dinner invites) is for members aged 21 to 45 (owner, 24 Oct 2026). Events and cooking classes live in Market, open to every member. */
export const MEET_AGES = [21, 45];
export const meetAge = age => age !== null && age >= MEET_AGES[0] && age <= MEET_AGES[1];
/** Whole years from a "YYYY-MM-DD" birth date to today in Singapore. */
export function ageFrom(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const [year, month, day] = String(birthDate).slice(0, 10).split('-').map(Number);
  const today = new Date(now.getTime() + 8 * 3600000), y = today.getUTCFullYear(), m = today.getUTCMonth() + 1, d = today.getUTCDate();
  return y - year - (m < month || (m === month && d < day) ? 1 : 0);
}
/** SQL: the member in `column` is 21 to 45 today by the birth date they gave (Singapore date). */
export const meetAgeSql = column => `EXISTS (SELECT 1 FROM social.profile ap_ WHERE ap_.user_id=${column}
  AND ap_.birth_date <= ((now() AT TIME ZONE 'Asia/Singapore')::date - interval '${MEET_AGES[0]} years')
  AND ap_.birth_date > ((now() AT TIME ZONE 'Asia/Singapore')::date - interval '${MEET_AGES[1] + 1} years'))`;
/** SQL: staff approved the member's selfie against the main photo they still show. */
export const verifiedSql = column => `EXISTS (SELECT 1 FROM social.verification vr_ JOIN social.photo vp_ ON vp_.user_id=vr_.user_id AND vp_.position=0
  WHERE vr_.user_id=${column} AND vr_.status='approved' AND vr_.photo_digest=vp_.digest)`;
/** SQL: the lower and higher id of a pair in byte order, matching `pairOf` and the stored a_id < b_id. */
export const lowSql = (a, b) => `least(${a} COLLATE "C", ${b} COLLATE "C")`;
export const highSql = (a, b) => `greatest(${a} COLLATE "C", ${b} COLLATE "C")`;
/** SQL: the two members are friends. */
export const friendsSql = (a, b) => `EXISTS (SELECT 1 FROM social.friend fr_ WHERE fr_.a_id=${lowSql(a, b)} AND fr_.b_id=${highSql(a, b)})`;
/** SQL: another member `column` the viewer `param` may deal with at all: signed-up adult, not restricted, not blocked either way. */
export const reachableSql = (column, param) => `EXISTS (SELECT 1 FROM public."user" ru_ WHERE ru_.id=${column} AND ru_."adultConfirmed")
  AND ${notRestricted(column)} AND ${notBlocked(column, param)}`;
/** A pair in byte order (account ids are ASCII, so JavaScript's comparison is byte order). */
export const pairOf = (a, b) => a < b ? [a, b] : [b, a];
export const nameSql = (profile, user) => `coalesce(nullif(${profile}.first_name,''), ${user}.name, 'Member')`;

/**
 * Two missed dinners in 90 days pause dinner invites for 30 days after the latest one. A dinner counts when the member said
 * "I didn't go", or the other person said "They didn't come" and the member did not say "We met" (a disagreement goes to staff
 * instead, see dinners.mjs). Claims by one person count once, at their first dinner in the 90 days, so a single friend can
 * neither pause anyone on their own nor make a pause last longer.
 */
export const pausedUntilSql = column => `(SELECT CASE WHEN count(*) >= 2 THEN max(ns_.starts) + interval '30 days' END FROM (
  SELECT min(nm_.starts) AS starts FROM (SELECT nd_.starts, CASE WHEN EXISTS (SELECT 1 FROM social.dinner_report nr_ WHERE nr_.dinner_id=nd_.id AND nr_.user_id=${column} AND nr_.met='didnt_go')
      THEN 'self:' || nd_.id::text ELSE CASE WHEN nd_.host_id=${column} THEN nd_.guest_id ELSE nd_.host_id END END AS strike
  FROM social.dinner nd_ WHERE (nd_.host_id=${column} OR nd_.guest_id=${column}) AND nd_.status='accepted' AND nd_.starts > now() - interval '90 days' AND nd_.starts < now() AND (
    EXISTS (SELECT 1 FROM social.dinner_report nr_ WHERE nr_.dinner_id=nd_.id AND nr_.user_id=${column} AND nr_.met='didnt_go')
    OR (EXISTS (SELECT 1 FROM social.dinner_report nr_ WHERE nr_.dinner_id=nd_.id AND nr_.user_id<>${column} AND nr_.met='no_show')
      AND NOT EXISTS (SELECT 1 FROM social.dinner_report nr_ WHERE nr_.dinner_id=nd_.id AND nr_.user_id=${column} AND nr_.met='yes')))) nm_
  GROUP BY nm_.strike) ns_)`;

/**
 * Where a member stands on Social. `step` is the first thing still missing: 'photos' (no main photo), 'basics' (name,
 * gender, birth date, area), 'age' (outside 21 to 45), 'verify' (no selfie sent or it was declined, or the main photo
 * changed since it was approved), 'waiting' (staff are checking the selfie) or 'ready'. 'age' is anyone outside 21 to 45.
 */
export async function standing(userId, db = pool) {
  const row = (await db.query(`SELECT p.first_name, p.gender, p.area, to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date, p.visible,
      (SELECT digest FROM social.photo WHERE user_id=$1 AND position=0) AS main,
      v.status, v.photo_digest, v.reason, ${pausedUntilSql('$1')} AS paused_until
    FROM (SELECT $1::text AS id) me LEFT JOIN social.profile p ON p.user_id=me.id LEFT JOIN social.verification v ON v.user_id=me.id`, [userId])).rows[0] ?? {};
  const age = ageFrom(row.birth_date), basics = !!(row.first_name && row.gender && row.birth_date && row.area);
  const verification = !row.status || row.status === 'none' ? 'none' : row.status === 'approved' && row.photo_digest !== row.main ? 'paused' : row.status;
  const verified = verification === 'approved';
  const step = !row.main ? 'photos' : !basics ? 'basics' : !meetAge(age) ? 'age' : verified ? 'ready' : verification === 'pending' ? 'waiting' : 'verify';
  const pausedUntil = row.paused_until && new Date(row.paused_until) > new Date() ? row.paused_until : null;
  return { step, age, gender: row.gender || '', area: row.area || '', verified, verification, reason: verification === 'rejected' ? row.reason : '', public: !!row.visible && verified,
    pausedUntil, canMeet: step === 'ready' };
}
/** Browsing People needs a finished profile and age 21 to 45; appearing there and dinner invites also need the ✓. */
export function requireBrowse(state) {
  if (['verify', 'waiting', 'ready'].includes(state.step)) return state;
  return requireMeet(state);
}
/**
 * SQL: the viewer `param` may see the profile and photos of `column`: themselves; a friend; someone they have an open friend
 * request with; or anyone whose profile is public (the default; members without a Social profile count as public). Any age
 * and gender (owner, 25 Oct 2026): only Dining (People to meet, dinner invites) is limited to 21 to 45 with a checked photo.
 */
export const seeableSql = (column, param) => `(${column}=${param} OR (${reachableSql(column, param)} AND (${friendsSql(column, param)}
  OR EXISTS (SELECT 1 FROM social.friend_request sr_ WHERE sr_.status='pending' AND ((sr_.from_id=${column} AND sr_.to_id=${param}) OR (sr_.from_id=${param} AND sr_.to_id=${column})))
  OR NOT EXISTS (SELECT 1 FROM social.profile sp_ WHERE sp_.user_id=${column} AND NOT sp_.visible))))`;
/** Refuses unless the member may use Dining (People and dinner invites); the code tells the app which screen to open. */
export function requireMeet(state) {
  if (state.step === 'ready') return state;
  if (state.step === 'age') throw new CommunityError(403, 'Social is for members aged 21 to 45.', 'SOCIAL_AGE');
  if (state.step === 'waiting') throw new CommunityError(403, 'We are checking your photo. This usually takes a day.', 'SOCIAL_WAITING');
  if (state.step === 'verify') throw new CommunityError(403, 'Verify your photo first.', 'SOCIAL_VERIFY');
  throw new CommunityError(403, 'Set up your Social profile first.', 'SOCIAL_SETUP');
}
