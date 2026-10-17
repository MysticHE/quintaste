# Additional catalogue covers and hours — 17 October 2026

The full-coverage goal remains active. This increment adds four enhanced covers and five branch schedules, taking the reviewed local catalogue to **23 covers and 85 hours records across 174 browse venues**. There are 151 cover gaps and 89 hours gaps. The existing 175 menu IDs include one retained alias; food extraction, menu prices and unresolved food holds are unchanged.

## Covers

Each reference was downloaded once, preserved, visually checked and enhanced with built-in `image_gen`. Original and generated images remain in `.local/coverage-2026-10-17/references` and `generated`; exact prompts are in `generated-<name>.json` and the canonical photo registry. Display assets are hash-addressed JPEGs in `server-assets/catalogue`, outside catalogue JSON.

| Branch | Reference and exact association | Result |
| --- | --- | --- |
| JO-YI CAFE, Bedok North #01-148 | [Operator menu](https://www.jo-yi.com/menu) identifies the branch and waffle photograph. | Improved light and texture; original waffle and two scoops retained. |
| Moon Chay, Fortune Centre #02-27/28 | [Operator homepage](https://moonchayvegetarian.com/) supplies the food photograph; existing exact-branch merchant evidence retained. | Original plate and food arrangement retained. |
| nomVnom, Clarke Quay Central #03-105/106/107 | [Operator gallery](https://www.nomvnom.com/gallery) explicitly labels the selected image “Clarke Quay Outlet”. | Interior light/detail enhanced. Separate JB City Guide food photo held; not assumed to depict Singapore. |
| Original Sin, Jalan Merah Saga #01-62 | [Operator menu](https://www.originalsin.sg/menu) labels the selected mezze photograph and identifies the address. | Food photograph enhanced. Exterior with people and Venuerific watermark retained as an unused reference. |

All image URLs, hashes, authors, review dates and prompts are recorded in `data/menus/catalogue-photos.json`. Source-page captures for JO-YI, Moon Chay and Original Sin date from 16 October; images and visual review were checked on 17 October. nomVnom gallery was checked on 17 October. Source rights and attribution remain; no new licence is claimed. Capture dates are unknown. Images do not establish ingredients, current availability or ratings.

The four new display assets total 627,220 bytes. All 23 active assets total 3,394,886 bytes. No Google cache reader, cache-expiry change or provider fallback is involved. The 44 recovered files and their backup remain intact.

## Hours

| Branch | Source | Accepted schedule and qualifications |
| --- | --- | --- |
| Green On Earth, Rail Mall 386/388 | [Property-manager directory](https://railmall.com.sg/our-stores/?type=dining) | Daily 11:00–22:00, last order 21:30. Exact tenant entry was available in the public indexed representation; direct HTML currently omits tenant content. Secondary conflicts and delivery slots were not substituted. |
| Kunthaville, 18 Veerasamy Road | [Merchant reservation listing](https://www.chope.co/singapore-restaurants/restaurant/kunthaville) | Tue–Sun 11:00–22:00, Monday closed. Manual review resolves the previous generic hold; explicit restaurant schedule is separate from delivery slots. Operator homepage returned 502, retained as a failed cross-check. |
| TianMu Vegetarian, West Coast Drive #01-230 | [Merchant About page](https://www.blockchef.com/store/tianmuvegetarian/about) | General operating schedule lists Tue–Sun 08:00–16:00. Monday is unspecified; closure is not inferred. |
| Zen Cafe, KMSPKS Level 1 | [Operator food-service page](https://kmspks.org/services/vegetarian-food/) and its linked [cafe menu](https://kmspks.org/wp-content/blogs.dir/1/files/ZenCafe_Digital-Menu.pdf) | Daily 10:00–17:00 in saved direct HTML and the linked PDF. Other monastery/indexed pages retain different hours; this discrepancy is visible in the notes. |
| KMSPKS Dining Hall / Happy Realm, Level 2 | [Operator food-service page](https://kmspks.org/services/vegetarian-food/) | Weekday bento 09:00–11:00; weekend mixed rice 09:00–14:00; Happy Realm Mon–Sat 09:30–13:30. The printed 13–20 December closure has no year; preserved unresolved. These are food-service windows, not general monastery hours. |

Manual checks are dated 17 October. TianMu, Kunthaville and KMSPKS reuse saved 16 October captures and previously inspected PDFs, avoiding duplicate menu extraction. Original Sin hours remain unconfirmed after its linked contact page supplied only an address. Boneless Kitchen remains held because secondary schedules disagree and the merchant ordering page supplies only delivery slots. Bao Su Zhai is a stall within Compass One; mall/food-court hours were not assumed to be stall hours.

The canonical additions and remaining per-branch queue are in `data/menu-research/catalogue-enrichment-2026-10-17b.json`. The prior generic holds remain in historical audits, with the new manual decisions recorded separately.

## Validation and deployment

Candidate `20261017-covers-hours4` is built from the deployed `20261017-place-details3`. Only three catalogue JSON files and four asset files change outside the complete rebuilt export. Restored location details, simple menu rows, navigation/icons and account/cache behavior are preserved. Clean export uses `--clear`; all API routes are exported together.

Release `20261017-covers-hours4` is deployed and healthy on app and preview. The764-file archive SHA256 is `43db303b7d878671399af7e48c526f0510d4ac547c1fbced513c647d0e000a31`. Backup, zero active avatar jobs and baseline/promotion lock passed; rollback is `deployment-backups/20261017-covers-hours4`. Admin/database were unchanged.

Catalogue validation, clean export, all three API load orders, all four new rendered covers and all five new schedules/qualification notes pass. Existing simple-menu search/paging checks pass. Live checks match all175 menu fingerprints, all85 schedules and23 photo records, all23 immutable asset hashes,174 unique browse entries,204/304 responses and location boundaries. No provider requests or runtime errors were observed. Exact web bytes and Android/iOS manifests/bundles pass with the existing scope key; physical-device UI remains unverified. Evidence: `.local/coverage-2026-10-17b/release.json`. The full-coverage goal remains active.

Live first20-card page remains13,583bytes, observed43.8ms in one sample. VPS disk27GBfree,73%used. During native compilation, app137.6MiB/768MiB and preview184.3MiB/1.758GiB; transient snapshots, not a benchmark. Live Google usage remains100/8/19/545. Source menus and assets are packaged on VPS; no PostgreSQL menu-table migration was introduced.

## Remaining work and performance

The full server summary index is 127,249 bytes and remains paginated; image bytes are not embedded in it. Existing bounded image, summary and menu caches remain. The research Google ledger is unchanged at 2,419/2,500, with 81 requests remaining. No new Google requests were made.

Continue exact-branch image mapping from saved merchant Getz pages, especially D'Life, SHU and Zi Zai. Shared brand food photographs require evidence that each selected branch actually exposes the reference; they must not be represented as branch interiors. The D'Life Orchard search surfaced a directory assigning the venue to Port Blair, India; that result was rejected as mislocated, not used for hours.
