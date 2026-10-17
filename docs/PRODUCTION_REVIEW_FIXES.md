# Production review fixes — 17 October 2026

Release `20261017-review-hardening1` fixes all eight reported defects. It starts from the actual live app archive `20261017-qt-management2`, preserves its editorial owner-removal changes, and replaces preview `20261017-menu-reviews3`. Ten source files change; all 16 Expo API bundles are preserved byte-for-byte. The clean web export contains the cooking recovery changes.

## Behavior

- Social records membership acceptance explicitly. Pending, declined and never-accepted departed members receive only the introduction, without private chat or plan events. Accepted former members receive chat only through departure. Reinviting resets acceptance. The message query reads membership and messages in one database snapshot.
- Both group list and detail responses disclose current venue, time, food and payment arrangements only to accepted members. Departed members cannot track later plan changes.
- Market listing POST and UUID listing PUT routes have a dedicated 6 MB edge limit and a bounded request rate. The ordinary 16 KB limit, existing review uploads, editorial publication and origin/authentication guards remain.
- Checkout holds a shared seller row lock until its transaction commits. Staff shop suspension and item removal wait for in-flight checkout, then cancel and notify for the committed order. If moderation commits first, checkout rejects the order.
- Checkout checks the seller's active account restriction as well as shop availability, closing the saved-ID/open-checkout bypass after account suspension.
- Listing validation rejects ordinary meat and seafood ingredients, including chicken, beef, fish and prawn. Explicitly qualified mock/plant alternatives remain permitted; a qualified token cannot hide a separate meat ingredient. Oyster mushrooms, fish mint and vegetarian egg ingredients remain permitted, subject to the existing diet consistency rules.
- Slot capacity is filtered in SQL before the 20-result limit. Full early slots cannot hide later available slots.
- Finish Cooking persists its completion before clearing the active session. Storage failures leave the last step visible; banner Retry saves the same completion and returns to the recipe once. Notes and independent timers remain intact. Account switching and concurrent writes are locked during the pending transition.

## Migration and rollback

After a successful backup and before promotion, apply `server/social/membership-history.sql` with the operations role. This additive migration adds `social.member.accepted_at`; currently accepted members and departed group creators can be backfilled safely. Older non-creator departed rows have no reliable acceptance evidence and therefore retain introduction-only access. Do not infer acceptance from names or message text. New transitions retain explicit evidence going forward.

Rollback snapshot: `/docker/quintaste/deployment-backups/20261017-review-hardening1`. Restore `.env` and all three Compose files, then recreate only app/preview using the existing deployment command. Retain the additive column/data. Rolling back the Social router restores the reviewed privacy defects; prefer a forward repair or pause Social if recovery is needed. Admin and database containers were retained.

## Verification

Evidence is gitignored in `.local/production-review-fixes`:

- Seventeen baseline API probes reproduce the reported defects. Forty-five updated API/database checks pass, including ordinary-meat publication, account suspension using the actual admin action, 20 full slots followed by availability, and both moderation races using real PostgreSQL lock waits.
- Local staff authentication/permission and audit seams are stubbed in the concurrency harness; the real admin moderation/account action transactions run against the local database. Production access guards remain unchanged.
- Two baseline browser probes reproduce failed completion recovery. Ten updated browser checks pass at 375-point normal text and 320-point enlarged text, including repeated storage failure, successful Retry, reload recovery, preserved notes/timers and rapid repeated Finish.
- Isolated application TypeScript and uncached lint pass: 545 files, zero errors/warnings. Clean Expo web export and shell promotion syntax check pass.
- The real production edge rejected the realistic 125,910-byte listing photo request before deployment. After deployment, listing POST/PUT reach authentication; unrelated routes retain 413 at 16 KB, uploads over 6 MB receive 413, and untrusted writes receive 403. Thirteen live edge/health/access/catalogue checks pass without creating production fixtures.
- VPS audit confirms healthy release images, the new column, ten narrowly scoped upload labels, successful backup, active maintenance timers and zero application error lines in the checked interval.
- Ten cooking browser checks also pass against the deployed web assets with local browser storage and intercepted API calls; no production account or content is created for these checks.

Final exact-web and Android/iOS preview bundle results are recorded in `live-native.json` and consolidated `release.json`. Preview transport verification does not claim physical-device UI acceptance or production load capacity.

Alice/Bob local test accounts were reused and retained; their sign-ins were refreshed and generated review/report fixtures removed. Follow `LOCAL_TEST_ACCOUNTS.md`; never print or deploy their saved credentials. No production dummy accounts, listings, reviews or orders were created, and no paid provider calls were made.
