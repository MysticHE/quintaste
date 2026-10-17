# Historical VPS deployment notes

Archived 16 October 2026. This is a historical record, not a deployment procedure. Image tags, pending-feature statements and acceptance notes below are dated snapshots. Use [the current deployment runbook](../DEPLOYMENT_RUNBOOK.md) and [current VPS overview](../VPS_DEPLOYMENT.md) instead. Keep this archive local.

> **16 October avatar production update:** The avatar service now has a dedicated authenticated Cloudflare integration, encrypted temporary payloads and PostgreSQL jobs/budgets. Current deployment and acceptance evidence are in [AVATAR_PRODUCTION.md](../AVATAR_PRODUCTION.md). This supersedes historical statements below that avatar generation is development-only or requires an OpenAI key on the VPS. Other AI/phase gates remain unchanged.

**16 October customer Google login and master usage:** [Current Google sign-in, Expo Go handoff and pinned owner policy](../GOOGLE_LOGIN.md) supersede earlier username-only/no-Google instructions and the owner's standard avatar quota. Regular member quotas are unchanged.


# QuinTaste VPS staging

## 16 October staff console deployment

Added a separate Next.js service at https://admin-quintaste.srv1902914.hstgr.cloud/, image `quintaste-admin:20261016-admin2`, with `quintaste-app:20261016-admin1` enforcing operational restrictions. Existing Expo Go preview remains `quintaste-preview:20261016-docs1`. All three services are healthy; the admin certificate is trusted and anonymous management API calls return 401. Compose uses both `compose.yml` and `admin.compose.yml` for the admin service. The new `staff`/`ops` schemas were migrated after a database backup; a restricted admin DB role and hourly authentication-record cleanup are installed. Credentials are entered directly into protected files; the original OpenAI key remains in Cloudflare. Google client-secret and Cloudflare Run-token entry and live acceptance are pending. See [ADMIN_PLATFORM.md](../ADMIN_PLATFORM.md) for exact setup, roles, evidence, rollback and limitations. All project documents and QA evidence remain local.

Deployed on 16 October 2026 to `srv1902914.hstgr.cloud` (`187.52.117.45`). Malaysia is the user's preferred region; the subsequent explicit instruction was to proceed on the existing VPS without further location verification. No migration or reinstall was performed, and the current datacenter location is not asserted here.

## Access

- Web/API: https://quintaste.srv1902914.hstgr.cloud
- Expo Go: `exps://preview-quintaste.srv1902914.hstgr.cloud`
- Public QR image: https://quintaste.srv1902914.hstgr.cloud/expo-go.png
- Local QR image: `.local/expo-go-vps.png`.
- Private test credentials: `.local/staging-access.json`. Never commit or publish this ignored file.
- Health: `/healthz`; registration configuration: `/api/account/status`.

Browser visits to `https://preview-quintaste.srv1902914.hstgr.cloud` redirect to the Web/API address. Keep the `exps://` URL for Expo Go. The preview gateway previously served Metro's development website, where same-origin API routes returned 404 and cross-origin session requests failed; the browser redirect fixes that access path without exposing extra Metro endpoints.

Preview release `20261016-auth7` passed Node syntax, ESLint, app lint and TypeScript checks. Browser navigation reaches the hosted app without JavaScript errors; Android/iOS manifests, bundles and the four startup fonts return HTTP 200, while debug/source-map paths remain blocked. The user confirmed Android Expo Go opened successfully after reopening the exact `exps://` URL. This confirms that startup attempt, not all native features. Cold Android/iOS downloads took about 94 seconds during concurrent warm-up; the existing Google allowance still causes Explore's “Places unavailable” state.

The VPS serves the app continuously; laptop power and shared Wi-Fi are unnecessary. Expo Go must support SDK 57. A fresh preview container can take two minutes to prepare its first Android bundle. Native startup, device permissions, background alerts and iOS cannot be accepted from HTTP transport checks.

## Stack

Compose project `quintaste-staging` lives at `/docker/quintaste`:

| Service | Purpose | Memory cap |
|---|---|---|
| app | Exported Expo website/API, Express, Better Auth | 768 MiB |
| db | Dedicated PostgreSQL 17 | 512 MiB |
| preview | Expo Go Metro server and restricted gateway | 1,800 MiB |

Existing Traefik provides HTTPS. No app, database or Metro port is published on the host. The database network is internal. The app and preview run as the Node user with dropped capabilities and process limits. The app filesystem is read-only except bounded temporary storage and private state. Preview has only public configuration, no database or provider secrets, and its gateway rejects inspector, arbitrary source bundles and source maps.

The app uses `quintaste_app`, a dedicated database owner without superuser, database/role creation, replication or RLS-bypass rights. The bootstrap `quintaste` role is reserved for operations. `deploy/init-db.sh` provisions the limited role on a fresh volume. Database data and Google usage live outside images.

## Implemented and gated

Current app and preview images: `20261016-docs1`, preserving the username feature release `20261016-auth10` with registration enabled. The documentation cleanup rebuild changed no application files (verified by matching SHA-256 content digests after excluding notes); it removes source/provenance notes from active images. Required asset/dependency license notices remain. Twelve note/template files from the two release directories were retained locally and removed remotely, and three source archives were filtered. The packaging guard creates an audited 580-file local archive without project documentation or secrets. Evidence is local at `.local/documentation-deployment-audit.json`. Older image tags are historical rollback artifacts; rebuild them with the current exclusion policy before reuse. TypeScript, Expo lint, server lint and web export pass. All seven public browser journeys pass without JavaScript errors, including preserved sign-in return parameters. The final signed-manifest request and Android bundle return HTTP 200; cold compilation took about 56 seconds and was warmed before handoff. Temporary QA accounts, the isolated check container/database and its environment file were removed. A post-migration backup was taken and the daily timer remains active.

Better Auth 1.7.10 provides username/password sessions, hashed passwords, secure HttpOnly web cookies and native Expo SecureStore cookies. Usernames are case-insensitive, immutable, 3–30 characters and unique; new passwords require 15–128 characters. Name and bio persist on the server. Server signup validates date of birth, discards the date and retains only the adult result. Direct signup endpoints cannot bypass that check. This is self-declared eligibility, not Verified 18+ identity review.

The user explicitly replaced email signup with usernames and one-time recovery codes on 16 October. Registration is controlled by REGISTRATION_OPEN and no longer depends on SMTP. Signup returns eight 128-bit random recovery codes once; only SHA-256 hashes are stored. Recovery atomically consumes a code, changes the password and revokes sessions. Password-confirmed replacement invalidates all older codes. Users without a password or unused code cannot recover access. Better Auth's required internal email field uses an uncontactable random `.invalid` alias; no email is collected, sent or used for login/recovery. Email and unsupported auth endpoints are blocked. Apple, Google and passkey sign-in are not enabled. The existing synthetic account becomes username `tester` with its password and account ID preserved.

Signup, recovery and code replacement each have a separate 10-request/15-minute IP limit; login retains its IP limit plus Better Auth's persistent three-attempt/10-second throttle. Codes are returned with no-store headers and never returned by profile/export/count endpoints. Forgotten-password recovery and code replacement serialize on the account row, and account deletion cascades to code hashes. No email verification or recovery promise remains in the connected account screens.

Food collections/preferences remain local and are keyed by real account ID. Guest copying is explicit and preserves guest originals; cloud food sync is not implemented. Pre-deployment local preview data is not silently assigned to an online identity. Account export excludes credentials. Account deletion removes server profile/credentials/sessions and this device's account collection; other device caches need local deletion. Local food export remains separate.

Production moderation, Social/Market services, game rewards and AI avatars remain gated or local. Public hosting does not make those features production-ready. Google usage counters were preserved: text search was 100/100 and photos 545/600 at transfer. Published menus remain available. No quota increase/reset occurred; the production API does not use the development-only Google photo cache.

## Configuration and operations

All project documentation remains local: `docs/`, PRDs/PDFs, AGENTS/README/design/product files, source/provenance notes and QA evidence must not be uploaded with releases. `python scripts/package-release.py RELEASE_NAME` creates an allowlisted archive and a local manifest under `.local/releases/`, excluding documentation, secrets, source maps and research directories. Inspect that manifest before upload; `.dockerignore` repeats the exclusions at image-build time. Third-party license notices remain with their dependencies and assets because their distribution licenses require them. Do not copy this runbook to the VPS.

OpenAI remains disabled and unconfigured on the VPS. The correct key location is `OPENAI_API_KEY` in `/docker/quintaste/runtime.env`, never the preview container. The laptop's `.env.local` is not synchronized. The avatar pilot is development-only and its routes are blocked in this deployment; entering a key does not activate production AI. See the local [key-entry procedure and remaining AI work](../OPENAI_SETUP.md).

`runtime.env` and `.env` on the VPS are mode 0600, outside the image/source archive. `deploy/runtime.env.example` documents names without secrets. Only EXPO_PUBLIC_API_URL and EXPO_PUBLIC_AUTH_ENABLED belong in the client; provider keys must never use EXPO_PUBLIC_.

Set REGISTRATION_OPEN=true to allow username signup after migrations and validation. SMTP is not required. Do not enable the underlying email signup/reset routes: they bypass the chosen user flow. OAuth would need separate provider credentials, redirects and an installed native build.

```sh
cd /docker/quintaste
docker compose ps
docker compose logs --tail 50 app
docker compose restart preview
systemctl status quintaste-backup.timer
```

Build the web/server export locally with EXPO_NO_DOTENV=1 and the staging public variables. Run typecheck/lint. Package an explicit allowlist of source, assets, approved catalogue/menu data, export, server, deployment files and lockfile; exclude secrets, `.local`, source maps and private research. Build the runtime/preview Dockerfile targets with new immutable tags. Run `node server/migrate.mjs` using the app environment, set APP_IMAGE/PREVIEW_IMAGE, and `docker compose up -d --wait`. Preserve previous tags for rollback; rollback does not undo migrations or restore old data. Preserve Google usage across releases and avoid a separate local server consuming the same allocation independently.

SDK 57's expo-server ESM adapter currently contains extensionless imports that fail under Node. The server deliberately loads its documented CommonJS Express adapter through createRequire. EAS internal APK/production profiles are prepared in eas.json; no EAS build or store submission was started.

## Backups and acceptance

The daily backup timer runs at 03:30 UTC with up to five minutes of jitter and seven-day retention. The script uses pipefail, temporary files, gzip validation and restrictive permissions. It backs up PostgreSQL and the Google usage/allowance state. The initial database backup was restored into a temporary database and the account row verified; that temporary database was then removed. These are same-server backups; off-server storage remains a production requirement.

Username migration is additive and preserves account IDs/password hashes; a backup was taken immediately before it. Once users register without email, do not roll back to the old email-only application. A database restore can resurrect old passwords, sessions and consumed codes: keep registration/login closed during restore, revoke sessions and recovery codes, and complete the account-recovery incident procedure before reopening.

Account-scoped providers intentionally remount on identity changes to clear private view state. The root Stack must preserve both the current route and its initial parameters during that remount; preserving only the route drops sign-in return destinations. The safe-return allowlist includes profile and recovery-code settings, without accepting arbitrary external URLs.

Username verification evidence: `.local/username-recovery-checks.json` records 22 initial API/security passes before the rapid sign-in limit interrupted that run; `.local/username-recovery-finish.json` records 18 follow-up passes including explicit throttle enforcement, successful new-password login, code replacement/invalidation and deletion. The original account also signed in with its preserved password after the migration in an isolated database copy. `.local/username-browser.json` records signup, code export, sign-in/guest choice, replacement, recovery, recovered sign-in and deletion through the public website. `.local/username-native.json` records Android manifest/bundle transport; physical-device authentication and iOS remain separate acceptance work.

Local evidence: `.local/deployment-http.json`, `.local/deployment-auth.json`, `.local/deployment-browser.json`, `.local/vps-native.json`. These bounded checks do not complete the PRD. The inherited Expo/React Native dependency advisories are recorded in `.local/deployment-audit.json`; no forced SDK downgrade or unrelated major upgrade was performed. Relevant advisories and real-device/security acceptance remain public-launch work.
