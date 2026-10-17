# Greendot, SHU Vegetarian and D’Life menu research

Checked 15 October 2026. This is the chain research portion of the wider existing-location directory task. It does not represent completion of all 2,322 stored Google place IDs. No Google Maps scraping or paid Google APIs were used. Browser checks used the managed Playwright Chromium installation, not the user's Chrome.

## Meaning of coverage

- **Source covered:** all readable food offers and explicit labelled portions in the specified source were captured. This does not establish that the physical outlet's complete current menu is available, that an item is in stock, or that a dish has been independently reviewed.
- **Partial:** every accessible food card was captured, but portion/modifier labels or current merchant authority are missing, or a detail request remains unavailable. A few visible cards are not presented as the whole restaurant menu.
- **Unavailable:** no current exact-branch merchant menu was verified. Zero rows means a documented research gap, not that the restaurant has no menu or is closed.

Each price remains tied to its exact source, channel and selected outlet. Labels, prices and provenance are factual transcriptions; descriptions and artwork are not copied. The data makes no dish ingredient, vegan or allium-free certification.

## Source and price handling

Greendot's [official locations page](https://www.greendot.sg/locate-us/) links its [13-outlet merchant directory](https://restaurant.momos.io/greendot-c29da/locations). All 13 enabled restaurant pickup outlets were selected through the actual [ordering interface](https://orders.greendot.sg/). A URL with StoreID alone silently fell back to another outlet, so it was rejected as branch evidence. The selected heading, visible pickup address, actual product link and its outlet-specific document/index were checked together.

Getz product details were read using the public GET link invoked by the site's own product view. Some detail `businessId` labels are legacy owner labels such as “Master” or “(Member) Greendot HQ”; the exact observed `.clone.<outletIndex>` document and returned `branchIndex` identify the outlet. No cart, checkout, account or order mutation was used. Labelled portions and food modifiers remain nested under the dish. Optional drinks are excluded.

`price` is the visible list price where it can be reconciled with the source's labelled minimum. `detailBasePrice`, `packingFee`, `portionOptions[].price` and `modifierGroups[].options[].additionalPrice` are separate source observations. The displayed detail header may default to Large while Small is cheaper. A list price that does not match the labelled minimum is held as `listPriceObservation` with `priceStatus`, instead of inventing a minimum or tax calculation. Paid additions are not standalone dishes. Minimum-ten-set catering totals are not per-bento prices.

Greendot's [general printed menu](https://www.greendot.sg/food-menu/) was read across all 12 pages; pages 1–9 contain food and drinks, 10–12 brand/outlet information. The [2026 Plus menu](https://www.greendot.sg/2026-greendot-plus-menu/) was checked across all 23 pages: food on pages 5–20 and beverages on 21–23. Repeated feature-page dishes were deduplicated by source code. The [Kopihouse menu](https://www.greendot.sg/greendotkopihouse/) was read from both official images. Published general and Kopihouse menus remain brand-level research where exact current physical applicability is not explicitly established; the selected Seletar ordering menu already gives its exact current Kopihouse food offers. Jewel's printed Plus menu is scoped to Jewel. Printed `$` has no explicit currency code and is retained as `unknown` rather than inferred. Exact online outlet prices take precedence.

The high-tea food-and-tea package and three Nanyang toast-and-coffee/tea packages were excluded as beverage-led bundles. The local-delight flyer repeats three Plus dishes and adds no dishes. The signature flyer has no separately named/priced dishes. Drinks, uncooked ready-to-cook retail and non-food accessories are excluded. DIY rice/vegetable components and add-ons remain choices, not invented à-la-carte dishes.

The [Patisserie ordering site](https://patisserie.greendot.sg/Category), linked by the merchant, has 12 enabled pickup outlets. Each was selected and read independently. Its Paya Lebar catalogue has 22 food cards while the other pickup catalogues contain 6–8, so those 22 foods are not assigned wholesale to every outlet. These are pickup catalogues associated with the existing restaurant collection points, not evidence of 12 additional patisserie shopfronts. The printed footer's Paya Lebar Patisserie #02-21 is distinct from the ordering collection address #02-15/16/17; that unit difference is not silently merged. The [published Patisserie product page](https://www.greendot.sg/greendot-patisserie-products/) adds 38 distinct category/name observations after repeated bread cards are deduplicated. That undated brand catalogue has no prices and two ambiguous repeated generic names; it is partial, unassigned brand research. Candles, birthday decorations and non-food accessory options are excluded. Longevity Peach's four stated flavours and Full Moon Box's ten-box minimum are retained.

SHU's [official Oddle menu](https://shuvegetarian.oddle.me/en_SG) and [store page](https://shuvegetarian.oddle.me/en_SG/stores) apply to 259 Jalan Kayu. Public rendered/RSC catalogue data contains 19 tags, 87 unique product IDs and 146 variants across unique products. Signature/category duplicate occurrences were deduplicated by exact name, explicit portion and price. Same-name conflicting prices remain separate observations. Bento SET's zero configuration base is not a free meal: two main choices are SGD8.80 per bento, minimum 15, at least three working days ahead. Required/optional food choice groups are retained separately.

SHU's exact foodpanda branch menus were each captured from one successful ordinary public response. Early 403 responses and cached web fragments were superseded by a bounded later retry that returned full HTML. No CAPTCHA or access-control bypass was attempted. A managed Playwright check of the product-options interface returned “Access to this page has been denied” and stopped there. Public price variations lack portion labels; those numeric observations are retained as unlabelled and are never given invented Small/Medium/Large names. The old `shuvegetarian.shop` domain currently serves unrelated content and was excluded. foodpanda's generic descriptions sometimes mention meat/garlic despite the merchant name; descriptions were excluded and cannot establish ingredients.

The [official ZZV ordering index](https://online.zzv.sg/index.html) links [D’Life](https://dlife.zzv.sg/) and [Novena Signature](https://dlifesignature.zzv.sg/). Exact current Getz pickup menus were read for Orchard, Chun Tin, Jurong West and Novena. The 600 Lorong 4 Toa Payoh store exists in the current main store metadata with pickup disabled and delivery enabled; lack of a pickup choice is not closure. Its public `dlifedemo.getz.co` alias contains an exact 600 Lorong 4 menu, retained as legacy/currentness-unconfirmed research with publication held. The source's name is not treated as proof of current production authority. [Tengah foodpanda](https://www.foodpanda.sg/restaurant/xyhv/dlife-tengah-drive) identifies 126B Tengah Drive #01-319, 692126 and supplies that outlet's own food menu. Existing exact-source pilot rows for Chinatown (113) and SHU Woodlands 354A (55) are inherited, with their original evidence limits; neither menu is copied to a different branch.

## Identity conflicts and genuine gaps

- Novena ordering and official group source repeat `#B1-105/105/129`; the supplied directory lead says `#B1-105/106/129`. The common 10 Sinaran Drive / Square 2 / 307506 identity is retained with the conflict.
- Novena's three sharing-set titles embed headline amounts that differ from the currently displayed list/detail amounts. The source titles, current list observations, separate packing fees, named included dishes/portions and paid upgrade choices remain distinguishable; no tax, discount or date explanation is invented.
- Chun Tin ordering says 6 Chun Tin Road; one directory lead says 8. Westgate's merchant postal code is 608532 while one lead says 608531. The standard Greendot printed footer says Asia Square Tower 2, while ordering/current merchant directory say Tower 1. The source facts remain distinguishable.
- Loyang ordering says 259 Pasir Ris Street 21 #02-30 / 510259; an existing lead says 258. SHU Jurong is current 498 Street 41; a lead's “Street 1” is not a different confirmed venue.
- SHU 27 Woodlands Link / 738732 is a separate outlet from 354A Woodlands Avenue 1. The latter has an existing directory/platform postal discrepancy (731354 versus 730354); no menu transfer between them.
- SHU Bukit Batok, 166 West Avenue 8 #01-254 / 650166, has no current readable exact merchant menu verified. Its old linked foodpanda vendor ID `w3eu` now identifies Clementi 722 West Street 2. Clementi's dishes/prices are not assigned to Bukit Batok; third-party price quotations are not a complete merchant menu.
- Greendot Waterway Point is an existing third-party lead absent from the current official 13-outlet list. Nex exists as a disabled Patisserie serialized store record. Neither absence establishes closure. No menu is borrowed from another outlet.
- Shu Vegetarian **典蔬素食**, 86 Market Street #03-05, has a different Chinese trading name from SHU **蔬方斋**. It is an independent identity lead, not assigned the SHU chain menu.
- Historical SHU leads from [mirrored merchant posts](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) include Toa Payoh North 206, Bedok Reservoir 760, Tampines 494, Stirling 169 and Chai Chee 26A. The latest displayed posts are June 2025. Current operation and current exact menus are unconfirmed; these are explicit gaps, not closures.

## Final source-pass totals

| Brand | Branch/lead records | Menu/source records | Food/portion records | Source covered | Partial | Unavailable |
|---|---:|---:|---:|---:|---:|---:|
| greendot | 16 | 32 | 910 | 28 | 1 | 3 |
| shu | 16 | 17 | 621 | 1 | 9 | 7 |
| dlife | 7 | 7 | 923 | 4 | 3 | 0 |

A food/portion record may repeat a dish across an outlet, channel or printed source; these totals are not counts of unique recipes. Nested choices/add-ons are not counted as additional dishes.

29 branch records have food evidence; 10 outlet/identity/historical leads have explicit zero-row current-menu gaps. This is source-pass completion for these assigned brands, not completion of the full directory.

1458 dish records currently have verified Getz detail documents; 879 nested labelled portion options and 3181 nested food modifier choices are retained. 0 list/portion price observations require display reconciliation.

## Outlet and gap breakdown

| Outlet/lead | Address | Food/portion records by source | Coverage |
|---|---|---|---|
| Greendot @ Star Vista | 1 Vista Exchange Green, #02-04, The Star Vista 138617, Singapore | [64](https://orders.greendot.sg/?StoreID=f39c03dc-5939-438d-b91e-df0677037d8c&Service=PickUp&lang=EN) online ordering; [8](https://patisserie.greendot.sg/Category?StoreID=9f976cf1-c830-4927-8498-73fb9279861c&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ The Seletar Mall | 33 Sengkang West Avenue #B1-01 The Seletar Mall, 797653, Singapore | [18](https://orders.greendot.sg/?StoreID=191ae5df-d765-4e6d-8261-b35209534a04&Service=PickUp&lang=EN) online ordering; [8](https://patisserie.greendot.sg/Category?StoreID=ea4b6adc-d0cf-4758-b2e5-f8220b4e62d8&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Asia Square | 8 Marina View, Tower 1, #02-02, 018960, Singapore | [52](https://orders.greendot.sg/?StoreID=47a71ad4-01ef-487c-be94-f66c9f8e0ba3&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=7aafa924-c582-49c7-8fe5-5fd6e23617d7&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Bedok Mall | 311 New Upper Changi Road B2-31, Bedok Mall, 467360, Singapore | [52](https://orders.greendot.sg/?StoreID=b33dedbe-40e7-40c8-a110-b4bb4239c938&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=45d330c9-0acb-4a6d-bf96-485df349b6bb&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Bukit Panjang Plaza | 1 Jelebu Rd, Bukit Panjang Plaza, 677743, Singapore | [64](https://orders.greendot.sg/?StoreID=e651dea9-726c-4921-bbe0-e1cbb9abaf6d&Service=PickUp&lang=EN) online ordering; [8](https://patisserie.greendot.sg/Category?StoreID=777962cc-8243-4f5d-818a-6526cec8990c&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ J8 | 9 Bishan Pl, #B1-24 24A, 579837, Singapore | [51](https://orders.greendot.sg/?StoreID=3d67bdd1-f091-4960-b693-5af3a1f2ab5b&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=96bd89c8-5999-4b5c-9860-69020cf09969&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Jurong Point | 1 Jurong West Central 2 Jurong Point JP 1 #01-43/44/45, 648886, Singapore | [51](https://orders.greendot.sg/?StoreID=5252756f-953c-4270-90c7-05ce23f97896&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=447691ba-2390-4826-a376-76302d340d1f&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Northpoint | 930 Yishun Ave 2, Northpoint City  North Wing, #B2-09/11, 769098, Singapore | [51](https://orders.greendot.sg/?StoreID=f8e46fd5-d7a7-4173-b102-20e44d859073&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=844bfa93-ee56-433d-af3c-874e8ab73afa&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Paya Lebar Square | 60 Paya Lebar Road Paya Lebar Square #02-15/16/17, 409051, Singapore | [63](https://orders.greendot.sg/?StoreID=e116e7c4-3ea8-46c0-a794-077e09797d97&Service=PickUp&lang=EN) online ordering; [22](https://patisserie.greendot.sg/Category?StoreID=8009e2c6-df3b-40b3-a9eb-80e17daa59c9&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ One Raffles Place | 1 Raffles Place, #03-23/24, 048616, Singapore | [51](https://orders.greendot.sg/?StoreID=3b911bfd-162a-4736-9f4c-00292770f8b4&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=61f488e1-0eed-4dbe-820c-3d76774f3784&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Tampines 1 | 10 Tampines Central 1, Tampines 1, #B1-K8, 529536, Singapore | [51](https://orders.greendot.sg/?StoreID=aab91d55-dec1-4f37-b3d9-679099c43136&Service=PickUp&lang=EN) online ordering; [8](https://patisserie.greendot.sg/Category?StoreID=2668dcec-9bbe-4f30-8e9c-0884f1c361b2&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot @ Westgate | 3 Gateway Dr, #01-06 Westgate, 608532, Singapore | [51](https://orders.greendot.sg/?StoreID=4b9717ab-a5dc-432c-8cd5-20627535147a&Service=PickUp&lang=EN) online ordering; [6](https://patisserie.greendot.sg/Category?StoreID=e27abe73-7887-4989-b1ee-3b6d1405a583&Service=PickUp&lang=EN) patisserie pickup catalogue | source-covered |
| Greendot Plus @ Jewel Changi Airport | 78 Aiport Blvd, #B1-297 Jewel Changi Airport, 819666, Singapore | [53](https://orders.greendot.sg/?StoreID=b9879453-a847-4f5b-ac90-8b2d5e439533&Service=PickUp&lang=EN) online ordering; [51](https://www.greendot.sg/wp-content/uploads/2026/06/VIEW-2026-Greendot-Plus-Menu.pdf) Jewel printed menu | source-covered |
| Greendot — Waterway Point (unconfirmed lead) | 83 Punggol Central, Singapore 828761 | [0](https://www.companies.sg/places/category/vegetarian?page=5) menu research gap | unavailable |
| Greendot Patisserie — Nex (disabled selector lead) | 23 Serangoon Central #02-K2/K3/K4, Singapore 556083 | [0](https://patisserie.greendot.sg/Category) menu research gap | unavailable |
| Greendot Patisserie — Paya Lebar flagship | 60 Paya Lebar Road #02-21 Paya Lebar Square, Singapore 409051 | [0](https://cdnm.heyzine.com/files/uploaded/v3/424a0fb37e8f19c881f459fdb3b68243124835c4.pdf) menu research gap | unavailable |
| SHU Vegetarian — 354A Woodlands Avenue 1 | 354A Woodlands Avenue 1 #01-01, Singapore 731354 | [55](https://www.foodpanda.sg/restaurant/x3kk/shu-vegetarian-shu-fang-zhai-woodlands-avenue-1) 354A Woodlands Avenue 1 delivery | partial |
| SHU Vegetarian — Jalan Kayu | 259 Jalan Kayu, Singapore 799488 | [124](https://shuvegetarian.oddle.me/en_SG) Jalan Kayu online ordering; [57](https://www.foodpanda.sg/restaurant/s0tp/shu-vegetarian-259-jalan-kayu) delivery | partial, source-covered |
| SHU Vegetarian 蔬方斋 (Ang Mo Kio Avenue 10) | 554 Ang Mo Kio Ave 10, #01-2040 | [65](https://www.foodpanda.sg/restaurant/w1hc/shu-vegetarian-shu-fang-zhai-ang-mo-kio-avenue-10) SHU Vegetarian 蔬方斋 (Ang Mo Kio Avenue 10) delivery | partial |
| SHU Vegetarian 蔬方斋 (Jurong West Street 41) | 498 Jurong West Street 41 #01-462, Singapore 640498 | [52](https://www.foodpanda.sg/restaurant/r3q1/shu-vegetarian-shu-fang-zhai-jurong-west-street-41) SHU Vegetarian 蔬方斋 (Jurong West Street 41) delivery | partial |
| SHU Vegetarian 蔬方斋 (Clementi West Street 2) | 722 Clementi West Street 2 #01-150 (Wan Fu Eating House), Singapore 120722 | [54](https://www.foodpanda.sg/restaurant/w3eu/shu-vegetarian-shu-fang-zhai-clementi-west-street-2) SHU Vegetarian 蔬方斋 (Clementi West Street 2) delivery | partial |
| SHU Vegetarian 蔬方斋 (Yishun Ring Road) | 239 Yishun Ring Road #01-1150, Singapore 760239 | [56](https://www.foodpanda.sg/restaurant/bqyw/shu-vegetarian-shu-fang-zhai-yishun-ring-road) delivery | partial |
| SHU Vegetarian 蔬方斋 (Loyang Point) | 259 Pasir Ris Street 21 #02-30, Loyang Point, Singapore 510259 | [52](https://www.foodpanda.sg/restaurant/qjg1/shu-vegetarian-shu-fang-zhai-loyang-point) delivery | partial |
| SHU Vegetarian 蔬方斋 (Margaret Drive) | 40 Margaret Drive #01-05, Singapore 140040 | [52](https://www.foodpanda.sg/restaurant/a2qp/shu-vegetarian-shu-fang-zhai-margaret-drive) delivery | partial |
| SHU Vegetarian 蔬方斋 (Chang Cheng HQ) | 27 Woodlands Link #01-01, Chang Cheng HQ (Chang Cheng Mee Wah Coffeeshop), Singapore 738732 | [54](https://www.foodpanda.sg/restaurant/a7h1/shu-vegetarian-shu-fang-zhai-chang-cheng-hq) delivery | partial |
| SHU Vegetarian — Bukit Batok | 166 Bukit Batok West Avenue 8 #01-254, Singapore 650166 | [0](https://threebestrated.sg/vegan-restaurants/shu-vegetarian-bukit-batok-208024343) menu research gap | unavailable |
| Shu Vegetarian 典蔬素食 — Market Street | 86 Market Street #03-05, Singapore 048947 | [0](https://www.onehungryhippo.com/restaurants) menu research gap | unavailable |
| SHU Vegetarian — Toa Payoh North (historical lead) | 206 Toa Payoh North #01-1197, Singapore 310206 | [0](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) menu research gap | unavailable |
| SHU Vegetarian — Bedok Reservoir (historical lead) | 760 Bedok Reservoir View #01-337, Singapore 470760 | [0](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) menu research gap | unavailable |
| SHU Vegetarian — Tampines (historical lead) | 494 Tampines Street 45 #01-06, Singapore 523494 | [0](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) menu research gap | unavailable |
| SHU Vegetarian — Stirling Road (historical lead) | 169 Stirling Road #01-1175, Singapore 140169 | [0](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) menu research gap | unavailable |
| SHU Vegetarian — Chai Chee (historical lead) | 26A Chai Chee Road #01-405, Singapore 461026 | [0](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) menu research gap | unavailable |
| D'Life @ Orchard Gateway | 277 Orchard Road #B2-04A/05 Singapore,, 238858, Singapore | [134](https://dlife.getz.co/?StoreID=5f6ae0b4-a479-4131-a288-14bc7e3d5992&Service=PickUp&lang=EN) online ordering | source-covered |
| D'Life @ Chun Tin | 6 Chun Tin Road, 599593, Singapore | [141](https://dlife.getz.co/?StoreID=26f7fbd6-70cc-409a-b0a8-6007e3378a78&Service=PickUp&lang=EN) online ordering | source-covered |
| D'Life @ Jurong West | 428 Jurong West Ave 1 #01-256, 640428, Singapore | [128](https://dlife.getz.co/?StoreID=eec50bad-d2aa-4c7d-a9c8-6aaef1ed32ad&Service=PickUp&lang=EN) online ordering | source-covered |
| D' Life Signature | 10 Sinaran Drive #B1-105/105/129 Square 2, Singapore, 307506, Singapore | [160](https://dlifesignature.zzv.sg/?StoreID=f50bd499-67fd-4d8a-a1d3-c77daf7fd08b&Service=PickUp&lang=EN) online ordering | source-covered |
| D'Life @ Toa Payoh | 600 Lorong 4 Toa Payoh #01-05, 319515, Singapore | [127](https://dlifedemo.getz.co/?StoreID=9cf3c959-8ca8-4de0-8a6b-24649b02f41b&Service=PickUp&lang=EN) online ordering | partial |
| D'Life Signature — Chinatown Point | 133 New Bridge Road #02-37, Chinatown Point, Singapore 059413 | [113](https://www.foodpanda.sg/restaurant/l29d/dlife-signature-chinatown-point) Chinatown Point delivery | partial |
| D'Life (Tengah Drive) | 126B TENGAH DRIVE #01-319, PLANTATION VILLAGE S(692126) | [120](https://www.foodpanda.sg/restaurant/xyhv/dlife-tengah-drive) delivery | partial |

## Per-source denominators and exclusions

| Source/menu ID | Visible products/cards | Food/portion records captured | Labelled Getz details | Exclusions / source notes |
|---|---:|---:|---:|---|
| greendot-star-vista-ordering | 79 | 64 | 64 | Beverages: 11; [RETAIL] Ready To Cook: 4 |
| greendot-seletar-mall-ordering | 45 | 18 | 18 | Nanyang Toast Set: 3; Kopihouse Signature: 4; Handbrew Beverages: 9; Local Drinks: 7; Refreshing Shiok: 4 |
| greendot-asia-square-ordering | 60 | 52 | 52 | Beverages: 8 |
| greendot-bedok-mall-ordering | 60 | 52 | 52 | Beverages: 8 |
| greendot-bukit-panjang-plaza-ordering | 76 | 64 | 64 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-j8-ordering | 63 | 51 | 51 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-jurong-point-ordering | 63 | 51 | 51 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-northpoint-ordering | 63 | 51 | 51 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-paya-lebar-square-ordering | 75 | 63 | 63 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-one-raffles-place-ordering | 59 | 51 | 51 | Beverages: 8 |
| greendot-tampines-1-ordering | 63 | 51 | 51 | Beverages: 8; [RETAIL] Ready To Cook: 4 |
| greendot-westgate-ordering | 61 | 51 | 51 | Beverages: 8; [RETAIL] Ready To Cook: 2 |
| greendot-jewel-changi-airport-ordering | 68 | 53 | 53 | (GD Plus x Lotus) Crafted Brews: 3; (GD Plus x Lotus) Organic Kombucha: 3; (GD Plus x Lotus) Botanical Refreshers: 9 |
| dlife-orchard-gateway-ordering | 169 | 134 | 134 | BEVERAGE 饮料: 19; HONEY 蜂蜜: 6; HEARTY 丰盛的: 10 |
| dlife-chun-tin-ordering | 195 | 141 | 141 | FIZZY 有气饮料: 5; HONEY SERIES 蜂蜜系列: 5; JUICE & TEA 果汁与茶: 7; LOCAL BEVERAGE 新饮: 7; COFFEE 咖啡: 5; PREMIUM BUBBLE TEA 好茶篇: 6; ICE BLEND 冰沙系列: 6; FRUIT JUICE 果汁系列: 4; MILK TEA 奶茶系列: 8; BEVERAGE 饮料: 1 |
| dlife-jurong-west-ordering | 157 | 128 | 128 | FIZZY 有气饮料: 5; HONEY SERIES 蜂蜜系列: 5; JUICE & TEA 果汁与茶: 9; LOCAL BEVERAGE 新饮: 5; COFFEE 咖啡: 5 |
| dlife-signature-novena-ordering | 195 | 160 | 160 | LOCAL BEVERAGE “新”饮: 6; COFFEE 咖啡: 4; BEVERAGE 饮料: 8; HONEY SERIES 蜂蜜系列: 5; JUICE & TEA 果汁与茶: 12 |
| dlife-toa-payoh-ordering | 158 | 127 | 127 | FIZZY 有气饮料: 5; HONEY SERIES 蜂蜜系列: 5; JUICE & TEA 果汁与茶: 10; LOCAL BEVERAGE 新饮: 5; COFFEE 咖啡: 5; BEVERAGE 饮料: 1 |
| greendot-paya-lebar-square-patisserie-ordering | 23 | 22 | 22 | Accessories: 1 |
| greendot-star-vista-patisserie-ordering | 9 | 8 | 8 | Accessories: 1 |
| greendot-westgate-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-one-raffles-place-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-jurong-point-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-asia-square-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-bedok-mall-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-northpoint-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-j8-patisserie-ordering | 7 | 6 | 6 | Accessories: 1 |
| greendot-bukit-panjang-plaza-patisserie-ordering | 9 | 8 | 8 | Accessories: 1 |
| greendot-seletar-mall-patisserie-ordering | 9 | 8 | 8 | Accessories: 1 |
| greendot-tampines-1-patisserie-ordering | 9 | 8 | 8 | Accessories: 1 |
| shu-jalan-kayu-ordering | see category count | 124 | n/a | 87 unique product IDs; 146 raw tag-occurrence variants; exact duplicate dish/portion/price observations deduplicated. |
| shu-amk-delivery | see category count | 65 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-jurong-delivery | see category count | 52 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-clementi-delivery | see category count | 54 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-yishun-delivery | see category count | 56 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-loyang-delivery | see category count | 52 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-margaret-delivery | see category count | 52 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-hq-delivery | see category count | 54 | n/a | Food-only source; popular-card duplicates excluded where present. |
| shu-jalan-kayu-delivery | see category count | 57 | n/a | Food-only source; popular-card duplicates excluded where present. |
| dlife-tengah-delivery | see category count | 120 | n/a | Food-only source; popular-card duplicates excluded where present. |
| greendot-published-standard | see category count | 35 | n/a | Food-only source; popular-card duplicates excluded where present. |
| greendot-published-plus | see category count | 51 | n/a | Food-only source; popular-card duplicates excluded where present. |
| greendot-published-kopi | see category count | 18 | n/a | Food-only source; popular-card duplicates excluded where present. |
| greendot-patisserie-published-products | 43 | 38 | n/a | Exact repeated bread cards: 5 |

## Source credibility

| Source | Confidence for the captured fact | Boundary |
|---|---|---|
| [Greendot official site and linked ordering](https://www.greendot.sg/food-menu/) | High: primary merchant source | Printed currency/date and exact outlet ordering remain separate observations. |
| [SHU official Oddle](https://shuvegetarian.oddle.me/en_SG) | High: merchant ordering catalogue | Applies to Jalan Kayu; does not establish other branches. |
| [ZZV official ordering index](https://online.zzv.sg/index.html) | High for explicit outlet/link identity | Does not make the old group page a complete current branch list. |
| [Exact foodpanda merchant listings](https://www.foodpanda.sg/restaurant/xyhv/dlife-tengah-drive) | Medium–high for public delivery offers | Dine-in equivalence, dynamic portion labels, ingredients and current stock are unverified. |
| [D’Life demo alias](https://dlifedemo.getz.co/) | Low for current production validity | Exact Toa Payoh identity/menu observations retained, publication held. |
| [SHU historical post mirror](https://www.restaurants10.com/SG/Singapore/303321370009833/SHU-Vegetarian) | Historical lead only | June 2025 and older posts are not current menu/operation evidence. |
| [Bukit Batok third-party directory](https://threebestrated.sg/vegan-restaurants/shu-vegetarian-bukit-batok-208024343) | Lead only | Reused ordering vendor ID now identifies Clementi; quoted prices are not imported as current merchant prices. |

## Files and validation

The small manifest is `data/menu-research/chain-greendot-shu-dlife.json`. Its `shards` are relative to `data/menu-research`: `greendot/menus.json`, `shu/menus.json`, `dlife/menus.json`. Each shard retains sources, branches, menus and one food record per line. These are research candidates; canonical publication and exact Google place-ID matching are the parent task.

Validation passed for all declared source/branch/menu references, globally unique food IDs, non-negative finite prices and valid currency/price kinds, absence of beverage/uncooked-retail/accessory categories and zero-price food rows, reciprocal branch/menu links and the 2,500-line file limit. All 30 selected Getz menu sources have their complete food-card detail-document pass; exact observed product document/outlet indices were verified before normalization. Physical-store menu completeness, stock and unlabelled delivery modifiers remain outside what these sources establish.
