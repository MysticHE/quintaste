import { CommunityError } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { mealsSql, profileIssue, sgText } from './rules.mjs';
import { placeView } from './places.mjs';

export const active = ['invited', 'accepted'];
export const nameOf = `coalesce(nullif(p.first_name,''), u.name, 'Member')`;
/** An invitation stays open for three days; suggesting another slot or a plan change starts the three days again. */
export const offerDays = 3;
/** A seat that counts: accepted, or an invitation that has not expired. */
export const liveSql = a => `(${a}.status='accepted' OR ${a}.status='invited' AND (${a}.expires_at IS NULL OR ${a}.expires_at > now()))`;
export const isLive = m => m.status === 'accepted' || m.status === 'invited' && (!m.expiresAt || new Date(m.expiresAt).getTime() > Date.now());
/**
 * Owner rule: a mixed table is never one woman with only men. `genders` are the live seats; `joining` the people
 * about to take seats. Checked when a join or acceptance fills the table and before anyone confirms. Members who have
 * not given a gender cannot join open tables. The message never says who is seated, so hidden genders stay hidden.
 */
export function balanceIssue(genders, size, joining = [], waived = false) {
  const after = [...genders, ...joining];
  if (after.length > size) return 'This table is full.';
  return !waived && after.length === size && unbalanced(after) ? 'This seat is kept to balance the table.' : null;
}
/** Live seats of a group with each person's gender (internal; never sent). */
export const seatsOf = async (db, groupId) => (await db.query(`SELECT m.user_id AS id, m.status, coalesce(p.gender,'') AS gender FROM social.member m
  LEFT JOIN social.profile p ON p.user_id=m.user_id WHERE m.group_id=$1 AND ${liveSql('m')}`, [groupId])).rows;
/** The rule is waived only while the woman who opened the last seat herself is still seated. */
export const waivedBy = (group, seats) => !!group.balance_ok_by && seats.some(s => s.id === group.balance_ok_by && s.status === 'accepted' && s.gender === 'woman');
/** Only a woman can take the last seat: one seat left, exactly one woman and at least one man seated. */
export const onlyWomanFits = (genders, size) => genders.length === size - 1 && unbalanced(genders);
/** Starts the 24-hour seat hold the moment only a woman can fill the last seat, and clears it when that stops being true. */
export async function refreshHold(db, groupId) {
  const g = (await db.query('SELECT size, listed, balance_ok_by FROM social."group" WHERE id=$1', [groupId])).rows[0];
  if (!g?.listed) return;
  const seats = await seatsOf(db, groupId), held = !waivedBy(g, seats) && onlyWomanFits(seats.map(s => s.gender), g.size);
  await db.query(`UPDATE social."group" SET hold_until=CASE WHEN $2 THEN coalesce(hold_until, now() + interval '24 hours') ELSE NULL END WHERE id=$1`, [groupId, held]);
}
/**
 * After a member leaves, whether by Leave or by blocking someone they share the group with: a table passes to the
 * earliest remaining member (or stops being listed when nobody is left), a seat waiver ends with the woman who gave it,
 * and the seat hold is recomputed.
 */
export async function afterLeave(db, groupId, userId) {
  const g = (await db.query('SELECT created_by, origin FROM social."group" WHERE id=$1', [groupId])).rows[0];
  if (!g) return;
  if (g.origin === 'table' && g.created_by === userId) {
    const next = (await db.query("SELECT user_id FROM social.member WHERE group_id=$1 AND status='accepted' ORDER BY accepted_at LIMIT 1", [groupId])).rows[0];
    if (next) await db.query('UPDATE social."group" SET created_by=$2 WHERE id=$1', [groupId, next.user_id]);
    else await db.query('UPDATE social."group" SET listed=false WHERE id=$1', [groupId]);
  }
  await db.query('UPDATE social."group" SET balance_ok_by=NULL WHERE id=$1 AND balance_ok_by=$2', [groupId, userId]);
  await refreshHold(db, groupId);
}
export const unbalanced = genders => genders.filter(g => g === 'woman').length === 1 && genders.some(g => g === 'man');
/** Members of several groups in one query, keyed by group id. `gender` is internal (table balance) and never sent. */
export async function membersOf(db, groupIds) {
  const rows = (await db.query(`SELECT m.group_id, m.user_id AS id, ${nameOf} AS name, m.status, m.confirmed, p.diets, p.diet, p.practices, p.excluded,
      coalesce(p.gender, '') AS gender, coalesce(p.prompts, '[]'::jsonb) AS prompts, CASE WHEN 'why' = ANY(coalesce(p.hidden, '{}')) THEN '{}' ELSE coalesce(p.why, '{}') END AS why, m.offer, m.expires_at AS "expiresAt", m.kaki_of AS "kakiOf", m.attended, m.eat_again AS "eatAgain", m.accepted_at AS "acceptedAt",
      EXISTS (SELECT 1 FROM social.face f WHERE f.user_id=m.user_id) AS "hasFace"
    FROM social.member m JOIN public."user" u ON u.id=m.user_id LEFT JOIN social.profile p ON p.user_id=m.user_id WHERE m.group_id=ANY($1::uuid[]) ORDER BY m.updated_at`, [groupIds])).rows;
  const byGroup = new Map(groupIds.map(id => [id, []]));
  for (const { group_id: groupId, ...member } of rows) byGroup.get(groupId)?.push(member);
  return byGroup;
}
export const members = async (db, groupId) => (await membersOf(db, [groupId])).get(groupId);
export async function load(db, id, me, lock = false) {
  const group = (await db.query(`SELECT g.*, ${sgText('g.starts')} AS starts_text FROM social."group" g WHERE g.id=$1 ${lock ? 'FOR UPDATE' : ''}`, [id])).rows[0];
  const list = group ? await members(db, id) : [];
  const mine = list.find(m => m.id === me);
  if (!group || !mine) throw new CommunityError(404, 'This group is unavailable.');
  return { group, list, mine };
}
export const event = (db, groupId, body) => db.query("INSERT INTO social.message(group_id,kind,body) VALUES($1,'event',$2)", [groupId, body.slice(0, 1000)]);
export const touch = (db, groupId) => db.query('UPDATE social."group" SET updated_at=now() WHERE id=$1', [groupId]);
export async function myProfile(db, me) {
  const p = (await db.query('SELECT first_name AS "firstName", area, times, visible, gender FROM social.profile WHERE user_id=$1', [me])).rows[0];
  if (profileIssue(p)) throw new CommunityError(409, profileIssue(p) ?? 'Finish your profile first.');
  if (!p.visible) throw new CommunityError(409, 'Turn on Open to plans before inviting someone.');
  return p;
}
/** The invitee must be open to plans, an adult, unrestricted and not blocked with anyone already in the group. */
export async function invitable(db, target, memberIds) {
  const row = (await db.query(`SELECT ${nameOf} AS name FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE p.user_id=$1 AND p.visible AND u."adultConfirmed" AND ${notRestricted('p.user_id')}`, [target])).rows[0];
  if (!row) throw new CommunityError(404, 'This person is not open to plans.');
  await notBlockedWith(db, target, memberIds, 'This person is not open to plans.');
  if (Number((await db.query(`SELECT count(*) FROM social.member m WHERE m.user_id=$1 AND m.status='invited' AND ${liveSql('m')}`, [target])).rows[0].count) >= 30) {
    throw new CommunityError(409, 'This person has too many pending invitations.');
  }
  return row.name;
}
export async function notBlockedWith(db, person, others, message) {
  for (const id of others) if (id !== person && (await db.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [person, id])).rowCount === 0) throw new CommunityError(404, message);
}
/** A kaki is someone you have shared a meal with (both said you went); they are invited, never added without saying yes. */
export const kakiSql = `a.attended='yes' AND b.attended='yes'`;
export async function requireKaki(db, me, kaki) {
  const row = (await db.query(`SELECT ${nameOf} AS name FROM social.member a JOIN social.member b ON a.group_id=b.group_id JOIN public."user" u ON u.id=b.user_id
    LEFT JOIN social.profile p ON p.user_id=u.id WHERE a.user_id=$1 AND b.user_id=$2 AND ${kakiSql}
      AND u."adultConfirmed" AND ${notRestricted('u.id')} AND ${notBlocked('u.id', '$1')} LIMIT 1`, [me, kaki])).rows[0];
  if (!row) throw new CommunityError(404, 'Bring someone you have eaten with before.');
  return row.name;
}
/** Completed group tables: two-person tables open only after one (owner rule: no 1:1 first meetings). */
export const attendedCount = async (db, me) => Number((await db.query(`SELECT ${mealsSql('$1')} AS n`, [me])).rows[0].n);
/** The plan an invitee is offered: a snapshot, so later changes reach them only through a new offer. */
export const offerOf = group => group.venue && group.starts_text ? { venue: group.venue, placeId: group.place_id ?? null, starts: group.starts_text, pay: group.pay } : null;
/** Diet labels, practices, exclusions and table-talk prompts are shared only between accepted members (and with yourself). `diet` stays one release for older apps. */
const dietary = (m, me, accepted) => m.id === me || (accepted && m.status === 'accepted') ? m : { ...m, diets: null, diet: null, practices: null, excluded: null, prompts: [], why: [] };
function memberView(m, me, accepted) {
  const { gender: _gender, offer: _offer, expiresAt: _expires, eatAgain, acceptedAt: _acceptedAt, attended, ...rest } = dietary(m, me, accepted);
  return { ...rest, isMe: m.id === me, ...(m.id === me ? { attended, eatAgain } : {}) };
}
/** Accepted members see the live plan; an invitee sees the plan they were offered; open tables show their place and time to everyone. */
export function view(group, list, me, extra = {}) {
  const mine = list.find(m => m.id === me), accepted = mine?.status === 'accepted', listed = group.listed === true, now = Date.now();
  const shows = accepted || listed && mine?.status !== 'declined' && mine?.status !== 'left';
  const expired = mine?.status === 'invited' && !!mine.expiresAt && new Date(mine.expiresAt).getTime() <= now;
  const startsAt = group.starts ? new Date(group.starts).getTime() : NaN, afterMeal = accepted && !mine.attended && startsAt < now && startsAt > now - 14 * 86400000;
  return { id: group.id, size: group.size, intro: group.intro, venue: shows ? group.venue : '', starts: shows ? group.starts_text ?? '' : '', food: accepted ? group.food : '',
    pay: shows ? group.pay : 'own', createdAt: group.created_at, createdBy: group.created_by, myStatus: mine?.status, listed, origin: group.origin ?? 'invite', place: shows ? placeView(group.place_id) : null,
    areaCode: group.area_code ?? null, diets: group.diets ?? ['Plant-Based'], sameGender: group.same_gender ?? '', alcoholFree: group.alcohol_free === true, note: group.note ?? '',
    offer: mine?.status === 'invited' ? { ...(mine.offer ?? {}), place: placeView(mine.offer?.placeId) } : null, expiresAt: mine?.status === 'invited' ? mine.expiresAt : null, expired, afterMeal,
    members: list.map(m => memberView(m, me, accepted)), ...extra };
}
