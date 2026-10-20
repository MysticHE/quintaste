import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, pick, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { mealsSql, noShowSql, readDiets, pays, readFuture, sgText } from './rules.mjs';
import { placeView, readAreaCode, requirePlace, venueText } from './places.mjs';
import { attendedCount, balanceIssue, event, invitable, liveSql, myProfile, nameOf, notBlockedWith, offerDays, offerOf, onlyWomanFits, refreshHold, requireKaki, seatsOf, touch, waivedBy } from './group-core.mjs';

/** Open tables: groups of 4 or 6 at a catalogue place that any member may join. Chat, plans and leaving reuse the group routes. */
export const tables = express.Router();
const seatedSql = status => `(SELECT coalesce(json_agg(json_build_object('id', u.id, 'name', ${nameOf}, 'hasFace', EXISTS (SELECT 1 FROM social.face f WHERE f.user_id=u.id)) ORDER BY m.accepted_at), '[]')
  FROM social.member m JOIN public."user" u ON u.id=m.user_id LEFT JOIN social.profile p ON p.user_id=u.id WHERE m.group_id=g.id AND m.status IN (${status}))`;
/** Seats held: accepted members plus invitations that have not expired. */
const heldSql = `(SELECT count(*)::int FROM social.member m WHERE m.group_id=g.id AND ${liveSql('m')})`;
const columns = `g.id, g.size, g.venue, ${sgText('g.starts')} AS starts, g.pay, g.place_id AS "placeId", g.area_code AS "areaCode", g.diets, g.same_gender AS "sameGender",
  g.alcohol_free AS "alcoholFree", g.note, g.created_by AS "hostId", g.hold_until AS "holdUntil", g.balance_ok_by, ${heldSql} AS held, ${seatedSql("'accepted'")} AS seated,
  (SELECT json_build_object('id', u.id, 'name', ${nameOf}, 'hasFace', EXISTS (SELECT 1 FROM social.face f WHERE f.user_id=u.id),
    'tables', ${mealsSql('u.id')},
    'noShows', ${noShowSql('u.id', 180)})
    FROM public."user" u LEFT JOIN social.profile p ON p.user_id=u.id WHERE u.id=g.created_by) AS host,
  (SELECT m.status FROM social.member m WHERE m.group_id=g.id AND m.user_id=$1) AS "myStatus"`;
/** Visible to the viewer: an upcoming open table, host unrestricted, nobody seated is blocked either way, and same-gender tables only to that gender. */
const visibleSql = `g.listed AND g.starts > now() AND ${notRestricted('g.created_by')}
  AND EXISTS (SELECT 1 FROM social.member hm WHERE hm.group_id=g.id AND hm.user_id=g.created_by AND hm.status='accepted') AND NOT EXISTS (SELECT 1 FROM social.member bm WHERE bm.group_id=g.id
  AND bm.status IN ('invited','accepted') AND NOT ${notBlocked('bm.user_id', '$1')}) AND (g.same_gender='' OR g.same_gender=(SELECT gender FROM social.profile WHERE user_id=$1))`;
const holdLabel = at => 'Held for a woman until ' + new Date(at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', weekday: 'short', hour: 'numeric', minute: '2-digit' });
/** Live seats with genders for several tables in one query (internal; genders are never sent). */
async function seatsByTable(db, ids) {
  const rows = (await db.query(`SELECT m.group_id, m.user_id AS id, m.status, coalesce(p.gender,'') AS gender FROM social.member m LEFT JOIN social.profile p ON p.user_id=m.user_id
    WHERE m.group_id = ANY($1::uuid[]) AND ${liveSql('m')}`, [ids])).rows;
  const map = new Map(ids.map(id => [id, []]));
  for (const { group_id: groupId, ...seat } of rows) map.get(groupId)?.push(seat);
  return map;
}
/**
 * Seat state for the viewer on several tables. A table where only a woman can take the last seat but whose hold never
 * started (an invitation expired, or someone left by blocking) starts its 24-hour hold here, so the hold is never skipped.
 */
async function seatStates(db, rows, me) {
  const mine = (await db.query('SELECT gender FROM social.profile WHERE user_id=$1', [me])).rows[0]?.gender ?? '', seats = await seatsByTable(db, rows.map(r => r.id));
  const holding = row => !waivedBy(row, seats.get(row.id)) && onlyWomanFits(seats.get(row.id).map(s => s.gender), row.size);
  const unstarted = rows.filter(row => holding(row) && !row.holdUntil);
  for (const row of unstarted) await refreshHold(db, row.id);
  if (unstarted.length) {
    const started = new Map((await db.query('SELECT id, hold_until FROM social."group" WHERE id = ANY($1::uuid[])', [unstarted.map(r => r.id)])).rows.map(r => [r.id, r.hold_until]));
    for (const row of unstarted) row.holdUntil = started.get(row.id) ?? null;
  }
  const now = Date.now();
  return rows.map(row => {
    const list = seats.get(row.id), genders = list.map(s => s.gender), held = holding(row), waived = waivedBy(row, list);
    const holdActive = held && !!row.holdUntil && new Date(row.holdUntil).getTime() > now, seated = row.myStatus === 'accepted' || row.myStatus === 'invited';
    const canOpenSeat = held && !holdActive && row.myStatus === 'accepted' && mine === 'woman' && genders.filter(g => g === 'woman').length === 1;
    let joinIssue = seated ? null : !mine ? 'Add your gender in your profile to join open tables.' : balanceIssue(genders, row.size, [mine], waived);
    if (joinIssue && holdActive && mine) joinIssue = holdLabel(row.holdUntil);
    return { joinIssue, needsGender: !seated && !mine, seatHeld: held, holdUntil: holdActive ? row.holdUntil : null, canOpenSeat };
  });
}
const shape = (row, state) => { const { balance_ok_by: _ok, holdUntil: _hold, ...rest } = row; return { ...rest, ...state, place: placeView(row.placeId), past: false }; };
tables.get('/tables', async (req, res) => {
  const me = res.locals.user.id, q = req.query, params = [me], where = [visibleSql];
  const add = value => { params.push(value); return '$' + params.length; };
  const area = readAreaCode(q.area);
  if (area) where.push(`g.area_code=${add(area)}`);
  if (typeof q.place === 'string' && /^[a-z0-9][a-z0-9-]{2,119}$/.test(q.place)) where.push(`g.place_id=${add(q.place)}`);
  if (q.day === 'today') where.push(`(g.starts AT TIME ZONE 'Asia/Singapore')::date = (now() AT TIME ZONE 'Asia/Singapore')::date`);
  if (q.day === 'week') where.push(`g.starts < now() + interval '7 days'`);
  if (q.day === 'weekend') where.push(`extract(isodow FROM g.starts AT TIME ZONE 'Asia/Singapore') IN (6,7) AND g.starts < now() + interval '9 days'`);
  if (typeof q.q === 'string' && q.q.trim()) where.push(`(g.venue || ' ' || g.note) ILIKE ${add('%' + q.q.trim().slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%')}`);
  const rows = (await pool.query(`SELECT ${columns} FROM social."group" g WHERE ${where.join(' AND ')} ORDER BY g.starts LIMIT 60`, params)).rows;
  const states = await seatStates(pool, rows, me);
  res.json({ items: rows.map((row, i) => shape(row, states[i])) });
});
tables.get('/tables/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  const row = (await pool.query(`SELECT ${columns} FROM social."group" g WHERE g.id=$2 AND (${visibleSql}
    OR g.listed AND EXISTS (SELECT 1 FROM social.member m WHERE m.group_id=g.id AND m.user_id=$1))`, [me, id])).rows[0];
  if (!row) throw new CommunityError(404, 'This table is unavailable.');
  res.json(shape(row, (await seatStates(pool, [row], me))[0]));
});
function readTable(body) {
  body ??= {};
  const size = pick(Number(body.size), [4, 6], 0);
  if (!size) throw new CommunityError(400, 'Choose a table of 4 or 6.');
  return { size, starts: readFuture(body.starts), pay: pick(body.pay, pays, 'own'), diets: readDiets(body.diets), sameGender: body.sameGender === true,
    alcoholFree: body.alcoholFree === true, note: text(body.note, 120, { field: 'Note' }), areaCode: readAreaCode(body.areaCode), listed: body.listed !== false,
    kaki: body.kakiId ? requireUser(body.kakiId) : null, invite: Array.isArray(body.invite) ? [...new Set(body.invite.map(requireUser))].slice(0, 5) : [] };
}
/** Start a table: open to everyone (listed) or, for Repeat, private to the people you invite. */
tables.post('/tables', async (req, res) => {
  const me = res.locals.user.id, t = readTable(req.body?.table), place = await requirePlace(req.body?.table?.placeId);
  const guests = [...new Set([...(t.kaki ? [t.kaki] : []), ...t.invite])].filter(id => id !== me);
  if (!t.listed && !guests.length) throw new CommunityError(400, 'Invite someone to a private table.');
  if (guests.length + 1 > t.size) throw new CommunityError(400, `A table of ${t.size} holds ${t.size - 1} guests.`);
  await throttle('social-table:' + me, 20, 86400, 'You can start 20 tables a day.');
  const id = await transaction(async db => {
    const p = await myProfile(db, me);
    if (t.listed && !p.gender) throw new CommunityError(409, 'Add your gender in your profile to host open tables.');
    if (Number((await db.query(`SELECT count(*) FROM social."group" WHERE created_by=$1 AND listed AND starts > now()`, [me])).rows[0].count) >= 5) {
      throw new CommunityError(409, 'You host 5 upcoming tables. Wait for one to pass first.');
    }
    const names = [];
    for (const guest of guests) { names.push(await requireKaki(db, me, guest)); await invitable(db, guest, [me, ...guests]); }
    const group = (await db.query(`INSERT INTO social."group"(created_by,size,intro,venue,starts,pay,place_id,area_code,diets,same_gender,alcohol_free,note,listed,origin)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'table') RETURNING *, ${sgText('starts')} AS starts_text`,
    [me, t.size, t.note || 'Table at ' + place.name, venueText(place), t.starts, t.pay, place.id, t.areaCode, t.diets, t.sameGender ? p.gender : '', t.alcoholFree, t.note, t.listed])).rows[0];
    await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,accepted_at) VALUES($1,$2,'accepted',now(),now())`, [group.id, me]);
    for (const guest of guests) {
      await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,offer,expires_at,kaki_of) VALUES($1,$2,'invited',to_timestamp(0),$3,now() + make_interval(days => $4),$5)`,
        [group.id, guest, offerOf(group), offerDays, guest === t.kaki ? me : null]);
    }
    await db.query("INSERT INTO social.message(group_id,sender_id,body) VALUES($1,$2,$3)", [group.id, me, group.intro]);
    await event(db, group.id, `${p.firstName} started a table` + (names.length ? ' with ' + names.join(', ') : ''));
    return group.id;
  }, 'social-table-host:' + me);
  res.status(201).json({ id });
});
/** Join an open table, optionally with a kaki you have eaten with (they are invited and must say yes). */
tables.post('/tables/:id/join', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id), kaki = req.body?.kakiId ? requireUser(req.body.kakiId) : null;
  await throttle('social-join:' + me, 30, 3600);
  await transaction(async db => {
    const p = await myProfile(db, me);
    const g = (await db.query(`SELECT g.*, ${sgText('g.starts')} AS starts_text FROM social."group" g WHERE g.id=$1 AND g.listed AND g.origin='table' AND g.starts > now() AND ${notRestricted('g.created_by')} FOR UPDATE`, [id])).rows[0];
    if (!g) throw new CommunityError(404, 'This table is unavailable.');
    const seats = await seatsOf(db, id);
    if (seats.some(s => s.id === me)) throw new CommunityError(409, 'You are already at this table.');
    if (!p.gender) throw new CommunityError(409, 'Add your gender in your profile to join open tables.');
    if (g.same_gender && g.same_gender !== p.gender) throw new CommunityError(404, 'This table is unavailable.');
    const kakiName = kaki ? await requireKaki(db, me, kaki) : null;
    const kakiGender = kaki ? (await db.query('SELECT gender FROM social.profile WHERE user_id=$1', [kaki])).rows[0]?.gender ?? '' : null;
    if (kaki && (!kakiGender || g.same_gender && kakiGender !== g.same_gender)) throw new CommunityError(409, 'Your kaki cannot join this table.');
    await notBlockedWith(db, me, seats.map(s => s.id), 'This table is unavailable.');
    if (kaki) { await invitable(db, kaki, seats.map(s => s.id)); if (seats.some(s => s.id === kaki)) throw new CommunityError(409, 'Your kaki is already at this table.'); }
    const issue = balanceIssue(seats.map(s => s.gender), g.size, kaki ? [p.gender, kakiGender] : [p.gender], waivedBy(g, seats));
    if (issue) throw new CommunityError(409, issue);
    if (await attendedCount(db, me) === 0 && Number((await db.query("SELECT count(*) FROM social.member m JOIN social.\"group\" x ON x.id=m.group_id WHERE m.user_id=$1 AND m.status='accepted' AND x.listed AND x.starts > now()", [me])).rows[0].count) >= 3) {
      throw new CommunityError(409, 'New members can hold 3 upcoming tables. Go to one first.');
    }
    await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,accepted_at) VALUES($1,$2,'accepted',now(),now())
      ON CONFLICT(group_id,user_id) DO UPDATE SET status='accepted', accepted_at=now(), confirmed=false, offer=NULL, expires_at=NULL, updated_at=now()`, [id, me]);
    if (kaki) {
      await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,offer,expires_at,kaki_of) VALUES($1,$2,'invited',to_timestamp(0),$3,now() + make_interval(days => $4),$5)
        ON CONFLICT(group_id,user_id) DO UPDATE SET status='invited', accepted_at=NULL, confirmed=false, offer=$3, expires_at=now() + make_interval(days => $4), kaki_of=$5, updated_at=now()`,
      [id, kaki, offerOf(g), offerDays, me]);
    }
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [id]);
    await event(db, id, `${p.firstName} joined` + (kakiName ? ` with ${kakiName}` : ''));
    await refreshHold(db, id);
    await touch(db, id);
  }, 'social-table:' + id);
  res.json({ joined: true });
});
/** After the 24-hour hold, the one woman seated may open the last seat to anyone. Only she can; it lasts while she stays. */
tables.post('/tables/:id/open-seat', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  const opened = await transaction(async db => {
    const g = (await db.query(`SELECT * FROM social."group" WHERE id=$1 AND listed AND starts > now() FOR UPDATE`, [id])).rows[0];
    if (!g) throw new CommunityError(404, 'This table is unavailable.');
    const seats = await seatsOf(db, id), mine = seats.find(s => s.id === me), genders = seats.map(s => s.gender);
    if (mine?.status !== 'accepted' || mine.gender !== 'woman' || genders.filter(x => x === 'woman').length !== 1 || !onlyWomanFits(genders, g.size)) {
      throw new CommunityError(409, 'Only the woman seated can open this seat.');
    }
    // A hold that never started starts now (and is kept): the seat is always held for a woman for 24 hours first.
    if (!g.hold_until) { await refreshHold(db, id); return false; }
    if (new Date(g.hold_until).getTime() > Date.now()) throw new CommunityError(409, 'The seat is still held for a woman.');
    await db.query('UPDATE social."group" SET balance_ok_by=$2, hold_until=NULL, updated_at=now() WHERE id=$1', [id, me]);
    await event(db, id, 'The last seat is open to anyone');
    return true;
  }, 'social-table:' + id);
  if (!opened) throw new CommunityError(409, 'The seat is still held for a woman.');
  res.json({ opened: true });
});
