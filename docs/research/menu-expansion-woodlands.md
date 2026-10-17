# Woodlands menu expansion research

Checked on 15 October 2026. Research depth: exhaustive across the assigned accessible public merchant and exact-branch sources. The machine-readable fragment records the UTC check time.

The earlier menus were intentionally selected research samples. This pass captures 297 food records across seven source-specific menus for four existing venues. This is a count of records with cross-channel overlaps, not 297 unique dishes currently sold. Every dish retains unconfirmed suitability and incomplete ingredients. Beverages, beverage-containing course bundles and a zero-base box configurator are excluded.

The files are [the schema-valid catalogue fragment](../../data/pilot/research/menu-expansion-woodlands.json) and [machine coverage denominators](../../data/pilot/research/menu-expansion-woodlands-coverage.json). No canonical catalogue, publication manifest or app code was changed by this research task.

## Coverage meaning

`source-covered` means every food entry in that inspected source was captured. It does not establish every dish currently available at the venue. Historical menus and general brand menus retain their own notices, prices and uncertainty. Merchant menu facts do not certify complete ingredients, vegan/allium suitability, allergens or cross-contact.

## elemen Woodlands Height / Academy

The merchant identifies 1 Woodlands Height, Koufu Headquarters #01-02, Singapore 737859. Its branch ordering channel confirms the same address. Public ordering JSON-LD has 34 offers: 30 food entries in six food categories and four beverages. All 30 food offers were captured with SGD prices; checkout availability, dine-in equivalence and online charges remain unverified. ([Merchant locations](https://www.elemengroup.com.sg/locations), [branch store](https://elemenwh.oddle.me/en_SG/stores), [ordering menu](https://elemenwh.oddle.me/en_SG))

The merchant Menu page loads `/menu-brands` through a public `data-url` tab. All four menu images on that content page were fetched and visually inspected: general brand a la carte, weekday lunch, takeaway bento and Woodlands WH. The general image contains 31 individual food dishes; the Woodlands image contains 30. They are undated and differ from online ordering. They remain separate menus. General brand dishes are not assumed to be available at Woodlands. ([Menu index](https://www.elemengroup.com.sg/menu), [published menu content](https://www.elemengroup.com.sg/menu-brands))

Both printed a la carte images use only $, so currency remains unknown. Their footers specify 10% service charge and prevailing GST. These charges do not transfer to online prices. The five takeaway bentos are already captured in online ordering and were not duplicated as another menu. Three Woodlands dishes mention a vegan substitution; this is retained as a qualifier without certifying the default dish.

Eight beverages are excluded from each printed a la carte image, as are their two/three course bundles containing beverages. The separate Weekday Speedy Lunch promotion includes a drink and is excluded. Soups, desserts and sides remain food. Promotional descriptions, health claims and artwork were not imported.

## Vegetarian Kitchen by Daily Green, 306 Woodlands

The current merchant locations page supports 306 Woodlands Street 31, Singapore 730306. The exact delivery listing adds unit #01-19 and the same postal code. Its public response says CLOSED and exposes only four Hotplate products. All four were captured with SGD prices in a separate delivery menu. This does not establish permanent closure or a complete current branch menu. ([Merchant locations](https://www.dailygreen.sg/locations), [exact delivery listing](https://www.foodpanda.sg/restaurant/i408/vegetarian-kitchen-ji-xiang-su-xiao-chu-woodlands-street-31))

The live merchant Menus folder is empty. The older two-page merchant PDF remains downloadable. Both pages were visually checked against extracted text: page 1 contains numbered items 1-35 and page 2 items 36-79, with every item captured. Its metadata creation date, 16 August 2025, is not an effective/publication date. Current branch applicability remains unverified, so it is a historical brand menu. Printed $ does not identify currency; the footer explicitly says GST included. ([Live menu folder](https://www.dailygreen.sg/menus), [historical PDF](https://www.dailygreen.sg/s/VEGETARIAN-KITCHEN-MENU-A3-FA-V2.pdf))

The delivery and historical prices are not combined. For example, historical Hotplate Tofu is printed 16 versus delivery SGD 23.40; Black Pepper Monkey Head Mushroom is printed 20 versus delivery SGD 26. A complete current branch menu still requires a current merchant menu link/photo or further publicly exposed exact-branch categories.

## Zhen Xiang Vegetarian, 325 Woodlands Street 32

The exact delivery response identifies 325 Woodlands Street 32 #01-131, Singapore 730325. Its public HTML and embedded product state agree on 68 products in six categories: 3 sides, 22 a la carte, 22 rice sets, 8 noodles, 10 fried rice and 3 mala/hotpot. Every name, category, displayed SGD amount and from-price flag was compared with its visible HTML menu DOM. The Popular lane duplicates items and is not counted twice. ([Exact delivery menu](https://www.foodpanda.sg/restaurant/fqw9/zhen-xiang-su-shi-zhen-xiang-vegetarian-325-woodlands-st-32))

The first search-cached extraction showed 73 products; a later search returned another older category mix, confirming the cache is not a stable current denominator. Five rows in the first cached view are absent from the current direct response: Patong Assam Fish; Sambal Petai; Hainan Vegetarian Chicken Rice Set; Sambal Petai Rice Set; Patong Assam Fish With Rice. They were not imported as current-source items. Replace this menu's dish set during merge, or explicitly remove the old sampled `zhen-xiang-woodlands-street-32-sambal-petai-rice-set`; an add-only ID merge would preserve a stale 69th record.

The platform's egg indicators in the Fried Rice category and four noodle items remain factual qualifiers. Generic ingredient/marketing descriptions and reviews are excluded. Merchant control, dine-in prices, charges, checkout availability and dietary suitability remain unverified.

## SHU Vegetarian, 354A Woodlands Avenue 1

All 55 products across 13 food categories were captured from the exact delivery response. Public product state and HTML menu DOM agree. Mala Hotpot Set, Curry Chicken Pieces and Curry Fish retain starting-price semantics. ([Exact delivery menu](https://www.foodpanda.sg/restaurant/x3kk/shu-vegetarian-shu-fang-zhai-woodlands-avenue-1))

The platform uses postal code 730354 while the existing directory uses 731354. Building 354A, street and unit #01-01 agree; postal confirmation remains a gap. The SHU Oddle store identifies 259 Jalan Kayu, Singapore 799488. Its dishes and no-onion/no-garlic claims are excluded from Woodlands. Merchant control, current stock, charges, dine-in prices and complete dietary suitability remain unverified. ([Directory](https://www.foodgrove.sg/listing/shu-vegetarian/), [excluded cross-branch store](https://shuvegetarian.oddle.me/en_SG/stores))

Final merchant/social follow-ups found a Woodlands-specific social mirror with 2022-2024 posts. Several promotions identify other branches; the Woodlands-specific 2023 launch is historical. The linked Facebook profile was publicly throttled. These are recorded as excluded leads, with no current dishes/prices imported from the mirror or directory reviews. ([Woodlands social mirror](https://www.restaurants10.com/SG/Singapore/114925631195313/Woodlands-SHU-Vegetarian), [directory social lead](https://www.happycow.net/reviews/shu-vegetarian-north-singapore-169431), [unavailable public profile](https://www.facebook.com/114925631195313/))

## Vege Story, 892C Woodlands Drive 50 - held

Public Facebook profile metadata supports the vegetarian stall identity at 892C Woodlands Drive 50 #01-02 and broad economy-rice/noodle/zi-char categories. The page body exposes no readable current menu/posts. Directory-linked website HTTPS failed TLS; HTTP returned an empty 403; the www variant also failed. Exact-branch delivery/menu searches found no current public ordering menu. No login or challenge bypass was attempted. ([Public social profile](https://www.facebook.com/vegestory/), [unavailable website](https://wufu.co/vege-story), [directory lead](https://www.happycow.net/reviews/vege-story-north-singapore-202072))

The food denominator remains unknown and zero dishes were imported. Reviews and directory specialties were not converted into merchant menu evidence. The next useful source is a merchant-provided current menu link/photo or exact-branch ordering menu. Retrieval failure is not evidence of closure.

## Dough Culture, Admiralty Place - held

The parent merchant confirms 678A Woodlands Avenue 6 #01-09, Singapore 731678. Exact-branch delivery HTML exposes 37 products: 31 fixed food offers, one zero-base box configurator, four drink bundles and one beverage. Every category was checked, but zero dishes were imported because a meaningful current merchant vegetarian-venue claim remains unverified. The older 2020 parent release describes historical supplier/manufacturing capabilities and does not resolve current venue eligibility. ([Parent branch list](https://www.koufu.com.sg/our-brands/concept-stores/dough-culture/), [exact delivery menu](https://www.foodpanda.sg/restaurant/onau/dough-culture-admiralty-place))

The current .sg brand catalogue has 24 visible product names across two pages (16 + 8). Both pages were inspected. Managed headless Playwright confirmed its price elements are CSS-hidden, so those old cart-field amounts are not reported as visible prices. Brand products are not proof of Admiralty availability. About Us and CSR do not provide a current meaningful vegetarian-venue statement. ([Product page 1](https://www.doughculture.com.sg/product), [page 2](https://www.doughculture.com.sg/product?page=2), [About](https://www.doughculture.com.sg/about-us), [CSR](https://www.doughculture.com.sg/corporate-social-responsibility))

## Validation and merge

- Runtime `readPilotCatalogue` validation passed for four venues, seven menus, 297 dishes, 34 source references and two held candidates. Every dish has a category, source, unconfirmed suitability and incomplete ingredients. Every menu has coverage, scope and a notice.
- Exact automated equality checks passed for every public product name, category, price and from-price flag: Zhen 68, SHU 55 and Daily delivery 4. All 30 elemen online food offers matched public JSON-LD; four beverages were excluded.
- The two Daily PDF pages were visually inspected and numbered items 1-79 verified. Both elemen a la carte images, bento image and weekday lunch image were visually inspected. The four-image merchant page was exhausted.
- Historical and brand-only menus remain labelled. Unknown printed currencies remain unknown. Delivery prices do not overwrite historical amounts. Menu descriptions, reviews, health claims, ingredient certification, artwork and photos were excluded.
- Replace the dish sets for the seven included menu IDs during merge; avoid an add-only merge of stale samples. Preserve held candidates. The parent task owns publication, UI changes and correction workflows.
- No installed desktop Chrome, merchant outreach, login, purchases or paid Google calls were used. Browser verification used Playwright-managed headless Chromium.

Known evidence gaps are future source targets. No further current dish can responsibly be invented when the merchant does not expose a current menu.


## Coverage denominator table

UTC check time: 2026-10-15T08:16:19Z.

| Venue / source menu | Status | Food captured / visible | Beverage exclusions | Categories checked |
| --- | --- | ---: | ---: | --- |
| elemen Woodlands Height / Academy / elemen-wh-ordering | source-covered | 30 / 30 | 4 | Healthy Bento (5); STARTER (3); SOUP (4); HAWKER-LICIOUS (6); MAIN (9); DESSERT (3) |
| Zhen Xiang Vegetarian - 325 Woodlands Street 32 / zhen-xiang-woodlands-street-32-delivery-sample | source-covered | 68 / 68 | 0 | Sides 小吃 (3); A La Carte Dishes 单点菜 (22); Rice Set 套饭 (22); Noodles 面类 (8); Fried Rice 炒饭 (10); Mala Xiang Guo & Hotpot 麻辣香锅火锅 (3) |
| SHU Vegetarian - 354A Woodlands Avenue 1 / shu-woodlands-avenue-1-delivery-sample | source-covered | 55 / 55 | 0 | Fried Rice (4); Mala Hotpot 麻辣香锅 (2); Rice Sets (10); Vegetables (9); Noodles 面 (5); Extra (1); Eggs (4); VEG MEAT (4); A La Carte (4); BEANCURD (3); Soups (4); VEG FISH (3); VEG SEAFOOD (2) |
| Vegetarian Kitchen by Daily Green - 306 Woodlands / daily-green-woodlands-street-31-delivery | partial | 4 / 4 | 0 | Hotplate 铁板 (4) |
| Vegetarian Kitchen by Daily Green - 306 Woodlands / daily-green-published-menu | historical | 79 / 79 | 0 | Yong Tau Foo (2); Noodles (10); Rice (9); Soups (5); Traditional Flavours (4); Vegetables (5); Mushrooms (5); Egg Dishes (5); Claypots (5); Hotplates (5); Westerns (8); Pizzas (4); Snacks (12) |
| elemen Woodlands Height / Academy / elemen-brand-published-menu | brand-only | 31 / 31 | 8 + 2 drink bundles | Appetizers (2); Starter (4); Soups (4); Hawker-licious (6); Mains (11); Desserts (4) |
| elemen Woodlands Height / Academy / elemen-wh-published-menu | source-covered | 30 / 30 | 8 + 3 drink bundles | Starter (1); Bread (1); Salads (4); Soups (4); Chef's Specials (4); Mains (12); Desserts (4) |
| Vege Story - 892C Woodlands Drive 50 / held candidate | unavailable | 0 / unknown | unknown | No readable food menu |
| Dough Culture - Admiralty Place / held candidate | partial | 0 / 31 | 1 + 4 drink bundles | MUST TRY NEW LAUNCH! (8); FOOD (19); CONGEE & DESSERTS (4) |

## Held Dough Culture food facts

All fixed food offers below come from the exact Admiralty delivery response. They remain research-only and are excluded from the imported dishes. The separate 24-product brand catalogue is listed without its CSS-hidden prices.

| Exact branch delivery category | Food offer | Displayed SGD |
| --- | --- | ---: |
| MUST TRY NEW LAUNCH! | Taro Sweet Potato Mochi Balls (5 pcs) | 2.80 |
| MUST TRY NEW LAUNCH! | Taro Sweet Potato Mochi Balls (10 pcs) | 4.80 |
| MUST TRY NEW LAUNCH! | Golden Nian Gao Roll (2 pcs) | 3.20 |
| MUST TRY NEW LAUNCH! | CARROT CAKE STICK (4 PC) | 1.80 |
| MUST TRY NEW LAUNCH! | CARROT CAKE STICK (8 PC) | 2.80 |
| MUST TRY NEW LAUNCH! | COUPLE STICK | 3.40 |
| MUST TRY NEW LAUNCH! | YAM CAKE STICK (4 PC) | 2.20 |
| MUST TRY NEW LAUNCH! | YAM CAKE STICK (8 PC) | 3.70 |
| FOOD | Jemput Jemput 4pc | 2.80 |
| FOOD | YOU TIAO | 1.80 |
| FOOD | BUTTERFLY BUN | 1.80 |
| FOOD | SALTED BUN | 1.80 |
| FOOD | RED BEAN BUN | 1.90 |
| FOOD | 2 IN 1 SWEET CAKE | 2.20 |
| FOOD | 3 IN 1 SWEETCAKE | 2.20 |
| FOOD | GREEN BEAN CAKE | 1.80 |
| FOOD | TAPIOCA CAKE | 1.90 |
| FOOD | YAM CAKE | 2.30 |
| FOOD | CARROT CAKE | 1.90 |
| FOOD | PEANUT SESAME BALL | 1.90 |
| FOOD | VEGGIE BALLS (5 PCS) | 2.80 |
| FOOD | YELLOW BEAN SESAME BALL | 1.90 |
| FOOD | SWEET POTATO BALL (5 PCS) | 2.20 |
| FOOD | BANANA BALLS (5 PCS) | 2.80 |
| FOOD | BANANA FRITTER | 2.30 |
| FOOD | SPRING ROLL (VEG) | 2.30 |
| FOOD | SWEET POTATO SLICE | 2.60 |
| CONGEE & DESSERTS | YOU TIAO ROJAK | 4.60 |
| CONGEE & DESSERTS | TAU SUAN | 3.10 |
| CONGEE & DESSERTS | CRISPY SOYA SKIN | 4.40 |
| CONGEE & DESSERTS | CRISPY SOYA SKIN  (2 BOXES) | 7.90 |

Brand catalogue names, both pages:

| Brand product | Price / branch applicability |
| --- | --- |
| YOU TIAO | Not visibly stated / unconfirmed |
| BUTTERFLY BUN | Not visibly stated / unconfirmed |
| SALTED BUN | Not visibly stated / unconfirmed |
| RED BEAN BUN | Not visibly stated / unconfirmed |
| SESAME BALL YELLOW BEAN | Not visibly stated / unconfirmed |
| SESAME BALL PEANUT | Not visibly stated / unconfirmed |
| CARROT CAKE | Not visibly stated / unconfirmed |
| YAM CAKE | Not visibly stated / unconfirmed |
| SPRING ROLL | Not visibly stated / unconfirmed |
| CURRY PUFF | Not visibly stated / unconfirmed |
| SAMOSA | Not visibly stated / unconfirmed |
| VEGGIE BALL 5PCS | Not visibly stated / unconfirmed |
| GREEN BEAN CAKE | Not visibly stated / unconfirmed |
| TAPIOCA CAKE | Not visibly stated / unconfirmed |
| SWEET POTATO SLICE | Not visibly stated / unconfirmed |
| SWEET POTATO SWEET CAKE | Not visibly stated / unconfirmed |
| 3-IN-1 SWEET CAKE | Not visibly stated / unconfirmed |
| BANANA FRITTERS | Not visibly stated / unconfirmed |
| BANANA BALL 5PCS | Not visibly stated / unconfirmed |
| ROJAK YOUTIAO | Not visibly stated / unconfirmed |
| TAU SUAN | Not visibly stated / unconfirmed |
| VEGETARIAN PORRIDGE | Not visibly stated / unconfirmed |
| MINI SPRING ROLL | Not visibly stated / unconfirmed |
| CRISPY SOYA SKIN | Not visibly stated / unconfirmed |

## Sources and credibility

Credibility: 5 = merchant primary facts for their stated scope; 4 = exact-branch delivery facts with merchant-control/dine-in uncertainty; 3 = public social profile identity metadata without current menu verification; 2 = directory lead; 0 = inaccessible/unverified. Scores do not establish ingredient certification. The fragment retains inherited references at their original check times; 15 source records were added or updated in this pass.

| Source | Kind / credibility | Checked UTC | Evidence boundary |
| --- | --- | --- | --- |
| [Daily Green](https://www.dailygreen.sg/) | merchant / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [Daily Green locations](https://www.dailygreen.sg/locations) | merchant / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [Vegetarian Kitchen historical published menu - both pages](https://www.dailygreen.sg/s/VEGETARIAN-KITCHEN-MENU-A3-FA-V2.pdf) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Daily Green menu navigation](https://www.dailygreen.sg/promotions) | merchant / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [Vegetarian Kitchen306 Woodlands Street31 delivery menu](https://www.foodpanda.sg/restaurant/i408/vegetarian-kitchen-ji-xiang-su-xiao-chu-woodlands-street-31) | delivery-platform / 4 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Menus — Daily Green](https://www.dailygreen.sg/menus) | merchant / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Vegetarian Kitchen menu — accessibility recheck](https://www.dailygreen.sg/s/VEGETARIAN-KITCHEN-MENU-A3-FA-V2.pdf) | merchant-menu / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Dough Culture Admiralty Place full public delivery category inspection](https://www.foodpanda.sg/restaurant/onau/dough-culture-admiralty-place) | delivery-platform / 4 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Dough Culture — Products](https://www.doughculture.com/product) | merchant-menu / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Dough Culture — Locate Us](https://www.doughculture.com/gallery/locate-us) | merchant / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Dough Culture outlets](https://www.koufu.com.sg/our-brands/concept-stores/dough-culture/) | merchant / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Dough Culture complete brand product catalogue, pages1and2](https://www.doughculture.com.sg/product) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen signature takeaway bento image](https://images.squarespace-cdn.com/content/v1/609d2103ed36b46301aeb07d/c037c15b-f3c2-4506-b004-f6e975230808/ele+Bento+A1+Poster_Generic+V3_FA.jpg) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen cuisine](https://www.elemengroup.com.sg/elemen) | merchant / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [elemen brand a la carte menu image](https://images.squarespace-cdn.com/content/v1/609d2103ed36b46301aeb07d/fc4dfb24-ed80-4f14-bca7-d46e4fefa374/elemen+tv+Portrait.jpg) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen locations](https://www.elemengroup.com.sg/locations) | merchant / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [elemen official menu content and images](https://www.elemengroup.com.sg/menu-brands) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen official menu index](https://www.elemengroup.com.sg/menu) | merchant / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen ordering locations](https://elemen.oddle.me/en_SG) | merchant-ordering / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [elemen weekday speedy lunch offer image](https://images.squarespace-cdn.com/content/v1/609d2103ed36b46301aeb07d/890e557f-3bc0-4839-bf76-26c50ab81102/Speedy+Lucnh+Tv+screen.jpg) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen Woodlands Height full online ordering menu](https://elemenwh.oddle.me/en_SG) | merchant-ordering / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [elemen Woodlands Height store information](https://elemenwh.oddle.me/en_SG/stores) | merchant-ordering / 5 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [elemen Woodlands WH menu image](https://images.squarespace-cdn.com/content/v1/609d2103ed36b46301aeb07d/e52d875f-c436-4f48-a43b-ce4859a78b37/WH_TV-1080x1920px.jpg) | merchant-menu / 5 | 2026-10-15T08:16:19Z | Checked in this pass |
| [SHU Vegetarian354A Woodlands Avenue1 full delivery menu](https://www.foodpanda.sg/restaurant/x3kk/shu-vegetarian-shu-fang-zhai-woodlands-avenue-1) | delivery-platform / 4 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Shu Vegetarian — Woodlands Avenue 1 directory entry](https://www.foodgrove.sg/listing/shu-vegetarian/) | directory / 2 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [SHU Vegetarian ordering store information](https://shuvegetarian.oddle.me/en_SG/stores) | merchant-ordering / 5 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Vege Story directory entry](https://www.foodgrove.sg/listing/vege-story/) | directory / 2 | 2026-10-15T04:56:45Z | Inherited reference; original timestamp retained |
| [Vege Story — Woodlands directory links](https://www.happycow.net/reviews/vege-story-north-singapore-202072) | directory / 2 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Vege Story directory-linked website candidate](https://wufu.co/vege-story) | unverified / 0 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Vege Story directory-linked social candidate](https://www.facebook.com/vegestory) | unverified / 0 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
| [Vege Story directory-linked website accessibility recheck](https://wufu.co/vege-story) | unverified / 0 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Vege Story public social profile metadata recheck](https://www.facebook.com/vegestory/) | merchant-social / 3 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Zhen Xiang Vegetarian 325 Woodlands Street32 full delivery menu](https://www.foodpanda.sg/restaurant/fqw9/zhen-xiang-su-shi-zhen-xiang-vegetarian-325-woodlands-st-32) | delivery-platform / 4 | 2026-10-15T08:16:19Z | Checked in this pass |
| [Zhen Xiang Vegetarian in Woodlands](https://threebestrated.sg/vegan-restaurants/zhen-xiang-vegetarian-woodlands-199669917) | directory / 2 | 2026-10-15T05:35:27Z | Inherited reference; original timestamp retained |
