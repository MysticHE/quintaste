# Reviewed catalogue enrichment — 17 October 2026, batch k

**Deployed and live verified: `20261017-cafe-covers14`**, based on `20261017-social-benchmark2`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 5 exact-branch cover associations and 1 hours records. Coverage is **88 covers and 90 schedules across 174 browse locations**; 59 locations have reviewed menus, covers and hours. Remaining: 86 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-slow-bakes-yishun-hyc — 30A Yishun Central 1, Tzu Chi Humanistic Youth Centre, Singapore 768796 | [Image source](https://take.app/slowbakes), reviewed 2026-10-17; source capture 2026-10-16. |
| research-wakamama-pasir-panjang — 218 Pasir Panjang Road #02-15, ICON @ Pasir Panjang, Singapore 118579 | [Image source](https://www.wakamama.sg/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-mod-cafe-kuo-chuan — 1A Kuo Chuan Avenue, Singapore 426888 | [Image source](https://www.modhaircafe.com/mod-cafe), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur09-eco-harmony-aljunied — 106 Aljunied Crescent #01-205, Singapore 380106 | [Image source](https://erp.eco-harmony.net/cafe), reviewed 2026-10-17; source capture 2026-10-16. |
| research-metta-simei — 32 Simei Street 1, Level 1 Metta Building, Singapore 529950 | [Image source](https://mettawelfareassociation-onlineshop.getz.co/?StoreID=4a3d59f0-1dfc-4ce5-b1cc-6b8046bfa747&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-warungijo-macpherson | [Hours source](https://grantralmallsg.com/store/warung-ijo/), checked 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17k.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 88 photo records, 90 schedules, and all 67 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

67 unique image assets total 9,132,643 bytes. Catalogue index: 161,640 bytes. First 20 summary response: 17,755 bytes, 40.0 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 823 files, SHA256 `87e9a60dd0bf63f03f2c29e0814143ee622c7f11d3cca5cb4c0087d65353332e`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-cafe-covers14`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17k/release.json`.

The initial local export based on menu-covers13 was discarded before packaging when the concurrent Social release was discovered. Final source, client bundle and routes are byte-preserved from social-benchmark2; all16 API bundles were rebuilt together for catalogue changes. Source preservation includes the Social redesign, Cook, authentication and navigation.
