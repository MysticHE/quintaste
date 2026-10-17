# Reviewed catalogue enrichment — 17 October 2026, batch o

**Deployed and live verified: `20261017-merchant-covers18`**, based on `20261017-branch-covers17`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 3 exact-branch cover associations and 0 hours records. Coverage is **111 covers and 90 schedules across 174 browse locations**; 75 locations have reviewed menus, covers and hours. Remaining: 63 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-ur14-tianmu-westcoast — 504 West Coast Drive #01-230, Singapore 120504 | [Image source](https://www.blockchef.com/store/tianmuvegetarian/menu), reviewed 2026-10-17; source capture 2026-10-16. |
| research-swaad-shenton3 — 3 Shenton Way #01-04 Shenton House, Singapore 068805 | [Image source](https://www.blockchef.com/store/shentonfoodhall/menu?menu=Swaad%20Vegetarian%20%28Shenton%20Way%29), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur06-so-green — 445 Bedok North Street1 #01-02, Djitsun Mall, Singapore469661 | [Image source](https://sogreenvegetarian.oddle.me/en_SG), reviewed 2026-10-17; source capture 2026-10-16. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17o.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 111 photo records, 90 schedules, and all 86 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

86 unique image assets total 11,258,401 bytes. Catalogue index: 172,353 bytes. First 20 summary response: 19,136 bytes, 32.8 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 842 files, SHA256 `d5e2ab9a882e61b9b10f951145f128e4e93e2f9cfadfd7975fc78a63b0370929`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-merchant-covers18`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17o/release.json`.
