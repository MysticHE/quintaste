# Menu collection: Nature, Sunnychoice and Leaf Corner

Checked **15 October 2026**. This assigned batch contains **9 branch records, 8 source-specific menus, 18 sources and 1,115 food/price rows** in [menu-nature-sunnychoice-leaf.json](../../data/menu-research/menu-nature-sunnychoice-leaf.json). It remains private research pending branch matching and the normal publication/review process. No app, API, pilot publication, credentials or Google allocation was changed.

The row count includes explicit portion/price variants and repeated dishes at different branches; it is not a count of unique dishes. There are **806 numeric price rows** and **309 rows with no published price**. Currency remains `unknown`: these sources show `$` or plain numbers without an explicit SGD/country currency code. Missing prices are omitted rather than set to zero.

## Location breakdown

| Location | Address | Food records before price expansion | Stored rows | Coverage and gaps |
|---|---|---:|---:|---|
| Nature Vegetarian Delights, Bukit Batok Skyline II | 296A Bukit Batok Street 22, #01-62, Singapore 651296 | 159 | 301 | All named food offers and explicit price sizes in the linked branch PDF collected. Includes branch-only breakfast and specials. Price effective date and current stock are unconfirmed. |
| Nature Vegetarian Delights, Rivervale Shores | 171 Sengkang East Drive, #01-12, Singapore 540171 | 128 | 270 | All named food offers and explicit price sizes in the linked branch PDF collected. Bukit Batok-only breakfast and specials were not transferred here. |
| Nature Cafe, Alexandra Central Mall | 321 Alexandra Road, #02-27, Singapore 159971 | 83 | 83 | All named food offers in the linked Alexandra PDF collected, including weekday soups and dessert; exact branch prices retained. |
| Nature Cafe, SMU | Li Ka Shing Library, 70 Stamford Road, #01-22, Singapore 178901 | 101 | 101 | All named food offers in the linked SMU PDF collected, including pizza, porridge, weekday soups and dessert. No prices copied from Alexandra. |
| Sunnychoice, Bukit Batok | Blk 630 Bukit Batok Central, #01-154-#01-156, Singapore 650630 | 48 shared brand records | 51 shared rows | The complete readable brand website food list is available; it does not separately establish branch-specific stock or pricing. |
| Sunnychoice, Bukit Merah | Blk 125 Bukit Merah Lane 1, #01-158, Singapore 150125 | Same shared brand records | Same shared rows | Uses the one brand-scoped menu, without duplicating it or asserting that both branches sell every item. |
| Leaf Corner, Jurong West / Nanyang | 60 Jurong West Street 91, #01-09 Nanyang Community Club, Singapore 649040 | 100 | 100 | **Partial:** all accessible branch food names collected; no prices or size options are published in the viewer. Many named sets have no component list. |
| Leaf Corner, Tai Seng | 11 Irving Place, #02-01, Singapore 369551 | 106 | 106 | **Partial:** all accessible branch food names collected; prices, portions and some set components unavailable. |
| Leaf Corner, Sembawang | 5 Jalan Legundi, Sembawang Garden Arcade, Singapore 759269 | 103 | 103 | **Partial:** all accessible branch food names collected; prices, portions and some set components unavailable. |

`source-covered` means the accessible named food rows in that particular published source have been collected. It does not establish that a menu is current, exhaustive for every dining channel, ingredient-reviewed or available at the venue today. This batch has five source-covered menus and three partial menus; no checked branch has been incorrectly labelled as having no menu data.

## Primary sources and branch linkage

| Source | Scope and source boundary |
|---|---|
| [NVD restaurant page](https://www.naturevegedelights.com.sg/our-restaurants/) | Independently lists the two exact branches and links their respective restaurant PDFs. |
| [NVD Bukit Batok menu](https://www.naturevegedelights.com.sg/wp-content/uploads/NVD-BB-Menu-Sep-2026_Web.pdf) | 24 pages. Food on pages 2–23; beverage products on page 24 excluded. The filename is not treated as a guaranteed effective price date. |
| [NVD Rivervale menu](https://www.naturevegedelights.com.sg/wp-content/uploads/NVD-171-Menu-Sep-2026_web.pdf) | 21 pages. Food on pages 2–19; coffee/tea and drinks on pages 20–21 excluded. |
| [Nature Cafe menu page](https://www.naturecafe.com.sg/menu/) and [contact page](https://www.naturecafe.com.sg/contact/) | The live merchant links identify the Alexandra and SMU PDFs separately; current branch addresses were verified by the coordinating agent's web retrieval. Direct Python retrieval of the contact page returned HTTP 403 in this worker, which is recorded rather than hidden. |
| [Nature Cafe Alexandra PDF](https://www.naturecafe.com.sg/wp-content/uploads/2025/01/Menu-Alexandra-new.pdf) | 32 pages. Food on pages 4–12, 14–25 and the dessert column of page 27. Adjacent teas and beverage pages excluded. |
| [Nature Cafe SMU PDF](https://www.naturecafe.com.sg/wp-content/uploads/2024/11/Menu-181024_2.pdf) | 40 pages. Food on pages 4–12, 14–29 and 31. Pages 38–39 are blank. The old Redhill address printed in this PDF was not promoted into a new branch or used to override the current contact page. |
| [Sunnychoice Our Cafe](https://www.sunnychoice.com.sg/our-cafe) and [outlet website](https://sunnychoice.com.sg/) | All five food categories were read: brown rice, wholegrain noodle, ala carte, soup and dessert. Together they contain 47 food records; the all-menu page adds Lion's Mane Mushroom Rendang, making 48. Eight beverage products were excluded. The menu remains brand-scoped. |
| [Sunnychoice Wellness Fragrance Pot detail](https://www.sunnychoice.com.sg/our-cafe/blogart91) | Three prices, 13.90 / 18.90 / 23.90, are visible without size labels. The detail repeats them and says updated 24 August 2023. The rows retain unspecified price options rather than inventing small/medium/large sizes. |
| [Sunnychoice Thunder Tea Soup detail](https://www.sunnychoice.com.sg/our-cafe/blogart35) | Explicit labels S / B and prices 3.50 / 6.00 retained exactly. The detail says updated 21 July 2023; this is not a guarantee of present price validity. |
| [Leaf Corner menu](https://leafcorner.sg/menu) and [contact page](https://leafcorner.sg/contactus) | The actual public viewer has separate Jurong West, Tai Seng and Sembawang lists. All three were switched and checked in Playwright-managed headless Chromium. The viewer supplies names and menu codes but no prices; placeholder images were not imported. |

Merchant-owned pages and their directly linked branch PDFs are primary evidence for publication and branch identity. They do not independently verify ingredients or stock. No secondary review, food photograph or Google Maps metadata was used to fill a missing menu fact.

## Qualifiers retained

- Bukit Batok breakfast is restricted to **7:30–11am**. The five congee flavours preserve their Monday, Tuesday, Wednesday/Saturday, Thursday and Friday/Sunday schedules and while-stocks-last condition.
- NVD mala prices are **per 100g with a 450g minimum**, for dry, soup and spicy-sour preparations. They must not be presented as a whole-portion price. Published spiciness and numbness choices are retained as choices, without assuming ingredient suitability.
- NVD wraps and the applicable Rojak listings preserve the **until 3pm** restriction. Mini hotpots preserve **until 6pm**. Mushroom soup with housemade crispy bread preserves its **until 3pm** restriction.
- Small, medium, large, explicit piece quantities and 6–7 / 8–10 pax portions are preserved. Soup serving ranges differ from rice/noodle serving ranges and were kept separately.
- NVD's repeated Mapo Tofu and Rendang Mushroom promotional appearances are deduplicated by menu code within each branch menu. Bukit Batok pages 7–23 are text-identical to Rivervale pages 3–19; this exact comparison permits reuse of those source facts without assuming that other branches share prices.
- Nature Cafe's daily soups preserve their weekday schedules and included mixed brown rice. SMU's printed 4.00 prices and Alexandra's 7.00 prices remain distinct; filename years were not treated as current effective dates.
- The source's vegetarian restaurant context is explicit for mock meat/fish names. No vegan, allium-free, complete-ingredient or safety certification was inferred from a name, icon or photograph.

## Exclusions

| Source | Excluded records |
|---|---:|
| NVD Bukit Batok PDF | 18 coded beverage products on the drinks page |
| NVD Rivervale PDF | 25 coded beverage products across coffee/tea and drinks pages |
| Nature Cafe Alexandra PDF | 36 coded beverage products, including tea alongside dessert |
| Nature Cafe SMU PDF | 42 coded beverage products |
| Sunnychoice website | 8 beverage products |
| Leaf Corner Jurong West | 23 beverages and 7 explicit drink bundles |
| Leaf Corner Tai Seng | 5 explicit drink bundles and 1 takeaway fee |
| Leaf Corner Sembawang | 26 beverages and 4 explicit drink bundles |

Named food sets without an explicit drink remain as named food entries; unpublished components are an explicit gap. No standalone dish was invented by stripping a drink from a combined meal. Dessert products were retained from the merchant's dessert categories. No frozen groceries, retail ingredients, copied descriptions, reviews, ratings or artwork were imported.

## Verification and remaining work

[Validation evidence](../../../tmp/qa/menu-nature/validation.json) passed: all source/branch/menu/item IDs are unique, references resolve, nine postal codes retain six digits, prices are finite positive numbers, qualifiers/notices fit the 200-character import boundary, and the compact JSON is below 2,500 lines. All 117 PDF pages were rendered; all page overviews were inspected and price-sensitive breakfast, table and multi-column pages were checked at full size. Every food-bearing page contributes rows; all isolated Nature Cafe food codes are represented. Shared NVD pages were compared exactly before reuse.

The Leaf viewer's source data was checked against the actual rendered names: 130 / 112 / 133 entries before exclusions for Jurong West / Tai Seng / Sembawang. Managed Chromium reported zero page errors. No installed Chrome, desktop profile, paid Google request, Maps metadata scrape, CAPTCHA bypass or merchant outreach was used.

Remaining acceptance gaps are publication/identity matching for the app, current price/stock verification, unlabelled Sunnychoice pot portions, missing Leaf prices/portions/set contents, ingredient suitability and any inaccessible or unpublished off-source offers. These gaps must stay separate from a location with no readable menu source. Full-directory collection continues outside this assigned batch.
