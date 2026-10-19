import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { logger } from '../config.mjs';
import { AvatarError } from '../avatar/config.mjs';
import { erasePayload, loadPayload, savePayload } from '../avatar/storage.mjs';
import { renderImage } from '../avatar/provider.mjs';
import { failLotusJob, finishLotusJob, lotusAvailable } from './breeding.mjs';
import { BREED_PLAN } from './prompts.mjs';

/**
 * Quality gate for each base (AVATAR_LOTUS_PLAN §5): a visible transparent cut-out in the fixed head-and-shoulders
 * framing, so device-composited perks can sit on anchor points. Crown in the top fifth, centred, shoulders reaching the
 * lower edge. Face counting is not automated; the Report action stays.
 */
export async function checkFraming(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let top = height, bottom = -1, left = width, right = -1, solid = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[y * width + x] < 128) continue;
    solid++; if (y < top) top = y; if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x;
  }
  const area = width * height, centre = (left + right) / 2 / width;
  const framed = solid > area * 0.12 && solid < area * 0.92 && top / height <= 0.2 && bottom / height >= 0.8 && Math.abs(centre - 0.5) <= 0.12;
  if (!framed) throw new AvatarError(502, 'The new avatar was not framed head and shoulders.');
}

const stopped = () => new AvatarError(409, 'Breeding stopped.');
function failure(job, error) {
  const reason = error instanceof AvatarError && error.status !== 409 ? error.message.replace(/ ?Your saved avatar is unchanged\.$/, '') : 'Breeding was interrupted.';
  return reason + (job.kind === 'breed' ? ' Nothing was used up; your breed is ready to try again.' : ' This try did not count.');
}

/**
 * Runs one attempt's six calls (Adult base from the selfie, Mini base from the Adult base, then blink and talk for each).
 * The selfie is erased from the encrypted payload as soon as the Adult base exists. Progress is saved after every call;
 * an interrupted attempt is never retried automatically, so no call is paid twice.
 */
export async function generateLotus(db, job, signal) {
  let payload;
  const check = async () => { if (signal.aborted || !await lotusAvailable(job)) throw stopped(); };
  try {
    payload = await loadPayload(job.id);
    for (const [index, step] of BREED_PLAN.entries()) {
      await check();
      const input = Buffer.from(step.from === 'photo' ? payload.photo : payload.forms[step.from].base.split(',')[1], 'base64');
      let rendered;
      try { rendered = await renderImage(input, step.request, signal); } finally { input.fill(0); }
      try { if (step.state === 'base') await checkFraming(rendered.bytes); } finally { rendered.bytes.fill(0); }
      await check();
      (payload.forms[step.form] ??= {})[step.state] = rendered.uri;
      if (step.from === 'photo') delete payload.photo;
      await savePayload(job.id, payload);
      await db.query("UPDATE lotus.job SET completed=$2 WHERE id=$1 AND status='working'", [job.id, index + 1]);
    }
    const saved = await finishLotusJob(job, payload.forms);
    await erasePayload(job.id);
    logger.info({ event: 'lotus_breed_finished', kind: job.kind, saved });
  } catch (error) {
    await failLotusJob(job.id, failure(job, error)).catch(() => logger.error({ event: 'lotus_breed_fail_record_failed' }));
    logger.warn({ event: 'lotus_breed_failed', kind: job.kind, category: error instanceof AvatarError ? error.status : 'internal' });
  } finally { payload = undefined; }
}
