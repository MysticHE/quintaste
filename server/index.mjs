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
import { allowed, featureGate, operations, restricted } from './operations.mjs';
import { avatars } from './avatar/router.mjs';
import { lotus } from './lotus/router.mjs';
import { community } from './community/router.mjs';
import { inbox } from './community/inbox.mjs';
import { devWebOrigin } from './community/http.mjs';
import { market, marketSeller } from './market/router.mjs';
import { purgeOrderContacts } from './market/orders.mjs';
import { social } from './social/router.mjs';
import { purgeSelfies } from './social/verify.mjs';
import { recipes } from './recipes/router.mjs';
import { reactions } from './reactions/router.mjs';
import { areas } from './areas/router.mjs';
import { startAreaSnapshots } from './areas/snapshot.mjs';
import { placeReviews } from './place-reviews/router.mjs';
import { game, gamePublic, purgeRunLogs } from './game/router.mjs';
import { editorial, editorialAssets, editorialAssetRoot } from './editorial/router.mjs';
import { startAvatarWorker } from './avatar/worker.mjs';
import { aiRecipes } from './ai-recipes/router.mjs';
import { aiRecipeBots } from './ai-recipes/bot-router.mjs';
import { creatorBots } from './creators/bot-router.mjs';
import { gameArt, gameArtBots } from './game/art.mjs';
import { startAiRecipeWorker } from './ai-recipes/worker.mjs';
import { startLevelWorker } from './game/levels-worker.mjs';
import { gameLevelBots } from './game/levels-bot.mjs';
import { cookSearch } from './cook-search/router.mjs';
import { startDemandWorker } from './cook-search/demand.mjs';
import { startNutritionRefresh } from './nutrition/service.mjs';
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
app.use('/api/inbox', inbox);
app.use('/api/place-reviews', featureGate('menus'), placeReviews);
app.use('/api/market/seller', featureGate('market_sellers'), marketSeller);
app.use('/api/market', featureGate('market'), market);
app.use('/api/social', featureGate('social'), social);
// Withdrawing stays available while the service is paused, so members can always take their recipes down.
const recipesGate = featureGate('recipes');
app.use('/api/recipes', (req, res, next) => req.method === 'DELETE' ? next() : recipesGate(req, res, next), recipes);
// AI recipes (docs/AI_RECIPES_PLAN.md): the router checks the ai_recipes control itself so /status can say when it is off.
app.use('/api/ai-recipes/bot', aiRecipeBots);
// Creator library (docs/COOKER_CREATOR_LIBRARY_PLAN.md): signed QT Cooker routes only; staff use the admin console.
app.use('/api/creators/bot', creatorBots);
app.use('/api/ai-recipes', aiRecipes);
// Cook search suggestions and the settled-search log for wanted recipes (docs/COOK_DISCOVERY_PLAN.md); not behind the recipes control.
app.use('/api/cook-search', cookSearch);
// Likes and shares cover every Cook recipe and Explore place, so they stay on while member submissions are paused.
app.use('/api/reactions', reactions);
app.use('/api/areas', featureGate('areas'), areas);
// Public and outside the gate, so the app can show its placeholder when staff switch the game off.
app.get('/api/game/status', async (_req, res) => { res.set('Cache-Control', 'no-store').json({ enabled: await allowed('games') }); });
app.use('/api/game', featureGate('games'), game);
// Game pictures (docs/game/RECIPE_LEVELS_PLAN.md §8.5): approved pictures are public and immutable; QT Gamer's picture and level routes are signed.
app.use('/api/game-public', featureGate('games'), gamePublic);
app.use('/api/game-art/bot', gameArtBots);
app.use('/api/game-levels/bot', gameLevelBots);
app.use('/api/game-art', gameArt);
app.use('/api/local-explore', (_req, res) => res.status(503).json({ error: 'Local development services are unavailable on this deployment.' }));
app.use('/api/staff-base', (_req, res) => res.sendStatus(404));
// Rush Hour's exported game page for Expo Go (CI copies Expo's DOM export here): the page is always revalidated so it
// never points at a removed script; the scripts are content-hashed.
app.use('/game-dom', express.static(path.resolve('dist/client/game-dom'), { index: false, fallthrough: false,
  setHeaders: (res, file) => res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable') }));
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
// On unless disabled: the worker idles until the ai_recipes control is on and the gateway is configured.
const stopAiRecipes = process.env.AI_RECIPES_WORKER_ENABLED !== 'false' ? startAiRecipeWorker() : () => {};
// Hourly: recipe nutrition from the learned ingredient database (asks the AI only while ai_recipes is on).
const stopNutrition = process.env.AI_RECIPES_WORKER_ENABLED !== 'false' ? startNutritionRefresh() : () => {};
// Every minute: wanted recipes from Cook searches (idle until recipe_demand, ai_recipes and recipes are on).
const stopDemand = process.env.AI_RECIPES_WORKER_ENABLED !== 'false' ? startDemandWorker() : () => {};
const stopLevels = process.env.AI_RECIPES_WORKER_ENABLED !== 'false' ? startLevelWorker() : () => {};
const purgeContacts = () => purgeOrderContacts().then(count => count && logger.info({ event: 'market_contacts_purged', count }))
  .catch(error => logger.warn({ event: 'market_contacts_purge_failed', code: error?.code }));
const purgeTimer = setInterval(purgeContacts, 6 * 3600000).unref();
const purgeSelfieImages = () => purgeSelfies().then(count => count && logger.info({ event: 'social_selfies_purged', count }))
  .catch(error => logger.warn({ event: 'social_selfies_purge_failed', code: error?.code }));
const purgeSelfieTimer = setInterval(purgeSelfieImages, 6 * 3600000).unref();
const stopAreaSnapshots = startAreaSnapshots();
const purgeLogs = () => purgeRunLogs().then(count => count && logger.info({ event: 'game_run_logs_purged', count }))
  .catch(error => logger.warn({ event: 'game_run_logs_purge_failed', code: error?.code }));
const purgeLogsTimer = setInterval(purgeLogs, 24 * 3600000).unref();
// Also shortly after start: deploys more often than daily would otherwise never reach the first daily run.
setTimeout(purgeLogs, 120000).unref();
setTimeout(purgeContacts, 60000).unref();
setTimeout(purgeSelfieImages, 90000).unref();
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  stopAvatars();
  stopAiRecipes();
  stopNutrition();
  stopDemand();
  stopLevels();
  clearInterval(purgeTimer);
  clearInterval(purgeSelfieTimer);
  clearInterval(purgeLogsTimer);
  stopAreaSnapshots();
  const timer = setTimeout(() => process.exit(1), 15000).unref();
  internal?.close();
  server.close(async () => { await pool.end(); clearTimeout(timer); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
