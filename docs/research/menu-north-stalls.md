# North stalls and Red Apple menu research

Checked 15 October 2026. Research data: [menu-north-stalls.json](../../data/menu-research/menu-north-stalls.json).

This packet contains **139 source-specific food records across 11 branch or identity leads and nine menus**. There are 125 observed prices and 14 unpriced foods. All food rows carry publication holds: the available evidence does not establish current menus. No beverages, machine-invented dishes or unverified branch transfers were imported.

| Location | Food rows | Evidence and remaining gap |
| --- | ---: | --- |
| Red Apple, 269B Queen Street #01-12 | 17 | Foodpanda rice/bee-hoon representation. Another retrieval showed a different stir-fry menu; current version and customizations unresolved. Old 269 #01-236 address is not merged. |
| Red Apple, 16 Teck Whye Lane #01-101 | 13 | Foodpanda food names and prices; bundle prices preserved for buy 10/get 1 offers. Source wording “1 Vegetable, 1 Mock Meat” remains unchanged. |
| Red Apple, 166 Woodlands Street 13 #01-553 | 16 | Nine noodle/rice-in-noodle-category foods, five rice foods and two snacks. A conflicting earlier snack-only representation is not merged. |
| Red Apple, 477 Tampines Street 43 #01-192 | 18 | Partial 22-food representation. Four grilled fish, seven mushroom, three tofu and four soup names obtained. One soup price, the fifth soup and three snacks remain unavailable. Base prices and conditional 15% prices stay separate. This is not the 835 Tampines Street 83 lead. |
| En Hui, Marsiling Mall #01-56 | 45 | Complete visible food-name/price list in the historical WhyQ web representation. Live managed browser returns 404. Held as historical; no current-menu claim. |
| Rong Yuan, 371A Woodlands Avenue 1 | 13 | Names read directly from the directory's photographed sign; no prices. All relevant gallery photographs inspected. Small weekday poster is unreadable. |
| Tanaka, 306 Woodlands Street 31 | 9 | Six main-board foods, one additional food ticket and two small noodle tickets read from photographs. Main board/ticket 3.80; small noodles 3.50. Photo date and currency code unknown; 306 versus 306A premises conflict remains. |
| Tanaka, 253 Choa Chu Kang Avenue 1 | 8 | Undated secondary burger/pasta sample only; another directory reports closure in June 2025. Held; no menu transfer to other Tanaka branches or Tian Tian at the same unit. |
| Ru Yi Xuan, 17 Woodlands Link | 0 | Historical HPB/payment-list address and secondary lead found; no readable current food menu obtained. Not a claim that the stall has no menu. |
| Rulai, 248 Woodlands Industrial Park E5 | 0 | Secondary identity lead. Current merchant identity and further menu research remain pending. |
| Rulai, 10 Marsiling Industrial Estate Road 1 | 0 | Separate secondary identity lead. Not merged with a registered office, 19 Marsiling Lane, Ang Mo Kio or Muar merchant. Current merchant identity and menu research remain pending. |

## Sources and access checks

- Foodpanda: [Queen Street](https://www.foodpanda.sg/restaurant/gksu/red-apple-vegetarian-queen-street), [Teck Whye](https://www.foodpanda.sg/restaurant/mlx0/red-apple-vegetarian-16-teck-whye-lane), [Woodlands](https://www.foodpanda.sg/restaurant/obfz/red-apple-vegetarian-cuisine-hong-ping-guo-su-shi-woodlands-street), [477 Tampines](https://www.foodpanda.sg/restaurant/zcq4/red-apple-vegetarian-tampines-street-43). Plain web representations supplied food facts; the ordinary managed-browser check returned HTTP 403. No challenge bypass, private API replay or further provider retries were used.
- [En Hui on WhyQ](https://www.whyq.sg/marsiling-mall-hawker-centre/en-hui-vegetarian-stall-01-56): the search representation identifies the exact stall and 45 food names/prices, but the live browser returns 404. The search crawler date is approximately 1.3 years earlier, not an effective menu date. The generic old cart/test strings are not merchant facts.
- [Rong Yuan on Foodgrove](https://www.foodgrove.sg/listing/rong-yuan-vegetarian/) and [photographed sign](https://www.foodgrove.sg/wp-content/uploads/2021/09/blk_371a_Rong_Yuan_Vegetarian_signage-min.jpg): direct visual inspection of the sign and relevant full-size gallery images. The 2021 upload path does not establish the date of sale.
- [Tanaka on Foodgrove](https://www.foodgrove.sg/listing/tanaka-vegetarian-food-%E7%94%B0%E4%B8%AD%E7%B4%A0%E9%A3%9F/) and [photograph with readable food tickets](https://www.foodgrove.sg/wp-content/uploads/2024/01/DSC05860-scaled.jpg): gallery opened through the ordinary page UI. All relevant photos inspected. The 2024 upload path does not establish current prices.
- [Tanaka's secondary sample](https://threebestrated.sg/vegan-restaurants/tanaka-vegetarian-choa-chu-kang-202835782) and [reported closure](https://www.happycow.net/reviews/tanaka-vegetarian-west-singapore-113687) remain secondary evidence.
- [HPB historical list](https://healthhub.sg/sites/assets/Assets/PDFs/HPB/Food/HDP_Hawker%20and%20coffeshop%20listing_for%20online%20use_16.5.2018.pdf), [Diners list](https://dcscc.com/dcscc/v2/pdf/diners-sg-pay/participating-merchants-coffeeshops.pdf) and the [saved public community directory](https://www.onehungryhippo.com/restaurants) support leads, not current menus.

The En Hui Shopy aggregator contains inferred generic dishes and inconsistent translations, so none of its machine-generated menu text was admitted. Nonvegetarian Tanaka Siglap, En Hui in Malaysia, unrelated recommended-shop photos, drink rows and review descriptions were excluded. No independent ingredient, allium or current stock certification was derived.

## Verification

The collector retains stable menu/food IDs, exact branch ownership, item-level source references, publication holds and source-specific price types. Local validation checks unique IDs, source and branch references, nonnegative numeric prices, food scope, row counts and holds. Full relevant Foodgrove sign/gallery images were inspected, including 3.80 versus 3.50 Tanaka tickets. No Google API call, allowance change, application import, merchant outreach or automatic publication occurred.

Two Rulai leads remain explicitly pending; unreadable or unresolved locations are never marked complete or converted into “no menu.” The separate directory coverage file continues to enumerate all 2,322 stored Google IDs.
