# Reviewed QT learning loop

Deployed **17 October 2026, 4:35 pm SGT**, following the owner's request to set
up efficient self-improvement. This is procedural learning from reviewed evidence,
not model training or permission for autonomous code changes.

## Flow

1. The daily coordinator incrementally reads existing Manager-reviewed outbox
   packets. Unchanged packets are not extracted or counted again.
2. Held/excluded records nominate relevant procedures from eight fixed, reviewed
   topics: branch hours, branch identity, currency, compound ingredients, current
   events, event relevance, image provenance and primary-source captures.
3. Up to six pending procedures, with bounded historical evidence, accompany the
   **existing** Manager research-review call. The Manager can approve, defer or
   reject; there is no separate model invocation or new scheduled job.
4. Exact procedure/evidence hashes and a successful Manager receipt are required
   for activation. Only code-owned procedure text can enter prompts. Website or
   reviewer text cannot become executable instructions or a new permission.
5. Up to four relevant approved procedures are supplied to a worker's next run.
   Manager can use the approved procedures across roles, including final publication
   review. Lessons expire after 90 days and require renewed review; changed procedure
   versions are inactive until approved again.
6. Research-review observations track rejected proposals and repeated issue
   categories after lesson activation. Correct worker holds and exclusions are not
   counted as mistakes. These are review diagnostics, not proven factual accuracy.

This applies to the fixed scheduled/CLI research workflow. It does not grant
interactive profiles arbitrary memory/skill-writing tools. Freeform Telegram
messages do not train the bots; `/learning` exposes the current review state.

## Held records and efficiency

Unresolved records retain their reasons and source URLs in a bounded retry queue.
First eligibility is 30 days after review; further rechecks have 30-day backoff,
with at most three completed recheck attempts before operator attention. They are
included only when the role is otherwise due. No extra model call is dispatched:

- Explorer receives a prior hold when that exact branch is assigned normally.
- Cooker can recheck one held recipe in its existing monthly two-candidate slot.
  It must retain the original ID/name; published recipes remain protected by the
  duplicate checks. Eligibility does not guarantee the next monthly slot immediately.
- Event discovery can revisit up to four due held leads within its ordinary run.

Records omitted from a worker result do not consume a completed retry attempt.
Holds are retained after the retry cap; missing facts never become approved merely
because retries ended. Research budget exhaustion does not activate lessons.

Initial state: **10 pending lesson candidates, 6 held retry records, 0 approved
lessons**. The next regular research/Manager review is **18 October, 3:00 am SGT**;
up to six candidates can be considered then, if research reaches its normal review.
No real lesson-approval model call was forced during setup because the existing
daily allowance had been used. No claim of learned accuracy improvement is made.

The live state is 26,782 bytes. Initial six-candidate review context is 7,694 JSON
bytes; it disappears when no lessons are pending. Approved worker context in the
isolated evaluation was 531–629 characters, and Manager context was 1,050 characters.
Those figures are measured examples, not fixed token/cost guarantees.

Storage limits: 1,000 observations over at most 180 days, 200 retry records,
100 processed-packet hashes, a role/topic-bounded lesson catalogue, and a 2 MB
artifact cap. Ingest considers the newest 80 outbox files. The original audit
packets remain preserved under the existing archive policy.

## Verification and rollout

- **56 local tests passed**, including 16 learning tests, publication/workflow
  checks and Telegram tests. **31 available VPS tests passed** in its runtime.
- Real saved production review replay was idempotent: 17 reviewed records,
  seven proposed, two rejected proposals. No source fetch was needed.
- An isolated copy of the real packets exercised Manager-call integration,
  six approvals, all four role contexts, evidence mismatch rejection and rollback.
  The approval response in that evaluation was explicitly synthetic; none of its
  approvals or records were copied into live state.
- Tests also cover expiry, unknown lesson IDs, stale evidence, atomic multi-decision
  validation, missing lesson responses, retry limits, published-recipe duplication
  protection and a same-ID held recipe returning for renewed review.
- Deployment held both coordinator and Telegram locks and refused unexpected
  concurrent code changes. Policy, checkpoints, usage ledger, baseline, publisher
  and latest app-publication receipt were hash-checked unchanged.
- Existing app data, Google budget, image limits, profile tools and credentials
  are unchanged. No application deployment or database mutation was needed.

Evidence is under `evidence/2026-10-17/learning/`: `deployment.json`,
`live-replay.json`, `isolated-acceptance.json` and `final-live.json`.

## Operations and rollback

Implementation: `learning.py`, `learning-policy.json`, integration in `workflow.py`,
and Telegram `/learning`. `deploy_learning.py` performs guarded deployment and
creates backups under `telegram-runtime/backups/learning-<timestamp>`.

Set `learning-policy.json` `enabled:false` to stop lesson injection, new review
offers and retry selection immediately while retaining research/publication.
Activation also preserves `state/learning/previous.json`. The initial pre-feature
code backup is `learning-20261017T083125Z`; later backups are intermediate versions.
Do not reset research/checkpoint/publication ledgers to roll back learning.

Learning status is included in subsequent saved workflow reports, so QT Manager's
existing status tool can expose it. Telegram `/learning` reads the current state
directly and uses Singapore time. Routine Telegram digests remain concise.
