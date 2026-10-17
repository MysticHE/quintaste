# Reviewed catalogue enrichment — 17 October 2026, batch t

**Deployed and live verified: `20261017-source-covers23`**, based on `20261017-product-covers22`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 4 exact-branch cover associations and 0 hours records. Coverage is **151 covers and 90 schedules across 174 browse locations**; 88 locations have reviewed menus, covers and hours. Remaining: 23 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-ur04-kunthaville — 18 Veerasamy Road, Singapore 207326 | [Image source](https://www.chope.co/singapore-restaurants/restaurant/kunthaville), reviewed 2026-10-17; source capture 2026-10-16T12:47:27.437497+00:00. |
| research-xiang-yuan-circuit-source — 80 Circuit Road #02-03, Singapore 370080 | [Image source](https://kopitiam.com.sg/2026/08/21/blk-80-circuit-road-market-food-centre-6-must-try-hawker-stalls/), reviewed 2026-10-17; source capture 2026-10-16T00:40:17Z. |
| research-kind-kones-forum — 583 Orchard Road #B1-27 & K1, Forum Shopping Mall, Singapore 238884 | [Image source](https://kindkones.com/products/banana-pecan), reviewed 2026-10-17; source capture 2026-10-16T21:44:14.627940+00:00. |
| research-fo-you-yuan-jalan-besar — 369 Jalan Besar, Singapore 208997 | [Image source](https://foyouyuan.maynuu.com/), reviewed 2026-10-17; source capture 2026-10-15T10:18:26.837074+00:00. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17t.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 151 photo records, 90 schedules, and all 120 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

120 unique image assets total 16,430,935 bytes. Catalogue index: 192,137 bytes. First 20 summary response: 21,098 bytes, 58.5 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 876 files, SHA256 `440dab12c6e037d52700a6515c442b7084273be20ae859380aaa0c5c488c146e`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-source-covers23`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17t/release.json`.

Additional acceptance: fresh isolated TypeScript and normal-workspace uncached lint pass. Staging-only lint reports three Windows dependency-junction casing errors; no rules or source were altered. Full live browser checks pass Save/Saved, Map, menu/back, image failure,320/768/1440 light/dark, with no provider requests. See [current174-branch checklist](current-catalogue-readiness-2026-10-17.md).
