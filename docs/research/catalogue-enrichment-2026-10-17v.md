# Reviewed catalogue enrichment — 17 October 2026, batch v

**Deployed and live verified: `20261017-evidence25`**, based on `20261017-verified-gaps24`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 2 exact-branch cover associations and 3 hours records. Coverage is **156 covers and 94 schedules across 174 browse locations**; 93 locations have reviewed menus, covers and hours. Remaining: 18 cover gaps and 80 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-renyi-tampines820 — Block 820 Tampines Street 81, Singapore 520820 | [Image source](https://www.grab.com/sg/articles/food/vegetarian-food-singapore/), reviewed 2026-10-17; source capture 2026-10-16T23:34:03.555727+00:00. |
| research-ur13-sangeetha-rangoon — 79 Rangoon Road, Singapore218366 | [Image source](https://www.sangeethabhavan.com/), reviewed 2026-10-17; source capture 2026-10-16T23:35:40.932172+00:00. |
| research-ur02-vegetarian-express-hougang | [Hours source](https://heartlandmall.com.sg/vegetarian-express/), checked 2026-10-17. |
| research-ur13-sangeetha-rangoon | [Hours source](https://www.sangeethabhavan.com/), checked 2026-10-17. |
| research-ur06-original-sin | [Hours source](https://www.originalsin.sg/), checked 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17v.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 156 photo records, 94 schedules, and all 124 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

124 unique image assets total 17,193,304 bytes. Catalogue index: 195,932 bytes. First 20 summary response: 21,098 bytes, 45.6 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and3coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 880 files, SHA256 `98d2ea74a84a26d164f8af073f6876aabfcb9d3d2a965a51e63b7c6291d3059b`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-evidence25`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17v/release.json`.


## Source and qualification supplement

Ren Yi's exact Grab merchant collage and Sangeetha Bhavan's readable operator homepage food photograph were enhanced once and visually compared. A second usable Sangeetha gallery photo is retained as an ungenerated alternate. No expired photo-cache reader was invoked.

Vegetarian Express Cafe hours come from Heartland Mall's exact#02-22tenant. Sangeetha's fresh homepage explicitly lists all seven days11:30–22:15; earlier failed contact and obsoleteMenu404 remain recorded. Original Sin's fresh RestaurantJSON-LD publishesTuesday–Sunday11:30–16:15and17:00–22:30. **Monday remains explicitly unconfirmed**, including in the rendered location details.94hours records do not mean94complete seven-day schedules.

The embedded-hours audit scanned64saved primary/lead pages without food extraction or network requests.14pages had candidate fields: OriginalSin's six-day schedule was approved after fresh source confirmation;13empty/third-party/historical fields remain held. Both FortuneCentre.sg pages disclose independent-directory status, so their photos were not promoted as landlord/merchant imagery. Conflicting secondary hours for MotherEarth/Teng and wrong-branch ordering windows forZiZai remain held.

Fresh TypeScript, canonical uncached Expo lint, actual live postal/search/filter-back checks and full320/768/1440light/dark browser matrix passed. All44photo-backup hashes remain unchanged. Coordinates remain171of174browse locations, with the same3explicit holds. [Current branch checklist](current-catalogue-readiness-2026-10-17.md).
