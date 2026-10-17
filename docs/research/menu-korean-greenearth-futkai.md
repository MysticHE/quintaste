# Korean restaurants, Green On Earth and New Fut Kai menu collection

Checked **15 October 2026**. Data: [`menu-korean-greenearth-futkai.json`](../../data/menu-research/menu-korean-greenearth-futkai.json). This batch advances the wider 2,322-place collection; it is **raw menu research, not merchant/community review or completion of the full directory**.

The packet has **35 source records, four exact outlet records, 12 source menus and 445 source-specific food records**. It preserves **377 base prices, 68 unpriced showcase foods, 387 explicit price/portion options and 29 modifier groups**. Multiple menu versions repeat dishes, so these counts are not unique dishes. Four source menus are covered, seven are partial and one is unavailable after its expired uncooked meal kit was excluded. `source-covered` describes collection of that published source, not live stock, current operation, effective dates or dietary certification.

## Per-location breakdown

| Outlet | Evidence collected | Remaining gaps |
|---|---|---|
| **The Boneless Kitchen**, 1 Irving Place #01-31, The Commerze @ Irving, Singapore **369546** | Official identity; **55 Oddle food records** with options; **38 unpriced official showcase names**; FnBees **57 main foods + one lunch food** with separate channel prices | Oddle has one nonzero source item status. Four remaining same-name listing contexts differ in source description/options; they remain separate evidence. The public FnBees export references **12 modifier groups** without definitions and one missing product ID. Its reader shell stayed loading with Google domains blocked; this does not establish a customer-facing outage. The historical menu explicitly ended February 2025 and contains only an uncooked meal kit, excluded from prepared dishes. |
| **Daehwa Vegetarian Restaurant**, 1 Fusionopolis Place #01-35, Galaxis, Singapore **138522** | Official identity; **29 Oddle food records**, all published variants/modifiers; **30 unpriced official showcase names** | Merchant website gives postal **138522**, while its linked ordering store gives **138632** for the same street/unit. The conflict is retained without substituting Google-derived address data. Showcase has no visible prices. |
| **Green On Earth**, **386 Upper Bukit Timah Road**, The Rail Mall, Singapore **678043** | Merchant-controlled ordering address; **79 food records**, all published size variants, Mala spice/add-on options and two sauce-selection groups | Seven retained food rows have nonzero source item status, retained without inventing the meaning of the code or current availability. No unit is published in this ordering store. Older Phoenix Road premises are not assigned this menu. |
| **New Fut Kai**, **282 Jalan Besar #01-00**, Singapore **208945** | Official identity; **88 Oddle food records** with all variants; **60 foods across 18 main menu images**; **six Taiwan promotion foods**; **two weekday 2026 lunch foods** | Twenty-two weekday ordering rows have nonzero item/category status codes. The linked main images use 2024 filenames without a guaranteed effective date. Most slash-separated image prices have no size labels, so all amounts are preserved as unlabelled options. Time-limited offers lack an expiry date. |

The Korean sites also identify the distinct **Merle & Co** cafe at **1 Lentor Central #01-36, Singapore 788887**. This is a later collection lead; no Korean menu or prices were assigned to that cafe.

## Source denominators and exclusions

| Source | Original scope | Retained food records | Exclusions / treatment |
|---|---:|---:|---|
| Boneless Oddle | 70 category product rows across six categories | **55** | 13 beverages; one standalone seaweed-flake garnish retained as an unscoped add-on; one fully equivalent repeated card collapsed with its alternate source product ID preserved. Other same-name contexts have different source descriptions/options and are retained. |
| Daehwa Oddle | 37 products across three categories | **29** | Eight beverages. Every published food modifier group and option is retained. |
| Green On Earth Oddle | 94 products across 15 categories | **79** | Ten beverages; one bento explicitly including a packet drink per set; four zero-price standalone sauce cards. The sauces are retained under Double Taste Fish's actual modifier groups. No drink was stripped from the bento to invent a food-only price. |
| New Fut Kai Oddle | 88 products across 19 categories | **88** | All listed products are food in this source. Includes two food-only delivery bundles, a delivery celebration set and 22 explicitly flagged weekday rows. No dine-in complimentary tea was copied into the delivery set scope. |
| Boneless public FnBees export | 108 item records, three published menus, 15 groups | **58** | 36 beverages, one voucher, 11 add-on/component records, one zero-price promotion and one expired uncooked meal kit excluded from standalone prepared foods. Add-on channel prices remain in `unscopedAddOns`; free-offer eligibility is unresolved. **57 main + one lunch** in separate source menus. The empty historical menu retains source dates and the exclusion reason. |
| Boneless official showcase | 39 image/content blocks | **38** | One cauliflower block has descriptive text but no explicit dish title; no name is invented from its photo. Its ordering source independently names a cauliflower dish. |
| Daehwa official showcase | 28 image/content blocks | **30** | Shared blocks name two distinct hotpots and two distinct kimbaps. Separate foods are retained, rather than inventing combined meals. |
| New Fut Kai main menu page | 21 linked menu images | **60 across 18 food images** | One beverage image; a weekday-lunch bundle including Chinese tea; a dine-in celebration set including complimentary Chinese tea. Food-only prices were not invented from those bundles. |
| New Fut Kai homepage promotions | Three linked promotion images | **Eight across two images** | Six Taiwan foods, including Frozen Milk Blossom dessert, and two weekday lunch foods. “Makan at Sea” is an off-site boat-charter buffet with drinks and is excluded. |

Prepared desserts, cooked sides, plain cooked rice and prepared party packs are included. Drinks, beverage-inclusive bundles, uncooked meal kits, vouchers, raw egg, standalone ingredient/garnish add-ons and off-site activity bundles are not promoted as individual dishes. The expired 2025 source menu has no retained food items.

### Prices, options and source flags

- All four Oddle pages declare `currencyCode: SGD`. Every food size/flavour variant and every nested modifier option in their public page data was preserved. No private checkout or `/api/` route was requested.
- Green On Earth's Mala includes all three size prices, five spice levels and its complete published add-on list. Double Taste Fish retains the two required sauce groups and all choices; no zero-price sauce is presented as a standalone restaurant dish.
- Option minimum/maximum selection quantities and source status/preselection fields remain factual source values. Some `priceUnderMinimumSelection` amounts differ from `price`; both are preserved with their original labels. Their pricing semantics remain unverified, and no total is calculated from them.
- Nonzero Oddle status codes are retained on **30 food records**: one Boneless, seven Green On Earth and 22 New Fut Kai. Their meaning is not guessed and current stock is unconfirmed. The affected ordering menu coverage remains partial.
- The Boneless FnBees file was received during the merchant's linked public pickup page load. It includes separate `dine-in`, `dine-in-buzz`, `takeaway`, `takeaway-buzz` and three opaque delivery-channel prices. The base research price uses the exact `takeaway-buzz` channel and every other published channel remains labelled; opaque delivery IDs are not guessed to mean a named platform.
- FnBees uses a country price bucket `SG` without declaring an ISO currency code, so its prices remain currency **unknown**. Its `inc_tax: false` setting is preserved without guessing a tax rate or final total. Staff/editor IDs, merchant account metadata, draft objects, ratings, images and descriptions were not imported.
- The FnBees **Lunar New Year 2025** source explicitly ran **13 January–12 February 2025**. Its sole preorder set has ingredients packed uncooked, so it is excluded from prepared-dish scope. The empty historical menu preserves those dates and the reason. Main and Lunch are separate menus; lunch time is preserved as **11:00–15:30** with the source's numeric day codes, without inventing their mapping.
- New Fut Kai's main images print multiple amounts such as `29 / 44`, `15 / 28` and `8 / 15 / 22` without adjacent size labels. All amounts remain `Printed price option 1/2/3`; Oddle's Small/Medium/Large labels are not copied onto a different price source.
- The stir-fry vegetables image lists Nai Bai, Spinach, Kailan, Broccoli and Xiao Bai Cai, plus Shredded Ginger/Veg Oyster Sauce styles. These choices are preserved without invented surcharges or selection limits.
- The Taiwan offer states prices are subject to GST and gives no end date. The newer weekday offer applies **Monday–Friday, 11:00–14:30, excluding public holidays**, and prints **$8.50++**. No charge rate, expiry date or total is invented. Image `$`/plain-number prices remain currency **unknown**.
- Source “Vegan” words appearing in dish/option names remain part of those names. No vegan/allium status, ingredient certification, Google identity or live availability is inferred. Merchant marketing claims are not substituted for the app's review criteria.

## Source table

Credibility **5/5** means direct merchant-controlled publication; it does not guarantee freshness. FnBees data has strong merchant linkage but incomplete reader/option coverage.

| Source | URL / access result | Credibility |
|---|---|---|
| Boneless official home and address | https://thebonelesskitchen.com/ | 5/5; readable 200, requested `www` redirects here. |
| Boneless showcase | https://thebonelesskitchen.com/menu/ | 5/5; readable, no visible prices. |
| Boneless official ordering links | https://thebonelesskitchen.com/delivery/ | 5/5; links Oddle and FnBees pickup. |
| Boneless Oddle | https://thebonelesskitchen.oddle.me/en_SG | 5/5; embedded complete product/option data. |
| Boneless pickup redirect | https://goto.fnbees.com/J06loWGcR7CTV5UB021kWQ | Official-linked 302 to its exact restaurant pickup page; no order action taken. |
| Boneless pickup page | https://buzz.fnbees.com/sg/en-US/restaurant/the-boneless-kitchen-qr/brbtZZvqP5ipULZMcIU6/takeaway/y6i3PVolWLRkNVdLkps6/3LyMaYUoYja96DFi0ouY | Reader shell remained loading with Google domains blocked. This is a research limitation, not a customer-outage claim. |
| Boneless public menu export | https://cdn-prod.fnbees.com/fnbees/outlet/brbtZZvqP5ipULZMcIU6/menu/menu.json | Public 200 response observed from that page; 108 item records. Draft objects ignored and not imported. |
| Daehwa official identity | https://daehwavegetarian.com/ | 5/5; exact outlet address and sister concepts. |
| Daehwa working menu URL | https://daehwavegetarian.com/711-2/ | 5/5; readable, unpriced showcase. |
| Daehwa stale homepage menu alias | https://daehwavegetarian.com/menu/ | 404. Working navigation URL above used instead. |
| Daehwa ordering links | https://daehwavegetarian.com/orderhere/ | 5/5; links its exact Oddle store. |
| Daehwa Oddle | https://daehwa.oddle.me/en_SG | 5/5; address postal conflict is retained. |
| Green On Earth merchant ordering | https://greenonearth.oddle.me/en_SG | 5/5; one Rail Mall store and full menu/option data. |
| New Fut Kai home / latest promotions | https://www.newfutkai.com.sg/ | 5/5; current source of the three linked promo images. |
| New Fut Kai contacts | https://www.newfutkai.com.sg/contact/ | 5/5; street address confirmed. |
| New Fut Kai menu page | https://www.newfutkai.com.sg/menu/ | 5/5; all 21 linked images inspected. |
| New Fut Kai Oddle | https://newfutkaivegetarian.oddle.me/en_SG | 5/5; all 19 categories and all food variants inspected. |

All individual food-image URLs appear in JSON source records, with `linkedFrom` identifying their exact merchant page. The image paths read were:

- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-4.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-5.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-6.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-7.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-8.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-11.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-12.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-13.webp`
- `https://www.newfutkai.com.sg/storage/2024/08/Mushrooms_2024.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-15.webp`
- `https://www.newfutkai.com.sg/storage/2024/08/Crispy2024.webp`
- `https://www.newfutkai.com.sg/storage/2024/08/FragrantB_2024.webp`
- `https://www.newfutkai.com.sg/storage/2024/08/fragrantC_2024-scaled.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-17.webp`
- `https://www.newfutkai.com.sg/storage/2024/04/NFK-Menu-2024-Pg-18b.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-19.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-20.webp`
- `https://www.newfutkai.com.sg/storage/2024/01/NFK-Menu-2024-Pg-21.webp`
- `https://www.newfutkai.com.sg/storage/2026/08/taste_of_taiwan_2026.webp`
- `https://www.newfutkai.com.sg/storage/2026/09/lunchtime_offer_2026_vegetarian.webp`

Excluded but inspected images:

- `https://www.newfutkai.com.sg/storage/2024/08/Weekday-Lunch-v3-2024.webp` — free Chinese tea included.
- `https://www.newfutkai.com.sg/storage/2024/08/Beverages2024.webp` — drinks.
- `https://www.newfutkai.com.sg/storage/2024/01/Premium-Celebrations-Set-2024-210-%C3%97-297-mm.webp` — complimentary Chinese tea for dine-in.
- `https://www.newfutkai.com.sg/storage/2025/07/makan_at_sea2025.webp` — boat charter and buffet with drinks.

## Access and verification

Robots were checked for `www.thebonelesskitchen.com`, `daehwavegetarian.com`, `greenonearth.oddle.me`, `www.newfutkai.com.sg`, `thebonelesskitchen.oddle.me`, `daehwa.oddle.me` and `newfutkaivegetarian.oddle.me` at each host's `/robots.txt`. Public WordPress pages were permitted; administrative pages were not used. Oddle's `/api/`, user, checkout and order routes were not requested; the menu/option data came from its public HTML's embedded render payload. FnBees `/robots.txt` returned the app shell, not crawler rules. Its public pickup page was read without signing in, ordering, adding to cart or using payment routes.

No Foodpanda/Grab requests were attempted in this batch after their prior access denials. No Google Maps URL, Google API, CAPTCHA workaround, alternate domain or proxy was used. Browser work used the task's own managed headless Chromium, with Google domains blocked; installed Chrome and user profiles were not used.

Scratch evidence is in `C:/Users/huien/QT/tmp/qa/menu-korean-greenearth-futkai/`, including original public HTML, whitelisted food facts, 24 original merchant images, contact sheets and `validation.json`. The JSON checkpoint is written atomically and is **518 compact lines**.

Validation found **zero duplicate IDs, missing source/menu/branch references, invalid prices, unwanted beverage categories, copied description fields or inferred review/dietary/photo fields**. All four Oddle menus were cross-checked against exact original food IDs, base prices, variant counts, modifier counts and option names/prices. All 58 retained FnBees food names and every channel price match the public export. Every named showcase food was found in its exact merchant page. All 18 retained main food images and both retained promotion images were visually inspected, including every printed price value; no size was guessed from a price position.

Remaining production work: review nonzero status rows, resolve Daehwa's postal conflict, obtain the missing FnBees modifier definitions and unprovided product reference if merchant access permits, confirm dates/charges for image offers, and keep the expired 2025 menu out of current listings. Continue collecting the next uncovered inventory set; these four outlets do not close the directory-wide task.
