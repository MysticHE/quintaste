# Reviewed catalogue enrichment — 17 October 2026, batch p

**Deployed and live verified: `20261017-merchant-covers19`**, based on `20261017-merchant-covers18`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 9 exact-branch cover associations and 0 hours records. Coverage is **120 covers and 90 schedules across 174 browse locations**; 76 locations have reviewed menus, covers and hours. Remaining: 54 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| living-wholesome-fortune-centre — 190 Middle Road #01-23, Fortune Centre, Singapore 188979 | [Image source](https://www.foodpanda.sg/restaurant/wd61/living-wholesome-vegetarian-food-fortune-centre), reviewed 2026-10-17; source capture 2026-10-15T08:18:44.197Z. |
| teng-bespoke-sunshine-plaza — 91 Bencoolen Street #01-50, Sunshine Plaza, Singapore 189652 | [Image source](https://www.foodpanda.sg/restaurant/l8ul/teng-bespoke-vegetarian-japanese-dining-sunshine-plaza), reviewed 2026-10-17; source capture 2026-10-15T08:18:44.197Z. |
| research-dlife-tengah — 126B TENGAH DRIVE #01-319, PLANTATION VILLAGE S(692126) | [Image source](https://www.foodpanda.sg/restaurant/xyhv/dlife-tengah-drive), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-sl08-fire-flies — 101 Upper Cross Street B1-06 Stall 10, People's Park Centre, Singapore 058357 | [Image source](https://www.foodpanda.sg/restaurant/h97o/fire-flies-vegetarian-upper-cross-street), reviewed 2026-10-17; source capture 2026-10-16T04:01:56.744Z. |
| research-sl08-ju-fu-yuan-amk — 162 Ang Mo Kio Avenue 4 #01-14, Singapore 560162 | [Image source](https://www.foodpanda.sg/restaurant/ozx5/ju-fu-yuan-vegetarian-delight-ang-mo-kio-islandwide), reviewed 2026-10-17; source capture 2026-10-16T04:01:56.876Z. |
| research-sl08-xi-shi-fu — 115 Bukit Merah View #01-25, Singapore 151115 | [Image source](https://www.foodpanda.sg/restaurant/b8pv/xi-shi-fu-vegetarian-xi-shi-fu-su-shi-ge-bukit-merah), reviewed 2026-10-17; source capture 2026-10-16T04:04:29.833Z. |
| research-ur01-kale-adelphi — 1 Coleman Street #02-20 The Adelphi, Singapore 179803 | [Image source](https://www.foodpanda.sg/restaurant/vqzj/kale-by-kangsu-the-adelphi), reviewed 2026-10-17; source capture 2026-10-16T01:00:44.681Z. |
| research-ur01-new-green-pasture-fortune — 190 Middle Road #04-22 Fortune Centre, Singapore 188979 | [Image source](https://www.foodpanda.sg/restaurant/f1n1/new-green-pasture-cafe-fortune-centre), reviewed 2026-10-17; source capture 2026-10-16T01:00:44.681Z. |
| research-ur01-tracy-fortune — 190 Middle Road #01-34 Fortune Centre, Singapore 188979 | [Image source](https://www.foodpanda.sg/restaurant/on93/tracy-juice-culture-fortune-centre), reviewed 2026-10-17; source capture 2026-10-16T01:00:44.681Z. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17p.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 120 photo records, 90 schedules, and all 95 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

95 unique image assets total 12,583,566 bytes. Catalogue index: 176,879 bytes. First 20 summary response: 19,604 bytes, 50.3 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 851 files, SHA256 `2945f1a96babf6eeee36155db4ebb4edd52204b438351ad394855eb4c04b5f36`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-merchant-covers19`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17p/release.json`.
