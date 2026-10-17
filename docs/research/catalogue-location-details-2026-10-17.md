# Catalogue covers, hours and location details — 17 October 2026

The full-coverage goal remains active. This increment restores location details and adds six covers and eight hours records; it does not close the remaining coverage gaps.

## Restored place navigation

The catalogue card replaced the earlier live card's `/place` navigation with `/menu`. Its footer exposed hours and photo credits, but there was no owned place-detail route. Gallery-card taps now open `/place/catalogue-<id>`. The separate Menu button continues to open the simple dish list. Menu has a Location & Details link; Saved cards, saved-note links and native Map markers use the same place route. Map no longer describes every published venue's hours as unconfirmed.

The place page shows the owned cover, exact branch address, branch label, dietary venue label, Directions, Save, Share, Menu, verified schedules, source/attribution links, private notes and correction/report actions. Missing hours and photos remain explicit. Directions and Open Map launch external maps only after a tap; no map SDK, geocoding, discovery or paid Places call is introduced. Current phone numbers, ratings and reviews are not invented from the old live card.

Existing `catalogue-` bookmark IDs are preserved. Browse, Saved and direct place links share the public summary cache: maximum40 entries/80KB,24-hour offline expiry,60-second failure backoff, concurrent request deduplication,15-second timeout and last-subscriber cancellation. Private-derived distances are omitted from persisted summaries. Opening a listed place reuses its summary and photo; a fresh deep link fetches one owned summary. It does not load the whole catalogue or all menu items.

## New hours evidence

All sources below were checked on17October2026. The exact saved branch addresses and schedule qualifications are in [the hours registry](../../data/menus/catalogue-hours.json) and [the enrichment audit](../../data/menu-research/catalogue-enrichment-2026-10-17.json).

| Branch | Source | Accepted schedule / qualification |
| --- | --- | --- |
| Gokul,19Upper Dickson | [Operator FAQ](https://www.gokulraasvegetarian.com.sg/faq.php) | Daily and public holidays08:00–22:00; operator takes precedence over conflicting secondary listings. |
| Joie,Orchard Central#12-01 | [Operator contact](https://www.joierestaurant.com.sg/contact-us) | Daily12:00–15:00 and18:00–22:00; last orders14:00/21:00. |
| Lotus,201Balestier Level2 | [Merchant store information](https://lotusvegetarian.oddle.me/en_SG/stores) | Restaurant notice11:30–15:00 and17:30–21:30; last orders14:30/21:00. Days unspecified in the dine-in notice; ordering slots not substituted. |
| Lilac Oak,71Oxley Rise#01-01 | [Operator location](https://www.lilacoak.com/our-location) | Mon/Tue/Thu11:00–16:00,Fri–Sun11:00–18:00,Wedclosed. |
| Delcie's,34Whampoa West#01-83 | [Operator contact](https://delcies.com/contact-us) | Mon11:00–17:00,Tue–Sun11:00–20:00,PH11:00–15:00; Labour Day/CNYclosed. |
| Nature Café,Alexandra and SMU | [Operator menu/footer](https://www.naturecafe.com.sg/menu/) | Both exact addresses: daily10:30–21:00, last order20:45. |
| New Fut Kai,282Jalan Besar | [Operator contact](https://www.newfutkai.com.sg/contact/) | Tue–Sun10:30–15:00 and17:30–22:00; last orders14:30/21:30. Monday holiday/lunar1/15 exceptions and following-Tuesday closure preserved. Readable web open; direct workstationHTTP403 retained separately. |

Coverage is80/174 browse venues, with94 unconfirmed. There are175 menu IDs because one150Green alias is retained. Partial schedules are qualified; these records do not compute or claim live open/closed status.

## Six additional enhanced covers

Operator photographs were downloaded once, source URLs/hashes retained, visually inspected, then enhanced with built-in `image_gen`. Original captures and generated PNGs remain private under `.local/coverage-2026-10-17/references` and `generated`. Final compressed JPEGs are hash-addressed in `server-assets/catalogue`; exact paths, prompts, authors, dates and provenance are in [the photo registry](../../data/menus/catalogue-photos.json).

| Branch | Exact association |
| --- | --- |
| Lilac Oak,Oxley Rise | [Operator homepage](https://www.lilacoak.com/) displays the branded pastry photograph; its location page identifies the sole café. |
| Delcie's,Whampoa West | [Operator product page](https://delcies.com/products?items_per_page=all) supplies the cake photograph; contact page identifies the bakery. Food cover, not an interior or availability claim. |
| Joie,Orchard Central | [Operator homepage](https://www.joierestaurant.com.sg/) supplies the plated-food photograph; its contact page identifies#12-01. |
| Leaf Corner,Sembawang | [Operator contact page](https://leafcorner.sg/contactus) directly pairs this interior image with5Jalan Legundi. |
| Leaf Corner,Nanyang | Same operator page directly pairs the exterior image with60Jurong West Street91#01-09. |
| Leaf Corner,Tai Seng | Same operator page directly pairs the image with11Irving Place#02-01. Final upper-interior crop excludes diners; the first generated full-room variant was not published. |

Coverage is19/174, leaving155 missing covers. All44 recovered Google cache files and their backup remain unchanged. The12 prior recovered-reference enhancements remain separate from these six newly obtained operator references. Makan Vegan and Soon Lai's original screenshot photos remain unrecovered. Derivatives retain source rights and attribution; enhancement does not establish a new licence. No illustration badge was added. No image is used to infer ingredients, ratings, hours or current stock.

## Verification and release

TypeScript, uncached scoped lint, publication/source-register/catalogue checks and all three server-route load-order checks pass. Source foods remain12,084 public occurrences;2,527 held observations are unchanged. Cache tests cover concurrent hydration/requests, offline hits/misses,24-hour expiry, cancellation,60-second backoff and40-entry/80KB limits.

Browser checks cover gallery light/dark at320/768/1440, large text, keyboard focus, scoped accessibility, image failures, all six new covers, one-line menu rows/search/paging, place details at320/375/1440, exact address/schedules, explicit directions target, public-only sharing, legacy saves, menu/back, Saved, Map list and offline navigation. No automatic provider requests or runtime errors were observed. Native map marker behavior requires physical-device acceptance; web uses its established list fallback.

A stale Metro transform initially exported the prior isolated app root despite new source files. Clean export with `--clear` restored the actual new code; package validation now checks the specific place-route markers in the client. Candidates `20261017-place-details1` and`2` were built but never promoted. Candidate3 includes the Map marker and header corrections. All16 server API functions come from the same clean export, with module consistency checked. The760-file archive is based on the live`20261016-covers-hours-menu2`; unrelated page/navigation/icon source is preserved. Release `20261017-place-details3` is now deployed and healthy on app and preview. Backup, zero-active-avatar-job gate and promotion lock passed; rollback is `deployment-backups/20261017-place-details3`. Admin/database were unchanged. All175 live menu fingerprints,174 browse entries,19 asset hashes,204/304 responses, postal lookup, responsive gallery/place interactions and exact web bytes pass. Android/iOS manifests and current bundles pass with the existing scope key; physical-device UI remains unverified. Evidence: `.local/coverage-2026-10-17/release.json`.

## Storage, performance and remaining work

The19 active JPEG assets total2,767,666bytes, an increase of680,168bytes. They load only when needed, outside catalogue JSON. The full server-side summary index is123,769bytes and is paginated20 records per request. Menu data remains packaged JSON, not PostgreSQL menu tables. Existing menu-detail limits and simple-row presentation remain intact. Raw captures, prompts, reports and research are excluded from releases.

Google ledger remains2,419/2,500,81left; SHA256`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. No research or browsing Google API calls were added. Live counters were rechecked after promotion and remain text100/nearby8/details19/photos545.

Continue the branch queue in `.local/coverage-2026-10-17/queue.json`, the208 saved-page image candidate lists and newly discovered contact/outlet sources. HTTP success alone is not branch verification. Preserve conflicted Leaf Corner hours, academic Leaf Corner campaign pages, delivery-only schedules, repurposed domains and blocked image receipts as qualified findings. The109 zero-food canonical branches,1,828 unnamed candidate IDs,8 coordinate holds and2,527 held food observations remain research gaps. This increment changes no menu extraction or identity approvals.

Live first-page payload: 13,583 bytes for20 cards, observed59.2ms in one sample (not a latency benchmark).19 assets total2,767,666bytes; no eager all-photo transfer. VPS disk had27GB free (73% used). During native compilation, app memory was141.4MiB/768MiB and preview168.8MiB/1.758GiB; these are transient snapshots, not steady-state limits or leak measurements.
