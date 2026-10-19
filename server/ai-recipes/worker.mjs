import { pool, logger } from '../config.mjs';
import { allowed } from '../operations.mjs';
import { geminiConfig } from './gemini.mjs';
import { parseUpload, runJob } from './pipeline.mjs';
import { deleteFile } from './files.mjs';
import { sweepWork, uploadPath } from './work.mjs';
import { rm } from 'node:fs/promises';

/** One job at a time in this process, claimed with SKIP LOCKED so several app replicas can share the queue. */
export function startAiRecipeWorker() {
  const controller = new AbortController();
  let busy = false, stopped = false;
  async function tick() {
    if (busy || stopped) return;
    busy = true;
    try {
      if (!(await geminiConfig()).enabled || !await allowed('ai_recipes') || !await allowed('recipes')) return;
      const stale = await pool.query(`UPDATE recipes.ai_job SET status='failed', finished_at=now(),
          message=CASE WHEN input LIKE 'upload %' THEN 'The job was interrupted. Upload the video again.' ELSE 'The job was interrupted. Try again.' END
        WHERE status='working' AND started_at < now() - interval '20 minutes' RETURNING input`);
      for (const row of stale.rows) {
        const upload = parseUpload(row.input);
        if (!upload) continue;
        const local = uploadPath(upload.name);
        if (local) await rm(local, { force: true }).catch(() => {}); else await deleteFile(upload.name);
      }
      const job = (await pool.query(`UPDATE recipes.ai_job SET status='working', started_at=now(), attempts=attempts+1
        WHERE id = (SELECT id FROM recipes.ai_job WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`)).rows[0];
      if (job) await runJob(job, controller.signal);
    } catch (error) {
      logger.warn({ event: 'ai_recipe_worker_error', detail: String(error?.message ?? error).slice(0, 200) });
    } finally { busy = false; }
  }
  const timer = setInterval(() => { void tick(); }, 5000).unref();
  const purge = setInterval(() => {
    void pool.query("DELETE FROM recipes.ai_job WHERE created_at < now() - interval '90 days'").catch(() => {});
    void sweepWork();
  }, 6 * 3600000).unref();
  return () => { stopped = true; controller.abort(); clearInterval(timer); clearInterval(purge); };
}
