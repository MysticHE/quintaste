# QT team configuration and learning audit

Follow-up: the owner subsequently authorised the
[reviewed learning loop](LEARNING-LOOP-2026-10-17.md), deployed at 4:35 pm SGT.
The findings below describe the earlier audit, before that implementation.

Checked the live VPS at **17 October 2026, 4:21 pm SGT**. This was a read-only
configuration/execution audit; no research, generation, quota increase or profile
permission change was dispatched. Evidence: `evidence/2026-10-17/team-audit.json`.

## Result

All four live role instructions match their local files and profile SOUL.md hashes.
All profiles use gpt-6.1-sol through the existing openai-codex provider, xhigh
reasoning, Asia/Singapore timezone, 18-turn / 480-second profile limits, and the
approved web/qt_team tool sets. No autonomous code/skill/memory-writing tool is
provided to the scheduled research invocation. The live gateway-security plugin
is present and was preserved, together with existing authentication settings.

| Bot | Verified assignment | Recurrence and retained context |
| --- | --- | --- |
| QT Manager | Independent research review, final exact-payload/image review, fixed publisher | Daily 3:00 am coordinator; outcomes, receipts, pending packets |
| QT Explorer | Existing vegetarian/vegan branch evidence and targeted field/price updates | Monthly cycle continued daily; up to eight assigned venues/day, oldest/unreviewed first |
| QT Cooker | Easy sourced vegetarian/vegan recipe proposals, structured ingredients and image briefs | Up to two candidates/month; existing recipe names and prior candidate names prevent repeats |
| QT Event | Official upcoming Singapore vegetarian/vegan events | Weekly discovery; daily checks for events within seven days; saved event metadata |

The daily coordinator's first regular run is scheduled for **18 October, 3:00 am
SGT**. It has not yet executed as a recurring job. Prior scheduled acceptance runs
and real worker/provider sessions are recorded; the production acceptance published
one venue update, one recipe and two events. Those acceptance receipts do not prove
future unattended reliability or complete catalogue coverage.

Telegram reporting is a separate no-model job, last checked `ok`, no pending
delivery, and all user-facing reporting uses Singapore time.

## What currently improves over time

Source captures, branch checkpoints, known recipe identities, upcoming events and
publication outcomes accumulate. The extraction cache reuses recent captures and
backs off blocked sources. Identical reviewed proposals are not republished.
These improve continuity and avoid repeated work; they do not train the model.

## What is not implemented

- No dedicated feedback-to-lessons loop, lesson approval store or automatic
  injection of past rejection reasons into every new worker prompt.
- No populated native memory files found in the four profiles. Recorded tools
  show source extraction and Manager status/image review, not memory/skill writes.
  Bundled skills on disk are not evidence of learned QT-specific procedures.
- No quality trend evaluation proving that accuracy rises with repeated runs.
- Held recipe names are remembered for deduplication, but there is no dedicated
  targeted retry queue that feeds their rejection reasons back to Cooker.
- Telegram is a fixed read-only command interface. Freeform corrections sent
  there are not currently learned or turned into content-edit requests.

The four roles use the same underlying model in separate invocations. Manager
review and deterministic validation provide additional checks, not independent
model diversity or a guarantee against shared reasoning errors.

## Capacity and controls

Current limits remain eight normal model calls/day, 180/month and three image
attempts/month. October has used all three image attempts; no more generation
should be expected before the normal monthly reset unless the owner changes the
budget. Google calls remain disabled and the previous 81-request remainder is
preserved. The once-only acceptance allowance remains date-bound and consumed.

Explorer currently has two reviewed branches out of 174; 172 await team review.
Forty-three source-cache JSON files total 444,023 bytes. No claim of complete
menu/hours/photo coverage was made by this audit.

## Recommended next increment

Add a bounded structured lessons store populated from verified failures and
corrections. Manager should review evidence-backed proposed lessons, inject only
relevant approved lessons into each worker's next context, track repeated-error
rates, and maintain a dated retry queue for held candidates. New prompt/procedure
versions should pass fixed evaluation cases before activation and support rollback.
Lessons must never override budgets, source requirements, tool restrictions or
publication gates. This recommendation has **not** been enabled by this audit.

Verification: all **40** existing workflow, publication and Telegram tests passed
again during the audit. No new paid run was needed to inspect the setup.
