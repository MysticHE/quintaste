> **Avatar update, 16 October:** Authenticated customer avatar generation is deployed through Cloudflare, with private encrypted temporary storage and durable limits. Staff can pause/resume `avatars` in Feature controls. See [AVATAR_PRODUCTION.md](AVATAR_PRODUCTION.md) for the current images, verification and limits; earlier generic AI-disabled statements below apply to other AI features.

Deployment method and current image selection: [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md). Its live-reconciled release table supersedes older image snapshots in this feature history.


**16 October customer Google login and master usage:** [Current Google sign-in, Expo Go handoff and pinned owner policy](GOOGLE_LOGIN.md) supersede earlier username-only/no-Google instructions and the owner's standard avatar quota. Regular member quotas are unchanged.


# QuinTaste staff platform

Updated 16 October 2026. Local documentation only; never include this file in a deployment.

## Deployment

Target URL: https://admin-quintaste.srv1902914.hstgr.cloud

The console is a separate Next.js 16 service beside the Expo application and preview service on the existing Malaysia VPS, srv1902914.hstgr.cloud. It uses the existing Traefik HTTPS entrypoint and private PostgreSQL network. It publishes no host port. Its container runs as UID 1000, with a read-only root filesystem, dropped capabilities, no-new-privileges, 512 MiB RAM and 0.5 CPU limits. The Expo Go preview service is not rebuilt for this release.

Application image: `quintaste-app:20261016-admin1`. Admin image: `quintaste-admin:20261016-admin2`. The second admin image includes the tablet table/layout correction. Local immutable archives and inclusion manifests are in `.local/releases/`; only allowlisted executable source, compiled application assets and configuration were uploaded. First-party documents, raw credential files, source maps and QA evidence are excluded. Required third-party licenses remain.

Run the project with both Compose files:

```sh
cd /docker/quintaste
docker compose -f compose.yml -f admin.compose.yml up -d --wait app admin
```

The root-only `admin.env` contains service configuration and the limited database connection. The two files mounted under `/run/secrets/quintaste` contain the OAuth client secret and Cloudflare Run token; the original OpenAI key is not stored on the VPS. No administrative password or Google password is stored by this console.

## Owner setup

The invited owner is `hui.en194@gmail.com`. Its Google OAuth Web client ID is `528818348519-l3tnrloeqjm9voa41m88domtil4qmejp.apps.googleusercontent.com`. The exact callback is:

```text
https://admin-quintaste.srv1902914.hstgr.cloud/auth/callback
```

In Google Auth Platform, configure External audience and add the owner as a test user while testing. The application requests only `openid email`. Provider branding/production consent settings require separate acceptance before broader staff use.

The owner enters values directly through the trusted VPS terminal, as plain text with no variable name or quotation marks:

```sh
nano /docker/quintaste/admin-secrets/google-client-secret
nano /docker/quintaste/admin-secrets/cloudflare-gateway-token
```

Save with Ctrl+O, Enter; exit with Ctrl+X. Never paste either value into chat. Both files are owned by UID/GID 1000 with mode 0400 inside a 0700 directory; root remains a trusted administrator and can read them. Google credential rotation requires restarting the admin service to discard the cached OIDC client configuration. Docker directory mounts preserve the entry path across file replacement.

Staff sign-in verifies Google issuer, audience, nonce, state, PKCE, verified email and an invited account. The Google subject is bound on first accepted sign-in. First access enrolls a security key/passkey; a separate assertion is then required before entering the console. User verification is mandatory. A security-key hint is supplied, but platform/synced passkeys may also be accepted: the application does not claim hardware attestation. Register a backup key. Removal requires fresh verification and cannot delete the last key. No public staff signup or production authentication bypass exists.

Sessions use hashed 256-bit random tokens and host-only Secure/HttpOnly/SameSite=Lax cookies in HTTPS deployments. Pre-MFA sessions last 10 minutes; full sessions last 8 hours with a 30-minute inactivity limit. Sensitive changes require MFA within five minutes. Verification rotates the session token. Account disable/role changes revoke staff sessions. HTTP writes require the exact Origin and a custom same-origin header; requests are bounded and rate-limited.

## Implemented operations

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Customer accounts | Username prefix search; suspend/restore; revoke sessions | No passwords, recovery codes, session tokens or customer email exposed to the runtime DB role |
| Cases | Report/harm/correction/incident/privacy cases; ownership; triage/investigation/resolution/dismissal; notes and resolution/right-of-reply outcomes | Owner/operator see the queues; support/reviewer only assigned cases. Manual intake; this does not wire all customer report screens to production |
| Editorial | Browse current published menu metadata; fingerprint-checked review/change/withdrawal decisions | Withdrawal affects index/detail delivery. Review does not publish or restore content. Full source publication/restoration still requires the source publishing workflow and explicit release acceptance |
| Feature controls | Real registration, discovery and menu shutdown/restore; version checks; member notice API | Notices are available at `/api/operations/status`; an in-app global notice banner is not added. Offline clients cannot receive immediate withdrawal until reconnection |
| Integrations | Cloudflare account/gateway reference, Run-credential presence, owner-only bounded text probe, safe status history | Original OpenAI key never enters this console. Check limited to three/day, fixed `gpt-4.1-mini` prompt and eight-token ceiling; may incur charges. Does not enable/test production image generation |
| Staff | Invitations, role/status changes, revocation and security-key management | No self-removal of owner access or removal of final active owner. Lost-all-keys recovery is an out-of-band owner incident, not a UI bypass |
| Audit | Actor/action/target/reason/details, filtered and paginated events; case views logged | Runtime role has INSERT/SELECT but no UPDATE/DELETE/TRUNCATE on audit. A database/root administrator remains trusted; this is not an externally immutable audit archive |
| Identity | Explicit unavailable state and readiness tracking | No ID upload, image viewing, identity approval or purge engine. Phase 2 QT-089/N21-03 remains unimplemented and intake disabled |

AI, Social, Market, games and identity cannot be enabled by an admin toggle until their production services are accepted. The feature switches do not create those backends. Customer username/password and one-time recovery-code login remains independent of staff Google/WebAuthn login.

## Database and maintenance

`admin/db/schema.sql` creates `staff` and `ops` schemas. The deployment migration runs using the database administrator; runtime `quintaste_admin` has only required schema access and limited public account columns. It cannot read customer credential hashes, recovery-code hashes or session token values. Public `quintaste_app` gets read access to operational controls/restrictions/editorial decisions. The public application's database-owner privileges are a pre-existing trust boundary, not full isolation from a compromised database administrator.

`quintaste-admin-maintenance.timer` runs hourly, deleting expired OAuth transactions, WebAuthn challenges, sessions and old throttle windows through `admin/db/maintenance.mjs`. The existing daily database backup includes the new schemas; a pre-migration backup was taken. Backups still reside on the same VPS: off-host encrypted backup and a full post-admin restore drill remain launch requirements. Credentials are not included in database backups and require separate owner-controlled recovery.

Rollback retains the previous `quintaste-app:20261016-docs1` image. Disable `OPERATIONS_ENABLED` when reverting the application, restore its prior APP_IMAGE setting and recreate only `app`. Keep the additive schemas for investigation. Stop `admin` if its release is being withdrawn; do not delete the database or other VPS projects. Note that reverting the operational enforcement layer removes the new account/feature restrictions and must be evaluated against active incidents before use.

## Evidence and limits

Local evidence: `.local/admin-qa/browser.json`, `security.json`, `app-integration.json`, `accessibility.json`, screenshots and dependency audit. Isolated test data was used, never production customer data. Virtual WebAuthn registration and assertion completed. Thirty-three checks cover unauthenticated/forged/disabled staff, role and case isolation, CSRF, stale updates, fresh MFA, database denial of credential reads/audit deletion, and unavailable gateway credentials. Seventeen integration checks cover signup/recovery-code issuance, sign-in, suspension, restoration, registration shutdown, fingerprint validation and menu withdrawal/shutdown. These are bounded checks, not an independent security certification.

Next build, TypeScript and admin ESLint pass. The changed public-server files pass syntax/lint and root TypeScript. Seven inspected pages report no automated WCAG A/AA violations; desktop/mobile/light/dark screenshots were reviewed. Physical security keys, the owner's actual Google login and live Cloudflare/OpenAI response still require acceptance. The admin runtime dependency audit has zero reported vulnerabilities at this check; five high-severity development-tool dependency findings remain. The existing Expo tree has 31 production-tree advisories (11 moderate/20 high), mostly transitive build/runtime framework chains; no incompatible force-downgrade was applied. These findings, off-host backups, incident notification/delivery, retention policy and full native acceptance prevent a blanket production-ready claim.

Staff case/audit retention needs an approved policy and privileged retention job. No blanket deletion period is invented here. The original PRD's Singapore hosting assumption is superseded by the owner's explicit choice to use the existing Malaysia VPS, without claiming a legal/compliance conclusion.
