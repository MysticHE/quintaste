# Reviewed catalogue enrichment — 17 October 2026, batch h

**Deployed and live verified: `20261017-operator-covers11`**, based on `20261017-shu-covers10`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 6 exact-branch cover associations and 0 hours records. Coverage is **68 covers and 88 schedules across 174 browse locations**; 48 locations have reviewed menus, covers and hours. Remaining: 106 cover gaps and 86 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| bodhi-deli-fortune-centre — 190 Middle Road #03-26, Fortune Centre, Singapore 188979 | [Image source](https://take.app/bodhideli), reviewed 2026-10-17; source capture 2026-10-16. |
| research-nalan-littleindia — 82 Serangoon Road, Singapore 217987 | [Image source](https://www.nalan.com.sg/best-indian-restaurant-little-india), reviewed 2026-10-17; source capture 2026-10-16. |
| research-annalakshmi-cafe-downtown — 6A Shenton Way #03-26 Downtown Gallery, Singapore 068815 | [Image source](https://www.annalakshmi.sg/cafe), reviewed 2026-10-17; source capture 2026-10-16. |
| research-veganburg-eunos — 44 Jalan Eunos, Singapore 419502 | [Image source](https://www.veganburg.com/location), reviewed 2026-10-17; source capture 2026-10-16. |
| research-cultivate-maxwell-reserve — Maxwell Reserve Singapore, Autograph Collection, 2 Cook Street, Singapore 078857 | [Image source](https://cultivatecafe.sg/), reviewed 2026-10-17; source capture 2026-10-16. |
| research-ahimsa-neil-road — 76 Neil Road, Singapore 088840 | [Image source](https://www.ahimsacommunityysg.com/), reviewed 2026-10-17; source capture 2026-10-16. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17h.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 68 photo records, 88 schedules, and all 53 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

53 unique image assets total 7,277,794 bytes. Catalogue index: 150,973 bytes. First 20 summary response: 16,847 bytes, 45.3 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and8coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 819 files, SHA256 `0a6f555f8ec50b6d4cd5760830560bccc82cd2a87777b03dd7718c96501e863a`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-operator-covers11`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17h/release.json`.
