import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Working folder for videos on the app's disk-backed state volume (/app/.local), not the 64 MB in-memory /tmp:
 * downloads and member uploads land here, ffmpeg reads them for step photos, and each job removes its own folder.
 */
export const WORK_DIR = path.resolve(process.env.AI_RECIPES_WORK_DIR || '.local/ai-work');
export const UPLOAD_DIR = path.join(WORK_DIR, 'uploads');

export async function jobDir(id) {
  const dir = path.join(WORK_DIR, 'jobs', String(id).replace(/[^a-f0-9-]/g, '').slice(0, 36) || 'job');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  return dir;
}
export const removeDir = dir => rm(dir, { recursive: true, force: true }).catch(() => {});

/** Path of an upload kept for its job ("local/<uuid>.<ext>" in the job input), or null when the name is not ours. */
export function uploadPath(name) {
  const match = /^local\/([a-f0-9-]{36}\.(?:mp4|mov|webm|3gp|mkv))$/.exec(String(name));
  return match ? path.join(UPLOAD_DIR, match[1]) : null;
}

/** Removes anything older than a day, in case a job or upload was cut off before it cleaned up. */
export async function sweepWork() {
  const cutoff = Date.now() - 24 * 3600000;
  for (const sub of ['jobs', 'uploads']) {
    const dir = path.join(WORK_DIR, sub);
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      const full = path.join(dir, name);
      const info = await stat(full).catch(() => null);
      if (info && info.mtimeMs < cutoff) await rm(full, { recursive: true, force: true }).catch(() => {});
    }
  }
}
