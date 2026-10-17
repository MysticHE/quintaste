# Telegram response, reporting preferences and event discovery

17 October 2026, Singapore time. App/preview release
`20261017-event-discovery2` is deployed from `20261017-review-hardening1`.
Only `src/screens/meet/Home.tsx` and `src/components/social/ExternalEvents.tsx`
changed in the release. Existing Social/Market review fixes and all 16 API
bundles are preserved. Concurrent BrowseHeader changes remain in the workspace
and were excluded from this isolated release.

## Findings and changes

The owner's real Delete recipe now tap reached Telegram and passed the owner
check, but waited for the reporting job. Its one-minute interval is measured
after completion; a scheduler tick can add another minute. A manual reporter
tick processed that real update, removed `sweet-potato-ginger-pandan-soup`, and
delivered confirmation message 30. This was a real user tap. All three bot-added
recipes are now removed, with suppression/audit records retained. The two
organisation events remain published.

The new persistent `qt-telegram-listener.service` performs single-consumer
20-second long polling and acknowledges owner callbacks before app transport
or screenshot locks. Long polling returns as soon as an update arrives; it is
not a 20-second delay. State/offset writes, exact-record checks and idempotent
removals are unchanged. Interactive replies take priority over photo delivery.
The existing scheduled reporter is a polling fallback when the listener is down.
The service runs as UID/GID 10000, restarts on failure, and can write only the QT
state directory under its systemd filesystem restrictions. It makes no AI or
Google calls. The owner's `/status` was processed at 6:26:58 pm and its Telegram
send receipt arrived 0.71 seconds later; end-to-end phone latency was not measured.

Owner reporting preference: **live screenshots for newly published/updated
items**, with Open/Delete controls; **one text-only summary when the run ends**.
No periodic status/digest messages and no duplicate screenshots in that summary.
Manual `/status`, `/latest`, delete receipts and 80%/100% budget alerts remain.
Intermediate research errors remain in saved evidence and the final report.

The Events screen previously defaulted to Gatherings and hid Local events inside
an options menu. Published organisation events were available through the API
but invisible in the default category. Events now defaults to Local events and
shows category choices openly. Explicit category links/selections still work.
Local events has loading and no-match/empty messages; pagination, source links,
cache policy and member gating for gatherings remain.

During Manager review, the owner's deletion also changed the publication parent
revision. The app correctly rejected the stale venue batch with 409. Publisher
now archives an explicit baseline-conflict rejection and requires fresh review;
it never silently rebases approved bytes. The real seven-venue rejected batch
was reconciled with zero writes and zero new research calls. Its source evidence
and historical errors remain. Those venue updates still await fresh review.

## Verification and deployment

- 81 bot checks passed locally and on the VPS.
- Local TypeScript passed; uncached lint checked 500 source files with zero
  errors/warnings. Clean web export passed. The first cached export contained
  stale UI: browser QA caught it before promotion. `event-discovery1` was never
  deployed. Release 2 used `expo export --clear` and exact asset verification.
- 24 local browser checks passed: actual published events, category navigation,
  search/clear, details/registration, reload, 375/1440-point light layouts and
  320-point enlarged-text dark layout. No horizontal overflow, page errors or
  Google/AI provider requests. The same 24 checks passed against production.
- Backup, exact-current-base and zero-active-avatar-job gates passed. Only
  app/preview were recreated; admin/database containers remained healthy.
  Rollback snapshot: `/docker/quintaste/deployment-backups/20261017-event-discovery2`.
- Exact live web bytes and both Android/iOS signed manifests and current bundles
  passed. Native bundle sizes are 8,305,747 and 7,682,080 bytes. Public health is
  200; the two-event response is 2,021 bytes and the zero-bot-recipe response is
  118 bytes. Physical-device appearance is unverified. One-hour results are
  recorded separately after the run finishes.

Local app evidence: `.local/qt-live-controls/` (scope, local/live browser results,
screenshots, native transport, build and promotion logs). Hermes evidence:
`evidence/2026-10-17/owner-recipe-controls/follow-up-verification.json`.
Live bot receipts: `/opt/data/qt-team/operator-tests/e2e-20261017T093920Z/`.

The original eligibility/control report remains historical evidence:
[owner recipe rule](qt-recipe-policy-controls-2026-10-17.md).
Telegram acknowledgement and inline-button behavior use the
[official Bot API](https://core.telegram.org/bots/api#answercallbackquery).
