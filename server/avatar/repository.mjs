import { randomUUID } from 'node:crypto';
import { pool } from '../config.mjs';
import { AvatarError, avatarConfig, consentVersion } from './config.mjs';
import { erasePayload, loadPayload, savePayload } from './storage.mjs';
import { accountAccess } from '../account-access.mjs';

export async function throttleAvatar(userId) {
  const r = await pool.query(`INSERT INTO avatar.throttle(scope) VALUES($1)
    ON CONFLICT(scope) DO UPDATE SET
    count=CASE WHEN avatar.throttle.started_at < now()-interval '1 minute' THEN 1 ELSE avatar.throttle.count+1 END,
    started_at=CASE WHEN avatar.throttle.started_at < now()-interval '1 minute' THEN now() ELSE avatar.throttle.started_at END
    RETURNING count`, [userId]);
  if (r.rows[0].count > 5) throw new AvatarError(429, 'Too many upload attempts. Wait a minute and try again.');
}
export async function getJob(userId, requestId) {
  return (await pool.query('SELECT * FROM avatar.job WHERE user_id=$1 AND request_id=$2', [userId, requestId])).rows[0];
}
export async function jobView(job) {
  if (!job) throw new AvatarError(404, 'This avatar request was not found.');
  const expired = new Date(job.expires_at).getTime() <= Date.now();
  const result = { id: job.request_id, status: expired ? 'failed' : job.status === 'queued' ? 'working' : job.status,
    completed: job.completed, message: expired ? 'This private preview expired. Start a new request.' : job.message };
  if (result.status === 'complete') {
    try { result.avatar = (await loadPayload(job.id)).avatar; }
    catch { throw new AvatarError(410, 'This private preview is no longer available.'); }
    if (!result.avatar) throw new AvatarError(410, 'This private preview is no longer available.');
  }
  return result;
}
async function reserve(db, scope, limit) {
  const r = await db.query(`INSERT INTO avatar.budget(day,scope,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,$1,1)
    ON CONFLICT(day,scope) DO UPDATE SET attempts=avatar.budget.attempts+1 WHERE avatar.budget.attempts<$2 RETURNING attempts`, [scope, limit]);
  if (!r.rowCount) throw new AvatarError(429, scope === 'global' ? 'Today’s avatar allowance is used. Try again tomorrow (UTC).' : 'You can create two avatars per UTC day. Try again tomorrow.');
}
export async function createJob(userId, requestId, photo) {
  const db = await pool.connect(), id = randomUUID();
  let persisted = false;
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(721941,1)');
    const duplicate = await db.query('SELECT * FROM avatar.job WHERE user_id=$1 AND request_id=$2', [userId, requestId]);
    if (duplicate.rows[0]) { await db.query('COMMIT'); return duplicate.rows[0]; }
    const active = await db.query("SELECT id FROM avatar.job WHERE user_id=$1 AND status IN ('queued','working') AND expires_at>now()", [userId]);
    if (active.rowCount) throw new AvatarError(409, 'You already have an avatar being created. Check the existing request.');
    const occupied = await db.query("SELECT id FROM avatar.job WHERE status IN ('queued','working') AND expires_at>now() LIMIT 1");
    if (occupied.rowCount) throw new AvatarError(503, 'Another avatar is being created. Please try again in a few minutes.');
    const config = avatarConfig();
    const access=await accountAccess(userId,db);
    if (access.unlimitedUsage) {
      await db.query(`INSERT INTO avatar.budget(day,scope,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,$1,1)
        ON CONFLICT(day,scope) DO UPDATE SET attempts=avatar.budget.attempts+1`,['master:'+userId]);
    } else {
      await reserve(db, 'global', config.dailyGlobal); await reserve(db, 'user:' + userId, config.dailyAccount);
    }
    await savePayload(id, { photo: photo.toString('base64'), frames: {} }); persisted = true;
    const r = await db.query(`INSERT INTO avatar.job(id,user_id,request_id,status,consent) VALUES($1,$2,$3,'queued',$4) RETURNING *`, [id,userId,requestId,consentVersion]);
    await db.query('COMMIT'); return r.rows[0];
  } catch (error) {
    await db.query('ROLLBACK'); if (persisted) await erasePayload(id); throw error;
  } finally { photo.fill(0); db.release(); }
}
export async function cancelJob(userId, requestId) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock(721941,1)');
    const r = await db.query(`INSERT INTO avatar.job(id,user_id,request_id,status,consent,message)
      VALUES($1,$2,$3,'cancelled','','Preview discarded.') ON CONFLICT(user_id,request_id)
      DO UPDATE SET status='cancelled',message='Preview discarded.'
      WHERE avatar.job.status NOT IN ('queued','working') OR avatar.job.expires_at<=now()
      RETURNING id`, [randomUUID(),userId,requestId]);
    if (!r.rowCount) throw new AvatarError(409, 'Your avatar is still being created.');
    await db.query('COMMIT'); await erasePayload(r.rows[0].id);
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
