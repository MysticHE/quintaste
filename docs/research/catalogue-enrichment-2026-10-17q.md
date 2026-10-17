# Reviewed catalogue enrichment — 17 October 2026, batch q

**Deployed and live verified: `20261017-merchant-covers20`**, based on `20261017-merchant-covers19`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 16 exact-branch cover associations and 0 hours records. Coverage is **136 covers and 90 schedules across 174 browse locations**; 77 locations have reviewed menus, covers and hours. Remaining: 38 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-ur03-eco-sen-toa-payoh66 — 66 Lorong 4 Toa Payoh, Singapore 310066 | [Image source](https://www.foodpanda.sg/restaurant/zj07/eco-sen-vegetarian-food-yuan-sen-su-shi-lorong-4-toa-payoh), reviewed 2026-10-17; source capture 2026-10-16T01:26:23.987Z. |
| research-ur04-bao-su-zhai — 1 Sengkang Square #04-11 Stall 23, Compass One, Singapore 545078 | [Image source](https://www.foodpanda.sg/restaurant/o1d2/bao-su-zhai-bao-su-zhai-compass-one), reviewed 2026-10-17; source capture 2026-10-16T04:38:35.556Z. |
| research-ur03-gan-taste-vegetarian — 20 Lorong 7 Toa Payoh #01-758, Singapore 310020 | [Image source](https://www.foodpanda.sg/restaurant/w7c5/gan-taste-vegetarian-18-lorong), reviewed 2026-10-17; source capture 2026-10-16T04:34:08.205Z. |
| research-ur06-li-wei — 151 Serangoon North Avenue2 #01-41, Singapore550151 | [Image source](https://www.foodpanda.sg/restaurant/w55k/li-wei-vegetarian-151-serangoon-north-ave-2), reviewed 2026-10-17; source capture 2026-10-16T05:15:19.991Z. |
| research-ur06-ju-fu-yuan-serangoon — 262 Serangoon Central Drive #01-91, Singapore550262 | [Image source](https://www.foodpanda.sg/restaurant/wpxm/ju-fu-yuan-vegetarian-delights-serangoon-central-dr), reviewed 2026-10-17; source capture 2026-10-16T05:08:59.088Z. |
| research-ur06-xin-yi — 442 Jurong West Avenue1 #01-758, Singapore640442 | [Image source](https://www.foodpanda.sg/restaurant/x0ce/xin-yi-vegetarian-food-xin-yi-su-shi-jurong-west-avenue-1), reviewed 2026-10-17; source capture 2026-10-16T05:06:19.536Z. |
| research-ur07-red-apple-tampines — 835 Tampines Street 83 #01-02, Singapore 520835 | [Image source](https://www.foodpanda.sg/restaurant/wvhw/red-apple-vegetarian-tampines), reviewed 2026-10-17; source capture 2026-10-16T05:29:24.105Z. |
| research-ur08-150-green — 150 Bukit Batok Street 11 #01-224, Singapore 650150 | [Image source](https://www.foodpanda.sg/restaurant/l2ov/150-green-vegetarian-bukit-batok-street-11), reviewed 2026-10-17; source capture 2026-10-16T05:40:04.855Z. |
| research-ur10-ju-fu-yuan-eunos — 7 Eunos Crescent #01-2655, Singapore 400007 | [Image source](https://www.foodpanda.sg/restaurant/y2yl/ju-fu-yuan-vegetarian-delight-eunos), reviewed 2026-10-17; source capture 2026-10-16T06:51:02.428Z. |
| research-ur11-crowded-sp — 500 Dover Road, Singapore Polytechnic Food Court 2, Stall 13, Singapore 139651 | [Image source](https://www.foodpanda.sg/restaurant/w9sh/the-crowded-bowl-dover-road), reviewed 2026-10-17; source capture 2026-10-16T07:05:17.736Z. |
| research-ur13-suyuan-bedok — 208B New Upper Changi Road #01-07, Singapore462208 | [Image source](https://www.foodpanda.sg/restaurant/ho0y/suyuan-vegetarian-bedok-interchange-hawker-centre), reviewed 2026-10-17; source capture 2026-10-16T07:55:06.236Z. |
| research-fennel-river-valley — 413 River Valley Road, Singapore 248311 | [Image source](https://www.foodpanda.sg/restaurant/raxd/fennel-by-komala-vilas-river-valley-road-islandwide), reviewed 2026-10-17; source capture 2026-10-16T09:25:14.514Z. |
| research-teenoy-hougang-foodpanda-932 — 932 Hougang Avenue 9 #01-04, Singapore 530932 | [Image source](https://www.foodpanda.sg/restaurant/tad5/teenoy-thai-vegetarian-hougang-avenue-9), reviewed 2026-10-17; source capture 2026-10-16T00:31:58Z. |
| research-kang-su-far-east-plaza — 14 Scotts Road #05-98 Far East Plaza, Singapore 228213 | [Image source](https://www.foodpanda.sg/restaurant/n5wr/kang-su-vegetarian-far-east-plaza), reviewed 2026-10-17; source capture 2026-10-15T09:49:37.612879+00:00. |
| research-genesis-vegan-havelock-ii — 2 Havelock Road, #B1-01 Havelock II, Singapore 059763 | [Image source](https://www.foodpanda.sg/restaurant/fdk3/genesis-vegan-restaurant-havelock-2), reviewed 2026-10-17; source capture 2026-10-15T10:50:08.115418+00:00. |
| shu-woodlands-avenue-1 — 354A Woodlands Avenue 1 #01-01, Singapore 731354 | [Image source](https://www.foodpanda.sg/restaurant/x3kk/shu-vegetarian-shu-fang-zhai-woodlands-avenue-1), reviewed 2026-10-17; source capture 2026-10-15T08:16:19Z. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17q.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 136 photo records, 90 schedules, and all 108 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

108 unique image assets total 14,457,908 bytes. Catalogue index: 184,964 bytes. First 20 summary response: 20,600 bytes, 58.6 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 864 files, SHA256 `b6f51d7920d0d04c77a90d25741dad8d6ea529f9aea446cc09d15d3a441a4963`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-merchant-covers20`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17q/release.json`.
