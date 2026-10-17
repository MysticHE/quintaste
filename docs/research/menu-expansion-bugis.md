# Rochor / Bugis menu expansion

Checked 15 October 2026. This pass expands prepared-dish facts from all accessible categories and menu pages for the five assigned locations. It excludes beverages, copied descriptions, product photographs and menu artwork. Research screenshots and downloaded pages stayed in temporary QA storage.

The previous four-item Teng and four-item Living Wholesome records, and eight-item Bodhi Deli record, were selected samples. Their short lengths did not establish a complete menu. Living Wholesome does publish a focused four-choice brand menu; its exact-branch delivery channel additionally provides priced variants and extras.

| Location | Food rows retained | Coverage boundary | Remaining source gap |
| --- | ---: | --- | --- |
| Teng Bespoke, Sunshine Plaza | 78 | All 11 public delivery categories | Closed ordering channels; current operation and dine-in menu unconfirmed |
| Living Wholesome, Fortune Centre | 11 | 10 exact-branch delivery rows plus one distinct brand-only choice | Yuan Yang branch availability and price unconfirmed |
| Bodhi Deli, Fortune Centre | 29 | All prepared dishes; every detail page inspected | Two ambiguous parent prices; stock, dine-in charges and dated notices need clarification |
| Herbivore, Fortune Centre | 0 | All 50 official gallery photographs inspected | No readable merchant dish-name/price menu obtained |
| Cookie Coffee, Fortune Centre candidate | 36 held | Both complete official food-menu images inspected | #01-28B versus #01-28 primary-address conflict unresolved |

The import fragment contains **118 dish rows, four menu sections, four existing venues and 47 sources**. The additional 36 Cookie Coffee rows are stored as held candidate facts in the coverage file. They are not silently presented as exact-venue published dishes.

- [Import fragment](../../data/pilot/research/menu-expansion-bugis.json)
- [Machine-readable coverage and held food facts](../../data/pilot/research/menu-expansion-bugis-coverage.json)

## Coverage evidence

### Teng Bespoke

All public food rows were extracted from the exact Sunshine Plaza listing. No drink category was present. Names, category headings and SGD prices were retained; conflicting platform ingredient descriptions were excluded.

| Source category | Rows |
| --- | ---: |
| Sharing Platters | 4 |
| Seasonal Thai | 10 |
| Appetizers/Salads | 7 |
| Maki | 11 |
| Grills | 5 |
| Tempuras | 3 |
| Side Dishes | 7 |
| Stir-Fry | 8 |
| Noodles | 9 |
| Rice | 3 |
| Japanese Bento Sets | 11 |

The [delivery listing](https://www.foodpanda.sg/restaurant/l8ul/teng-bespoke-vegetarian-japanese-dining-sunshine-plaza) shows CLOSED. The [Oddle storefront](https://tengbespoke.oddle.me/en_SG) reports that its shop is currently closed. Neither establishes permanent restaurant closure. The reported [merchant domain](https://www.tengbespoke.com.sg/) returned 502. Menu coverage therefore means the linked delivery source was covered, with current operation and availability explicitly unconfirmed.

### Living Wholesome

The [official site](https://livingwholesome.sg/) identifies two outlets and four shared bowl choices. The [Fortune Centre delivery listing](https://www.foodpanda.sg/restaurant/wd61/living-wholesome-vegetarian-food-fortune-centre) names #01-23 and supplies six Mains plus four Extras. Popular repeats were deduplicated. The three corresponding original bowl IDs are retained in the priced delivery section. Yuan Yang remains separate under brand-menu scope because it is absent from that delivery source.

All ten unique delivery rows were captured, including the without-tea-paste variants and the food accompaniments. A current direct fetch displayed Bee Hoon at S$1.80; the older search index displayed S$1.50. The fresh direct value was used. This is a delivery-channel price and does not establish a dine-in price. GST/service treatment is unstated.

### Bodhi Deli

The [merchant storefront](https://take.app/bodhideli) exposes eight category routes. All eight were checked, followed by all 29 prepared-dish detail pages. The six eligible food categories contain 12 favourites, one new item, five rice entries, three specials, five bites and three soups. Six Hot Beverages are excluded. Four uncooked/frozen retail products in the separate [Frozen category](https://take.app/bodhideli/c/clh83f5fa01v90flc5vwpcqwa) are counted separately and excluded from prepared restaurant dishes.

Portions, price ranges, option surcharges and schedules were retained as short factual qualifiers. Lontong is labelled Friday, Mee Soto Tuesday/Saturday and Assam Laksa Sunday. Lu Rou Fan has an old availability notice dated 14 March 2025; it does not establish present stock.

Chicken Cutlet Noodle exposes optional +S$5.80 noodle selectors with no standalone parent price. Mini Wok displays a zero-to-S$6.80 range with an unpriced KOLO option; three named choices show S$6.80. Their parent prices remain unknown rather than interpreting a placeholder as a free meal. The source metadata identifies SGD and enabled pickup at #03-26. Displayed prices include takeaway charges; other charges remain unstated.

### Herbivore

The [official home](https://www.herbivore.sg/) confirms Fortune Centre #01-13/14 and links the [gallery](https://www.herbivore.sg/bento-set). Managed headless Playwright Chromium loaded the gallery iframe and all 50 distinct photographs. The 100 image nodes are duplicate renderings of those 50 assets. Every photograph was visually inspected: there are no printed dish names, price labels or menu sheets, and captions are empty.

The linked [Instagram](https://www.instagram.com/herbivore_sg/) and [Facebook](https://www.facebook.com/pg/herbivoresg) could not be fetched publicly. Exact-branch ordering and menu searches produced community aggregators and third-party reviews, which do not establish a current merchant menu. No sign-in, access restriction or bot challenge was bypassed. A readable dated branch-menu export or merchant-provided sheets are needed; no current item list was invented from food photographs.

### Cookie Coffee held candidate

Both official food-page images now load successfully. The [dim-sum page](https://cookiecoffee.com.sg/blank/) links a [20-row numbered sheet](https://cookiecoffee.com.sg/__static/jdj5jdewjejym1jym3fwyvh4s0mzsljp/Dim-Sum-Menu-Temp-Lower-Res(8).jpg). The [rice-set page](https://cookiecoffee.com.sg/signaturericeset/) links a [16-choice sheet](https://cookiecoffee.com.sg/__static/jdj5jdewjhpnrefnykouytdamfvwthhz/Rice-Menu-Final-A3-Revised(2).jpg). Every row, piece quantity and displayed price is transcribed as factual candidate data. Two dim-sum rows offer flavour alternatives. The rice sheet's drink/ice-cream combo is excluded.

The [official home](https://cookiecoffee.com.sg/) still gives #01-28B in its main copy and #01-28 in its new-management footer. Food copy describes dim sum next door. No primary source resolves that distinction. Prices use a dollar symbol without a currency code; the rice sheet says nett without a tax breakdown. These facts remain held until exact premises, current menu and currency are confirmed.

## Source assessment

Scores indicate suitability for the stated evidence only, on a five-point scale. They do not measure ingredient certainty or current stock.

| Source | Score | Evidence use |
| --- | ---: | --- |
| Bodhi Deli self-published Take App | 5 | Exact pickup, currency, complete accessible prepared-dish categories and product qualifiers |
| Cookie Coffee merchant food images | 5 | Complete printed food facts; exact premises and currency code unresolved |
| Living Wholesome merchant site | 5 | Shared brand options and outlet identity; no prices |
| Herbivore merchant site/gallery | 5 | Branch identity and documented absence of a readable menu; photos do not establish dish facts |
| Exact-branch Foodpanda listings | 4 | Factual delivery names, categories and prices; no ingredient or dine-in equivalence claim |
| Teng branded Oddle closed notice | 3 | Ordering-channel status only |
| Menu aggregators and old reviews | 1 | Discovery leads only; not imported as current merchant facts |

## Verification and limits

The repository catalogue reader validates the fragment, including all source/menu/venue references. All 16 previous Rochor/Bugis dish IDs are retained. There are no duplicate dish IDs, copied descriptions or beverage rows. Every imported dish keeps suitability unconfirmed and ingredients incomplete. The file records source-specific coverage and warnings; it does not certify diets, guarantee a complete current dine-in menu, establish stock or perform publication/deployment.

Coverage file definitions distinguish eligible prepared dishes from beverages, frozen retail items, repeated Popular tiles and held candidate facts. Herbivore's total remains unknown. Cookie Coffee's 36 accessible food rows remain held. These gaps cannot be closed reliably by repeating the same public-source crawl; they require a readable merchant menu or exact-premises clarification.
