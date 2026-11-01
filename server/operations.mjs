import express from 'express';
import { logger, pool, registrationOpen } from './config.mjs';

export const operationsEnabled = process.env.OPERATIONS_ENABLED === 'true';
// Without operations, suspensions and feature kill switches are not enforced; make that visible in production logs.
if (!operationsEnabled && process.env.NODE_ENV === 'production') logger.warn({ event: 'operations_disabled' });
export async function allowed(feature) {
  if (!operationsEnabled) return feature !== 'registration' || registrationOpen;
  const result = await pool.query('SELECT enabled,notice FROM ops.control WHERE key=$1', [feature]);
  return result.rows[0]?.enabled === true && (feature !== 'registration' || registrationOpen);
}
/** Several switches in one read, as { [feature]: on }; the same rules as allowed(). */
export async function allowedAll(features) {
  if (!operationsEnabled) return Object.fromEntries(features.map(f => [f, f !== 'registration' || registrationOpen]));
  const on = new Set((await pool.query('SELECT key FROM ops.control WHERE key = ANY($1::text[]) AND enabled', [features])).rows.map(r => r.key));
  return Object.fromEntries(features.map(f => [f, on.has(f) && (f !== 'registration' || registrationOpen)]));
}
export async function restricted(userId) {
  if (!operationsEnabled) return false;
  const result = await pool.query('SELECT active FROM ops.restriction WHERE user_id=$1', [userId]);
  return result.rows[0]?.active === true;
}
export function featureGate(feature) {
  return async (_req, res, next) => {
    if (await allowed(feature)) return next();
    res.set('Cache-Control', 'no-store').status(503).json({ error: 'This service is temporarily unavailable.', code: 'SERVICE_PAUSED' });
  };
}
export const operations = express.Router();
operations.get('/status', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!operationsEnabled) return res.json({ notices: [] });
  const result = await pool.query("SELECT key,enabled,notice FROM ops.control WHERE notice<>'' ORDER BY key");
  res.json({ notices: result.rows });
});
