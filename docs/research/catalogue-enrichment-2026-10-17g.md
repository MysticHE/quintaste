# Reviewed catalogue enrichment — 17 October 2026, batch g

**Deployed and live verified: `20261017-shu-covers10`**, based on `20261017-branch-hours9`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 8 exact-branch cover associations and 0 hours records. Coverage is **62 covers and 88 schedules across 174 browse locations**; 43 locations have reviewed menus, covers and hours. Remaining: 112 cover gaps and 86 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-shu-amk — 554 Ang Mo Kio Ave 10, #01-2040 | [Image source](https://www.foodpanda.sg/restaurant/w1hc/shu-vegetarian-shu-fang-zhai-ang-mo-kio-avenue-10), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-clementi — 722 Clementi West Street 2 #01-150 (Wan Fu Eating House), Singapore 120722 | [Image source](https://www.foodpanda.sg/restaurant/w3eu/shu-vegetarian-shu-fang-zhai-clementi-west-street-2), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-hq — 27 Woodlands Link #01-01, Chang Cheng HQ (Chang Cheng Mee Wah Coffeeshop), Singapore 738732 | [Image source](https://www.foodpanda.sg/restaurant/a7h1/shu-vegetarian-shu-fang-zhai-chang-cheng-hq), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-jalan-kayu — 259 Jalan Kayu, Singapore 799488 | [Image source](https://www.foodpanda.sg/restaurant/s0tp/shu-vegetarian-259-jalan-kayu), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-jurong — 498 Jurong West Street 41 #01-462, Singapore 640498 | [Image source](https://www.foodpanda.sg/restaurant/r3q1/shu-vegetarian-shu-fang-zhai-jurong-west-street-41), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-loyang — 259 Pasir Ris Street 21 #02-30, Loyang Point, Singapore 510259 | [Image source](https://www.foodpanda.sg/restaurant/qjg1/shu-vegetarian-shu-fang-zhai-loyang-point), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-margaret — 40 Margaret Drive #01-05, Singapore 140040 | [Image source](https://www.foodpanda.sg/restaurant/a2qp/shu-vegetarian-shu-fang-zhai-margaret-drive), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |
| research-shu-yishun — 239 Yishun Ring Road #01-1150, Singapore 760239 | [Image source](https://www.foodpanda.sg/restaurant/bqyw/shu-vegetarian-shu-fang-zhai-yishun-ring-road), reviewed 2026-10-17; source capture 2026-10-15T10:29:58Z. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17g.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 62 photo records, 88 schedules, and all 47 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

47 unique image assets total 6,310,369 bytes. Catalogue index: 148,287 bytes. First 20 summary response: 15,076 bytes, 43.9 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 813 files, SHA256 `289557431134a75e295f2b453d83d800ef0bfc9696f16a1da696b2b2ec0b3b05`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-shu-covers10`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17g/release.json`.

SHU: eight exact vendor-code/address/hero-image mappings use two generated assets. Seven branch source files show the same spread (six byte-identical; Margaret visually equivalent with different compressed bytes); HQ has its own platter. The Woodlands354A branch is excluded. SHU schedule holds remain: current shuvegetarian.shop is unrelated gambling content, the operator Facebook page was unreadable, and community/aggregator schedules are insufficient. See hoursReview in the JSON audit. No schedule transferred between branches.
