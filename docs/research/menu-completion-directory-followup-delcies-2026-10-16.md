# Delcie’s detailed menu followup — 16 October 2026

This freezes `data/menu-research/continuation-evidence/menu-completion-directory-followup-delcies-2026-10-16.json`. All103held Whampoa Getz food-card sources were expanded to full public detail facts, matching exact title, product ID, `.clone.2` document and branchIndex2. The existing Getz parser/helper was reused. The packet upgrades existing `delcies-whampoa-west` and menu `delcies-whampoa-getz-cards-20261016` with its stable103food IDs; parent must replace the partial card-only menu rather than duplicate it.

| Outcome | Count |
|---|---:|
| Detail food sources fully checked |103|
| Currently available source rows |51|
| Explicit24h preorder-only source rows |14|
| Unavailable, no active preorder path |38|
| Equivalent orderable category copies excluded |2|
| Reviewed publication food rows |63|
| Retained available now / advance-order only |50 / 13|
| Absolute portion variants |11|
| Food modifier groups/choices |66 / 135|

Coverage is **source-covered for this Whampoa urgent/Getz menu**, scope `branch-ordering`. Merchant website advance/custom orders, walk-in display and catering remain separate channels. All142category cards were accounted for:103foods and39excluded cards (31nonfood accessories,7beverages,1recipebook). No recipe descriptions or source artwork are proposed for app copying.

## Price/options/ordering findings

All displayed SGD prices are retained; card/detail prices agree. Eleven absolute portion variant rows and all eligible food modifier choices are captured. Food modifier amounts are increments; no combinations are calculated. Required nut-processing groups include a zero-supplement no-request choice and optional+SGD10.90merchant risk-reduction request. This is **not an allergy-safety guarantee**. Frozen choices, at least6h defrost where printed, durian day-ahead thaw recommendation, mandatory allergy acknowledgments and urgent no-custom-wording/design acknowledgments are retained. Nonfood card/candle/topper/knife/bag groups are accounted for separately and excluded from food modifiers.

Product availability and card control classes match for all103foods. Raw HTML contains both hidden Unavailable and ADD templates, so text presence alone was not used. Fourteen items have an active Pre-order control and24h restriction despite being unavailable for the current slot; they are preserved as advance-order-only. Thirty-eight unavailable sources are excluded from publication. Exact equivalent orderable copies require matching normalized title, full description, price, portions, food options and preorder requirement; all103source facts stay stored.

Getz config declares9%GST, raw `taxInclusive:0`,0%configured service charge that does not apply to pickup, zero packing on all103items, no enabled pickup minimum, and30minutes configured pickup preparation. The numeric GST enum is **not decoded**. Merchant FAQ explicitly says prices on its website include GST; this does not independently verify the urgent platform's final checkout. Displayed prices are not taxed again by this packet. Urgent third-party delivery fees vary; the regular website's$200free-delivery promotion,$27.25standard fee and membership discounts are not transferred to urgent orders. FAQ and Getz collection hours differ and current slot confirmation remains necessary. No cart/order/checkout was submitted.

## Whole-venue eligibility

Delcie’s is supported as a vegetarian venue by its operator plant-based bakery positioning, independent whole-venue Vegan classification and no actual meat/fish/gelatin contrary evidence in all103checked food descriptions. Universal vegan status is not asserted: live FAQ qualifies strict-vegan add-ons, and an independent historical review mentions dairy-butter pineapple tarts. Dairy remains compatible with vegetarian venue scope. Medical, religious and allergy claims are not independently certified. The direct HappyCow request returned403and was not retried; its categorical listing was visible in public web-search results. Current live FAQ wording was used rather than stronger older search snippets.

## Other selected first-packet sources

**Our Vegan Bakery:** checked41public same-brand channel posts from2May–1October2026 and the existing current October Cococart evidence. A22Maypost says May is the last full month at Pelikat and Kovan collections will end;2Junesays self-collection unavailable while moving home;2Julyannounces keys to a new shop;21Julystilldescribes home baking and delivery-only while that shop is prepared. No current exact public pickup premises were established. The channel links the same Cococart store and matching seasonal food names, but reciprocal website verification of channel ownership was not observed. Its31Octoberfoods remain held off the historical Pelikat saved place; no new shop address is inferred. A1OctoberSunset-Tarts10%public coupon is recorded as a qualified brand promotion, not automatically applied or redeemed.

**9 Brew:** all nine observed merchant category links separately checked, each returning No results and off-hours checkout-disabled wording. No eligible food row was visible. The directory categorically labels the venue vegetarian, while merchant description/announcement still refers to Ubi home operations and a forthcoming PayaLebarSquareB1-27shop. Primary current food menu/operation proof remains incomplete; no empty-category observation is promoted to permanent food-free status. No beverages or bottled-drink bundles are imported.

## Equivalent orderable source copies

| Name | Retained stable food ID | Excluded stable copy ID |
|---|---|---|
| 5in Round Mango Passionfruit Cake (Eggless, Dairy-free, Diabetic Friendly, Baby Friendly, Nut-free) | delcies-getz-food-603d503d-d1eb-4c54-9b88-c59e04ea0ba0 | delcies-getz-food-c54b58cb-495c-4eea-ae37-8ad0f5653563 |
| Low Carbs Choc Hazelnut Cake (Keto friendly, Eggless, Dairy-free, Diabetic friendly, Gluten-free) | delcies-getz-food-92002896-174f-47e2-a4ba-2c4446758768 | delcies-getz-food-a33976ab-503c-4588-9e4e-dfaa1c430b34 |

## Reviewed publication proposal

Parent merges into the existing canonical bakery dataset and updates its fingerprint/publication. This new supplement itself must not enter the global index as duplicated branches. Gap-only OurVegan/9Brew records preserve existing held menus and add evidence only.

```json
[
  {
    "dataset": "data/menu-research/continuation-evidence/menu-completion-directory-followup-delcies-2026-10-16.json",
    "branchId": "delcies-whampoa-west",
    "updatesExistingBranch": true,
    "menuIds": [
      "delcies-whampoa-getz-cards-20261016"
    ],
    "replaceExistingMenuIds": [
      "delcies-whampoa-getz-cards-20261016"
    ],
    "excludedItemIds": [
      "delcies-getz-food-219b5854-ccf3-4bf8-b586-837d02a2c7b0",
      "delcies-getz-food-82ac53ac-a132-424c-876b-591f0d7a7517",
      "delcies-getz-food-ea9c4937-6585-412c-be7c-e7fe7ce5c3a3",
      "delcies-getz-food-891ea497-d112-4d41-a7cf-39ca03505eb0",
      "delcies-getz-food-7325619d-83d3-40ec-a383-1b04c2cb3a07",
      "delcies-getz-food-1f9ce963-a304-443b-be16-0d8e35e492d3",
      "delcies-getz-food-8887d8ec-a518-47d0-a807-bc9039586330",
      "delcies-getz-food-56e296c9-f8ae-4cc8-80ef-2188a61abcfd",
      "delcies-getz-food-78c09a91-803e-4e37-9d12-7f6e75fdbfac",
      "delcies-getz-food-327b4a3c-34cc-493f-88d7-f093a8e07600",
      "delcies-getz-food-e6cbbb66-ca28-43c2-90ac-8434e7b2cedc",
      "delcies-getz-food-b11b926b-e375-49fa-89a7-dd80dfa6a6c8",
      "delcies-getz-food-60647a19-3150-4bca-9608-708cabcd04a8",
      "delcies-getz-food-ed4a2180-6b80-4730-a07a-b45887cdbd6a",
      "delcies-getz-food-0f5cb76f-b4f6-4e80-91db-d8ba462dee5b",
      "delcies-getz-food-77abd6cc-4f1e-49a3-8f3b-83ce1c6a47be",
      "delcies-getz-food-e658dc40-8d1f-47ed-a42e-31055053da7a",
      "delcies-getz-food-9962cf9a-d008-4cb5-a03a-3dd2e97e844d",
      "delcies-getz-food-b56287fd-673a-48d2-b311-3ac2b5764739",
      "delcies-getz-food-720ccf70-de6c-4002-ab3e-6bd9227e4557",
      "delcies-getz-food-a2825f3e-679f-4a4c-81c9-5bd5519814b6",
      "delcies-getz-food-602e5fb3-d7de-4748-8240-819438086024",
      "delcies-getz-food-35362ec2-d1af-4b5f-8e92-6fb5af64f916",
      "delcies-getz-food-ddfc001f-ae5a-4223-ac85-45d4980d64d8",
      "delcies-getz-food-a4920934-33d4-44db-86a2-501afb9dffaf",
      "delcies-getz-food-eb67dff3-990f-4344-8ee0-cab56143d9f8",
      "delcies-getz-food-5df30dc1-7ed1-428f-9de9-37b53c56bb8d",
      "delcies-getz-food-240ea02a-5811-4dbf-9362-fc46e4f7b045",
      "delcies-getz-food-6a352ec6-9138-45bc-bd38-be498b145f66",
      "delcies-getz-food-c54b58cb-495c-4eea-ae37-8ad0f5653563",
      "delcies-getz-food-c2a24073-ae46-4f67-bd6d-e465be096b9a",
      "delcies-getz-food-36157ba4-4b8c-4ddb-aa27-a5d8ec163c8e",
      "delcies-getz-food-79da724d-cc9f-46eb-a47b-8e1449cb12e5",
      "delcies-getz-food-a33976ab-503c-4588-9e4e-dfaa1c430b34",
      "delcies-getz-food-9be2de23-0b4a-4d85-b69c-d3d5e841adb8",
      "delcies-getz-food-45455fed-0136-4843-a7cc-fa4352c56ee1",
      "delcies-getz-food-82a3988c-2f48-4ff2-ac4a-b778923ea8dc",
      "delcies-getz-food-f177b770-6e24-44b3-845a-fb2ca7d57f70",
      "delcies-getz-food-361e4a9e-57c8-47ba-9b55-47ee0971535f",
      "delcies-getz-food-55bf9800-7ded-4a42-a787-770e8cd0596d"
    ],
    "reason": "All103 public Whampoa food detail documents and card/control states reviewed. Keep currently available and explicit24h preorder food facts; exclude38unavailable source rows and exactly equivalent category copies. Portions, food modifiers, mandatory processing choices, frozen/thaw/customization restrictions and uncertain urgent-channel final charges retained. Venue is eligible vegetarian; universal vegan/allergen/medical certification not claimed. Replace old partial card-only menu in canonical dataset, retaining stable food IDs; do not add duplicate menu.",
    "sourceUrls": [
      "https://delcies.getz.co/Category?StoreID=a6fb4363-6b02-47ca-8193-c856a85d257b&Service=PickUp&lang=EN",
      "https://urgent.delcies.com/",
      "https://delcies.com/FAQ",
      "https://delcies.com/",
      "https://www.happycow.net/reviews/delcies-desserts-and-cakes-central-singapore-30959"
    ]
  }
]
```

## Sources

All check timestamps are retrieval dates, not menu effective dates. Current stock may change. Raw evidence and103public detail documents are under `C:/Users/huien/qt/tmp/qa/menu-completion-directory-followup/`.

| Source | Result | Checked UTC |
|---|---|---|
| [delcies.com](https://delcies.com/FAQ) | HTTP200 | 2026-10-16T00:42:08.973639+00:00 |
| [delcies.com](https://delcies.com/) | HTTP200 | 2026-10-16T00:47:48.762246+00:00 |
| [delcies.getz.co](https://delcies.getz.co/Scripts/js_newUI/product-to-cart.js?v=253.20261006-129) | HTTP200 | 2026-10-16T00:42:08.970287+00:00 |
| [delcies.getz.co](https://delcies.getz.co/Product/ProductDetail?id=219b5854-ccf3-4bf8-b586-837d02a2c7b0.clone.2&productId=219b5854-ccf3-4bf8-b586-837d02a2c7b0) | HTTP200 | 2026-10-16T00:42:43.375507+00:00 |
| [delcies.getz.co](https://delcies.getz.co/Scripts/js_newUI/custom_js_ui.js?v=253.20261006-129) | HTTP200 | 2026-10-16T00:42:27.667778+00:00 |
| [www.happycow.net](https://www.happycow.net/reviews/delcies-desserts-and-cakes-central-singapore-30959) | retrieval-gap | 2026-10-16T00:49:17.536900+00:00 |
| [www.onehungryhippo.com](https://www.onehungryhippo.com/restaurants/9-brew-coffee-house) | HTTP200 | 2026-10-16T00:42:09.380639+00:00 |
| [t.me](https://t.me/s/ourveganbakery?before=348) | HTTP200 | 2026-10-16T00:43:58.166238+00:00 |
| [t.me](https://t.me/s/ourveganbakery) | HTTP200 | 2026-10-16T00:42:08.974978+00:00 |
| [t.me](https://t.me/s/ourveganbakery?before=368) | HTTP200 | 2026-10-16T00:42:43.377559+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cmazh81v50008l104myjwjany) | HTTP200 | 2026-10-16T00:45:08.187356+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cm383545a0033sp19t2fjprs4) | HTTP200 | 2026-10-16T00:45:05.526706+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cm3832tvw00009wq13um2urz8) | HTTP200 | 2026-10-16T00:45:05.929709+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cm6hyo0a3000uumbhvwf4edvm) | HTTP200 | 2026-10-16T00:45:06.638603+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cm6hznre20016ogyyeotxvotl) | HTTP200 | 2026-10-16T00:45:07.391617+00:00 |
| [take.app](https://take.app/9brewcoffee) | HTTP200 | 2026-10-16T00:42:08.975744+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cmce4k9170000jv04v47tsgr1) | HTTP200 | 2026-10-16T00:45:08.644065+00:00 |
| [take.app](https://take.app/9brewcoffee/c/cm3833rgp002ssp19wkkyieft) | HTTP200 | 2026-10-16T00:45:06.320085+00:00 |
| [take.app](https://take.app/9brewcoffee/c/clw34eguc0004v9s43dp98i92) | HTTP200 | 2026-10-16T00:45:05.107202+00:00 |
| [take.app](https://take.app/9brewcoffee/c/clxd2ysxb0003ece404vqr8fp) | HTTP200 | 2026-10-16T00:45:07.792399+00:00 |
| [urgent.delcies.com](https://urgent.delcies.com/) | HTTP200 | 2026-10-16T00:43:58.164659+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Category?StoreID=a6fb4363-6b02-47ca-8193-c856a85d257b&Service=PickUp&lang=EN) | browser-readable | 2026-10-16T00:54:01.361235+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=219b5854-ccf3-4bf8-b586-837d02a2c7b0.clone.2&productId=219b5854-ccf3-4bf8-b586-837d02a2c7b0) | HTTP200 | 2026-10-16T00:43:48.775692+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=82ac53ac-a132-424c-876b-591f0d7a7517.clone.2&productId=82ac53ac-a132-424c-876b-591f0d7a7517) | HTTP200 | 2026-10-16T00:43:49.422970+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=ea9c4937-6585-412c-be7c-e7fe7ce5c3a3.clone.2&productId=ea9c4937-6585-412c-be7c-e7fe7ce5c3a3) | HTTP200 | 2026-10-16T00:43:50.002596+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=891ea497-d112-4d41-a7cf-39ca03505eb0.clone.2&productId=891ea497-d112-4d41-a7cf-39ca03505eb0) | HTTP200 | 2026-10-16T00:43:50.522269+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=7325619d-83d3-40ec-a383-1b04c2cb3a07.clone.2&productId=7325619d-83d3-40ec-a383-1b04c2cb3a07) | HTTP200 | 2026-10-16T00:43:51.078960+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=1f9ce963-a304-443b-be16-0d8e35e492d3.clone.2&productId=1f9ce963-a304-443b-be16-0d8e35e492d3) | HTTP200 | 2026-10-16T00:43:51.721529+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=8887d8ec-a518-47d0-a807-bc9039586330.clone.2&productId=8887d8ec-a518-47d0-a807-bc9039586330) | HTTP200 | 2026-10-16T00:43:52.253600+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=56e296c9-f8ae-4cc8-80ef-2188a61abcfd.clone.2&productId=56e296c9-f8ae-4cc8-80ef-2188a61abcfd) | HTTP200 | 2026-10-16T00:43:52.838938+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=78c09a91-803e-4e37-9d12-7f6e75fdbfac.clone.2&productId=78c09a91-803e-4e37-9d12-7f6e75fdbfac) | HTTP200 | 2026-10-16T00:43:53.460949+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=327b4a3c-34cc-493f-88d7-f093a8e07600.clone.2&productId=327b4a3c-34cc-493f-88d7-f093a8e07600) | HTTP200 | 2026-10-16T00:43:54.120485+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=e6cbbb66-ca28-43c2-90ac-8434e7b2cedc.clone.2&productId=e6cbbb66-ca28-43c2-90ac-8434e7b2cedc) | HTTP200 | 2026-10-16T00:43:54.739959+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=2acef7cb-64ac-4012-82fc-6df191e5c71b.clone.2&productId=2acef7cb-64ac-4012-82fc-6df191e5c71b) | HTTP200 | 2026-10-16T00:43:55.312255+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=b11b926b-e375-49fa-89a7-dd80dfa6a6c8.clone.2&productId=b11b926b-e375-49fa-89a7-dd80dfa6a6c8) | HTTP200 | 2026-10-16T00:43:55.926669+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=7433f2f8-ade7-48db-b2b2-752e3b2b7b78.clone.2&productId=7433f2f8-ade7-48db-b2b2-752e3b2b7b78) | HTTP200 | 2026-10-16T00:43:56.540762+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=60647a19-3150-4bca-9608-708cabcd04a8.clone.2&productId=60647a19-3150-4bca-9608-708cabcd04a8) | HTTP200 | 2026-10-16T00:43:57.245335+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=ed4a2180-6b80-4730-a07a-b45887cdbd6a.clone.2&productId=ed4a2180-6b80-4730-a07a-b45887cdbd6a) | HTTP200 | 2026-10-16T00:43:58.088741+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=e0482e30-e937-4623-b33d-57c2e2757687.clone.2&productId=e0482e30-e937-4623-b33d-57c2e2757687) | HTTP200 | 2026-10-16T00:43:58.880595+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=0f5cb76f-b4f6-4e80-91db-d8ba462dee5b.clone.2&productId=0f5cb76f-b4f6-4e80-91db-d8ba462dee5b) | HTTP200 | 2026-10-16T00:43:59.610398+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=3cfa8a80-2208-4e97-9cf9-24b6c92772d6.clone.2&productId=3cfa8a80-2208-4e97-9cf9-24b6c92772d6) | HTTP200 | 2026-10-16T00:44:00.280806+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=77abd6cc-4f1e-49a3-8f3b-83ce1c6a47be.clone.2&productId=77abd6cc-4f1e-49a3-8f3b-83ce1c6a47be) | HTTP200 | 2026-10-16T00:44:00.938481+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=e658dc40-8d1f-47ed-a42e-31055053da7a.clone.2&productId=e658dc40-8d1f-47ed-a42e-31055053da7a) | HTTP200 | 2026-10-16T00:44:01.574022+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=9962cf9a-d008-4cb5-a03a-3dd2e97e844d.clone.2&productId=9962cf9a-d008-4cb5-a03a-3dd2e97e844d) | HTTP200 | 2026-10-16T00:44:02.194680+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=b56287fd-673a-48d2-b311-3ac2b5764739.clone.2&productId=b56287fd-673a-48d2-b311-3ac2b5764739) | HTTP200 | 2026-10-16T00:44:02.842706+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=720ccf70-de6c-4002-ab3e-6bd9227e4557.clone.2&productId=720ccf70-de6c-4002-ab3e-6bd9227e4557) | HTTP200 | 2026-10-16T00:44:03.496664+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a2825f3e-679f-4a4c-81c9-5bd5519814b6.clone.2&productId=a2825f3e-679f-4a4c-81c9-5bd5519814b6) | HTTP200 | 2026-10-16T00:44:04.098928+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=602e5fb3-d7de-4748-8240-819438086024.clone.2&productId=602e5fb3-d7de-4748-8240-819438086024) | HTTP200 | 2026-10-16T00:44:04.681148+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=35362ec2-d1af-4b5f-8e92-6fb5af64f916.clone.2&productId=35362ec2-d1af-4b5f-8e92-6fb5af64f916) | HTTP200 | 2026-10-16T00:44:05.406308+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=05500901-1da0-464a-9122-296a0854e491.clone.2&productId=05500901-1da0-464a-9122-296a0854e491) | HTTP200 | 2026-10-16T00:44:06.029411+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=ac96c43f-0842-4416-965f-3feb3bc47312.clone.2&productId=ac96c43f-0842-4416-965f-3feb3bc47312) | HTTP200 | 2026-10-16T00:44:06.590627+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=9ad7fd6a-2b7a-4558-88e2-45aa3b01af60.clone.2&productId=9ad7fd6a-2b7a-4558-88e2-45aa3b01af60) | HTTP200 | 2026-10-16T00:44:07.224095+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=4d9ae6ab-e552-440f-9f3a-daf4321bfffe.clone.2&productId=4d9ae6ab-e552-440f-9f3a-daf4321bfffe) | HTTP200 | 2026-10-16T00:44:07.785062+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a32ae0ad-7c75-4259-812b-7376c3ca1dfb.clone.2&productId=a32ae0ad-7c75-4259-812b-7376c3ca1dfb) | HTTP200 | 2026-10-16T00:44:08.466638+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=cc714284-3072-47be-8a5d-b6bbbbd54fa0.clone.2&productId=cc714284-3072-47be-8a5d-b6bbbbd54fa0) | HTTP200 | 2026-10-16T00:44:09.021902+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a9291bb2-f229-4ad3-afd8-83396d5fb750.clone.2&productId=a9291bb2-f229-4ad3-afd8-83396d5fb750) | HTTP200 | 2026-10-16T00:44:09.607827+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=504c5901-3ca1-4c07-87dc-55c28f50d573.clone.2&productId=504c5901-3ca1-4c07-87dc-55c28f50d573) | HTTP200 | 2026-10-16T00:44:10.156285+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=ddfc001f-ae5a-4223-ac85-45d4980d64d8.clone.2&productId=ddfc001f-ae5a-4223-ac85-45d4980d64d8) | HTTP200 | 2026-10-16T00:44:10.719324+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=4bd937eb-b5b9-4404-b3d7-ef564a63658b.clone.2&productId=4bd937eb-b5b9-4404-b3d7-ef564a63658b) | HTTP200 | 2026-10-16T00:44:11.602721+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a4920934-33d4-44db-86a2-501afb9dffaf.clone.2&productId=a4920934-33d4-44db-86a2-501afb9dffaf) | HTTP200 | 2026-10-16T00:44:12.451094+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=19e2136e-a7cb-45e2-9bd0-ef2e039bd952.clone.2&productId=19e2136e-a7cb-45e2-9bd0-ef2e039bd952) | HTTP200 | 2026-10-16T00:44:13.300806+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=580f33a8-f6fa-4721-abdc-5ab392ce4306.clone.2&productId=580f33a8-f6fa-4721-abdc-5ab392ce4306) | HTTP200 | 2026-10-16T00:44:14.166485+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=eb67dff3-990f-4344-8ee0-cab56143d9f8.clone.2&productId=eb67dff3-990f-4344-8ee0-cab56143d9f8) | HTTP200 | 2026-10-16T00:44:15.083109+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=603d503d-d1eb-4c54-9b88-c59e04ea0ba0.clone.2&productId=603d503d-d1eb-4c54-9b88-c59e04ea0ba0) | HTTP200 | 2026-10-16T00:44:15.776667+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a6762fed-3507-4ed3-8b2e-f5a64b065716.clone.2&productId=a6762fed-3507-4ed3-8b2e-f5a64b065716) | HTTP200 | 2026-10-16T00:44:16.697367+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=5df30dc1-7ed1-428f-9de9-37b53c56bb8d.clone.2&productId=5df30dc1-7ed1-428f-9de9-37b53c56bb8d) | HTTP200 | 2026-10-16T00:44:17.603680+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=5f496b78-6f87-4eaa-babd-98d3b7bf5ab8.clone.2&productId=5f496b78-6f87-4eaa-babd-98d3b7bf5ab8) | HTTP200 | 2026-10-16T00:44:18.483752+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=551ee4a7-4cab-4a33-a4e6-d931e85ea23c.clone.2&productId=551ee4a7-4cab-4a33-a4e6-d931e85ea23c) | HTTP200 | 2026-10-16T00:44:19.402607+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=7ac435fc-029d-4380-9a79-1e73f8b93ec1.clone.2&productId=7ac435fc-029d-4380-9a79-1e73f8b93ec1) | HTTP200 | 2026-10-16T00:44:20.512895+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=eb0f6a0f-91c4-4ed2-a512-8f0ef8ea0e2d.clone.2&productId=eb0f6a0f-91c4-4ed2-a512-8f0ef8ea0e2d) | HTTP200 | 2026-10-16T00:44:21.393620+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=240ea02a-5811-4dbf-9362-fc46e4f7b045.clone.2&productId=240ea02a-5811-4dbf-9362-fc46e4f7b045) | HTTP200 | 2026-10-16T00:44:22.273701+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=6a352ec6-9138-45bc-bd38-be498b145f66.clone.2&productId=6a352ec6-9138-45bc-bd38-be498b145f66) | HTTP200 | 2026-10-16T00:44:23.214172+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=100d5934-23b4-4c33-8ae4-0766ae0ba707.clone.2&productId=100d5934-23b4-4c33-8ae4-0766ae0ba707) | HTTP200 | 2026-10-16T00:44:24.107925+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=33c05a89-b8c5-47af-a0ec-6af7a4f360b6.clone.2&productId=33c05a89-b8c5-47af-a0ec-6af7a4f360b6) | HTTP200 | 2026-10-16T00:44:24.937299+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=c54b58cb-495c-4eea-ae37-8ad0f5653563.clone.2&productId=c54b58cb-495c-4eea-ae37-8ad0f5653563) | HTTP200 | 2026-10-16T00:44:25.829516+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=ab9cdafc-e014-4449-b8b4-b9d946367489.clone.2&productId=ab9cdafc-e014-4449-b8b4-b9d946367489) | HTTP200 | 2026-10-16T00:44:26.694782+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=65276673-987b-4a46-abee-20e8d879ff15.clone.2&productId=65276673-987b-4a46-abee-20e8d879ff15) | HTTP200 | 2026-10-16T00:44:27.569538+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=63533953-d1ec-4a33-b57b-832f51090d48.clone.2&productId=63533953-d1ec-4a33-b57b-832f51090d48) | HTTP200 | 2026-10-16T00:44:28.243211+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=101eb559-f196-4f8a-809e-bb52969c72b6.clone.2&productId=101eb559-f196-4f8a-809e-bb52969c72b6) | HTTP200 | 2026-10-16T00:44:28.927301+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=92002896-174f-47e2-a4ba-2c4446758768.clone.2&productId=92002896-174f-47e2-a4ba-2c4446758768) | HTTP200 | 2026-10-16T00:44:29.617286+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=08852829-bdb3-4c99-a344-8fe393c49862.clone.2&productId=08852829-bdb3-4c99-a344-8fe393c49862) | HTTP200 | 2026-10-16T00:44:30.453213+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=c2a24073-ae46-4f67-bd6d-e465be096b9a.clone.2&productId=c2a24073-ae46-4f67-bd6d-e465be096b9a) | HTTP200 | 2026-10-16T00:44:31.220658+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=36157ba4-4b8c-4ddb-aa27-a5d8ec163c8e.clone.2&productId=36157ba4-4b8c-4ddb-aa27-a5d8ec163c8e) | HTTP200 | 2026-10-16T00:44:32.104490+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=5345654f-13f3-4275-bd2e-b7dc501308b2.clone.2&productId=5345654f-13f3-4275-bd2e-b7dc501308b2) | HTTP200 | 2026-10-16T00:44:32.880913+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=3df0ea73-2cd9-4f03-9f4b-d31a6c75442a.clone.2&productId=3df0ea73-2cd9-4f03-9f4b-d31a6c75442a) | HTTP200 | 2026-10-16T00:44:33.590457+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=9f4d5314-4bee-4153-b06d-196c377f6ad5.clone.2&productId=9f4d5314-4bee-4153-b06d-196c377f6ad5) | HTTP200 | 2026-10-16T00:44:34.332218+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=0615094a-8fa6-46ac-a9e6-5093a774dfa6.clone.2&productId=0615094a-8fa6-46ac-a9e6-5093a774dfa6) | HTTP200 | 2026-10-16T00:44:35.087808+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=79da724d-cc9f-46eb-a47b-8e1449cb12e5.clone.2&productId=79da724d-cc9f-46eb-a47b-8e1449cb12e5) | HTTP200 | 2026-10-16T00:44:35.783013+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a33976ab-503c-4588-9e4e-dfaa1c430b34.clone.2&productId=a33976ab-503c-4588-9e4e-dfaa1c430b34) | HTTP200 | 2026-10-16T00:44:36.776636+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=9be2de23-0b4a-4d85-b69c-d3d5e841adb8.clone.2&productId=9be2de23-0b4a-4d85-b69c-d3d5e841adb8) | HTTP200 | 2026-10-16T00:44:37.678757+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=156714f8-8d45-4b0d-b725-3665a9966bf2.clone.2&productId=156714f8-8d45-4b0d-b725-3665a9966bf2) | HTTP200 | 2026-10-16T00:44:38.567480+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=45455fed-0136-4843-a7cc-fa4352c56ee1.clone.2&productId=45455fed-0136-4843-a7cc-fa4352c56ee1) | HTTP200 | 2026-10-16T00:44:39.431148+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=68c1f21a-7936-4675-8de2-10eff27fc07d.clone.2&productId=68c1f21a-7936-4675-8de2-10eff27fc07d) | HTTP200 | 2026-10-16T00:44:40.297805+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=365455da-6bbe-4cf9-9937-5685793bcc32.clone.2&productId=365455da-6bbe-4cf9-9937-5685793bcc32) | HTTP200 | 2026-10-16T00:44:41.136153+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=794d5504-3c42-48a5-aebc-ff49fc4fc3ca.clone.2&productId=794d5504-3c42-48a5-aebc-ff49fc4fc3ca) | HTTP200 | 2026-10-16T00:44:41.934147+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=82a3988c-2f48-4ff2-ac4a-b778923ea8dc.clone.2&productId=82a3988c-2f48-4ff2-ac4a-b778923ea8dc) | HTTP200 | 2026-10-16T00:44:42.798066+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=f177b770-6e24-44b3-845a-fb2ca7d57f70.clone.2&productId=f177b770-6e24-44b3-845a-fb2ca7d57f70) | HTTP200 | 2026-10-16T00:44:43.523924+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=361e4a9e-57c8-47ba-9b55-47ee0971535f.clone.2&productId=361e4a9e-57c8-47ba-9b55-47ee0971535f) | HTTP200 | 2026-10-16T00:44:44.267770+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=1486648d-b003-4f20-bdb0-de999952a219.clone.2&productId=1486648d-b003-4f20-bdb0-de999952a219) | HTTP200 | 2026-10-16T00:44:45.015242+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=55bf9800-7ded-4a42-a787-770e8cd0596d.clone.2&productId=55bf9800-7ded-4a42-a787-770e8cd0596d) | HTTP200 | 2026-10-16T00:44:45.783639+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=15cccabe-6d8c-408c-a6c1-9fd32101ff52.clone.2&productId=15cccabe-6d8c-408c-a6c1-9fd32101ff52) | HTTP200 | 2026-10-16T00:44:46.603866+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=2cbf8d5b-ebdd-4801-a76b-3c79d3c2c0f2.clone.2&productId=2cbf8d5b-ebdd-4801-a76b-3c79d3c2c0f2) | HTTP200 | 2026-10-16T00:44:47.485837+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=bac4f800-4a2a-453f-94c2-a8312bffa42c.clone.2&productId=bac4f800-4a2a-453f-94c2-a8312bffa42c) | HTTP200 | 2026-10-16T00:44:48.402371+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=cb33d2c7-9206-424c-b146-417fad9b0606.clone.2&productId=cb33d2c7-9206-424c-b146-417fad9b0606) | HTTP200 | 2026-10-16T00:44:49.370617+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=5ff6d6d1-16dd-4c7e-8471-6e12a41bde12.clone.2&productId=5ff6d6d1-16dd-4c7e-8471-6e12a41bde12) | HTTP200 | 2026-10-16T00:44:50.347881+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=f8897337-ee2f-41c4-8bc9-544a143dd791.clone.2&productId=f8897337-ee2f-41c4-8bc9-544a143dd791) | HTTP200 | 2026-10-16T00:44:51.269155+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=5d0056ef-cfcc-468d-aae1-b19f635ba5de.clone.2&productId=5d0056ef-cfcc-468d-aae1-b19f635ba5de) | HTTP200 | 2026-10-16T00:44:52.150468+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=fea47776-02af-4f14-b611-0292dd6db6a7.clone.2&productId=fea47776-02af-4f14-b611-0292dd6db6a7) | HTTP200 | 2026-10-16T00:44:53.051623+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=28d1df88-ddd2-4ef9-b47c-6513bfce1634.clone.2&productId=28d1df88-ddd2-4ef9-b47c-6513bfce1634) | HTTP200 | 2026-10-16T00:44:54.043647+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=e024c161-0226-4290-8cf8-3e2d6edcc094.clone.2&productId=e024c161-0226-4290-8cf8-3e2d6edcc094) | HTTP200 | 2026-10-16T00:44:54.942527+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=336c05cc-35b1-4c9f-8934-cb0cdea5153d.clone.2&productId=336c05cc-35b1-4c9f-8934-cb0cdea5153d) | HTTP200 | 2026-10-16T00:44:55.862709+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=cbfcc186-5499-4dc6-b78b-f4e4419014fb.clone.2&productId=cbfcc186-5499-4dc6-b78b-f4e4419014fb) | HTTP200 | 2026-10-16T00:44:56.769838+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=4905c053-8596-4d41-bb2d-4da0fb3814e2.clone.2&productId=4905c053-8596-4d41-bb2d-4da0fb3814e2) | HTTP200 | 2026-10-16T00:44:57.683991+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=0ea8bb9b-1718-4594-8988-72cde82a5417.clone.2&productId=0ea8bb9b-1718-4594-8988-72cde82a5417) | HTTP200 | 2026-10-16T00:44:58.590091+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=c0f73d72-aa67-4bb1-a11d-cdd1993fdab7.clone.2&productId=c0f73d72-aa67-4bb1-a11d-cdd1993fdab7) | HTTP200 | 2026-10-16T00:44:59.167501+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=fdd6d6ab-a90b-4386-973e-da18c0b4055a.clone.2&productId=fdd6d6ab-a90b-4386-973e-da18c0b4055a) | HTTP200 | 2026-10-16T00:44:59.736296+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=49194539-91b1-40fc-bcae-0cd19d7eeadd.clone.2&productId=49194539-91b1-40fc-bcae-0cd19d7eeadd) | HTTP200 | 2026-10-16T00:45:00.333147+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=82f04f14-564e-465b-ae28-83a1a70be5e5.clone.2&productId=82f04f14-564e-465b-ae28-83a1a70be5e5) | HTTP200 | 2026-10-16T00:45:00.954519+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=4377844b-1131-4a00-8314-df97e4c26299.clone.2&productId=4377844b-1131-4a00-8314-df97e4c26299) | HTTP200 | 2026-10-16T00:45:01.568515+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=7a1ed35c-8083-4e26-b90b-2ecdc61e5d12.clone.2&productId=7a1ed35c-8083-4e26-b90b-2ecdc61e5d12) | HTTP200 | 2026-10-16T00:45:02.171121+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=a0146c32-f34b-4893-8ea7-1cd780130861.clone.2&productId=a0146c32-f34b-4893-8ea7-1cd780130861) | HTTP200 | 2026-10-16T00:45:02.832594+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=c5c852a0-df1b-46e9-91e0-af6023499c98.clone.2&productId=c5c852a0-df1b-46e9-91e0-af6023499c98) | HTTP200 | 2026-10-16T00:45:03.541891+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=e57d3b0c-1fd7-46db-9131-fb2c338852db.clone.2&productId=e57d3b0c-1fd7-46db-9131-fb2c338852db) | HTTP200 | 2026-10-16T00:45:04.388916+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=baa0f58a-4519-47e8-a6d4-7cbbb35b7a65.clone.2&productId=baa0f58a-4519-47e8-a6d4-7cbbb35b7a65) | HTTP200 | 2026-10-16T00:45:05.277615+00:00 |
| [Delcie’s via Getz](https://delcies.getz.co/Product/ProductDetail?id=89812561-83cf-4213-8559-f9e0799e0181.clone.2&productId=89812561-83cf-4213-8559-f9e0799e0181) | HTTP200 | 2026-10-16T00:45:06.044185+00:00 |
| [HappyCow](https://www.happycow.net/reviews/delcies-desserts-and-cakes-central-singapore-30959) | public-search-index-readable; direct-HTTP403 | 2026-10-16T00:54:01.361235+00:00 |

## Validation/storage

passed JSON roundtrip, unique IDs, all references/prices,103detail title/product/doc/branch checks and103card availability/control matches. Packet467,933bytes, gzip30,024bytes. SHA256 `4bd3d73e3f60f84f291205fc2ba1959dcfd64ce484a9236577619424863e28c4`. Structured data only is proposed; temporary HTML/screenshots are not app payload. No Google requests, canonical/app edits, merchant messages, orders or access-control bypass occurred. Sources that returned403/429were not retried. This research task does not benchmark app lag.


Root integration 2026-10-16T00:56:56.956Z: canonical bakery packet upgraded in place;63food rows approved. Portion evidence and mandatory handling/customization acknowledgments mapped into existing public detail fields. Frozen supplement archived outside inventory discovery to prevent duplicate branch/menu counts.
