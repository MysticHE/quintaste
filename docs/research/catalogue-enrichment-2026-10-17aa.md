# Reviewed hours enrichment — 17 October 2026, batch aa

**Deployed and live verified: `20261017-reviewed-hours30`**, based on `20261017-location2`. The latest Location, Social, Cook and navigation source is preserved. Full coverage remains incomplete.

This batch adds **two hours records**, bringing coverage to **96 hours / 171 covers / 174 browse locations**. There are 95 locations with menu records, cover and hours available. Remaining: **78 hours gaps, 3 cover gaps and 3 coordinate holds**. Available hours do not imply a complete seven-day schedule.

| Branch | Published hours | Source and dates |
| --- | --- | --- |
| Sufood, Raffles City #02-19 to 21 | Daily 11:30–15:00 and 17:30–22:00. Last orders 14:30 / 21:30. | [Merchant profile](https://www.facebook.com/sufood.singapore/), readable browser capture checked **15 October 2026**, recovered/reviewed **17 October**. The current web reader returned a block page; the original date is retained and that limitation appears in app details. |
| New Green Pasture, Fortune Centre #04-22 | Tue–Sun 11:00–20:00. **Monday unconfirmed.** | [Merchant dine-in page](https://take.app/newgreenpasture), fresh HTTP200 checked **17 October 2026**. Exact existing merchant/phone binding retained. |

The New Green Pasture page explicitly welcomes dine-in and publishes this schedule in its merchant description. Its separate February2022 price note was retained; no foods or prices were re-extracted. Sufood's full merchant bio is distinct from the transient Closed now label and ordering slots. Original Sin Monday remains unconfirmed too. Earlier unavailable/conflicting-source holds remain in the JSON checklist alongside accepted new evidence.

## Saved-source review

The hours-only inventory scanned **5,141 unique saved research HTML files** from 5,229 files found, covering 963,325,981 bytes, and identified 636 candidate documents. It produced 21 exact-URL candidates for then-missing hours and 44 public Facebook merchant-profile documents. Those 65 focused outcomes are recorded in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17aa.json), with source files/hashes, excerpts, URLs and dates. Candidate detection does not approve a source: directory/editorial schedules, service windows, empty UI labels and transient open/closed facts remain held.

Kopitiam.com.sg explicitly identifies itself as an independent editorial platform unaffiliated with F&B groups; it is not the FairPrice operator's [Kopitiam website](https://www.kopitiam.biz/). Its Xiang Yuan image attribution/identity evidence was already correctly qualified and remains unchanged; no hours were transferred from its article. Greenland's normal public ordering UI was also reviewed: it supplies ordering times, not a verified venue schedule. Google/maps/analytics requests were blocked in that source browser, with no new provider calls.

## Verification and delivery

Fresh isolated TypeScript, uncached Expo lint, catalogue validation, clean export and module consistency pass. All 16 API bundles come from one export. Only hours JSON and the generated catalogue changed outside the export; all menus, cover records/assets and unrelated application source are preserved. Package: 902 files, SHA256 `d19bf174d10ad92856c6f589ee263c6ca7a1207de7dc437f2f7768e027f767ae`.

Live checks pass all175 menu fingerprints,174 unique browse entries,171 cover records,96 schedules and138 immutable asset hashes. The two new schedules, Monday qualification, three missing-photo cards, menu/search/40-row paging, Save/Saved/Map/back, image failures,320/768/1440 light/dark, bounded shared-image cache, actual postal lookup/reselection and three postal/API load orders pass with zero runtime errors or unintended provider requests. Exact web bytes and Android/iOS manifests/bundles pass with the existing scope. Physical-device appearance remains unverified.

Guarded promotion, backup and zero-active-job checks passed; app/preview are healthy. Admin/PostgreSQL were unchanged. Menus/hours/assets remain packaged on VPS, without a PostgreSQL menu-table migration. Rollback: `deployment-backups/20261017-reviewed-hours30`. Evidence: `.local/coverage-2026-10-17aa/release.json`.

## Storage, performance and preserved gaps

Images remain **138 JPEGs / 19,171,228 bytes**; no image generation or downloads were needed for this batch. The catalogue index is 204,343 bytes. First20-summary response: **22,040 bytes / 20.0ms**, one live sample rather than a benchmark. Existing visible-only loading,8 catalogue pages/40KB each,12 image entries/8MiB, account isolation, cancellation/deduplication,15-minute fresh/24-hour offline limits and204/304 revalidation remain.

VPS memory snapshot:
```
quintaste-staging-app-1 147.1MiB / 768MiB 4.05%
quintaste-staging-preview-1 209.9MiB / 1.758GiB 75.55%
```
Disk snapshot:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   79G   18G  82% /
```
Retained release/rollback/Docker history also uses disk; no broad pruning was performed. Menu details remain about55percent smaller after the prior simplification, one dish name and price/range per row.

Google ledger remains **2,419/2,500 (81 left)**, SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`; live counters100/8/19/545 are unchanged. All44 original cache-backup files were rehashed directly, matching7,200,176bytes; no expiry/deletion reader was invoked. All206 saved image-reference receipts retain reviewed outcomes. No duplicate menu extraction or new image generation.

Missing covers remain **Su Xiang LPS46, Happy Vegetarian Hougang106 and Ascend18Cross**. Their provider-reference-artwork/logo holds remain. The three coordinate holds,2,527 held food observations,109 zero-food research branches,1,828 unnamed candidate IDs and unrecovered exact MakanVegan/SoonLai screenshot photos remain unresolved. [Full current174-branch checklist](current-catalogue-readiness-2026-10-17.md).
