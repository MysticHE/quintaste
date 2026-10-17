# Botanict, The Kind Bowl and Fo You Yuan

Checked 15 October 2026. Separate research only; no public app import, merchant approval or ingredient certification is implied.

| Location | Food evidence | Coverage and remaining gaps |
|---|---:|---|
| Botanict, Blk 352 Clementi Avenue 2 #01-123, Singapore 120352 | 104 prepared products; 10 bulk bentos; 73 buffet choices and one package; three Nasi Tumpeng set headings | Prepared-food POS categories and priced bentos captured. Catering selection rules conflict; Nasi Tumpeng prices are unpublished. |
| The Kind Bowl, 71 Killiney Road, Singapore 239527 | Shared 17-food brand menu | Exact branch applicability, stock and currency code unconfirmed. |
| The Kind Bowl, Northpoint City North Wing #B1-46, 930 Yishun Avenue 2, Singapore 769098 | Same shared brand menu | Shared source is counted once; no separate Northpoint price claim. Delivery page says Coming Soon. |
| Fo You Yuan, 369 Jalan Besar, Singapore 208997 | 72 food tiles, including five source-unavailable entries | Thirteen products have unread choice details; item request returned 404 and browser modal stayed Loading. |

There are **280 source-specific food rows**, four branch records, six menus and seven sources. Shared brand menus, catering alternatives and repeated dishes across channels are not unique-dish counts. All numeric prices retain unknown currency where the source publishes only an unqualified dollar symbol.

[Botanict's merchant site](https://botanict.sg/) links its [ordering menu](https://pos.amfuture.sg/h5/pages/product/list/store?app_id=10070&shop_supplier_id=10096). The actual UI identifies Botanict / Garden Treatz. All 16 prepared-food category selections were exercised in managed Chromium. Each returned one page, with captured count equal to source total: 104 products, 143 SKU price rows and 347 food-modifier choices. Ordinary and lower VIP prices are visibly distinct; the normal/list prices are retained separately from conditional alternate prices. Published size labels, packing fees, modifier prices and quantity constraints remain separate. No drink category, frozen retail, homemade frozen, dried-goods category, standalone sauce or non-food stock/cost/sales field is included in the dataset.

The merchant's public catering text was read from the rendered Canva site and its public text model without copying artwork. Ten bulk bentos retain per-set prices and published components. Minimum ten sets and five-day lead time below 30 / seven days above 30 apply; the exact-30 rule is unstated. Conditional quantity discounts are not applied to listed prices. Buffet components have **no standalone price**: whole-package prices are recorded separately for 10/15/20/25/30 pax. The source headline says six dishes but shows nine choose-one groups; this is retained as a gap. Three Nasi Tumpeng source headings are unpriced, with a three-day notice and separate published standard-set components. Generic unnamed BBQ skewers are not invented as individual dishes.

[The Kind Bowl menu](https://www.thekindbowl.com.sg/blank) has six starters, six noodle mains, two sandwiches, one salad main and two rice mains. All 17 named foods/prices are retained; 11 drinks are excluded. Its [contact page](https://www.thekindbowl.com.sg/blank-3) lists Killiney and Northpoint. The generic menu does not publish separate branch prices, so it remains brand-only evidence. The [delivery page](https://www.thekindbowl.com.sg/blank-1) is Coming Soon; no delivery prices are inferred.

[Fo You Yuan's official page](https://foyouyuan.com.sg/) links the [Maynuu menu](https://foyouyuan.maynuu.com/) and confirms the Jalan Besar address. All 72 food tiles in eight categories are captured, without copying promotional descriptions. Five struck/unavailable listings are explicitly marked; this does not establish permanent closure or current stock. Thirteen products advertise Choices but readable option labels/prices could not be obtained through the source interface. Parent/listing prices are therefore marked displayed, not a guaranteed complete customized-order price. The rice-cake offer retains its 8-inch/21cm, 3–4-pax and one-day-preorder qualifier. The source's fixed 0.50 plus 8% platform fee is separate from individual prices. No order, cart submission or merchant contact occurred.

Evidence lives in the local QA folder `../tmp/qa/menu-botanic-kind-fyy-supreme/`: rendered text/source captures, POS pagination audit and category responses sanitized to menu fields, and source screenshots. Despite the scratch folder's earlier discovery name, Supreme Vege is **not** part of this packet and is being researched separately.

Data: [menu-botanict-kindbowl-foyouyuan.json](../../data/menu-research/menu-botanict-kindbowl-foyouyuan.json).
