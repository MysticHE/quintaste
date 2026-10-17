# Reviewed catalogue enrichment — 17 October 2026, batch s

**Deployed and live verified: `20261017-product-covers22`**, based on `20261017-operator-covers21b`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 7 exact-branch cover associations and 0 hours records. Coverage is **147 covers and 90 schedules across 174 browse locations**; 86 locations have reviewed menus, covers and hours. Remaining: 27 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-botanict-clementi — Blk 352 Clementi Avenue 2 #01-123, Singapore 120352 | [Image source](https://pos.amfuture.sg/h5/pages/product/list/store?app_id=10070&shop_supplier_id=10096), reviewed 2026-10-17; source capture 2026-10-15T10:18:26.837074+00:00. |
| research-linlin-bedok-north — 412 Bedok North Avenue 2, inside SinFoodie Coffeeshop, Singapore 460412 | [Image source](https://linlinvegetarian.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-15T22:17:06.550Z. |
| daily-green-woodlands-street-31 — 306 Woodlands Street 31, Singapore 730306 | [Image source](https://www.dailygreen.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-merchant-7ab3dafc5f6a7876 — 90 Hougang Ave 10 #04-11 Hougang Mall Foodies’ Garden®, Singapore 538766 | [Image source](https://www.dailygreen.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-merchant-287ecefa1f8e3855 — 217 Bedok North Street 1 #01-77 Food Loft®, Singapore 460217 | [Image source](https://www.dailygreen.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-ur09-kms-dining-hall — 88 Bright Hill Road, Venerable Hong Choon Memorial Hall Level 2, Singapore 574117 | [Image source](https://kmspks.org/wp-content/blogs.dir/1/files/20260812-Happy-Realm-Online-Menu_hires.pdf), reviewed 2026-10-17; source capture 2026-10-16T06:20:46.288Z. |
| research-ur09-kms-zen-cafe — 88 Bright Hill Road, Venerable Hong Choon Memorial Hall Level 1 beside Ju Yuan Fang, Singapore 574117 | [Image source](https://kmspks.org/wp-content/blogs.dir/1/files/ZenCafe_Digital-Menu.pdf), reviewed 2026-10-17; source capture 2026-10-16T06:20:48.717Z. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17s.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 147 photo records, 90 schedules, and all 116 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

116 unique image assets total 15,713,635 bytes. Catalogue index: 190,217 bytes. First 20 summary response: 21,098 bytes, 52.5 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 872 files, SHA256 `3d725a74d6b8006460e771e2cd2b0a851b15c8041430ee572874a6c0db844553`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-product-covers22`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17s/release.json`.
