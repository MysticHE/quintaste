# Reviewed catalogue enrichment — 17 October 2026, batch j

**Deployed and live verified: `20261017-menu-covers13`**, based on `20261017-group-covers12`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 9 exact-branch cover associations and 0 hours records. Coverage is **83 covers and 89 schedules across 174 browse locations**; 55 locations have reviewed menus, covers and hours. Remaining: 91 cover gaps and 85 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-saute-san-city-square — 180 Kitchener Road, #03-23/24 City Square Mall, Singapore 208539 | [Image source](https://www.saute.com.sg/saute-san-menu), reviewed 2026-10-17; source capture 2026-10-16. |
| research-saute-flavours-funan — 107 North Bridge Road, #B1-30 Funan, Singapore 179105 | [Image source](https://www.saute.com.sg/flavours-menu), reviewed 2026-10-17; source capture 2026-10-16. |
| research-saute-sushi-paya-lebar-square — 60 Paya Lebar Road, #B1-19 Paya Lebar Square, Singapore 409051 | [Image source](https://www.saute.com.sg/saute-sushi-menu), reviewed 2026-10-17; source capture 2026-10-16. |
| research-saute-saranghae-tampines-one — 10 Tampines Central 1, #05-08/09 Tampines 1, Singapore 529536 | [Image source](https://www.saute.com.sg/saute-saranghae-menu), reviewed 2026-10-17; source capture 2026-10-16. |
| research-mother-earth-classic-balestier — 530 Balestier Road #01-06, 329857, Singapore | [Image source](https://motherearthclassic.getz.co/Category?StoreID=ecac78cf-3087-4f39-a1a3-97825f0e1d84&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-mother-earth-jurong — 511 Upper Jurong Road #01-04, 638366, Singapore | [Image source](https://motherearthjurong.getz.co/Category?StoreID=4453f177-c0cc-4153-8feb-f9016289cb4c&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| dlife-signature-chinatown-point — 133 New Bridge Road #02-37, Chinatown Point, Singapore 059413 | [Image source](https://dlifesignature.getz.co/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur15-conut-haji — 2 Haji Lane #01-01, Singapore 189195 | [Image source](https://conutink.com/browse-all-products/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur15-conut-marriott — 310 Orchard Road #01-K2, Singapore 238864 | [Image source](https://conutink.com/browse-all-products/), reviewed 2026-10-17; source capture 2026-10-16. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17j.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 83 photo records, 89 schedules, and all 62 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

62 unique image assets total 8,365,530 bytes. Catalogue index: 158,903 bytes. First 20 summary response: 17,755 bytes, 46.2 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 828 files, SHA256 `304f663b850bf95e2f7f09dbff72855b2fc028140f57ba5bb8fc1d8a0f1e8636`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-menu-covers13`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17j/release.json`.
