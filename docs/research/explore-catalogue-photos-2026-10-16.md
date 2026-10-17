<!-- production-menu-covers-hours-20261016 -->
Current **20261016-covers-hours-menu2** is deployed and verified.175 menu IDs/174 browse entries;12,084 source occurrences retained,10,696 simplified display rows,899 supported price ranges. No per-dish expandable options or publication prose.72 hours/13 covers;102 browse hours gaps/161 photo gaps remain. All44 cached files reviewed and backup unchanged;12 exact-branch enhancements requested by the owner,2 matched alternates retained,14 image holds and1 mixed-menu exclusion. Original rights/credits persist; no new-licence claim. All source URLs/check dates and unresolved holds are recorded in the linked audits. Ledger/budget unchanged; zero Google calls. Complete local/live/browser/native-transport verification and deployment evidence: `.local/cover-hours/release.json`. Physical-device appearance remains unverified.

[Current report and exact-source audits](production-menu-covers-hours-2026-10-16.md). Earlier snapshots below are historical.
<!-- end-production-menu-covers-hours-20261016 -->

# Catalogue photo-card restoration — 16 October 2026

The regression came from switching Explore/Map to the owned catalogue while replacing `LivePlaceCard` with a text-only `CatalogueVenueCard`. The owned catalogue had no photo metadata; Google photo components were therefore absent. The fix restores the established photo-led treatment without returning to automatic Google discovery or photo downloads.

## Recovered cache and identity evidence

Before any application access, all 44 `.image` files were copied into `.local/photo-card-recovery/original-cache-backup` and SHA-256 verified. No `readDevelopmentPhoto()` call was made; original cache files remain untouched. They contain 7,184,768 JPEG bytes (7,200,176 bytes including headers). All decode successfully.

29 files match the stable place-ID/slot cache-key algorithm. The other 15 legacy files are byte-identical to matched images. Thus 44 files represent **29 unique images across 27 place IDs**, not 44 venues and not coverage for all 174 catalogue entries. Existing independent name/address evidence is available for 20 IDs; seven remain unnamed identity holds. Only two have an existing explicit `googlePlaceId` binding in the published catalogue. Candidate name/address evidence is not a new publication approval.

Makan Vegan's recorded Mandai IDs and Soon Lai's recorded Choa Chu Kang ID are absent from all 44 matched files. The screenshot photos cannot be recovered from this cache for those recorded branches. Makan remains a central-kitchen/catering research hold; Soon Lai retains its primary-menu/postal/operator holds. No menu or identity approvals were changed.

Full file-level hashes, original credits and source URLs remain in the private inventory. Public research audit: [photo-recovery-audit-2026-10-16.json](../../data/menu-research/photo-recovery-audit-2026-10-16.json). Backup manifest: `.local/photo-card-recovery/backup-manifest.json`.

## Reuse and enhancement

Checked 2026-10-16: [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) and [Place Photos documentation](https://developers.google.com/maps/documentation/places/web-service/place-photos). No independent durable reuse permission was found for the temporary Google files. **Zero cached Google images were promoted**; expiry remains unchanged.

One separate branch-specific source is approved: [Greendot Plus, Jewel Changi, photographed 2023-08-11 by Mike Peel](https://commons.wikimedia.org/wiki/File:At_Jewel_Changi,_Singapore_2023_78.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), checked 2026-10-16. The source caption, location and visible storefront identify the published Jewel branch. Other-country Annalakshmi/Ananda Bhavan images and a different Komala Vilas premise were rejected.

At the user's direction, the built-in image generator enhanced this reference photograph; the same branch and composition remain. Fine details can change with generative enhancement, so the image is not evidence for menu text, ingredients, stock or current decor. No Illustration label is added. The accessible Photo credits control retains the photographer, 2023 capture date, source, licence, and enhancement notice. The enhanced derivative is distributed under CC BY-SA 4.0. Enhancement does not erase the source licence.

Prompt: faithful exposure, white balance, highlight recovery, natural contrast and restrained sharpness; preserve storefront, signage, people, furniture and food displays. Full generation prompt and reference are recorded in the session; condensed prompt/check evidence is in [catalogue-photos.json](../../data/menus/catalogue-photos.json).

Owned delivery asset: `server-assets/catalogue/61acafeba0b68a20f6b1d7a50d069cca1ae60638d7bff36da0323aab5c3614d1.jpg`, 960 × 720, 178,673 bytes. The original licensed thumbnail is retained alongside it. Both are local packaged assets, not external hotlinks or PostgreSQL image records. **1 of 174 browse branches has an approved cover; 173 retain explicit Photo unavailable fallbacks.** The data path supports more approved exact-branch images without new provider calls.

## UI, delivery and performance

- Full-card photographs, rounded corners, white name/address and confirmed diet/distance, localized blur and subtle dark treatment; image area above text is 156px minimum. Hours remain unconfirmed and no ratings/counts are invented.
- Top-right saved bookmark; compact 48px Menu action and whole-card keyboard target; measured text panels grow with text scaling. Credits are keyboard accessible. Explore, Map and Saved share the component. Existing `catalogue-` saved IDs and old summaries without photos remain valid.
- Optional bounded metadata includes approved owned path, dimensions, author, source/licence URLs and capture/check dates. Generator checks exact branch/address, duplicate mappings, file hash and size. Validation rejects arbitrary external/data URLs and unknown photo fields. Serialization retains metadata within existing page/summary byte budgets; no image bytes enter catalogue JSON or AsyncStorage.
- Owned `/api/catalogue-photos/<sha256>.jpg` delivers only packaged assets with immutable HTTP caching; invalid/missing files return404. No provider fallback. The same existing API origin is used on native.
- Photo visibility uses the existing scroll context with continuous visibility for catalogue cards; Google cards retain their previous behaviour. Offscreen images unmount, downloads cancel when unused, simultaneous consumers deduplicate. In-process public photo cache: at most12 entries, approximately8MiB encoded characters,24h freshness,60s failure backoff,15s transfer timeout,512KiB maximum file. No polling, bulk image prefetch or new durable image-byte store; platform HTTP cache is managed by the platform.
- Existing20-summary pagination, account-scoped query caching,15-minute freshness,8 pages/40KB,24h offline bounds, conditional revalidation,40 saved public summaries/80KB,5 menus/1.2MB and default/Home/Work selection remain unchanged. Catalogue index is89,716bytes; image bytes are separate. This cover is25% smaller than the237,453-byte source thumbnail.

## Verification and deployment

Local TypeScript, scoped ESLint and clean whole-server/web export completed. Browser evidence under `.local/photo-card-recovery`: light/dark at320/768/1440, original saved-ID persistence, menu/back, missing/broken images and no provider requests. A keyboard-label mismatch found by axe was corrected. Final confirmation/deployment evidence is appended below.

No food extraction repeated. Published175 menu IDs/223 source menus/12,084 food occurrences and174 distinct browse venues remain.167 coordinate IDs accepted;8 geographic holds remain. Full-menu gaps remain109 zero-food canonical branches,1,828 unnamed candidate IDs and2,527 held foods. Google research ledger remains2,419/2,500,81remaining, SHA-256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`.

## Recovered ID mapping (not new branch approvals)

| Place ID | Existing name/address evidence | Files | Published exact ID binding |
| --- | --- | ---: | --- |
| ChIJZSr57K0T2jER9vGz_2-ktRg | Zhen Xiang Vegetarian — 325 Woodlands Street 32 — 325 Woodlands Street 32 #01-131, Singapore 730325 | 3 | None |
| ChIJFxpZ8csZ2jERfyeOmdKYh4A | Ananda Bhavan (Buffalo Road) — Blk 663 Buffalo Road, #01-10, Little India Conservation Area, Singapore 210663 | 2 | None |
| ChIJ-c0qznIZ2jERtO9HJCNB-EI | Lian Xin Vegetarian; LIAN XIN VEGETARIAN FOOD COURT; Lian Xin Vegetarian Restaurant — Buddha Tooth Relic Temple basement — 288 South Bridge Road; 288 South Bridge Rd, 01, S058840; Basement, Buddha Tooth Relic Temple, 288 South Bridge Road, Singapore 058840 | 2 | None |
| ChIJJ3TQYyoZ2jER6SpaN6AXTAw | Unresolved identity — Address unresolved | 1 | None |
| ChIJNV7dz8cZ2jERfQnZgcYkrCo | Ananda Bhavan (95 Syed Alwi Road) — 95 Syed Alwi Road, Singapore 207670 | 8 | None |
| ChIJEW3hwp4Z2jERyEBhE4ss9Ws | Unresolved identity — Address unresolved | 1 | None |
| ChIJxS4H7hwT2jERBRdisyWBfUM | Elemen 元素 (Woodlands Height); elemen — Woodlands Height / elemen Academy; elemen — 1 Woodlands Height; 1 Woodlands Height #01-02, Koufu Headquarters, Singapore 737859 | 1 | None |
| ChIJi1X0AAUT2jERCwbOXFjnR8k | Vege Story Vegetarian 齋の傳說; Vege Story Vegetarian — Woodlands — 892C Woodlands Drive 50, Singapore 732892; 892C Woodlands Drive 50 #01-02, Singapore 732892 | 4 | None |
| ChIJF79kL6QZ2jERTIaJ2CyEbSk | Sufood; Sufood — Raffles City; Sufood (Raffles City) — 252 North Bridge Road; 252 North Bridge Road, #02-19/21, Raffles City Shopping Centre · 179103; 252 North Bridge Road, #02-19 to 21 Raffles City Shopping Centre, Singapore 179103 | 1 | None |
| ChIJseQ1k7gZ2jER7uusJ17hy5E | Gokul-Raas Vegetarian — 19 Upper Dickson Road, Singapore 207478 | 2 | research-gokul-upper-dickson |
| ChIJw7Bn0vYZ2jER7YWZKh57T4Y | Lotus Vegetarian Restaurant; Lotus Vegetarian — 201 Balestier Road; 201 BALESTIER ROAD #02-00,HOLIDAY INN EXPRESS & SUITES SINGAPORE NOVENA,Singapore 329926; 201 Balestier Road, Level 2, Holiday Inn Express and Suites Singapore Novena, Singapore 329926 | 2 | None |
| ChIJoy-YZqQT2jER2c3gPPpftaQ | Eight Immortals Vegetarian 八仙素食园 — 678A Woodlands Ave 6, level 2, Singapore 731678 | 1 | None |
| ChIJ-7uhXAAZ2jERzDXZijcEAeU | Yan Ci Xin Vegetarian; YAN CI XIN VEGETARIAN — 51 Old Airport Rd, #01-58, Singapore 390051; 51 Old Airport Road, #01-58, S390051 | 1 | None |
| ChIJqe44Co0Z2jERINoBk9gKjPo | Ru Yi Zhai Vegetarian — Blk 134 Geylang East Ave 1, #01-229, Singapore 380134 | 1 | None |
| ChIJTz74JQ0Z2jER4TOc1RrAgzQ | Coco Veggie Nyonya; CoCo Veggie Nyonya Cuisine — Marina Square — 6 Raffles Blvd, #03 - 130A Marina Square, Singapore 039594; 6 Raffles Boulevard #03-130A Marina Square, Singapore 039594 | 1 | None |
| ChIJ01wV1WwZ2jERSk88-PrWNFE | Whole Earth — Peck Seah Street — 76 Peck Seah Street, Singapore 079331 | 1 | None |
| ChIJDYfRxFAZ2jERpxY8H0_qYzU | Unresolved identity — Address unresolved | 1 | None |
| ChIJW9dJOqEZ2jERBgaxRD3FW00 | Unresolved identity — Address unresolved | 1 | None |
| ChIJJfDNwzAZ2jERTm98dUb4_q0 | True Veggie — 47 Lorong 27 Geylang; 47, Lorong 27 Geylang, 388179, Singapore; 47 Lorong 27 Geylang, Singapore 388179 | 1 | None |
| ChIJmzFIIrsZ2jERsR8ImZsdiXY | Herbivore; Herbivore — Fortune Centre — 190 Middle Road; Fortune Centre, 190 Middle Road #01-13/14, Singapore 188979; 190 Middle Road #01-13/14, Fortune Centre, Singapore 188979 | 1 | None |
| ChIJ65F9ozwY2jERPcuZ65LNjao | KWAN TZI ZHAI VEGETARIAN CUISINE — 134 Geylang East Avenue 1, #01-229, S380134 | 1 | None |
| ChIJOwdnq7cZ2jERSCAJQh3m_iY | Ki Su Shoujin Omakase — Tras Street — 60 Tras Street #01-01, Singapore 078999 | 1 | research-kisu-tras-street |
| ChIJWbs-UOwZ2jERwP0GZgSvsgk | Unresolved identity — Address unresolved | 1 | None |
| ChIJMdepCAEEBBARWeEP9knjBok | Unresolved identity — Address unresolved | 1 | None |
| ChIJaVJl-msZ2jERXPBXaaRx1Bk | Unresolved identity — Address unresolved | 2 | None |
| ChIJ_UhazXIZ2jER14cuFc9jkSc | Eight Treasures Vegetarian Restaurant; 8 Treasures; Eight Treasures Vegetarian; EIGHT TREASURES VEGETARIAN; Eight Treasures Vegetarian — Chinatown — 282 South Bridge Road; Nonbei Izakaya, 282 South Bridge Road, Singapore 058831; 282A South Bridge Road; 282 SOUTH BRIDGE ROAD #02,Singapore 058831; 282A South Bridge Road, Singapore 058831 | 1 | None |
| ChIJ4RA1sA4Z2jER3kOi_K5z8v8 | Greendot (One Raffles Place); GREENDOT; Greendot @ One Raffles Place — 1 Raffles Place; 1 RAFFLES PLACE ONE RAFFLES PLACE #03-23/24/25,Singapore 048616 ONE RAFFLES PLACE; 1 Raffles Place, #03-23/24, 048616, Singapore | 1 | None |

## Deployed confirmation — 2026-10-16T12:20:41.289701+00:00

`20261016-catalogue-photos1` is deployed to app and preview, based on `20261016-postal-bundles1`. Immutable738-file archive SHA-256 `4069a83acc122337d83c6b9c90c97e3e5ca1b2bcf359261859010dd1c43cbdd0`; unrelated source bytes preserved. All16 server API functions were exported together and passed module-collision/load-order checks. Backup and protected rollback snapshot `deployment-backups/20261016-catalogue-photos1` completed; active avatar jobs were0. Admin/database were not recreated.

Live browser checks pass for320/768/1440 light/dark, Save, menu/back, failed images, scrolling without repeated image downloads, wide Map, Saved, keyboard/Enter and largest app text. Scoped axe has zero violations; no runtime errors or unintended Google/provider requests. Six live theme/viewport captures plus large-text and Map captures were inspected. Postal079331/S(079331), suggestion selection, filters/back and rendered menu content pass after the photo deployment. TypeScript/scoped ESLint pass. The isolated server lint's unchanged better-auth/node casing warning is a Windows node_modules junction issue; root scoped lint passes.

Exact live web bytes match `entry-c7c96c8a479993faaa9461af2a19bbb0.js`. Android/iOS preview manifests and bundles return200, contain the owned-photo cache/card and postal guard, and retain the existing anonymous scopeKey. Bundles: 7,874,250/7,251,181bytes. Physical-device/native UI acceptance remains unverified.

Live menu fingerprints remain175 IDs/223 menus/12,084 occurrences. All9 catalogue pages contain174 unique browse venues; first20 summaries are10,389bytes (one observed request22.1ms, not a benchmark). Unchanged refresh204 and menu304 work. Google counts remain100 text/8 nearby/19 details/545 photos; budget/ledger unchanged. Runtime snapshot: app150.1MiB/768MiB, preview527.1MiB/1.758GiB while compiling native bundles; VPS28GB free/72% used. Local cache backup remains intact; no cleanup or pruning was performed.

The implementation is deployed; photographic coverage is still1/174, with173 honest missing-photo fallbacks. Recovery found44 files/29 unique images/27IDs, zero approved temporary-Google assets and no verified Makan Vegan/Soon Lai recovery. Full-menu and identity holds remain open as listed above. Evidence: `.local/photo-card-recovery/release.json`, `live-browser.json`, `live-extra-qa.json`, `live-native.json`, `catalogue-live-api.json`, `cache-qa.json` and `postal-live-browser.json`.
