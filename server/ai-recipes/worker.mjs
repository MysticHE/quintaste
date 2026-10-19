import { pool, logger } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { geminiConfig } from './gemini.mjs';
import { runJob } from './pipeline.mjs';

/** One job at a time in this process, claimed with SKIP LOCKED so several app replicas can share the queue. */
export function startAiRecipeWorker() {
  const controller = new AbortController();
  let busy = false, stopped = false;
  async function tick() {
    if (busy || stopped || !geminiConfig().enabled) return;
    busy = true;
    try {
      if (!await allowed('ai_recipes') || !await allowed('recipes')) return;
      await pool.query(`UPDATE recipes.ai_job SET status='failed', message='The job was interrupted. Try again.', finished_at=now()
        WHERE status='working' AND started_at < now() - interval '20 minutes'`);
      const job = (await pool.query(`UPDATE recipes.ai_job SET status='working', started_at=now(), attempts=attempts+1
        WHERE id = (SELECT id FROM recipes.ai_job WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
      if (job) await runJob(job, controller.signal);
    } catch (error) {
      logger.warn({ event: 'ai_recipe_worker_error', detail: String(error?.message ?? error).slice(0, 200) });
    } finally { busy = false; }
  }
  const timer = setInterval(() => { void tick(); }, 5000).unref();
  const purge = setInterval(() => { void pool.query("DELETE FROM recipes.ai_job WHERE created_at < now() - interval '90 days'").catch(() => {}); }, 6 * 3600000).unref();
  return () => { stopped = true; controller.abort(); clearInterval(timer); clearInterval(purge); };
}
