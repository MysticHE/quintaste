# QT Manager Telegram reporting

Owner-authorised and deployed 17 October 2026. Bot: **@QTManager_bot**.
The owner's private chat was paired with a single-use, expiring code. The owner
confirmed receipt of the visual updates and sent `/status`; Telegram confirmed
the real command reply. No chat ID or token belongs in this document.

## User experience

- Short publication updates identify changed venues, recipes and event counts.
- Up to three actual public-app screenshots per revision, with capture dates and
  links. Existing captures are reused; no image generation for notifications.
- Daily update around **8:00 am Asia/Singapore**, monthly coverage heading on the
  first day, and research failure/delayed-run alerts. Research remains **3:00 am**.
- All user-facing timestamps use Singapore time, for example `17 Oct, 4:16 pm SGT`.
- `/status`, `/latest`, `/coverage`, `/holds`, `/help` are read-only. Unknown chat
  instructions do not invoke an agent. Command replies normally take one polling
  interval (approximately one minute).
- At the owner's request, remove invocation counters, raw IDs, UTC timestamps,
  empty error counts and zero-record technical details from routine messages.
  Baseline holds are explicitly labelled as saved baseline counts, not a fresh audit.
- Internal audit timestamps remain UTC. This does not affect displayed timezone.

## Runtime and boundary

`telegram_reporter.py` is a fixed script, independent of research/publication.
Hermes job **18ae508e503a**, `QT Manager Telegram reporting`, runs every minute
with `no_agent=True`, `deliver=local`, through `scripts/qt-telegram-report.py`
in the QT Manager profile. Delivery is performed by the script to the paired
owner only. Existing research job **1d0f99df35ff** is unchanged.

The worker profiles' `externalMessages:false` restriction remains in place;
they have not gained a messaging tool. This separate owner-controlled reporter
has no model tool, publisher key access in its code, SQL action or app write path.
It does not replace the existing Hermes Telegram gateway or alter other bots.

Private files under `/opt/data/qt-team/private/`:

- `telegram-token`: mode 0600; never print or commit.
- `telegram-chat.json`: paired numeric owner/chat IDs, mode 0600.
- `telegram-pairing.json`: deleted after successful pairing.

Reporting state is under `state/telegram/`: atomic saved offset, delivery queue,
message receipts, lock and media manifests. Queue capacity is 100 pending messages;
completed receipts are pruned after 45 days, and old successful receipts are also
trimmed toward 1,000 entries. Current-publication dedupe keys are retained;
failed delivery records remain visible for 45 days. Screenshots retain at most 30 revision folders /
60 MiB, except files still needed by queued messages.

Each send persists a claim before transport and records the returned message ID.
429/explicit server rejection receives bounded backoff (six attempts). An ambiguous
timeout or interrupted claimed send is marked `delivery-unknown`; it is **not**
blindly resent. Operators must reconcile those against Telegram before retrying.
Notification failures never rerun research or roll back publication.

The browser is anonymous and restricted to the owned app origin; provider routes
are blocked. A public revision check before/after capture ties screenshots to the
receipt. Failure is reported honestly and capture retries are bounded. No sources,
raw research transcripts, customer records or authenticated browser storage are sent.
Screenshots show public content already available in the app.

An isolated Python 3.11 / Playwright 1.62.0 runtime and Chromium headless shell live
under persistent `/opt/data/qt-team/telegram-runtime`; the Python interpreter also
resolves under persistent `/opt/data`. Runtime files measured 420,660,886 bytes;
the initial three screenshots plus manifest totalled 153,645 bytes. No app release
or database migration was required.

## Verification

- 40 local workflow/publication/reporting tests passed; 15 reporter tests also
  passed using the VPS runtime. Covers pairing identity/expiry, owner isolation,
  duplicate updates, no arbitrary instructions, retry, uncertain delivery,
  screenshot failure, bounded pending queue and Singapore date rollover.
- Live screenshot inspection: Whole Earth venue, tomato/egg recipe, expanded
  official event. Browser manifest recorded no blocked external request attempts.
- Telegram accepted connection, publication, three photos, daily update and real
  `/status` response, each once. Initial message receipts: 3–8 and 10.
- Existing messages 4–8 and 10 were edited to the concise Singapore-time format;
  no extra notification blast was sent for the formatting change.
- Recurring scheduler returned `ok`, no errors or failure streak; subsequent
  unchanged ticks did not resend the publication. Receipt evidence is in
  `evidence/2026-10-17/telegram/acceptance.json` and screenshots alongside it.
- Deployment hash-checked policy, workflow, publisher, baseline, checkpoint and
  invocation ledger unchanged. No research/provider call was dispatched.

## Operations

`python -X utf8 deploy_telegram.py deploy` atomically updates only the reporter,
test and wrapper; creates a recoverable code backup. `schedule` is idempotent;
`tick` runs reporting only. Do not rerun team provisioning or reset ledgers.

To stop Telegram delivery, disable **QT Manager Telegram reporting** in the
Manager's Scheduled Jobs. This does not stop research. Restore code from the
timestamped `telegram-runtime/backups/` folder if needed; preserve delivery state
to avoid duplicate messages. Token rotation updates only the protected token file.

The reporter and Hermes share a VPS: a complete VPS/gateway outage cannot deliver
an alert through itself. External uptime monitoring is a separate future facility.
No claim is made that all remaining venue research is complete: at setup, 2/174
branches had been reviewed by this team, with 172 still in the review queue.
