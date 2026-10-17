# Reviewed catalogue enrichment — 17 October 2026, batch yb

**Deployed and live verified: `20261017-product-assets28b`**, based on `20261017-social-redesign2`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 5 exact-branch cover associations and 0 hours records. Coverage is **167 covers and 94 schedules across 174 browse locations**; 93 locations have reviewed menus, covers and hours. Remaining: 7 cover gaps and 80 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-ur02-xie-bi-an-vegetarian — 824 Tampines Street 81, #01-38, BK Coffeeshop, Singapore 520824 | [Image source](https://www.foodpanda.sg/restaurant/hqko/xie-bi-an-vegetarian-tampines), reviewed 2026-10-17; source capture 2026-10-16T01:14:49.940Z. |
| research-ur02-vegetarian-food-stall-01-74 — 210 Lorong 8 Toa Payoh, #01-74, Singapore 310210 | [Image source](https://www.foodpanda.sg/restaurant/ed4x/mini-green-vegetarian-toa-payoh-lorong-8), reviewed 2026-10-17; source capture 2026-10-16T01:11:44.383Z. |
| research-ur02-amk-green-harmony-vegetarian — 443 Ang Mo Kio Avenue 10, #01-1221, Singapore 560443 | [Image source](https://www.foodpanda.sg/restaurant/hgnz/green-harmony-vegetarian-ang-mo-kio), reviewed 2026-10-17; source capture 2026-10-16T01:09:36.130Z. |
| research-yi-ding-xuan-tampines-201 — 201 Tampines Street 21 #01-201, Singapore 520201 | [Image source](https://www.foodpanda.sg/restaurant/gxl8/yi-ding-xuan-vegetarian-yi-ding-xuan-su-shi-tampines), reviewed 2026-10-17; source capture 2026-10-17T00:06:32.868804+00:00. |
| research-crowded-bowl-ntu-north-spine — 76 Nanyang Drive, North Spine Plaza NS3-1-18, Singapore 637331 | [Image source](https://www.foodpanda.sg/restaurant/e6jj/the-crowded-bowl-at-ntu-islandwide), reviewed 2026-10-17; source capture 2026-10-17T00:10:27.059416+00:00. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17yb.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 167 photo records, 94 schedules, and all 134 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

134 unique image assets total 18,578,856 bytes. Catalogue index: 201,666 bytes. First 20 summary response: 21,581 bytes, 47.0 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and3coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 895 files, SHA256 `c11ae119ae6afedf7511819f727948da3d3b11a16d06e3c241d12aa5bfba1744`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-product-assets28b`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17yb/release.json`.

## Source review and qualifications

Five exact merchant product references were enhanced once: Yi Ding Xuan, Crowded Bowl NTU North Spine, Xie Bi An, Mini Green and Green Harmony. Each source file hash and embedded image URL was checked. Crowded Bowl now uses its own NTU product photograph; no SP photo was transferred. Green Harmony uses a separate actual product photograph; the provider-labelled illustration remains held.

The first product-assets28 candidate was not promoted: the live base changed concurrently to social-redesign2 and the exact-base guard stopped before mutation. Product-assets28b was rebuilt from that live archive, preserving all Social, Cook and navigation source bytes. Fresh isolated TypeScript, canonical uncached lint and clean all16API export passed.

The first native check encountered a transient network failure at the unchanged admin health endpoint. Independent admin/preview probes returned200 and the fresh native check then passed both Android/iOS manifests and bundles. The failed result is retained; physical-device UI is unverified.

Original Sin Monday remains explicitly unconfirmed. The three coordinate holds are preserved. Every earlier source-image hold remains in the JSON checklist alongside any accepted alternative. Source attribution and check dates are retained; no ingredient, rating, stock or opening-hour claim was fabricated.
