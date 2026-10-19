# QuinTaste VPS overview

Updated 16 October 2026 against the running server. Read [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) before any deployment, restart, remote configuration change or rollback. It is the authoritative operating procedure. All project documentation and QA evidence remain local. Before moving to another host or cloud, or resizing the preview service, read [PLATFORM_REQUIREMENTS.md](PLATFORM_REQUIREMENTS.md): Metro compiles on demand and needs a prewarm after every start.

## Access and services

Existing VPS: `srv1902914.hstgr.cloud` (`187.52.117.45`), remote project `/docker/quintaste`, Compose project `quintaste-staging`. The user instructed us to retain the existing VPS without further region checks. Other applications share it; leave their containers, networking and Traefik configuration alone.

| Service | Current image | Purpose |
| --- | --- | --- |
| app | `quintaste-app:20261016-ui-standard1` | Exported web app, production Express API, customer authentication and avatar worker |
| preview | `quintaste-preview:20261016-ui-standard1` | Expo Go Metro and restricted HTTPS preview gateway |
| admin | `quintaste-admin:20261016-google3` | Staff Google/passkey console |
| db | `postgres:17-bookworm` | Existing private PostgreSQL database |

All four containers were healthy at this check. Always inspect live versions again before deploying. All normal Compose operations use `compose.yml`, `admin.compose.yml` and `avatar.compose.yml` together. The runbook explains which selected services to build/recreate and when a web export is required.

- Web/API: https://quintaste.srv1902914.hstgr.cloud
- Avatar editor: https://quintaste.srv1902914.hstgr.cloud/avatar
- Staff console: https://admin-quintaste.srv1902914.hstgr.cloud
- Expo Go: `exps://preview-quintaste.srv1902914.hstgr.cloud`
- App/admin health: `/healthz`; account provider configuration: `/api/account/status`.

A browser visit to the preview hostname redirects to the web app. Expo Go uses the exact `exps://` URL. The VPS keeps the preview available without the laptop or shared Wi-Fi. SDK 57 compatibility and actual device behavior still require device acceptance; a manifest/bundle HTTP 200 proves transport only.

## Current authentication and avatar behavior

Customer username/password and Google sign-in are enabled. Username accounts use one-time recovery codes; Google accounts recover through Google. Google identities complete the server age check before account/avatar use. Food collections remain per-account on each device; cloud food sync is separate work. Customer accounts and staff authorization remain separate.

Staff access uses an invited Google account followed by mandatory WebAuthn/passkey verification. `hui.en194@gmail.com` is the authorized owner. The same verified Google subject is pinned to the master customer quota policy; matching a name, username or unverified email never grants that role.

Avatar generation is enabled through the authenticated `/api/avatar` service, with a real four-frame Cloudflare/OpenAI generation previously verified. Regular accounts have two attempts per UTC day and five shared daily attempts; the master identity bypasses both usage quotas while security, consent and one-at-a-time capacity controls remain enforced. Guests can preview the sample avatar; personal generation requires sign-in.

Google login's origin correction is deployed in the current app image. Only the browser confirmation page uses Referrer-Policy:same-origin so its form sends a valid origin. Better Auth accepts only the configured Expo Go preview host in its exp/exps origins. Real-browser confirmation and native Finish with a pre-existing cookie passed isolated regression; unrelated/lookalike origins remain blocked.

## Persistent configuration, secrets and backups

Keep existing `.env`, `runtime.env`, `admin.env`, `postgres/`, `state/`, `admin-secrets/`, `avatar-secrets/` and `avatar-data/` outside release images and preserve them during rollout. The original OpenAI key stays only in Cloudflare Provider Keys. The VPS uses a separate protected gateway Run token and Google OAuth secret; never print their values. Local `.env.local` is never synchronized.

Backup and admin-maintenance timers were active at the last check. Local data backups use `/docker/quintaste/backups` with the existing seven-day retention. Fresh deployments take protected configuration snapshots and retain previous images for rollback. Secret/encryption-key backup and full off-host recovery acceptance are separate from the existing database backup. Never use volume deletion or broad pruning as part of deployment.

## Detailed references

- [Deployment commands, release packaging, verification and rollback](DEPLOYMENT_RUNBOOK.md)
- [Customer Google, Expo Go handoff, master policy and origin regression](GOOGLE_LOGIN.md)
- [Avatar production contract, encryption, quotas and report intake](AVATAR_PRODUCTION.md)
- [Staff console authentication, roles and operations](ADMIN_PLATFORM.md)
- [PRD implementation and remaining acceptance](PRD_COVERAGE.md)
- [Historical VPS notes](history/VPS_DEPLOYMENT_20261016_LEGACY.md) - archival only; superseded instructions are not current setup steps.
