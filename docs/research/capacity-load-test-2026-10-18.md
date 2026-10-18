# QuinTaste capacity load test — 18 October 2026

Question: before buying a bigger Hostinger VPS (Game Panel 8: 8 vCPU, 32 GB RAM, 400 GB NVMe), what is QuinTaste's real capacity ceiling, and would the bigger box carry 100,000 users plus the planned game?

Production was not touched. All load ran against a local Docker replica on this PC.

## Answer

| Setup | Comfortable (p95 ≤ 250 ms, no errors) | Ceiling (p95 < 1 s, errors < 1%) | Breaks at |
|---|---|---|---|
| **Today's production limits**: app 0.75 CPU / 768 MB, DB 0.5 CPU / 512 MB | 250 users (55 req/s) | about 400 users (80–90 req/s) | 500 users (p95 8.6 s) |
| One app process with a full core, DB 2 cores | 950 users (192 req/s) | 950–1,000 users (about 200 req/s) | 1,200 users |
| **8-vCPU shape**: 4 app replicas × 1 core, DB 2 cores (6 cores) | 1,500–2,000 users (300–400 req/s) | about 2,500 users (505 req/s) | 3,000 users (43% errors) |

"Users" means people with the app open at the same moment, doing the mix described below. RAM was never the limit: each app replica used about 225 MB, and the database used under 100 MB at this data size. CPU is what you are buying.

**Estimate for the 8 vCPU / 32 GB VPS**
- **As the code stands:** about 1,400–1,900 concurrent users comfortably, with a ceiling around 1,750–2,300. That assumes QuinTaste gets about 7 of the 8 vCPUs and that a Hostinger vCPU does 60–80% of the work of one of this laptop's cores.
- **After the three fixes below:** they cut per-request work roughly in half, so about 3,000–4,000 concurrent users.
- **Sharing:** the box carries this only if QuinTaste does not share it with the six other projects.

**100,000 users**
- Assumption: peak concurrency is usually 1–3% of registered users for a consumer app. That puts 100,000 users at about 1,000–3,000 people with the app open at the busiest moment.
- **As the code stands:** the 8 vCPU box covers the low end of that range.
- **After the fixes:** it covers the whole range, with headroom.
- **Today's KVM 2 limits:** about 250–400 concurrent users, which is roughly 10,000–25,000 registered users at that ratio.

**The game:** it runs on the device and only adds a start request and a settle request per game. That is negligible next to the 0.2 requests per second each signed-in user already makes by polling.

## What one simulated user does

This is plain Node with no dependencies. Each virtual user starts with a session check, the menu index, a 20-place catalogue page and the like counts for those places. After that, every 8–25 seconds it does one of these:

| Action | Share | Requests |
|---|---|---|
| Open a place | 40% | venue summary + menu detail; signed-in users also like or unlike 25% of the time |
| Load more results | 20% | next catalogue page + like counts |
| New search | 18% | new search page + like counts |
| Cook tab | 15% | recipe like counts |
| Foreground resume | 7% | session check |

Half of the users are signed in, sharing the retained Alice and Bob QA accounts. Signed-in users poll on the app's real timers: Social unread every 30 s, Social inbox every 15 s and Market unread every 30 s. A fifth of them also sit in a chat: Market chat polled every 5 s or Social group chat every 4 s, sending a message about every 45 s.

This is conservative: every signed-in user runs all three polls at once, whereas the app only polls on the screen that is open. On average a user made about 0.2 requests per second.

Mix at 2,500 users:

| Request type | Share of requests | Notes |
|---|---|---|
| Inbox and unread polling | 32% | |
| Chat polling | 12% | each chat poll returns about 40 KB, the last 200 messages |
| Place, menu and catalogue reads | 41% | |
| Like counts | 15% | |
| Writes | 2.5% | |

## First three bottlenecks and their fixes

### 1. App CPU in one Node process, made much worse by the 0.75-CPU cap

The app reached its CPU limit first in every run. At that point the database had spare capacity (36–47% of its cap), and no query was slow.

**The cap freezes the process.** The fractional cap is the real problem, not only the CPU itself:
- One full core served 200 req/s, but the 0.75 cap topped out at 80–90 req/s. That is less than half, for 25% less CPU.
- At 400 users the 0.75-CPU container was throttled in **52% of scheduler periods**: 45 s of frozen time in about 2.5 minutes. Over that window it averaged only 0.63 of a core.
- Each throttle freezes the whole event loop. Requests then wait more than 5 s for one of the 8 database connections, which shows up as 503s and `authentication_error` in the logs.

**Fixes, cheapest first:**
- Give each app container whole cores (`cpus: 1.0` or more), or drop the hard quota and rely on CPU shares.
- Run several replicas behind Traefik. This is already safe: rate-limit state is in PostgreSQL, and per-process caches are read-only.
- Cut CPU per request. Today every signed-in request resolves the better-auth session **twice**, once in the API limiter and once in the community guard, and `/api/auth/get-session` resolves it **three times**. Each resolution is 2 SELECTs. Resolve it once per request and reuse it, or enable better-auth `cookieCache` for a few minutes. With `cookieCache`, keep the restriction check reading from the database so bans still take effect immediately.
- Cache the `featureGate` row (`ops.control`) for a few seconds. Today it is read on every request.

### 2. PostgreSQL CPU from the number of statements, not from slow queries

In the 6-core run the database used 1.7–1.9 of its 2 cores at 2,500 users, about 3.3 ms of database CPU per request.

**The queries themselves are fast:**
- The slowest mean was 0.57 ms.
- No statement during load passed the 200 ms slow-query log.

**The cost is volume.** A signed-in read runs about 7 statements:
- 4 for the two session lookups
- 1 throttle upsert, which is a committed write on *every* API request
- 1 feature-gate read
- the route's own query

**Fixes:**
- The single session lookup from fix 1 removes 2–4 of those statements, and the gate cache removes another.
- Move the general per-minute API counter out of PostgreSQL: count in memory per replica (limit ÷ replica count) or use Valkey/Redis. Keep PostgreSQL for sign-in and sensitive-account limits.
- Give the database at least 2 cores on the new box.
- Pool size 8 per replica is fine up to about 10 replicas with PostgreSQL's default of 100 connections.

### 3. Polling volume, especially chat

Signed-in users who are idle on a screen produce 44% of all requests, and every one of those requests pays the full session-and-limiter cost. A chat poll returns the last 200 messages (about 40 KB) every 4–5 seconds even when nothing changed. A Market conversation poll also holds 3 database connections at once.

**Fixes:**
- One combined badge endpoint for Social and Market unread counts, polled every 30–60 s.
- The inbox should refresh on focus, on pull-to-refresh, or when the badge changes, not every 15 s.
- Chat should ask for messages after the last one it has and get an empty 204 when there are none, and back off to 10–15 s while the chat is quiet.
- WebSockets or SSE (for example via PostgreSQL LISTEN/NOTIFY) can come later. They need a pub/sub layer once there are several replicas.

## Other findings

- **Memory: no leak in the production server.**
  - In the 15-minute soak (200 users on the production limits, about 37,000 requests) heap moved in a 94–128 MB sawtooth with no trend, about 0.1 MB a minute, which is within noise.
  - RSS stayed flat at about 263 MB, and p95 stayed at 47 ms with zero errors.
  - The 4 GB heap retention noted in AGENTS.md was in the Expo **development** server during an HTTP sweep, not the production server. Production keeps the preview container capped at 1.8 GB.
- **Small unbounded memo.** `src/server/menu-delivery.ts` keeps an entry for every menu id it is asked for, including ids that do not exist. 30,000 unknown ids added about 3 MB (about 100 bytes each). That is low severity, but anyone could slowly grow it. Do not memoise misses, or use a bounded LRU.
- **Synchronous file check on hot paths.** `editorialContent()` calls `fs.statSync` on `.local/editorial/active.json` on every catalogue and menu request. That is cheap on the VPS's local disk.
  - In this replica the folder was first a Windows bind mount, and that check blocked the event loop. It cut single-core throughput by about a third (135 vs 200 req/s), so those runs were repeated on Docker-native volumes. The table above uses only the native runs.
  - A 1–5 s cache would remove the check entirely.
- **Rare connection resets (about 0.01%).** These are the usual keep-alive race: Node's default keep-alive is 5 s, shorter than a proxy's idle timeout. Set `server.keepAliveTimeout` above Traefik's backend idle timeout (check the configured value) to avoid occasional 502s in production.
- **Images and a CDN were not measured.** The 140 catalogue photos average about 139 KB and are served by Node with year-long immutable caching. A free Cloudflare proxy in front of `/api/catalogue-photos` and the static web export would take that bandwidth off the VPS. Uncached requests that did reach Node were cheap: the 404 path ran at about 300 req/s on 0.75 CPU.

## Method and limits

**Replica**
- **App image:** built from `.local/releases/20261018-cooked1.tgz`, the same code as live `20261018-ci19-8a3f196`, with the production container limits: read-only, tmpfs, cap-drop, pids 160.
- **Database:** a throwaway clone of `quintaste-dev-db`, `postgres:17-bookworm` with the same roles, grants and ownership, plus `pg_stat_statements`.
- The load generator ran in its own 4-CPU container on the same Docker network. It used at most 61% of one core.
- No Traefik/TLS, admin or avatar worker. Each simulated user sent its own `X-Forwarded-For` address, which is what Traefik provides in production.

**Test-copy-only changes (owner approved "raise limit in test copy")**
- Per-account read/write limits and Social/Market/reaction action caps were lifted.
- API limiter rows were also keyed by the simulated client address, so the two QA accounts behave like many members instead of two hot rows.
- Every limiter still runs its database upsert, so its cost is included. Repository source is unchanged.

**Hardware:** Intel Core Ultra 5 225H (14 cores: 4 performance, 8 efficient, 2 low-power), 16 GB RAM, Docker Desktop (WSL2) with 14 CPUs and 8 GB. Docker cannot pin work to performance or efficient cores, so per-core speed varies between runs.

**Not covered**
- **Data volume:** the database is tiny (two accounts, a few chat threads). Like counts and group views scan more rows as data grows, so re-check these queries once production has real volume.
- **Real devices:** phone networks and devices were not tested.
- **The VPS:** speed on the Hostinger VPS is estimated, not measured. Measuring it would need a run on that box, which is shared with six other projects, so it was not done.

## Raw results

Everything is in the gitignored `.local/load-test/` of worktree `.claude/worktrees/friendly-archimedes-cd1054`:
- Tool: `load.mjs`, `monitor.mjs`, `analyze.mjs`, `stack.sh`, `run.sh`, `leak-probe.mjs`, `heap-probe.cjs`.
- Each run folder under `results/` holds `summary.json`, `stages.json`, `timeline.csv`, `monitor.jsonl` (CPU, memory, connections, heap every 5 s) and `pg-top-queries.tsv`.

| Run folder | What it is |
|---|---|
| `A2-prod-native` | Production limits, native storage (used in the table) |
| `T-throttle-075` | CPU throttle counters at 0.75 CPU |
| `B2-1x1cpu-native`, `B3-1x1cpu-native` | One process with a full core |
| `C2-4x1cpu-db2-native` | 4 replicas, DB on 2 cores |
| `S-soak-prod-200` | 15-minute soak |
| `L-menu-memo` | Menu memo probe |
| `P-profile` and `state-prof/*.cpuprofile` | CPU profile |
| `A-prod-ramp`, `B-1x1cpu`, `C-4x1cpu-db2` | First round on the Windows bind mount, kept for comparison; superseded |
