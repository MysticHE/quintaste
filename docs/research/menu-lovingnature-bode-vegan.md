# Loving Nature, Bồ Đề and Veg-An menu collection

Checked **15 October 2026**. Raw packet: [menu-lovingnature-bode-vegan.json](../../data/menu-research/menu-lovingnature-bode-vegan.json).

This batch contains **47 source-specific food records**, including overlapping observations across channels/sources: **44 priced, 3 unpriced**, with **6 portion options** and **3 modifier groups**. The 19 sources cover three outlet identities and nine menu records: two source-covered, three partial, four unavailable. This completes the accessible-source pass for this batch; it does not complete the full 2,322-location inventory.

Only **32 Veg-An walk-in/delivery records** come from current readable merchant/linked ordering menus. **Five earlier Loving Nature records** and **ten Bồ Đề secondary/directory records** are held from current-menu/current-price claims. The same holds, source dates and missing channels are repeated in each branch's `gaps` and menu's `notice`/`currentUseHoldReason`.

## Per-location breakdown

| Location | Current prepared-food sources | Collected records | Remaining setup/data gap |
|---|---|---:|---|
| **Loving Nature Fortunate Coffee Cafe**, Blk 844 Sims Avenue #01-700, Singapore 400844 | Merchant Linktree links its New Menu 2026 and separate bread menu; both Canva designs remain unreadable under the published restriction | 5 earlier published food-price observations; **held** | Full current cafe and bread menus/prices unavailable. January–April 2026 feature predates the secondary report of a 25 September menu revamp/2 October reopening. Street address comes from that independent feature; current merchant Linktree does not independently restate it. |
| **Bồ Đề Vegetarian – Healthy Veggies Delights**, 16 Hamilton Road #01-05, Singapore 209186 | Linked group site and page sitemap contain no Bồ Đề concept/menu; directory-linked merchant Instagram fetch throttled | 6 dated community observations, plus 4 undated directory appetizer records; **all held** | Complete current primary menu and full category/options coverage unavailable. Directory postal 209180 conflicts with the independent 209186 address. Directory item provenance/date absent. Other group concepts and overseas similarly named restaurants excluded. |
| **Veg-An**, 11 Sam Leong Road, Trio Mall #04-03, Singapore 207903 | Live walk-in page and officially linked exact-outlet BlockChef delivery menu | **17 walk-in + 15 delivery** | Official-linked self-pickup application returns 404. Channels differ; current stock not verified. Seasonal ramen appears in delivery/announcement but not walk-in list, so no walk-in price/availability inferred. |

## Veg-An: all visible in-scope rows captured

The live walk-in page supplies 21 active rows: **17 prepared foods across Main (5), Grab-n-Go (3), Sides (8), Dessert (1)**, plus four beverage parent rows. All four beverages and their flavours are excluded. No inactive/draft records were present. Managed Chromium loaded the public page; only its ordinary page JSON responses were observed. No direct API requests were made.

All explicit size/flavour prices are retained: Small/Large for Otsumameat and Amazu Nuggets, and Organic Kagoshima Matcha/Classic Kinako for Warabimochi. The displayed parent number is preserved separately. The walk-in page gives bare numbers without an explicit currency code, so those prices use `unknown`; no delivery currency was transferred to them.

BlockChef's public HTML contains **19 source records**. **15 prepared foods** are retained; exclusions are three Miscellaneous payment rows and **Nagano White Miso Soup**, which the source describes as paste/kelp/fresh mushroom components requiring customer-added hot water. That reconstitution kit is outside this prepared-food batch. No payment rows are dishes.

Delivery prices explicitly use **SGD**. All three modifier groups are captured: optional Shichimi Spice Mix on Nagasaki Champon and O-Age Udon (+0.30), and required Sakurajima Kazan Ramen Spice choices **Level 0 (+0), Level 2 (+0.50), Level 3 (+0.50), Level 5 (+1)**. No missing spice levels or calculated final totals were invented. Edamame Tofu Nuggets retains the explicit five-piece portion; Japanese Stewed Pumpkins retains its source four-piece name.

The merchant announces Sakurajima Kazan Ramen's seasonal launch on **23 September 2026**, with no published end date. It announces ProTEGO Protein Bowl's launch on **29 July 2026**. These are launch dates, not guarantees of current stock. BlockChef's internal stock quantity zero has unclear meaning while the public menu displays ordering controls; it is not mapped to out-of-stock. The page's closed/next-collection state is scheduling information, not a permanent closure.

Merchant Allium/Non-Allium labels and the announcement's allium claim remain attributed source labels only. They do not become independently verified vegan/allium status, ingredients or app review flags. No beverage-inclusive bundles or descriptions were imported. The FAQ's delivery/self-pickup links establish channel linkage; no order, cart, checkout or message was submitted.

## Loving Nature: earlier feature held, current menus unavailable

Awaken **Issue 64, January–April 2026**, contains one exact-outlet food feature on PDF page 86 (printed page 84). Its cover and food page were visually inspected. All five named food-price observations were captured: Pesto Pizza 10.80, Bruschetta 9.80, Rendang with Turmeric Basmati Rice 7.30, Waffle with Double Scoop of Ice Cream 9.30, Vegan Carrot Cake 4.00. The source prints `$` without an explicit currency code; currency remains unknown.

The feature limits Bruschetta to weekends in even-numbered months, Rendang to the first week of each month, and vegan cakes to even-numbered months. These are **earlier source conditions**, not verified current schedules. They are preserved on the individual records. No food descriptions, review prose, ratings, photos or artwork were copied.

The live merchant Linktree labels a separate **LNFC New Menu 2026** and **Fortunate Bread Menu**. Both exact linked URLs are retained. Published Canva design restrictions were respected: no design, redirect destination, API, assets, alternate URLs or browser workaround were requested. The linked WhatsApp bread catalog is retained as an unopened contact/order link only; no message/order was sent.

A search-observed SingaporeMeal repost reports a **25 September 2026 menu revamp and 2 October reopening**. Its robots request returned 403, so no page fetch/retry/bypass followed. That secondary report is not presented as a live primary announcement. Together with the unreadable current menu, it requires an explicit hold on the earlier feature dishes/prices. An expired August anniversary discount was not imported. Similar-name Hong Kong/Indonesia menus and unsupported menu-SEO aggregations were excluded.

## Bồ Đề: secondary facts kept separate from current menu

The exact Hamilton Road listing is independently supported; primary branch/menu verification remains incomplete. The group site's nine-entry public page sitemap contains its other concepts and account/checkout pages, with no Bồ Đề page. Those other concepts' menus/products were not fetched or transferred. No restaurant closure is inferred from absence on that site.

HappyCow's dated independent on-site observations provide **six food records**: three food-price observations dated **14 May 2026**, a hotpot observation dated **22 May**, and two food names dated **30 April**. They are secondary observations with explicit current-price/availability holds. Menu diet claims and conflicting review claims were not converted into verification flags. The directory's account-creator label is not proof of merchant account ownership.

OneHungryHippo's allowed public detail page contains a separate four-row Appetizer menu component. Those four names/prices are retained as a **held directory menu**, with no publication date or item-origin field. Two overlap the dated independent observations; they are not counted as additional distinct dishes. Its incorrect/conflicting postal and mixed external-source context prevent merchant-confirmed status. No Google-derived reviews, gallery images, menu artwork, tags or map metadata were imported.

The directory links Instagram `bodevegetariangroup`; direct web fetch throttled, so no repeated requests or browser workaround followed. FindGlocal's robots returned 403 and Burpple publishes a GPTBot/AI-input restriction; their pages/photos/menus were not collected. Search-discovered category headings and restaurant blurbs do not establish full menu coverage. No missing food names, prices, sizes or category contents were fabricated.

## Checked sources and credibility

| URL | Publisher / evidence | Result and practical limit |
|---|---|---|
| [Merchant menu links](https://linktr.ee/lnfcsgmenu) | Loving Nature, primary | Readable menu/social links; not a full street-address/menu source |
| [LNFC New Menu 2026](https://canva.link/wngf5g3wd9j3n5r) | Merchant-linked Canva design | Exact link saved; design restriction respected, unreadable |
| [Fortunate Bread Menu](https://www.canva.com/design/DAElMNZPa2g/ndgW_WFu5A64qIeWbWfJTw/edit?utm_content=DAElMNZPa2g&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton) | Merchant-linked Canva design | Unreadable under published restriction |
| [Bread self-collection catalog](https://wa.me/c/6581238417) | Merchant-linked WhatsApp | Referenced only; not opened, no messages/orders |
| [Merchant Facebook](https://www.facebook.com/lnfcsg) | Merchant-linked primary social | Web fetch throttled; no retry/bypass |
| [Awaken Issue 64 PDF](https://kmspks.org/wp-content/blogs.dir/1/files/64-Awaken-Magazine-Online_compressed.pdf) | Independent publisher, on-site food feature | Readable; publication period and pages visually checked; five earlier facts held |
| [September reopening repost](https://www.singaporemeal.com/100680872330443/Loving-Nature-Fortunate-Coffee-Cafe) | Secondary repost | Search-observed only; robots 403 stopped access |
| [Lang Nuong Group](https://langnuonggroup.com/) | Directory-linked group website | Readable, no matching vegetarian concept/menu |
| [Group page sitemap](https://langnuonggroup.com/page-sitemap.xml) | Same group, primary page inventory | Readable nine entries; no Bồ Đề page |
| [Bồ Đề Instagram](https://www.instagram.com/bodevegetariangroup/) | Directory-linked merchant social | Web fetch throttled; not current primary menu evidence |
| [Bồ Đề HappyCow listing](https://www.happycow.net/reviews/bo-de-vegetarian-healthy-veggies-delights-central-singapore-503137) | Independent community on-site observations | Search-readable dated food facts; secondary, partial and held |
| [Bồ Đề OneHungryHippo menu](https://www.onehungryhippo.com/restaurants/b-vegetarian-healthy-veggies-delights) | Independent public directory menu | Four rows held: item provenance/date absent, postal conflict |
| [Bồ Đề FindGlocal repost](https://www.findglocal.com/SG/Kallang/111053797035434/B%E1%BB%93-%C4%90%E1%BB%81-Vegetarian) | Secondary address lead | Search-observed only; robots 403 stopped access |
| [Burpple discovery lead](https://burpple.com/f/DMufQgUT) | Independent community | Published crawler/input restriction; no page/menu imported |
| [Veg-An walk-in](https://www.veggie-an.com/walkin-menu) | Merchant, primary | 17/17 visible prepared foods and all six explicit portion options captured |
| [Veg-An announcements](https://www.veggie-an.com/announcements) | Merchant, primary | Launch dates retained; no invented expiry/stock guarantee |
| [Veg-An FAQ](https://www.veggie-an.com/faq) | Merchant, primary | Exact outlet and linked ordering channels confirmed |
| [Veg-An BlockChef](https://www.blockchef.com/store/veg-an/menu/) | Merchant-linked exact-outlet ordering | 15/15 in-scope foods, all three modifier groups; no API/checkout fetch |
| [Veg-An self-pickup](https://pos-veggieansg.replit.app/order?type=takeaway-later) | Merchant-linked application | GET and managed UI return 404; no pickup menu/prices |

Policy checks saved in scratch: `linktr.ee/robots.txt`, `www.canva.com/robots.txt`, `langnuonggroup.com/robots.txt`, `www.veggie-an.com/robots.txt` (SPA shell), `www.blockchef.com/robots.txt`, `kmspks.org/robots.txt`, `pos-veggieansg.replit.app/robots.txt` (404), `burpple.com/robots.txt`, `www.findglocal.com/robots.txt` (403), `www.singaporemeal.com/robots.txt` (403). Existing saved OneHungryHippo robots allows the public detail page while disallowing its APIs. No denied path was used as a collection route.

## Verification and reproducibility

Scratch: `../tmp/qa/menu-lovingnature-bode-vegan/`. `build-packet.py` normalizes allowed food fields into the packet atomically; `packet-counts.json` holds exact denominators. `validate-packet.py` checks ID uniqueness, source/branch/menu references, prices/currencies, excluded categories/kit/payment rows, copied-field exclusions, unavailable-menu emptiness and explicit holds. `validation.json` records the result. Scratch scripts also receive Python syntax checks.

Raw public HTML/observed ordinary page responses and the PDF remain scratch-only. No credential, billing, API allocation, app/canonical data or other agent's research was changed. No Google Maps/API request, CAPTCHA bypass, proxy, installed Chrome/profile, order or external message was used.
