import express from 'express';
import { normalizeUsername, validUsername, validPassword, passwordMaximum } from './account-policy.mjs';
import { normalizeCode, resetWithRecoveryCode, rotateRecoveryCodes } from './recovery.mjs';
import { pool, logger } from './config.mjs';

export async function recoverAccount(req, res) {
  const username = normalizeUsername(req.body?.username);
  const code = normalizeCode(req.body?.code);
  if (!validPassword(req.body?.password)) return res.status(400).json({ error: 'Use a new password with 15–128 characters.' });
  if (!validUsername(username) || !code || !await resetWithRecoveryCode(username, code, req.body.password)) {
    return res.status(400).json({ error: 'The username or recovery code is invalid or already used.' });
  }
  logger.info({ event: 'account_recovered' });
  res.json({ message: 'Password updated. This code is used and all sessions are signed out. Sign in with your new password.' });
}

export const recoverySettings = express.Router();
recoverySettings.get('/', async (_req, res) => {
  const result = await pool.query('SELECT COUNT(*)::int AS remaining FROM account_recovery_code WHERE user_id=$1', [res.locals.session.user.id]);
  res.json({ remaining: result.rows[0].remaining });
});
recoverySettings.post('/', async (req, res) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || !password || password.length > passwordMaximum) return res.status(400).json({ error: 'Enter your current password.' });
  const { user, session } = res.locals.session;
  const codes = await rotateRecoveryCodes(user.id, session.id, password);
  if (!codes) return res.status(403).json({ error: 'Could not replace codes. Check your password or sign in again.' });
  logger.info({ event: 'recovery_codes_replaced' });
  res.json({ username: user.username, codes });
});
