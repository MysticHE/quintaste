import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import express from 'express';
import helmet from 'helmet';
import { createApiRateLimits } from './api-rate-limits.mjs';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.mjs';
import { accounts } from './accounts.mjs';
import { logger, pool } from './config.mjs';
import { featureGate, operations, restricted } from './operations.mjs';
import { avatars } from './avatar/router.mjs';
import { lotus } from './lotus/router.mjs';
import { community } from './community/router.mjs';
import { devWebOrigin } from './community/http.mjs';
import { market, marketSeller } from './market/router.mjs';
import { purgeOrderContacts } from './market/orders.mjs';
import { social } from './social/router.mjs';
import { recipes } from './recipes/router.mjs';
import { reactions } from './reactions/router.mjs';
import { areas } from './areas/router.mjs';
import { startAreaSnapshots } from './areas/snapshot.mjs';
import { placeReviews } from './place-reviews/router.mjs';
import { editorial, editorialAssets, editorialAssetRoot } from './editorial/router.mjs';
import { startAvatarWorker } from './avatar/worker.mjs';
const { createRequestHandler } = createRequire(import.meta.url)('expo-server/adapter/express');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, _res, next) => { req.headers['x-forwarded-for'] = req.ip; next(); });
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' } }));
app.get('/expo-go.png', (_req, res) => res.sendFile(path.resolve('server-assets/expo-go.png')));
app.use('/api/editorial/assets', editorialAssets);
// Content-addressed, reviewed assets only. Missing files never trigger a provider download.
app.use('/api/catalogue-photos', (req, res, next) => {
  if (!/^\/[a-f0-9]{64}\.jpg$/.test(req.path)) return res.sendStatus(404);
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(editorialAssetRoot, { maxAge: '1y', immutable: true, index: false }),
express.static(path.resolve('server-assets/catalogue'), { maxAge: '1y', immutable: true, index: false }),
// Photos staff upload in the console live in content.asset, addressed by their SHA-256.
async (req, res) => {
  try {
    const row = (await pool.query('SELECT bytes FROM content.asset WHERE sha256=$1', [req.path.slice(1, 65)])).rows[0];
    if (!row) return res.sendStatus(404);
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }).send(row.bytes);
  } catch { res.sendStatus(404); }
},
(_error, _req, res, _next) => res.sendStatus(404));
// Local development only: lets an Expo web dev server on another port call this API with the session cookie.
if (devWebOrigin) app.use('/api', (req, res, next) => {
  if (req.headers.origin !== devWebOrigin) return next();
  res.set({ 'Access-Control-Allow-Origin': devWebOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, X-QuinTaste-Client', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.get('/healthz', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'quintaste', stage: 'staging' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
const apiLimits = createApiRateLimits({ pool, secret: process.env.BETTER_AUTH_SECRET, logger,
  resolveSession: req => auth.api.getSession({ headers: fromNodeHeaders(req.headers) }) });
app.use('/api', apiLimits.network, apiLimits.general);
app.use('/api/editorial', editorial);
app.use('/api/auth/sign-in/username', apiLimits.signIn, express.json({ limit: '16kb' }), apiLimits.signInAccount);
for (const action of ['register', 'recover', 'recovery-codes']) {
  app.use('/api/account/' + action, apiLimits.sensitiveAccount(action));
}
app.use('/api/auth', (req, res, next) => {
  if (Number(req.headers['content-length'] || 0) > 16384) return res.status(413).json({ error: 'Request is too large.' });
  next();
});
const authPaths = new Set(['/sign-in/username', '/get-session', '/sign-out', '/delete-user',
  '/list-sessions', '/revoke-session', '/revoke-sessions', '/revoke-other-sessions',
  '/callback/google', '/one-time-token/verify']);
app.use('/api/auth', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!authPaths.has(req.path)) return res.status(403).json({ message: 'Use the sign-in options on the account screen.' });
  next();
});
app.use('/api/auth/get-session', async (req, res, next) => {
  const current = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (current?.user && await restricted(current.user.id)) return res.status(401).json({ message: 'Account access is restricted.' });
  next();
});
app.all('/api/auth/{*splat}', toNodeHandler(auth));
app.use('/api/account', accounts);
app.use('/api/operations', operations);
app.use(['/api/live-places','/api/place-search','/api/place-details','/api/place-photo','/api/location-search'], featureGate('discovery'));
app.use(['/api/menus', '/api/catalogue'], featureGate('menus'));
app.use('/api/avatar', avatars);
app.use('/api/lotus', lotus);
app.use('/api/community', community);
app.use('/api/place-reviews', featureGate('menus'), placeReviews);
app.use('/api/market/seller', featureGate('market_sellers'), marketSeller);
app.use('/api/market', featureGate('market'), market);
app.use('/api/social', featureGate('social'), social);
// Withdrawing stays available while the service is paused, so members can always take their recipes down.
const recipesGate = featureGate('recipes');
app.use('/api/recipes', (req, res, next) => req.method === 'DELETE' ? next() : recipesGate(req, res, next), recipes);
// Likes and shares cover every Cook recipe and Explore place, so they stay on while member submissions are paused.
app.use('/api/reactions', reactions);
app.use('/api/areas', featureGate('areas'), areas);
app.use('/api/local-explore', (_req, res) => res.status(503).json({ error: 'Local development services are unavailable on this deployment.' }));
app.use('/api/staff-base', (_req, res) => res.sendStatus(404));
app.use(express.static(path.resolve('dist/client'), { maxAge: '1h', extensions: ['html'], index: false }));
app.all('/{*all}', createRequestHandler({ build: path.resolve('dist/server') }));
app.use((err, _req, res, _next) => {
  const status = Number(err?.status ?? err?.statusCode);
  const client = status >= 400 && status < 500;
  if (!client) logger.error({ event: 'request_failed', type: err?.type || 'internal' });
  if (!res.headersSent) res.status(client ? status : 500).json({ error: client ? 'Invalid request.' : 'Request could not be completed.' });
});
const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => logger.info({ event: 'server_ready' }));
// The staff console reads packaged and bot content before staff changes on this port. Traefik routes only to PORT.
const internalPort = Number(process.env.CONTENT_INTERNAL_PORT || (process.env.NODE_ENV === 'production' ? 3001 : 0));
// The console proves itself with a short-lived token it stored in content.access, so other containers cannot read it.
async function staffToken(req, res, next) {
  try {
    const token = req.get('x-quintaste-content-token') ?? '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return res.sendStatus(401);
    const found = await pool.query('SELECT 1 FROM content.access WHERE hash=$1 AND expires_at>now()', [createHash('sha256').update(token).digest('hex')]);
    return found.rowCount ? next() : res.sendStatus(401);
  } catch { res.sendStatus(503); }
}
const internal = internalPort ? express().disable('x-powered-by').get('/api/staff-base', staffToken, createRequestHandler({ build: path.resolve('dist/server') }))
  .use((_req, res) => res.sendStatus(404)).listen(internalPort, '0.0.0.0') : null;
server.requestTimeout = 30000;
server.headersTimeout = 15000;
const stopAvatars = process.env.AVATAR_WORKER_ENABLED === 'true' ? startAvatarWorker() : () => {};
const purgeContacts = () => purgeOrderContacts().then(count => count && logger.info({ event: 'market_contacts_purged', count }))
  .catch(error => logger.warn({ event: 'market_contacts_purge_failed', code: error?.code }));
const purgeTimer = setInterval(purgeContacts, 6 * 3600000).unref();
const stopAreaSnapshots = startAreaSnapshots();
setTimeout(purgeContacts, 60000).unref();
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  stopAvatars();
  clearInterval(purgeTimer);
  stopAreaSnapshots();
  const timer = setTimeout(() => process.exit(1), 15000).unref();
  internal?.close();
  server.close(async () => { await pool.end(); clearTimeout(timer); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
