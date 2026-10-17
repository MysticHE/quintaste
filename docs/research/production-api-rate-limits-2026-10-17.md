# Production API quota correction — 17 October 2026

**Deployed and verified: `20261017-account-native35`**, following server release `20261017-account-limits34`. Each package started from the actual preceding live archive. Existing Community, Social, Market, Location, Cook, navigation and catalogue changes are preserved.

The old middleware allowed **120 API requests per minute per public IP**. Users behind the same office or carrier network shared it. It counted requests, not food items. Owned catalogue images were already excluded. BetterAuth also imposed a separate 30/IP/session-path limit; session actions now use verified account quotas while credential and OAuth protections remain enabled.

| Action | Signed-in account | Guest |
| --- | --- | --- |
| Catalogue, menus and other reads | 300/min/account | 600/min/IP |
| Ordinary writes | 60/min/account | 30/min/IP |
| Explicit location/provider routes | 20/min/account | 10/min/IP |
| Account deletion/session revocation | 10/min/account | 10/min/IP |
| Username sign-in | 10/min/IP, plus existing authentication rules | Same |
| Registration/recovery/recovery-code actions | 10 per 15 minutes/IP, separately per action | Same |

Only server-verified signed sessions select an account bucket. Claimed user IDs, forged cookies and changing IPs cannot reset it. Account, guest and sensitive-action counters use atomic PostgreSQL updates and survive restarts or additional app instances. Stored keys use HMACs rather than plaintext account IDs/IPs. A separate **12,000/min/IP per-process flood guard** protects admission before database/session work. Guests still share their IP quota. Provider budgets are unchanged.

Native catalogue, menu index/detail, place-summary and location requests now carry the current SecureStore-backed session using the existing session-header helper. Web retains same-origin browser credentials. Cookies are resolved for each request, never cached as a principal or attached to owned image requests. Cancellation is checked before and after the cookie read. Existing pagination, conditional validation, account isolation, cache bounds, deduplication and offline limits remain.

The existing `community.throttle` table and runtime grants are reused. After backup, release 34 applied `server/api-rate-limits.sql` outside a transaction to create one concurrent partial index. Cleanup removes at most 1,000 expired API rows per pass and excludes Social/Market counters. Store failures return generic 503 with `Retry-After: 5`. Rejections return 429, `Retry-After` and standard quota headers; only the first rejection per window logs its policy, without identities, URLs or IPs. Health and immutable cover assets remain outside API quotas. No new service or dependency was added.

Eight PostgreSQL integration groups pass, covering atomic concurrency, 1,000 synthetic account identities on one IP, multiple app instances/restarts, separate reads/writes, forged identities, IPv6 guests, sensitive/provider actions, failure handling and indexed cleanup that preserves 50,000 synthetic business counters. Actual BetterAuth sessions pass 160 requests from two accounts on one IP, immediate sign-out/revocation and invalid-cookie checks. Tests compile the actual iOS/Android transport and exercise signed sessions, changing cookies, guests, web and cancellation during cookie reads. No production accounts or provider calls were created for these tests. **These checks verify quota isolation, not capacity for 1,000 concurrent production users.**

TypeScript, lint, server syntax, a clean export of all 16 API functions and module consistency pass. The default isolated Windows lint flagged three existing auth import casing issues through the dependency junction. Workspace Expo lint passed; isolated lint passed with only filesystem casing checks disabled, retaining import resolution and all other rules.

All **175 live menu details / 12,087 source food occurrences**, 174 browse entries, 173 photo records, 120 source-backed hours records and 140 asset hashes match reviewed data. The preceding release's bulk validation encountered one 502 during planned container replacement; the complete final-release run passed with zero 429 responses. Local/live browser checks cover light/dark, 320/768/1440 widths, Save/Saved/Map, menus/back, image failures, postal search, cache reuse and the Greenland exception. Exact web bytes and both Android/iOS signed-request manifests/bundles pass with the existing scope key and new transport markers. Physical-device appearance remains unverified.

The first 20 summaries total **23,997 bytes / 20.1 ms** in one live sample. Ten requests over a reused HTTPS connection had a **20.60 ms median**; neither measurement establishes concurrent-user capacity. Catalogue JSON is 217,100 bytes. Covers total **140 JPEGs / 19,477,212 bytes**, largest 299,725. All menu-detail payloads combined are 2,578,469 bytes, largest 108,562; the app only loads a branch when opened. Image caching remains bounded to 12 entries/8 MiB; catalogue pages to eight/40 KB each, and menu details to five/1.2 MB combined. Menus/assets are packaged on the VPS; PostgreSQL stores operational quotas/accounts without a new menu import.

After native compilation, app memory was **149.5 MiB/768 MiB** and preview memory **449.8 MiB/1.758 GiB**, single snapshots. VPS disk is **82% used, 18 GB free**. Plan old-release housekeeping while preserving backups and rollback artifacts; none were deleted here.

Backup, zero active avatar jobs and exact live-base guards passed. Only app/preview were recreated; admin/database containers and community controls were preserved. The additive index is the sole schema change. Client rollback: `deployment-backups/20261017-account-native35`. Full limiter rollback: `deployment-backups/20261017-account-limits34`; the index may safely remain. The 934-file allowlisted archive excludes credentials, raw research, reports and QA captures. SHA256: `97269a8676225349e1803a990db15b9a3ecea1b3d66bf45bee0da285df2e14e0`. Full evidence: `.local/account-native-limits-2026-10-17/release.json`.

Greenland's dated hours exception is deployed; [source audit](catalogue-enrichment-2026-10-17af.md). Remaining gaps are **1 cover, 54 hours and 3 coordinate conflicts**, with nine SHU poster schedules explicitly leaving weekdays unconfirmed. Broader research retains 109 zero-food branches, 1,828 unnamed candidate IDs and 2,527 food holds. Full source coverage remains incomplete. Google ledger **2,419/2,500, 81 left**, live counters **100/8/19/545**, and all 44 private backup files remain unchanged. No new Google calls, generations or licence claims.
