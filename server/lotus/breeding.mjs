import { randomUUID } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { transaction } from '../community/http.mjs';
import { accountAccess } from '../account-access.mjs';
import { allowed, restricted } from '../operations.mjs';
import { AvatarError, avatarConfig } from '../avatar/config.mjs';
import { admitGeneration } from '../avatar/repository.mjs';
import { encryptAvatar, erasePayload, savePayload } from '../avatar/storage.mjs';
import { breedBalance, holdBreed, REGENERATIONS, settleBreed } from './entitlements.mjs';

/**
 * Lotus breed attempts (AVATAR_LOTUS_PLAN §5, §6): admission, success and failure. A first breed holds one entitlement;
 * success consumes it and saves the Adult and Mini forms to the member's avatar library in one transaction, failure
 * releases it. A free regeneration (up to two per breed) uses no entitlement and counts only when it succeeds.
 * Portrait jobs and breeds share the admission lock, the one-at-a-time rule and the worker (server/avatar/worker.mjs).
 */
export const lotusConsentVersion = 'cloudflare-openai-lotus-v1';
const LIBRARY_LIMIT = 20;
const missing = error => ['42P01', '3F000'].includes(error?.code);
/** Runs lotus work only once server/lotus/schema.sql is applied; older databases simply have no breeds. */
export const whenReady = async (work, fallback = null) => { try { return await work(); } catch (error) { if (missing(error)) return fallback; throw error; } };

export const getLotusJob = async (userId, requestId) =>
  (await pool.query('SELECT * FROM lotus.job WHERE user_id=$1 AND request_id=$2', [userId, requestId])).rows[0] ?? null;

/** One attempt of the breed allowance, separate from portraits. Master accounts are counted but never limited. */
async function reserveAllowance(db, userId) {
  const config = avatarConfig(), access = await accountAccess(userId, db);
  const scopes = access.unlimitedUsage ? [['lotus-master:' + userId, null]]
    : [['lotus-global', config.lotusDailyGlobal], ['lotus-user:' + userId, config.lotusDailyAccount]];
  for (const [scope, limit] of scopes) {
    const r = await db.query(`INSERT INTO avatar.budget(day,scope,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,$1,1)
      ON CONFLICT(day,scope) DO UPDATE SET attempts=avatar.budget.attempts+1 WHERE $2::int IS NULL OR avatar.budget.attempts<$2 RETURNING attempts`, [scope, limit]);
    if (!r.rowCount) throw new AvatarError(429, scope === 'lotus-global' ? 'Today’s breeding allowance is used. Try again tomorrow (UTC).'
      : 'You can breed three times per UTC day. Try again tomorrow.', 'ALLOWANCE');
  }
}

/** Opens a first breed: needs an unused entitlement, which the new breed holds until it succeeds or fails. */
async function openBreed(db, userId, tier) {
  if ((await breedBalance(db, userId)).available < 1) throw new AvatarError(409, 'You have no breed ready.', 'NO_BREED');
  const id = randomUUID();
  await db.query(`INSERT INTO lotus.breed(id, user_id, tier, status) VALUES($1,$2,$3,'breeding')`, [id, userId, tier]);
  await holdBreed(db, userId, id);
  return id;
}
/** A free regeneration of a finished breed. It counts only when it succeeds. */
async function regenerable(db, userId, breedId) {
  const breed = (await db.query('SELECT status, regenerations FROM lotus.breed WHERE id=$1 AND user_id=$2 FOR UPDATE', [breedId, userId])).rows[0];
  if (!breed || breed.status !== 'bred') throw new AvatarError(404, 'That breed was not found.');
  if (breed.regenerations >= REGENERATIONS) throw new AvatarError(409, 'Both free tries are used for this breed.', 'NO_REGENERATIONS');
  return breedId;
}

/**
 * Admits one attempt under the shared admission lock: the same request returns the same job; then one generation at a
 * time, a bloomed lotus, room in the library for both forms, the entitlement or free try, the allowance and the
 * encrypted selfie. Everything rolls back together.
 */
export async function admitBreed(userId, requestId, photo, regenerate) {
  const db = await pool.connect(), jobId = randomUUID();
  let persisted = false;
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(721941,1)');
    const duplicate = (await db.query('SELECT * FROM lotus.job WHERE user_id=$1 AND request_id=$2', [userId, requestId])).rows[0];
    if (duplicate) { await db.query('COMMIT'); return duplicate; }
    await admitGeneration(db, userId);
    const tier = (await db.query('SELECT tier FROM lotus.account WHERE user_id=$1', [userId])).rows[0]?.tier;
    if (!tier) throw new AvatarError(409, 'Bloom your free lotus first.', 'NOT_BLOOMED');
    const saved = Number((await db.query('SELECT count(*) FROM avatar.saved WHERE user_id=$1', [userId])).rows[0].count);
    if (saved > LIBRARY_LIMIT - 2) throw new AvatarError(409, 'Your avatar library is full. Delete two portraits to make room for both forms.', 'LIBRARY_FULL');
    const breedId = regenerate ? await regenerable(db, userId, regenerate) : await openBreed(db, userId, tier);
    await reserveAllowance(db, userId);
    await savePayload(jobId, { photo: photo.toString('base64'), forms: {} }); persisted = true;
    const job = (await db.query(`INSERT INTO lotus.job(id, breed_id, user_id, request_id, kind, status, consent) VALUES($1,$2,$3,$4,$5,'queued',$6) RETURNING *`,
      [jobId, breedId, userId, requestId, regenerate ? 'regenerate' : 'breed', lotusConsentVersion])).rows[0];
    await db.query('COMMIT');
    return job;
  } catch (error) {
    await db.query('ROLLBACK'); if (persisted) await erasePayload(jobId); throw error;
  } finally { photo.fill(0); db.release(); }
}

/** Ends an attempt that stopped. A first breed is returned with its entitlement; a regeneration simply does not count. */
export async function failLotusJob(jobId, message) {
  await transaction(async db => {
    const job = (await db.query(`UPDATE lotus.job SET status='failed', message=$2 WHERE id=$1 AND status IN ('queued','working')
      RETURNING user_id, breed_id, kind`, [jobId, message.slice(0, 200)])).rows[0];
    if (job?.kind !== 'breed') return;
    await db.query(`UPDATE lotus.breed SET status='returned', updated_at=now() WHERE id=$1 AND status='breeding'`, [job.breed_id]);
    await settleBreed(db, job.user_id, job.breed_id, 'release');
  });
  await erasePayload(jobId);
}

/**
 * Saves a finished attempt: both forms go to the avatar library (encrypted, account-bound), the breed records them, and a
 * first breed consumes its entitlement, all in one transaction. Returns false when the attempt had already stopped.
 */
export async function finishLotusJob(job, forms) {
  const createdAt = Date.now(), results = ['adult', 'mini'].map(form => ({ id: randomUUID(), recipe: 'lotus-v1', form, breed: job.breed_id, createdAt, frames: forms[form] }));
  const payloads = await Promise.all(results.map(avatar => encryptAvatar(job.user_id + ':' + avatar.id, avatar)));
  return transaction(async db => {
    const claimed = await db.query(`UPDATE lotus.job SET status='complete', completed=6 WHERE id=$1 AND status='working' AND expires_at>now() RETURNING id`, [job.id]);
    if (!claimed.rowCount) return false;
    for (const [i, avatar] of results.entries()) await db.query('INSERT INTO avatar.saved(user_id,id,payload) VALUES($1,$2,$3)', [job.user_id, avatar.id, payloads[i]]);
    const [adult, mini] = results.map(r => r.id);
    const updated = job.kind === 'breed'
      ? await db.query(`UPDATE lotus.breed SET status='bred', adult_id=$2, mini_id=$3, updated_at=now() WHERE id=$1 AND status='breeding'`, [job.breed_id, adult, mini])
      : await db.query(`UPDATE lotus.breed SET regenerations=regenerations+1, adult_id=$2, mini_id=$3, updated_at=now()
          WHERE id=$1 AND status='bred' AND regenerations<$4`, [job.breed_id, adult, mini, REGENERATIONS]);
    if (!updated.rowCount || (job.kind === 'breed' && !await settleBreed(db, job.user_id, job.breed_id, 'consume'))) throw new Error('Breed state changed');
    return true;
  });
}

/** Whether a working attempt may keep calling the provider: still working, adult, unrestricted, and breeding switched on. */
export async function lotusAvailable(job) {
  const r = await pool.query(`SELECT j.status, j.expires_at, u."adultConfirmed" FROM lotus.job j JOIN public."user" u ON u.id=j.user_id WHERE j.id=$1`, [job.id]);
  return r.rows[0]?.status === 'working' && r.rows[0].adultConfirmed && new Date(r.rows[0].expires_at).getTime() > Date.now()
    && avatarConfig().enabled && await allowed('avatars') && !await restricted(job.user_id);
}
/** Takes the oldest queued attempt for the worker, or null. */
export const claimLotusJob = db => whenReady(async () => (await db.query(`UPDATE lotus.job SET status='working' WHERE id=(
  SELECT id FROM lotus.job WHERE status='queued' AND expires_at>now() ORDER BY created_at LIMIT 1) RETURNING *`)).rows[0] ?? null);

const STOPPED = 'Breeding was interrupted or took too long. No automatic paid retry was made.';
/**
 * Worker housekeeping. With `stale`, attempts still marked working when the worker lock is free were interrupted (a
 * restart) and stop too; otherwise only expired ones. Old attempt metadata goes after 30 days; breeds and ledgers stay.
 */
export const lotusCleanup = (db, stale) => whenReady(async () => {
  const rows = (await db.query(`SELECT id, kind FROM lotus.job WHERE status IN ('queued','working') AND (expires_at<=now()${stale ? " OR status='working'" : ''})`)).rows;
  for (const row of rows) await failLotusJob(row.id, STOPPED + (row.kind === 'breed' ? ' Nothing was used up.' : ' This try did not count.'));
  if (stale) await db.query("DELETE FROM lotus.job WHERE created_at < now()-interval '30 days'");
  if (rows.length) logger.warn({ event: 'lotus_breed_stopped', count: rows.length });
});
