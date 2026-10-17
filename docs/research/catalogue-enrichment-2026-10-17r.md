# Reviewed catalogue enrichment — 17 October 2026, batch r

**Deployed and live verified: `20261017-operator-covers21b`**, based on `20261017-merchant-covers20`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 4 exact-branch cover associations and 0 hours records. Coverage is **140 covers and 90 schedules across 174 browse locations**; 81 locations have reviewed menus, covers and hours. Remaining: 34 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-nature-cafe-alexandra — 321 Alexandra Road #02-27, Singapore 159971 | [Image source](https://www.naturecafe.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-nature-cafe-smu — SMU Li Ka Shing Library, 70 Stamford Road #01-22, Singapore 178901 | [Image source](https://www.naturecafe.com.sg/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-lingzhi-palais — 390 Orchard Road, #B1-04/05, Palais Renaissance, Singapore 238871 | [Image source](https://www.lingzhi.com.sg/en/home), reviewed 2026-10-17; source capture 2026-10-16. |
| research-warungijo-macpherson — 601 MacPherson Road #01-61 Grantral Mall Taiseng, Singapore 368242 | [Image source](https://warungijo.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17r.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 140 photo records, 90 schedules, and all 111 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

111 unique image assets total 14,822,741 bytes. Catalogue index: 186,775 bytes. First 20 summary response: 20,600 bytes, 69.5 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 867 files, SHA256 `527f26a19920f7e84d3e74d30c6a394de2c1bb1f634f2ee3f9404b448718d912`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-operator-covers21b`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17r/release.json`.

The initial local operator-covers21 archive was never deployed. Rendered review showed the Nature Cafe crop centered empty steam; a closer reference-based crop was generated and verified in operator-covers21b. Superseded assets remain private for recovery.
