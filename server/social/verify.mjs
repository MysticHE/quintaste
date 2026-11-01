import express from 'express';
import { pool, logger } from '../config.mjs';
import { CommunityError, throttle, transaction } from '../community/http.mjs';
import { standing } from './access.mjs';

export const verify = express.Router();
/**
 * Kept for app builds from before 1 Nov 2026, whose photo check asked for a pose first: the read still works and the pose
 * request tells them to update, so they never wait on a check this server no longer takes.
 */
verify.get('/me/verify', async (_req, res) => {
  res.json({ pose: null, standing: await standing(res.locals.user.id) });
});
verify.post('/me/verify/pose', () => {
  throw new CommunityError(410, 'Update QuinTaste to send your photo for checking.', 'APP_UPDATE');
});
/**
 * The photo check (owner, 1 Nov 2026): the member's main photo must be a real selfie of them, and staff check that photo.
 * There is no separate selfie or pose any more. A declined check or a changed main photo is sent again here. Five a day.
 */
verify.post('/me/verify', async (_req, res) => {
  const me = res.locals.user.id;
  await throttle('social-check:' + me, 5, 86400, 'You have sent a few times today. Try again tomorrow.');
  await transaction(async db => {
    const state = await standing(me, db);
    if (state.step !== 'verify') throw new CommunityError(409, state.step === 'waiting' ? 'We are already checking your photo.' : state.verified ? 'Your photo is verified.' : 'Finish your profile first.');
    const main = (await db.query('SELECT digest FROM social.photo WHERE user_id=$1 AND position=0', [me])).rows[0]?.digest;
    // A selfie left from the old check is erased now rather than kept for 30 days.
    await db.query(`INSERT INTO social.verification(user_id, status, photo_digest, submitted_at) VALUES($1, 'pending', $2, now())
      ON CONFLICT(user_id) DO UPDATE SET status='pending', pose=NULL, next_pose=NULL, selfie=NULL, photo_digest=$2, reason='', submitted_at=now(),
        decided_by=NULL, decided_at=NULL, delete_after=NULL, updated_at=now()`, [me, main]);
  }, 'social-photos:' + me);
  logger.info({ event: 'social_photo_check_submitted' });
  res.status(201).json({ standing: await standing(me) });
});

/** Erases selfies kept from the old check 30 days after the staff decision. */
export async function purgeSelfies() {
  return (await pool.query('UPDATE social.verification SET selfie=NULL, updated_at=now() WHERE selfie IS NOT NULL AND delete_after < now()')).rowCount;
}
