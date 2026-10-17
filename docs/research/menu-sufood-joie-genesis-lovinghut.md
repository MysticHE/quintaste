# Sufood, Joie, Genesis and Loving Hut menu research

Checked 15 October 2026. This packet records public food-menu evidence, including explicit gaps. It does not establish that every venue's complete current in-store menu is available online, and it is not an app publication.

Saved in `data/menu-research/menu-sufood-joie-genesis-lovinghut.json`, with relative shards `sufood.json`, `joie.json` and `genesis.json` under `data/menu-research/sufood-joie-genesis-lovinghut/`. The main file contains the Loving Hut identity checks; it deliberately has no current Loving Hut branch or menu assignment.

## Exact denominators

| Measure | Count | Meaning |
|---|---:|---|
| Target brands | 4 | Sufood, Joie by DOZO, Genesis Vegan Restaurant, Loving Hut Singapore |
| Verified current branches | 3 | One each for Sufood, Joie and Genesis; no current Loving Hut branch verified |
| Source menus | 8 | Five current-linked/channel menus and three historical menu records |
| Menu coverage | 3 source-covered / 4 partial / 1 unavailable | Coverage is relative to each specified source; the unavailable record is a corrupt historical Joie PDF |
| Food rows | 112 | Source-specific rows, not 112 unique dishes |
| Current-linked/channel food rows | 63 | Sufood 20, Joie 22, Genesis 21 |
| Historical food rows | 49 | Sufood 2023 regular 27 and CNY2024 22; not assigned to current branch menus |
| Priced food rows | 42 | 41 current delivery rows plus one historical Yu Sheng with two size prices |
| Unpriced food rows | 70 | Named set-food choices; no package price assigned to individual components |
| Known portion options | 1 group / 2 choices | Historical Yu Sheng Small and Large |
| Historical conditional prices | 5 | Dessert add-on prices, explicitly conditional on the historical set menu |
| Unresolved customization lists | 5 | Sufood public product flags are true, but actual choices were unavailable |
| Sources | 27 | Merchant, landlord, partner menu and clearly labelled identity-gap sources |

No beverages, cider, beverage-inclusive package rows, reviews, promotional descriptions or menu artwork were copied into the research data. Food component names from sets are retained as `Set-menu food choice`, with no standalone price or availability claim. Research does not infer allium-free, vegan, allergen or halal certification from names, photographs or generic delivery descriptions.

## Current branch breakdown

| Current branch | Exact address | Retained current food rows | Status and remaining gap |
|---|---|---:|---|
| Sufood, Raffles City | 252 North Bridge Road, #02-19 to 21 Raffles City Shopping Centre, Singapore 179103 | 20 | Partial. All foods in the saved delivery listing; five customization lists and complete current in-store menu remain unverified. Current landlord expands the unit to #02-19 to 21; merchant/channel shorten it to #02-19. |
| Joie by DOZO, Orchard Central | 181 Orchard Road, #12-01 Orchard Central, Singapore 238896 | 22 | Lunch source-covered: all 12 food choices on its one-page image. Dinner partial: 10 foods from page 1; advertised page 2 cannot be read. The starter overlaps between lunch and dinner; these are 21 distinct names across 22 source rows. Effective menu dates are not printed. |
| Genesis Vegan Restaurant, Havelock II | 2 Havelock Road, #B1-01 Havelock II, Singapore 059763 | 21 | Partial. Two public delivery snapshots: 12 islandwide and 9 local rows, with seven overlapping names at matching prices, giving 14 distinct names. Full rotating in-store/weekly menu remains unverified. |
| Loving Hut Singapore | No current branch admitted | 0 | Identity unresolved. Expired merchant domain, dated global-directory omission and secondary legacy closure evidence cannot establish all independent franchises' current status. |

### Sufood

The current public foodpanda HTML contains 26 product rows in seven categories. All 20 food products were retained: ten mains, three desserts, three soups, three salads and one bread item. Five beverages and one cider were excluded. Names, categories, product IDs, displayed prices and single published price variations were compared directly against the saved public data.

Five foods are marked customizable: Zesty Oyster Mushroom Stone Pot 5-Grain Rice; Wild Mushroom Spaghetti With Pesto Sauce; Star Pizza; Rosy White Fungus With Peach Gum; Hawaiian Salad. Their initial page does not expose the choices. Later browser access displayed human verification, so no detail requests or bypass were attempted. The displayed base price must not be treated as the total for every configuration. The Rosy White Fungus name includes cold/hot wording while another visible field says Warm; the exact temperature choices remain unresolved.

The official main website has a certificate-name mismatch. TLS verification was retained. The public Facebook intro confirms Raffles City and supplies Instagram/reservation links; it does not expose a complete current menu. A readable current delivery snapshot is preserved without claiming that it is the full dine-in catalogue.

The official PUTIEN-hosted Sufood regular PDF was created 27 October 2023 and modified 20 November 2023. All food pages 4–12 were visually checked: two appetizer/bread rows, four salads, four soups, twelve mains and five desserts. All 27 food rows are historical and unpriced; the Wholesome Trio retains all three named components. Page 3's dessert add-on amount is preserved only as a conditional historical charge. Cider, drinks and cider-containing set packages were excluded.

The three-page official CNY2024 PDF was also visually checked. It supplies one separately priced Blossom Yu Sheng with Small $39.80 and Large $62.80, subject to service charge and GST, plus 21 unpriced set-food choices. Yu Sheng terms give 19 January–24 February 2024, while a separate opening-hours sentence prints 11 February 2023. The set-food page dates are 9–24 February 2024. This conflict is preserved. None of these historical rows establishes current stock or current branch menu applicability.

### Joie

Joie's current linked lunch/dinner pages contain full-resolution menu image references in public `wow-image` metadata, even when the browser gallery paints a blank region. Both original 4242×6000 images were downloaded and visually read. Lunch has twelve named foods. Dinner page 1 has ten, including five cold-dish choices marked applicable only to the six-course dinner.

The dinner gallery also advertises `Dinner Page 2`. Its Next and direct page-2 controls did not change the rendered content in managed headless Chromium; merchant scripts emitted errors. The public page-data asset named by the merchant viewer returned HTTP 403. No alternate-origin retry or access-control bypass was attempted. Additional dinner foods and any unseen page-2 conditions remain unknown. Individual component prices are not printed on the readable images; set prices were not assigned to food rows.

A separately reachable old festive page prints CNY dates “21 January 2022 - 23 January 2023”. Its linked PDF metadata says 2 January 2023. That PDF is exactly 1,048,576 bytes at the server, lacks a clean end and requires repair. Rendering produces unreadable glyphs and missing-resource errors; no names were inferred. It is retained as an unavailable historical source, outside the current branch menu assignment.

### Genesis

The merchant's public Facebook intro confirms the current Havelock II address. Its `genesis.vegan.restaurant.sg` text links to Instagram; it is not a separate merchant website domain. The linked Facebook menu is not readable without login.

Both public foodpanda initial HTML snapshots were readable before later browser pages requested human verification. All source foods and displayed prices were retained separately by channel. Each retrieved product is marked non-customizable and has one unnamed published price variation; this does not prove the entire physical menu has no options. Several generic partner descriptions name meat/cheese despite the merchant's vegan identity, so descriptions were not copied or used as ingredient evidence. The Sausages portion is explicitly four pieces.

The newly found public Take App storefront `take.app/6583545144` matches the merchant name and Havelock II delivery wording but supplies no exact street address. It shows one Items category; following that public category link displays `No results`. No extra food rows are available there. The old phone-order link redirects to HTTP 404. These are source gaps, not evidence that no fuller menu exists.

### Loving Hut Singapore

The Singapore merchant domain returns HTTP 410. Current global country links omit Singapore, and the officially linked June2024 worldwide-address document contains no Singapore entry. The dated directory absence does not establish every independent franchise has closed.

Burpple marks the legacy 229 Joo Chiat Road #01-01, Singapore 427489 venue CLOSED. This remains secondary evidence, outside current branch counts. Another directory claims a Jewel Changi Airport venue at 78 Airport Boulevard, Singapore 819666, without a unit, and links the expired domain. No matching merchant or primary landlord confirmation was found; the retrieved Jewel dining directory has no Loving Hut name. That lead is unresolved and was not promoted into a current venue. Foreign Loving Hut menus were excluded.

## Key sources

Credibility scores describe source authority for the specific fact: 5 = merchant/landlord primary, 4 = venue-specific delivery partner, 2 = unconfirmed/secondary directory. A high score does not imply that a historical or failed source is current or complete.

| URL | Title | Credibility | Use / limitation |
|---|---|---:|---|
| [CapitaLand Sufood](https://www.capitaland.com/sg/en/shop/malls/stores/sufood.html) | Current Raffles City store | 5 | Current unit #02-19 to 21 |
| [Sufood public delivery menu](https://www.foodpanda.sg/restaurant/v0ap/sufood-raffles-city) | Raffles City delivery | 4 | 20 food rows; five customization lists unresolved |
| [Official Sufood regular PDF](https://www.putien.com/wp-content/uploads/2023/11/Sufood23-ORDERMenu-V9_compressed.pdf) | 2023 regular menu | 5 | Historical 27 food choices, not current prices |
| [Official Sufood CNY2024 PDF](https://www.putien.com/wp-content/uploads/2024/01/Sufood-CNY-2024-Main-Menu-Web.pdf) | CNY food evidence | 5 | Historical date conflict and both Yu Sheng sizes |
| [Joie lunch](https://www.joierestaurant.com.sg/menu-lunch) | Linked lunch menu | 5 | One-page menu image, 12 unpriced foods |
| [Joie dinner](https://www.joierestaurant.com.sg/menu-dinner) | Linked dinner menu | 5 | Page 1 readable; page 2 unavailable |
| [Joie old festive page](https://www.joierestaurant.com.sg/services-1) | Legacy CNY menu | 5 | Inconsistent old dates; linked PDF corrupt |
| [Genesis Facebook](https://www.facebook.com/genesisvegan/) | Merchant public intro | 5 | Exact current Havelock II address |
| [Genesis islandwide](https://www.foodpanda.sg/restaurant/pctp/genesis-vegan-restaurant-havelock-2-islandwide) | Delivery snapshot | 4 | 12 rows; later live verification blocked |
| [Genesis local](https://www.foodpanda.sg/restaurant/fdk3/genesis-vegan-restaurant-havelock-2) | Delivery snapshot | 4 | 9 rows; seven same-name overlaps |
| [Genesis Take App](https://take.app/6583545144) | Public ordering storefront | 5 | Linked Items category returns No results |
| [Loving Hut Singapore](https://lovinghut.com.sg/) | Legacy merchant domain | 5 | HTTP 410; no current menu |
| [Loving Hut global directory](https://www.lovinghut.com/2024-06addr) | June2024 worldwide addresses | 5 | No Singapore entry; not universal closure proof |
| [Legacy Joo Chiat listing](https://burpple.com/loving-hut-singapore) | CLOSED venue | 2 | Secondary closure listing only |
| [Unconfirmed Jewel lead](https://www.sgvegancommunity.net/listings/loving-hut-vegan) | Loving Hut Vegan directory entry | 2 | No unit/current primary confirmation; not admitted |
| [Jewel dining directory](https://www.jewelchangiairport.com/en/dine.html) | Primary landlord directory | 5 | No matching name in retrieved public HTML |

## Verification and remaining work

Scratch evidence and validation are in `../tmp/qa/menu-sufood-joie-genesis-lovinghut/`. `validate_packet.py` passed all JSON parsing, unique IDs, source/menu/branch references, current-versus-historical separation, exact partner product counts, name/price/variation comparisons, known option prices, food exclusions and file-size checks. The source images/PDFs were visually inspected; raw descriptions and artwork remain outside the research packet. No test files, app changes, canonical pilot edits, paid Google calls or orders were created.

To finish the unavailable data, the useful missing inputs are the current Sufood in-store menu and five customization lists; Joie dinner page 2 and a valid replacement for its historical festive PDF if historical recovery is desired; Genesis's full current/weekly menu; and authoritative current Singapore branch identity for Loving Hut. These gaps are explicitly documented rather than labelled as locations with no menu.
