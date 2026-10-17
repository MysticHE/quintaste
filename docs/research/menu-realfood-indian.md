# Real Food, Ananda Bhavan, Komala Vilas and Gokul menu research

Checked **15 October 2026**. Raw evidence is in [`menu-realfood-indian.json`](../../data/menu-research/menu-realfood-indian.json). This is a research batch for the wider 2,322-place inventory, **not completion of that inventory and not a reviewed production catalogue**.

The file contains **35 source records, 15 source-address/concept records, 15 menus and 1,281 source-specific food records**. There are **998 base prices, 72 separately labelled promotional prices and 20 explicit price options**. Repeated dishes across a merchant catalogue, delivery platform and PDF remain separate source versions; 1,281 is not a count of unique dishes or verified venues. The two conflicting Ananda Changi address records may represent one outlet and must not be counted as two confirmed locations.

`source-covered` means the named food rows within that particular accessible source were collected. It does not establish current opening, live stock, exact Google identity, effective menu date, every branch's applicability, or community/merchant review. Four menus have this coverage; seven are partial and four are unavailable.

## Per-location breakdown

| Location / source address | Collected food evidence | Status and remaining setup |
|---|---|---|
| Real Food, 181 Orchard Road #02-16, Orchard Central, 238896 | 47 food delivery records; base and displayed promotional prices | Partial: all listing food rows collected, but customizable item details are absent. Merchant website is under construction. Other references use #02-17 or #02-16–19; exact unit is unresolved. |
| Real Food, 30A Yishun Central 1 #01-08, 768796 | 25 food delivery records; property directory independently identifies Real Food at the street address | Partial: all listing food rows collected, but customizable item details are absent. Property page does not give a unit; directory leads also use #01-08/09 or #01-09. |
| Ananda Bhavan, 58 Serangoon Road, 217964 | 120 branch delivery foods; 263-name official brand catalogue | Partial: two dishes have unlabelled price variants and missing item-detail options. Brand catalogue prices are not visibly published. |
| Ananda Bhavan, Blk 663 Buffalo Road #01-10, 210663 | Official identity and 263-name brand catalogue | Partial: no branch-specific priced menu found. Official page heading says “10 Buffalo Rd”, while its address detail gives Blk 663 #01-10; full detail is retained. |
| Ananda Bhavan, 95 Syed Alwi Road, 207670 | 145 embedded delivery-menu food rows; official 201-food home-delivery menu; brand catalogue | Partial for branch delivery: food rows exist only in public embedded page data, without rendered food cards. Each row carries `sourceVisibility: embedded-menu-data-only`; no current availability claim. Official home-delivery source is covered and explicitly permits self-collection here. |
| Ananda Bhavan, 448 Serangoon Road, 218138 | Official identity and 263-name brand catalogue | Partial: no branch-specific priced menu found. Other branch prices were not copied here. |
| Ananda Bhavan, official Changi address: 6 Changi Business Park Avenue 1 #01-29, UE Bizhub East, 486017 | Official identity and brand catalogue | Partial: address conflicts with delivery listing below; no automatic identity merge or price application. |
| Ananda Bhavan, delivery address: No.8 Changi Business Park Ave 1 #01-29, Biz Hub East | 126 food delivery records | Source-covered listing, but address identity is unresolved. Postal code was not inferred from a neighbouring block or stored Google ID. Kept as a candidate duplicate of the official Changi outlet. |
| Komala Vilas, 76–78 Serangoon Road, 217981 | Official identity and 20 unpriced brand showcase dishes | Partial: showcase is not a full priced menu. Both official-linked delivery destinations are inaccessible. Current operation is unconfirmed. |
| Komala Vilas, 291 Serangoon Road #01-00, 218107 | Official identity and the same 20-dish brand showcase | Partial: branch-specific applicability and prices are unconfirmed. Current operation is unconfirmed. |
| Komala Vilas Sweet and Savouries, 4 Upper Dickson Road, 207464 | Official shop identity | Unavailable: no specific public shop food/price list found. Restaurant menu prices were not copied. |
| Fennel by Komala Vilas, 413 River Valley Road, 248311 | Official sister-concept identity | Unavailable: linked merchant website failed to connect. This distinct concept is not assigned Komala Vilas restaurant prices. |
| Gokul-Raas, 19 Upper Dickson Road, 207478 | 190 live web food records; 132 PDF food records; 12 date-uncertain pickup specials | Web food-category source and PDF source covered. PDF effective date is unstated. The pickup-special source remains partial because it gives May dates without a year and repeats inconsistent component text. |
| Gokul Raas x The Social Kitchen @ Bank of Singapore, 63 Market Street Level 1, 048942 | Identity on PDF back cover only | Unavailable: no accessible concept-specific menu or current-operation confirmation. Upper Dickson's full menu is not assigned here. |
| Gokul Raas Plant Based Bowls x The Social Kitchen, Lau Pa Sat Stall 27, 18 Raffles Quay, 048582 | Identity on PDF back cover only | Unavailable: no accessible stall-specific menu or current-operation confirmation. Upper Dickson's full menu is not assigned here. |

Real Food directory leads at older premises, including South Beach and Square 2, do not establish current branches. No current menu or closure decision is inferred from those leads. An old merchant `/sb-salads` search result was investigated; a direct web fetch returned 404. Cached historical search snippets were not imported as a current menu.

Singapore **Ananda Bhavan** is distinct from Adyar Ananda Bhavan / A2B. **Komala Vilas** is distinct from Komala's Restaurants. Search results mixing those brands were excluded. The generated-looking `alokit-bot.github.io/ananda-bhavan-website/` page was not treated as an endorsed merchant source.

## Source counts and exclusions

| Source menu | Original scope | Food records retained | Exclusions / limitations |
|---|---:|---:|---|
| Real Food Orchard, Foodpanda | 62 embedded products | 47 | 13 beverages and two retail sourdough loaves excluded. Food modifier details are not in the listing. |
| Real Food Yishun, Foodpanda | 44 embedded products | 25 | 19 beverages excluded. Food modifier details are not in the listing. |
| Ananda 58 Serangoon, Foodpanda | 144 embedded products | 120 | 23 beverages and one Idly Podi Powder seasoning excluded. Two food products have unlabelled price variants. |
| Ananda Changi, Foodpanda | 144 embedded products | 126 | 17 beverages and one Idly Podi Powder seasoning excluded. Address remains a separate conflict. |
| Ananda Syed Alwi, Foodpanda | 164 embedded products | 145 | 18 beverages and one Idly Podi Powder seasoning excluded. All 145 food rows are embedded-only; two foods have unlabelled price variants. |
| Ananda official restaurant-food catalogue | All `homecategory` panes on public `/menus` page | 263 | Hot/cold beverage and cutlery panes, plus Idly Podi Powder seasoning excluded. Catering-package component lists not imported. Commented-out HTML prices ignored. Legacy years/internal-looking suffixes remain in names with explicit uncertainty. |
| Ananda official home-delivery catalogue | 237 food/drink/non-food cards | 201 | 32 beverage cards, two cutlery/serving-supply cards and two repeated same-name/same-price food cards excluded. All 14 ordering categories inspected. |
| Gokul interactive dining | 193 cards across all 15 non-drink categories | 190 | One Additional Paneer card is retained as an add-on under Vegetable Fried Rice in the PDF version; one same-name/same-price blueberry-cake duplicate is collapsed; one malformed description-as-title row with blank price is excluded. Proper Vegan Sardine Sambal remains. |
| Gokul dining PDF | 26 pages; 133 text food/price rows plus image-only hotpot page | 132 | Three drink pages excluded. One add-on and four extra option-price rows normalized under their parent foods. Four image-only hotpots included. Illustration/photo captions are not invented additional dishes. |
| Gokul linked pickup specials | 12 named food products | 12 | Source says 9–10 May with no year. Ten prices are S$13.90; the final two are S$14.50. Repeated component lists are not trusted or imported. |
| Komala Vilas official dish showcase | 20 named food cards | 20 | All prices unpublished; full delivery menus inaccessible. |

Prepared sweets, cakes, desserts, cooked sides and ready-to-eat savoury snacks are retained. Drinks, beverage-led bundles, raw seasoning, retail loaves, groceries and non-food supplies are outside this prepared-dish batch. Event catering packages were not converted into invented individual restaurant dishes or component prices.

### Preserved source details

- Delivery base prices and temporary 15% promotional display prices are separate. `sourcePriceText` preserves the displayed rounding; floating-point backend values are not substituted for the displayed discounted amount.
- Four Ananda products across the 58 Serangoon/Syed Alwi listings have two source variation prices each. Their labels are absent from the listing, so no “set”, “single” or portion meaning is invented.
- Food-set contents and explicit quantities are retained where that exact source states them. No generic full ingredient inventory or dietary certification is inferred.
- Official Ananda home-delivery terms exclude GST, impose a $20 minimum food order and separate delivery charges. These are not item-price additions. The introductory delivery/advance-order windows conflict with the detailed terms; neither was selected as the sole answer.
- Gokul PDF rates exclude GST. The PDF has no guaranteed effective date. It remains a separate version from the live interactive categories.
- Gokul Kurma and Sambal each retain all three named price options in both web/PDF versions. Additional Paneer is an additional $1 in the PDF, scoped to the adjacent Vegetable Fried Rice row, rather than an invented standalone dish or universal add-on.
- Indian Rojak keeps the Friday/Saturday/Sunday restriction. PDF hotpots retain “per hot pot”. Single-scoop ice cream retains the four stated flavour choices without an invented surcharge.
- Plain `$` displays remain currency `unknown`; explicit `S$` and explicit structured `priceCurrency: SGD` are recorded as SGD. Currency is not guessed from a Singapore address.
- Vegan/plant-based words appearing in source dish names remain part of those names. No vegan/allium flags, ingredient certification or Maps-derived facts were inferred.

## Sources and credibility

Scores describe provenance, not current availability: **5/5** is a direct merchant publication; **4/5** is a property owner's tenant publication or an exact outlet ordering menu. A merchant publication can still be undated, incomplete or stale.

| Evidence | Source URL | Credibility / access result |
|---|---|---|
| Real Food merchant website | https://www.realfoodgrocer.com/ | 5/5 provenance; holding page says website under construction. |
| Real Food Yishun tenant identity | https://hyc.tzuchi.org.sg/spaces/dining/ | 4/5; property operator identifies the tenant and street address. |
| Real Food Orchard ordering menu | https://www.foodpanda.sg/restaurant/s5ej/real-food-orchard-central-s5ej | 4/5; cached successful 200 response, exact branch; no reviews imported. |
| Real Food Yishun ordering menu | https://www.foodpanda.sg/restaurant/wx6e/real-food-yishun-central-1-wx6e | 4/5; cached successful 200 response, exact branch. |
| Ananda merchant home | https://www.anandabhavan.com/ | 5/5; official navigation led to menu, outlets and home delivery. |
| Ananda official outlets | https://www.anandabhavan.com/outlet | 5/5; five address details; heading/address and Changi conflicts preserved. |
| Ananda official catalogue | https://www.anandabhavan.com/menus | 5/5; full public restaurant-food categories, visible names only; comments not prices. |
| Ananda official delivery | https://www.anandabhavan.com/order-online/home-delivery | 5/5; full ordering categories and fixed visible prices, separate delivery scope. |
| Ananda 58 Serangoon delivery | https://www.foodpanda.sg/restaurant/l5ol/ananda-bhavan-restaurant-serangoon-road | 4/5; exact branch listing and all embedded menu products. |
| Ananda Changi delivery | https://www.foodpanda.sg/restaurant/n4zb/ananda-bhavan-restaurant-changi-business-park | 4/5 for menu; address conflict prevents automatic matching. |
| Ananda Syed Alwi embedded menu | https://www.foodpanda.sg/restaurant/f8lz/ananda-bhavan-restaurant-95-syed-alwi | 4/5 for published embedded facts; rendered food cards absent. |
| Komala Vilas merchant home | https://komalavilas.com.sg/ | 5/5; identity/navigation. |
| Komala Vilas official contacts | https://komalavilas.com.sg/contact/ | 5/5; two restaurants, sweets shop and distinct sister concept listed. |
| Komala Vilas official showcase | https://komalavilas.com.sg/menu/ | 5/5; 20 dishes, no visible prices. |
| Komala Vilas delivery links | https://komalavilas.com.sg/delivery/ | 5/5 for official platform linkage; no full menu on this page. |
| Official-linked Komala Foodpanda | https://www.foodpanda.sg/restaurant/y1kv/komala-vilas-restaurant | 403 access denied; stopped, no retry/bypass. |
| Official-linked Komala GrabFood | https://food.grab.com/sg/en/restaurant/komala-vilas-serangoon-road-islandwide-delivery-delivery/4-CZDTJF4KTEMERN | Static HTML was a menu-free shell; one managed-Chromium visit returned 403. Stopped. |
| Fennel sister website | https://www.fennel.com.sg/ | Connection failed / inaccessible. No closure inference. |
| Gokul merchant home | https://www.gokulraasvegetarian.com.sg/ | 5/5; live menu and ordering links. |
| Gokul official contact | https://www.gokulraasvegetarian.com.sg/contact.php | 5/5; live Upper Dickson address. |
| Gokul live dining page | https://www.gokulraasvegetarian.com.sg/dining.php | 5/5; all food tabs inspected. |
| Gokul tab responses | https://www.gokulraasvegetarian.com.sg/get_menu.php | 5/5; public read request is POST `cid` 1–13, 15, 16. All 15 responses successful. Exact request bodies are preserved in source records. Drink tab 14 was excluded. |
| Gokul merchant PDF | https://www.gokulraasvegetarian.com.sg/assets/img/gokulraas_dining_menu.pdf | 5/5 provenance, date unstated; 26 pages downloaded, rendered and visually checked. |
| Gokul official-linked pickup source | https://ongobooking.com/gokulraas/ | 5/5 linkage; menu date and repeated component text unreliable. |
| Old Real Food South Beach menu path | https://www.realfoodgrocer.com/sb-salads | Search lead only; direct web fetch returned 404. No cached price import. |
| Orchard Central current tenant directory | https://www.fareastmalls.com.sg/en/orchard-central/shops | Property-owned directory readable, initial eight cards only; no Real Food address fact extracted from that page. |
| Real Food unit reference in property article | https://www.fareastmalls.com.sg/en/bijou/discover/fitness | Property-owned search result references #02-17; treated as an unresolved unit reference, not used to overwrite exact delivery address. |

A [March 2026 report](https://www.straitstimes.com/singapore/future-of-komala-vilas-in-doubt-as-iconic-restaurant-remains-shut-after-2-months) described a temporary Komala Vilas closure. Present operation remains unverified.

Robots were checked at these URLs before relevant scripted requests: `https://www.foodpanda.sg/robots.txt`, `https://www.realfoodgrocer.com/robots.txt`, `https://www.anandabhavan.com/robots.txt`, `https://komalavilas.com.sg/robots.txt`, `https://www.gokulraasvegetarian.com.sg/robots.txt`, `https://ongobooking.com/robots.txt`, `https://food.grab.com/robots.txt`, and `https://www.fennel.com.sg/robots.txt`. The last failed to connect; OngoBooking returned 404. No prohibited checkout, payment, account or catering routes were used. Foodpanda requests observed the five-second research crawl delay before the eventual denial; no further Foodpanda requests followed it.

Speculative Far East `/shops/real-food`, `/shops/shop?shopName=REAL+FOOD` and `/contact-us` URLs were unavailable through the web reader. They supplied no menu or address facts. No Google Maps URLs, paid Google APIs, CAPTCHA bypass, proxies or alternate Foodpanda domains were used. One browser check used the task's own managed headless Chromium; installed Chrome and user browser profiles were not used.

## Verification and remaining work

Scratch evidence: `C:/Users/huien/QT/tmp/qa/menu-realfood-indian/`. The JSON checkpoint is written atomically and uses compact one-record lines. It is 1,371 lines, below the 2,500-line limit.

`validation.json` records zero duplicate IDs, missing source/menu/branch references, invalid amounts, unwanted beverage categories, copied description fields, or inferred dietary/review/photo fields. All five delivery menus were cross-checked against original source product IDs and base prices, including every embedded-only flag and all variant counts. Every non-image PDF base/option price was confirmed on its cited page. All 26 PDF pages were rendered; all food pages were visually reviewed, including image-only page 2 and ambiguous page 18 columns. PDF drinks on pages 23–25 are excluded.

Before any production import, resolve the Changi street-number conflict and exact Real Food units, review embedded-only and legacy catalogue rows, obtain missing branch-specific menus/variant labels where merchant access permits, and keep undated PDF/specials separate from confirmed current offers. Do not treat catalogue collection as merchant/community review. Further collection should continue with the next uncovered inventory batch; this report does not close the full 2,322-place task.
