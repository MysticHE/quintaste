# QT bots: remaining gaps and next-session handoff

Saved 17 October 2026, Asia/Singapore. This is a continuation checkpoint, not a
claim that all catalogue research or unattended operation is complete. The owner
requested documentation and a new-session prompt; no new research/deployment was
started for this handoff. Scheduled jobs were not paused or changed.

## Read first

- App: `C:\Users\huien\qt\quintaste\AGENTS.md`
- App handoff: `.codex/menu-sync-handoff-2026-10-16.md`
- Source register: `docs/research/MENU_SOURCE_REGISTER.md`
- Whole-menu fix: `docs/research/qt-full-menu-audit-2026-10-17.md`
- Exact evidence: `data/menu-research/qt-full-menu-audit-2026-10-17.json`
- Deployment: `docs/DEPLOYMENT_RUNBOOK.md`
- Bots: `C:\Users\huien\HA\companion-api\ops\qt-team`

Read applicable HA instructions too. This work concerns the existing Hermes QT
team, not Morphlet. Preserve concurrent app/page/navigation and HA work. Inspect
the actual live release and checkpoints before acting; older chronological
release statements in the documentation may have been superseded.

## Completed and verified

- QT Explorer now receives the full menu denominator, with resumable assignments
  of up to 80 exact section/item IDs. Removed the former 50-item truncation.
- Every assigned dish must receive a result. Independent Manager menu-audit
  approval is separate from other venue holds and publication approval.
- Zhen Xiang, 325 Woodlands Street 32: all 68 existing dishes assessed; 66
  source-backed name/price/channel findings approved, two held, zero unprocessed.
  All 68 live dishes and prices remain unchanged. No app write was needed.
- Telegram message 43 was corrected in place. Its screenshot shows empty search,
  All dishes selected and 68 dishes; caption gives the actual audit counts.
- 98 Python checks passed locally and on VPS. Deployed role profiles match the
  code; 24 release file hashes verified. The Telegram listener was active.
- Last read-only status check: no pending review, pending publication file or
  failed Telegram delivery. These are snapshots, not guarantees about later runs.
- Latest known app/preview release: `20261017-filter-cleanup1`, preserved by the
  bot-only deployment. Confirm actual live state before any further deployment.

Evidence lives locally under the bot workspace's
`evidence/2026-10-17/menu-coverage/`, including final-result.json, postflight.json,
source-web.txt, independent-source-comparison.json and live-full-menu.jpg.
VPS container path: `/opt/data/qt-team/runs/full-menu-acceptance-20261017/`.
Retain the first failed/overly broad Manager-hold receipt and corrected Manager
review; do not repeat Explorer extraction just to recreate evidence.

## Remaining work, in priority order

### 1. Automatic recovery from incomplete menu extraction

The successful test used a full public web-reader capture supplied by the
operator. The earlier automatic capture omitted most dishes. This does not prove
unattended full-source recovery. Add completeness detection and a bounded,
permitted recovery path using branch-specific sources and shared captures.
Partial/category-only pages must produce honest holds, not guessed verification.
Do not bypass access restrictions, repeat searches per dish or overwrite source
fetch dates with review dates. The original upstream timestamp of the imported
capture is unknown and is explicitly qualified.

Acceptance: a real unattended incomplete-capture case either obtains sufficient
evidence and accounts for all assigned items or records a specific recoverable
hold. No manual capture injection, fabricated completion or repeated fetch loop.

### 2. New and missing dish identity reconciliation

Two existing Zhen Xiang names are absent from the checked source:

- Crispy Vegetarian Roasted Chicken Rice Set
- Vegetarian BBQ Char Siew Fried Rice

Two source listings are not mapped to existing assigned IDs:

- Sambal Petai, SGD16.80
- Sambal Petai Rice Set, SGD8.50

Source checked 17 October:
https://www.foodpanda.sg/restaurant/fqw9/zhen-xiang-su-shi-zhen-xiang-vegetarian-325-woodlands-st-32

The fixed publisher currently updates supplied existing dish IDs; it does not
automatically integrate new dishes. Define and verify safe canonical matching,
reviewed additions and source disappearance handling. Absence from one page is
not proof of discontinuation. Preserve existing dishes and bookmarks; do not
silently rename, replace, delete or duplicate items. Any expanded publisher must
retain validation, exact-record concurrency, audit, rollback and Telegram controls.

Acceptance: approved additions/changes reach the owned app once, with exact
identity evidence and appropriate owner controls; ambiguous cases stay held.

### 3. Catalogue-wide monthly assessment

One of 174 menus has completed the new all-dish assessment, with two holds; the
other 173 still need this assessment. Zero bot monthly menus meet the new fully
verified standard at this checkpoint. Historical 22/174 counts were checklist
visits/spot checks, preserved in explorerAttempted; they do not prove 22 complete
menus. This does not invalidate earlier human research or erase published data.

Continue saved assignments fairly across venues. Separate assessed, verified,
held, pending and published counts. Unprocessed chunks resume; held findings
currently back off seven days; monthly verification resets next month. Review
previously documented hours/photo/price holds independently, not by inference.

### 4. Recipe quantity presentation

`src/utils/food-format.ts` still rounds 0.125 tsp to 0.1 tsp. Preserve accurate
small spoon quantities, scaled quantities and spoken accessibility labels.
Verify representative fractions, metric quantities and scaling in the rendered
recipe screen; use the deployment runbook for the app fix. Do not modify stored
recipe amounts to compensate for display rounding.

### 5. Full unattended overnight and image-path acceptance

A complete 01:00-05:00 SGT run under the corrected workflow remains unverified.
Test scheduler continuation, all roles, cutoff, budgets, crash recovery,
deduplication, independent review, publication/read-back, owner controls and
end-of-run reporting. Starting a run is not completion evidence.

Fresh image generation was excluded from the latest test because the separate
three-attempt monthly image allowance was exhausted. Preserve that limit; the
2,000 model allowance does not increase it. Do not claim a fresh image E2E pass
without actually validating it. Use existing approved image evidence where
applicable; document any quota-dependent outstanding check rather than bypassing
the quota. AI enhancement does not remove reference-image rights requirements.

## Constraints to retain

- Nightly window 01:00-05:00 SGT, research cutoff 04:15; existing scheduler.
- Shared monthly model cap 2,000, with Telegram alert at 80%. Last verified use
  29/2,000; re-read the append-only ledger before dispatching more calls.
- Google disabled. Preserve the existing 2,419/2,500 request ledger and its hash;
  no new paid/provider browsing calls in the consumer app.
- Owned /api/catalogue, pagination, bounded caches, conditional revalidation,
  cancellation, account isolation and lazy images remain intact.
- Recipe publication excludes the owner's five pungent vegetables and uncertain
  compound ingredients. This is not a blanket relabelling of all venue menus.
- Source URLs, source fetch/check dates, holds, owner removals and suppression
  records persist. No guessed hours, currency, ingredients or image provenance.
- Telegram: useful SGT messages; live changed-item visuals with exact Revert for
  edits or Delete for new supported items; one text-only completion summary.
  No interval spam or duplicate screenshots in summaries. Audit-only reviews
  must not claim publication or offer meaningless undo controls.
- Deployment and real production testing were authorized previously. Follow the
  runbook, preserve concurrent releases, and do not silently expand budgets.
- Never print/copy Telegram tokens, publisher keys or authentication stores.

## Operational entry points

Bot files: workflow.py, menu_coverage.py, publisher.py, telegram_reporter.py,
extract_cache.py, night_window.py, roles/qt-explorer.md, roles/qt-manager.md.

Regression command in the bot workspace:

```text
python -m unittest test_workflow test_publisher test_telegram_reporter test_learning test_night_controls test_recipe_policy test_publication_delivery test_menu_coverage
```

Guarded deployment examples: deploy_menu_coverage.py and
deploy_menu_coverage_v2.py. Do not blindly rerun them: backup names already exist,
and the first performs a one-time checkpoint migration. Use current hashes,
research/reporter locks and a new recoverable backup. Restore code/roles without
overwriting newer state or owner actions. VPS rollback folders:
`operator-tests/menu-coverage-20261017` and `operator-tests/menu-coverage-v2-20261017`
under `/opt/data/qt-team`.

## Overnight check, 18 October 2026, about 2 am SGT

The owner asked why the Greendot Plus Jewel report said 0/53. **This is not a
counting bug.** The live state is `research-greendot-jewel-changi-airport`:
53 dishes, 53 held, Manager approved the audit. Explorer held every dish because
its only recorded source, `orders.greendot.sg/?StoreID=...`, was captured as
1,564 bytes of promotions. Greendot Westgate shows the same pattern (50 held,
6 conflicting).

The ordering site ignores `StoreID` in server-rendered HTML. Jewel and Westgate
URLs return the identical default-store menu: same text and the same 78 product
IDs. Verifying from that page would have produced wrong-branch prices, so
holding was correct. `www.greendot.sg` rejects automated fetches (ModSecurity
406). That was not bypassed. Verification is tied to each section's recorded
`sourceUrl`, so Greendot branches need an editorial change to a branch-specific
source. More Explorer retries won't fix this.

No app data changed overnight. All runs from 17:00Z had 0 production writes.
The latest publication is still the 17 October 19:02 SGT seven-venue patch.
Events rechecked both live listings as unchanged. Cooker failed twice with
`Invalid duration`. That was a real bug: the normaliser rejected `rest`/`estimated`
timing keys, and its daily failure breaker then stopped Cooker for 18 October.

Local fixes in the bot workspace (101 checks pass):

- Cooker timing accepts `rest` and a boolean `estimated` label (source split kept).
- A capture whose bytes match another query variant of the same page (an ignored
  branch parameter) downgrades a verified dish to held with an explicit reason.
- Menu review captions say audit-only/no app change, group hold reasons with
  counts and give the recheck date, instead of listing two dish names.
- Coverage/status/run reports show assessed vs fully verified locations and
  verified/held/pending dish totals, replacing the bare `0/174`.

Deployment status: `deploy_report_fixes.py` is pending owner confirmation.
