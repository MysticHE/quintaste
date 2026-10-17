# Reviewed catalogue enrichment — 17 October 2026, batch m

**Deployed and live verified: `20261017-bakery-covers16b`**, based on `20261017-food-covers15`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 5 exact-branch cover associations and 0 hours records. Coverage is **102 covers and 90 schedules across 174 browse locations**; 71 locations have reviewed menus, covers and hours. Remaining: 72 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-lnbv-vegan-branch — 11 Sam Leong Road, Trio Mall, #04-03, Singapore 207903 | [Image source](https://www.blockchef.com/store/veg-an/menu/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-yes-natural-bakery-geylang-55 — 55 Lorong 27 Geylang, Singapore 388183 | [Image source](https://bakery.yesnatural.sg/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-an-acai-affair-northpoint-city — 1 Northpoint Drive #B2-149 (South Wing), Singapore 768019 | [Image source](https://www.anacaiaffair.com/yishun-northpoint), reviewed 2026-10-17; source capture 2026-10-16. |
| research-rya-bakehouse-cavan — 11 Cavan Road #01-03 Cavan Suites, Singapore 209848 | [Image source](https://ryabakehouse.com/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-any1-choco-telok-ayer — 114 Telok Ayer Street, Singapore 068583 | [Image source](https://anyonechoco.com/products/category/chocoice/), reviewed 2026-10-17; source capture 2026-10-16. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17m.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 102 photo records, 90 schedules, and all 78 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

78 unique image assets total 10,299,591 bytes. Catalogue index: 168,027 bytes. First 20 summary response: 18,685 bytes, 56.8 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 834 files, SHA256 `8627d07a8d60c4e73a31082767d0da2721bce85b69467f4bdd64b1a526f521c5`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-bakery-covers16b`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17m/release.json`.

The unpromoted bakery-covers16 package was superseded by bakery-covers16b after visual review caught a corrupted accent in the An Acai Affair photo credit. Correct Unicode credit verified in the rebuilt and live card; rejected package was never promoted. Source/client functionality remains unchanged.
