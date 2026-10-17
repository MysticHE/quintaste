# Ascend, Coco Veggie, Moon Chay and Sproutz

Checked 15 October 2026. [Research data](../../data/menu-research/menu-ascend-coco-moonchay-sproutz.json): 168 source-specific food records, seven menus, five branch/lead records and 13 sources. Counts overlap across sources; these are not 168 distinct dishes or five completed current venue menus. No app or canonical publication changes.

| Location | Source food records | Coverage and gaps |
| --- | ---: | --- |
| Ascend, Esplanade Xchange, 90 Bras Basah Road #B1-12/12A, 189562 | 0 | Official page confirms address but publishes unnamed food photos. Its exact merchant-linked Grab page returns HTTP403. No dish guesses from photos. |
| Ascend, 18 Cross Street, 048423 | 1 held | Secondary branch lead and weighted Malatang offer only. Base fee and per-100g rate are separate, without inventing a fixed bowl price or transferring it to Esplanade. |
| Coco Veggie Nyonya, Marina Square #03-130A, 039594 | 41 | All five food categories captured. Every rendered product is Out of stock. Current operation and ordering availability remain unconfirmed; no permanent-closure inference. |
| Moon Chay, Fortune Centre #02-27/28, 188979 | 93 | 35 ordering foods, 29 linked-PDF foods and 29 homepage food offers. Sources overlap, prices differ and effective menu dates are unstated. |
| Sproutz Downtown, Downtown MRT #B1-05, 018969 | 33 | 29 food offers plus four unpriced bento food choices. Rotating counter dishes are unnamed; four beverage-inclusive package prices and all drink rows excluded. |

## Ascend

The [official website](https://ascendvegetarian.com/) supplies five food photographs without dish-name or price labels. All five full-size photos were downloaded; three were directly inspected and none was used to infer a menu name or price. The [merchant-linked Grab URL](https://r.grab.com/g/6-20241110_135443_D7064443488344A79E991437CFA7E17E_MEXMPS-4-C6MEJJWKLFTGME) resolves to merchant `4-C6MEJJWKLFTGME` and returns HTTP403. Collection stopped without bypass.

The website's text says B1-12 while its embedded address label says B1-12/12A. Both unit forms remain explicit. A separate [18 Cross Street directory entry](https://www.onehungryhippo.com/restaurants/ascend-vegetarian-18-cross) supplies a weighted Malatang offer at 3.50 per 100g plus 1.00 base fee. This remains held secondary evidence for a separate unconfirmed branch, with currency unknown. Bellevue's similarly named Ascend restaurant was not used.

## Coco Veggie Nyonya Cuisine

The public [ordering storefront](https://cocoveggienyonyacuisine.oddle.me/en_SG) and [Store page](https://cocoveggienyonyacuisine.oddle.me/en_SG/stores) identify 6 Raffles Boulevard #03-130A. All five categories were scrolled in managed Chromium: seven single meals, nine rice offers, seven noodles, four tofu and 14 vegetables. The 41 rendered product IDs exactly match the public embedded source, and all 41 say Out of stock. Each has one published SGD variant and no modifier groups. The food named Su Gu Cha is a meal/soup in the single-meal category, not a beverage excluded merely for the word tea.

All facts remain a partial source listing because none of the displayed foods is currently orderable and actual operation has not been independently established. Published hours are not evidence of stock or permanent operating status.

## Moon Chay

The [official site](https://moonchayvegetarian.com/) links both [ordering](https://moonchayvegetarian.oddle.me/en_SG/) and the [16-page PDF](https://moonchayvegetarian.com/wp-content/uploads/2024/07/moon-chay-menu_compressed.pdf). The ordering [Store page](https://moonchayvegetarian.oddle.me/en_SG/stores) gives Fortune Centre #02-27/28.

All 11 ordering categories and 54 products were scrolled and checked against their source IDs. The retained 35 standalone foods exclude 15 drinks and four beverage-inclusive lunch sets. Retained products have one SGD variant each and no modifier groups; one actual food modal was also captured. Source availability flags are preserved.

All 16 PDF pages were rendered and visually inspected. Pages 1–10 contain 29 named food offers with 35 explicit portion prices. Pages 11–15 are drinks; page 16 is closing art. Menu-code gaps were not filled with invented dishes. Hotpots retain S/M/L prices, rolls retain 2/4-piece prices, and the pancake's 20-minute preparation note is separate. The PDF's soup schedule specifies Monday/Thursday/Saturday versus Wednesday/Friday/Sunday, without a Tuesday rule. That omission is not treated as Tuesday closure or current ordering stock.

The homepage contains 29 named, priced food showcases, all captured with explicit size/quantity labels. Its Chao Hotpot S12.80/M20.80/L31.80 differs from the PDF's S14.80/M21.80/L31.80. Neither source overwrites the other or the ordering prices. July 2024 in the PDF upload path is not an effective menu date; the file remains currently linked, with revision date unknown. Unqualified dollar symbols remain unknown currency in PDF/homepage facts. Descriptions and health claims were not copied into food records.

## Sproutz Downtown

The [current site](https://www.sproutzdowntown.com/) identifies 15 Central Boulevard #B1-05. Its [menu page](https://www.sproutzdowntown.com/menu) links the [two-page PDF](https://www.sproutzdowntown.com/_files/ugd/58d4dd_173e19f9e7a0458f83c058a255664338.pdf). Both pages were rendered and inspected; the drinks page is excluded.

Food-page coverage is eight breakfasts, one weighted lunch offer, four unpriced bento food choices, four weekday specials, five salads/snacks and 11 desserts. The weighted offer retains its minimum 250g, 3.98-per-100g rate and displayed minimum 9.95, rather than presenting the rate as a fixed full-meal price. The source says over 100 cuisines rotate, around 15 daily, but does not name them; no additional foods are invented. The four lunch bento **food names** remain unpriced because the package includes a drink. Its 15.00 package price is excluded.

Avocado top-up, cucumber/avocado maki prices, weekday schedules and dessert hot/cold choices are retained. The dine-in 10% service charge is separate. Currency code and revision date are unstated. The site's allergy/MSG wording differs from the PDF's headline claims, so none is used as certification. The [catering enquiry form](https://www.sproutzdowntown.com/catering) has no named dish composition; no enquiry was submitted, and no generic quote was turned into a menu dish.

## Validation

All 95 ordering products across Coco and Moon Chay matched their 16 rendered category sections, with zero missing/extra IDs. The packet total is 0 + 1 + 41 + 35 + 29 + 29 + 33 = 168. Source/branch/menu/item IDs and references validate. Menu artwork stays in scratch evidence; research data contains food facts, source links and qualifiers. No Google paid calls or unrelated edits were made.

Evidence: `../tmp/qa/menu-ascend-coco-moonchay-sproutz/`, including per-category audits, rendered PDF pages, source HTML, exclusions and `research-validation.json`.
