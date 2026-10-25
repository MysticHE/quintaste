import express from 'express';
import { randomInt } from 'node:crypto';
import { pool } from '../config.mjs';
import { CommunityError, throttle } from '../community/http.mjs';
import { friendsSql, nameSql, seeableSql, verifiedSql } from './access.mjs';
// profile.mjs imports this file too; photoUrl is only read inside request handlers, after both modules have loaded.
import { photoUrl } from './profile.mjs';

/**
 * Public handles (owner, 25 Oct 2026): one per member, lowercase letters, numbers, dots and underscores, so friends can find
 * each other by typing it. Separate from the sign-in username, which stays private.
 */
export const handles = express.Router();
const pattern = /^[a-z][a-z0-9._]{2,23}$/;
/** Words a handle may not be or start with as one part (split at dots, underscores and digits), so no one passes as staff. */
const staffWords = ['admin', 'administrator', 'root', 'support', 'staff', 'help', 'helpdesk', 'official', 'moderator', 'system', 'team', 'settings', 'quintaste'];
const staffPrefixes = ['admin', 'official', 'moderator', 'support'];
/** Rude words blocked anywhere in a handle; chosen so ordinary names and food words do not contain them. */
const rude = ['fuck', 'shit', 'cunt', 'nigg', 'fagg', 'bitch', 'whore', 'slut', 'porn', 'pussy', 'twat', 'asshole', 'kanina', 'cheebye', 'chibai', 'lanjiao', 'pukimak'];
/** The handle with dots and underscores dropped and look-alike digits read as letters (adm1n, 0fficial). */
const squash = (handle, one) => handle.replace(/[._]/g, '').replace(/0/g, 'o').replace(/1/g, one).replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
function blocked(handle) {
  const parts = handle.split(/[._\d]+/).filter(Boolean);
  if (parts.some(part => staffWords.includes(part) || staffPrefixes.some(word => part.startsWith(word)))) return true;
  return ['i', 'l'].some(one => { const flat = squash(handle, one); return flat.includes('quintaste') || rude.some(word => flat.includes(word)); });
}
export const validHandle = value => typeof value === 'string' && pattern.test(value) && !value.includes('..') && !value.endsWith('.') && !blocked(value);
/** What a member typed, as stored: trimmed and lowercase, without the at sign some people type first. */
export const readHandle = value => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return text.startsWith('@') ? text.slice(1) : text;
};

/**
 * A starting handle from a name: accents dropped, spaces and other characters removed; "member" when nothing usable is left
 * (names in other scripts). handles.sql builds the same base for the backfill.
 */
function baseFrom(name) {
  const plain = String(name ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = plain.replace(/^[^a-z]+/, '').slice(0, 20);
  return base.length >= 3 && !blocked(base) ? base : 'member';
}
/**
 * Gives the member a handle from their name if they have none; an existing one is never changed. Tries the base, then the
 * base with 2 to 9, then six-digit numbers, so even a very common base (every "member") finds a free handle.
 */
export async function ensureHandle(db, userId, name) {
  const found = (await db.query('SELECT handle FROM social.handle WHERE user_id=$1', [userId])).rows[0];
  if (found) return found.handle;
  const base = baseFrom(name), short = base.slice(0, 18);
  const candidates = [base, ...[2, 3, 4, 5, 6, 7, 8, 9].map(n => base + n), ...Array.from({ length: 12 }, () => short + randomInt(100000, 1000000))];
  for (const candidate of candidates) {
    // Either conflict (this member got one meanwhile, or the name is taken) inserts nothing; re-read before trying the next.
    const made = (await db.query('INSERT INTO social.handle(user_id, handle) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING handle', [userId, candidate])).rows[0];
    if (made) return made.handle;
    const mine = (await db.query('SELECT handle FROM social.handle WHERE user_id=$1', [userId])).rows[0];
    if (mine) return mine.handle;
  }
  throw new CommunityError(503, 'Your handle could not be made. Try again.');
}
/** Changes the member's handle inside the caller's transaction; a taken handle is a 409 the app words as "Taken". */
export async function changeHandle(db, userId, value) {
  const handle = readHandle(value);
  if (!validHandle(handle)) throw new CommunityError(400, pattern.test(handle) ? 'That handle is not allowed. Choose another.' : 'Use 3 to 24 lowercase letters, numbers, dots or underscores, starting with a letter.', 'HANDLE_INVALID');
  const current = (await db.query('SELECT handle FROM social.handle WHERE user_id=$1', [userId])).rows[0]?.handle;
  if (current === handle) return handle;
  const taken = (await db.query('SELECT 1 FROM social.handle WHERE handle=$1 AND user_id<>$2', [handle, userId])).rowCount;
  if (taken) throw new CommunityError(409, 'That handle is taken.', 'HANDLE_TAKEN');
  await throttle('social-handle:' + userId, 5, 86400, 'You can change your handle 5 times a day. Try again tomorrow.');
  try {
    await db.query(`INSERT INTO social.handle(user_id, handle) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET handle=$2, updated_at=now()`, [userId, handle]);
  } catch (error) {
    if (error?.code === '23505') throw new CommunityError(409, 'That handle is taken.', 'HANDLE_TAKEN');
    throw error;
  }
  return handle;
}

/** Whether a handle can be used: valid and not someone else's. */
handles.get('/handles/check', async (req, res) => {
  const me = res.locals.user.id, handle = readHandle(req.query.handle);
  await throttle('social-handle-check:' + me, 240, 3600);
  if (!validHandle(handle)) return res.json({ handle, valid: false, available: false });
  const taken = (await pool.query('SELECT 1 FROM social.handle WHERE handle=$1 AND user_id<>$2', [handle, me])).rowCount > 0;
  res.json({ handle, valid: true, available: !taken });
});
/**
 * Add friend: members whose handle contains what was typed, among the people the member may see (friends, an open request
 * either way, or a public profile; any age or gender). Anyone the member declined in the last 30 days stays out, as in People.
 * Handles starting with the text come first.
 */
handles.get('/people/find', async (req, res) => {
  const me = res.locals.user.id, q = readHandle(req.query.q).replace(/[^a-z0-9._]/g, '').slice(0, 24);
  if (q.length < 2) return res.json({ items: [] });
  await throttle('social-find:' + me, 300, 3600, 'You are searching quickly. Wait a moment.');
  // The handle match is cheap; the visibility checks are not, so they run only on the 200 closest matches.
  const rows = (await pool.query(`WITH h AS MATERIALIZED (SELECT user_id, handle FROM social.handle WHERE user_id<>$1 AND strpos(handle, $2) > 0
      ORDER BY strpos(handle, $2) = 1 DESC, length(handle), handle LIMIT 200)
    SELECT u.id, h.handle, ${nameSql('p', 'u')} AS "firstName", coalesce(p.area, '') AS area, ${verifiedSql('u.id')} AS verified,
      (SELECT json_build_object('id', ph.id, 'digest', ph.digest) FROM social.photo ph WHERE ph.user_id=u.id AND ph.position=0) AS photo,
      ${friendsSql('u.id', '$1')} AS friend,
      (SELECT json_build_object('id', r.id, 'mine', r.from_id=$1) FROM social.friend_request r WHERE r.status='pending'
        AND ((r.from_id=$1 AND r.to_id=u.id) OR (r.from_id=u.id AND r.to_id=$1)) LIMIT 1) AS request
    FROM h JOIN public."user" u ON u.id=h.user_id LEFT JOIN social.profile p ON p.user_id=u.id
    WHERE ${seeableSql('u.id', '$1')}
      AND (${friendsSql('u.id', '$1')} OR NOT EXISTS (SELECT 1 FROM social.friend_request d WHERE d.from_id=$1 AND d.to_id=u.id AND d.status='declined'
        AND d.decided_at > now() - interval '30 days'))
    ORDER BY strpos(h.handle, $2) = 1 DESC, length(h.handle), h.handle LIMIT 20`, [me, q])).rows;
  res.json({ items: rows.map(({ photo, friend, request, ...row }) => ({ ...row, photo: photo ? photoUrl(photo, 'thumb') : null,
    state: friend ? 'friend' : request ? (request.mine ? 'sent' : 'received') : 'none', requestId: request?.id ?? null })) });
});
