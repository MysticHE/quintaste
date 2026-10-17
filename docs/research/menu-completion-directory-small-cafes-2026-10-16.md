# Small cafe menu completion supplement — 16 October 2026

Five merchant groups were inspected beyond homepages: Cookie Coffee food menu images and HTML; Jammy’s full public product feed, contact, FAQ and three bundle pages; Jaspat’s menu and culinary pages, empty product feed and three visually inspected hero images; MOD’s dedicated cafe page and linked PDF; Kind Kones current SG navigation collection feeds, shipping policy, landlord directory and individual food pages. This batch has 127 factual food/gallery rows and 65 proposed rows. It does not complete all app places.

Whole-venue eligibility was explicitly reviewed under the user's vegetarian/vegan-venues-only rule. Cookie is operator-classified vegetarian; Kind Kones operator-classified vegan; Jammy’s operator-classified vegan brand but old premises held; MOD operator-classified vegetarian with menu-source gap; Jaspat held because vegan product marketing alone does not sufficiently establish whole-venue scope. No mixed restaurant or its selected vegetarian dishes are proposed. Dairy is compatible with vegetarian classification; no whole-venue vegan claim is inferred for Cookie.

Cookie menus use `branch-dine-in`; Forum online/pickup uses `branch-ordering`; unverified Jammy’s online and Jaspat example catalogues use `brand-menu`. None are mislabelled dine-in solely because their online storefront has a custom domain.

The packet is `data/menu-research/menu-completion-directory-small-cafes-2026-10-16.json`. Kind Kones uses the existing `kind-kones-forum` canonical ID and `updatesExistingBranch: true`; parent will fold the new sources/menu/branch correction into the canonical packet and archive this supplement. Suntec and Westgate are source-gap updates only. No duplicated outlet publication or canonical edits were made here.

| Source menu | Stored facts | Coverage | Status |
|---|---:|---|---|
| Cookie Coffee — steamed/baked dim sum and snacks | 20 | source-covered | research-held |
| Cookie Coffee — vegetarian rice sets, food only | 16 | source-covered | research-held |
| Cookie Coffee — held ice-cream price series | 10 | partial | research-held |
| Jammy’s — held online frozen desserts | 23 | partial | research-held |
| Jaspat — held culinary example titles | 20 | partial | research-held |
| Kind Kones Forum — Singapore online pickup food | 38 | partial | research-held |

Cookie Coffee: visually inspected both complete food images. Twenty numbered dim-sum/snack rows include all printed piece counts and same-price baked-bun/nugget choices. Sixteen vegetarian rice-set foods are $9.90 nett each; $14.80 drink/ice-cream combos are excluded. Food names retain source spelling (including Cutterfish, Vineger and Sasame). All dollar currency codes remain unknown. Ten ice-cream HTML flavors have three unlabeled price levels; these are held, as is the dairy/vegan wording contradiction. Source images are local review evidence only, never app artwork. Main address #01-28B and footer #01-28 variation, plus next-door dim-sum wording, are explicit in publication review.

Jammy’s: FAQ states no physical shop and office collection at **10 Ubi Crescent #04-96B, Lobby E, Singapore408564**, Tue–Sat14:30–18:00 with contact before arrival. This conflicts with the old **57 Ubi Avenue1#08-13** directory premises, so no branch publication is proposed. All eligible online frozen-dessert product variants are retained. Granolas, packaged gummies/cookies, events, gift cards, nonfood and retail mixes excluded. Three party/mix bundle pages were inspected, with printed premium surcharges retained; script customizer validation remains incomplete. Tax/shipping wording says calculated at checkout. Medical claims are not certified or promoted.

Jaspat: exact flagship unit confirmed in current homepage and a 9August2026 photo banner. Our Menu explicitly describes suggested culinary applications, and New Culinary Creation supplies20 unpriced examples. Those20 names are held as gallery facts, not claimed current orderable items. Product feed is empty. Three homepage hero images were visually inspected; one is a past celebration and another a beverage advertisement, neither a priced food menu. No dietary therapy/health claim is certified or copied into app advice.

MOD: current dedicated cafe page confirms plant-based dining and1AKuoChuanAvenue. Its actual linked food PDF returned HTTP429. Requests were not retried or routed around the rate limit. Hair service prices are excluded. A readable food menu remains an explicit source gap.

Kind Kones: the generic product feed mixes SG and MY records. Current **SG navigation collection** endpoints isolate the Singapore product IDs, so no arbitrary same-name price is selected. Public storefront sets currency SGD/country SG; shipping policy separately identifies SG prices. Individual readable food pages show Forum pickup explicitly, supplying branch applicability. The [mall landlord directory](https://www.forumtheshoppingmall.com.sg/directory/) confirms #B1-27 & K1, agreeing with merchant location body; the contradictory footer #B1-17 is separately listed by landlord as an optician. Great World current/open wording still conflicts and is not proposed. Two product pages returned429; queued normal requests continued until review/termination, without retry or alternate-host circumvention. Those two products and the unattempted waffle-cone page are held. All six eligible deal/bundle rows are held pending choice/surcharge/content audit. Unavailable variant flags are retained and not promised as current stock. Whole-cake product lead time2–3working days overrides neither the generic24h policy nor generic pickup-ready-in1h text: conflict is explicit. Singapore shipping cutoff15:00/16:00 also conflicts and is not normalized.

Seven source-unavailable variant facts (five pints, one cup and one topper) are stored in `unavailablePriceVariants`. They are excluded from proposed displayed `priceVariants` and starting-price calculation. Banana Pecan therefore starts at the available473ml pint price SGD18.50, rather than the unavailable118ml cup price SGD8.80. Catalogue flags are a fetch-time signal, not a future-stock promise.

## Selected-place outcomes

| Merchant/branch | Identity outcome | Specific remaining requirements |
|---|---|---|
| Cookie Coffee Cafe Bar | merchant-address-with-unit-variation | Merchant main body gives #01-28B; footer uses #01-28. The dim-sum page says next door. Both food images are explicitly merchant linked under the same cafe; the exact subdivision is not independently resolved. HTML house-vegan-ice-cream section and dairy Ben & Jerry’s homepage wording differ. Ice cream source prices have no portion labels. Separate delivery-platform and hot-pot menus remain outside checked-source coverage. No effective dates, stock or tax wording for dim sum is printed. |
| Jammy’s — directory premises unverified | hold-current-address-differs | FAQ explicitly says no physical shop and provides office self-collection at 10 Ubi Crescent #04-96B, Lobby E, Singapore 408564, Tuesday–Saturday 14:30–18:00, contact before arrival. Do not attach current online products to the old 57 Ubi Avenue directory place. Some mix-and-match customizers are script-rendered and were not fully audited. |
| Jaspat International — U-Turn Point F&B | merchant-confirmed | Flagship address confirmed. Our Menu is explicitly a suggested culinary applications gallery, not a priced branch menu. Twenty New Culinary Creation titles are unpriced examples; current branch portions/options/availability not established. Product feed is empty. Three hero images visually inspected; no food menu prices there. |
| MOD Cafe | merchant-confirmed | Dedicated plant-based cafe page confirms address and links its menu PDF. Normal public PDF request returned HTTP429; no retry or alternate-host workaround. Homepage service menu is hair services and excluded. Food names/portions/prices/options remain unavailable until readable primary menu can be obtained. |
| Kind Kones — Forum Shopping Mall | merchant-and-landlord-confirmed | Landlord confirms #B1-27 & K1 and merchant location body gives #B1-27. Merchant footer #B1-17 is retained as contradictory older wording; landlord separately lists an optician at #B1-17. This updates the existing canonical branch; no new duplicate outlet is intended. Source individual product pages explicitly identify Forum pickup. Suntec/Westgate product applicability is not inferred. Two product requests returned429; no retries. Remaining queued normal requests were terminated after output review. Waffle Kone individual page unattempted. Bundle option app requires further review. |

## Publication proposals for parent review

No automatic publication occurred. Preserve all exclusions and existing publications. Review the Cookie unit variation; Kind is a canonical branch update, not a new outlet.

```json
[
  {
    "dataset": "data/menu-research/menu-completion-directory-small-cafes-2026-10-16.json",
    "branchId": "cookie-coffee-fortune-centre",
    "menuIds": [
      "cookie-fortune-dimsum-20261016",
      "cookie-fortune-rice-20261016"
    ],
    "excludedItemIds": [],
    "reason": "Operator classifies whole venue vegetarian. Reviewed all20 dim-sum/snack image rows and16 food-only rice sets from explicitly merchant-linked images as branch-dine-in source. Includes portions and two choice groups. Dollar currency code unknown; rice prices nett, dim-sum tax unstated. Unit body/footer #01-28B/#01-28 variation and next-door wording retained for root review. Ice cream, drinks and drink bundles excluded.",
    "sourceUrls": [
      "https://cookiecoffee.com.sg/",
      "https://cookiecoffee.com.sg/blank/",
      "https://cookiecoffee.com.sg/__static/jdj5jdewjejym1jym3fwyvh4s0mzsljp/Dim-Sum-Menu-Temp-Lower-Res(8).jpg",
      "https://cookiecoffee.com.sg/signaturericeset/",
      "https://cookiecoffee.com.sg/__static/jdj5jdewjhpnrefnykouytdamfvwthhz/Rice-Menu-Final-A3-Revised(2).jpg"
    ]
  },
  {
    "dataset": "data/menu-research/menu-completion-directory-small-cafes-2026-10-16.json",
    "branchId": "kind-kones-forum",
    "updatesExistingBranch": true,
    "menuIds": [
      "kind-forum-sg-online-food-20261016"
    ],
    "excludedItemIds": [
      "kind-sg-online-food-7763654607086",
      "kind-sg-online-food-8015519088878",
      "kind-sg-online-food-8015521415406",
      "kind-sg-online-food-8015521743086",
      "kind-sg-online-food-7763654115566",
      "kind-sg-online-food-7763654508782",
      "kind-sg-online-food-7763653198062",
      "kind-sg-online-food-7763654803694",
      "kind-sg-online-food-7763653296366"
    ],
    "reason": "Operator brands whole business vegan. Update existing Forum canonical branch only with branch-ordering menu. Landlord and merchant location body confirm #B1-27; checked individual standalone products explicitly offer Forum pickup. Singapore navigation collection separates SGD food variants from mixed-MY feed. Exclude all bundle/deal rows and rows without readable individual Forum pickup evidence. Source-unavailable variants are stored separately, excluded from priceVariants and starting-price calculation. Preserve product lead-time and availability qualifiers.",
    "sourceUrls": [
      "https://www.forumtheshoppingmall.com.sg/directory/",
      "https://kindkones.com/pages/about-us",
      "https://kindkones.com/collections/all-products/products.json?limit=250",
      "https://kindkones.com/products/blue-planet-1"
    ]
  }
]
```

## Sources

All check times are retrieval dates; effective dates/current stock remain unstated unless specifically qualified.

| Source | Result | Checked UTC | Credibility/note |
|---|---|---|---|
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/__static/jdj5jdewjejym1jym3fwyvh4s0mzsljp/Dim-Sum-Menu-Temp-Lower-Res(8).jpg) | HTTP200 | 2026-10-16T00:26:55.660969+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/__static/jdj5jdewjhpnrefnykouytdamfvwthhz/Rice-Menu-Final-A3-Revised(2).jpg) | HTTP200 | 2026-10-16T00:26:55.661784+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/blank/) | HTTP200 | 2026-10-16T00:26:28.202407+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/) | HTTP200 | 2026-10-16T00:25:58.418414+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/pickup-and-delivery/) | HTTP200 | 2026-10-16T00:26:28.204733+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/menu/) | HTTP200 | 2026-10-16T00:25:58.420368+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/__static/jdj5jdewjemuae5kwe03nehprtvzuk9z/WhatsApp-Image-2025-08-15-at-19-33-59(3)) | HTTP200 | 2026-10-16T00:26:55.660014+00:00 | Primary source, raw evidence retained |
| [cookiecoffee.com.sg](https://cookiecoffee.com.sg/signaturericeset/) | HTTP200 | 2026-10-16T00:26:28.203990+00:00 | Primary source, raw evidence retained |
| [www.forumtheshoppingmall.com.sg](https://www.forumtheshoppingmall.com.sg/directory/) | HTTP200 | 2026-10-16T00:27:17.000229+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/products/gelato-party-set) | HTTP200 | 2026-10-16T00:26:56.586665+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/products/gelato-popsicles-party-set) | HTTP200 | 2026-10-16T00:26:56.370405+00:00 | Primary source, raw evidence retained |
| [www.jammys.sg](https://www.jammys.sg/) | HTTP200 | 2026-10-16T00:25:58.421211+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/pages/contact) | HTTP200 | 2026-10-16T00:26:28.205333+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/pages/faqs) | HTTP200 | 2026-10-16T00:26:28.583228+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/products/3-gelato-pints-mix-match-bundle) | HTTP200 | 2026-10-16T00:26:56.892238+00:00 | Primary source, raw evidence retained |
| [jammys.sg](https://jammys.sg/products.json?limit=250) | HTTP200 | 2026-10-16T00:25:58.421928+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/) | HTTP200 | 2026-10-16T00:25:59.518598+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:29.485207+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/pages/new-culinary-creation) | HTTP200 | 2026-10-16T00:26:28.594490+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/cdn/shop/files/National_day_CeleBRATION_2.png?v=1786873457&width=3840) | HTTP200 | 2026-10-16T00:29:12.281573+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/pages/our-menu) | HTTP200 | 2026-10-16T00:25:59.544839+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/cdn/shop/files/National_day_CeleBRATION.png?v=1786869547&width=3840) | HTTP200 | 2026-10-16T00:29:12.283383+00:00 | Primary source, raw evidence retained |
| [www.jaspatintl.com](https://www.jaspatintl.com/cdn/shop/files/National_day_CeleBRATION_1.png?v=1789304627&width=3840) | HTTP200 | 2026-10-16T00:29:12.284540+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/mocha-almond-energy-ball) | HTTP200 | 2026-10-16T00:29:40.127535+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/keto-coconut) | HTTP200 | 2026-10-16T00:29:36.009140+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/chocolate-hazelnut-energy-balls) | HTTP200 | 2026-10-16T00:29:32.990941+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/3-pint-saver) | HTTP200 | 2026-10-16T00:29:27.658804+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/oh-just-surprise-me-5-cups-4-pints) | HTTP200 | 2026-10-16T00:29:41.091622+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/salted-chocolate-chip) | HTTP200 | 2026-10-16T00:29:44.319345+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/almond-brittle-fudge) | HTTP200 | 2026-10-16T00:29:28.938123+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/mint-chocolate-chip) | HTTP200 | 2026-10-16T00:29:39.233735+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/creamy-passionfruit) | HTTP200 | 2026-10-16T00:29:34.018778+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/collections/kind-bundles/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:56.317416+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/collections/energy-balls/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:56.053942+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/be-kind-stay-safe-bundle) | HTTP200 | 2026-10-16T00:29:29.937148+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/blue-planet-1) | HTTP200 | 2026-10-16T00:29:31.917787+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/citrus-orange-chocolate-cupcake) | HTTP200 | 2026-10-16T00:29:39.044395+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/collections/all-products/products.json?limit=250) | HTTP200 | 2026-10-16T00:27:17.001468+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:00.830106+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/double-chocolate-brownie) | HTTP200 | 2026-10-16T00:29:34.019381+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/oatmeal-almond-crisp-cookie) | HTTP200 | 2026-10-16T00:29:40.296758+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/banana-pecan) | HTTP200 | 2026-10-16T00:29:29.780755+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/flourless-sweet-potato-brownie-whole-cake) | retrieval-gap | 2026-10-16T00:29:28.705244+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/madagascan-vanilla-bean) | retrieval-gap | 2026-10-16T00:29:38.047042+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/2-for-the-gram-2-pints) | HTTP200 | 2026-10-16T00:29:26.584274+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/pages/contact) | HTTP200 | 2026-10-16T00:26:29.549106+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/kind-kones-favorites-6-cups) | HTTP200 | 2026-10-16T00:29:37.041789+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/birthday-cake-energy-balls) | HTTP200 | 2026-10-16T00:29:30.892704+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/pages/about-us) | HTTP200 | 2026-10-16T00:26:29.804969+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/peanut-butter-cinnamon-roll-energy-ball) | HTTP200 | 2026-10-16T00:29:42.215470+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/pink-lemonade) | HTTP200 | 2026-10-16T00:29:43.246456+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/pandan-gula-melaka) | HTTP200 | 2026-10-16T00:29:41.242179+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/policies/shipping-policy) | HTTP200 | 2026-10-16T00:26:56.331412+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/chocolate-sorbet) | HTTP200 | 2026-10-16T00:29:32.991899+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/4-pint-saver) | HTTP200 | 2026-10-16T00:29:27.659338+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/black-forest) | HTTP200 | 2026-10-16T00:29:30.893654+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/vegan-gluten-free-dark-chocolate-ganache-whole-cake) | HTTP200 | 2026-10-16T00:29:28.704148+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/hazelnut-chocolate-1) | HTTP200 | 2026-10-16T00:29:35.009601+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/macadamia-cranberry-white-chocolate-energy-ball) | HTTP200 | 2026-10-16T00:29:37.042416+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/2-pint-saver) | HTTP200 | 2026-10-16T00:29:26.585773+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/keto-chocolate-sorbet) | HTTP200 | 2026-10-16T00:29:36.008372+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/midnight-classique-chocolate-cupcake) | HTTP200 | 2026-10-16T00:29:38.242285+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/saffron-pistachio) | HTTP200 | 2026-10-16T00:29:43.247384+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/watermelon-strawberry-mint-sorbet) | HTTP200 | 2026-10-16T00:29:44.319987+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/charcoal-vanilla-1) | HTTP200 | 2026-10-16T00:29:31.918649+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/) | HTTP200 | 2026-10-16T00:26:00.730167+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/collections/ice-cream-flavours/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:56.016191+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/collections/cakes-bakes/products.json?limit=250) | HTTP200 | 2026-10-16T00:26:56.025819+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/flourless-sweet-potato-brownie) | HTTP200 | 2026-10-16T00:29:35.009024+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/mango-raspberry-swirl) | HTTP200 | 2026-10-16T00:29:38.047747+00:00 | Primary source, raw evidence retained |
| [kindkones.com](https://kindkones.com/products/peanut-butter-jelly-1) | HTTP200 | 2026-10-16T00:29:42.214189+00:00 | Primary source, raw evidence retained |
| [www.modhaircafe.com](https://www.modhaircafe.com/_files/ugd/35dacc_db8b46ebb7a04ca4b0223b8ab1428a0e.pdf) | retrieval-gap | 2026-10-16T00:26:55.662803+00:00 | Primary source, raw evidence retained |
| [www.modhaircafe.com](http://www.modhaircafe.com/) | HTTP200 | 2026-10-16T00:25:59.861644+00:00 | Primary source, raw evidence retained |
| [www.modhaircafe.com](https://www.modhaircafe.com/mod-cafe) | HTTP200 | 2026-10-16T00:26:28.593927+00:00 | Primary source, raw evidence retained |

## Verification/storage

passed JSON round-trip, unique IDs, references and prices. SHA256 `f1f3565489d37090563fbda1ea06c2a9f5d6888c280db671fc40a2ac8f95ed41`. Packet 198,211bytes, gzip 13,697bytes. Evidence/validation/proposals are under `C:/Users/huien/qt/tmp/qa/menu-completion-directory/small-cafes/`. No Google APIs, app edits, merchant messages, orders or checkout actions were performed. No app lag benchmark is claimed; raw evidence is not an app payload.
