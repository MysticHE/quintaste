# Directory menu continuation — 16 October 2026

This is a bounded enrichment batch from the existing independent directory. It does not complete all 1,105 directory leads or the separate Google Place ID inventory. Retrieval dates are check dates, not menu effective dates. No Google calls, allowance changes, orders, merchant messages or automatic publication were performed.

The packet is `data/menu-research/menu-directory-continuation-cafes-2026-10-16.json`. Evidence and validation are under `../tmp/qa/menu-directory-continuation/` relative to the app root.

| Outcome | Branches | Source food rows | Publication proposal |
|---|---:|---:|---:|
| Lilac Oak, Oxley Rise | 1 | 18 | 18 |
| Baomaker, 447 Ang Mo Kio | 1 | 19 | 17; exclude two sold-out rows |
| Merle & Co, Lentor Modern | 1 | 50 | 50 |
| Wakamama: HTML, two PDF brunch versions and tier observations | 1 | 51 | Held |
| Oat & About online standalone desserts | 1 unverified directory branch | 12 with 23 size/portion variants | Held |
| Cocobella food bowls | 1 | 11; all prices unknown | Held |
| Kueh Ho Jiak initial shop listings | 2 | 2 shared source rows | Partial; held |
| Address/source-only outcomes below | 13 | 0 | No proposal |
| Total | 21 | 163 | 85 food rows at three branches |

All three proposed menus cover their inspected food source. They do not establish all menus, display additions, current stock, ingredient suitability, an effective menu date or every ordering channel for the merchant. Food names retain source wording; marketing descriptions and source artwork are excluded from app proposals.

## Review findings

- **Lilac Oak:** the [café menu](https://www.lilacoak.com/cafe-menu) prints the exact Oxley Rise address. All six mains, two sides, five eligible gelato/waffle rows and five daily bakes captured. Single-scoop regular/premium prices are explicit. Double-scoop premium `+$1` does not state a per-scoop rule, so no premium total is invented. Pint premium `+$3` and non-spicy noodle option are retained as qualifiers. All beverage sections and affogato/matchaffogato combinations excluded. Separate whole cakes, catering and seasonal bake boxes remain outside this café-source coverage.
- **Baomaker:** the [merchant menu](https://baomaker.com/) explicitly links fresh/fried baos and burgers to `447 Ang Mo Kio Ave 10 #01-1675`. All 19 displayed foods match the public embedded product IDs and prices; variant arrays are empty. The [Black Sesame product page](https://baomaker.com/en/p/cmi88a7xl00amjs04fglaibus) shows price and quantity only. SGD and tax-inclusive/service settings come from the public store configuration, not a guessed dollar currency. Frozen/preorder subcategories are not counted complete. Fried Mantou and Luncheon Meat Burger are explicitly sold out and excluded from the public proposal. Merchant postal is absent. The ordinary OneMap response contains an authentication error, so it is not used for postal verification; live postal-based card attachment remains a gap.
- **Merle & Co:** the [merchant menu index](https://merleandco.com/menu/) and [home](https://merleandco.com/) establish the Lentor unit. Four linked food images were individually inspected. All 50 human-food/extra rows captured, including spread, egg preparation, omelette choices, Nutella addition, fries substitution and bread choices. Prices include GST with no service charge. Gelato/display prices and some optional surcharges are unspecified. Four pet-menu entries and the drinks image excluded. The linked Dropbox PDF download returned 403; no workaround/retry was used, while the directly linked food images returned 200.
- **Wakamama:** [HTML brunch](https://www.wakamama.sg/vegan-brunch) contains 15 foods with browser-verified row/price alignment. The linked [four-page PDF](https://www.wakamama.sg/_files/ugd/12c200_10de559edfaf4545a6507988e538420b.pdf) and [dim sum PDF](https://www.wakamama.sg/_files/ugd/12c200_8687b0e8b47b4647bead7103712480d0.pdf) are undated winter versions. They disagree on gyoza `3pcs/$12` versus `5pcs/$18`, shichimi handroll `$12` versus `$16`, and several dish names. HTML is a different menu and says Saturday/Sunday 11–15 while the footer says Sunday 9–15. Every relevant PDF page was rendered and visually inspected. The 17/16 eligible PDF foods remain separate; three [omakase tier prices](https://www.wakamama.sg/wakamamaomakase) remain held because the linked set includes warm ginger amazake and no food-only price allocation is possible. Pet foods, beverage pairings and warm ginger amazake excluded. Cantabile returned 429 and requests to that source stopped.

## Remaining source gaps from this batch

| Source/merchant | Accounted result and next requirement |
|---|---|
| [Tofu G](https://www.tofug.sg) | Six merchant-published exact branches: Mandarin Gallery, Ngee Ann City, Amoy Street, UE Square, Waterway Point, Suntec. Inspected page has addresses but no readable food/portion/price menu. Ngee Ann City merchant postal `238873` conflicts with directory `238872`; primary wording retained, discrepancy explicit. Need a readable merchant branch menu. |
| [Kind Kones contact](https://kindkones.com/pages/contact), [locations](https://kindkones.com/pages/locations) | Suntec/Westgate addresses agree. Forum contact body says `#B1-27`, footer says `#B1-17`; Great World is listed in body but marked permanently closed in footer. Public product feed contains duplicate same-name records with divergent prices and no per-record outlet mapping. Need source-version, outlet and applicable price confirmation; no arbitrary record selection. |
| [Mitu Rice](https://miturice.com/) | Brand story/claims only; Shenton directory address not currently confirmed on inspected merchant page and no readable menu. |
| [Oatberry](https://oatberry.com/) | ONZE address confirmed. Visible shop sells packaged granola/gift boxes; café review text does not establish a current prepared-food menu. Groceries excluded. |
| [NutriJoy FAQ](https://nutrijoyvegan.com/pages/faqs) | Merchant identifies Punggol with MRT pickups and recommends five-day advance orders. Upper Serangoon directory address is not established as a current public restaurant. |
| [Oat & About FAQ](https://oatandabout.sg/pages/faq) | Exact pickup location supplied after order confirmation. Erskine directory storefront unverified. Twelve standalone foods/23 variants retained on hold; two bundle customizers not audited. |
| [EYWA contact](https://eywa.love/pages/contact) | Current delivery/pantry service does not establish the City Gate directory restaurant address. Grocery/subscription/bundled drink scope excluded. |
| [Cocobella menu](https://www.cocobellalifebar.com/our-menu), [address](https://www.cocobellalifebar.com/) | One Holland Village exact address confirmed. Eleven food-bowl names captured with unknown prices; dairy-free bases do not confirm topping suitability. Need prices and clear applicable vegetarian food scope. Beverages excluded. |
| [Kueh Ho Jiak](https://kuehhojiak.com/), [initial shop](https://kuehhojiak.com/shop/) | Tanjong Pagar and Sprout @ AMK addresses confirmed. Initial 20/40-piece mix-and-match listings captured as partial, from-price facts. Need remaining product categories, customizer choices, price changes and branch fulfillment mapping. |

## Publication proposals for root review

These are proposals only. The root agent must review, fingerprint and synchronize through the existing publication workflow. Preserve all existing publication entries. No held menu or held item should be admitted by a bulk import.

```json
[
  {
    "dataset": "data/menu-research/menu-directory-continuation-cafes-2026-10-16.json",
    "branchId": "lilac-oak-oxley-rise",
    "menuIds": ["lilac-oak-cafe-food-20261016"],
    "excludedItemIds": [],
    "reason": "Reviewed 18 standalone café food facts from the merchant menu tied to the exact Oxley Rise address. Premium/flavor, daily-bake, unknown-currency/tax/date, stock and ingredient qualifiers retained. Separate online cakes/catering outside inspected-source coverage.",
    "sourceUrls": ["https://www.lilacoak.com/cafe-menu"]
  },
  {
    "dataset": "data/menu-research/menu-directory-continuation-cafes-2026-10-16.json",
    "branchId": "baomaker-ang-mo-kio-447",
    "menuIds": ["baomaker-amk447-fresh-food-20261016"],
    "excludedItemIds": ["baomaker-food-cmi9ioy730003jp04ajpfjvry", "baomaker-food-cmi9kkyux002pla04ojn5xm6i"],
    "reason": "Reviewed 17 eligible displayed fresh/fried bao and burger facts tied by merchant category headings to447AngMoKioAve10#01-1675. Two explicitly sold-out foods excluded. SGD and tax-inclusive configuration are sourced; current stock, final fees, effective date and ingredients remain uncertain. Frozen/preorder subcategories incomplete. Postal unverified; live postal-card matching gap retained.",
    "sourceUrls": ["https://baomaker.com/", "https://baomaker.com/pages/about"]
  },
  {
    "dataset": "data/menu-research/menu-directory-continuation-cafes-2026-10-16.json",
    "branchId": "merle-lentor-modern",
    "menuIds": ["merle-lentor-human-food-20261016"],
    "excludedItemIds": [],
    "reason": "Reviewed all50human-food/extra rows from four merchant-linked food images tied to the exact Lentor Modern address. GST-inclusive/no-service-charge wording and food options retained. Currency code, effective date, current stock and display gelato/pastry details unknown. All pet foods and drinks excluded; no ingredient certification.",
    "sourceUrls": ["https://merleandco.com/menu/", "https://merleandco.com/"]
  }
]
```

## Validation and storage

The packet builder checks JSON parsing, unique source/branch/menu/food IDs, source/menu/branch references and non-negative numeric or explicit unknown prices. Counts and measured sizes are saved in `../tmp/qa/menu-directory-continuation/packet-validation.json`. The structured packet is about 148 KB, about 16 KB gzip; temporary HTML/PDF/image/browser evidence is about 24 MB and is not app catalogue payload. No app performance benchmark or device-lag conclusion is claimed by this extraction task; the root agent is measuring the integrated delivery path separately.


## Parent postal evidence supplement

After the initial frozen packet, the parent re-opened independent Companies.sg and SGPBusiness records for BAOMAKER LLP. Both display447AngMoKioAvenue10#01-1675,560447, matching the current merchant street/unit. Postal560447 was added with its independent source reference so the app can match the branch. Registered company status is not treated as current merchant operation; the current merchant page provides that association. No Google display field or OneMap error-bearing result supplied this postcode. The earlier missing-postal gap and proposal text above are historical.
