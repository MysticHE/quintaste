# Reviewed catalogue enrichment — 17 October 2026, batch x

**Deployed and live verified: `20261017-product-assets27`**, based on `20261017-xinghua26`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 5 exact-branch cover associations and 0 hours records. Coverage is **162 covers and 94 schedules across 174 browse locations**; 93 locations have reviewed menus, covers and hours. Remaining: 12 cover gaps and 80 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-ur03-99-pioneer-mall — 638A Jurong West Street 61 #01-22 Stall 10, Pioneer Mall, Singapore 641638 | [Image source](https://www.foodpanda.sg/restaurant/rj1o/99-vegetarian-pioneer-mall), reviewed 2026-10-17; source capture 2026-10-16T01:26:23.676Z. |
| research-ur04-peace-vegetarian — 18 Tai Seng Street #B1-02, Singapore 539775 | [Image source](https://www.foodpanda.sg/restaurant/zi6a/peace-vegetarian-tai-seng-st-18), reviewed 2026-10-17; source capture 2026-10-16T04:34:37.150Z. |
| research-ur04-mani-iyer — 215 Ang Mo Kio Avenue 1, Singapore 560215 | [Image source](https://www.foodpanda.sg/restaurant/xsya/mani-iyer-food-pte-ltd-xsya), reviewed 2026-10-17; source capture 2026-10-16T04:34:08.026Z. |
| research-ur08-vege-bear-bidadari — 212 Bidadari Park Drive #03-01, Singapore 360212 | [Image source](https://www.foodpanda.sg/restaurant/oecy/vege-bear-vegetarian-su-xiong-bidadari-oecy), reviewed 2026-10-17; source capture 2026-10-16T05:41:00.705Z. |
| research-ur15-xinghua-somerset — 111 Somerset Road #01-K3 to K4, Singapore 238164 | [Image source](https://www.foodpanda.sg/restaurant/bhke/xing-hua-vegetarian-restaurant-tripleone-somerset), reviewed 2026-10-17; source capture 2026-10-16T09:11:16.042Z. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17x.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 162 photo records, 94 schedules, and all 129 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

129 unique image assets total 17,906,062 bytes. Catalogue index: 199,163 bytes. First 20 summary response: 21,581 bytes, 53.7 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and3coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 885 files, SHA256 `9967b1d788c5d77379cf7147c2e1e66945ec7c2f5a012349e6334dee769cb146`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-product-assets27`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17x/release.json`.


## Product-reference evidence and retained holds

Four new assets use named product photographs from each exact merchant page:99Vegetarian braised bean curd;PeaceVegetarian lei cha rice;ManiIyer mini tiffin;VegeBear four-heavenly-kings set. Full public asset URLs, original sized URLs, saved-page hashes, check dates and matching product labels are in the JSON audit. Only image associations were reviewed; no menu food or price extraction was repeated. VegeBear's capture provenance is not independently established and remains qualified in photo changes.

The exact Somerset merchant page independently publishes the same YamRing photograph as the FortuneCentre merchant source. The existing enhanced asset is reused with a shared-product qualifier, without assuming common ownership or claiming a photograph of the branch interior. The earlier ambiguous header references remain held and are retained separately in the branch checklist and audit. GreenHarmony's provider-labelled reference artwork was not enhanced or promoted.

All live web, card, cache and postal checks pass. An initial native manifest request arrived while the preview gateway's Metro process was starting and returned503; the original result is retained. The healthy service had zero restarts and noOOM. Once Metro was ready, both Android/iOS manifests and bundles passed with the existing scope. Physical-device UI remains unverified.
