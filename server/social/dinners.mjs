import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, pick, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { meetAgeSql, friendsSql, nameSql, pairOf, pausedUntilSql, reachableSql, requireMeet, standing, verifiedSql } from './access.mjs';
import { requirePlace, venueText } from './places.mjs';
import { readFuture, sgText } from './rules.mjs';
import { photoUrl } from './profile.mjs';
import { postLine } from './friends.mjs';

export const dinners = express.Router();
export const pays = ['split', 'host', 'own'];
/** Invitations stay open for three days, or until the dinner time if that is sooner. */
const openFor = "least(now() + interval '3 days', $starts)";
/** How long after a dinner each person can say how it went. */
const reportWindow = "interval '30 days'";
/** A dinner time: in the future and within 60 days. */
function readStarts(value) {
  const at = readFuture(value, 'Date and time');
  if (at.getTime() - Date.now() > 60 * 86400000) throw new CommunityError(400, 'Choose a date within the next two months.');
  return at;
}
/** True when `who` already has a confirmed dinner within two hours of `starts` (other than dinner `except`). */
async function busyAt(db, who, starts, except = null) {
  return (await db.query(`SELECT 1 FROM social.dinner WHERE status='accepted' AND (host_id=$1 OR guest_id=$1) AND id IS DISTINCT FROM $3::uuid
    AND starts > $2::timestamptz - interval '2 hours' AND starts < $2::timestamptz + interval '2 hours' LIMIT 1`, [who, starts, except])).rowCount > 0;
}
const busyError = () => new CommunityError(409, 'You already have a dinner around then. Choose another time.', 'SOCIAL_BUSY');
/** Lapses invitations nobody answered in time. */
const expire = (db, me) => db.query(`UPDATE social.dinner SET status='expired', updated_at=now() WHERE status='invited' AND (expires_at < now() OR starts < now())
  AND (host_id=$1 OR guest_id=$1)`, [me]);
/**
 * Both people may share this dinner: friends, of opposite genders, both verified and 21 to 45, neither paused for no-shows
 * and not blocked. `who` is 'you' or 'them' for the member the problem is about.
 */
async function requirePair(db, me, other) {
  const row = (await db.query(`SELECT p.gender, ${friendsSql('$1::text', '$2::text')} AS friend, ${verifiedSql('$2::text')} AS verified, ${meetAgeSql('$2::text')} AS adult,
      ${pausedUntilSql('$2::text')} AS paused FROM social.profile p WHERE p.user_id=$2 AND ${reachableSql('p.user_id', '$1')}`, [me, other])).rows[0];
  const mine = await standing(me, db);
  requireMeet(mine);
  if (mine.pausedUntil) throw new CommunityError(403, 'Dinner invites are paused for you after two missed dinners. They come back on ' + new Date(mine.pausedUntil).toISOString().slice(0, 10) + '.', 'SOCIAL_PAUSED');
  if (!row || !row.friend) throw new CommunityError(403, 'Dinner invites are only for friends.', 'SOCIAL_NOT_FRIENDS');
  if (row.gender === mine.gender || !row.gender) throw new CommunityError(403, 'Dinner invites are only for friends of the opposite gender.', 'SOCIAL_SAME_GENDER');
  if (!row.verified || !row.adult || (row.paused && new Date(row.paused) > new Date())) throw new CommunityError(403, 'They cannot take dinner invites right now.', 'SOCIAL_THEM');
}
const view = `d.id, d.host_id=$1 AS hosting, d.place_id AS "placeId", d.place_name AS "placeName", ${sgText('d.starts')} AS starts, d.pay, d.message, d.status,
  d.waiting_on=$1 AS "yourTurn", d.suggested, d.expires_at AS "expiresAt", d.starts < now() AS past, d.cancelled_by=$1 AS "youCancelled",
  u.id AS "withId", ${nameSql('p', 'u')} AS "withName", (SELECT json_build_object('id', ph.id, 'digest', ph.digest) FROM social.photo ph WHERE ph.user_id=u.id AND ph.position=0) AS photo,
  EXISTS (SELECT 1 FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id=$1) AS reported,
  (d.status='accepted' AND d.starts < now() AND d.starts > now() - ${reportWindow}) AS "reportOpen"`;
const from = `social.dinner d JOIN public."user" u ON u.id=CASE WHEN d.host_id=$1 THEN d.guest_id ELSE d.host_id END LEFT JOIN social.profile p ON p.user_id=u.id`;
const shape = ({ photo, ...row }) => ({ ...row, photo: photo ? photoUrl(photo, 'thumb') : null });

/** Dinners tab: invitations waiting and upcoming dinners, then the last year of past ones. */
dinners.get('/dinners', async (_req, res) => {
  const me = res.locals.user.id;
  await expire(pool, me);
  const rows = (await pool.query(`SELECT ${view} FROM ${from} WHERE (d.host_id=$1 OR d.guest_id=$1) AND ${reachableSql('u.id', '$1')}
    AND (d.status='invited' OR (d.status IN ('accepted','declined','cancelled','expired') AND d.starts > now() - interval '1 year'))
    ORDER BY d.starts DESC LIMIT 200`, [me])).rows.map(shape);
  const live = row => row.status === 'invited' || (row.status === 'accepted' && !row.past);
  // The profile's Dinners count: every dinner the member said they went to, not only this year's list.
  const met = (await pool.query("SELECT count(*)::int AS n FROM social.dinner_report WHERE user_id=$1 AND met='yes'", [me])).rows[0].n;
  res.json({ upcoming: rows.filter(live).reverse(), past: rows.filter(row => !live(row)), met });
});
/**
 * One dinner. After it, each person sees only their own report and the note the other person left for them. "Eat
 * together again" is never shown on its own: `again` is true only when both said yes.
 */
dinners.get('/dinners/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This dinner is unavailable.');
  await expire(pool, me);
  const row = (await pool.query(`SELECT ${view},
      (SELECT json_build_object('met', r.met, 'eatAgain', r.eat_again, 'note', r.note) FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id=$1) AS mine,
      (SELECT nullif(r.note, '') FROM social.dinner_report r WHERE r.dinner_id=d.id AND r.user_id<>$1) AS "theirNote",
      (SELECT count(*) FILTER (WHERE r.eat_again) = 2 FROM social.dinner_report r WHERE r.dinner_id=d.id) AS again
    FROM ${from} WHERE d.id=$2 AND (d.host_id=$1 OR d.guest_id=$1) AND ${reachableSql('u.id', '$1')}`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This dinner is unavailable.');
  res.json({ ...shape(row), again: row.again === true });
});

/** A 1-to-1 invitation: when, a catalogue place, who pays and an optional message. One open invitation per pair; five a day. */
dinners.post('/dinners', async (req, res) => {
  const me = res.locals.user.id, other = requireUser(req.body?.userId), b = req.body ?? {};
  if (other === me) throw new CommunityError(400, 'Choose a friend to invite.');
  const place = await requirePlace(b.placeId), starts = readStarts(b.starts), pay = pick(b.pay, pays, null), message = text(b.message, 300, { field: 'Message' });
  if (!pay) throw new CommunityError(400, 'Choose who pays.');
  await throttle('social-dinner:' + me, 5, 86400, 'You can send five invites a day. Try again tomorrow.');
  const id = await transaction(async db => {
    await expire(db, me);
    await requirePair(db, me, other);
    const open = await db.query(`SELECT 1 FROM social.dinner WHERE status='invited' AND ((host_id=$1 AND guest_id=$2) OR (host_id=$2 AND guest_id=$1))`, [me, other]);
    if (open.rowCount) throw new CommunityError(409, 'There is already an invite waiting between you.');
    if (await busyAt(db, me, starts)) throw busyError();
    const dinner = (await db.query(`INSERT INTO social.dinner(host_id, guest_id, place_id, place_name, starts, pay, message, waiting_on, expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$2,${openFor.replace('$starts', '$5')}) RETURNING id`, [me, other, place.id, venueText(place), starts, pay, message])).rows[0].id;
    await postLine(db, me, other, { kind: 'dinner', body: 'invited', dinnerId: dinner, sender: me });
    return dinner;
  }, 'social-pair:' + pairOf(me, other).join(':'));
  logger.info({ event: 'social_dinner_invited' });
  res.status(201).json({ id });
});
/** Loads an open invitation the member must answer, locked for this transaction. */
async function waitingOn(db, me, id) {
  const row = (await db.query(`SELECT * FROM social.dinner WHERE id=$1 AND status='invited' AND waiting_on=$2 AND expires_at > now() AND starts > now() FOR UPDATE`, [id, me])).rows[0];
  if (!row) throw new CommunityError(409, 'This invite is no longer open.');
  return { ...row, other: row.host_id === me ? row.guest_id : row.host_id };
}
async function act(req, res, work) {
  const me = res.locals.user.id, id = requireId(req.params.id, 'This dinner is unavailable.');
  const pair = (await pool.query('SELECT host_id, guest_id FROM social.dinner WHERE id=$1 AND (host_id=$2 OR guest_id=$2)', [id, me])).rows[0];
  if (!pair) throw new CommunityError(404, 'This dinner is unavailable.');
  await transaction(db => work(db, me, id), 'social-pair:' + pairOf(pair.host_id, pair.guest_id).join(':'));
  res.json({ ok: true });
}
dinners.post('/dinners/:id/accept', (req, res) => act(req, res, async (db, me, id) => {
  const dinner = await waitingOn(db, me, id);
  await requirePair(db, me, dinner.other);
  if (await busyAt(db, me, dinner.starts, id)) throw busyError();
  // The inviter may have said yes to another dinner at this time since sending it; they suggest a new time or cancel.
  if (await busyAt(db, dinner.other, dinner.starts, id)) throw new CommunityError(409, 'This time no longer works for them. Suggest another time.', 'SOCIAL_THEM_BUSY');
  await db.query("UPDATE social.dinner SET status='accepted', waiting_on=NULL, updated_at=now() WHERE id=$1", [id]);
  await postLine(db, me, dinner.other, { kind: 'dinner', body: 'accepted', dinnerId: id, sender: me });
}));
/**
 * Suggest a change: a new time, a new catalogue place, or both, replacing the old ones; the other person answers next. The chat
 * line says what changed ('suggested' time, 'suggestedPlace', 'suggestedBoth').
 */
dinners.post('/dinners/:id/suggest', async (req, res) => {
  const b = req.body ?? {}, starts = b.starts ? readStarts(b.starts) : null, place = b.placeId ? await requirePlace(b.placeId) : null;
  if (!starts && !place) throw new CommunityError(400, 'Choose a new time or place.');
  await act(req, res, async (db, me, id) => {
    const dinner = await waitingOn(db, me, id);
    await requirePair(db, me, dinner.other);
    const movedPlace = !!place && place.id !== dinner.place_id, movedTime = !!starts && starts.getTime() !== new Date(dinner.starts).getTime();
    if (!movedPlace && !movedTime) throw new CommunityError(400, 'Choose a different time or place.');
    if (await busyAt(db, me, starts ?? dinner.starts, id)) throw busyError();
    await db.query(`UPDATE social.dinner SET starts=coalesce($2, starts), place_id=coalesce($4, place_id), place_name=coalesce($5, place_name), waiting_on=$3, suggested=true,
      expires_at=least(now() + interval '3 days', coalesce($2, starts)), updated_at=now() WHERE id=$1`,
      [id, movedTime ? starts : null, dinner.other, movedPlace ? place.id : null, movedPlace ? venueText(place) : null]);
    await postLine(db, me, dinner.other, { kind: 'dinner', body: movedPlace ? (movedTime ? 'suggestedBoth' : 'suggestedPlace') : 'suggested', dinnerId: id, sender: me });
  });
});
/**
 * Running late: a line in the chat saying how late, from three hours before a confirmed dinner until an hour after it starts.
 * Three a dinner per person.
 */
/** Twin of `lateMinutes` in src/services/social-api.ts; change both together. */
const lateMinutes = [10, 20, 30];
dinners.post('/dinners/:id/late', async (req, res) => {
  const minutes = lateMinutes.find(n => n === Number(req.body?.minutes));
  if (!minutes) throw new CommunityError(400, 'Choose how late you are.');
  await act(req, res, async (db, me, id) => {
    const dinner = (await db.query(`SELECT host_id, guest_id FROM social.dinner WHERE id=$1 AND status='accepted'
      AND starts < now() + interval '3 hours' AND starts > now() - interval '1 hour'`, [id])).rows[0];
    if (!dinner) throw new CommunityError(409, 'You can say you are running late on the day of the dinner.');
    await throttle('social-late:' + me + ':' + id, 3, 6 * 3600, 'You already told them a few times.');
    await postLine(db, me, dinner.host_id === me ? dinner.guest_id : dinner.host_id, { kind: 'dinner', body: 'late' + minutes, dinnerId: id, sender: me });
  });
});
dinners.post('/dinners/:id/decline', (req, res) => act(req, res, async (db, me, id) => {
  const dinner = await waitingOn(db, me, id);
  await db.query("UPDATE social.dinner SET status='declined', waiting_on=NULL, updated_at=now() WHERE id=$1", [id]);
  await postLine(db, me, dinner.other, { kind: 'dinner', body: 'declined', dinnerId: id, sender: me });
}));
/** Either person can call off an open invitation or an upcoming dinner. */
dinners.post('/dinners/:id/cancel', (req, res) => act(req, res, async (db, me, id) => {
  const dinner = (await db.query(`SELECT host_id, guest_id FROM social.dinner WHERE id=$1 AND (status='invited' OR (status='accepted' AND starts > now())) FOR UPDATE`, [id])).rows[0];
  if (!dinner) throw new CommunityError(409, 'This dinner can no longer be cancelled.');
  await db.query("UPDATE social.dinner SET status='cancelled', waiting_on=NULL, cancelled_by=$2, updated_at=now() WHERE id=$1", [id, me]);
  await postLine(db, me, dinner.host_id === me ? dinner.guest_id : dinner.host_id, { kind: 'dinner', body: 'cancelled', dinnerId: id, sender: me });
}));
/**
 * When one person says "We met" and the other "They didn't come", the claim does not count towards a pause (access.mjs) and
 * staff get one case for the dinner, filed under the member said not to have come.
 */
async function flagDisagreement(db, id, me, met) {
  if (met !== 'yes' && met !== 'no_show') return;
  const other = (await db.query('SELECT user_id, met FROM social.dinner_report WHERE dinner_id=$1 AND user_id<>$2', [id, me])).rows[0];
  if (!other || !((met === 'yes' && other.met === 'no_show') || (met === 'no_show' && other.met === 'yes'))) return;
  const [accused, accuser] = met === 'yes' ? [me, other.user_id] : [other.user_id, me];
  // Staff screens read the member from the part before the first "|".
  const subject = 'community:user:' + accused + '|dinner:' + id + '|by:' + accuser;
  if ((await db.query("SELECT 1 FROM ops.case_record WHERE kind='report' AND subject_id=$1", [subject])).rowCount) return;
  await db.query("INSERT INTO ops.case_record(kind,title,description,subject_id) VALUES('report',$1,$2,$3)", ['Dinner no-show disputed',
    `Dinner ${id}: one person said they met, the other said they didn't come. The claim is not counted towards a pause.`, subject]);
  logger.info({ event: 'social_dinner_disputed' });
}
/**
 * After the dinner (up to 30 days): did you meet, would you eat together again, and a note only the other person reads.
 * One report each. When both say they would eat together again, both are told in their chat.
 */
dinners.post('/dinners/:id/report', async (req, res) => {
  const b = req.body ?? {}, met = pick(b.met, ['yes', 'no_show', 'didnt_go'], null);
  if (!met) throw new CommunityError(400, 'Tell us if you met.');
  const eatAgain = met === 'yes' && typeof b.eatAgain === 'boolean' ? b.eatAgain : null, note = met === 'yes' ? text(b.note, 300, { field: 'Note' }) : '';
  await act(req, res, async (db, me, id) => {
    const dinner = (await db.query(`SELECT host_id, guest_id FROM social.dinner WHERE id=$1 AND status='accepted' AND starts < now() AND starts > now() - ${reportWindow} FOR UPDATE`, [id])).rows[0];
    if (!dinner) throw new CommunityError(409, 'You can tell us about this dinner after it starts, for up to 30 days.');
    const saved = await db.query('INSERT INTO social.dinner_report(dinner_id, user_id, met, eat_again, note) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [id, me, met, eatAgain, note]);
    if (!saved.rowCount) throw new CommunityError(409, 'You already told us about this dinner.');
    await flagDisagreement(db, id, me, met);
    const both = (await db.query('SELECT count(*) FILTER (WHERE eat_again)::int AS yes FROM social.dinner_report WHERE dinner_id=$1', [id])).rows[0].yes === 2;
    if (both) await postLine(db, me, dinner.host_id === me ? dinner.guest_id : dinner.host_id, { kind: 'dinner', body: 'again', dinnerId: id });
  });
});
