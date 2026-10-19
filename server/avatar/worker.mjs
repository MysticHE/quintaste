import { pool, logger } from '../config.mjs';
import { Buffer } from 'node:buffer';
import { restricted, allowed } from '../operations.mjs';
import { avatarConfig, frameNames, AvatarError } from './config.mjs';
import { storageReady, loadPayload, savePayload, erasePayload, sweepPayloads } from './storage.mjs';
import { renderFrame } from './provider.mjs';
import { claimLotusJob, lotusAvailable, lotusCleanup } from '../lotus/breeding.mjs';
import { generateLotus } from '../lotus/generate.mjs';

async function cleanup(db) {
  const stale = await db.query(`UPDATE avatar.job SET status='failed',message='Generation was interrupted or expired. No automatic paid retry was made.'
    WHERE (status='working' OR expires_at<=now()) AND status NOT IN ('failed','cancelled') RETURNING id`);
  for (const row of stale.rows) await erasePayload(row.id);
  await lotusCleanup(db, true);
  await sweepPayloads();
  await db.query("DELETE FROM avatar.job WHERE created_at < now()-interval '30 days'");
  await db.query("DELETE FROM avatar.budget WHERE day < current_date-31");
  await db.query("DELETE FROM avatar.throttle WHERE started_at < now()-interval '1 day'");
}
async function available(job) {
  const r = await pool.query("SELECT j.status,j.expires_at,u.\"adultConfirmed\" FROM avatar.job j JOIN public.\"user\" u ON u.id=j.user_id WHERE j.id=$1", [job.id]);
  return r.rows[0]?.status === 'working' && r.rows[0].adultConfirmed && new Date(r.rows[0].expires_at).getTime()>Date.now()
    && avatarConfig().enabled && await allowed('avatars') && !await restricted(job.user_id);
}
async function generate(db, job, signal) {
  let payload;
  try {
    payload = await loadPayload(job.id);
    for (const state of frameNames) {
      if (signal.aborted || !await available(job)) throw new AvatarError(409, 'Generation stopped. Your saved avatar is unchanged.');
      const input = Buffer.from(state === 'base' ? payload.photo : payload.frames.base.split(',')[1], 'base64');
      let rendered;
      try { rendered = await renderFrame(input,state,signal); } finally { input.fill(0); }
      if (signal.aborted || !await available(job)) throw new AvatarError(409, 'Generation stopped. Your saved avatar is unchanged.');
      payload.frames[state] = rendered.uri; rendered.bytes.fill(0);
      if (state === 'base') delete payload.photo;
      await savePayload(job.id,payload);
      if (!await available(job)) throw new AvatarError(409, 'Generation stopped. Your saved avatar is unchanged.');
      await db.query("UPDATE avatar.job SET completed=$2 WHERE id=$1 AND status='working'", [job.id,Object.keys(payload.frames).length]);
    }
    payload = { avatar: { id: job.id, frames: payload.frames, createdAt: Date.now(), recipe: 'standard-v2' } };
    await savePayload(job.id,payload);
    const done = await db.query("UPDATE avatar.job SET status='complete' WHERE id=$1 AND status='working' AND expires_at>now() RETURNING id", [job.id]);
    if (!done.rowCount) await erasePayload(job.id);
    logger.info({ event: 'avatar_job_finished', completed: Boolean(done.rowCount) });
  } catch (error) {
    await db.query("UPDATE avatar.job SET status='failed',message=$2 WHERE id=$1 AND status='working'", [job.id,
      error instanceof AvatarError ? error.message : 'Generation was interrupted. Your saved avatar is unchanged. No automatic paid retry was made.']);
    await erasePayload(job.id);
    logger.warn({ event: 'avatar_job_failed', category: error instanceof AvatarError ? error.status : 'internal' });
  } finally { payload = undefined; }
}
export function startAvatarWorker() {
  const controller = new AbortController(); let running = false, stopped = false;
  let sweeping = false;
  async function expire() {
    if (sweeping || stopped) return; sweeping=true;
    try {
      const rows=await pool.query("UPDATE avatar.job SET status='failed',message='This private preview expired.' WHERE expires_at<=now() AND status NOT IN ('failed','cancelled') RETURNING id");
      for (const row of rows.rows) await erasePayload(row.id);
      await lotusCleanup(pool, false);
      await sweepPayloads();
    } catch { logger.error({ event:'avatar_cleanup_failed' }); }
    finally { sweeping=false; }
  }
  async function tick() {
    if (running || stopped) return; running = true;
    let db, locked = false;
    const connectionAbort=new AbortController();
    const onError=() => connectionAbort.abort();
    try {
      await storageReady(); db = await pool.connect(); db.on('error',onError);
      // A connection-scoped lock serializes provider work across all app replicas.
      locked = (await db.query('SELECT pg_try_advisory_lock(721941,2) AS locked')).rows[0].locked;
      if (!locked) return;
      await cleanup(db);
      if (!avatarConfig().enabled || !await allowed('avatars')) return;
      const next = await db.query(`UPDATE avatar.job SET status='working' WHERE id=(
        SELECT id FROM avatar.job WHERE status='queued' AND expires_at>now() ORDER BY created_at LIMIT 1) RETURNING *`);
      // Portraits first, then lotus breeds: both share this lock, so one generation runs at a time across replicas.
      const job = next.rows[0], breed = job ? null : await claimLotusJob(db);
      const check = job ? () => available(job) : breed ? () => lotusAvailable(breed) : null;
      if (check) {
        let checking=false;
        const monitor=setInterval(async () => {
          if (checking) return; checking=true;
          try { if (!await check()) connectionAbort.abort(); } catch { connectionAbort.abort(); }
          finally { checking=false; }
        },2000);
        const signal=AbortSignal.any([controller.signal,connectionAbort.signal]);
        try { await (job ? generate(db,job,signal) : generateLotus(db,breed,signal)); }
        finally { clearInterval(monitor); }
      }
    } catch { logger.error({ event: 'avatar_worker_unavailable' }); }
    finally {
      if (locked) await db.query('SELECT pg_advisory_unlock(721941,2)').catch(() => {});
      db?.removeListener('error',onError); db?.release(connectionAbort.signal.aborted ? new Error('Avatar connection ended') : undefined); running = false;
    }
  }
  const timer = setInterval(() => void tick(),2000); timer.unref(); void tick();
  const sweeper=setInterval(() => void expire(),30000); sweeper.unref();
  return () => { stopped = true; clearInterval(timer); clearInterval(sweeper); controller.abort(); };
}
