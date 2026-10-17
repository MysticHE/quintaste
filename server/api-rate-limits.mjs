import { createHmac } from 'node:crypto';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { normalizeUsername } from './account-policy.mjs';

export const apiRatePolicies = Object.freeze({
  accountRead: 300, accountWrite: 60, accountProvider: 20,
  guestRead: 600, guestWrite: 30, guestProvider: 10,
  accountSecurity: 10, guestSecurity: 10,
  networkFlood: 12000, signIn: 10, signInAccount: 20, sensitiveAccount: 10,
});
const context = Symbol('verified rate-limit principal');
const authCookie = /(?:^|;\s*)(?:__Secure-)?quintaste\.session_token=/;
const providerPaths = new Set(['/api/live-places', '/api/place-search', '/api/place-details', '/api/place-photo', '/api/location-search']);
const securityPaths = new Set(['/api/auth/delete-user', '/api/auth/revoke-session', '/api/auth/revoke-sessions', '/api/auth/revoke-other-sessions']);

export function apiRequestKind(req) {
  let path;
  try { path = decodeURIComponent(new URL(req.originalUrl, 'http://localhost').pathname).replace(/\/{2,}/g, '/').replace(/\/+$/, '').toLowerCase(); }
  catch { return 'write'; }
  if (providerPaths.has(path)) return 'provider';
  if (securityPaths.has(path)) return 'security';
  // Catalogue POST is a read containing private search coordinates, not a mutation.
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || (req.method === 'POST' && path === '/api/catalogue')) return 'read';
  return 'write';
}

/** Shared fixed windows use the database clock and one atomic upsert. No account/IP plaintext is stored. */
export class PostgresRateLimitStore {
  localKeys = false;
  constructor(pool, prefix, logger) {
    if (!/^[a-z0-9:-]{1,80}$/.test(prefix)) throw new Error('Invalid limiter namespace');
    this.pool = pool; this.prefix = 'api-rate:v1:' + prefix + ':'; this.logger = logger;
    this.windowMs = 60000; this.nextCleanup = 0;
  }
  init(options) {
    if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1000 || options.windowMs > 900000) throw new Error('Invalid limiter window');
    this.windowMs = options.windowMs;
  }
  async increment(key) {
    const result = await this.pool.query(`INSERT INTO community.throttle(scope, started_at, count) VALUES($1, statement_timestamp(), 1)
      ON CONFLICT(scope) DO UPDATE SET
        count = CASE WHEN community.throttle.started_at <= statement_timestamp() - make_interval(secs => $2)
          THEN 1 ELSE LEAST(community.throttle.count, 1000000000) + 1 END,
        started_at = CASE WHEN community.throttle.started_at <= statement_timestamp() - make_interval(secs => $2)
          THEN statement_timestamp() ELSE community.throttle.started_at END
      RETURNING count, started_at`, [this.prefix + key, this.windowMs / 1000]);
    const row = result.rows[0];
    if (Date.now() >= this.nextCleanup) {
      this.nextCleanup = Date.now() + 60000;
      void this.cleanupExpired().catch(() => this.logger?.warn({ event: 'api_limit_cleanup_deferred' }));
    }
    return { totalHits: row.count, resetTime: new Date(new Date(row.started_at).getTime() + this.windowMs) };
  }
  async decrement(key) { await this.pool.query('UPDATE community.throttle SET count=GREATEST(0,count-1) WHERE scope=$1', [this.prefix + key]); }
  async resetKey(key) { await this.pool.query('DELETE FROM community.throttle WHERE scope=$1', [this.prefix + key]); }
  async cleanupExpired() {
    // Never touch existing Social/Market action counters. One hour exceeds every supported window.
    await this.pool.query(`DELETE FROM community.throttle WHERE scope IN (
      SELECT scope FROM community.throttle WHERE scope LIKE 'api-rate:v1:%'
        AND started_at < statement_timestamp() - interval '1 hour'
      ORDER BY started_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`);
  }
}

export function createApiRateLimits({ pool, secret, resolveSession, logger }) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof resolveSession !== 'function') throw new Error('Limiter identity configuration required');
  const hash = value => createHmac('sha256', secret).update('api-rate-v1\0' + value).digest('hex');
  const ip = req => ipKeyGenerator(req.ip);
  const store = prefix => new PostgresRateLimitStore(pool, prefix, logger);
  const unavailable = (res) => res.set('Retry-After', '5').status(503).json({ error: 'Service is temporarily unavailable. Try again shortly.', code: 'RATE_LIMIT_UNAVAILABLE' });
  const guard = limiter => (req, res, next) => limiter(req, res, error => {
    if (!error) return next();
    logger?.error({ event: 'api_limit_unavailable' });
    if (!res.headersSent) return unavailable(res);
    next(error);
  });
  const rejected = (req, res, _next, options) => {
    const quota = req[options.requestPropertyName];
    // Record the first rejection per window without logging identities, URLs or every flood request.
    if (quota?.used === quota?.limit + 1) logger?.warn({ event: 'api_limit_reached',
      policy: typeof options.identifier === 'function' ? options.identifier(req, res) : options.identifier });
    return res.status(429).json({ error: 'Too many requests. Try again shortly.', code: 'RATE_LIMITED',
      retryAfterSeconds: Math.max(1, Number(res.getHeader('Retry-After')) || Math.ceil(options.windowMs / 1000)),
    });
  };
  /** @type {any} Shared express-rate-limit options; each limiter below adds its own window, limit and store. */
  const base = { standardHeaders: 'draft-8', legacyHeaders: false, handler: rejected };
  async function principal(req) {
    if (req[context]) return req[context];
    let session = null;
    if (typeof req.headers.cookie === 'string' && authCookie.test(req.headers.cookie)) session = await resolveSession(req);
    const userId = typeof session?.user?.id === 'string' && session.user.id.length > 0 && session.user.id.length <= 128 ? session.user.id : null;
    const kind = apiRequestKind(req), actor = userId ? 'account' : 'guest';
    const limit = apiRatePolicies[actor + kind[0].toUpperCase() + kind.slice(1)];
    // Only verified server session results choose an account bucket. Client IDs/headers are ignored.
    req[context] = Object.freeze({ key: hash(actor + '\0' + (userId ?? ip(req)) + '\0' + kind), actor, kind, limit });
    return req[context];
  }
  const general = guard(rateLimit({ ...base, windowMs: 60000, store: store('traffic'), requestPropertyName: 'apiQuota',
    keyGenerator: async req => (await principal(req)).key,
    limit: async req => (await principal(req)).limit,
    identifier: req => { const p = req[context]; return p.actor + '-' + p.kind; },
  }));
  const strictIp = (prefix, windowMs, limit) => guard(rateLimit({ ...base, windowMs, limit, store: store(prefix),
    requestPropertyName: prefix.replaceAll('-', '') + 'Quota', identifier: prefix,
    keyGenerator: req => hash(prefix + '\0' + ip(req)),
  }));
  return {
    // Cheap per-process admission guard before session/database work; not the authoritative account quota.
    // A shared network has a deliberately much higher flood ceiling than an individual account budget.
    network: rateLimit({ ...base, windowMs: 60000, limit: apiRatePolicies.networkFlood,
      requestPropertyName: 'networkQuota', identifier: 'network-flood' }),
    general,
    signIn: strictIp('credential-sign-in', 60000, apiRatePolicies.signIn),
    // Per-username bucket (needs the parsed body): caps guessing against one account from many addresses.
    // The 15-minute window also bounds how long failed attempts by someone else can hold a member out.
    signInAccount: guard(rateLimit({ ...base, windowMs: 900000, limit: apiRatePolicies.signInAccount, store: store('credential-sign-in-account'),
      requestPropertyName: 'signInAccountQuota', identifier: 'credential-sign-in-account',
      skip: req => !normalizeUsername(req.body?.username),
      keyGenerator: req => hash('credential-sign-in-account\0' + normalizeUsername(req.body.username).slice(0, 64)),
    })),
    sensitiveAccount: action => {
      if (!['register', 'recover', 'recovery-codes'].includes(action)) throw new Error('Unknown sensitive action');
      const limiter = strictIp('account-' + action, 900000, apiRatePolicies.sensitiveAccount);
      return (req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : limiter(req, res, next);
    },
  };
}
