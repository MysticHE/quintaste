// Isolated PostgreSQL integration tests. Never point this at the application database.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import express from 'express';
import { createApiRateLimits, PostgresRateLimitStore, apiRequestKind } from '../server/api-rate-limits.mjs';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('Use a dedicated TEST_DATABASE_URL. No default database is permitted.');
const url = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/quintaste_rate_qa') throw new Error('Only the dedicated local rate QA database is allowed.');
const pool = new pg.Pool({ connectionString, max: 8, statement_timeout: 5000 });
const secret = 'isolated-test-secret-not-a-production-credential';
const sessions = new Map(Array.from({ length: 1000 }, (_, n) => ['qa-token-' + n, 'qa-member-' + n]));
for (const id of ['shared', 'other', 'security', 'credentials']) sessions.set('qa-token-' + id, 'qa-member-' + id);
const servers = [], report = { checkedAt: new Date().toISOString(), checks: [], productionAccountsCreated: 0, providerRequests: 0 };
const cookie = id => 'quintaste.session_token=qa-token-' + id;
const warnings = [];
const logger = { error: () => {}, warn: event => warnings.push(event) };
before(async () => {
  await pool.query('CREATE SCHEMA IF NOT EXISTS community; CREATE TABLE IF NOT EXISTS community.throttle(scope text PRIMARY KEY,started_at timestamptz NOT NULL DEFAULT now(),count integer NOT NULL DEFAULT 1); TRUNCATE community.throttle');
  const migration = readFileSync(new URL('../server/api-rate-limits.sql', import.meta.url), 'utf8');
  await pool.query(migration); await pool.query(migration);
  assert.equal((await pool.query("SELECT indisvalid FROM pg_index WHERE indexrelid='community.community_api_rate_expiry'::regclass")).rows[0].indisvalid, true);
});
after(async () => { await Promise.all(servers.map(s => new Promise(done => s.close(done)))); await pool.end();
  if (process.env.QA_REPORT) writeFileSync(process.env.QA_REPORT, JSON.stringify(report, null, 2)); });
async function app(database = pool) {
  const a = express();a.set('trust proxy', 1);
  const limits = createApiRateLimits({ pool: database, secret, logger,
    resolveSession: async req => { const token = req.headers.cookie?.split('=')[1]; const id = sessions.get(token); return id ? { user: { id } } : null; } });
  a.get('/healthz', (_q, r) => r.json({ ok: true }));
  a.get('/api/catalogue-photos/test.jpg', (_q, r) => r.send('asset'));
  a.use('/api', limits.network, limits.general);
  a.use('/api/auth/sign-in/username', limits.signIn);
  for (const action of ['register', 'recover', 'recovery-codes']) a.use('/api/account/' + action, limits.sensitiveAccount(action));
  a.use('/api', (_q, r) => r.json({ ok: true }));
  const server = a.listen(0, '127.0.0.1');servers.push(server);
  await new Promise(done => server.once('listening', done));return 'http://127.0.0.1:' + server.address().port;
}
async function call(base, path = '/api/menus', { token, ip = '192.0.2.10', method = 'GET', headers = {} } = {}) {
  const r = await fetch(base + path, { method, headers: { 'X-Forwarded-For': ip, ...(token !== undefined ? { Cookie: cookie(token) } : {}), ...headers } });
  const body = await r.text();return { status: r.status, headers: r.headers, body };
}
test('catalogue POST uses read quota; encoded/case/trailing provider paths cannot evade their policy', () => {
  assert.equal(apiRequestKind({ method: 'POST', originalUrl: '/api/catalogue?x=1' }), 'read');
  for (const path of ['/API/PLACE-SEARCH/', '/api/%70lace-search', '/api//place-search']) assert.equal(apiRequestKind({ method: 'POST', originalUrl: path }), 'provider');
  assert.equal(apiRequestKind({ method: 'DELETE', originalUrl: '/api/auth/delete-user' }), 'security');
  assert.equal(apiRequestKind({ method: 'POST', originalUrl: '/api/%zz' }), 'write');
  report.checks.push('Route classification: public catalogue POST, provider variants, sensitive actions and malformed paths');
});
test('atomic counters are shared between store instances, survive recreation and reset by database time', async () => {
  const a = new PostgresRateLimitStore(pool, 'atomic', logger), b = new PostgresRateLimitStore(pool, 'atomic', logger);
  a.init({ windowMs: 60000 });b.init({ windowMs: 60000 });a.nextCleanup = b.nextCleanup = Infinity;
  const hits = await Promise.all(Array.from({ length: 100 }, (_, n) => (n % 2 ? a : b).increment('counter')));
  assert.deepEqual(hits.map(x => x.totalHits).sort((a, b) => a - b), Array.from({ length: 100 }, (_, n) => n + 1));
  const fresh = new PostgresRateLimitStore(pool, 'atomic', logger);fresh.init({ windowMs: 60000 });fresh.nextCleanup = Infinity;
  assert.equal((await fresh.increment('counter')).totalHits, 101);
  await pool.query("UPDATE community.throttle SET started_at=now()-interval '61 seconds' WHERE scope=$1", [a.prefix + 'counter']);
  assert.equal((await a.increment('counter')).totalHits, 1);
  await pool.query('UPDATE community.throttle SET count=2147483647 WHERE scope=$1', [a.prefix + 'counter']);
  assert.equal((await a.increment('counter')).totalHits, 1000000001);
  await a.decrement('counter');await a.resetKey('counter');assert.equal((await a.increment('counter')).totalHits, 1);
  report.checks.push('100 concurrent increments across two stores have no lost updates; recreation/window rollover/overflow/reset pass');
});
test('1000 verified account identities on one IP each receive an independent allowance', async () => {
  const base = await app();
  for (let offset = 0; offset < 1000; offset += 10) {
    const results = await Promise.all(Array.from({ length: 10 }, (_, n) => call(base, '/api/catalogue', { token: offset + n, method: 'POST' })));
    assert.ok(results.every(r => r.status === 200));
  }
  const scopes = (await pool.query("SELECT scope FROM community.throttle WHERE scope LIKE 'api-rate:v1:traffic:%'")).rows;
  assert.equal(scopes.length, 1000);assert.ok(scopes.every(x => !x.scope.includes('qa-member') && !x.scope.includes('192.0.2')));
  report.checks.push('1000 synthetic verified accounts sharing one IP pass; actor/IP plaintext absent from counter keys (quota isolation, not a production capacity benchmark)');
});
test('one account cannot reset its quota by switching IP, server instance or restarting middleware; other accounts and writes remain usable', async () => {
  const a = await app(), b = await app();
  for (let n = 0; n < 300; n++) assert.equal((await call(n % 2 ? a : b, '/api/menus', { token: 'shared', ip: n % 2 ? '192.0.2.20' : '192.0.2.21' })).status, 200);
  const blocked = await call(a, '/api/menus', { token: 'shared' });assert.equal(blocked.status, 429);assert.equal(JSON.parse(blocked.body).code, 'RATE_LIMITED');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);assert.match(blocked.headers.get('ratelimit'), /account-read/);
  assert.equal((await call(await app(), '/api/menus', { token: 'shared', ip: '192.0.2.90' })).status, 429);
  assert.equal((await call(a, '/api/menus', { token: 'other' })).status, 200);
  assert.equal(warnings.filter(x => x.policy === 'account-read').length, 1);
  assert.ok(warnings.every(x => Object.keys(x).every(k => ['event', 'policy'].includes(k))));
  assert.equal((await call(a, '/api/auth/sign-out', { token: 'shared', method: 'POST' })).status, 200);
  for (let n = 0; n < 60; n++) assert.equal((await call(a, '/api/social/groups', { token: 'other', method: 'POST' })).status, 200);
  assert.equal((await call(a, '/api/social/groups', { token: 'other', method: 'POST' })).status, 429);
  assert.equal((await call(a, '/api/menus', { token: 'other' })).status, 200);
  report.checks.push('Account300read/60write quotas separate; same account shared across IPs/processes/restart; another user and sign-out unaffected');
});
test('guests cannot evade their IP quota with claimed user IDs or invalid sessions; IPv6 subnet grouping is retained', async () => {
  const base = await app();
  for (let n = 0; n < 600; n++) assert.equal((await call(base, '/api/menus', { ip: '2001:db8:abcd:1200::1', headers: { 'X-User-Id': 'claimed-' + n, Cookie: 'quintaste.session_token=invalid-' + n } })).status, 200);
  assert.equal((await call(base, '/api/menus', { ip: '2001:db8:abcd:12ff::2', headers: { 'X-User-Id': 'different' } })).status, 429);
  assert.equal((await call(base, '/api/menus', { ip: '2001:db8:abcd:1300::1' })).status, 200);
  assert.equal((await call(base, '/api/menus', { token: 0, ip: '2001:db8:abcd:1200::1' })).status, 200);
  report.checks.push('Guest600read/IP; forged actor headers and invalid cookies cannot choose account buckets; IPv6 /56 and signed-in isolation pass');
});
test('sensitive actions and provider access retain distinct tighter budgets without making provider requests', async () => {
  const base = await app();
  for (let n = 0; n < 20; n++) assert.equal((await call(base, '/api/place-details', { token: 'security', method: 'POST' })).status, 200);
  assert.equal((await call(base, '/api/place-details', { token: 'security', method: 'POST' })).status, 429);
  for (let n = 0; n < 10; n++) assert.equal((await call(base, '/api/auth/delete-user', { token: 'security', method: 'DELETE' })).status, 200);
  assert.equal((await call(base, '/api/auth/revoke-sessions', { token: 'security', method: 'POST' })).status, 429);
  assert.equal((await call(base, '/api/menus', { token: 'security' })).status, 200);
  for (let n = 0; n < 10; n++) assert.equal((await call(base, '/api/auth/sign-in/username', { token: 'credentials', method: 'POST', ip: '192.0.2.40' })).status, 200);
  assert.equal((await call(base, '/api/auth/sign-in/username', { method: 'POST', ip: '192.0.2.40' })).status, 429);
  for (const [n, action] of ['register', 'recover', 'recovery-codes'].entries()) {
    const path = '/api/account/' + action, ip = '192.0.2.' + (50 + n);
    assert.equal((await call(base, path, { ip })).status, 200);
    for (let i = 0; i < 10; i++) assert.equal((await call(base, path, { ip, method: 'POST' })).status, 200);
    const r = await call(base, path, { ip, method: 'POST' });assert.equal(r.status, 429);assert.match(r.headers.get('ratelimit-policy'), /w=900/);
  }
  report.checks.push('Provider20/account, security10/account, credential10/IP/min and registration/recovery10/IP/15min pass; no actual provider invocation');
});
test('database/session verification failure fails closed with generic503 and Retry-After; health/assets remain available', async () => {
  const base = await app({ query: async () => { throw new Error('private-database-connection-detail'); } });
  const r = await call(base);assert.equal(r.status, 503);assert.equal(r.headers.get('retry-after'), '5');assert.equal(JSON.parse(r.body).code, 'RATE_LIMIT_UNAVAILABLE');assert.ok(!r.body.includes('private-database'));
  assert.equal((await call(base, '/healthz')).status, 200);assert.equal((await call(base, '/api/catalogue-photos/test.jpg')).status, 200);
  report.checks.push('Shared-store failure503/backoff without leaked details; health and immutable assets are outside API quotas');
});
test('expiry cleanup is bounded, leaves business counters intact and uses its concurrent partial index', async () => {
  await pool.query("INSERT INTO community.throttle(scope,started_at) SELECT 'business-test-'||g,now()-interval '2 hours' FROM generate_series(1,50000) g");
  await pool.query("INSERT INTO community.throttle(scope,started_at) SELECT 'api-rate:v1:expiry:test-'||g,now()-interval '2 hours' FROM generate_series(1,1100) g");
  await pool.query('ANALYZE community.throttle');
  const plan = await pool.query("EXPLAIN SELECT scope FROM community.throttle WHERE scope LIKE 'api-rate:v1:%' AND started_at < now()-interval '1 hour' ORDER BY started_at LIMIT 1000");
  assert.ok(plan.rows.some(x => x['QUERY PLAN'].includes('community_api_rate_expiry')));
  const store = new PostgresRateLimitStore(pool, 'expiry', logger);await store.cleanupExpired();
  assert.equal(Number((await pool.query("SELECT count(*) FROM community.throttle WHERE scope LIKE 'api-rate:v1:expiry:%'")).rows[0].count), 100);
  assert.equal(Number((await pool.query("SELECT count(*) FROM community.throttle WHERE scope LIKE 'business-test-%'")).rows[0].count), 50000);
  await store.cleanupExpired();assert.equal(Number((await pool.query("SELECT count(*) FROM community.throttle WHERE scope LIKE 'api-rate:v1:expiry:%'")).rows[0].count), 0);
  assert.ok(Number((await pool.query("SELECT count(*) FROM community.throttle WHERE scope LIKE 'api-rate:v1:traffic:%'")).rows[0].count) >= 1000);
  report.checks.push('Concurrent index idempotent/valid; synthetic50,000business counters retained; expiry deletes at most1000rows/pass and keeps active quotas');
});
