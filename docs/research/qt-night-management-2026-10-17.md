> Superseded 18 October 2026: the 2,000 monthly model cap and its 1,600 alert were removed (`monthlyModelInvocations: null`); calls are still ledgered. See `QT_BOTS_REMAINING_GAPS_2026-10-18-limits.md`.

# QT nightly work and owner moderation

Deployed and checked **17 October 2026, 5:24 pm SGT**. This supersedes the older
03:00 coordinator, eight-call daily ceiling and 180-call monthly allowance.

## Active configuration

- One existing QT Manager job, `1d0f99df35ff`, now ticks every 15 minutes during
  **01:00–05:00 Asia/Singapore** (`*/15 1-4 * * *`). The research lock prevents
  overlapping work. First scheduled tick: **18 October, 1:00 am SGT**.
- No new research after **04:15**. Reviews and publication may finish afterward.
  Per-call deadlines and a process-tree supervisor end work by **05:00**. A tick
  is also capped below Hermes' one-hour script timeout. Partial files are retained.
- **2,000 scheduled/CLI research agent invocations per Singapore calendar month**,
  shared by the four roles; failed starts and the earlier acceptance call count.
  There is no eight-call daily ceiling. Two remaining invocations are reserved
  for Manager reviews. This is an agent-run counter, **not a raw API request or
  token counter**: a run may contain up to 18 model turns. Ordinary interactive
  Hermes chats are outside this dispatcher ledger and still consume provider quota.
- The independent Telegram reporter sends one notice at **1,600 (80%)** and one at
  **2,000 (paused)** per month. It uses persisted delivery keys and continues when
  research pauses. The ledger is flushed and fsynced before launching paid work.
- Current usage: **9/2,000**, 1,991 remaining. Image generation stays separately
  capped at **3/month**, already used this month. The allowance is not a spending
  target; no useful due work means no new model call.

## Role progression

Daily Cooker/Event work gets the first available tick so Explorer cannot starve
them. Cooker can source up to two candidates per day, using live and previously
proposed recipe identities. Event checks saved future listings daily (bounded to
six) and discovers broader listings weekly or when saved metadata needs repair.
Explorer then resumes the oldest unreviewed existing branches, four per batch,
until the monthly cycle has an outcome for every branch. Pending reviews are
retained and drained before new Explorer collection. Failed roles/reviews stop
retrying after two attempts that night. Manager review, source evidence, image
rights, visual review and atomic publication gates remain required.

Reviewed procedural learning continues inside ordinary Manager calls. It is not
model training, automatic code modification, or evidence that all gaps are solved.

Shared extraction caching remains 24 hours for successful pages and 30 days for
blocked pages, with original capture dates, 400 entries and 64 MiB bounds. Query
history is bounded to 600 visible queries/30 days and fed back to later tasks.
**OpenAI-native searches execute inside the provider and cannot be intercepted by
this cache.** Nine historical receipts exposed zero query strings. Thus query
history is advisory when queries are exposed; exact search-level deduplication is
not guaranteed. Record checkpoints and extraction reuse are enforced. No new paid
search backend was enabled merely to obtain caching.

## Owner deletion in Telegram

`/manage` lists bot-published recipes and external events, five at a time. It
excludes bundled recipes, venue menus, member gatherings and account data.
Selecting an item creates a separate **Confirm delete / Cancel** action; a list
token cannot itself confirm. Tokens expire after ten minutes and are bound to the
exact record hash. Only the paired private chat **and** paired sender can act.

The fixed adapter signs `POST /api/editorial/control/remove`. Models have no
removal tool, signing key, SQL or SSH access. The app checks identity/hash under
the same lock as publishing, writes durable audit revisions and a suppression
identity, then atomically removes the active record. Same-request retries are
idempotent. A timeout is reported as uncertain until the live removal receipt is
verified. Changed records require a new selection; cancellation never writes.

The publisher and app reject the removed stable ID and normalized identity, even
if a worker suggests a new ID. Events match title/organiser/date. This is
deterministic identity matching, not a semantic guarantee against all paraphrases.
Rollback cannot silently restore an owner removal. Review-required recovery is an
operator task; there is no automatic undo or model authority to override it.

Deletion is immediate at the owned API. Existing client caches may display an
older item for up to **15 minutes online**, or **24 hours offline**. An already-open
screen is not pushed an instant update. Existing recipe saves are retained; a
fresh request for a removed recipe returns 404. Cache/pagination behavior was not
replaced with polling, full-data downloads or provider calls.

## Google accounting

Google remains disabled for these bots. The existing research ledger is unchanged:
2,419/2,500, 81 remaining; SHA-256
`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`.

Google's [official pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
was checked 17 October 2026: Places Essentials details 10,000/month; Pro details,
Nearby and Text Search 5,000 each; Enterprise details/search and Photos 1,000 each.
These are SKU allowances, not one combined free pool. Google aggregates usage
across projects attached to the billing account. Current billing-account-wide
usage and the precise field-mask SKUs were not available to reconcile. The policy
records the owner's free-only preference and published caps, but does not enable
calls or reset the older ledger based on an assumption of unused free allowance.

## Deployment and verification

App **20261017-qt-management2** is built from the actual live
**20261017-menu-reviews3** archive. Exactly two deployed files changed:
`server/editorial/store.mjs` and `router.mjs`. UI/export bytes, preview, admin,
PostgreSQL, review-photo features, Compose mounts, account configuration and
provider secrets are preserved. A first staging attempt detected a concurrent
release and stopped; management2 was rebuilt from the newer release.

App rollback configuration: `/docker/quintaste/deployment-backups/20261017-qt-management2`.
Hermes pre-change backup: `/opt/data/qt-team/telegram-runtime/backups/night-20261017T091459Z`.
Final code-refresh backup: `night-20261017T092354Z`. Backups can contain protected
profile configuration and must remain private. Do not roll back app code to a
version without suppression enforcement while leaving an older publisher active.

- **65 Python checks** passed locally and on the Hermes VPS: workflow/publisher,
  learning, owner authorization, confirmation, cancellation, expiry, ambiguous
  delivery, 80%/100% dedupe, month reset and checkpoint continuation across ticks.
- **28 isolated app checks** passed, including signed deletion, stale hashes,
  same/new-ID suppression, event deletion, idempotency and rollback protection.
- TypeScript, Expo lint and scoped backend lint passed.
- **10 live API checks** and **6 live browser checks** passed. Cook, Save/reload,
  events and concurrent place details remain intact; no browser Google/provider
  requests or runtime errors. Actual screenshots retained locally.
- The live signed removal endpoint rejected a nonexistent fixture with 422 and
  left production content unchanged. No real recipe/event was deleted for testing.
- Telegram setup notice delivered as message **12**; command menu updated;
  reporter healthy with no pending deliveries. Threshold behavior was simulated
  in isolated tests, not by inflating the real usage ledger or sending false alerts.
- First full overnight window is **pending**. Its saved report/digest must be
  inspected after 18 October; simulated ticks do not prove an overnight provider run.

Evidence: `evidence/2026-10-17/night-management/`, and QuinTaste
`.local/qt-night-management/` plus `.local/qt-publisher/{api-results,live-api}.json`.
Research/notification state: 951,971 bytes; app editorial content: 162,773 bytes.
App VPS free space: 17,721,884,672 bytes. Recipe summary 955 bytes, warm median
15.49 ms; first catalogue page 24,041 bytes / 36.76 ms in this sample, not a load test.
Existing archive capacity guards can pause future work and require operator
archival; unlimited growth is not promised.

No source holds were cleared: 174 visible branches, 173 covers, 120 opening-hour
records; 1 cover, 54 hours and 3,387 price entries remain unresolved. Only 2/174
branches have QT review outcomes so far; 172 await the upcoming nightly work.
