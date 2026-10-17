# QT publication and Telegram recovery — 17 October 2026

All seven previously blocked venue records were published at **19:02:20 SGT**.
Batch `qt-20261017-101937`; revision
`aadde24d8ea94d2c13eb94bf48e0edd9ce39cdd2bed47520ab5c987f74997548`.
Telegram delivered seven live screenshots, message IDs 36–42, by 19:03:13 SGT.
Each has an Open venue link and a record-bound **Revert this update** action.
No new model, image or Google calls were needed. Exact approved payloads,
source URLs, source check/capture dates and live verification are retained in
[the evidence JSON](../../data/menu-research/qt-publication-recovery-2026-10-17.json).

## What was published

| Branch | Reviewed publication |
| --- | --- |
| Greendot Bedok Mall | Source-reference update; retained patisserie reference remains unverified |
| Greendot Bukit Panjang Plaza | Rechecked daily 11:00–21:00 hours, evidence/notes and source references |
| Greendot Junction 8 | Source-reference update; retained patisserie reference remains unverified |
| Greendot Jurong Point | Source-reference update; retained patisserie reference remains unverified |
| SHU Vegetarian, 354A Woodlands Avenue 1 | Source-reference correction; mismatched Oddle source excluded from the new reference list; prior Facebook qualification retained |
| Greendot Star Vista | Source-reference update; retained patisserie reference remains unverified |
| Zhen Xiang Vegetarian, 325 Woodlands Street 32 | Reverified delivery-channel Western Vegetarian Pork Rib Rice Set at SGD7.80 |

The hours summary and SGD7.80 price already existed in the packaged catalogue.
This batch renews evidence and corrects references; it adds **zero venues,
dishes or covers** and does not imply a visible change to every gallery card.
The original menu's overall source date is retained: one price check is not a
fresh verification of every dish. No source hold was cleared by retaining a URL.

## Failures and fixes

1. An unrelated owner recipe deletion changed the global editorial revision
   during Manager review. The publisher rejected all seven venue patches before
   comparing their record hashes. Venue-only batches now survive an unrelated
   revision change only if **every affected effective record still exactly
   matches its approved expected hash**, under the existing publication lock.
   Approval bytes, review hash and batch identity remain unchanged. A changed
   venue, invalid approval, missing evidence or owner suppression still blocks.
2. The first recovery attempt exposed a second 422 rejection: the validator
   demanded new captures for existing patisserie/Facebook references. It now
   permits only references already present in that branch's current overlay,
   packaged hours/photo or exact menu sections. Newly introduced URLs and all
   factual hours/price changes still require attached captures. Retained,
   uncaptured URLs are explicitly recorded in change metadata.
3. Telegram previously selected at most one venue and three total items from
   only the latest publication. Reporting now reads durable publication receipts
   and tracks each record separately. Publication wakes a bounded reporting
   worker immediately; the scheduled reporter remains recovery. Each screenshot
   releases the reporter lock before the next item, allowing owner actions.
   Screenshots and controls are checked against the current exact change.

Existing venue updates restore their prior overlay, or their packaged baseline
when no overlay existed. This is a **per-item revert**, not a whole-catalogue
rollback. It preserves other publications and owner removals, rejects stale
buttons, persists idempotent action receipts and prevents the same rejected
proposal from automatic republication. Existing recipe/event edits also support
Revert; newly added recipes/events retain one-click Delete with identity
suppression. The publisher still cannot introduce unknown canonical venues.

Captions identify branch, publication time in SGT and reviewed fields; unchanged
hours and price checks are not presented as newly discovered facts. Captions on
the seven messages were clarified in place, without sending duplicates. Automatic
end-of-run summaries remain text-only; no interval status spam was enabled.
Capture/delivery failures are visible in status/end summaries.

## Deployment and verification

- App **20261017-qt-publication4**, built through publication3 on the actual live
  **20261017-browse-controls2** base. Only `server/editorial/store.mjs` and
  `router.mjs` differ cumulatively. Preview stays browse-controls2; admin and DB
  were not recreated. All 176 dist files, including the 16 API bundles and client
  UI, are byte-preserved. No PostgreSQL migration or content deployment is needed
  for subsequent approved publications.
- Backup, exact-live-base and zero-active-avatar-job gates passed. App, preview,
  admin and DB healthy; public health/content routes 200; zero app error lines.
  Rollback snapshot: `deployment-backups/20261017-qt-publication4` (app publication3).
  Keep the editorial volume and owner-action archives; do not restore an older
  active snapshot over subsequent owner actions.
- **38 backend integration checks** pass, including signed API publication,
  exact-item revert, idempotency, stale actions, missing evidence, retained links,
  removal preservation and republication suppression. All **86 bot checks** pass
  on the Hermes VPS. TypeScript and scoped backend ESLint pass.
- Live browser checks render Greendot hours, the exact Zhen Xiang dish at SGD7.80,
  SHU source details and the existing external event. No runtime errors or
  Google/provider requests. Seven real reporter screenshots use owned app
  requests only, with zero blocked external hosts. Screenshots visually inspected.
- Every published record's effective hash and public API fields match its
  approved publication. All seven conditional catalogue checks return204.
  All seven Telegram deliveries have message receipts and Revert controls.
  Revert mutations were exercised against isolated production-shaped content,
  not by undoing the owner's real updates as a test.
- Three owner recipe removals are preserved. Zero bot recipes and two bot events
  remain live. No pending publication remains for this batch.

## Coverage, storage and limits

Monthly review remains **22/174 branches**, 152 pending; research runs 01:00–05:00
SGT. Model allowance remains 26/2,000 with the 80% alert. Google ledger and image
allowance were untouched. Catalogue coverage remains 173 covers/120 hours records;
1 cover, 54 hours records and 3,387 unknown menu prices remain unresolved. The
reverified price was already present, so it does not reduce the gap count.

The server atomically replaces a bounded 8 MiB editorial snapshot. Per-item history
uses existing revision archives and backups; no duplicate image assets or new
database tables were introduced. Public catalogue JSON excludes change-history
payloads; paginated 20-item browsing and conditional revalidation are preserved.
Telegram keeps bounded queues/actions and recursively accounts for screenshots
within its 30-publication/60 MiB media limit. An already-open app can retain cached
data until its next online revalidation (up to 15 minutes; offline limits remain).
This is verified server publication and notification delivery, not a claim that
all research gaps or every physical-device scenario are complete.

Local evidence: `.local/qt-publication-recovery/` and
`C:/Users/huien/HA/companion-api/ops/qt-team/evidence/2026-10-17/publication-recovery/`.
VPS evidence: `/opt/data/qt-team/runs/publication-recovery-20261017/`.
