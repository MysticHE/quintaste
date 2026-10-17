# Saute, Grove and Pang Pang Kopi menu research

Checked 15 October 2026. Research facts only; no catalogue publication, ingredient review or app changes are included. Retrieval date is not the merchant's menu effective date.

The current published Saute scope is five concepts at five outlets. [Saute's story](https://www.saute.com.sg/our-story) explicitly marks the former Bugis Cube concept as ceased, so that historical directory lead is not counted as a sixth current Saute outlet. Grove's old merchant page still lists four premises, but current successor sources identify Pang Pang Kopi at three of those premises. Legacy Grove records remain separate from successor records.

## Saved packet and denominator

`data/menu-research/menu-saute-grove.json` contains the four legacy Grove records and six relative JSON shard references in `data/menu-research/saute-grove/`. Importers must read the main file's own records as well as its shards. No existing pilot menu IDs are reused.

| Measure | Saved total |
| --- | ---: |
| Branch records | 13: five Saute, four Pang Pang, four legacy Grove |
| Branch coverage | Five source-covered, four partial, four current exact-branch menus unavailable |
| Source-specific menus | 16: ten source-covered Saute menus, two partial Pang Pang menus, four unavailable Grove menus |
| Food rows | 933 |
| Priced food rows | 477 official online food rows |
| Unpriced food rows | 456 website gallery/menu rows |
| Food option groups / choices | 205 / 303 |
| Source records | 498 |
| Explicit out-of-stock food rows | Seven, retained with that status |
| Public ordering category sections checked | 79 |
| Public ordering product rows compared to the source catalogue | 537, including rows subsequently excluded |

The 933 rows are source-specific facts, not 933 distinct dishes or currently orderable dishes. Website and ordering menus overlap and differ; their names and prices are not silently merged. Brand menus are not multiplied by four for Pang Pang's outlets. Two pairs of Pang Pang pack-size product links are consolidated into two dishes with both size prices, reducing 479 retained food product records to 477 normalized online food rows. Repeated website placements of an identical name/code are also consolidated.

## Saute outlets

All five linked ordering storefronts expose one intended outlet, with the matching mall/unit/postal context. Each concept has a separate online menu and an unpriced website dish gallery.

| Outlet | Merchant address | Online food rows | Website food rows | Result |
| --- | --- | ---: | ---: | --- |
| Saute-san | 180 Kitchener Road, #03-23/24 City Square Mall, Singapore 208539 | 77 | 82 | Source-covered. Website and [landlord directory](https://www.citysquaremall.com.sg/shops/shop-list/saute-san/) agree #03-23/24; Oddle abbreviates to #03-23. |
| Flavours By Saute | 107 North Bridge Road, #B1-30 Funan, Singapore 179105 | 99 | 109 | Source-covered. |
| Saute Sushi | 60 Paya Lebar Road, #B1-19 Paya Lebar Square, Singapore 409051 | 128 | 129 | Source-covered. Sushi cake gallery specifies preorder and self-collection only. |
| Saute & Mee | 339 Sengkang, #B1-20 Anchorvale Village, Singapore 540339 | 60 | 54 | Source-covered menu; merchant address has incomplete street wording. Website and Oddle agree on unit, mall and postal code. The secondary lead's 339 Anchorvale Road is not silently promoted to merchant-confirmed street wording. |
| Saute Saranghae | 10 Tampines Central 1, #05-08/09 Tampines 1, Singapore 529536 | 79 | 66 | Source-covered. |

Source-covered means all accessible prepared-food rows in the specified published sources were captured. It does not establish the complete physical menu, source freshness, current stock or independent dietary certification. Saute-san's website still labels a Japanese Curry Ramen gallery card **NDP 2022**; this historical label is retained with current availability unconfirmed.

## Pang Pang successor scope

The [Pang Pang locator](https://pangpangkopi.com.sg/locateus/) and [official ordering catalogue](https://pangpangkopi.oddle.me/en_SG) list four named outlets. The public ordering data associates all four with one common menu ID. The packet therefore records one brand menu with 34 food rows and one website menu with 16 unpriced food headings. This shared catalogue does not prove every food is available at every outlet. All four records remain partial pending the noted merchant confirmations.

| Outlet | Locator address | Exact remaining gap |
| --- | --- | --- |
| SingPost Centre | 10 Eunos Road 8, #01-151, Singapore 408600 | Current food/menu applicability requires confirmation at outlet level. The [mall's current store directory](https://www.singpostcentre.com/stores/?category=cafes-restaurants-food-court) lists Pang Pang Kopi. |
| Canberra Plaza | 133 Canberra View, #01-19, Singapore 750133 | Oddle says **#01-10**, while the website says **#01-19**. Both values are retained in the notes. Not eligible for online pickup/delivery in the captured context; that is not a closure finding. |
| Buangkok Square | 991 Buangkok Link, #01-17/18/19, Singapore 530991 | Current food/menu applicability requires confirmation at outlet level. |
| Hougang RiverCourt | 377 Hougang Street 32, #01-09, Singapore 530377 | Present in merchant locator and public store data; absent from the rendered three-outlet Store page and not eligible for online pickup/delivery in that context. Current orderability is unconfirmed. |

The website contains template footer contacts, an overseas placeholder address and an empty Order Now area. None of those fields are used as venue identity evidence. Branch facts are restricted to the named Singapore locator entries and matching public ordering records.

One online food title says **Original Dry Cutlet La Mian Dry** in English and **原味素排拉面汤** in Chinese. The latter says soup. The source conflict is retained in the dish qualifier; it is not silently translated into a settled preparation claim.

## Legacy Grove records without a readable current exact-branch menu

| Legacy listing | Address on Koufu's Grove page | Status recorded |
| --- | --- | --- |
| Grove Buangkok Square | 991 Buangkok Link, #01-17/18/19, Singapore 530991 | Current exact Grove menu unavailable; current Pang Pang sources separately identify these premises. |
| Grove Northshore Plaza 1 | 407 Northshore Drive, #02-39/K5, Singapore 820407 | Current exact Grove menu unavailable; absent from current Pang Pang locator. No authoritative current successor or closure confirmation obtained. |
| Grove Canberra Plaza | 133 Canberra View, #01-19, Singapore 750133 | Current exact Grove menu unavailable; current Pang Pang sources identify these premises with a conflicting Oddle unit. |
| Grove SingPost Centre | 10 Eunos Road 8, #01-151, Singapore 408600 | Current exact Grove menu unavailable; current Pang Pang sources separately identify these premises. |

[Koufu's Grove page](https://www.koufu.com.sg/our-brands/cafe-restaurants/grove-utopia/?lang=zh-hans) remains accessible. [Grove's Linktree](https://linktr.ee/grovesg) points to a Facebook in-store menu that presents a login wall without readable dish rows; no login or access-control bypass was attempted. Its location link now lists elemen outlets only. Legacy Foodpanda links also fail or redirect to successor contexts. These are evidence/identity gaps, not proof that no menu exists. No historical Grove or successor Pang Pang rows are attached to these four unavailable menu records.

## Exclusions and price semantics

- Online catalogue exclusions: 34 beverage rows, 19 Pang Pang sets with required drink choices and five Saute family sets containing drinks. The Western Delight Set's text omits its contents, but its linked merchant image visibly includes four A&W cans, so it is excluded too.
- Website exclusions: 31 beverage cards, five explicit food-and-drink combo cards and 12 ingredient/health-claim cards. Five additional Saute lunch/student posters were downloaded and visually inspected: all include a drink and are excluded, including their bundle price claims. No standalone dish price is inferred from a bundle price.
- Saute & Mee's optional add-on group contains one food and four drinks. The egg and its exact S$2.40 price remain; drinks are omitted. The original shared group maximum of five is retained with an exclusion notice.
- Bentos labelled Minimum of 4 retain the four-bento base amount, not an invented single-bento base price. Additional per-bento prices and maximum quantities are captured separately.
- All published variant base prices and food modifier charges, required/optional quantity bounds, source default values and pack sizes are preserved. Optional S$0 choices remain explicit. Milk/spice/cheese choices are factual merchant option labels, not ingredient certification.
- Online prices are delivery/pickup source prices. They are not asserted to be dine-in prices or to include every tax/fee. Unknown website prices are omitted rather than filled from a different channel.
- No merchant descriptions, reviews, copied artwork, contact placeholders, raw retail products or apparel are saved in the research JSON. Source images/screenshots remain in scratch for internal verification only.

## Evidence and validation

| Primary source | What was checked | Credibility / limit |
| --- | --- | --- |
| [Saute-san website](https://www.saute.com.sg/saute-san-menu) / [ordering](https://www.sautesandelivery.sg/en_SG) | Exact outlet, food cards, full online categories/options | High for published facts; includes a dated historical gallery label. |
| [Flavours website](https://www.saute.com.sg/flavours-menu) / [ordering](https://www.flavoursbysaute.sg/en_SG) | Exact outlet, food cards, full online categories/options | High for published facts; prices are channel-specific. |
| [Sushi website](https://www.saute.com.sg/saute-sushi-menu) / [ordering](https://www.sautesushi.sg/en_SG) | Exact outlet, food cards, full online categories/options | High for published facts; preorder/gallery and online rows remain separate. |
| [Saute & Mee website](https://www.saute.com.sg/saute-and-mee-menu) / [ordering](https://www.sauteandmee.sg/en_SG) | Exact unit/postal context, food cards, full online categories/options | High for menu facts; street wording incomplete. |
| [Saranghae website](https://www.saute.com.sg/saute-saranghae-menu) / [ordering](https://www.sautesaranghae.sg/en_SG) | Exact outlet, food cards, full online categories/options | High for published facts; stock snapshot retained. |
| [Pang Pang website menu](https://pangpangkopi.com.sg/menu/) / [locator](https://pangpangkopi.com.sg/locateus/) / [ordering](https://pangpangkopi.oddle.me/en_SG) / [Store page](https://pangpangkopi.oddle.me/en_SG/stores) | Four named addresses, common catalogue, food/options, visible Store list | Limited by template footer, unit/visibility and bilingual food-title conflicts. |
| [Koufu Grove page](https://www.koufu.com.sg/our-brands/cafe-restaurants/grove-utopia/?lang=zh-hans) / [Linktree](https://linktr.ee/grovesg) / [Facebook menu](https://www.facebook.com/grove.singapore/menu) | Legacy branches and linked menu availability | Legacy identity only; no readable current exact Grove menu. |

Own Playwright-managed headless Chromium was used, with no installed Chrome/profile. Across six storefronts, all 79 category sections were scrolled into view. The final DOM contained all 537 expected product IDs, no extra IDs and no grid-versus-catalogue minimum-price mismatches. Six representative product modals were opened without adding to a cart; constraints, prices, four-bento quantity semantics, optional food add-ons and milk/cheese/spice options were visually checked. Seven actual **Out of stock** labels agree with source status and are retained. Trailing commas in all-days lists were normalized as delimiters and do not create false weekday restrictions.

`../tmp/qa/menu-saute-grove/research-validation.json` passes JSON parsing, ID uniqueness, reciprocal branch/menu/source references, positive dish prices, nonnegative modifier prices, original-versus-normalized prices, both merged pack-size price sets, source/category completeness, exclusions and private/description/image-field checks. Largest data shard: 402 lines. No project Google calls, app/billing/canonical-pilot edits, purchases or publication occurred.

Reusable scratch: `categories_check.cjs` scrolls the public categories; `final_dom_audit.py` compares final category IDs/prices against the first-render public catalogue; `modal_checks.cjs` opens read-only product modals; `write_research.py` saves facts only; `validate_research.py` validates this packet. The finalized ZZV/Daily Green packet is unchanged.
