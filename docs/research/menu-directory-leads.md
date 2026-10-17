# Singapore menu collection: independent directory leads

Checked **15 October 2026**. This pass gathers branch identity leads for the full-menu collection queue. It does not establish that menus have been collected, that every listing is still operating, or that a listing meets vegetarian or vegan requirements.

The machine-readable handoff is [directory-leads.json](../../data/menu-research/directory-leads.json). It contains **1,105 source-specific records**, **64 sources**, **1,043 records with a source-listed address**, **800 with an explicit six-digit postal code**, and **230 with a merchant or claimed merchant link**. Eleven address fields contain only a road or building label; those records explicitly need an exact address. The other 62 records have no street address. Counts are records before cross-directory deduplication, not 1,105 confirmed unique restaurants.

**29 new records have merchant-confirmed branch identity/address.** Another two Nature Cafe records preserve merchant-published addresses from an indexed primary-page extract but remain leads because a direct live request returned HTTP 403. Original directory IDs, names and address fields were preserved when adding the primary records.

## Sources and extraction denominator

| Publisher | Readable scope | Records | Evidence boundary |
|---|---|---:|---|
| [OneHungryHippo directory](https://www.onehungryhippo.com/restaurants) | Entire public page payload, 500 Singapore records | 500 | Community directory. Many underlying references point to Google Maps; those links were not followed. Facts cite the actually read directory page, not generated detail URLs. |
| [Companies.sg vegetarian category](https://www.companies.sg/places/category/vegetarian) | All 20 published pages, including 18 records on the final page | 474 | Leads only. Includes historical or registered-office records, duplicates and questionable category assignments. |
| [Friendly Vegetarian supplier directory](https://friendlyvegetarian.com.sg/directory) | All eight published pages | 79 | Only 17 cards supply a street address; many later cards say only Singapore or multiple locations. No address was invented for these records. |
| [Lookup vegetarian category](https://lookup.sg/vegetarian-restaurants) | All 21 directly linked business detail pages | 21 | The category advertises 397 results. Search pagination is disallowed by its robots.txt, so the remaining search pages were not crawled. The category includes mixed restaurants such as Salmon Samurai. |
| Primary merchant pages below | Eight identity sources, plus four research follow-up/failure sources | 31 | 29 merchant-confirmed address records and two indexed-primary Nature Cafe leads. This is identity confirmation, not complete menus or ingredient verification. |

The OneHungryHippo payload contains 500 unique record IDs, while its sitemap exposes 496 Singapore detail links and its homepage banner says 488+. The four payload records absent from the sitemap are Hup Seng Heng Vegetarian, Tian Yue Ci Hang Vegetarian Food, Vege Bear Vegetarian (Woodleigh), and Yuan Yuan Vegetarian Cuisine. They remain unverified leads with that discrepancy recorded.

Research credibility judgments: merchant-owned outlet pages are stronger identity evidence than directory listings; their undated presence does not prove current operation. OneHungryHippo and Lookup are useful discovery sources, while Companies.sg and the supplier directory require greater branch and category checking. No directory label is treated as ingredient certification.

## Merchant-published branch identities

| Primary source | Address records | What was checked |
|---|---:|---|
| [Daily Green locations](https://www.dailygreen.sg/locations) | 8 | Hougang Mall 538766; Bedok North 460217; Ang Mo Kio 560721; Geylang 388248; Ubi 408722; Woodlands 730306; Shaw Plaza 329783; NTU South Spine 639798. Full source-listed addresses and units are in the JSON. |
| [Nature Vegetarian Delights restaurants](https://www.naturevegedelights.com.sg/our-restaurants/) | 2 | Bukit Batok Skyline II 651296 and Sengkang Rivervale Shores 540171. The source links restaurant menus; menu transcription is handled separately. |
| [Zi Zai Vegetarian Group ordering hub](https://online.zzv.sg/index.html) | 12 | Zi Zai five branches; Divine Realm Vegetarian; Divine Realm Family; Greenland; Time's Vege; Zhen Yi Veggie; True Veggie; Veganbliss. D'Life records were left to the other researcher. Exact merchant order URLs were retained. |
| [Green on Earth store page](https://greenonearth.oddle.me/en_SG/stores) | 1 | The Rail Mall store states **386 Upper Bukit Timah Road, 678043**. A directory states 384; the disagreement remains explicit rather than overwriting that lead. Tampines is not confirmed by this store page. |
| [Leaf Corner contact page](https://leafcorner.sg/contactus) | 3 | Sembawang 759269; Tai Seng 369551; Nanyang Community Club 649040, with exact units where stated. |
| [Sunnychoice website](https://sunnychoice.com.sg/) | 2 | Bukit Batok 650630 and Bukit Merah 150125, including the source's multi-unit wording. [Our Cafe](https://www.sunnychoice.com.sg/our-cafe) has named dishes/prices and is queued for separate food-only extraction. |
| [Nature's Harvest Vegetarian](https://naturesharvestsg.com/) | 1 | Fernvale 797650 is a **retail grocer and collection address**. It must not be counted as a prepared-dish restaurant menu without separate evidence. |
| [Nature Cafe contact page](https://www.naturecafe.com.sg/contact/) | 2 leads | Indexed merchant content lists Alexandra 159971 and SMU 178901; direct HTTP 403 prevents live verification in this pass. |

Two Zi Zai hub discrepancies are retained: Bishan is listed on the group landing page but not in the current four-outlet pickup selector; True Veggie's location label says Geylang Lor 7 while the actual street address says Lorong 27. Neither discrepancy was silently resolved.

## Failures and boundaries

- `vegetarianrestaurantsingapore.com` returned HTTP 406 from Mod_Security; no bypass was attempted.
- `www.greenba.com.sg` could not resolve in the direct request.
- `sufood.com.sg` failed TLS certificate validation; certificate verification was kept enabled.
- [Real Food](https://www.realfoodgrocer.com/) is publicly under construction and supplied no branch addresses in the readable page.
- Two Lookup area pages timed out through the web tool. Search pagination was not used as a fallback because its robots.txt disallows `/search`.
- No paid Google API requests, Google Maps metadata scraping, account sign-ins, CAPTCHA bypasses, merchant messages, or media downloads were used for this pass. No descriptions, reviews, ratings, menu artwork, or photos were imported into the lead JSON.
- No exact Google place ID appeared in the checked merchant page links. Existing-directory matching is a separate, explicitly bounded IDs-only task; a directory name match must remain a candidate until branch identity is reconciled.

## Verification and collection handoff

The JSON parsed successfully with **1,105 unique lead IDs**, **64 unique source IDs**, zero missing source references, and only the agreed `lead`/`merchant-confirmed` lead statuses. All original 1,072 lead IDs and their name/address fields were retained. Hippo source references were corrected to the actually read directory page; no detail-page visit is implied. The file uses one record per line and remains below 2,500 lines.

This data is private research material, not a consumer catalogue import. It does not change the app, pilot catalogue, billing, credentials, API quotas or publication records. Google ID resolution, branch deduplication, dietary eligibility and dish-source collection remain separate steps. An unresolved identity is **not** a location with no available menu data.

The next useful food-menu batches are the merchant-owned Nature Vegetarian Delights/Nature Cafe PDFs, Sunnychoice's named food list, Leaf Corner's readable menu, Daily Green's published menu, and the non-D'Life Zi Zai group ordering sites. Each must preserve exact branch/source applicability, exclude beverages and retail groceries, and report partial or unavailable evidence honestly.
