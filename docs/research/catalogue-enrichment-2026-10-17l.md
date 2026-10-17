# Reviewed catalogue enrichment — 17 October 2026, batch l

**Deployed and live verified: `20261017-food-covers15`**, based on `20261017-cafe-covers14`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 9 exact-branch cover associations and 0 hours records. Coverage is **97 covers and 90 schedules across 174 browse locations**; 66 locations have reviewed menus, covers and hours. Remaining: 77 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-yesnatural-geylang — 57 Lorong 27 Geylang, Singapore 388184 | [Image source](https://yesnatural.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |
| research-originalgreens-shaw-plaza — 360 Balestier Road #04-07/K2 Shaw Plaza, Singapore 329783 | [Image source](https://originalgreens.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |
| research-greenearth-rail-mall — 386 Upper Bukit Timah Road, The Rail Mall, Singapore 678043 | [Image source](https://greenonearth.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur02-vegetarian-express-hougang — 205 Hougang Street 21, #02-22, Singapore 530205 | [Image source](https://vegetarianexpresscafe.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |
| research-futkai-jalan-besar — 282 Jalan Besar, #01-00, Singapore 208945 | [Image source](https://newfutkaivegetarian.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |
| research-kailash-belilios-road — 3 Belilios Road #01-03 Hilton Garden Inn, Singapore 219924 | [Image source](https://www.kailashparbat.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-kailash-syed-alwi — 93 Syed Alwi Road, Singapore 207669 | [Image source](https://www.kailashparbat.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-kailash-changi — 1 Changi Business Park Crescent #01-10/12/13 Plaza8, Singapore 486025 | [Image source](https://www.kailashparbat.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-kailash-sentosa — 42 Imbia Road #01-01, Singapore 099701 | [Image source](https://www.kailashparbat.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17l.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 97 photo records, 90 schedules, and all 73 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

73 unique image assets total 9,728,475 bytes. Catalogue index: 165,753 bytes. First 20 summary response: 17,755 bytes, 67.2 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 829 files, SHA256 `1f681ac525513b5e8ad9417e59e62b608dafb3cf3b73861c80896bf98965f3b0`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-food-covers15`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17l/release.json`.
