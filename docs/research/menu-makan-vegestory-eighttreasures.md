# Makan Vegan, Vege Story and Eight Treasures

Checked 15 October 2026. Research packet: [menu-makan-vegestory-eighttreasures.json](../../data/menu-research/menu-makan-vegestory-eighttreasures.json). Research only; no app or canonical pilot publication.

164 source-specific food rows across three branch records and eight menus. These are overlapping source/context records, not 164 distinct dishes or three complete current menus. Beverages, frozen/packaged retail, standalone sauces and beverage-inclusive buffet package rows are excluded.

| Location | Food rows | Coverage and exact remaining gap |
| --- | ---: | --- |
| Makan Vegan, 7 Mandai Estate #03-05, 729904 | 138 | 25 prepared ordering products, 62 buffet food choices, 47 bento components, three bulk bento boxes and one extra Foodpanda dish. Central kitchen, not a dine-in restaurant. Required spicy-choice price fields differ from the rendered total; catering and partner-menu gaps remain. |
| Vege Story, 892C Woodlands Drive 50 #01-02, 732892 | 15 held | Eight legible menu-board highlights and seven directory specialties. Current merchant website is unavailable, Facebook unreadable; fine-print weekly menu is unreadable. Secondary evidence remains held. |
| Eight Treasures, 282A South Bridge Road, 058831 | 11 held | Undated secondary sample only. Official website is under construction. Unlinked Getz menu lacks current selected-outlet identity and mixes cafe dishes; none of that menu was imported. |

## Makan Vegan

The [current merchant order page](https://www.makanvegan.com/order) links [Oddle](https://makanveganvegetarian.oddle.me/en_SG/), Foodpanda and Grab. The [Oddle Store page](https://makanveganvegetarian.oddle.me/en_SG/stores) explicitly describes a central kitchen at #03-05. Do not infer dine-in availability from the older place card.

All seven Oddle categories were scrolled in managed headless Chromium. Their 43 rendered product IDs exactly matched the public embedded listing: 18 retail/frozen/sauce products excluded and 25 prepared dishes retained across platter, noodles, rice and snacks. Base prices, variants and all three spicy options are retained separately in SGD. The platter's published piece counts are stored as components.

The Wanton Noodle modal was checked before and after selecting MONSTROUS Spicy. Its regular modifier field is 5.00, minimum-selection field is 0.00, and rendered selected total remains SGD8.80. Both source fields and the observed total are retained; no surcharge is inferred. The prepared-food menu remains partial for this pricing interpretation rather than presenting a guessed final charge.

All five [catering tabs](https://www.makanvegan.com/catering) were opened. The buffet offers 62 named food choices in nine sections, without individual dish prices. Bulk bento has 47 component rows in ten series, with category prices and per-row overrides, plus three box offers with explicit **from** prices. Those component amounts are stored as `componentPrice`, never a standalone takeaway `price`. Parenthesized Sambal/Mala prices remain in the source labels. English Soy Chip differs from the buffet's Chinese fresh-bean-bao choice; both are retained without reconciling the translation.

Buffet needs 30 pax and three-day booking, with a separate 70.00 setup/delivery fee. Bulk bento needs 30 boxes and three-day booking; delivery charges and exclusions remain separate. The catering page uses dollar symbols without a currency code, retained as unknown. Live Station and Banquets require custom quotes. Sponsorship tiers do not name dishes. None became invented menu items.

The [Foodpanda listing](https://www.foodpanda.sg/restaurant/vycy/makan-vegan-zhai-zhe-li-mandai-estate) exposes an additional Braised Minced Noodle, absent from Oddle, recorded at its displayed SGD10.80. Public web text was readable; direct HTTP403 prevented full source/options capture. This is explicitly a one-item additional-source sample. The platform's CLOSED label is not treated as permanent business closure. Grab was not collected behind an app/login path.

## Vege Story

[HappyCow](https://www.happycow.net/reviews/vege-story-north-singapore-202072) links the merchant's wufu.co/vege-story and Facebook. The merchant site closes the connection and Facebook is unreadable. No login or access-control bypass was attempted.

The [Foodgrove exact-branch listing](https://www.foodgrove.sg/listing/vege-story/) contains a [signage photograph](https://www.foodgrove.sg/wp-content/uploads/2021/07/IMG-20250726-WA0013.jpg). Its normal browser image response was captured and inspected. Eight large highlights are legible, including Chicken Rice at **4.30**, not 4.50; the small weekday boards cannot be reliably read. The filename suggests July 2025 but is not proof of capture or effective menu date. These eight food/price facts remain held, with currency unknown. Seven directory specialty names are a separate unpriced held source, and overlap some highlights. The listing's zero price-range value is a placeholder, not free food. Customer reviews and dietary statements were not converted into dish facts or certification.

## Eight Treasures

The [Chinatown Business Association listing](https://chinatown.sg/dine/8-treasures-vegetarian/) supports the exact branch and official domain. The [official site](https://www.8treasuresgroup.sg/) currently displays an under-construction notice. Eleven undated food/price facts from the [secondary sample](https://threebestrated.sg/vegan-restaurants-in-chinatown) remain held.

The similarly named [Getz page](https://eighttreasuresrestaurant.getz.co/Category) is readable but has no selected outlet/address. It contains cafe salad items as well as restaurant dishes and zero-price placeholders. Branch applicability and currentness are unresolved; none of its foods or zero prices were imported. Search also surfaced 2016 CNY articles, which were not presented as current menus.

## Validation

All 43 Oddle product IDs matched the seven visible category sections, with no missing or extra IDs. The food split is 25 + 62 + 47 + 3 + 1 + 8 + 7 + 11 = 164. Packet validation found no duplicate IDs, missing source references or nonpositive retained base prices. Raw food names preserve source spelling and qualifiers; package/component prices are not assigned to individual buffet dishes. No Google paid calls, app changes, canonical publication or unrelated feature edits were made.

Evidence: `../tmp/qa/menu-makan-vegestory-eighttreasures/` contains the category audit, live dialog captures, catering tab captures, source image and `research-validation.json`.
