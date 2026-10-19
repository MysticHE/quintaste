import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.mjs';
import { origin } from '../config.mjs';
import { allowed, restricted } from '../operations.mjs';
import { avatarConfig, AvatarError, consentVersion } from './config.mjs';
import { normalizeSelfie } from './media.mjs';
import { createJob, getJob, jobView, cancelJob, throttleAvatar } from './repository.mjs';
import { storageReady } from './storage.mjs';
import { rateLimit } from 'express-rate-limit';
import { reportAvatar } from './reports.mjs';
import { accountAccess } from '../account-access.mjs';
import { library } from './library.mjs';
import { lotusUploads } from '../lotus/uploads.mjs';
import { CommunityError } from '../community/http.mjs';

export const avatars = express.Router();
let activeUploads = 0;
avatars.use(rateLimit({ windowMs:60000, limit:60, standardHeaders:'draft-8', legacyHeaders:false }));
avatars.use(async (req,res,next) => {
  res.set('Cache-Control','private, no-store');
  if (req.method !== 'GET' && (req.headers['x-quintaste-client'] !== 'avatar' ||
    (req.headers.origin ? req.headers.origin !== origin : req.headers['expo-origin'] !== 'quintaste://'))) {
    return res.status(403).json({ error:'Untrusted request origin.' });
  }
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user?.adultConfirmed) {
    if (req.path === '/status' && req.method === 'GET') return res.json({ available:false,reason:'signin' });
    return res.status(401).json({ error:'Sign in to your QuinTaste account to create an avatar.' });
  }
  if (await restricted(session.user.id)) return res.status(403).json({ error:'Account access is restricted.' });
  res.locals.userId=session.user.id; next();
});
avatars.get('/status', async (_req,res) => {
  let ready=avatarConfig().enabled && await allowed('avatars');
  try { if (ready) await storageReady(); } catch { ready=false; }
  res.json({ available:ready, reason:ready?'ready':'setup', ...await accountAccess(res.locals.userId) });
});
avatars.use('/library',library);
/** At most two selfie uploads are parsed at once on this server, portraits and lotus breeds together. */
function uploadSlot(req,res,next) {
  if (req.method !== 'POST') return next();
  if (activeUploads >= 2) return res.status(503).json({ error:'The upload service is busy. Try again shortly.' });
  activeUploads++;
  let released=false;
  const release=() => { if (!released) { released=true; activeUploads--; } };
  res.once('finish',release); res.once('close',release);
  next();
}
avatars.use('/lotus', async (req,res,next) => { if (req.method === 'POST') await throttleAvatar(res.locals.userId); next(); }, uploadSlot, lotusUploads);
avatars.post('/reports',express.json({limit:'16kb',inflate:false}),async(req,res) => {
  await throttleAvatar('report:'+res.locals.userId);
  res.status(201).json(await reportAvatar(res.locals.userId,req.body));
});
avatars.use('/jobs', async (req,res,next) => {
  const requestId = req.query.requestId;
  if (req.method !== 'POST' && (typeof requestId !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(requestId))) {
    return res.status(400).json({ error:'Choose a valid avatar request.' });
  }
  if (req.method === 'POST' || req.method === 'DELETE') await throttleAvatar(res.locals.userId);
  next();
}, uploadSlot);
avatars.get('/jobs', async (req,res) => res.json(await jobView(await getJob(res.locals.userId,req.query.requestId))));
avatars.delete('/jobs', async (req,res) => { await cancelJob(res.locals.userId,req.query.requestId); res.json({ deleted:true }); });
avatars.post('/jobs', express.json({ limit:'5600kb', inflate:false }), async (req,res) => {
  if (!avatarConfig().enabled || !await allowed('avatars')) throw new AvatarError(503,'Avatar generation is temporarily unavailable.');
  const { requestId,consent,photo }=req.body || {};
  if (consent !== consentVersion || typeof requestId !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(requestId)) {
    throw new AvatarError(400,'Confirm photo consent and start a valid avatar request.');
  }
  const existing=await getJob(res.locals.userId,requestId);
  if (existing) return res.status(200).json(await jobView(existing));
  const normalized=await normalizeSelfie(photo); delete req.body.photo;
  const job=await createJob(res.locals.userId,requestId,normalized);
  res.status(202).json(await jobView(job));
});
avatars.use((error,_req,res,next) => {
  if (error instanceof AvatarError || error instanceof CommunityError) return res.status(error.status).json({ error:error.message, ...(error.code ? { code:error.code } : {}) });
  if (['42P01','3F000'].includes(error?.code)) return res.status(503).json({ error:'Breeding is not available yet.', code:'UNAVAILABLE' });
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error:'Invalid upload.' });
  next(error);
});
