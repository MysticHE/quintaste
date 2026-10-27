# QuinTaste Hermes team

Telegram follow-up, 17 October 2026: **@QTManager_bot** now delivers owner-only
publication screenshots, concise updates in Singapore time, daily 8:00 am
summaries and owner-confirmed moderation. The independent no-model reporter
continues outside the 1?5 am research window. See
[Telegram setup and verification](TELEGRAM-REPORTING-2026-10-17.md).

Following the [17 October team audit](TEAM-AUDIT-2026-10-17.md), the
[reviewed learning loop](LEARNING-LOOP-2026-10-17.md) is now deployed. It nominates
procedures from historical reviews, uses existing Manager calls for approval,
feeds approved lessons into later research, and queues bounded rechecks of held
records. Ten initial candidates await review; improved accuracy is not yet proven.

Review correction, 17 October 2026: event rechecks now merge partial event fields
with saved metadata and validate the resulting active records before advancing
the discovery checkpoint. Malformed older records are passed to fresh discovery
for recovery instead of crashing the upcoming-event scan. Eighteen workflow
tests pass, including a failed-run checkpoint regression. The event-only fix is
deployed; checkpoint, policy, baseline and budget files were hash-checked intact.
Backup: `/var/lib/hermes-desktop-setup/qt-review-fixes-20261017T065128Z/`.

Owner-authorised setup, 17 October 2026. The four private VPS profiles are
**QT Manager**, **QT Explorer**, **QT Cooker** and **QT Event**. They use the
owner's existing Hermes provider routing and appear under Hostinger VPS in
Hermes Desktop. This is independent of the Morphlet desktop product.

Open **Bots → QuinTaste Team** to find the team, or open **QT Manager** directly
for status. Its **Scheduled Jobs** panel contains the single recurring coordinator.
Use the Manager conversation for routine status requests; a group message is
visible to every member of that group.

## Scope and publication boundary

- QT Explorer reviews the existing 174 published vegetarian/vegan branches,
  preserving the 175 retained menu IDs, source holds and Google request ledger.
- QT Cooker prepares simple vegetarian/vegan recipe candidates using QuinTaste's
  seven existing categories, ingredient/step structure and dietary uncertainty.
- QT Event verifies upcoming Singapore events from organisers such as Tzu Chi.
  Old events, uncertain dates and unrelated charity activities are excluded or held.
- QT Manager coordinates due work through the fixed workflow and independently
  reviews worker outputs. Deterministic validation happens before the review outbox.

**Research output requires final Manager approval before publication.** The owned
publisher is deployed in QuinTaste release `20261017-qt-publisher2`, based on the
then-live `20261017-open-market2`, and now preserved by app `20261017-qt-management2`, based on `20261017-menu-reviews3`. The fixed workflow reads current app hashes,
collects bounded proposals, performs research review, generates eligible images,
then asks QT Manager to review exact payloads and inspect the actual image pixels.
Only approved records and images reach the signed publication endpoint. A verified
live receipt, not a model statement or an outbox file, establishes publication.

Content changes are small atomic batches in persistent VPS JSON snapshots and
immutable JPEG assets. They do not need a new app deployment each time and do not
write PostgreSQL or create member-hosted gatherings. Explore keeps `/api/catalogue`;
Cook gains owned paginated recipe delivery; Social's **Local events** list contains
external organiser listings. A new image gets a new content-hash URL. Fresh client
caches last 15 minutes, with conditional revalidation on subsequent focus/foreground;
there is no continuous polling or instant push to an already-open screen.

The adapter permits exact-branch hours, coordinates, diet/allium evidence, source
notes, approved cover replacements and price patches for existing stable dish IDs
and matching sales channels. New branch identities, address corrections, new dish
extraction and unsupported currencies remain held for operator review. Existing
published recipes can receive reviewed revisions; confirmed event cancellations
can remove live listings. Models never receive SQL/SSH tools or the dedicated
signing secret; only the fixed adapter can use it.

## Schedule

QT Manager resumes work during **01:00?05:00 Asia/Singapore daily**, with checkpoint
ticks every 15 minutes and no new research after 04:15. A process supervisor ends
work by 05:00. Cooker sources up to two candidates daily; Event checks saved
future listings daily and discovers weekly; Explorer resumes unreviewed branches
through the monthly queue. Manager reviews and publishes small approved batches.

Owner rule (18 Oct 2026): **no AI call, image or daily cap**. Every call is still written to `state/usage.jsonl` and shown in Telegram /status ("no monthly cap"). Old run folders are compressed into `archive/` after 14 days, so the run archive limit never stops the bots. Google remains disabled pending billing-account/SKU reconciliation.

Use **/manage** in the paired Telegram chat to select and confirm deletion of a
bot-published recipe or event. Deletion preserves an audit copy and prevents
matching identities from being republished. Online app caches may take up to
15 minutes to reflect the removal; offline content may persist for 24 hours.

See [nightly workflow, moderation and verification](NIGHT-MANAGEMENT-2026-10-17.md)
for exact boundaries, release evidence and remaining acceptance work. The first
regular window is **18 October, 1 am SGT**; it has not run yet.

## Evidence and images

The QT-only `qt-evidence` extraction backend wraps the existing Firecrawl backend.
It caches a shared source for 24 hours, retains its fetch date and content SHA-256,
deduplicates URL fetches and backs off recognised blocked sources for 30 days.
The cache is limited to 400 documents / 64 MiB. Reading cached content does not
refresh its original fetch date or establish merchant verification. Source logs
record URL, capture date, hash, cache reuse and errors. Searches are separate.

Images run only through Hermes's existing image tool/provider. Original recipe
illustrations are generated from the reviewed recipe ingredients and brief,
hashed, resized to a bounded JPEG and held for visual review. Failed attempts are
not automatically repeated. Existing Explore covers are kept; unclear branch
matching or reuse rights remains a hold. AI enhancement does not remove source
rights. No venue photographs are invented to fill gaps.

## Veg Kitchen additions (20 October 2026)

QT Explorer's `veg-kitchen` task finds places Explore does not list yet that are **fully** vegetarian or vegan: the venue's own
page, its own name or its Google Maps vegetarian/vegan restaurant category must say the whole kitchen is (owner, 20 Oct 2026; a
delivery-app category is never proof). Menus may come from the branch's own delivery listing, where "$" is SGD. The coordinator checks that statement, the
name, the postcode and every menu item's name and SGD price against stored captures (`veg_kitchen_check.py`), QT Manager reviews,
and the publisher adds the place as kind `place` with an id `vk-...`. Telegram sends "Added to Explore (Veg Kitchen)" with Remove
per place. The 24-hour Round runs one parallel wave of four-place workers per round (`Round.veg_kitchen`, before Mixed Kitchen,
which keeps the rest of Explorer's time); published places are rechecked every 30 days and two failed statements in a row ask
for Remove / Keep. State is `state/veg-kitchen/{queue,progress}.json`, separate from Mixed Kitchen (`state/veg-options`).

```powershell
python -X utf8 veg_kitchen_queue.py build enrichment.json identities.json leads.json queue.json --live-places live.json
python -X utf8 deploy_veg_kitchen.py queue.json          # guarded; add --replace-queue to replace an installed queue
# supervised pilot, inside the Hermes container as UID 10000 (takes the run lock; never changes the schedule):
docker exec --user 10000 --workdir /opt/hermes hermes-agent-yril-hermes-agent-1 python /opt/data/qt-team/run_veg_kitchen_pilot.py --places 16 --hours 4
```

## QT Videomaker: members' AI recipes (21 October 2026, built, not deployed)

`ai_recipes_bridge.py` writes members' AI recipes for the app when Admin > Operations > **AI recipes by QT bots** is on.
It claims one task at a time from the app's signed `/api/ai-recipes/bot/*` routes (same key as editorial publishing),
downloads the task's video, runs Hermes as the `qt-videomaker` profile (`roles/qt-videomaker.md`; `-t video` for
videos, `-t web` for dish requests) and posts the recipe JSON or `{"error"}` back. The app checks, photographs and
saves it. There is no fallback to Gemini. Every call goes in `state/usage.jsonl`; the last task is in
`ai-recipes/last.json`. Install with `deploy_videomaker.py` after the app's schema v3 and release
(`docs/AI_RECIPES_PLAN.md` §4). It adds `qt-ai-recipes-bridge.service` on the host and touches no research schedule.

## Mochi kitchen feed (27 October 2026, built, not deployed)

`kitchen_feed.py` builds the public snapshot behind the app's `/kitchen` page (`docs/MOCHI_KITCHEN_PLAN.md` §4) and pushes it to
the signed `/api/kitchen/bot/feed` route with the publisher key.

- **Sources:** verified receipts in `state/publications/`, Manager outcomes (each hold reduced to a fixed category), QT Gamer's
  owner-approved pictures, `ai-recipes/done.jsonl` (counts only) and the run folders for each chef's working or resting state.
- **Checks:** it reads the live editorial state first and drops anything the owner reverted or deleted, or staff hid. Items
  appear 30 minutes after publication, and the snapshot stays under 16 KB.
- **Run:** `python kitchen_feed.py` prints the snapshot; `--push` sends it.
- **Install:** `deploy_kitchen_feed.py` installs it with a 15-minute `qt-kitchen-feed.timer`. Deploy the app first.
- **AI recipe counts:** `ai_recipes_bridge.py` now appends one `{at, ok}` line per task to `ai-recipes/done.jsonl` for these counts.
  It needs its own redeploy (`deploy_videomaker.py`).

## Isolation and storage

The existing Hermes container executes the QT workflows as UID 10000. The four
profiles have separate state, web tools and read-only `qt_team_status` and
`qt_review_image` tools: no terminal, arbitrary code,
file-writing tool, messaging, cron-management or production database tool.
The owner-controlled scheduler script saves the outputs. Authentication uses
Hermes's supported root credential fallback; no OAuth store or Codex profile
credential was copied. Existing Hermes/Researcher/Coder/Reviewer configuration is
preserved. Profile separation is organisational; profiles share the trusted Hermes
container and are not four separate operating-system sandboxes.

VPS workspace: `/opt/data/qt-team` (host `/docker/hermes-agent-yril/data/qt-team`).

- `baseline.json`: 174 venue summaries, current recipe identities, ledger fingerprint.
- `state/checkpoint.json`: progress, queued reviews and event checks.
- `state/usage.jsonl`: reserved model/image attempts.
- `state/source-cache/`: bounded public source receipts/content.
- `runs/<run>/`: prompts, provider/tool transcripts, validated records and reports.
- `outbox/<run>.json`: independently reviewed proposals, explicitly not published.
- `images/<request-hash>/`: deduplicated generated assets and provenance.
- `approved-references/`: operator-enrolled exact-branch references and retained licences.
- `state/pending-publication.json`: exact approved batch for idempotent delivery retries.
- `state/publications/` and `state/latest-publication.json`: verified live receipts.
- `state/publication-outcomes.json`: prior proposal hashes and decisions.
- `private/publisher.key`: dedicated publisher key, mode 0600; never expose in chat, logs or app JSON.

Do not expose private transcripts, provider caches or the Hermes data directory
through the application web server. The research baseline contains public venue
information only; user accounts, Home/Work locations and customer data are absent.

## Operator commands

From `C:\Users\huien\HA`:

```powershell
python -X utf8 companion-api/ops/qt-team/setup.py inspect
python -X utf8 companion-api/ops/qt-team/setup.py collect
```

`provision` refuses a completed setup. `trial` runs real providers and consumes
quota; it is not a harmless health check. `sync-code` changes only the QT-owned
workflow/policy files. `schedule` creates the named job once and otherwise returns
the existing job. Never reset the usage ledger to bypass a limit. Jobs can be paused
from QT Manager's Scheduled Jobs controls without deleting source evidence.

Ask QT Manager for "team status" to read the saved execution report, queue and
schedule through that tool. A status query does not dispatch another research
cycle. Ordinary interactive chats still consume the account's model quota;
the fixed workflow's invocation cap applies to scheduled/CLI research dispatches.

Local boundary checks:

```powershell
cd companion-api/ops/qt-team
python -X utf8 -m unittest discover -p test_*.py
```

## Verification

Provisioning preserved existing profiles. Live gateway lists all four QT profiles;
Hermes Desktop rendered all four names. A real one-shot scheduled probe executed
under `/opt/data/profiles/qt-manager` as UID 10000 on 17 October 2026 and completed
with status `ok`. The source-extraction mismatch encountered during the first trial
was corrected only in QT profiles; original receipts remain.

Historical research results are in [ACCEPTANCE-2026-10-17.md](ACCEPTANCE-2026-10-17.md).
The publication follow-up is in [PRODUCTION-ACCEPTANCE-2026-10-17.md](PRODUCTION-ACCEPTANCE-2026-10-17.md).
No app publication should be inferred from a passing research trial alone.
