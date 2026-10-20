# QT team production publication — 17 October 2026

Release **20261017-qt-publisher2** is deployed to app and preview, based on the actual live **20261017-open-market2**. Admin remains open-market2; PostgreSQL remains unchanged. A guard rejected the earlier publisher1 archive before deployment when a concurrent Market release was detected. Its five source changes were retained in publisher2. All 16 API bundles came from one export.

The subsequent concurrent **20261017-market-tab-color1** release preserves the entire publisher implementation and changes only TabDock.tsx plus its clean export. It is the current live app/preview release, and the final web/native/browser checks target its actual bytes. Its Market colour change was retained.

The actual Hermes scheduler published batch **qt-production-20261017-1**, four records and one image, at **2026-10-17T07:46:40.650Z**. Content revision: `ad112b6196e157c6a161469c7d1f6e714d36e0e13896d95406650a6a03d6d27e`. This is verified app delivery, not an outbox-only research result. A replay returned the same revision with `replayed:true`; a repeated proposal scan found no eligible duplicate work. No research extraction, image generation or Google call was repeated for this publication.

## Live results and sources

- Explore: Whole Earth, Peck Seah, now has current official source links and scoped evidence notes. No unconfirmed dine-in currency, hours, diet or address was filled in.
- Cook: **Tomato and egg stir-fry**, one attributed source-reviewed vegetarian adaptation, six ingredients/four steps, with the generated image inspected by QT Manager. The UI contains 19 recipes: this published recipe plus the existing 18 unreviewed samples. None is claimed to be kitchen-tested by this workflow.
- Social → Events → Local events: **Authentic Indian cuisine masterclass**, 29 October 2026, 10:00–13:00 SGT; **Vegetarian cooking workshop**, Geylang Serai CC, 4 December 2026, 14:00–17:00 SGT. Unverified fee currencies remain null; users confirm fees/availability with the organiser.

- **venue: whole-earth-peck-seah** — checked 2026-10-17. [Source 1](https://wholeearth.com.sg/), [Source 2](https://wholeearth.com.sg/menu.php), [Source 3](https://wholeearth.com.sg/menu2026/12-Menu-Legend.webp), [Source 4](https://wholeearth.com.sg/links/), [Source 5](https://fields.wholeearth.com.sg/en_SG), [Source 6](https://fields.wholeearth.com.sg/en_SG/stores).
- **recipe: tomato-egg-stir-fry** — checked 2026-10-17. [Source 1](https://omnivorescookbook.com/classic-tomato-and-egg-stir-fry/).
- **event: little-green-kitchen-authentic-indian-cuisine-masterclass-2026-10-29-1000-sgt** — checked 2026-10-17. [Source 1](https://littlegreenkitchen.com.sg/product/authentic-indian-cuisine-masterclass/), [Source 2](https://littlegreenkitchen.com.sg/vegancookingclasses/).
- **event: geylang-serai-cc-vegetarian-cooking-workshop-c027244070-2026-12-04-1400-sgt** — checked 2026-10-17. [Source 1](https://www.onepa.gov.sg/courses/vegetarian-cooking-workshop-c027244070), [Source 2](https://www.onepa.gov.sg/cc/geylang-serai-cc).

Every accepted record retains its source URL, check date, original capture timestamp/hash, exact reviewed payload hash and Manager decision in the durable publication record and research JSON report. Captures recovered from existing Hermes sessions kept their original timestamps; cache reuse was not relabelled as a fresh fetch.

## Workflow and schedule

Workers → bounded shared source cache → research review → eligible image worker → QT Manager exact-payload/pixel review → signed restricted publisher → atomic persistent snapshot → live receipt verification. Models have no SQL, SSH, arbitrary filesystem or deployment tool. The fixed adapter owns the dedicated signing key; unrelated authentication stores were not copied.

Daily coordinator **1d0f99df35ff**, **03:00 Asia/Singapore**, remains the single recurring job; next scheduled run is 18 October. Explorer reviews a monthly cycle in batches of four, at most two batches per day, oldest/unreviewed branches first. Cooker researches up to two recipes monthly. Events use weekly discovery and daily checks within seven days. This is bounded scheduled operation, not continuous token use. October bootstrap coverage is 2/174; 172 remain queued. A calendar rollover never erases their priority.

Normal quotas remain 8 model invocations/day, 180/month, 3 image attempts/month; this day's usage is 8 normal model invocations, 1 separately recorded owner-authorised acceptance review, and 3 image attempts including earlier recovery. The acceptance allowance is exhausted and date-bound. Google remains 2,419/2,500, 81 left; ledger hash/bytes unchanged. No new Google/provider requests occurred during normal app browsing.

Supported live updates: existing exact-branch hours, coordinates, diet/allium evidence, source notes, approved cover replacements and explicit SGD prices for exact existing dish/source/channel IDs; published recipe revisions and verified event cancellations/reschedules. New branches, identity/address corrections, new menu extraction and unsupported currencies stay held for operator review. Only the enrolled licensed Greendot Jewel reference is currently eligible for automated venue enhancement; the existing 173 covers remain. AI enhancement does not remove original rights or attribution.

## Safety, caching and storage

Data resides in `/docker/quintaste/state/editorial` on the app VPS, separate from packaged baseline data and PostgreSQL. SHA-256 JPEG URLs are immutable; image bytes never enter catalogue JSON. Public pages are 20 records, full recipe steps load on opening detail, and visible images use the existing bounded photo cache. Public content caches hold at most 40 entries/512 KB, fresh for 15 minutes, offline for at most 24 hours, with cancellation, shared requests, eight in-flight requests, 60-second error backoff and conditional 304. Catalogue POST revalidation remains 204. Existing account/private-save isolation and quota handling are retained. An already-open screen is not pushed instantly; focus/foreground revalidates after freshness expires.

HMAC requests expire after five minutes; writes are validated against current parent/record hashes, independently reviewed evidence and exact asset hashes. Partial/held batches do not publish. Retries reuse the exact pending batch; conflicts fail closed. Snapshots switch atomically, assets flush first, and prior revisions remain available. Capacity guards: 8 MiB active snapshot, 2,000 records, 400 revision archives, 2 GiB free-disk reserve; research run archives stop at 512 MiB for operator archiving. There is no unlimited storage claim.

Current publication storage: **162,773 bytes**; image **134,951 bytes**, 960×720. Recipe summary page **955 bytes**, detail **2,009 bytes**, events **2,021 bytes**. First catalogue page **24,041 bytes**; five warm sequential recipe reads median **15.5 ms** from this workstation. This is a small delivery sample, not a concurrency benchmark. VPS free disk **20.17 GB**.

The existing daily backup now includes atomic content snapshots/history/assets, excluding signing keys. Actual production backup `/docker/quintaste/backups/20261017T074715Z-editorial.tar.gz` restored into an isolated directory with all four records and the exact image hash intact. Rollback of content revisions was tested in isolated production-shaped storage; no live user data was rolled back. The pre-release `.env`/compose/backup script snapshot is `/docker/quintaste/deployment-backups/20261017-qt-publisher2`.

## Verification and limits

Passed: TypeScript, Expo lint, scoped server lint, clean export/module consistency, **25 Python boundary tests**, **21 API boundary tests**, actual Manager-approved batch validation, **10 live API checks**, **20 live browser checks**, exact deployed web bytes, Android/iOS manifests/bundles, protected-route rejection, source holds, image hash, caching, Save/reload/Saved, menu/back, guided cooking/shopping, light/dark and 320/768/1440 layouts, image failures and zero unintended provider calls. Screenshots were visually inspected. Android/iOS transport was verified; physical device UI and 1,000-user capacity remain unverified.

The first scheduled acceptance job failed before research/publication because runpy did not add the workflow directory to Python's import path. The corrected import path has a regression test. Retry job **f5c49a0d2502** completed successfully through the real scheduler, with four live writes and no extra research/model/image calls. Failed receipts remain; no usage ledger or checkpoint was reset. Async image-tool registration and actual-pixel delivery receipts were also corrected and verified with the real Manager review.

A second scheduled attempt exposed the production proxy's 16 KB default body limit. A reviewed dedicated Traefik route now permits at most 2,000,000 bytes for `/api/editorial/control/publish`, with its own rate limit; default API limits stay unchanged. Only ten app labels changed. Backup: `/docker/quintaste/deployment-backups/20261017-qt-publisher2-edge`. This configuration change is in `deploy/compose.yml`; preserve it in future deployments.

Source completeness remains **174 browse locations / 175 retained menu IDs / 173 covers / 120 hours**. Remaining gaps: **1 cover, 54 hours, 3,387 unavailable prices**, plus existing 2,527 food holds. Bodhi address/hours and basil-tofu sauce/diet uncertainty remain held. No qualifying future Tzu Chi event was invented. Happy Vegetarian Hougang remains the cover gap; original Makan Vegan/Soon Lai screenshot images remain unrecovered. Finishing this publishing integration does not mean these source gaps disappeared.

Evidence: `data/menu-research/qt-team-publication-2026-10-17.json` and private `.local/qt-publisher/` results/screenshots. For Hermes, `state/latest-report.json`, `state/latest-publication.json`, `state/publications/`, and `runs/production-publication-20261017/` retain the actual review and receipt. Do not rerun paid reviews or extraction as a status check.
