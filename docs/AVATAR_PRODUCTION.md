# Production avatar generation

> **16 October UX update:** The owner now requires no cancellation during generation. Queued/working production jobs reject client DELETE with 409. The client resumes a persisted request after reload and never deletes it on unmount. Successful saves show one four-second notification; idle autosave text is hidden. Compact consent retains expandable privacy disclosures. [Current behaviour and verification](ACCOUNT_SETUP_UX.md) supersede the cancellation and manual Save descriptions in the historical sections below.

> **Current deployed integration:** `20261016-avatar-library3` was promoted, then the concurrent `20261016-ui-standard1` app/preview release included the same reviewed avatar sources. Runtime hashes for nine preview client files and three app backend files match. Current image selectors live in the canonical deployment runbook. Combined-release verification is in `.local/avatar-library-qa/concurrent-release-check.json`, `combined-release-native.json` and `.local/avatar-library-live-qa/browser.json`. All documentation remains local.

> **16 October avatar library/camera update:** Generated portraits and selections now save automatically, as explicitly selected by the owner. `server/avatar/library.sql` adds owner-scoped encrypted `avatar.saved` payloads and `avatar.preference` selection. Apply once with the operations database role after backup. Default/sample selection does not delete saved portraits. The first account load imports an existing local generated portrait if the account has no preference yet. A portrait overwritten in the old single-slot device store has no permanent historical server copy to restore.
>
> The library holds up to 20 generated portraits per account as a storage capacity safeguard; it does not alter master generation quota exemption. Permanent library frames live in PostgreSQL encrypted using the existing avatar storage key, with account+avatar AAD. Generated frames remain until explicit portrait deletion or account deletion; database backups follow existing seven-day retention. Protect and preserve the encryption key separately from database dumps: existing backup automation does not back it up, and off-host key recovery remains an acceptance gap. Raw selfies retain their existing temporary lifecycle.
>
> Camera/photo preparation now uses SDK 57 ImageManipulator to normalize local images to JPEG and bound dimensions before upload; Android pending picker results reopen review after activity recreation. Permission denial has a Settings recovery path. Failed autosave retains a separate account-scoped device preview; Retry uses those frames without another provider call. Account deletion removes that preview key. Explicit discard/delete require confirmation. Source checks, synthetic browser and owner-isolation/encryption fixtures passed; physical Android/iOS camera and native visual/accessibility acceptance still require device verification. Evidence: `.local/avatar-library-qa/`. Deployment follows [the local runbook](DEPLOYMENT_RUNBOOK.md). Documentation is excluded from every deployment.


Deployment method and current image selection: [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md). Its live-reconciled release table supersedes older image snapshots in this feature history.


**16 October customer Google login and master usage:** [Current Google sign-in, Expo Go handoff and pinned owner policy](GOOGLE_LOGIN.md) supersede earlier username-only/no-Google instructions and the owner's standard avatar quota. Regular member quotas are unchanged.


Updated 16 October 2026. Local documentation only. Supersedes the development-only setup below and the old instructions to place OPENAI_API_KEY on the VPS.

## Runtime contract

Customer app endpoint: `/api/avatar/status` and `/api/avatar/jobs`. Real QuinTaste username/password login and adult-confirmed account required; Google staff login is separate. Anonymous users can try the fictional sample. The client uses its existing Better Auth cookie on Android and the same-origin cookie on web. Owner headers never authorize production generation. Account changes remount the editor so an old response cannot enter another account's collection.

Cloudflare account `5e0f948cf2161e20c0cdfe640c6cf48f`, gateway `quintaste`, provider alias `default`. Original OpenAI key remains in Cloudflare Provider Keys. The existing Run token is mounted read-only from `/docker/quintaste/admin-secrets/cloudflare-gateway-token` into the application at `/run/secrets/cloudflare-gateway-token`. No token value is in the release, client, documentation or logs. Recreate the app container after replacing this bind-mounted token file; restarting alone may retain an old inode.

The fixed model is `gpt-image-2.5-sunburst`, high quality, 1024-square transparent WebP, four sequential image-edit calls (base, blink, half-open mouth, open mouth). No arbitrary model, prompt, URL or provider header comes from the client. Cloudflare injects its stored OpenAI key; no provider Authorization header is sent. Request payload logging and caching are disabled by request headers. One upstream attempt and a 180-second timeout per frame; interrupted/uncertain provider work is never automatically paid again.

## Job and privacy controls

PostgreSQL `avatar.job` persists owner, idempotency key, consent version, state, progress and expiration. `avatar.budget` reserves an entire four-call attempt atomically before dispatch: two attempts per account and five globally per UTC day. Failed/cancelled requests retain the reservation. These are attempt/call limits, not a guaranteed dollar cap. Only one generation is admitted globally at a time on this shared VPS; busy requests do not consume the budget. A database connection advisory lock also serializes dispatch across replicas. Per-account upload throttling and at most two simultaneous upload parsers bound resource usage.

Only JPEG/PNG/WebP still photos up to 4 MiB and 25 megapixels are accepted. Decode/re-encode strips metadata and scales to 1024 pixels. Source photos and previews are AES-256-GCM encrypted with per-file nonces and job-bound authentication data in `/docker/quintaste/avatar-data` (directory mode 0700; payload 0600). The storage key is generated on the server in `/docker/quintaste/avatar-secrets/storage-key` (32 random bytes, mode0400, UID1000). Neither data nor key is included in release archives or database backups. Host administrators and full-machine backups remain a trust boundary.

The source photo is removed from the encrypted payload after the base frame. Preview access expires 15 minutes after admission; a 30-second sweep erases expired payloads. Cancellation, generation failure and uncertain interrupted work erase payloads. A post-write cancellation check closes the cancel/write race. Orphan payloads are swept by age. Job metadata and counters are cleaned after approximately 30 days; budget entries survive account deletion until this cleanup to prevent reservation erasure. Account deletion cascades job rows, with orphan encrypted payloads swept within 15 minutes of their last write.

Queued jobs can resume after restart; jobs that were already working become failed without automatic provider retries. DELETE creates a cancellation tombstone even before the upload commits. Replaying a request cannot spend again within the 30-day metadata window. Failed or expired previews never overwrite the saved avatar. Final images remain in the user's device collection only when they press Save; this is not cloud profile-image sync or a 3D mesh. Talking preview remains a local animation loop.

## Deployment and rollback

Use `compose.yml`, `admin.compose.yml` and `avatar.compose.yml` together. The avatar override adds the private payload/key mounts, configuration and a dedicated HTTPS `/api/avatar` router with a 5.6 MiB in-memory upload limit. The existing 16 KiB limit remains for other application routes. Do not deploy documentation or QA artifacts.

Run `server/avatar/schema.sql` using the database migration role before starting the new app. It adds isolated avatar tables and an initially-disabled `ops.control` key named `avatars`; it does not modify customer data. Set the control true only after acceptance. Staff Feature controls can pause or resume avatars, with existing MFA/reason/audit requirements. The general `ai` control remains locked for unrelated AI features.

Rollback: pause the `avatars` control, retain the additive schema and budget ledger, restore prior app/preview/admin image tags, and recreate only these services. Never reset the budget to retry a failed provider call. Keep the prior release and backup. Do not remove other VPS applications or database volumes.

## Verification

Implementation gates and the existing development avatar security checks passed. Isolated production-shaped API checks are in `.local/avatar-production-qa/backend-checks.json`. Live provider acceptance and final deployment checks are recorded separately after execution; source readiness alone is not live acceptance. No real customer photo was used for automated checks.

Physical Android camera/picker, likeness of the owner's selfie, device passkey flows, external backup/restore and the broader app's existing dependency advisories remain separate acceptance items. This feature release does not assert the whole product is certified or that later-phase Social/Market/Game services exist.

## Accepted deployment ? 16 October 2026

App `quintaste-app:20261016-avatar5`, Expo Go preview `quintaste-preview:20261016-avatar5`, admin `quintaste-admin:20261016-avatar1`. All run healthy in the existing `quintaste-staging` Compose project. Public web editor: https://quintaste.srv1902914.hstgr.cloud/avatar . Expo Go: exps://preview-quintaste.srv1902914.hstgr.cloud . Close/reopen or reload Expo Go to load the new client bundle. Sign in to a customer account first; Google staff authentication is separate.

One live four-call generation through the stored Cloudflare provider key completed base/blink/mid/open successfully using the fictional sample. Normalized frame sizes are approximately 38?41 KiB; real expressions and transparency were inspected. The image viewer can show hidden RGB under transparent WebP pixels; raw alpha checks and actual browser rendering confirm the cutout. No real customer photo or original OpenAI key was accessed.

Validation: seven existing development security groups; twelve isolated authenticated API groups; four final restart/admission/cancellation groups; deployed browser account sign-up/sign-in, upload validation, CSRF, photo selection/consent, Save/reload and 375/768/1440 layouts. Final browser run has zero runtime errors and zero scoped WCAG A/AA findings. The initial browser run caught missing font/icon assets; release packaging now permits only exported binary assets under dist/client/assets/node_modules while continuing to exclude dependency source, credentials and documents. Failed and corrected evidence both remain local. Application/admin TypeScript, scoped ESLint, Expo export and Linux container builds passed.

The generated-avatar Report action required by QT-064 is connected to ops.case_record. It sends only the account reference, avatar reference and user description, never the photo or generated image. Customers receive a case reference; the existing admin case queue can read it. Three reports per account per 24 hours are allowed, with transactional enforcement. Browser submission, minimal payload, receipt, limited-admin visibility and cleanup of the synthetic case passed on the deployed release. Full mesh/rig, Adult/Mini appearance editing and on-device-only selfie processing in the original QT-045/046 remain superseded or unimplemented under the explicitly chosen four-frame cloud-generated portrait approach. Do not claim complete PRD or app-store acceptance from this release.

Final Android transport check: Expo manifest and Android bundle both HTTP 200; production avatar endpoint, v2 consent and report UI present; server prompts and secret file paths absent from the bundle. Temporary QA containers, network, synthetic accounts, case and private QA directory were removed after acceptance. All QA evidence and documentation remain local.
