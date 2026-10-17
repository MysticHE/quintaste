# Reviewed catalogue enrichment — 17 October 2026, batch n

**Deployed and live verified: `20261017-branch-covers17`**, based on `20261017-bakery-covers16b`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 6 exact-branch cover associations and 0 hours records. Coverage is **108 covers and 90 schedules across 174 browse locations**; 73 locations have reviewed menus, covers and hours. Remaining: 66 cover gaps and 84 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-divine-realm-hougang-501 — 501 Hougang Avenue 8 #01-630, Singapore 530501 | [Image source](https://divinerealm.zzv.sg/Category?StoreID=4e302595-b862-4bbc-a896-590bfa3280ae&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-divine-family-hougang-356 — Blk 356 #01-803 Hougang Ave 7, Singapore 530356 | [Image source](https://divinefamily.zzv.sg/Category?StoreID=bb70e5ce-9648-4ead-971e-8b78f69e74b8&Service=PickUp&lang=EN), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ur01-harmony-serangoon — 157A Serangoon North Avenue 1 #01-01, Singapore 551157 | [Image source](https://harmonyhutinternational.getz.co/Category), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ananda-serangoon-58 — 58 Serangoon Road, Little India Conservation Area, Singapore 217964 | [Image source](https://www.anandabhavan.com/outlet), reviewed 2026-10-17; source capture 2026-10-16. |
| research-swaad-desker70 — 70 Desker Road, Singapore 209593 | [Image source](https://swaadgovinda.com/), reviewed 2026-10-17; source capture 2026-10-17. |
| research-omg-donuts-margaret-market — 38 Margaret Drive #01-08 Margaret Market, Singapore 141038 | [Image source](https://omgdonuts.sg/), reviewed 2026-10-17; source capture 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17n.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 108 photo records, 90 schedules, and all 83 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

83 unique image assets total 10,860,183 bytes. Catalogue index: 170,912 bytes. First 20 summary response: 19,136 bytes, 53.5 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 839 files, SHA256 `8b76a786dc8bca1a3f29b1788da9e70808dc747a8e3196b4f4c2b3775ff76033`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-branch-covers17`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17n/release.json`.
