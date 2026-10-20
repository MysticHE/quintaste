> Historical research acceptance. The later production integration and actual live publication are documented in [PRODUCTION-ACCEPTANCE-2026-10-17.md](PRODUCTION-ACCEPTANCE-2026-10-17.md). Outbox-only limitations below describe the earlier run.

# QT team live acceptance — 17 October 2026

Owner-authorised private Hermes setup on the existing Hostinger VPS. This report
concerns the research service; no QuinTaste app release or database update is
implied. The main operator guide is [README.md](README.md).

## Installed and checked

| Profile | Assignment | Recurrence |
| --- | --- | --- |
| QT Manager | Fixed dispatcher, independent review, dated outbox and status | Daily, 03:00 Asia/Singapore |
| QT Explorer | Existing vegetarian/vegan branches, menus/prices, hours, location, source links and cover evidence | Monthly cycle, bounded daily continuation |
| QT Cooker | Up to two easy vegetarian/vegan recipe candidates; original image candidates after review | Monthly; image queue continues on later runs |
| QT Event | Upcoming Singapore vegetarian/vegan events with organiser evidence | Weekly discovery; daily checks within seven days |

All four profiles appeared in the authenticated gateway roster and the rendered
Hermes Desktop. The **QuinTaste Team** group contains these four profiles; the
existing Research & Build Team was preserved. A real QT Manager Desktop reply
used the read-only status tool and correctly reported the saved partial trial,
including its recipe validation failure and absence of app publication.

The scheduler acceptance job `45cd9d020e28` actually ran at
`2026-10-17T05:49:45.598730Z`, as UID 10000 under the QT Manager profile, and
completed with status `ok`. It is a completed one-shot, not a recurring job.
The recurring job is **`1d0f99df35ff`**, `QT Manager daily coordination`, with
cron expression `0 3 * * *`. It is enabled; its first scheduled execution is
**18 October 2026, 03:00 +08:00**. Repeating setup returned the same job ID.
Desktop displayed this job and its next-run countdown.

## Real research trial

The first run, `20261017T054526Z`, completed venue and event research plus
independent Manager review. Its status was **partial**: a successful recipe
response used an explicit prep/cook/total timing object where the validator
expected a numeric total. Normalization now preserves the supplied split and
uses the explicit total; it never invents missing timing.

The initial QT extract-provider setting was also corrected to a QT-only shared
cache wrapping the existing Firecrawl extraction backend. Original profiles were
not changed. Explorer's initial checkpoint was reset for the two affected venues,
with the original evidence and an audit receipt retained. The successful recipe
inference was recovered without another recipe-source extraction or model call.

The corrected run **`20261017T055940Z` passed**, completing at
`2026-10-17T06:18:17Z`, with zero final operational errors. It reviewed two venues
and recovered two recipe candidates. Manager retained Whole Earth's narrow
source/channel-evidence additions and the tomato-and-egg recipe for editorial
review. Bodhi Deli's address/hours proposal and the basil-tofu recipe remain held;
the latter has unconfirmed dark-soy ingredients incompatible with a definitive
Vegan classification. Neither recipe is kitchen-tested. A deterministic check
found no exact ID/title match against the 18-recipe baseline; semantic duplicate
review and publication checks still apply.

The Hermes container was replaced at `2026-10-17T06:09:05Z` during the first image
attempt, after its research and Manager outbox were saved. Recovery reused that
outbox and made **zero additional research/Manager calls**. Its initial local
preflight found an existing output directory; that recovery defect was fixed and
regression-tested. All three image reservations remain charged: the interrupted
provider request, the local preflight failure (no provider call), and the successful
generation. October's three-attempt allowance is now exhausted; it was not reset.
The checkpoint is now persisted immediately after outbox creation, before images.

The successful original tomato-and-egg cover used the existing Hermes image
provider (`openai-codex`, `gpt-image-2-high`). It is **960 × 720, 134,951 bytes**,
SHA-256 `045766be5f3aff5bbfadf23bbf0b72ba5d98d949310829075dcc9d811bdb66d7`.
Visual inspection passed for an editorial preview: tomato and scrambled eggs,
no extra garnish/rice, no text/logos, and a clean bowl crop. This is generated
recipe artwork, not evidence of a cooked/tested dish or a venue photograph.
[Preview](evidence/2026-10-17/tomato-egg-cover.jpg),
[final run](evidence/2026-10-17/final-run.json), and
[visual review](evidence/2026-10-17/image-visual-review.json) are retained locally.

The first event packet contains eleven outcomes: two upcoming candidates, four
holds and five exclusions. Manager independently checked the useful proposals:

- [Little Green Kitchen — Indian cooking masterclass](https://littlegreenkitchen.com.sg/product/authentic-indian-cuisine-masterclass/),
  29 October 2026. Fee currency, registration deadline and remaining seats were
  not assumed.
- [Geylang Serai CC — vegetarian cooking workshop](https://www.onepa.gov.sg/courses/vegetarian-cooking-workshop-c027244070),
  4 December 2026. Mandarin demonstration, a fee range and separate ingredient
  charges remain explicit; vegan suitability is not established.
- Reviewed Tzu Chi general programmes lacked explicit vegetarian/vegan event
  relevance; two cooking listings were past. These were excluded from upcoming
  candidates, without concluding that Tzu Chi has no future qualifying events.

All research dates are 17 October 2026. These are review candidates, not confirmed
registrations, guaranteed availability, app records or kitchen-tested recipes.

## Reliability and isolation

- Thirteen local contract tests pass, including source requirements, assigned-venue
  completeness, bad dates, recipe structure/diet scope, invocation caps, event
  cancellation/holds, timing normalization, image continuation without repeats,
  and recovery into an existing output directory. Python compilation and exact
  local/VPS code comparison pass.
- A real cached Whole Earth page was read with the upstream method configured
  to fail if called: cache reuse passed, with zero network calls and the original
  fetch date preserved. The separate mocked cache test also verified first-fetch
  versus repeated-fetch behavior and private/Google URL rejection.
- Shared extracted content is capped at 400 documents / 64 MiB. Request logs
  rotate at 8 MiB with one previous log. The cache retains source hashes and
  recognised blocked-source backoff. Raw run evidence is retained separately;
  it is not covered by the cache-size limit. A 2 GiB free-space guard stops new
  work before the disk fills. No existing evidence was deleted.
- Scheduled workflow caps: eight text-model invocations per day, 180 per month,
  and three image attempts per month. Failures consume reservations. These are
  invocation caps, not a currency-spend guarantee or a count of internal search
  provider operations. Ordinary owner chats are outside the workflow dispatcher;
  the live Desktop acceptance call was manually included in its ledger.
- Root-owned fixed scripts dispatch UID 10000 workers with web tools; interactive
  profiles also have the read-only status tool. No terminal, database, deployment,
  messaging or cron-management tool is granted to the models. Profiles share the
  trusted container and are not separate OS sandboxes.
- Existing Hermes, Researcher, Coder and Reviewer configuration, environment and
  role files were hash-checked unchanged during QT provisioning. A separate
  concurrent gateway/HTTPS update subsequently changed their configuration files
  and replaced the container; those changes were preserved. The new HTTPS
  connection retained all eight bots and both groups after login/relaunch. Its
  separate password-setup screen was left unchanged. OAuth stores were not copied.
  No MCP or Codex profile settings were changed. Final Desktop launch PID 8760
  has no remote-debugging argument; diagnostic port 49161 was verified closed.

## Publication and remaining scope

The initial baseline contains 174 venues and 18 existing recipe identities.
This acceptance run samples two venues; it does not complete the monthly review
of all 174. Known venue source holds and existing covers remain in place. Missing
or uncleared venue imagery is held; AI enhancement does not grant reuse rights.

The bots save validated drafts and Manager decisions under
`/opt/data/qt-team/outbox`. The current application bundles reviewed catalogue and
recipe data, and has no researched-external-event publication adapter. A future
publisher must reject a stale baseline, validate source/asset provenance and app
schemas, preserve IDs and holds, and use the existing release/rollback runbook.
These bots have no direct production database connection. Existing member-hosted
gatherings are not repurposed as an external event directory.

Current accepted output is **ready for editorial review**, not automatically
approved. Source conflicts, missing currency/hours, unresolved compound-ingredient
claims, image rights and visual review remain explicit holds. Re-check the baseline
after an app catalogue update before accepting any proposal. Retention monitoring
and an app publication adapter remain separate work.

The current image automation produces recipe previews. Explorer keeps current
venue covers and proposes branch-matched, rights-supported enhancements; automatic
venue-reference enhancement/publication is not connected by this setup.

## Storage and final runtime checks

At 06:19 UTC the QT workspace occupied **1,700,265 bytes**; its shared source
cache contained **27 documents / 299,135 bytes**, with **four cache hits** recorded.
The four Hermes profiles occupied **162,744,524 bytes**, mostly four copies of
Hermes's native `tirith` binary (38,911,512 bytes each), rather than research data.
The original generated PNG in the private provider cache is 2,339,246 bytes; the
review JPEG is 134,951 bytes. Free VPS space was **24,254,595,072 bytes**. These
native components and private evidence were preserved, not deduplicated or deleted.

Seven text-model invocations and three image reservations were recorded. The app
health endpoint returned HTTP 200 after recovery. No app assets, menu/recipe bundles,
database records or application deployment were changed. Source caching is separate
from the app's existing pagination, lazy images and account-isolated caches.

## Evidence locations

- VPS workspace: `/opt/data/qt-team`.
- Scheduler/profile data: `/opt/data/profiles/qt-manager/cron/jobs.json`.
- Trial receipts: `runs/20261017T054526Z` and `runs/20261017T055940Z`.
- Source cache acceptance: `state/cache-acceptance.json`.
- Checkpoint repair audit: `state/acceptance-repair.json` and preserved prior state.
- Workstation copies and screenshots: `%TEMP%\qt-hermes-setup`.
- Source, role and policy implementation: this directory.

The Google research ledger is unchanged: **2,419/2,500, 81 remaining**,
1,045,377 bytes, SHA-256
`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`.
This workflow permits zero Google Maps/Places requests. Durable selected evidence
is under [evidence/2026-10-17](evidence/2026-10-17/); private raw transcripts remain
on the VPS and in the temporary operator collection.
