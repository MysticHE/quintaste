import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, pick, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { notBlocked } from '../community/router.mjs';
import { pays, readFuture, sgText, sizes } from './rules.mjs';
import { readAreaCode, requirePlace, venueText } from './places.mjs';
import { active, afterLeave, attendedCount, balanceIssue, event, invitable, isLive, liveSql, load, membersOf, myProfile, nameOf, offerDays, offerOf, refreshHold, requireKaki, touch, view, waivedBy } from './group-core.mjs';

export const groups = express.Router();
groups.get('/groups', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT g.*, ${sgText('g.starts')} AS starts_text,
      CASE m.status WHEN 'accepted' THEN (SELECT body FROM social.message x WHERE x.group_id=g.id AND x.kind='text' ORDER BY created_at DESC LIMIT 1)
        WHEN 'invited' THEN g.intro END AS last,
      m.status IN ('accepted','invited') AND EXISTS (SELECT 1 FROM social.message x WHERE x.group_id=g.id AND (x.sender_id IS NULL OR x.sender_id<>$1) AND x.created_at > m.read_at) AS unread
    FROM social."group" g JOIN social.member m ON m.group_id=g.id AND m.user_id=$1 AND NOT m.hidden ORDER BY g.updated_at DESC LIMIT 100`, [me])).rows;
  const lists = await membersOf(pool, rows.map(row => row.id));
  res.json({ items: rows.map(row => view(row, lists.get(row.id), me, { last: row.last, unread: row.unread, updatedAt: row.updated_at })) });
});
groups.get('/unread', async (_req, res) => {
  const me = res.locals.user.id;
  const row = (await pool.query(`SELECT count(*) FILTER (WHERE m.status='invited' AND (m.expires_at IS NULL OR m.expires_at > now()))::int AS invitations,
      count(*) FILTER (WHERE m.status='accepted' AND EXISTS (SELECT 1 FROM social.message x WHERE x.group_id=m.group_id AND (x.sender_id IS NULL OR x.sender_id<>$1) AND x.created_at > m.read_at))::int AS messages
    FROM social.member m WHERE m.user_id=$1`, [me])).rows[0];
  res.json(row);
});
groups.get('/groups/:id', async (req, res) => {
  const me = res.locals.user.id, { group, list } = await load(pool, requireId(req.params.id), me);
  // Read membership and messages in the same snapshot. Never-accepted members see only the introduction.
  const messages = (await pool.query(`SELECT x.id, x.sender_id AS "senderId", x.kind, x.body, x.created_at AS "createdAt", ${nameOf} AS "senderName"
    FROM (SELECT msg.* FROM social.message msg JOIN social.member access ON access.group_id=msg.group_id AND access.user_id=$2
      WHERE msg.group_id=$1 AND (access.status='accepted'
        OR (access.status='left' AND access.accepted_at IS NOT NULL AND msg.created_at<=access.updated_at)
        OR ((access.status IN ('invited','declined') OR (access.status='left' AND access.accepted_at IS NULL))
          AND msg.kind='text' AND msg.sender_id=$3 AND msg.body=$4)) ORDER BY msg.created_at DESC LIMIT 200) x
    LEFT JOIN public."user" u ON u.id=x.sender_id LEFT JOIN social.profile p ON p.user_id=x.sender_id ORDER BY x.created_at`, [group.id, me, group.created_by, group.intro])).rows;
  res.json(view(group, list, me, { messages: messages.map(m => ({ ...m, mine: m.senderId === me })) }));
});
/** An optional plan sent with an invitation: a catalogue place, a future time and who pays. */
async function readOffer(body) {
  if (!body || typeof body !== 'object') return null;
  const place = await requirePlace(body.placeId);
  return { venue: venueText(place), placeId: place.id, starts: readFuture(body.starts), pay: pick(body.pay, pays, 'own'), areaCode: readAreaCode(body.areaCode) };
}
/**
 * Start a group by inviting one person (and optionally a kaki you have eaten with); the group holds 2, 4 or 6 people
 * including you. A plan sent with it becomes the group's plan and each invitee's offer, open for three days.
 */
groups.post('/groups', async (req, res) => {
  const me = res.locals.user.id, target = requireUser(req.body?.personId), size = pick(Number(req.body?.size), sizes, 0);
  const intro = text(req.body?.intro, 300, { min: 1, field: 'Introduction' }), kaki = req.body?.kakiId ? requireUser(req.body.kakiId) : null;
  if (!size) throw new CommunityError(400, 'Choose 2, 4 or 6 people.');
  if (target === me || kaki === me || kaki === target) throw new CommunityError(400, 'Invite someone else.');
  if (kaki && size < 4) throw new CommunityError(400, 'Bring a kaki to a table of 4 or 6.');
  const offer = await readOffer(req.body?.offer);
  await throttle('social-invite:' + me, 20, 86400, 'You can send 20 invitations a day.');
  const id = await transaction(async db => {
    const p = await myProfile(db, me), name = await invitable(db, target, [me]);
    if (size === 2 && await attendedCount(db, me) < 1) throw new CommunityError(409, 'Tables for two open after your first group meal.');
    const kakiName = kaki ? await requireKaki(db, me, kaki) : null;
    if (kaki) await invitable(db, kaki, [me, target]);
    if ((await db.query(`SELECT 1 FROM social.member a JOIN social.member b ON a.group_id=b.group_id WHERE a.user_id=$1 AND b.user_id=$2
      AND ${liveSql('a')} AND ${liveSql('b')}`, [me, target])).rowCount) {
      throw new CommunityError(409, 'You already have an open invitation or group with this person. Open it in Inbox.');
    }
    if (Number((await db.query(`SELECT count(*) FROM social.member m WHERE m.user_id=$1 AND ${liveSql('m')}`, [me])).rows[0].count) >= 30) {
      throw new CommunityError(409, 'You have 30 open groups. Leave one first.');
    }
    const group = (await db.query(`INSERT INTO social."group"(created_by,size,intro,venue,starts,pay,place_id,area_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *, ${sgText('starts')} AS starts_text`,
      [me, size, intro, offer?.venue ?? '', offer?.starts ?? null, offer?.pay ?? 'own', offer?.placeId ?? null, offer?.areaCode ?? null])).rows[0];
    const snapshot = offerOf(group);
    await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,accepted_at) VALUES($1,$2,'accepted',now(),now())`, [group.id, me]);
    for (const [user, broughtBy] of [[target, null], ...(kaki ? [[kaki, me]] : [])]) {
      await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,offer,expires_at,kaki_of) VALUES($1,$2,'invited',to_timestamp(0),$3,now() + make_interval(days => $4),$5)`,
        [group.id, user, snapshot, offerDays, broughtBy]);
    }
    await db.query("INSERT INTO social.message(group_id,sender_id,body) VALUES($1,$2,$3)", [group.id, me, intro]);
    await event(db, group.id, `${p.firstName} invited ${name}` + (kakiName ? ` with ${kakiName}` : ''));
    return group.id;
  }, 'social-pair:' + [me, target].sort().join(':'));
  res.status(201).json({ id });
});
groups.post('/groups/:id/respond', async (req, res) => {
  const me = res.locals.user.id, accept = req.body?.accept === true;
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'invited') throw new CommunityError(409, 'This invitation is no longer pending.');
    if (accept && mine.expiresAt && new Date(mine.expiresAt).getTime() <= Date.now()) throw new CommunityError(409, 'This invitation expired.');
    if (accept) {
      for (const m of list) if (m.id !== me && active.includes(m.status) && (await db.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [m.id, me])).rowCount === 0) {
        throw new CommunityError(409, 'This group is unavailable.');
      }
      // Seats may have filled, or the table changed, since the invitation was sent: the open-table rules apply again.
      const others = list.filter(m => m.id !== me && isLive(m));
      if (list.filter(m => m.status === 'accepted').length >= group.size) throw new CommunityError(409, 'This table is full.');
      if (group.same_gender && group.same_gender !== mine.gender) throw new CommunityError(409, 'This group is unavailable.');
      if (group.listed) {
        if (!mine.gender) throw new CommunityError(409, 'Add your gender in your profile to join open tables.');
        const issue = balanceIssue(others.map(m => m.gender), group.size, [mine.gender], waivedBy(group, others.map(m => ({ id: m.id, status: m.status, gender: m.gender }))));
        if (issue) throw new CommunityError(409, issue);
      }
    }
    await db.query('UPDATE social.member SET status=$3, accepted_at=CASE WHEN $3=\'accepted\' THEN now() ELSE NULL END, confirmed=false, expires_at=NULL, updated_at=now(), read_at=now() WHERE group_id=$1 AND user_id=$2', [group.id, me, accept ? 'accepted' : 'declined']);
    if (accept) await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, `${mine.name} ${accept ? 'joined' : 'declined'}`);
    await refreshHold(db, group.id);
    await touch(db, group.id);
  });
  res.json({ status: accept ? 'accepted' : 'declined' });
});
groups.post('/groups/:id/invite', async (req, res) => {
  const me = res.locals.user.id, target = requireUser(req.body?.personId);
  await throttle('social-invite:' + me, 20, 86400, 'You can send 20 invitations a day.');
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'accepted') throw new CommunityError(403, 'Join the group before inviting others.');
    if (group.listed || group.origin === 'table') throw new CommunityError(409, 'People join tables from Tables. Share the table instead.');
    await myProfile(db, me);
    const reserved = list.filter(isLive);
    if (reserved.length >= group.size) throw new CommunityError(409, 'This group is full.');
    if (list.some(m => m.id === target && active.includes(m.status))) throw new CommunityError(409, 'This person is already in the group.');
    const name = await invitable(db, target, reserved.map(m => m.id));
    await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at,offer,expires_at) VALUES($1,$2,'invited',to_timestamp(0),$3,now() + make_interval(days => $4))
      ON CONFLICT(group_id,user_id) DO UPDATE SET status='invited', accepted_at=NULL, confirmed=false, offer=$3, expires_at=now() + make_interval(days => $4), updated_at=now()`,
    [group.id, target, offerOf(group), offerDays]);
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, `${mine.name} invited ${name}`);
    await touch(db, group.id);
  });
  res.status(201).json({ invited: true });
});
groups.post('/groups/:id/messages', async (req, res) => {
  const me = res.locals.user.id, body = text(req.body?.text, 1000, { min: 1, field: 'Message' });
  await throttle('social-message:' + me, 30, 60, 'You are sending messages too quickly.');
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me);
    if (mine.status !== 'accepted') throw new CommunityError(403, 'Join the group to chat.');
    if (list.filter(m => m.status === 'accepted').length < 2) throw new CommunityError(409, 'Chat opens when someone accepts.');
    await db.query('INSERT INTO social.message(group_id,sender_id,body) VALUES($1,$2,$3)', [group.id, me, body]);
    await db.query('UPDATE social.member SET read_at=now() WHERE group_id=$1 AND user_id=$2', [group.id, me]);
    await touch(db, group.id);
  });
  res.status(201).json({ sent: true });
});
groups.post('/groups/:id/leave', async (req, res) => {
  const me = res.locals.user.id;
  await transaction(async db => {
    const { group, mine } = await load(db, requireId(req.params.id), me, true);
    if (!active.includes(mine.status)) return;
    await db.query("UPDATE social.member SET status='left', confirmed=false, updated_at=now() WHERE group_id=$1 AND user_id=$2", [group.id, me]);
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, `${mine.name} left`);
    await afterLeave(db, group.id, me);
    await touch(db, group.id);
  });
  res.json({ left: true });
});
/** Removes a group you have left or declined from your own list; others keep their history. */
groups.delete('/groups/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  // Rows with an after-meal answer are hidden rather than deleted, so attendance and no-show history survive.
  const hidden = await pool.query("UPDATE social.member SET hidden=true WHERE group_id=$1 AND user_id=$2 AND status IN ('left','declined') AND attended IS NOT NULL", [id, me]);
  const removed = hidden.rowCount ? hidden : await pool.query("DELETE FROM social.member WHERE group_id=$1 AND user_id=$2 AND status IN ('left','declined')", [id, me]);
  if (!removed.rowCount) throw new CommunityError(409, 'Leave this group before deleting it.');
  await pool.query('DELETE FROM social."group" g WHERE g.id=$1 AND NOT EXISTS (SELECT 1 FROM social.member m WHERE m.group_id=g.id)', [id]);
  res.json({ deleted: true });
});
groups.post('/groups/:id/read', async (req, res) => {
  await pool.query('UPDATE social.member SET read_at=now() WHERE group_id=$1 AND user_id=$2', [requireId(req.params.id), res.locals.user.id]);
  res.json({ read: true });
});
