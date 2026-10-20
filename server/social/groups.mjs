import express from 'express';
import { pool } from '../config.mjs';
import { CommunityError, pick, requireId, requireUser, text, throttle, transaction } from '../community/http.mjs';
import { notBlocked, notRestricted } from '../community/router.mjs';
import { fivePungent, pays, profileIssue, readFuture, sgText, sizes } from './rules.mjs';

export const groups = express.Router();
const active = ['invited', 'accepted'];
const nameOf = `coalesce(nullif(p.first_name,''), u.name, 'Member')`;
/** Members of several groups in one query, keyed by group id. */
async function membersOf(db, groupIds) {
  const rows = (await db.query(`SELECT m.group_id, m.user_id AS id, ${nameOf} AS name, m.status, m.confirmed, p.diets, p.diet, array_remove(p.practices, '${fivePungent}') AS practices, p.excluded
    FROM social.member m JOIN public."user" u ON u.id=m.user_id LEFT JOIN social.profile p ON p.user_id=m.user_id WHERE m.group_id=ANY($1::uuid[]) ORDER BY m.updated_at`, [groupIds])).rows;
  const byGroup = new Map(groupIds.map(id => [id, []]));
  for (const { group_id: groupId, ...member } of rows) byGroup.get(groupId)?.push(member);
  return byGroup;
}
const members = async (db, groupId) => (await membersOf(db, [groupId])).get(groupId);
async function load(db, id, me, lock = false) {
  const group = (await db.query(`SELECT g.*, ${sgText('g.starts')} AS starts_text FROM social."group" g WHERE g.id=$1 ${lock ? 'FOR UPDATE' : ''}`, [id])).rows[0];
  const list = group ? await members(db, id) : [];
  const mine = list.find(m => m.id === me);
  if (!group || !mine) throw new CommunityError(404, 'This group is unavailable.');
  return { group, list, mine };
}
const event = (db, groupId, body) => db.query("INSERT INTO social.message(group_id,kind,body) VALUES($1,'event',$2)", [groupId, body.slice(0, 1000)]);
const touch = (db, groupId) => db.query('UPDATE social."group" SET updated_at=now() WHERE id=$1', [groupId]);
async function myProfile(db, me) {
  const p = (await db.query('SELECT first_name AS "firstName", area, times, visible FROM social.profile WHERE user_id=$1', [me])).rows[0];
  if (profileIssue(p)) throw new CommunityError(409, profileIssue(p) ?? 'Finish your profile first.');
  if (!p.visible) throw new CommunityError(409, 'Turn on Open to plans before inviting someone.');
  return p;
}
/** The invitee must be open to plans, an adult, unrestricted and not blocked with anyone already in the group. */
async function invitable(db, target, memberIds) {
  const row = (await db.query(`SELECT ${nameOf} AS name FROM social.profile p JOIN public."user" u ON u.id=p.user_id
    WHERE p.user_id=$1 AND p.visible AND u."adultConfirmed" AND ${notRestricted('p.user_id')}`, [target])).rows[0];
  if (!row) throw new CommunityError(404, 'This person is not open to plans.');
  for (const id of memberIds) if ((await db.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [target, id])).rowCount === 0) throw new CommunityError(404, 'This person is not open to plans.');
  if (Number((await db.query("SELECT count(*) FROM social.member WHERE user_id=$1 AND status='invited'", [target])).rows[0].count) >= 30) {
    throw new CommunityError(409, 'This person has too many pending invitations.');
  }
  return row.name;
}
/** Diet labels, practices and exclusions are shared only between accepted members (and with yourself). `diet` stays one release for older apps. */
const dietary = (m, me, accepted) => m.id === me || (accepted && m.status === 'accepted') ? m : { ...m, diets: null, diet: null, practices: null, excluded: null };
function view(group, list, me, extra = {}) {
  const accepted = list.find(m => m.id === me)?.status === 'accepted';
  return { id: group.id, size: group.size, intro: group.intro, venue: accepted ? group.venue : '', starts: accepted ? group.starts_text ?? '' : '', food: accepted ? group.food : '', pay: accepted ? group.pay : 'own',
    createdAt: group.created_at, createdBy: group.created_by, myStatus: list.find(m => m.id === me)?.status, members: list.map(m => ({ ...dietary(m, me, accepted), isMe: m.id === me })), ...extra };
}
groups.get('/groups', async (_req, res) => {
  const me = res.locals.user.id;
  const rows = (await pool.query(`SELECT g.*, ${sgText('g.starts')} AS starts_text,
      CASE m.status WHEN 'accepted' THEN (SELECT body FROM social.message x WHERE x.group_id=g.id AND x.kind='text' ORDER BY created_at DESC LIMIT 1)
        WHEN 'invited' THEN g.intro END AS last,
      m.status IN ('accepted','invited') AND EXISTS (SELECT 1 FROM social.message x WHERE x.group_id=g.id AND (x.sender_id IS NULL OR x.sender_id<>$1) AND x.created_at > m.read_at) AS unread
    FROM social."group" g JOIN social.member m ON m.group_id=g.id AND m.user_id=$1 ORDER BY g.updated_at DESC LIMIT 100`, [me])).rows;
  const lists = await membersOf(pool, rows.map(row => row.id));
  res.json({ items: rows.map(row => view(row, lists.get(row.id), me, { last: row.last, unread: row.unread, updatedAt: row.updated_at })) });
});
groups.get('/unread', async (_req, res) => {
  const me = res.locals.user.id;
  const row = (await pool.query(`SELECT count(*) FILTER (WHERE m.status='invited')::int AS invitations,
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
/** Start a group by inviting one person; the group holds 2, 4 or 6 people including you. */
groups.post('/groups', async (req, res) => {
  const me = res.locals.user.id, target = requireUser(req.body?.personId), size = pick(Number(req.body?.size), sizes, 0);
  const intro = text(req.body?.intro, 300, { min: 1, field: 'Introduction' });
  if (!size) throw new CommunityError(400, 'Choose 2, 4 or 6 people.');
  if (target === me) throw new CommunityError(400, 'Invite someone else.');
  await throttle('social-invite:' + me, 20, 86400, 'You can send 20 invitations a day.');
  const id = await transaction(async db => {
    const p = await myProfile(db, me), name = await invitable(db, target, [me]);
    if ((await db.query(`SELECT 1 FROM social.member a JOIN social.member b ON a.group_id=b.group_id WHERE a.user_id=$1 AND b.user_id=$2
      AND a.status IN ('invited','accepted') AND b.status IN ('invited','accepted')`, [me, target])).rowCount) {
      throw new CommunityError(409, 'You already have an open invitation or group with this person. Open it in Inbox.');
    }
    if (Number((await db.query("SELECT count(*) FROM social.member WHERE user_id=$1 AND status IN ('invited','accepted')", [me])).rows[0].count) >= 30) {
      throw new CommunityError(409, 'You have 30 open groups. Leave one first.');
    }
    const group = (await db.query('INSERT INTO social."group"(created_by,size,intro) VALUES($1,$2,$3) RETURNING id', [me, size, intro])).rows[0];
    await db.query("INSERT INTO social.member(group_id,user_id,status,read_at,accepted_at) VALUES($1,$2,'accepted',now(),now()),($1,$3,'invited',to_timestamp(0),NULL)", [group.id, me, target]);
    await db.query("INSERT INTO social.message(group_id,sender_id,body) VALUES($1,$2,$3)", [group.id, me, intro]);
    await event(db, group.id, `${p.firstName} invited ${name}`);
    return group.id;
  }, 'social-pair:' + [me, target].sort().join(':'));
  res.status(201).json({ id });
});
groups.post('/groups/:id/respond', async (req, res) => {
  const me = res.locals.user.id, accept = req.body?.accept === true;
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'invited') throw new CommunityError(409, 'This invitation is no longer pending.');
    if (accept) {
      for (const m of list) if (m.id !== me && active.includes(m.status) && (await db.query(`SELECT 1 WHERE ${notBlocked('$1', '$2')}`, [m.id, me])).rowCount === 0) {
        throw new CommunityError(409, 'This group is unavailable.');
      }
    }
    await db.query('UPDATE social.member SET status=$3, accepted_at=CASE WHEN $3=\'accepted\' THEN now() ELSE NULL END, confirmed=false, updated_at=now(), read_at=now() WHERE group_id=$1 AND user_id=$2', [group.id, me, accept ? 'accepted' : 'declined']);
    if (accept) await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, `${mine.name} ${accept ? 'joined' : 'declined'}`);
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
    await myProfile(db, me);
    const reserved = list.filter(m => active.includes(m.status));
    if (reserved.length >= group.size) throw new CommunityError(409, 'This group is full.');
    if (list.some(m => m.id === target && active.includes(m.status))) throw new CommunityError(409, 'This person is already in the group.');
    const name = await invitable(db, target, reserved.map(m => m.id));
    await db.query(`INSERT INTO social.member(group_id,user_id,status,read_at) VALUES($1,$2,'invited',to_timestamp(0))
      ON CONFLICT(group_id,user_id) DO UPDATE SET status='invited', accepted_at=NULL, confirmed=false, updated_at=now()`, [group.id, target]);
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
/** Proposing or changing the plan clears everyone's confirmation. */
groups.post('/groups/:id/plan', async (req, res) => {
  const me = res.locals.user.id, venue = text(req.body?.venue, 160, { min: 3, field: 'Place' }), starts = readFuture(req.body?.starts);
  const food = text(req.body?.food, 1000, { field: 'Food' }), pay = pick(req.body?.pay, pays, 'own');
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'accepted' || list.filter(m => m.status === 'accepted').length < 2) throw new CommunityError(403, 'Plans open once someone has joined.');
    await db.query('UPDATE social."group" SET venue=$2, starts=$3, food=$4, pay=$5, updated_at=now() WHERE id=$1', [group.id, venue, starts, food, pay]);
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, group.venue ? 'Plan changed · ' + venue : 'Plan: ' + venue);
  });
  res.json({ planned: true });
});
groups.post('/groups/:id/confirm', async (req, res) => {
  const me = res.locals.user.id;
  await transaction(async db => {
    const { group, list, mine } = await load(db, requireId(req.params.id), me, true);
    if (mine.status !== 'accepted') throw new CommunityError(403, 'Join the group first.');
    if (!group.venue || !group.starts || new Date(group.starts).getTime() <= Date.now()) throw new CommunityError(409, 'Agree a future plan first.');
    if (list.filter(m => m.status === 'accepted').length !== group.size) throw new CommunityError(409, `Confirming opens when all ${group.size} people have joined.`);
    if (!mine.confirmed) {
      await db.query('UPDATE social.member SET confirmed=true, updated_at=now() WHERE group_id=$1 AND user_id=$2', [group.id, me]);
      await event(db, group.id, `${mine.name} confirmed`);
      await touch(db, group.id);
    }
  });
  res.json({ confirmed: true });
});
groups.post('/groups/:id/leave', async (req, res) => {
  const me = res.locals.user.id;
  await transaction(async db => {
    const { group, mine } = await load(db, requireId(req.params.id), me, true);
    if (!active.includes(mine.status)) return;
    await db.query("UPDATE social.member SET status='left', confirmed=false, updated_at=now() WHERE group_id=$1 AND user_id=$2", [group.id, me]);
    await db.query('UPDATE social.member SET confirmed=false WHERE group_id=$1', [group.id]);
    await event(db, group.id, `${mine.name} left`);
    await touch(db, group.id);
  });
  res.json({ left: true });
});
/** Removes a group you have left or declined from your own list; others keep their history. */
groups.delete('/groups/:id', async (req, res) => {
  const me = res.locals.user.id, id = requireId(req.params.id);
  const removed = await pool.query("DELETE FROM social.member WHERE group_id=$1 AND user_id=$2 AND status IN ('left','declined')", [id, me]);
  if (!removed.rowCount) throw new CommunityError(409, 'Leave this group before deleting it.');
  await pool.query('DELETE FROM social."group" g WHERE g.id=$1 AND NOT EXISTS (SELECT 1 FROM social.member m WHERE m.group_id=g.id)', [id]);
  res.json({ deleted: true });
});
groups.post('/groups/:id/read', async (req, res) => {
  await pool.query('UPDATE social.member SET read_at=now() WHERE group_id=$1 AND user_id=$2', [requireId(req.params.id), res.locals.user.id]);
  res.json({ read: true });
});
