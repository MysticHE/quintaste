import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.mjs';
import { origin, pool, logger } from '../config.mjs';
import { restricted } from '../operations.mjs';

export class CommunityError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
/** Browser origins allowed to call community APIs: the app itself, plus an explicit local web dev server outside production. */
export const devWebOrigin = process.env.NODE_ENV !== 'production' && process.env.DEV_WEB_ORIGIN ? new URL(process.env.DEV_WEB_ORIGIN).origin : null;
const trusted = req => req.headers.origin ? req.headers.origin === origin || req.headers.origin === devWebOrigin : req.headers['expo-origin'] === 'quintaste://';

async function sessionUser(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  const user = session?.user;
  if (!user?.adultConfirmed || await restricted(user.id)) return null;
  return { id: user.id, name: (user.name || user.username || 'Member').trim().slice(0, 50), session: session.session.id };
}
/**
 * Common guard: no caching, trusted origin for writes and a signed-in, age-checked, unrestricted account, then a JSON body limit.
 * The body is read only after the guard passes. `photos` names the routes allowed the larger `photoLimit`.
 * `guests` lets GET requests through without a session (res.locals.user is then null).
 */
/** @param {{ guests?: boolean, bodyLimit?: string, photoLimit?: string | null, photos?: (req: import('express').Request) => boolean }} [options] */
export function communityRouter({ guests = false, bodyLimit = '32kb', photoLimit = null, photos = () => false } = {}) {
  const router = express.Router();
  const small = express.json({ limit: bodyLimit, inflate: false }), large = photoLimit ? express.json({ limit: photoLimit, inflate: false }) : small;
  router.use(async (req, res, next) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      if (req.method !== 'GET' && !trusted(req)) return res.status(403).json({ error: 'Untrusted request origin.' });
      res.locals.user = await sessionUser(req);
      if (!res.locals.user && !(guests && req.method === 'GET')) return res.status(401).json({ error: 'Sign in to your QuinTaste account.', code: 'SIGN_IN' });
      next();
    } catch (error) { next(error); }
  });
  router.use((req, res, next) => (photos(req) ? large : small)(req, res, next));
  return router;
}
export function errors(error, _req, res, next) {
  if (error instanceof CommunityError) return res.status(error.status).json({ error: error.message, code: error.code });
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'That is too large. Use smaller photos.' });
  if (error?.code === '23505') return res.status(409).json({ error: 'That already exists.' });
  logger.error({ event: 'community_request_failed', code: error?.code });
  next(error);
}
/** Runs work in one transaction, optionally serialised per key. */
export async function transaction(work, lockKey) {
  const db = await pool.connect();
  let broken;
  const onError = error => { broken = error; };
  db.on('error', onError);
  try {
    await db.query('BEGIN');
    if (lockKey) await db.query('SELECT pg_advisory_xact_lock(1902915, hashtext($1))', [lockKey]);
    const result = await work(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (rollbackError) { broken ??= rollbackError; }
    throw error;
  } finally { db.off('error', onError); db.release(broken); }
}
/** Fixed-window action limit shared across server instances. */
export async function throttle(scope, limit, windowSeconds, message = 'You are doing that too often. Try again shortly.') {
  const result = await pool.query(`INSERT INTO community.throttle(scope) VALUES($1)
    ON CONFLICT(scope) DO UPDATE SET count = CASE WHEN community.throttle.started_at < now() - make_interval(secs => $2) THEN 1 ELSE community.throttle.count + 1 END,
      started_at = CASE WHEN community.throttle.started_at < now() - make_interval(secs => $2) THEN now() ELSE community.throttle.started_at END
    RETURNING count`, [scope, windowSeconds]);
  if (result.rows[0].count > limit) throw new CommunityError(429, message);
}
/** Text field reader: trims, enforces a maximum and optionally a minimum. */
export function text(value, max, { min = 0, field = 'This field' } = {}) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length > max) throw new CommunityError(400, `${field} must be ${max} characters or fewer.`);
  if (result.length < min) throw new CommunityError(400, min > 1 ? `${field} needs at least ${min} characters.` : `${field} is required.`);
  return result;
}
export const pick = (value, options, fallback) => options.includes(value) ? value : fallback;
export const list = (value, options, max = options.length) => Array.isArray(value) ? [...new Set(value.filter(item => options.includes(item)))].slice(0, max) : [];
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
export function requireId(value, message = 'That item is unavailable.') { if (!uuid(value)) throw new CommunityError(404, message); return value; }
/** Better Auth user ids are opaque text; accept only the safe character set. */
export function requireUser(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(value)) throw new CommunityError(404, 'That person is unavailable.'); return value; }
/** For routers that admit guests on GET: routes after this need a signed-in member. */
export const member = (_req, res, next) => res.locals.user ? next() : res.status(401).json({ error: 'Sign in to your QuinTaste account.', code: 'SIGN_IN' });
