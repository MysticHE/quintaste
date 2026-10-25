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
  await db.query("UPDATE social.dinner SET status='accepted', waiting_on=NULL, updated_at=now() WHERE id=$1", [id]);
  await postLine(db, me, dinner.other, { kind: 'dinner', body: 'accepted', dinnerId: id, sender: me });
}));
/** Suggest Another Time: the new time replaces the old one and the other person answers next. */
dinners.post('/dinners/:id/suggest', async (req, res) => {
  const starts = readStarts(req.body?.starts);
  await act(req, res, async (db, me, id) => {
    const dinner = await waitingOn(db, me, id);
    await requirePair(db, me, dinner.other);
    await db.query(`UPDATE social.dinner SET starts=$2, waiting_on=$3, suggested=true, expires_at=${openFor.replace('$starts', '$2')}, updated_at=now() WHERE id=$1`, [id, starts, dinner.other]);
    await postLine(db, me, dinner.other, { kind: 'dinner', body: 'suggested', dinnerId: id, sender: me });
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
    const both = (await db.query('SELECT count(*) FILTER (WHERE eat_again)::int AS yes FROM social.dinner_report WHERE dinner_id=$1', [id])).rows[0].yes === 2;
    if (both) await postLine(db, me, dinner.host_id === me ? dinner.guest_id : dinner.host_id, { kind: 'dinner', body: 'again', dinnerId: id });
  });
});
