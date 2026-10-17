# Reviewed catalogue enrichment — 17 October 2026, batch z

**Deployed and live verified: `20261017-source-assets29`**, based on `20261017-product-assets28b`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 4 exact-branch cover associations and 0 hours records. Coverage is **171 covers and 94 schedules across 174 browse locations**; 93 locations have reviewed menus, covers and hours. Remaining: 3 cover gaps and 80 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-greenland-upper-serangoon — 789 & 791 Upper Serangoon Road, Singapore 534659 | [Image source](https://greenland.zzv.sg/Category?StoreID=da5a2dbf-19c9-4a79-bf6e-aa12a440731b&Service=PickUp&lang=EN), reviewed 2026-10-17; source page checked 2026-10-16T12:43:41.814089+00:00. |
| research-tian-yuan-fortune-centre-01-16 — 190 Middle Road #01-16, Fortune Centre, Singapore 188979 | [Image source](https://www.foodpanda.sg/restaurant/g3ra/tian-yuan-healthy-vegetarian-fortune-centre), reviewed 2026-10-17; source page checked 2026-10-17T00:19:42.418787+00:00. |
| research-ur02-tpy-203-vegetarian-food — 203 Toa Payoh North, Singapore 310203 | [Image source](https://www.facebook.com/Tpy203veg/), reviewed 2026-10-17; source page checked 2026-10-16T01:09:35.473Z. |
| research-cookie-coffee-fortune-centre — 190 Middle Road #01-28B Fortune Centre, Singapore 188979 | [Image source](https://cookiecoffee.com.sg/blank/), reviewed 2026-10-17; source page checked 2026-10-16T12:47:17.276596+00:00. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17z.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 171 photo records, 94 schedules, and all 138 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

138 unique image assets total 19,171,228 bytes. Catalogue index: 203,624 bytes. First 20 summary response: 22,040 bytes, 37.6 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and3coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 899 files, SHA256 `9951d5f808e227e174777f86a3642570ec1c11400d6bb6f9cd6ba11a392bac0c`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-source-assets29`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17z/release.json`.

## Source review and qualifications

Four additional covers were matched and enhanced once: Greenland Upper Serangoon from its selected merchant Getz hotplate product photo; Tian Yuan Fortune Centre #01-16 from its exact Foodpanda brown-rice set photo; TPY203 from the public merchant-profile storefront reference already saved during the prior research; Cookie Coffee Fortune Centre #01-28B from its own About-page storefront hero. Full URLs, source HTML hashes, check dates, prompts, visual reviews and attribution remain in the JSON audit. Capture dates are unknown; filenames are not capture-date proof and reference photographs do not certify the current facade or stock.

Cookie Coffee direct generic-Accept retrieval initially returned406. Normal browser delivery returned200 with no Content-Type header; RIFF/WEBP signature and image decoding established the existing119,036-byte asset. The original406 receipt and later successful public response are preserved. No private APIs, login replay or Google calls were used. TPY203 public profile metadata was recovered from previously saved HTML, avoiding repeat extraction.

Three cover gaps remain: Ascend18Cross public merchant/landlord images are logos and its public Instagram page exposes no usable food-media payload; Su Xiang LPS46 and Happy Vegetarian Hougang106 selected merchant-listing product images explicitly say Image by foodpanda / For reference only and remain held as provider reference artwork. No other branch or same-premises merchant photo was transferred. Earlier logo/header/low-resolution/provider-artwork holds are retained alongside any accepted alternatives. Greenland has another actual photo retained as an ungenerated alternate.

A focused17October follow-up search did not establish new primary hours or approved cover evidence. The current Chinatown Point DLife primary page has no opening schedule, and CapitaLand Sufood does not provide venue hours; mall hours and the2020CNY PDF are insufficient. Orchard Gateway third-party listings conflict, and Teng Bespoke secondary schedules disagree. The landlord-hosted SuXiang editorial PDFs were already reviewed, with third-party photo credit and a46/47 unit conflict retained. No duplicate food extraction or source promotion resulted. Supplementary discovery checks are recorded privately in additional-source-review.json.

All16API bundles come from one clean export, preserving postal load-order correctness. This release starts from the actual live product-assets28b archive, retaining the latest concurrent Social redesign and unrelated Cook/navigation source. All175 menu fingerprints,138 immutable asset hashes,171 covers,94 hours records, actual postal UI, Save/Saved/Map/back, light/dark320/768/1440, image failures and bounded cache checks pass with zero unintended provider requests. Android/iOS transport is tested separately from physical-device appearance, which remains unverified.

Production JPEG storage is19,171,228bytes across138assets, up592,372bytes for this batch. The catalogue remains paginated20summaries at a time and images load only for visible cards; image bytes are not embedded in JSON. Existing12-entry/8MiB image cache,8-page catalogue cache, account isolation, request deduplication/cancellation and conditional204/304 revalidation remain. Release evidence records the actual one-sample response latency and memory/disk snapshot; no benchmark claim is made. VPS disk use remains about82percent, with18GB free. Retained release/Docker history should be monitored; no broad cleanup or pruning was performed.

Original Sin Monday remains explicitly unconfirmed. The three coordinate holds are preserved. Every earlier source-image hold remains in the JSON checklist alongside any accepted alternative. Source attribution and check dates are retained; no ingredient, rating, stock or opening-hour claim was fabricated.

## Current deployment and saved-reference audit

Current app/preview release is **20261017-location2**, deployed subsequently by the concurrent Location update using **20261017-source-assets29** as its base. It preserves every catalogue JSON file, all 138 cover assets and all 16 API bundles byte-for-byte. Fresh catalogue, rendered-card/fallback, cache, Save/Saved/Map/back, postal and exact web/Android/iOS transport checks pass on location2. Physical-device appearance remains unverified. Future releases must start from location2 or the actual newer live release.

The final saved-reference audit reconciled ten stale or absent statuses: nine original hashes already matched deployed enhancements, and the visually inspected MTR promotional banner remains an ungenerated alternate because the reviewed Chow Chow Bhath cover is already deployed. All 206 saved image-reference receipts have a selected, reused, alternate, held or unavailable outcome. Zero receipts remain pending; this does not close the venue/hour/menu evidence gaps. No extra extraction, generation or provider request was performed.

Evidence: `.local/coverage-2026-10-17z/current-live-location2/verification.json`; source receipt changes are included in the JSON audit.
