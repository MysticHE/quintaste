# Mother Earth and Pine Tree menu checks

Checked 15 October 2026. This is separate research data, not a public app import or an ingredient certification.

| Location | Food rows | Source coverage | Remaining gap |
|---|---:|---|---|
| Mother Earth Classic, 530 Balestier Road #01-06, Singapore 329857 | 108 regular + 9 catering | Regular food products/options covered; catering partial | Deposit-only catering prices and one conflicting published total need confirmation. |
| Mother Earth Vegetarian Restaurant, 511 Upper Jurong Road #01-04, Singapore 638366 | 143 | Food products/options covered | Current stock, dine-in equivalence and ingredients remain unconfirmed. |
| Pine Tree Cafe, 190 Middle Road #02-13, Fortune Centre, Singapore 188979 | 0 | Current exact-branch menu unavailable in checked sources | The linked ordering domain exposes a test outlet/address; no test-menu rows are attributed to the cafe. |

The packet contains three branch records, four menu records, 260 food rows, 494 food options and 264 sources. Counts are source-specific and include explicit offers/variants. All three beverage-inclusive Jurong burger sets are excluded; the corresponding standalone burgers remain. The two menus' 30 beverage-category products are excluded. No beverages, menu artwork or promotional descriptions are imported.

The actual selected pickup outlet, visible name/address and StoreID URL were checked using Playwright-managed Chromium. The [Classic menu](https://motherearthclassic.getz.co/Category?StoreID=ecac78cf-3087-4f39-a1a3-97825f0e1d84&Service=PickUp&lang=EN) and [Jurong menu](https://motherearthjurong.getz.co/Category?StoreID=4453f177-c0cc-4153-8feb-f9016289cb4c&Service=PickUp&lang=EN) were collected separately. All 263 non-beverage product detail pages were read before excluding three beverage-inclusive sets. A second pass through 45 food-category/Recommendations pages found no additional product IDs, with all responses HTTP200. Both selected-outlet screenshots were visually inspected. No cart submission, purchase, merchant contact, installed Chrome or Google API call was used.

Every retained food has its own product-detail source. Base prices, list prices, explicit portion/modifier price texts, disabled source options and packing fees remain separate. A starting price is not a full customized-order total. Merchant vegan/egg labels appearing in product names/options are source statements, not ingredient certification.

Classic's bulk-bento/party category explicitly says displayed amounts are deposits and requires two days' lead time. All nine offers are retained as catering records with no canonical full price. Where a product publishes a total, deposit and remainder, those facts remain separate in `cateringPricing`. The Sweet and Sour Pork Ribs bulk bento publishes a total of 92 alongside deposit 45 and remainder 50; this conflict is retained rather than silently replaced with a calculated total. A category-level deposit label is not converted into an individual full dish price.

The [Fortune Centre tenant listing](https://fortunecentre.sg/directory/business/pine-tree-cafe/) links Pine Tree to its ordering domain. That [linked ordering page](https://pinetreecafe.getz.co/Category) currently identifies “Getz Support Test Outlet 2” at “345 Test Center, 123456”, and its outlet selector also exposes test identities. Its food names/prices are therefore excluded from the real branch. Older #02-09/13 references and the separate #02-21 seating unit do not establish current menu applicability.

“Source-covered” here means the visible food products and published food options were captured from those exact source contexts on this date. It does not guarantee current stock, every offline/counter dish, ingredient suitability, merchant approval or permanent public publication rights. Pine Tree's unavailable result is an evidence gap, not a claim that the cafe has no menu.

Data: [menu-mother-earth-pinetree.json](../../data/menu-research/menu-mother-earth-pinetree.json). Collection audit: `../tmp/qa/menu-mother-earth/research-audit.json` in the local QA workspace.
