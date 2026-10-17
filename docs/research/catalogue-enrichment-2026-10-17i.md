# Reviewed catalogue enrichment — 17 October 2026, batch i

**Deployed and live verified: `20261017-group-covers12`**, based on `20261017-operator-covers11`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 6 exact-branch cover associations and 1 hours records. Coverage is **74 covers and 89 schedules across 174 browse locations**; 49 locations have reviewed menus, covers and hours. Remaining: 100 cover gaps and 85 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-zzv-jalan-mas-puteh — 9 Jalan Mas Puteh, Singapore 128615 | [Image source](https://order.zzv.sg/Category?StoreID=43c33a3e-a6c4-4794-992d-7f93976ece31&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-zzv-yishun — Blk 236 Yishun Ring Road #01-1000, Singapore 760236 | [Image source](https://order.zzv.sg/Category?StoreID=33a3b108-b18e-4fa3-a855-31a33c7c91b0&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-zzv-tampines — 801 Tampines Ave 4 #01-281, Tampines Polyview, Singapore 520801 | [Image source](https://order.zzv.sg/Category?StoreID=d60a08b7-7a95-46d6-8aad-8034d04cbd18&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-zzv-bendemeer — 23 Bendemeer Road #01-523, Bendemeer Ville, Singapore 330023 | [Image source](https://order.zzv.sg/Category?StoreID=b04e0e8b-ea27-4c4a-8e85-23e0fb4208b0&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-times-vege-bukit-batok — 643 Bukit Batok Central #01-44, Singapore 650643 | [Image source](https://timesvege.zzv.sg/Category?StoreID=f7045319-0600-4f7f-99cb-ef97f6936552&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-zhenyi-ang-mo-kio-128 — 128 Ang Mo Kio Ave 3 #01-1853, Singapore 560128 | [Image source](https://zhenyi.zzv.sg/Category?StoreID=82a04f03-aa49-47c8-88ee-6b8710fbf77a&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-supreme-vege-queen-street | [Hours source](https://www.supremevege.sg/contact-us/), checked 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17i.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 74 photo records, 89 schedules, and all 54 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

54 unique image assets total 7,340,101 bytes. Catalogue index: 154,608 bytes. First 20 summary response: 16,847 bytes, 24.2 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 820 files, SHA256 `e1526b5ebdea4fb1371518cc9ba0cd125bdb915bcdaa900e99c259507bfa7df8`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-group-covers12`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17i/release.json`.

Six Zi Zai/Times Vege/Zhenyi branch associations share one 62,307-byte generated asset; each exact StoreID and source hash remains recorded separately. Greenland’s misleadingly named tofu image was a logo and was rejected. Supreme Vege lists meal periods without weekdays, which remain explicitly qualified rather than inferred as daily.
