import express from 'express';
import { randomInt } from 'node:crypto';
import { pool, logger } from '../config.mjs';
import { CommunityError, throttle, transaction } from '../community/http.mjs';
import { standing } from './access.mjs';
import { sealSelfie, selfiePhoto } from './media.mjs';

export const verify = express.Router();
/** Poses the app shows as a picture; copying a random one shows the selfie was taken live. */
export const poses = ['thumbs-up', 'peace-sign', 'hand-on-chin', 'point-up', 'wave', 'touch-ear', 'three-fingers', 'hand-on-head'];

const status = async me => (await pool.query(`SELECT status, next_pose AS pose, reason FROM social.verification WHERE user_id=$1`, [me])).rows[0] ?? null;
verify.get('/me/verify', async (_req, res) => {
  const me = res.locals.user.id, [row, state] = await Promise.all([status(me), standing(me)]);
  res.json({ pose: row?.pose ?? null, standing: state });
});
/** A new pose to copy; each call picks another, so a retake after a declined check starts fresh. */
verify.post('/me/verify/pose', async (_req, res) => {
  const me = res.locals.user.id;
  await throttle('social-pose:' + me, 20, 3600);
  const state = await standing(me);
  if (state.step !== 'verify') throw new CommunityError(409, state.step === 'waiting' ? 'We are already checking your photo.' : state.verified ? 'Your photo is verified.' : 'Finish your profile first.');
  const current = (await status(me))?.pose;
  const choices = poses.filter(pose => pose !== current), pose = choices[randomInt(choices.length)];
  await pool.query(`INSERT INTO social.verification(user_id, next_pose) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET next_pose=$2, updated_at=now()`, [me, pose]);
  res.json({ pose });
});
/** The live selfie: sealed for staff, compared with the current main photo. Five tries a day. */
verify.post('/me/verify', async (req, res) => {
  const me = res.locals.user.id;
  await throttle('social-selfie:' + me, 5, 86400, 'You have tried a few times today. Try again tomorrow.');
  const bytes = await selfiePhoto(req.body?.selfie);
  try {
    const sealed = sealSelfie(me, bytes);
    await transaction(async db => {
      const state = await standing(me, db);
      if (state.step !== 'verify') throw new CommunityError(409, state.step === 'waiting' ? 'We are already checking your photo.' : state.verified ? 'Your photo is verified.' : 'Finish your profile first.');
      const row = (await db.query(`SELECT v.next_pose, (SELECT digest FROM social.photo WHERE user_id=$1 AND position=0) AS main
        FROM social.verification v WHERE v.user_id=$1 FOR UPDATE`, [me])).rows[0];
      if (!row?.next_pose || req.body?.pose !== row.next_pose) throw new CommunityError(409, 'Copy the pose shown, then take the selfie again.', 'SOCIAL_POSE');
      await db.query(`UPDATE social.verification SET status='pending', pose=next_pose, next_pose=NULL, selfie=$2, photo_digest=$3, reason='', submitted_at=now(),
        decided_by=NULL, decided_at=NULL, delete_after=NULL, updated_at=now() WHERE user_id=$1`, [me, sealed, row.main]);
    }, 'social-photos:' + me);
  } finally { bytes.fill(0); }
  logger.info({ event: 'social_selfie_submitted' });
  res.status(201).json({ standing: await standing(me) });
});

/** Erases selfies 30 days after the staff decision. */
export async function purgeSelfies() {
  return (await pool.query('UPDATE social.verification SET selfie=NULL, updated_at=now() WHERE selfie IS NOT NULL AND delete_after < now()')).rowCount;
}
