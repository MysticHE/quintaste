import express from 'express';
import { randomUUID } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, eligibility } from './auth.mjs';
import { logger, origin, pool } from './config.mjs';
import { normalizeUsername, validUsername, validPassword } from './account-policy.mjs';
import { initialRecoveryCodes } from './recovery.mjs';
import { recoverAccount, recoverySettings } from './recovery-routes.mjs';
import { allowed, restricted } from './operations.mjs';
import { googleLogin } from './google/router.mjs';
import { googleOptions } from './google/config.mjs';
import { accountAccess } from './account-access.mjs';

export const accounts = express.Router();
accounts.use(express.json({ limit: '16kb' }));
accounts.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.headers.origin !== origin && req.headers['expo-origin'] !== 'quintaste://') {
    return res.status(403).json({ error: 'Untrusted request origin.' });
  }
  next();
});
accounts.get('/status', async (_req, res) => res.json({ registrationOpen: await allowed('registration'), authMode: 'username', google: Boolean(googleOptions()), recovery: 'codes', stage: 'staging' }));
accounts.use('/google', googleLogin);
accounts.post('/recover', recoverAccount);
function eligibleDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1900-01-01') return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  if (value > today) return null;
  const [year, month, day] = today.split('-').map(Number);
  const [by, bm, bd] = value.split('-').map(Number);
  return year - by - (month < bm || (month === bm && day < bd) ? 1 : 0) >= 18;
}
accounts.post('/register', async (req, res) => {
  const adult = eligibleDate(req.body?.dateOfBirth);
  delete req.body?.dateOfBirth;
  if (adult === null) return res.status(400).json({ error: 'Enter a valid date of birth.' });
  if (!adult) return res.status(403).json({ error: 'Account creation is unavailable. Continue as a guest.', code: 'UNDER_AGE' });
  if (!await allowed('registration')) return res.status(503).json({ error: 'Registration is not open yet. Continue as a guest or use your test account.' });
  const { name, password } = req.body || {};
  const username = normalizeUsername(req.body?.username);
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 50 ||
      !validUsername(username) || !validPassword(password)) {
    return res.status(400).json({ error: 'Use a name up to 50 characters, a username of 3–30 letters/numbers/underscores starting with a letter, and a password of 15–128 characters.' });
  }
  let user;
  try {
    const result = await eligibility.run({ adult: true }, () => auth.api.signUpEmail({ body: {
      name: name.trim(), username, password, email: randomUUID() + '@accounts.quintaste.invalid',
    }, headers: fromNodeHeaders(req.headers) }));
    user = result.user;
  } catch {
    return res.status(400).json({ error: 'Registration could not be completed. Try a different username, or sign in if you already created this account.' });
  }
  try {
    const codes = await initialRecoveryCodes(user.id);
    res.status(201).json({ username, codes });
  } catch {
    logger.error({ event: 'initial_recovery_codes_failed' });
    res.status(201).json({ username, codes: [], message: 'Your account was created, but recovery codes could not be prepared. Sign in and generate them from Your account.' });
  }
});
accounts.post('/eligibility', async (req,res) => {
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if (!session?.user || await restricted(session.user.id)) return res.status(401).json({error:'Sign in first.'});
  if (session.user.adultConfirmed) {
    delete req.body?.dateOfBirth;
    return res.json({adultConfirmed:true});
  }
  const adult=eligibleDate(req.body?.dateOfBirth); delete req.body?.dateOfBirth;
  if (adult===null) return res.status(400).json({error:'Enter a valid date of birth.'});
  if (!adult) return res.status(403).json({error:'Accounts are available to adults aged 18 and over. Continue as a guest.',code:'UNDER_AGE'});
  await pool.query('UPDATE public."user" SET "adultConfirmed"=true,"updatedAt"=now() WHERE id=$1',[session.user.id]);
  res.json({adultConfirmed:true});
});
accounts.use(async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user || !session.user.adultConfirmed) return res.status(401).json({ error: 'Sign in to continue.' });
  if (await restricted(session.user.id)) return res.status(403).json({ error: 'Account access is restricted.' });
  res.locals.session = session;
  next();
});
accounts.use('/recovery-codes', recoverySettings);
accounts.get('/profile', (_req, res) => {
  const { user } = res.locals.session;
  res.json({ id: user.id, name: user.name, username: user.username, bio: user.bio || '', adultConfirmed: user.adultConfirmed });
});
accounts.get('/access', async (_req,res) => {
  const {user}=res.locals.session;
  const providers=await pool.query('SELECT "providerId" FROM public.account WHERE "userId"=$1',[user.id]);
  res.json({...await accountAccess(user.id),passwordLogin:providers.rows.some(row=>row.providerId==='credential'),googleLogin:providers.rows.some(row=>row.providerId==='google')});
});
accounts.patch('/profile', async (req, res) => {
  const { name, bio } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 50 || typeof bio !== 'string' || bio.length > 160) {
    return res.status(400).json({ error: 'Use a display name up to 50 characters and a bio up to 160 characters.' });
  }
  await pool.query('UPDATE "user" SET name=$1, bio=$2, "updatedAt"=NOW() WHERE id=$3', [name.trim(), bio, res.locals.session.user.id]);
  res.json({ saved: true });
});
accounts.get('/export', async (_req, res) => {
  const { user } = res.locals.session;
  res.set('Content-Disposition', 'attachment; filename="quintaste-account.json"');
  res.json({ exportedAt: new Date().toISOString(), account: {
    id: user.id, name: user.name, username: user.username, bio: user.bio || '', adultConfirmed: user.adultConfirmed,
    createdAt: user.createdAt,
  }, note: 'Food collections remain on each device. Export them separately from Privacy & local data.' });
});
