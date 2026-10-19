<!-- ci-deployment-20261017 -->
## Continuous deployment (since 17 October 2026)

Source lives in the private GitHub repo `MysticHE/quintaste` (push as the `MysticHE` gh account). **Every push to `main`** runs `.github/workflows/deploy.yml`: `npm ci`, TypeScript, lint, server type check, production web export (`EXPO_NO_DOTENV=1`, accounts on, production API URL, `--clear`), `scripts/package-release.py`, then sends the archive over SSH. Pushes that only touch `docs/`, Markdown, `.impeccable/` or `.claude/` do not deploy. Use **Run workflow** to redeploy manually.

The `production` environment holds `VPS_DEPLOY_KEY` (dedicated ed25519 key, comment `quintaste-ci-deploy`) and `VPS_KNOWN_HOSTS`. On the VPS that key is limited by `restrict,command="/docker/quintaste/bin/ci-deploy.sh"`: it cannot open a shell or run anything else. To revoke, delete that line from `/root/.ssh/authorized_keys` (backup `authorized_keys.pre-ci`).

`/docker/quintaste/bin/ci-deploy.sh` (source `deploy/ci-deploy.sh`) verifies the archive digest, takes a lock, and **stops without changes** when database schema files (`server/**/*.sql`, `admin/db/*.sql`) or Compose files differ from the live release. Those still follow sections 4 and 5 manually: apply after backup, then deploy. Otherwise it builds app and preview (and admin only when `admin/` changed), runs the backup, waits for avatar jobs, saves `deployment-backups/<release>`, promotes, checks `/healthz`, `/api/menus` and the web entry bundle, and **rolls back automatically** if any check fails. Finally `/docker/quintaste/bin/prune-releases.sh --apply 3` keeps the three newest releases plus anything running or needed for rollback, so disk use stays flat. Then `docker builder prune -f --filter until=48h` drops Docker build cache older than two days (log `releases/<release>-cache.log`); on 19 Oct 2026 a one-off prune freed 18.5 GB. Release ids look like `YYYYMMDD-ci<run>-<sha7>`. Logs: `releases/<release>-{app,preview,prune}.log` and the Actions run.

**Expo Go preview warm-up (19 Oct 2026).** Why the preview needs it, what happened on 19 Oct, health/readiness rules and CPU sizing are in [PLATFORM_REQUIREMENTS.md](PLATFORM_REQUIREMENTS.md) section 2; this runbook keeps only the steps. After the live checks, `ci-deploy.sh` runs `/docker/quintaste/bin/preview-prewarm.sh` (source `deploy/preview-prewarm.sh`): Android then iOS manifest through the public preview URL, then each `launchAsset.url` (300 s timeout each), logging only HTTP status, time and size. If a bundle is not 200 the deploy still succeeds, with a WARNING line and an Actions `Preview not warm` annotation; it never rolls back production for a cold preview. `deploy/preview-gateway.mjs` keeps `/status` healthy while Metro builds and sends only Expo Go traffic to Metro. After a manual release that restarts preview, run `/docker/quintaste/bin/preview-prewarm.sh` yourself. Both bin scripts are installed by hand (`install -m 700`), not from the release archive; the previous deploy script is `bin/ci-deploy.sh.pre-prewarm-20261019T040605Z`. First warmed CI deploy: `20261019-ci33-f3f27b4` (Android 77 s, iOS 62 s, container healthy throughout).

Manual releases with the steps below remain valid for schema or Compose changes; after one, push to `main` again so CI continues from the new live release. Do not run a manual promotion while a workflow run is deploying (the script holds `/docker/quintaste/.ci-deploy.lock`).

First automated release: **20261017-ci3-1539d85** (app/preview; admin stays open-market2), live and verified 17 Oct: health 200, protected routes 401, unsigned editorial publish 401, Android/iOS manifests and bundles 200 with the existing scopeKey, zero app error lines, three releases retained, disk 69%. Two early runs were stopped safely: run 1 by the schema gate (CRLF vs LF in identical SQL; gates now ignore line endings), run 2 auto-rolled back because the strict umask left extracted folders unreadable to the `node` user (extraction now uses umask 022). Lesson: never change file modes in the build context; the app and preview images run as `node`.
<!-- end-ci-deployment-20261017 -->

<!-- current-20261019-ci41-admin -->
CI **20261019-ci41-ea16cbc** (19 Oct, commit ea16cbc; app/preview rebuilt from the same app code, **admin rebuilt**). Staff console: Google-only sign-in (passkey step and the five-minute re-verification removed at the owner's request), automatic sign-in with the last staff email as `login_hint`, 7-day sessions with a one-day idle limit, per-browser sign-in throttle, Apple-style redesign with icons and no descriptive copy, paged staff lists, audit fixes; the unfinished veg-options Kitchen field stays hidden (see `docs/ADMIN_PLATFORM.md`). No schema change: `staff.credential`/`staff.challenge` are simply unused. Live: admin and app `/healthz` 200, `/` 307 to `/auth/login`, which 302s to Google (account chooser until the first sign-in stores the hint), `/?signedout` and `/?error=stuck` render, `/api/auth/session` and `/api/manage/overview` 401 signed out, untrusted logout 403, old `/verify` 404. Not exercised live: a real staff Google sign-in. Rollback: redeploy the previous admin image `quintaste-admin:20261019-ci40-5693d96` (or `game1`).
<!-- end-current-20261019-ci41-admin -->

<!-- current-20261019-full1 -->
Current app/preview **20261019-full1** (manual, from main at ff1a412, because it changes `server/game/schema.sql`, `server/lotus/schema.sql` and `deploy/compose.yml`), then CI redeployed the same code as **20261019-ci39-ff1a412** (gates passed because the live schema and Compose matched; preview warm, no prune error) (admin stays game1). Contents: the Rush Hour playfield rebuild (budgeted layout, food fitted inside each pan, sauces poured and powders sprinkled from a container that leaves, guests drawn after a mode change, one-tap plate and restart, banners, landscape pause; `docs/game/RUSH_HOUR_DESIGN.md`); Lotus L2 (credit re-blooms, breed entitlements, two-form breeding; `docs/LOTUS_L2.md`, store billing not built); the owner-approved preview sizing (preview 1.5 CPU with 2 Metro workers, db 0.5 -> 0.75 CPU, applied live with `docker update` and in `compose.yml` so the db was not restarted). Pre-checks: 1 game profile, 2 ledger rows, 0 balance/ledger mismatches, 0 active avatar jobs, DB 11 MB. Backup succeeded, then `game` and `lotus` schemas applied in that order, each in one transaction: triggers `game_ledger_apply`, `game_profile_credits`, `lotus_bloom_rebloom`, `lotus_breed_ledger_apply`; tables `lotus.breed`, `breed_balance`, `breed_ledger`, `job`; the app role cannot write `lotus.breed_balance`. `avatars` stays on, so breeding is live for signed-in members (3 attempts per account per UTC day, 600 earned credits per breed, one paid-provider breed is six calls). Live: app/preview healthy, `/healthz` and `/api/menus` 200, `/api/game/status` 200, `/api/lotus` and `/api/game` 401 for guests, `/game-dom/rush-hour.html` 200, web entry bundle byte-identical to the local export (3,864,247 bytes), live bundles contain the breeding UI and the new playfield, app log clean, Android bundle prewarm 45 s (was 77-187 s at 0.75 CPU). Not exercised live: a signed-in re-bloom or breed, any real provider call (cost unmeasured), physical devices. The manual script is `.local/releases/20261019-full1-manual.sh` (mirrors `ci-deploy.sh`: backup, schemas, snapshot, promote, rollback on failure). Rollback `deployment-backups/20261019-full1` (restores the previous images and Compose; leave the schemas, older images ignore them and the credit trigger is compatible).

VPS space (19 Oct 2026): the CI prune keeps the 3 newest releases plus running and rollback images; the admin container keeps the `game1` tag alive for app and preview as well. A manual `prune-releases.sh --apply 2`, `docker builder prune -f --filter until=2h` and removal of the unused `quintaste-app`/`quintaste-preview:20261019-game1` images by exact name took disk from 78% (22 GB free) to 70% (30 GB free) (build cache was 14.8 GB, all from that day, so the 48-hour filter freed nothing). The post-deploy prune of ci38 reported an error with an empty log; dry and real manual runs succeeded afterwards. To keep less in CI, change `--apply 3` in `deploy/ci-deploy.sh` and reinstall it with `install -m 700`.
<!-- end-current-20261019-full1 -->

<!-- current-20261019-game1 -->
Current app/preview/admin **20261019-game1** (manual, from branch `claude/game-integration` at 593382b, because it adds `server/lotus/schema.sql` and `server/game/schema.sql` and changes `deploy/compose.yml`); main then pushed as 8a3e2c3 (adds the 12 pt gutter commit 3a94c4a); CI redeployed it as app/preview **20261019-ci32-8a3e2c3** (admin stays game1), live checks passed, zero app error lines. Contents: Rush Hour phone fixes (react-native-webview DOM host, static Phaser import because the phone DOM export cannot package split chunks, safe areas, DPR canvas), full-bleed café/lobby and sheet polish; Lotus Avatar L0 (Lian default, free first bloom with server odds/pity, `/api/lotus`); Rush Hour Phase B (account progress, server replay of every run, credit ledger, `games` kill switch now unlocked in admin); Rush Hour polish (sound/haptics, Play your way, bridges, Today's special, now replayed and settled on the server with `special_day`/`special_top`/`hints`); Mochi splash. Backup 20261019T033742Z succeeded, zero active avatar jobs, both schemas applied with the owner role; grants verified (app cannot update the ledger or blooms or delete runs). `ops.control` games went false v1 -> true v2 by the schema, with staff.audit row 21. Compose adds the `quintaste-game-finish` router (256 KB body, 5/s average) for `POST /api/game/runs/:id/finish`; everything else keeps 16 KB. The app image runs Node 22.23 and loads the game sim with type stripping; client and server rules version 15mlnus. Local before release: TypeScript (app, server), lint, validator (20 levels x 2 modes + 1,356 specials with replay), API 26/26 + special 10/10 + lotus tier 6/6, Lotus 48/48, game e2e 41/41, Android export with one 2.1 MB DOM bundle. Live: app/admin healthz 200, `/api/game/status` enabled, game/lotus guest 401, untrusted origin 403, a 100 KB finish passes the proxy (401) and 100 KB elsewhere 413, web entry bundle byte-identical to the local export, Android manifest 200 with the existing scopeKey and a bundle containing the new code, zero app error lines. The concurrent CI run for 3a94c4a was correctly refused by the schema gate. Not exercised live: a signed-in production run, bloom or purchase (no production test account), physical devices. Own native builds need a rebuild (react-native-webview, expo-audio, expo-haptics). Rollback `deployment-backups/20261019-game1` (leave the additive lotus/game schemas; set `games` off in Operations first).

CI **20261019-ci34-9987906** (19 Oct, after ci33 f3f27b4 preview prewarm): Rush Hour in Expo Go. The preview serves production bundles, and Expo DOM then looks for the game page at `file:///android_asset/www.bundle`, which only installed builds have (phone showed ERR_FILE_NOT_FOUND). CI now also runs an Android export and copies its single DOM page and script to `dist/client/game-dom/` (`rush-hour.html`, no-cache; hashed script, immutable), served by `server/index.mjs` at `/game-dom`. In Expo Go production only (`gameHost()` in `src/game/artUris.ts`), the game screen passes `dom.overrideUri` to that page and maps art and fonts to the web export's same-origin `/assets/...` files so WebGL can read them. Development and installed builds keep Expo's default. Local and live: page 200, script 200 (2.05 MB), art 200; headless render with the webview bridge shows the brief and the playfield, `dom_ready` and `onStart` reach native, zero page errors or failed requests; the preview Android bundle contains the new path. Not checked on a physical phone.

CI **20261019-ci35-321bd98**: the ci34 page loaded but stayed blank on a phone. On Android, react-native-webview (13.16) defines `ReactNativeWebView.injectedObjectJson` with evaluateJavascript only at page start (when `injectedJavaScriptBeforeContentLoaded` is set) and page finish, so Expo's inline props script ran first and threw, then `registerDOMComponent` threw "$$EXPO_DOM_HOST_OS is not defined" and nothing rendered. `scripts/host-game-page.mjs` (run by CI after the Android export) now writes `rush-hour.html` with a loader that waits up to 15 s for the props, then loads the game script, or shows "The game couldn't start". The game screen also passes `injectedJavaScriptBeforeContentLoaded` so installed builds' packaged page gets the props at page start (not verified on a device). Reproduced locally by defining injectedObjectJson only after load (blank, both errors), then local and live renders with that timing pass with zero errors; the fallback shows its message. Not checked on a physical phone.
<!-- end-current-20261019-game1 -->

<!-- current-20261018-cooked1 -->
Current app/preview **20261018-cooked1** (manual, commit 8a3f196, because `server/reactions/schema.sql` v2 changes the `community.reaction` check), then CI redeployed the same code as **20261018-ci19-8a3f196**; admin stays member-recipes2. Adds "Cooked by N" on recipes: `POST /api/reactions/recipe/:id/cooked`, once per member per recipe, reported by `CookedSync` from the device cooked log. Backup succeeded (zero active avatar jobs); v1 `reaction_action_check` replaced by `reaction_action_kind` (cooked only for recipes); the one existing production share row kept. Local: TypeScript (app, server), lint, 31/31 API and browser checks with the retained accounts (test rows removed). Live: app/admin healthz 200, counts include `cooks`, guest cooked 401, untrusted 403, menus 200, web entry bundle identical to the local export, Android manifest/bundle 200 with the existing scopeKey and "Cooked by", zero app error lines. Rollback `deployment-backups/20261018-cooked1` (leave the table; the older image ignores cooked rows).
<!-- end-current-20261018-cooked1 -->

<!-- current-20261018-reactions1 -->
Current app/preview **20261018-reactions1** (manual, commits 1365aef..ee7df3e, because it adds `server/reactions/schema.sql`), then CI redeployed the same code as **20261018-ci18-ee7df3e**; admin stays member-recipes2. Adds likes and shares on Explore places and Cook recipes (`/api/reactions/:kind`, ungated), the shared photo post card with like/save/share stacked on the right, Cook's Saved tab, and the Notifications permission fix. Backup succeeded (zero active avatar jobs); additive `community.reaction` applied with the operations role; grants verified (app select/insert/delete, no update; admin select; 0 rows). Local: TypeScript (app, server), lint, 24/24 API and browser checks with the retained Alice/Bob accounts (test rows removed). Live: app/admin healthz 200, reactions counts 200 for guests, guest like 401, untrusted origin 403, menus 200, web entry bundle identical to the local export, Android manifest/bundle 200 with the existing scopeKey and the new code, zero app error lines. Not yet exercised live: a signed-in like/share on production, physical devices (Notifications fix included). Rollback `deployment-backups/20261018-reactions1` (leave the additive table).
<!-- end-current-20261018-reactions1 -->

<!-- current-20261018-member-recipes2 -->
Current app/preview/admin **20261018-member-recipes2** (commits 8983125, b37df6e; manual release because it adds `server/recipes/schema.sql`). Members submit Cook recipes for staff review and may link ingredients to their own Market items; buyers see a price label that opens the item (`docs/MEMBER_RECIPES.md`). Backup succeeded, zero active avatar jobs, additive schema applied with the operations role, grants verified (app read/write; admin read, publish columns and photo moves). The new `recipes` control was inserted **disabled**: `/api/recipes` answers 503 until staff enable it in Operations; withdrawals (DELETE) stay available. Local: TypeScript (app, server, admin), lint, 31/31 API end-to-end checks against the dev database with the retained accounts, browser checks of the label/listing/Back and editor linking. Live: app/admin health 200, menus/editorial/market 200, `/api/recipes` 503 paused, member routes 401, admin member-recipes 401 signed out, web bundle and Android manifest/bundle 200 with the existing scopeKey and the new code, zero app/admin error lines. CI run for 8983125 failed its server type check (fixed in b37df6e) before reaching the VPS. CI then redeployed b37df6e as app/preview **20261018-ci8-b37df6e** (admin stays member-recipes2); verified healthy with zero app error lines. Not yet exercised live: a signed-in submission, staff publishing with a real staff login, physical devices. Rollback `deployment-backups/20261018-member-recipes2` (leave the additive recipes tables; keep `recipes` off).
<!-- end-current-20261018-member-recipes2 -->

<!-- current-20261018-content-admin1 -->
Current app/preview/admin **20261018-content-admin1** (commits 5375e89, 9edea1f, 0640688; a manual release because it adds a schema and changes `admin.compose.yml`). Adds the staff **Content** console (`docs/CONTENT_ADMIN.md`): view every place, menu, recipe, event, place review, gathering and Market item; edit QuinTaste content; hide/restore anything; audited reasons. Additive `server/content/schema.sql` applied with the operations role after the backup (zero active avatar jobs; 0 earlier withdrawals to migrate); grants verified (app reads content, admin writes it, admin can hide reviews). `admin.compose.yml` adds the `/api/content` router with an 8.25 MB body limit. The app serves pre-staff content to the console on internal port 3001, only with a two-minute token the console stores as a hash in `content.access`; the public port returns 404 for `/api/staff-base`. Local: TypeScript/lint (app, server, admin), 74/74 end-to-end checks (staff API -> database -> member APIs and screens, desktop and 390 px), independent review findings fixed. Live: three healthy containers, public health/menus/catalogue/editorial/reviews 200, `/api/staff-base` 404, internal port 401 without token and 175 places/18 recipes/2 events with one, admin content 401 signed out, Android/iOS manifests and bundles 200, zero app/admin error lines. Staff console use with a real staff Google + security key login is not yet exercised live (no production staff account was created). Rollback `deployment-backups/20261018-content-admin1` (restores .env and Compose; leave the additive content schema).
<!-- end-current-20261018-content-admin1 -->

<!-- qt-full-menu-audit-20261017 -->
QT bot whole-menu fix deployed and live-tested **17 Oct, 19:29 SGT**. Zhen Xiang
still has all **68 dishes**: 66 source-backed findings accepted by Manager,
two held, none unprocessed or removed. Full-menu context no longer truncates at
50; exact dish assignments resume in chunks up to 80. Keep separate menu-audit
approval, venue/publication holds and monthly completion. Historical 22/174
counts were checklist visits, not fully verified menus; preserve those visits.
Telegram message 43 shows the unfiltered 68-dish menu and corrected counts.
98 bot checks pass, 29/2,000 model calls used, no Google calls; schedule and
budgets preserved. Bot-only deployment leaves concurrent app/preview releases
untouched. See `docs/research/qt-full-menu-audit-2026-10-17.md` (repository-root-relative).
<!-- end-qt-full-menu-audit-20261017 -->

<!-- current-20261017-area-participation1 -->
Current app/preview **20261017-area-participation1** is deployed and live verified from actual app/preview **20261017-filter-cleanup1** (archive hash matched live; admin stays open-market2). Adds area participation (QT-013-015, `docs/AREA_PARTICIPATION.md`): Home/Work "Count Me In" in Location, Social > Areas map (OneMap tiles + URA Master Plan 2025 planning areas), weekly bands 10+/20+/50+/100+, minimum 10. Also ships the 17 Oct audit fixes and the server-hardening, tooling (preview Dockerfile stage now runs its own full `npm ci`; eslint in devDependencies; SCHEDULE_EXACT_ALARM removed; splash/adaptive icon) and client UX sessions; Map/Directory/Area legacy screens removed. Additive `server/areas/schema.sql` applied with the operations role after backup (zero active avatar jobs); runtime grants verified; `ops.control` areas=true with a staff.audit `control.changed` row. Local: TypeScript, lint, expo-doctor 21/21, area API 13/13, snapshot banding 7/7, place reviews 35/35. Live: health 200, areas 401 guest / 403 untrusted / 503 while gated, protected routes 401, menus/catalogue/editorial/photos 200, unsigned editorial publish 401, exact web entry bytes, Android/iOS manifests and bundles 200 with the existing scopeKey, first weekly snapshot published (0 participants), zero app error lines. No production accounts or content created; signed-in production flows and physical devices unverified. Rollback `deployment-backups/20261017-area-participation1` (leave the additive area tables; set `areas` off first). Remote scripts must be uploaded and run as files: `docker exec -i` inside a `bash -s` stdin script swallows the rest of the script. Evidence `.local/area-participation/release.json`.
<!-- end-current-20261017-area-participation1 -->

<!-- current-20261017-filter-cleanup1 -->
Current app/preview **20261017-filter-cleanup1** is deployed and verified from actual app **20261017-qt-publication4** (preview was browse-controls2). Preserve the publisher4 backend, Events defaults/categories, menu footer and earlier privacy/Market/cooking fixes. The owner removes Category shortcuts and filter descriptions, adds Cook Vegetarian/Vegan multi-selection with migration, moves Market Saved-only into Filters, removes duplicate egg filtering and removes dead Explore cuisine/price choices with legacy neutralization. Thirteen source files changed; all 16 API bundles preserved byte-for-byte. Clear export, TypeScript, uncached lint (501 files, zero errors/warnings), 10 diet/migration checks, 21 local and 21 live UI checks, 13 production edge/health/access/catalogue checks, exact web bytes and both native manifest/current-bundle transports pass. UI APIs are intercepted; no production accounts/content are created. Backup, exact-base and zero-job gates passed; app/preview/admin/db healthy, admin/db were not recreated; no app error lines in audit. No DB migration, provider calls, profile changes or feature-control changes. Rollback **deployment-backups/20261017-filter-cleanup1** restores image references and recreates app/preview while retaining schema/data/edge configuration. Existing test accounts retained. Physical-device appearance remains unverified. Evidence `.local/filter-cleanup/release.json`; contract [filter cleanup](FILTER_CLEANUP.md).
<!-- end-current-20261017-filter-cleanup1 -->

<!-- qt-publication-recovery-20261017 -->
Current app **20261017-qt-publication4**; preview remains **20261017-browse-controls2**.
The seven blocked venue patches published at **19:02 SGT on 17 October**; all
seven live Telegram screenshots delivered with exact-item Revert controls.
These are source/evidence updates: the hours and SGD7.80 price already existed.
Preserve per-record concurrency checks, retained-reference qualifications,
owner revert/removal suppression, durable per-item reporting and unchanged UI.
See `docs/research/qt-publication-recovery-2026-10-17.md` (repository-root-relative).
Older seven-pending/fresh-review statements below are historical and superseded.
<!-- end-qt-publication-recovery-20261017 -->

<!-- current-20261017-browse-controls2 -->
Current app/preview **20261017-browse-controls2** is deployed and verified from **20261017-event-discovery2**, preserving the current Events default/categories, editorial management and all review-hardening1 privacy/Market/cooking protections. Twelve UI source files changed; all 16 Expo API bundles preserved byte-for-byte. Clean TypeScript, uncached ESLint (501 files, zero errors/warnings), clear web export, 24 local and 24 live UI browser checks, 13 production edge/health/access/catalogue checks, exact web bytes and both Android/iOS manifest/current-bundle transports pass. Browser APIs are intercepted; no real accounts/content are created by UI QA. Native scope key retained; physical-device UI remains unverified. Backup/base-image/zero-job gates passed; app/preview/admin/db healthy, admin/db were not recreated and audit found no app error lines. No database migration, provider calls or feature-control changes. Rollback snapshot **deployment-backups/20261017-browse-controls2** restores the .env image references and recreates app/preview, retaining all existing schemas/data and edge settings. Browse-controls1 was built but never deployed: a live-base guard prevented overwriting the concurrent Events release; release 2 rebased onto it. Evidence `.local/browse-controls/release.json`; UI contract [browse controls](BROWSE_CONTROLS.md). Existing local test accounts remain available and documented. Older image-version statements below are historical.
<!-- end-current-20261017-browse-controls2 -->

<!-- qt-live-controls-events-20261017 -->
## Current event discovery and Telegram controls, 17 October 2026

App/preview **20261017-event-discovery2** is live, based on review-hardening1.
Events defaults to Local events with visible categories. Only two client files
changed; all 16 API bundles and Social/Market fixes remain. Preserve concurrent
BrowseHeader work in the workspace; it was not included in this isolated release.
Telegram uses a supervised fast owner-command listener plus scheduled reporting.
Owner preference: live changed-item screenshots with Delete controls, one
text-only end-of-run summary, no periodic status/digest spam. Manual commands,
delete confirmations and budget alerts remain. The owner's real tap removed
the soup recipe; all three bot recipes are now suppressed, two events remain.
See `docs/research/qt-live-controls-events-2026-10-17.md` (repository root relative).
<!-- end-qt-live-controls-events-20261017 -->

<!-- current-20261017-review-hardening1 -->
Current app/preview **20261017-review-hardening1** is deployed and verified from the actual live app **20261017-qt-management2** (preview was menu-reviews3). All eight review findings are fixed: never-accepted Social history and accepted-only current plan fields; narrowly scoped 6 MB Market photo uploads; checkout/moderation serialization and seller account restriction; ordinary-meat validation with qualified mock alternatives; slot capacity before LIMIT; recoverable cooking completion. The newer editorial backend and prior UI/review features are preserved. Ten source files changed; all 16 Expo API bundles preserved byte-for-byte. Seventeen baseline API and two baseline browser probes reproduce defects; 45 updated API/database checks, ten local and ten live cooking browser checks, 13 live edge/health/access/catalogue checks, TypeScript, uncached lint (545 files, zero errors/warnings), clean export, exact live web bytes and Android/iOS preview manifest/current-bundle transport pass. Staff auth/audit seams are stubbed only in the local concurrency harness; actual moderation transactions and PostgreSQL waits are tested. Backup/current-base/zero-job gates passed; additive accepted_at migration applied. App/preview healthy; admin/database containers retained; no app error lines in the audit interval. Rollback snapshot **deployment-backups/20261017-review-hardening1** restores .env and all three Compose files, retaining additive membership data. Reuse retained local Alice/Bob accounts; fixtures removed and sign-ins refreshed. No production dummy records or paid provider calls. Physical-device UI/load acceptance remains unverified. See [review fixes](PRODUCTION_REVIEW_FIXES.md); evidence .local/production-review-fixes/release.json. Older image-version statements below are historical.
<!-- end-current-20261017-review-hardening1 -->

<!-- qt-night-management-20261017 -->
## QT nightly workflow and owner deletion ? 17 October 2026

App **20261017-qt-management2** is live, based on **20261017-menu-reviews3**;
preview remains menu-reviews3. Only the editorial router/store changed; preserve
owner-removal suppression and the concurrent place/menu review/photo features.
Hermes now resumes checkpoints **1?5 am SGT daily**, stops new research at 4:15,
and uses **2,000 shared agent invocations/month** with Telegram alerts at **1,600**
and at the limit. `/manage` provides paired-owner, two-step recipe/event deletion.
No real content was deleted for verification. Google ledger, source holds and
production revision are unchanged. First full overnight window is still pending
(18 October, 1 am). See [deployment and acceptance](docs/research/qt-night-management-2026-10-17.md)
(repository-root-relative path). Older coordinator/release statements below are historical.
<!-- end-qt-night-management-20261017 -->

Current app/preview **20261017-menu-reviews3**, deployed and live verified from `20261017-place-reviews1`. Compact menu pages, 20-dish paging, category multi-select, gallery metadata icons/real QuinTaste ratings, stronger photo blur and Nunito Bold titles, matching place count and compact GPS recovery dialog are live. Discovery diet/cuisine/price allow multiple selections; radius/location stay exclusive. Up to three optional review photos publish atomically with owner-only edits, metadata stripping and guarded reads. Separately labelled Google Maps reviews link; no persistent Google review dataset was found in local/VPS storage. All 16 API bundles were rebuilt in one clean export and module consistency checked. TypeScript, uncached lint (545 files, zero warnings), 35 review API checks, 23 photo checks, 13 filter checks, 12 browser confirmation checks and nine real live checks pass; exact web bytes and Android/iOS signed preview manifests/current bundles pass with the original scopeKey. Backup/current-base/zero-job gates passed. Additive `community.place_review_photo` and ten dedicated upload edge labels applied; ordinary 16 KB edge limit preserved. Only app/preview containers changed; admin/database containers retained. Rollback `deployment-backups/20261017-menu-reviews3` restores images and Compose, leaving review/photo tables and data. Local Alice/Bob accounts retained and refreshed, generated fixtures removed. No synthetic production reviews or paid provider calls. Physical-device camera/permissions/appearance remain unverified. See `docs/MENU_GALLERY_REVIEWS.md`; evidence `.local/menu-review-refine/release.json`.

Current app/preview **20261017-place-reviews1**, deployed and live verified from `20261017-explore-card-refine1`. Catalogue detail now has one branch heading, a compact photo/address/hours group, labelled Directions/Menu/Save, header Share and collapsed Private note/Sources & credits/Suggest an update. Account-backed place reviews support one rating per canonical branch/account, optional text, edit/delete/report, sorting and bounded pages; two community reviews initially plus the member's own review once. Twelve source files changed; all 16 Expo API bundles preserved byte-for-byte. TypeScript, uncached lint, clean export, 36 local API checks, 14 local browser checks, eight real live checks, exact web bytes and both Android/iOS preview manifests/bundles pass. No synthetic production reviews. Backup/current-base/zero-active-job gates passed; additive `server/place-reviews/schema.sql` applied before app/preview promotion. Admin and database containers retained; database schema is updated. Rollback `deployment-backups/20261017-place-reviews1` restores prior images and leaves the additive review table/data. Evidence `.local/place-detail-reviews/release.json`. Existing local QA accounts retained for reuse; see `docs/LOCAL_TEST_ACCOUNTS.md`. Physical-device appearance remains unverified.

Current app/preview **20261017-explore-card-refine1**, deployed and live verified from `20261017-market-tab-color1`. Catalogue cards lose the 48-point black footer; a 24-point photo blur/dark-overlay feather finishes at the measured name midpoint, with the upper photograph clear. Near Work/Home/radius now uses an inset context label. Three source files changed; all 16 API bundles preserved byte-for-byte. TypeScript, uncached lint, clean export, local/live browser checks at 320/375/768/1440, dark and enlarged text, Save/detail/back/source-link checks, exact web bytes and both native preview bundles pass. Existing storage scope preserved; backup/current-base/zero-active-job gates passed. Only app/preview updated; admin/database unchanged. Rollback `deployment-backups/20261017-explore-card-refine1`. Evidence `.local/explore-card-refine/release.json`. Physical-device appearance remains unverified.

Current app/preview **20261017-market-tab-color1**, deployed and live verified from `20261017-qt-publisher2`. Removes the Market-only persistent accent: every inactive tab uses mutedForeground; only the selected tab uses the accent, filled icon and selected lens. One source file changed (`TabDock.tsx`); all 16 API bundles preserved byte-for-byte. TypeScript, uncached lint, clean web export, 420 SVG paint transitions, local and live browser checks across all three palettes/light-dark (48 repeated Market departures each), exact web bytes and Android/iOS signed-manifest/current-bundle checks pass with the existing scopeKey. Backup/current-base/zero-active-job gates passed; only app/preview updated, admin/database unchanged. Rollback `deployment-backups/20261017-market-tab-color1`. Evidence `.local/market-tab-color/release.json`. Physical-device appearance remains unverified.

<!-- current-20261017-open-market2 -->
Current app/preview/admin **20261017-open-market2**, healthy and live verified, built on live `20261017-open-market1` with only five files overlaid (another session's in-progress editorial work in the shared tree was excluded): seller declarations v3 (modelled on Shopee's terms and prohibited-items policy and Carousell's listing rules; shops on older declarations return to draft), staff safety notices now reach buyers of recent disputed/no-show orders, and the console keeps panels on screen while reloading. Schema re-applied after the backup (0 sellers). Open selling unchanged: any member opens a shop without review; controls market=true, market_sellers=true, social=true. Local API 109/109, browser 25/25 + 10/10, end-to-end 23/23 (UI + local staff console with dummy accounts, cleaned up). Live: app/admin healthz 200, listings 200, seller/open 401 signed out, untrusted PUT 403, exact web entry bytes, Android/iOS bundles 200 with the existing scopeKey, zero app error lines. Rollback: restore `deployment-backups/20261017-open-market2` (open-market1 images; schema compatible). Evidence `.local/20261017-open-market2/release.json`. Open-market1 rollback notes (v3 schema dropped verification columns) still apply for anything older.
<!-- end-current-20261017-open-market2 -->

<!-- current-20261017-reviewed-diet37 -->
Current app/preview **20261017-reviewed-diet37** is deployed and live verified from actual live coordinate release 36. Two qualified pilot claims and the generated diet label are corrected; three official premise coordinates from 36 remain. All 175 details / 174 summaries / 173 covers / 120 hours / 140 assets pass. Missing fields: 1 cover / 54 hours / 3,387 unavailable prices; zero missing points, with postal qualifications retained. TypeScript, isolated lint, a clean export of all 16 APIs, browser/cache/postal/diet/Save and exact web/native transport pass. Backup, zero-job and exact-base gates passed; only app/preview were recreated, with no database migration or admin/control changes. Rollback: `deployment-backups/20261017-reviewed-diet37`. [Current source and verification report](research/catalogue-enrichment-2026-10-17ag.md). No new Google calls; physical-device/capacity acceptance and full source coverage remain open. Evidence: `.local/reviewed-diet-2026-10-17/release.json`.
<!-- end-current-20261017-reviewed-diet37 -->

<!-- current-20261017-account-native35 -->
Current app/preview **20261017-account-native35** is deployed and live verified, based on `20261017-account-limits34`. Account/guest/action quotas use existing PostgreSQL `community.throttle`; native owned requests now carry current sessions. Release 34 applied `server/api-rate-limits.sql` concurrently after backup; index validity and runtime grants pass. All 174 summaries, 175 details, 173 covers, 120 hours records, 140 assets and Greenland's exception are verified. Remaining holds: 1 cover/54 hours/3 coordinates. Backup, zero-job and exact-base gates passed; admin/database containers and community controls are preserved. [Rate limits, rollback, tests and performance](research/production-api-rate-limits-2026-10-17.md). No paid Google calls or ledger changes. Physical-device/capacity acceptance remains open. Evidence: `.local/account-native-limits-2026-10-17/release.json`.
<!-- end-current-20261017-account-native35 -->

<!-- current-20261017-merchant-hours33 -->
Current app/preview **20261017-merchant-hours33**, healthy/live verified, based on`20261017-community1`.173covers/120hours/174browse;1cover/54hours/3coordinate gaps.9SHUweekday qualifications retained.13distinct branch hours and2new dishes added; unchanged original foods/holds/IDs. Community server routers and unrelatedsource preserved; all16API clean-export consistency passes. All175live details, assets/browser/cache/postal/exactweb/native pass; physical device unverified. Initial combinedQA hit120/min/IP; paced175-detail retest has zero429. Production account-aware limiter fix is authorized next. Backup/zerojobs/exactbase guard passed; rollback`deployment-backups/20261017-merchant-hours33`. Admin/db unchanged. [Report](research/catalogue-enrichment-2026-10-17ae.md).
<!-- end-current-20261017-merchant-hours33 -->

<!-- current-20261017-community1 -->
Current app/preview **20261017-community1**, healthy and live verified, built on live `20261017-merchant-data32` with only the account-backed Social and Market overlaid. New Express routers `/api/community` (blocks, reports), `/api/market` and `/api/social` behind `featureGate`; schemas `server/{community,market,social}/schema.sql` applied with the operations role after the backup (additive, idempotent). Controls: **social=true** (audited in `staff.audit`), **market=false** until the owner confirms the SFA position. Sample people/listings and simulate controls removed; plan reminders stay on the device. 931 files; all 16 Expo API bundles restored byte-for-byte, API routes identical. Local multi-account API validation 64/64 and browser QA 24/24. Live: healthz 200, Social/community 401 for guests, Market 503 SERVICE_PAUSED, untrusted-origin POST 403, menus 200, exact web entry bytes, Android/iOS bundles 200 with the existing scopeKey, runtime-role grants verified, new tables empty. Rollback: set `ops.control` social=false, then restore `deployment-backups/20261017-community1`; leave the schemas. Physical device unverified. Evidence `.local/20261017-community1/release.json`. Later releases must start from community1 or the actual newer live archive, and must keep `server/community`, `server/market` and `server/social`.
<!-- end-current-20261017-community1 -->

<!-- current-20261017-merchant-data32 -->
Current app/preview **20261017-merchant-data32**, healthy/liveverified, based on`20261017-suxiang-cover31`.173covers/107hours/174browse;1cover/67hours/3coordinates remain.11hours/1cover/1unknownpricedishadded; sourceage/exceptionnotes retained. Unrelatedsource preserved; all16APIsinglecleanexport. TypeScript/lint/API/assets/browser/cache/postal/exactweb/native transport pass; physicaldeviceunverified. Backup/zerojobs/exactbaseguard passed; rollback`deployment-backups/20261017-merchant-data32`. Admin/dbunchanged; noprovidercalls. Startlaterreleasesfromactuallivearchive. [Report](research/catalogue-enrichment-2026-10-17ad.md).
<!-- end-current-20261017-merchant-data32 -->

<!-- current-20261017-suxiang-cover31 -->
Current app/preview **20261017-suxiang-cover31**, healthy and live verified, based on `20261017-market1`. OneSuXiangcover added:172covers/96hours/174browse locations;2cover/78hours/3coordinate gaps remain. Market/Location/Social/Cook/navigation source byte-preserved; all16APIfromonecleanexport. TypeScript/lint, API/assets/card/fallback/cache/postal and exactweb/Android/iOS transport pass; physical-device UI unverified. Backup/zero-active-job/exact-base guard passed; rollback `deployment-backups/20261017-suxiang-cover31`. Admin/database unchanged. No paidGoogleMaps/Places calls. Later releases must start from this or the actual newer live archive. [Report](research/catalogue-enrichment-2026-10-17ac.md).
<!-- end-current-20261017-suxiang-cover31 -->

<!-- current-20261017-market1 -->
Current app/preview **20261017-market1**, healthy and live verified, built on live `20261017-reviewed-hours30` with only the Market benchmark redesign overlaid (plus shared Chat, SegmentedTabs and DateField components used by Social and Market). 909 files; all 16 API bundles restored byte-for-byte, API routes identical. Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-market1`; admin/db unchanged. healthz 200, protected routes 401, menus 200, exact web entry bytes, Android/iOS bundles 200 with markers and the existing scopeKey. Physical device unverified. Evidence `.local/market1/release.json`. Later releases must start from market1.
<!-- end-current-20261017-market1 -->
<!-- current-20261017-reviewed-hours30 -->
Current app/preview **20261017-reviewed-hours30**, healthy and live verified, based on `20261017-location2`. Two hours records added;171 covers/96 schedules,3cover/78hours/3coordinate gaps remain. Original Sin and New Green Pasture Monday unconfirmed; Sufood15October source date retained. All16APIclean-export/module checks, TypeScript/lint, API/card/cache/postal and exact web/native transport pass; physical-device UI unverified. Location/Social/Cook/navigation source and all covers/menus preserved. Backup/zero-active-job/base guard passed; rollback `deployment-backups/20261017-reviewed-hours30`. Admin/database unchanged; no provider calls. [Report](research/catalogue-enrichment-2026-10-17aa.md).
<!-- end-current-20261017-reviewed-hours30 -->

<!-- current-20261017-location2 -->
Current app/preview **20261017-location2**, healthy and live verified, built on live `20261017-source-assets29` with only the Location redesign overlaid (Private Places renamed Location, fixed-kind place editor at `/location-place`, Explore follows the default location, Area Participation hidden outside development). 902 files; all 16 API bundles restored byte-for-byte, API routes identical, one new page route. Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-location2`; admin/db unchanged. healthz 200, protected routes 401, menus 200, exact web entry bytes, Android/iOS bundles 200 with markers and the existing scopeKey. `20261017-location1` (product-assets28b base) was built but its promotion was aborted by the base guard. Physical device unverified. Evidence `.local/location2/release.json`. Later releases must start from location2.
<!-- end-current-20261017-location2 -->
<!-- current-20261017-source-assets29 -->
Current app/preview **20261017-source-assets29**, healthy and live verified, based on `20261017-product-assets28b`. 171 covers/94 schedules; 3/80 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-source-assets29`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17z.md).
<!-- end-current-20261017-source-assets29 -->

<!-- current-20261017-product-assets28b -->
Current app/preview **20261017-product-assets28b**, healthy and live verified, based on `20261017-social-redesign2`. 167 covers/94 schedules; 7/80 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-product-assets28b`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17yb.md).
<!-- end-current-20261017-product-assets28b -->

<!-- current-20261017-social-redesign2 -->
Current app/preview **20261017-social-redesign2**, healthy and live verified, built on live `20261017-product-assets27` with only the clean Social redesign overlaid (plus plan reminders, calendar export, keyboard-only focus rings and DOB-based Social eligibility; adds expo-file-system/expo-sharing). 890 files; all 16 API bundles restored byte-for-byte and routes.json identical. Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-social-redesign2`; admin/db unchanged. healthz 200, protected routes 401, menus 200, exact web entry bytes, Android/iOS bundles 200 with markers and the existing scopeKey. `20261017-social-redesign1` (xinghua26 base) was uploaded but never built or promoted. Physical device unverified. Evidence `.local/social-redesign2/release.json`. Later releases must start from social-redesign2.
<!-- end-current-20261017-social-redesign2 -->
<!-- current-20261017-product-assets27 -->
Current app/preview **20261017-product-assets27**, healthy and live verified, based on `20261017-xinghua26`. 162 covers/94 schedules; 12/80 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-product-assets27`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17x.md).
<!-- end-current-20261017-product-assets27 -->

<!-- current-20261017-xinghua26 -->
Current app/preview **20261017-xinghua26**, healthy and live verified, based on `20261017-evidence25`. 157 covers/94 schedules; 17/80 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-xinghua26`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17w.md).
<!-- end-current-20261017-xinghua26 -->

<!-- current-20261017-evidence25 -->
Current app/preview **20261017-evidence25**, healthy and live verified, based on `20261017-verified-gaps24`. 156 covers/94 schedules; 18/80 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-evidence25`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17v.md).
<!-- end-current-20261017-evidence25 -->

<!-- current-20261017-verified-gaps24 -->
Current app/preview **20261017-verified-gaps24**, healthy and live verified, based on `20261017-source-covers23`. 154 covers/91 schedules; 20/83 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-verified-gaps24`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17u.md).
<!-- end-current-20261017-verified-gaps24 -->

<!-- current-20261017-source-covers23 -->
Current app/preview **20261017-source-covers23**, healthy and live verified, based on `20261017-product-covers22`. 151 covers/90 schedules; 23/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-source-covers23`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17t.md).
<!-- end-current-20261017-source-covers23 -->

<!-- current-20261017-product-covers22 -->
Current app/preview **20261017-product-covers22**, healthy and live verified, based on `20261017-operator-covers21b`. 147 covers/90 schedules; 27/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-product-covers22`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17s.md).
<!-- end-current-20261017-product-covers22 -->

<!-- current-20261017-operator-covers21b -->
Current app/preview **20261017-operator-covers21b**, healthy and live verified, based on `20261017-merchant-covers20`. 140 covers/90 schedules; 34/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-operator-covers21b`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17r.md).
<!-- end-current-20261017-operator-covers21b -->

<!-- current-20261017-merchant-covers20 -->
Current app/preview **20261017-merchant-covers20**, healthy and live verified, based on `20261017-merchant-covers19`. 136 covers/90 schedules; 38/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-merchant-covers20`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17q.md).
<!-- end-current-20261017-merchant-covers20 -->

<!-- current-20261017-merchant-covers19 -->
Current app/preview **20261017-merchant-covers19**, healthy and live verified, based on `20261017-merchant-covers18`. 120 covers/90 schedules; 54/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-merchant-covers19`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17p.md).
<!-- end-current-20261017-merchant-covers19 -->

<!-- current-20261017-merchant-covers18 -->
Current app/preview **20261017-merchant-covers18**, healthy and live verified, based on `20261017-branch-covers17`. 111 covers/90 schedules; 63/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-merchant-covers18`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17o.md).
<!-- end-current-20261017-merchant-covers18 -->

<!-- current-20261017-branch-covers17 -->
Current app/preview **20261017-branch-covers17**, healthy and live verified, based on `20261017-bakery-covers16b`. 108 covers/90 schedules; 66/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-branch-covers17`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17n.md).
<!-- end-current-20261017-branch-covers17 -->

<!-- current-20261017-bakery-covers16b -->
Current app/preview **20261017-bakery-covers16b**, healthy and live verified, based on `20261017-food-covers15`. 102 covers/90 schedules; 72/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-bakery-covers16b`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17m.md).
<!-- end-current-20261017-bakery-covers16b -->

<!-- current-20261017-food-covers15 -->
Current app/preview **20261017-food-covers15**, healthy and live verified, based on `20261017-cafe-covers14`. 97 covers/90 schedules; 77/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-food-covers15`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17l.md).
<!-- end-current-20261017-food-covers15 -->

<!-- current-20261017-cafe-covers14 -->
Current app/preview **20261017-cafe-covers14**, healthy and live verified, based on `20261017-social-benchmark2`. 88 covers/90 schedules; 86/84 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-cafe-covers14`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17k.md).
<!-- end-current-20261017-cafe-covers14 -->

<!-- current-social-benchmark2-20261017 -->
Current app/preview **20261017-social-benchmark2** is deployed and healthy, built from live menu-covers13 with only the Social redesign overlaid (23 changed + 7 new files; legacy Tables screens/actions/hooks removed from the build and kept in `.local/legacy-social/`). The 818-file archive restores all 16 API bundles byte-for-byte from menu-covers13; routes.json API routes are identical and only `/social/safety` is added. Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-social-benchmark2`. Admin/db unchanged. healthz 200, protected routes 401, menus 200, exact web bytes, Android/iOS bundles with markers and scopeKey pass. social-benchmark1 (built on group-covers12) was never promoted: the base guard aborted because menu-covers13 went live first. Note: this build sets `EXPO_PUBLIC_AUTH_ENABLED=true` as this runbook requires, so live sign-in shows Google/username/create account; an earlier live build showed only the local profile preview, so check this setting in every export. Evidence `.local/social-benchmark2/release.json`. Later releases must start from social-benchmark2.
<!-- end-current-social-benchmark2-20261017 -->

<!-- current-20261017-menu-covers13 -->
Current app/preview **20261017-menu-covers13**, healthy and live verified, based on `20261017-group-covers12`. 83 covers/89 schedules; 91/85 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-menu-covers13`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17j.md).
<!-- end-current-20261017-menu-covers13 -->

<!-- current-20261017-group-covers12 -->
Current app/preview **20261017-group-covers12**, healthy and live verified, based on `20261017-operator-covers11`. 74 covers/89 schedules; 100/85 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-group-covers12`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17i.md).
<!-- end-current-20261017-group-covers12 -->

<!-- current-20261017-operator-covers11 -->
Current app/preview **20261017-operator-covers11**, healthy and live verified, based on `20261017-shu-covers10`. 68 covers/88 schedules; 106/86 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-operator-covers11`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17h.md).
<!-- end-current-20261017-operator-covers11 -->

<!-- current-20261017-shu-covers10 -->
Current app/preview **20261017-shu-covers10**, healthy and live verified, based on `20261017-branch-hours9`. 62 covers/88 schedules; 112/86 gaps remain. Source and unrelated changes preserved; allAPI/rendered-card/cache/native-transport checks pass; physical device unverified. Backup/current-base guard/zero-active-jobs passed; rollback `deployment-backups/20261017-shu-covers10`. No provider calls; admin/database unchanged. Research active. [Report](research/catalogue-enrichment-2026-10-17g.md).
<!-- end-current-20261017-shu-covers10 -->

**Owner review checkpoint, 17 October 2026:** `20261017-branch-hours9` is deployed and verified. Research has resumed at the owner’s request; the linked checklist records the preceding review checkpoint. See [the branch checklist](research/review-checkpoint-2026-10-17.md) for all reviewed fields, remaining gaps and saved pending work.

<!-- current-branch-hours9-20261017 -->
Current app/preview **20261017-branch-hours9** deployed/healthy, based on cook-cleanup2 with Cook preserved.811files;54covers/45uniqueassets/88hours/175menu IDs. AllAPI,renderedcard/location,cache reuse,204/304 and exactweb/native checks pass. Backup/zeroactivejobs/currentbaseguard passed; rollback`deployment-backups/20261017-branch-hours9`. Admin/db unchanged;noGooglecalls. Full coverage paused at user request: 120 cover / 86 hours gaps. [Report](research/catalogue-enrichment-2026-10-17f.md), evidence`.local/coverage-2026-10-17f/release.json`.
<!-- end-current-branch-hours9-20261017 -->

<!-- current-cook-cleanup2-20261017 -->
Current app/preview **20261017-cook-cleanup2** is deployed and healthy, built from live operator-covers7 (which already carried cook-benchmark1). The 805-file archive changes 7 Cook files (Saved recipe cards use the compound-ingredient fit, legacy shopping lines upgrade on read, Ingredient Guide adds scaled lines, dead quantity helpers removed) and replaces the three 2.3-2.6 MB recipe PNGs with ~110-130 KB JPEGs (originals kept locally in `.local/original-photos`). All 16 API bundles are restored byte-for-byte from operator-covers7; routes.json identical. Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-cook-cleanup2`. Admin/db unchanged. healthz 200, protected routes 401, menus 200, exact web bytes, JPEG assets 200, Android/iOS bundles with markers and scopeKey pass. Physical-device UI unverified. Evidence `.local/cook-cleanup2/release.json`. Later releases must start from cook-cleanup2.
<!-- end-current-cook-cleanup2-20261017 -->

<!-- current-operator-covers7-20261017 -->
Current app/preview **20261017-operator-covers7** is deployed and healthy, based on **cook-benchmark1** after detecting its concurrent promotion. All Cook source/assets are byte-preserved. The805-file archive adds six cover assets and two catalogue JSON changes outside the complete clean export; all16API bundles come from that export.48covers/39assets/85hours/175menu fingerprints, rendered cards/location routes, cache reuse,204/304 and exact web/native transport pass. Backup,zero active jobs and live-base guard passed; rollback `deployment-backups/20261017-operator-covers7`. Admin/db unchanged. No Google calls. Full coverage active:126cover gaps/89hours gaps. [Report](research/catalogue-enrichment-2026-10-17e.md), evidence `.local/coverage-2026-10-17e/release.json`.
<!-- end-current-operator-covers7-20261017 -->

<!-- current-cook-benchmark1-20261017 -->
Current app/preview **20261017-cook-benchmark1** is deployed and healthy, built from the live greendot-covers6 archive with only the Cook redesign overlaid (30 changed + 20 new files: 18 bundled recipes, categories/filters/sort, Gather and step tick-off, cooked log, Shopping v2, Five pungent-free/Jain presets, Non-vegan Food Choices without Animal gelatin/Rennet, review fixes, `android.permission.VIBRATE`). The 799-file archive restores all 16 API bundles byte-for-byte from greendot-covers6 (routes.json identical; raw menu research was linked for the build only). Backup ran, active avatar jobs 0, rollback `deployment-backups/20261017-cook-benchmark1`. Admin/db unchanged. healthz 200, protected routes 401, exact web bytes, Android/iOS bundles with markers and scopeKey pass. Physical-device UI/vibration unverified. Evidence `.local/cook-benchmark1/release.json`. Note: greendot-covers6 was deployed by a concurrent session minutes earlier; future catalogue releases must start from cook-benchmark1 or they will drop the Cook changes.
<!-- end-current-cook-benchmark1-20261017 -->

<!-- current-greendot-covers6-20261017 -->
Current app/preview **20261017-greendot-covers6** is deployed and healthy, based on branch-covers5. The 774-file archive adds two unique assets for 11 verified branch associations and reviewed photo/catalogue JSON; unrelated source is preserved. All 33 asset hashes, 42 cover records, 85 schedules, 175 menu fingerprints, new rendered cards, cache reuse and exact web/native transport pass. Backup, zero active jobs and guarded promotion passed; rollback `deployment-backups/20261017-greendot-covers6`. Admin/db unchanged. No Google calls. Full coverage remains active: 132 cover gaps and 89 hours gaps. [Report](research/catalogue-enrichment-2026-10-17d.md), evidence `.local/coverage-2026-10-17d/release.json`.
<!-- end-current-greendot-covers6-20261017 -->

<!-- current-branch-covers5-20261017 -->
Current app/preview **20261017-branch-covers5** is deployed and healthy, based on covers-hours4. The 772-file archive adds eight assets and reviewed photo/catalogue JSON; unrelated source is preserved. All 31 cover assets, 85 schedules, 175 menu fingerprints, new rendered cards, conditional responses and exact web/native transport passed. Backup, zero active jobs and guarded promotion passed; rollback `deployment-backups/20261017-branch-covers5`. Admin/db unchanged. No Google calls. Full coverage remains active: 143 cover gaps and 89 hours gaps. [Report](research/catalogue-enrichment-2026-10-17c.md), evidence `.local/coverage-2026-10-17c/release.json`.
<!-- end-current-branch-covers5-20261017 -->

<!-- current-covers-hours4-20261017 -->
Current release **20261017-covers-hours4** is deployed and healthy on app/preview, based on place-details3.764-file package changes three catalogue JSON files and four assets outside the complete clean export; unrelated source is byte-preserved.85 schedules/23 covers verified live, including all175 menu fingerprints,23asset hashes, new rendered cards/details,204/304, exact web and Android/iOS transport. Backup/zero-active-job/lock gates passed; rollback `deployment-backups/20261017-covers-hours4`. Admin/db unchanged. No Google calls. Physical-device UI unverified; full coverage active with89hours/151cover gaps. [Report](research/catalogue-enrichment-2026-10-17b.md); evidence `.local/coverage-2026-10-17b/release.json`.
<!-- end-current-covers-hours4-20261017 -->

<!-- current-place-details-20261017 -->
Current release **20261017-place-details3** is healthy on app and preview. The 760-file archive preserves unrelated source from covers-hours-menu2 and exports all 16 API functions together using `--clear` to prevent stale isolated-root Metro transforms. Backup, zero active avatar jobs and promotion lock passed; rollback `deployment-backups/20261017-place-details3`. Admin/database unchanged. Restored place details, 80 schedules and 19 covers pass live browser, catalogue, asset, postal, exact-web and Android/iOS transport checks. No Google usage change. Physical-device UI remains unverified. Full coverage remains active: 94 hours gaps and 155 photo gaps. [Report](research/catalogue-location-details-2026-10-17.md); evidence `.local/coverage-2026-10-17/release.json`. Candidates place-details1 and place-details2 were never promoted.
<!-- end-current-place-details-20261017 -->

<!-- production-menu-covers-hours-20261016 -->
Current release **20261016-covers-hours-menu2** is deployed and healthy on app/preview. Based on catalogue-photos1;752-file allowlisted package, all16 API functions exported together, unrelated source preserved. Backup and zero-active-avatar-job gate passed; rollback deployment-backups/20261016-covers-hours-menu2. Admin/db unchanged.72 schedules,13 owned cover assets and simple menu rows verified live; all175 fingerprints,174browse entries,204/304, postal/menu/cache/browser/axe/exact web and Android/iOS transport pass. No Google usage change. [Current source, coverage and performance report](research/production-menu-covers-hours-2026-10-16.md); evidence `.local/cover-hours/release.json`. Physical-device UI unverified. The earlier local menu1 archive was never uploaded/deployed. Historical release notes below retain their dates.
<!-- end-production-menu-covers-hours-20261016 -->

# QuinTaste deployment runbook

Authoritative procedure for future sessions. Last reconciled with the running VPS on 17 October 2026. This file, all other project documentation and QA evidence stay on the local workstation. Never upload this runbook as a remote script or build context.

Current photo release `20261016-catalogue-photos1` is deployed and healthy on app/preview, based on postal-bundles1.738-file allowlisted archive preserves unrelated navigation/profile/icon source; all16 API functions exported together and module consistency checked. Backup/rollback snapshot `deployment-backups/20261016-catalogue-photos1`; active jobs0; admin/db untouched. Browser, accessibility, postal/menu flow, exact web and Android/iOS bundle checks pass; Google usage unchanged. Owned approved image assets are under `server-assets/catalogue` and remain separate from catalogue JSON. [Source/rights/check-date, coverage and performance report](research/explore-catalogue-photos-2026-10-16.md). Evidence `.local/photo-card-recovery/release.json`. Physical-device UI acceptance remains open.

## Start here in every session

1. Read the project `AGENTS.md`, this runbook and the relevant feature document before changing the VPS.
2. Inspect the local changes; preserve unrelated or uncommitted work. A clean checkout is not assumed.
3. Read the running image names and health again. The table below is a dated snapshot, not a replacement for live inspection.
4. Select the services affected by the change. Build and recreate those services only.
5. After deployment, update this table and the local feature/QA notes. Do not claim phone behavior from a manifest download alone.

Windows tool calls must use `tty: true` and `login: false`. Never open desktop terminal windows for background work. Run multiline remote scripts through Paramiko or key-based SSH; do not interpolate Python/JavaScript through PowerShell command strings.

Each SSH/Paramiko command starts a fresh shell. Repeat `cd` and variable declarations in each remote command, or combine dependent blocks into one reviewed script.

## Target and current release

| Item | Value |
| --- | --- |
| Local project | `C:\Users\huien\qt\quintaste` |
| VPS | `root@srv1902914.hstgr.cloud` / `187.52.117.45` |
| Existing SSH key | `C:\Users\huien\.ssh\id_ed25519` |
| Remote project | `/docker/quintaste` |
| Compose project | `quintaste-staging` |
| Compose files, always together | `compose.yml`, `admin.compose.yml`, `avatar.compose.yml` |
| Web/API | `https://quintaste.srv1902914.hstgr.cloud` |
| Admin | `https://admin-quintaste.srv1902914.hstgr.cloud` |
| Android Expo Go | `exps://preview-quintaste.srv1902914.hstgr.cloud` |
| App image | `quintaste-app:20261019-ci39-ff1a412` (CI, after manual full1) |
| Preview image | `quintaste-preview:20261019-ci39-ff1a412` (CI) |
| Admin image | `quintaste-admin:20261019-game1` |
| Database | Existing `postgres:17-bookworm`, database/user `quintaste`; app role `quintaste_app` |

All four containers were healthy at the last reconciliation. Existing backup and admin-maintenance timers were active. Keep the existing VPS and shared Traefik setup; other applications run here. The user chose the existing VPS without further region verification. Do not move or reinstall it as part of a routine deployment.

**Postal lookup correction, 16 October 2026:** `20261016-postal-bundles1` is deployed on app/preview, based on profile-settings1. The earlier catalogue release mixed Metro server bundles from different exports, producing shared numeric module-ID collisions: catalogue followed by postal lookup returned HTTP500 (`instanceof` received a non-class). All16 server routes are now built together. The packager rejects conflicting module definitions; never copy individual API bundles across builds, even for unchanged source. Client-only releases may preserve the entire server bundle set together. A small useDiscoveryInput guard preserves results when selecting the same location again. Clean export, TypeScript, scoped lint, three route-load-order checks and local/live browser postal search, repeated selection, Filters/Back and rendered menu checks pass.079331 and650150 resolve;000000 returns an empty result. Live exact web bytes and Android/iOS bundles/identity pass; native appearance remains unverified. Backup completed, active jobs zero; rollback deployment-backups/20261016-postal-bundles1. Only app/preview recreated; Google usage and research ledger unchanged. Evidence: `.local/postal-fix/release.json`.

**Owned Explore/cache integration,16October2026:** `20261016-catalogue-cache1` is live on app/preview, based on icon-paint1 with all its icon/dock source intact. The731-file allowlisted archive adds20-summary catalogue paging, saved default/Home/Work selection, bounded15minute memory cache and conditional responses; menu projection now175 IDs/223 source menus/12,084 foods. One exact150Green alias leaves174 browse entries.167 coordinate IDs accepted/8 held. Backup completed, active avatar jobs0; protected rollback `deployment-backups/20261016-catalogue-cache1`. Only app/preview recreated; admin/db and secrets/usage state unchanged. Live Explore/Saved/Map/cache, exact web bytes, health200/protected401 and Android/iOS signature-request manifests/current bundles pass with existing scopeKey. Workspace TypeScript/uncached lint and isolated TypeScript/export pass; isolated lint only flags3 unchanged-auth Windows-junction casing findings. No Google/provider calls. Menus remain packaged JSON, not PostgreSQL menu tables; physical-device and native-map acceptance remain open. [Report and evidence](research/explore-catalogue-cache-2026-10-16.md), `.local/catalogue-deploy/release.json`.

**Profile/settings refinement, 16 October 2026:** `20261016-profile-settings1` is deployed to app and Expo preview, based on the verified live `20261016-catalogue-cache1` release. Compact Me header, distinct setting icons, no provider handle/private-note or case counters/settings descriptions, direct Food Choices eating-style selection, appearance-only settings and curated label capitalization. The isolated 733-file archive changes 134 client source files and byte-preserves all 16 deployed API bundles, including catalogue-cache functionality. TypeScript, uncached lint (443 files), clean web export and archive checks passed. Backup completed, active avatar jobs zero, rollback snapshot `deployment-backups/20261016-profile-settings1` retained; only app/preview recreated and healthy. Live real-account QA passed registration/return, Saved, diet persistence and failed-save Retry, profile autosave/reload, avatar navigation and four responsive/accessibility cases. Synthetic account deleted; zero paid generation calls. Live web bytes match; Android/iOS signature-request manifests and current-marker bundles returned HTTP 200 with the existing scopeKey. Physical-device appearance is unverified. Evidence: `.local/profile-cleanup/release.json`.

**Native icon paint correction, 16 October 2026 (QT-002/004; N01/N02/N09):** `20261016-icon-paint1` is deployed on app and Expo preview. Every primitive in QuinTasteIcon owns explicit fill/stroke and stroke geometry; Market keeps a stable body Path across selection. This removes the selected-to-inherited-paint transition that retained a native propList and produced black fill. Existing paths, sizes, palette colours and dock behaviour are preserved. The installed SVG extractors plus an Android-property simulation reproduce the previous Market failure and pass 420 transitions after correction. Both local and live browsers pass eight palette/mode/width cases, 64 captures, 96 repeated Market departures, exact paint and hollow-bag checks, with zero runtime errors or scoped axe findings. TypeScript, workspace Expo lint, isolated uncached lint (434 files) and clean export passed. Live web bytes match; Android/iOS manifests and bundles include the explicit-paint code and preserve the existing scopeKey. Only QuinTasteIcon changes; all 15 API bundles are byte-preserved. Backup completed, active jobs zero, app/preview healthy. No connected physical device was available; native appearance acceptance remains open. Evidence: `.local/icon-paint-fix/release.json`.

Wide controller and persistent Market accent `20261016-wide-controller1` is live on 16 October 2026. Based on leaf-controller1, only QuinTasteIcon.tsx and TabDock.tsx change. Game now has a broader, shorter controller body, a smaller rounded plus and smaller spaced diagonal buttons. The single joined leaf outline stays hollow in both states with no inner vein. Market retains the theme accent when switching away; selection is conveyed by fill versus outline and the lens. All other tab colours and the borderless dock remain. TypeScript, uncached lint and clean export passed. The allowlisted 720-file archive preserves all 15 API bundles and excludes documentation, credentials and concurrent menu changes. Backup completed, active jobs zero, only app/preview promoted and healthy. Rollback: `deployment-backups/20261016-wide-controller1`. Live Playwright passed eight cases/56 captures, 40 selected-colour checks and 40 Market transition-colour checks, matching lens colours, current glyph markers, borderWidth0, navigation/focus, zero scoped axe findings and zero page errors. Exact web bytes match; Android/iOS signature-request manifests/bundles contain the current icon with existing scopeKey. Independent substitute finish review ships browser/source scope. No physical-device appearance acceptance or paid generation. Evidence: `.local/wide-controller/release.json`.

Leaf controller and shared selection-colour correction `20261016-leaf-controller1` is live on 16 October 2026. Based on controller-face1, only QuinTasteIcon.tsx, TabDock.tsx and theme/tokens.ts change. All selected tabs and their lens borders now use the palette accent; this fixes Marketplace retaining the near-black strongAccent after the prior Game-only fix. Game follows the latest user reference: plus D-pad, two diagonal buttons, and a leaf joined to the top-right controller contour in one outer path. It supersedes the eyes/play triangle. The seamless bag and borderless dock remain. TypeScript, uncached lint and clean export passed. The allowlisted 720-file archive preserves all 15 deployed API bundles and excludes documentation, credentials and concurrent menu work. Backup completed, active avatar jobs were zero, and only app/preview were promoted with healthy services. Rollback: `deployment-backups/20261016-leaf-controller1`. Live Playwright passed eight cases and 56 captures across three palettes, light/dark and 320/375/768/1440 widths: 40 exact selected-glyph colour checks plus matching lens borders, current glyph markers, borderWidth0, navigation, keyboard focus, zero scoped axe findings and zero page errors. Live web bytes match the export; Android/iOS signature-request manifests and bundles contain the new icon with the existing scopeKey. Independent substitute finish review: ship at browser/source scope. Physical-device appearance is unverified. No paid generation. Evidence: `.local/leaf-controller/release.json`.

Seamless bag/controller release `20261016-controller-face1` is live on 16 October 2026. Based on market-play1, it changes only QuinTasteIcon.tsx and TabDock.tsx: a single continuous bag/handle contour, an authored controller with two eyes and a play cutout, and Game-only selected theme.accent instead of the near-black light-mode strongAccent. Before live coral selection was RGB100,33,22; current coral selection is RGB180,56,41, with matching theme colors across all six palette/mode combinations. Social and the borderless dock remain. TypeScript, uncached ESLint and clean export passed; bundle glyph markers are checked before packaging. All 15 API bundles retain deployed bytes; the 720-file allowlisted archive excludes documentation, credentials, reference art and raw research. Backup completed, active jobs were zero, and app/preview are healthy; admin/database were not recreated. Rollback: `deployment-backups/20261016-controller-face1`. Live Playwright passed eight cases/40 captures at 320/375/768/1440, including no separate handle path, current controller paths, exact selected Game colors, borderWidth0, navigation/focus and scoped axe checks. No page errors. Live web bytes match the export; Android/iOS manifests/bundles contain current glyph markers and preserve scopeKey. Independent substitute finish review: ship for browser/source only. No paid generation or physical-device appearance acceptance. Evidence: `.local/controller-refine/release.json`.

Market/Game refinement `20261016-market-play1` is live on 16 October 2026. Based on dock-signatures2, it changes only QuinTasteIcon.tsx: Marketplace is a shopping bag with a leaf inside, Game is a frying pan with a play cutout reflecting the Rush Hour cooking brief. Social and the borderless dock remain. TypeScript, uncached ESLint and clean production export passed, with exact new path assertions before packaging. All 15 API bundles retain deployed bytes; the 720-file allowlisted archive excludes documentation, credentials and raw research. Backup completed, active jobs were zero, and app/preview are healthy; admin/database were not recreated. Rollback: `deployment-backups/20261016-market-play1`. Live Playwright passed eight cases/40 captures covering light/dark, three palettes and 320/375/768/1440 widths; new paths, borderWidth0, touch/keyboard navigation and scoped axe checks passed with no page errors. Live web bytes match the export; Android/iOS manifests and bundles contain both new glyph markers and preserve scopeKey. Independent substitute finish review: ship for browser/source only. No paid generation or physical-device appearance acceptance. Evidence: `.local/market-game-redesign/release.json`.

Dock correction `20261016-dock-signatures2` is live on 16 October 2026. It starts from avatar-icons1 and changes only TabDock.tsx and QuinTasteIcon.tsx: no outer dock stroke, custom conversation-bowl/leaf-awning/bao-gamepad icons, preserved selected lens and themed keyboard focus. TypeScript, uncached ESLint and a clean production export passed. All 15 API function bundles retain deployed bytes; the allowlisted 720-file archive excludes documentation, credentials and raw research. Backup completed and active jobs were zero; app/preview are healthy and admin/database were not recreated. Rollback snapshot: `deployment-backups/20261016-dock-signatures2`. Live Playwright passed eight cases at 320/375/768/1440 in light/dark across three palettes, 40 captures, no runtime errors or scoped axe violations. Live web bytes match the clean export; Android/iOS signature-request manifests and bundles contain current markers and preserve scopeKey. Independent substitute visual review: ship within browser/source scope. No paid generation or physical-device acceptance. Evidence: `.local/icon-border-redesign/release.json`. The preceding dock-signatures1 web export retained stale modules and failed the live marker/browser checks; this release clears Metro's cache and checks all new glyph markers before packaging. For future isolated client exports, use `--clear` and verify changed-module markers before upload.

Avatar/icon release `20261016-avatar-icons1` was promoted on 16 October 2026. It starts from the deployed `20261016-review-fixes1` archive and changes only `AvatarLibrary.tsx`, `Avatar.tsx` and `QuinTasteIcon.tsx`; concurrent menu work is excluded. The web client is rebuilt, while all 15 API function bundles retain their exact deployed bytes. Isolated TypeScript, uncached ESLint and the production web export passed. The 720-file immutable allowlisted archive excludes documentation, credentials, raw build-only research inputs and source maps. App/preview were built sequentially and are healthy; admin/database were not recreated. Backup completed, active avatar jobs were zero, and the protected rollback snapshot is `deployment-backups/20261016-avatar-icons1`. Live browser checks cover real-account selection persistence, failed-save Retry, focus, Create/Back and all three new icons; the synthetic account was deleted and no paid generation ran. Public app/admin health returned HTTP 200 and protected anonymous routes returned 401. Live web bytes match the isolated export. Android/iOS signature-request manifests and bundles returned HTTP 200 with current UI markers (7,842,459 / 7,219,390 bytes), preserving the existing anonymous scopeKey. Local evidence is under `.local/avatar-icon-deploy/`, including `release.json`. Physical-device acceptance remains separate.

Review correction release `20261016-review-fixes1` is deployed and healthy. It closes all five findings documented in [REVIEW_FIXES.md](REVIEW_FIXES.md): subscribed-session refresh, offline guest access, cross-remount timer isolation, immediate profile display and accurate preference Retry controls. Eight browser regression cases and six delayed timer-adapter cases pass after reproducing the previous defects. TypeScript, lint, seven avatar security groups, web export and Android/iOS Hermes exports pass. Six live browser checks pass, including immediate display-name refresh after a real profile save; the synthetic account was deleted. Native bundles contain current correction markers (Android 7,842,418 bytes, iOS 7,219,349 bytes), and the signature-request manifest returns HTTP 200. Both manifests preserve the existing scopeKey; deployed web bytes match the tested export. The immutable 720-file archive excludes documentation, credentials and source maps. Backup and protected configuration snapshot `deployment-backups/20261016-review-fixes1` were taken; active avatar jobs were zero. Only app/preview were recreated; no schema migration or secret rotation was needed. Timers remain active. Evidence is local in `.local/review-fixes-qa/` and `.local/review-fixes-deploy/`. No paid generation or physical-device acceptance was performed.

Account/UX release `20261016-account-ux1` was deployed on 16 October after UI standardization. Typecheck/lint, web export and Android/iOS Hermes compilation passed, as did nine browser fixture groups, eighteen isolated production-server groups and five live browser checks. A real synthetic registration reached its original destination automatically, retained a secure 30-day cookie on reload and skipped both age-check routes; the synthetic account was deleted. The immutable 719-file allowlisted archive excludes documentation, credentials and source maps. App/preview built sequentially, backup ran, active avatar jobs were zero and a protected rollback snapshot exists at `deployment-backups/20261016-account-ux1`. The OAuth migration adds nullable `return_url` and `callback_hash` columns without replacing policy or customer data. Exact deployed web-bundle bytes match the local export. Android and iOS manifests/bundles returned HTTP 200 with current UX markers (7,835,190 and 7,212,121 bytes). No paid generation or physical-device test was performed. Evidence remains local under `.local/account-ux-qa/` and `.local/account-ux-deploy/`; see [the account walkthrough](ACCOUNT_SETUP_UX.md).

**Preserve Expo Go storage identity:** preview `/home/node/.expo` now uses the host mount `./preview-expo-state:/home/node/.expo`, not tmpfs. Deployment copied only the existing public anonymous UUID; both live manifests retained `@anonymous/quintaste-9fe760a2-e5e7-47d5-bb7f-fbe718e4ab27`. Keep this directory and UUID across releases, rebuilds and rollbacks. Do not replace it from a fresh build context or copy Expo authentication files. The directory belongs to UID 1000 (0700); state.json is 0600. If reverting a pre-account-ux Compose snapshot, retain this volume mount instead of restoring the old home-directory tmpfs. Existing database/auth secrets and avatar key/data mounts remain unchanged.

UI standardization release `20261016-ui-standard1` was deployed on 16 October after avatar-library3, retaining its compatible implementation/schema. Typecheck, lint, seven avatar security groups and an isolated production web export passed. The immutable 712-file allowlisted archive excludes documentation, credentials and source maps. App and preview were built sequentially; the existing database backup ran, active avatar jobs were zero and a protected rollback snapshot was saved at `deployment-backups/20261016-ui-standard1`. Live health/auth checks, the five supplied UI surfaces, settings persistence/failure/Retry and actual account-profile autosave/reload/Retry passed; the synthetic account was deleted. Android manifest and bundle returned HTTP 200 with current UI markers (7,790,571 bytes). No paid generation or physical-device test was performed. Local evidence: `.local/ui-standardization-deploy/`.

Read-only inspection from local PowerShell:

```powershell
ssh -i C:/Users/huien/.ssh/id_ed25519 -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 root@srv1902914.hstgr.cloud "docker ps --filter name=quintaste-staging --format '{{.Names}} {{.Image}} {{.Status}}'"
```

Use the existing known-host entry. Investigate a changed SSH host key; do not bypass verification or expose private-key contents. Never print `.env`, `runtime.env`, `admin.env`, private account files or credential-file values.

## Which services to update

| Change | Build/update |
| --- | --- |
| Client screen, shared client code, assets or public client configuration | Export web, then build `app` and `preview` |
| `server/` backend logic only | Build `app`; existing web export can be reused if its client source/configuration is unchanged |
| `admin/src` or admin dependencies | Build `admin`; its Dockerfile runs the Next.js build |
| Compose/environment changes | Recreate every service affected by the reviewed configuration |
| Database change | Backup, apply the reviewed migration, then update affected services; preserve existing data and grants |

Preview builds can consume substantial memory. Build targets sequentially on this shared VPS. Do not rebuild/restart PostgreSQL or other projects for an app release. Do not run `docker compose down`, `down -v`, broad container removal or Docker/system pruning as deployment steps.

## 1. Validate and export locally

Build every server API function in one export when server code changes. Metro bundles share numeric module IDs; copying selected functions from older exports can silently change another route's imports. `package-release.py` now validates the entire server module set and rejects collisions. Check catalogue → location search → menus in the same process, including reverse load order.


Run from the local project, using the installed lockfile/dependencies. Run `npm ci` only when dependency installation is needed. Resolve failed checks before packaging; run each command separately and inspect its exit code.

```powershell
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' }
npx expo lint
if ($LASTEXITCODE -ne 0) { throw 'Lint failed' }
```

For an admin change, also run `npx tsc --noEmit` and scoped ESLint from `admin/`. For avatar logic, run the existing `npm run test:avatar` and relevant isolated production-shaped checks. Do not create test source files unless requested.

When client code/configuration changed, create the production web export. Explicitly disable local dotenv loading so `.env.local` cannot leak into the export:

```powershell
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_AUTH_ENABLED = 'true'
$env:EXPO_PUBLIC_API_URL = 'https://quintaste.srv1902914.hstgr.cloud'
$env:CI = '1'
$env:NODE_OPTIONS = '--max-old-space-size=6144'
npx expo export --platform web --clear --max-workers 2
if ($LASTEXITCODE -ne 0) { throw 'Web export failed' }
```

Never add provider secrets to `EXPO_PUBLIC_*`. Server API routes are protected by the production Express wrapper; development `/api/local-explore` routes stay blocked on the VPS.

## 2. Package and upload the allowlisted release

Choose an unused, meaningful release ID. Reusing a release ID is forbidden; the packager deliberately rejects an existing archive/manifest.

```powershell
$release = (Get-Date -Format 'yyyyMMdd') + '-change1'
python scripts/package-release.py $release
if ($LASTEXITCODE -ne 0) { throw 'Release packaging failed' }
$manifest = Get-Content ".local/releases/$release.json" -Raw | ConvertFrom-Json
$manifest.files.Count
```

Inspect the manifest before upload. It must exclude `docs/`, PRDs/PDFs, Markdown, AGENTS/README/design/product files, QA artifacts, `.local`, source maps and credentials. The packager and `.dockerignore` enforce this boundary. Required third-party license notices remain. Exported binary fonts/images under `dist/client/assets/node_modules` are intentional; removing them caused missing fonts/icons in an earlier deployment. Dependency source is still excluded.

```powershell
scp -i C:/Users/huien/.ssh/id_ed25519 -o BatchMode=yes -o StrictHostKeyChecking=yes ".local/releases/$release.tgz" "root@srv1902914.hstgr.cloud:/docker/quintaste/releases/$release.tgz"
if ($LASTEXITCODE -ne 0) { throw 'Release upload failed' }
```

Upload only this archive, never the whole workspace. The remote release directory contains executable application/configuration inputs, not project documentation.

## 3. Extract and build remotely

The following Bash blocks run on the VPS. Set `RELEASE` to the exact local release ID. Select only the required builds from the target table.

```bash
set -euo pipefail
cd /docker/quintaste
RELEASE='REPLACE_WITH_THE_RELEASE_ID'
[[ "$RELEASE" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]]
mkdir "releases/$RELEASE"
tar -xzf "releases/$RELEASE.tgz" -C "releases/$RELEASE"

# Run only the required targets, sequentially:
docker build --target runtime -t "quintaste-app:$RELEASE" "releases/$RELEASE"
docker build --target preview -t "quintaste-preview:$RELEASE" "releases/$RELEASE"
docker build -f "releases/$RELEASE/admin/Dockerfile" -t "quintaste-admin:$RELEASE" "releases/$RELEASE"
```

For complex remote execution, use the installed Paramiko with the existing key, not password prompts. Do not copy private keys or authentication files between Codex profiles:

```python
import paramiko

ssh = paramiko.SSHClient()
ssh.load_system_host_keys()
ssh.connect('srv1902914.hstgr.cloud', username='root',
            key_filename='C:/Users/huien/.ssh/id_ed25519', timeout=15)
# Replace this read-only example with the reviewed operational block when needed.
remote_script = r'''
set -euo pipefail
cd /docker/quintaste
docker ps --filter name=quintaste-staging --format '{{.Names}} {{.Image}} {{.Status}}'
'''
stdin, stdout, stderr = ssh.exec_command('bash -s', timeout=900)
stdin.write(remote_script)
stdin.channel.shutdown_write()
output = stdout.read().decode()
errors = stderr.read().decode()
status = stdout.channel.recv_exit_status()
ssh.close()
print(output)  # Only commands that do not emit credentials belong in the block.
if status:
    raise RuntimeError(errors or f'Remote command failed: {status}')
```

## 4. Back up, check active work and apply migrations if needed

```bash
set -euo pipefail
cd /docker/quintaste
systemctl start quintaste-backup.service
docker exec quintaste-staging-db-1 psql -At -U quintaste -d quintaste -c \
  "SELECT count(*) FROM avatar.job WHERE status IN ('queued','working') AND expires_at>now()"
```

Before restarting `app`, wait for this count to reach zero. The worker deliberately fails interrupted active jobs without another paid provider attempt; queued jobs can resume. Do not reset budgets to retry uncertain work.

The existing schemas are already installed: `admin/db/schema.sql`, `server/avatar/schema.sql`, `server/avatar/library.sql`, `server/google/schema.sql`. Do not treat routine deployment as a fresh installation. Apply a migration only when the release requires it, using the operations role after backup. For example, a reviewed additive Google migration can be applied from its release directory with `docker exec -i quintaste-staging-db-1 psql -v ON_ERROR_STOP=1 -U quintaste -d quintaste < releases/$RELEASE/server/google/schema.sql`. Check the required grants and pinned owner policy before promotion.

The backup service stores database dumps and the existing place-usage state under `/docker/quintaste/backups`, with the current seven-day local retention. It does not back up provider keys, avatar encryption keys or temporary selfie payloads. Saved avatar frames now live encrypted in PostgreSQL and are included in database dumps; recovering those frames also requires the separately protected existing avatar storage key. Do not rotate or discard that key. Full off-host restore acceptance is separate work.

## 5. Snapshot configuration and promote selected images

Create a new protected rollback directory for the release. The snapshot contains operational configuration with secrets; it stays protected on the VPS and must never be printed or included in a source archive.

```bash
set -euo pipefail
cd /docker/quintaste
export RELEASE='REPLACE_WITH_THE_RELEASE_ID'
export UPDATE_SERVICES='app preview'  # Examples: app, admin, or app preview admin
python3 - <<'PY'
import os, pathlib, re, shutil, subprocess

root = pathlib.Path('/docker/quintaste')
release = os.environ['RELEASE']
assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', release)
services = os.environ['UPDATE_SERVICES'].split()
mapping = {'app': ('APP_IMAGE', 'quintaste-app'),
           'preview': ('PREVIEW_IMAGE', 'quintaste-preview'),
           'admin': ('ADMIN_IMAGE', 'quintaste-admin')}
assert services and len(set(services)) == len(services) and all(s in mapping for s in services)
for service in services:
    subprocess.run(['docker', 'image', 'inspect', mapping[service][1] + ':' + release],
                   stdout=subprocess.DEVNULL, check=True)
snapshot = root / 'deployment-backups' / release
snapshot.parent.mkdir(mode=0o700, exist_ok=True)
snapshot.mkdir(mode=0o700)  # Fail rather than overwrite an earlier rollback snapshot.
for name in ['.env', 'compose.yml', 'admin.compose.yml', 'avatar.compose.yml']:
    shutil.copy2(root / name, snapshot / name)
    (snapshot / name).chmod(0o600)
text = (root / '.env').read_text()
for service in services:
    key, repository = mapping[service]
    text, count = re.subn(r'^' + key + r'=.*$', key + '=' + repository + ':' + release,
                         text, flags=re.M)
    assert count == 1, 'Image selector missing or duplicated'
(root / '.env').write_text(text)
(root / '.env').chmod(0o600)
PY
```

Copy any reviewed Compose changes from `releases/$RELEASE/deploy/` into `/docker/quintaste` after taking the snapshot. Include every affected service in `UPDATE_SERVICES`. Preserve existing `runtime.env`, `admin.env`, secret files and persistent directories. Do not replace their contents with local development settings.

Always include all three Compose files, even for an app-only release. Omitting `avatar.compose.yml` loses avatar/Google mounts, upload routing and the exact Expo Go origin configuration.

```bash
set -euo pipefail
cd /docker/quintaste
UPDATE_SERVICES='app preview'  # Repeat the same selection used for promotion.
docker compose -f compose.yml -f admin.compose.yml -f avatar.compose.yml \
  up -d --no-deps --wait --wait-timeout 180 $UPDATE_SERVICES
docker ps --filter name=quintaste-staging --format '{{.Names}} {{.Image}} {{.Status}}'
```

For a replaced bind-mounted secret file, explicitly recreate its consumers with `--force-recreate`; a restart alone can retain an old inode. Google secret rotation affects both `app` and `admin`. Do not rotate secrets during an unrelated release.

## 6. Verify before handing over

- Confirm selected images, healthy containers, public app/admin `/healthz` HTTP 200, and anonymous account/admin management routes remain unauthorized.
- Exercise the changed journey in the deployed app, including failure/retry behavior, not just the landing page. Use synthetic accounts/data and remove them afterward. Paid model calls require the existing authorized scope and must be counted; do not burn generation quota for a UI-only check.
- If preview restarted, run `/docker/quintaste/bin/preview-prewarm.sh` (CI does this automatically) so phones do not wait for the cold build.
- If preview/client changed, warm and verify an Android manifest with `Accept: application/expo+json`, `expo-platform: android`, `expo-protocol-version: 1`, and `expo-expect-signature: sig, keyid="expo-root", alg="rsa-v1_5-sha256"`. Parse JSON or the multipart manifest, fetch `launchAsset.url`, and require HTTP 200. A cold build can take several minutes. The gateway uses production bundle flags and blocks source maps/debug paths. A valid manifest does not prove device camera, passkey, OAuth, permissions or startup behavior.
- For Google login, verify the automatic app callback with both the browser-return secret and app proof, including a pre-existing cookie. Test the confirmation form and manual Finish only for legacy-client compatibility. The browser form must send the exact web origin; never accept `Origin: null` globally. Native `exp://`/`exps://` origins must match the configured preview host; lookalike/unrelated hosts must fail. Details and local regression evidence: [GOOGLE_LOGIN.md](GOOGLE_LOGIN.md).
- Keep staff Google + passkey verification separate from customer Google login. The owner `hui.en194@gmail.com` receives master quota exemption only through its pinned verified Google subject. Security, consent and capacity protections remain enforced.
- Save QA evidence locally under `.local/`, update the release table here, and add a deployment audit event when using the existing operational audit workflow. Remove isolated fixture containers/networks/accounts; do not retain synthetic credentials on the VPS.

## Rollback

Use the protected snapshot for the specific failed release, not a guessed historical `.pre-*` file. Restore the previous `.env` and any Compose files changed by that release, then run the same three-file Compose command for only the affected services. Retain previous images until acceptance. Do not restore the database for a code-only rollback; keep additive schema, master policy and usage ledgers. Database restore requires its own reviewed recovery procedure.

```bash
set -euo pipefail
cd /docker/quintaste
export FAILED_RELEASE='REPLACE_WITH_THE_FAILED_RELEASE_ID'
UPDATE_SERVICES='app preview'  # Only services changed by this release.
python3 - <<'PY'
import os, pathlib, re, shutil
root = pathlib.Path('/docker/quintaste')
release = os.environ['FAILED_RELEASE']
assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', release)
snapshot = root / 'deployment-backups' / release
names = ['.env', 'compose.yml', 'admin.compose.yml', 'avatar.compose.yml']
assert all((snapshot / name).is_file() for name in names), 'Rollback snapshot incomplete'
for name in names:
    shutil.copy2(snapshot / name, root / name)
    (root / name).chmod(0o600)
PY
docker compose -f compose.yml -f admin.compose.yml -f avatar.compose.yml \
  up -d --no-deps --wait --wait-timeout 180 $UPDATE_SERVICES
```

Older deployed snapshots exist as `.env.pre-google`, `.env.pre-origin` and adjacent Compose backups. They are historical fallbacks, not automatic rollback targets. Use live image inspection plus the relevant local release/evidence record to establish compatibility.

## Secrets and persistent state

| Remote path | Purpose / handling |
| --- | --- |
| `.env` | Compose selectors and database configuration; protected server file |
| `runtime.env`, `admin.env` | Existing runtime/service configuration; do not print or overwrite |
| `admin-secrets/google-client-secret` | OAuth secret; single-file read-only mount in app, directory mount in admin |
| `admin-secrets/cloudflare-gateway-token` | Cloudflare Run token, not the original OpenAI key |
| `avatar-secrets/storage-key` | Server-generated encryption key; never reset during deployment |
| `postgres/`, `state/`, `avatar-data/` | Existing persistent data; preserve |
| `releases/`, `deployment-backups/`, `backups/` | Application artifacts, protected configuration snapshots and existing data backups |

The original OpenAI key exists only in Cloudflare account `5e0f948cf2161e20c0cdfe640c6cf48f`, gateway `quintaste`, provider alias `default`. Never retrieve it or put it in the VPS, chat, client or `.env.local` deployment. See [AVATAR_PRODUCTION.md](AVATAR_PRODUCTION.md), [GOOGLE_LOGIN.md](GOOGLE_LOGIN.md) and [ADMIN_PLATFORM.md](ADMIN_PLATFORM.md) for feature contracts. This runbook controls the deployment method; older release histories do not override it.


## QT automated publishing: deployed 17 October 2026

Publisher introduced in app/preview `20261017-qt-publisher2` on open-market2, then preserved by the concurrent `20261017-market-tab-color1` release (only TabDock.tsx and its export changed). The current live app/preview at final verification is market-tab-color1; admin remains open-market2 and PostgreSQL was not restarted/migrated. See [production report](research/qt-team-publication-2026-10-17.md) and `data/menu-research/qt-team-publication-2026-10-17.json`.

Routine approved content changes require no app redeployment. `/api/editorial/control/publish` accepts bounded HMAC-signed batches from the fixed Hermes adapter, with current revision/record hashes, source captures and Manager image review. Preserve the ten `quintaste-editorial` labels in `deploy/compose.yml` and the live compose file: only this exact path permits 2,000,000-byte bodies and has a separate rate limiter. The normal 16,384-byte edge limit remains unchanged. Actual checks returned 401 for an unsigned 20 KB publication, 413 over 2 MB, and 413 for a 20 KB ordinary catalogue request.

Persistent content is `/docker/quintaste/state/editorial` ? `/app/.local/editorial`. The dedicated publisher key is a separate 0600 file under `state/editorial-private`; its peer is in Hermes `qt-team/private`. Neither key belongs in a release archive, app JSON, chat, logs or content backup. The existing daily backup now invokes `/docker/quintaste/editorial-backup.py` for atomic snapshots/history/assets. An actual production backup was restored into an isolated directory and verified. The script excludes keys; disaster recovery may need deliberate paired-key reprovisioning.

Before packaging future baseline/menu changes, run `node scripts/build-editorial-baseline.cjs --check`. After an intentionally reviewed baseline change, use `--write` and inspect the result, then rebuild all API bundles together. `package-release.py` now runs this check automatically; it verifies 175 venue/menu identity records and all 18 bundled recipe identities against source. Existing live venue overlays are tied to the exact packaged baseline hash and fail closed after incompatible baseline changes; reconcile through fresh Manager review. Do not regenerate packaged baselines from live overrides.

Content recovery:

1. Pause **QT Manager daily coordination** (`1d0f99df35ff`) in Hermes Scheduled Jobs before operator rollback/reconciliation. Normal failures retain pending batches and source holds; do not reset usage or blindly rebase a stale approved batch.
2. Read `active.json` and select a known-good existing `revisions/<sha>.json`. The exported `rollback(root, expectedRevision, targetRevision)` in `server/editorial/store.mjs` runs only as an owner operation inside the app container; there is no bot-accessible rollback API. Both hashes must be explicit 64-character revisions. Its compare-and-swap and lock prevent overwriting another writer. Rollback/reapply were tested in isolated production-shaped storage.
3. If a process crash leaves `publish.lock`, verify no publishing process is active and inspect current revision/receipt before removing that exact empty lock directory. Retry the identical pending batch: lost acknowledgements recover idempotently. Never delete active snapshots or immutable assets to clear a lock.
4. For file restoration, first extract a chosen editorial backup to an isolated directory, validate its version/revision and JPEG hashes, then perform a reviewed atomic switch while publishing is paused. Reconcile the Hermes live receipt/pending state before resuming its existing job.
5. App-image rollback snapshot: `/docker/quintaste/deployment-backups/20261017-qt-publisher2`. Edge-label-only backup: `/docker/quintaste/deployment-backups/20261017-qt-publisher2-edge`. Restoring an older app image can hide published content without deleting the mounted files. Preserve subsequent unrelated Market/navigation changes when selecting a rollback target.

Do not prune the 400-revision archive or 512 MiB research-run archive automatically. Capacity guards stop new work for deliberate archiving. Current source gaps remain 1 cover, 54 hours and 3,387 prices; the 2/174 Hermes bootstrap is a new monthly review queue, not a claim that only two of the existing locations have previously researched menus.
