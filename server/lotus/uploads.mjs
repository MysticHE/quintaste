import express from 'express';
import { allowed } from '../operations.mjs';
import { AvatarError, avatarConfig } from '../avatar/config.mjs';
import { normalizeSelfie } from '../avatar/media.mjs';
import { admitBreed, getLotusJob, lotusConsentVersion } from './breeding.mjs';
import { jobView } from './state.mjs';

/**
 * Breed uploads (/api/avatar/lotus): the selfie for a breed or a free regeneration, and attempt progress. Mounted inside
 * the avatar router, which already requires a signed-in adult, an unrestricted account and the trusted app origin, and
 * sits behind the 5.6 MiB upload route at the edge. Starting never pays twice: the same requestId returns the same attempt.
 */
export const lotusUploads = express.Router();
const requestPattern = /^[A-Za-z0-9-]{16,80}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

lotusUploads.get('/breeds', async (req, res) => {
  const requestId = req.query.requestId;
  if (typeof requestId !== 'string' || !requestPattern.test(requestId)) throw new AvatarError(400, 'Choose a valid breed request.');
  const job = await getLotusJob(res.locals.userId, requestId);
  if (!job) throw new AvatarError(404, 'This breed request was not found.');
  res.json(jobView(job));
});

lotusUploads.post('/breeds', express.json({ limit: '5600kb', inflate: false }), async (req, res) => {
  if (!avatarConfig().enabled || !await allowed('avatars')) throw new AvatarError(503, 'Breeding is temporarily unavailable.', 'GENERATION_OFF');
  const { requestId, consent, photo, breedId } = req.body || {};
  if (consent !== lotusConsentVersion || typeof requestId !== 'string' || !requestPattern.test(requestId)) {
    throw new AvatarError(400, 'Confirm photo consent and start a valid breed.');
  }
  if (breedId !== undefined && (typeof breedId !== 'string' || !uuid.test(breedId))) throw new AvatarError(400, 'Choose a valid breed.');
  const existing = await getLotusJob(res.locals.userId, requestId);
  if (existing) return res.status(200).json(jobView(existing));
  const normalized = await normalizeSelfie(photo); delete req.body.photo;
  const job = await admitBreed(res.locals.userId, requestId, normalized, breedId ?? null);
  res.status(202).json(jobView(job));
});
