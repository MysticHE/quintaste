# Supreme Vege food-menu research

Checked: 2026-10-15T10:59:52Z. Status: source pass complete for all 12 public menu PDFs linked by the merchant and its public Oddle menu.

This packet contains **721 food and portion records across 16 source-specific menus**, with **17 source records** for **one exact branch**. Repeated foods across channels, dated menus and packages remain separate observations; 721 is not a count of unique dishes.

Data: [menu-supreme-vege.json](../../data/menu-research/menu-supreme-vege.json). This is research evidence. No canonical catalogue, Google place ID, editorial review status or app behavior was changed by this collection.

## Exact location and applicability

| Branch | Exact source address | Coverage |
|---|---|---|
| Supreme Vege — Hotel Royal @ Queens | 12 Queen Street, Hotel Royal @ Queens #02-03, Singapore 188553 | Official Oddle store and merchant PDF address agree. All 16 menus link only to this branch. |

Oddle exposes one store, with pickup and delivery enabled. A branch address match does not establish a match to any existing Google place ID. Printed vegetarian/mock-meat food names remain source names; this packet does not certify ingredient contents, vegan suitability or allium status.

## Menu coverage

| Source/menu | Source denominator | Food/portion records retained | Price basis and limitations |
|---|---:|---:|---|
| Oddle online food menu | 17 tags; 118 food product IDs | 126 | All labelled portions; SGD verified in public merchant menu currency metadata. 13 products expose food modifier groups. |
| À la carte PDF | 94 offers, 2 pages | 102 | Four soups have 1 / 3–4 / 6–8 pax prices. Section prices for 9-inch pizzas and individual desserts captured. |
| CNY Eve PDF | 42 offers, 1 raster page | 44 | Two Yu Sheng offers have small/large sizes. Valid only 16 February 2026; entire menu held as expired. |
| Dine-in à la carte buffet PDF | 37 printed numbered foods, 1 page | 37 | Number 35 is absent in the source. Codes 1–7 limited to one serving per table. Per-person buffet prices remain menu context. |
| Standard/mini buffet PDF | 68 numbered entries, 2 pages | 66 | Two beverages excluded. Choose 7 for standard / 6 for mini. Named Asian-delight add-on amounts remain contextual charges. |
| Celebration/mini celebration buffet PDF | 58 numbered entries, 2 pages | 56 | Numbers 40 and 41 are absent in the source; two beverages excluded. Choose 8 for standard / 7 for mini. |
| Funeral buffet PDF | 90 numbered entries, 2 pages | 87 | Three beverages excluded. Choose 7; minimum 30 pax. |
| High-tea PDF | 48 checkbox entries, 1 page | 43 | Five beverages excluded. All food selections and printed additional-charge observations retained. |
| Bento/packet meal PDF | 58 component choices and 13 named food meals, 2 pages | 71 | Component choices are unpriced; only the 13 complete named food meals have their explicit whole-meal price. Minimum 30 of the same bento, two days advance. |
| Dine-in set PDF page 1 | 9 named food courses | 9 | Table prices for 8 and 10 pax stay at menu level. Five named platter components nested under the platter. |
| Dine-in set PDF page 2 | 8 named food courses | 8 | Table prices for 8 and 10 pax stay at menu level. Five named platter components nested under the platter. |
| Wedding Blissful / Celestial / Divinely | 9 food options per menu | 27 | Eight-course menus with a choice of one of the final two desserts. Three table-of-10 package prices remain menu-level observations. |
| Solemnization buffet | 36 food options across 6 categories | 36 | Category selection rules retained; lunch/dinner per-person prices and 120-person minimum stay at menu level. |
| Solemnization Chinese set | 9 food options | 9 | Final two desserts are alternatives. Lunch/dinner prices require at least 14 tables; source does not state pax per table. |
| Wedding package inclusions PDF | 1 page of service inclusions/terms | 0 additional food rows | Source supports package price/service terms; generic assorted nuts and unnamed breakfast do not supply a dish menu. Decorative dummy cake excluded. |
| **Total** | **12 PDFs / 21 pages + official ordering menu** | **721** | **16 menus; all readable eligible source food entries captured.** |

The exported records include 285 explicit food/portion prices: 126 in verified SGD and 159 with currency `unknown`, preserving the PDFs’ printed dollar symbol without inventing an ISO code. Of the latter, 44 are in the expired CNY menu. There are 18 stored modifier groups with 41 option records and 29 nested named food components. Modifier records repeated for explicit dish portions are not presented as unique options.

## Price, option and publication treatment

- Buffet, wedding, solemnization and dine-in table-set prices are menu-level observations. Their food-course rows have no standalone dish price. Bento component add-ons likewise have no standalone dish price.
- The 13 named bento food meals are food-only meal offers. Their price applies to the whole named meal, with the bulk-order minimum and GST qualifier attached. Component foods remain nested names without borrowed prices.
- Generic A/B/C packet/bento prices and exact rice/noodle/mock-meat/vegetable/side composition alternatives remain menu-level observations; they are not additional individual dishes.
- Explicit portions, preparation choices, paid food modifiers, extra charges and minimum/maximum selections are preserved separately. No price is inferred for an unpriced choice.
- GST/service charges follow each source. The dine-in buffet explicitly states 10% service and 9% GST. Other PDFs stating prevailing GST retain that wording without inferring a percentage. No final checkout total is calculated.
- Catering minimum pax, choice counts, delivery fees and bento advance-order restrictions remain with the corresponding menu. A charge such as +6.50 beside a buffet add-on is retained as printed, with its unprinted unit basis unresolved.
- All 44 CNY Eve food/portion records were valid only on 16 February 2026 and remain under `hold-expired-dated-offer`. Both the branch gap and CNY menu notice state this explicitly, in addition to the hold/date metadata. Its pre-February advance-order promotion is also expired.
- Other dated filenames remain evidence snapshots. Continued linking from the merchant site establishes public availability of the file, not current effective prices, stock or acceptance of an event booking.

## Conflicts and genuine limits

| Observation | Treatment |
|---|---|
| Merchant high-tea and bento links say 2026; filenames say 2025 and 2025a. Several files sit in a /2016/06/ directory. | Preserve link label, filename and URL; directory year is not treated as publication/effective date. |
| À la carte source repeats code SM04 for Diced Chicken and Firecracker Crispy Dice Chicken at different prices. | Both distinct food offers retained with unique record IDs and a source-code conflict notice. |
| Oddle Spicy Soup in Szechuan has separate Less Spicy and More Spicy groups, each minimum 1 / maximum 1 with one option. | Preserve the contradictory source configuration; do not invent a valid combined selection. |
| First dine-in set platter English says Fried Mushrooms while the Chinese label names vegetarian eel. | Preserve both as a language conflict; do not turn the wording into an ingredient assertion. |
| Solemnization set prints “Stuffed Morchella Served with Broccolini in Superior” with no following English word. | Retain the incomplete food name and flag it; no missing sauce/name invented. |
| Solemnization buffet lists Pizza under Desserts. | Preserve its source category and selection rule. |
| Bento Vegetarian Eel with Teriyaki Sauce prints $1 and high-tea Vegetarian Pizza prints $1.00 without a plus sign among component choices. | Retain charge text and unclear-basis notices; no standalone price inferred. |
| Mini Yam Cake and Mini Carrot Cake occur under both high-tea Deep Fried and Dim Sum. | Preserve each category context without claiming different ingredients. |
| CNY Yu Sheng add-ons are printed near both offers without an explicit per-offer assignment. | Keep Abalone Slices 10, Salmon Slices 10 and Crackers 2 as menu-level optional add-on observations. |
| Public Oddle “Vegan Handmade Dumpling 冷冻锅贴” tag is empty. | Zero frozen products available to transcribe; the category is excluded under the food-service scope. |

No linked PDF was inaccessible or left untranscribed. The outstanding gaps are **current effective dates/prices**, **live stock**, **merchant confirmation of source conflicts**, and **Google-ID/canonical mapping**. No access control was bypassed, no account/login was used, no merchant was contacted, and no Google API call or Google Maps scraping was performed.

## Sources

All sources below are merchant-owned or merchant-controlled ordering sources. Credibility is **5/5 for what that source displays**, with currentness separately qualified above. PDF SHA-256 values, page counts, link labels and source references are stored in the JSON; local downloaded originals, rendered page checks and extraction helpers are in `../tmp/qa/menu-supreme-vege/`.

| Source ID | Direct source | Pages / role |
|---|---|---|
| `supreme-vege-oddle` | [Official online food menu](https://supremevege.oddle.me/en_SG/) | merchant-ordering |
| `supreme-vege-oddle-stores` | [Official Queen Street store details](https://supremevege.oddle.me/en_SG/stores) | merchant-ordering |
| `supreme-vege-home` | [Merchant homepage](https://www.supremevege.sg/) | merchant-directory |
| `supreme-vege-dine-in` | [Merchant dine-in menu downloads](https://www.supremevege.sg/programmes-2/) | merchant-menu-index |
| `supreme-vege-catering` | [Merchant catering menu downloads](https://www.supremevege.sg/programmes/) | merchant-menu-index |
| `supreme-vege-pdf-01` | [CNY Eve à la carte menu — 16 February 2026](https://www.supremevege.sg/wp-content/uploads/2026/01/SV-CNY-EVE-ALA-CARTE-MENU-202PDF.pdf) | 1 |
| `supreme-vege-pdf-02` | [SV Dine-in Set Menu 8-10pax Download](https://www.supremevege.sg/wp-content/uploads/2025/10/Set-Meal-Dine-in-8-10pax-2025.pdf) | 2 |
| `supreme-vege-pdf-03` | [ALa-carte-bf-menu Download](https://www.supremevege.sg/wp-content/uploads/2025/06/ALa-carte-Bf-Menu-2025-PDF.pdf) | 1 |
| `supreme-vege-pdf-04` | [http:/Alacartespecial2025Download](https://www.supremevege.sg/wp-content/uploads/2025/04/Alacarte-special-price-2025-Updated-A.pdf) | 2 |
| `supreme-vege-pdf-05` | [2026 SV Standard Buffet-Menu](https://www.supremevege.sg/wp-content/uploads/2016/06/2026-SV-Standard-Buffet-Menu.pdf) | 2 |
| `supreme-vege-pdf-06` | [2026 SV Celebration Bf Menu](https://www.supremevege.sg/wp-content/uploads/2016/06/2026-SV-Celebration-Bf-Menu.pdf) | 2 |
| `supreme-vege-pdf-07` | [High Tea Menu 2026Download](https://www.supremevege.sg/wp-content/uploads/2016/06/High-tea-menu-2025.pdf) | 1 |
| `supreme-vege-pdf-08` | [Bento Set 2026Download](https://www.supremevege.sg/wp-content/uploads/2016/06/BEnto-Set-2025a.pdf) | 2 |
| `supreme-vege-pdf-09` | [Supreme Vege Funeral Buffet Catering Menu](https://www.supremevege.sg/wp-content/uploads/2016/06/Funeral-Order-form-2025.pdf) | 2 |
| `supreme-vege-pdf-10` | [Supreme Vege Wedding Package Menu2025](https://www.supremevege.sg/wp-content/uploads/2016/06/Wedding-Package-Menu-2025.pdf) | 1 |
| `supreme-vege-pdf-11` | [Supreme Vege Wedding Package Includes2025Download](https://www.supremevege.sg/wp-content/uploads/2016/06/Supreme-Vege-Wedding-Package-Includes-2025.pdf) | 1 |
| `supreme-vege-pdf-12` | [Solemnization Package Menu & Inclusions](https://www.supremevege.sg/wp-content/uploads/2016/06/Solemnization-Package-Menu-Inclusions-2025.pdf) | 4 |

## Verification

- All 12 PDFs downloaded successfully and all 21 pages inspected through text extraction and rendered page checks. The one raster CNY page was transcribed visually. Multi-column food codes and prices were assigned by their page positions, not flattened text order.
- Source denominators are checked against extracted food records, with explicit missing printed numbers and excluded beverage counts. Every exported menu and food record has valid exact-branch/source references; food IDs are unique across the packet.
- Validation passed for finite nonnegative amounts, currency/kind values, positive food prices, no beverage food rows, no priced buffet/package food components, the CNY hold, 30-set bento restriction, and both SM04 records.
- JSON parses successfully and is 782 lines, below the 2,500-line file limit. Scratch Python syntax/function-size checks also passed. No test files were added.

Source pass complete means the accessible source has been covered. It does not mean a venue/dish has received an editorial review or that every dish is available today.
