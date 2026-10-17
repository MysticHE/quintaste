# Zi Zai group and Daily Green menu collection

Checked on 15 October 2026. This research covers **20 named branches**: the 12 non-D’Life outlets on the Zi Zai group’s published ordering directory and the eight current Daily Green addresses. D’Life is owned by a separate collection task.

The packet contains **1,471 source-specific food rows**, including **1,401 Getz branch product records**, six unpriced group recommendation names and 64 Daily Green snapshot/gallery rows. These are not 1,471 unique, currently orderable dishes. The same dish can occur in different branches, breakfast versus regular menus, languages or source snapshots. Four Daily Green rows are reused from the existing pilot; six Daily Green gallery names have no exact-outlet applicability.

Of the 20 branch records, **6 have all accessible published source products collected without the specific unresolved conflicts below**, **9 remain partial**, and **5 have no readable current exact-branch menu**. “Source covered” means the accessible published catalogue was collected; it is not a claim that every physical counter dish, seasonal special, ingredient or current stock state is known.

## Branch breakdown

| Branch | Official address | Food rows | Coverage and specific gap |
|---|---|---:|---|
| Zi Zai Vegetarian — Jalan Mas Puteh | 9 Jalan Mas Puteh, Singapore 128615 | 167 | Source covered. All 14 food categories, including breakfast and regular-menu products; two beverage categories excluded. |
| Zi Zai Vegetarian — Yishun | Blk 236 Yishun Ring Road #01-1000, Singapore 760236 | 153 | Partial. All exposed food products and options collected; Carrot Cake has a tile/detail price conflict, so its canonical price is withheld. |
| Zi Zai Vegetarian — Tampines | 801 Tampines Ave 4 #01-281, Singapore 520801 | 144 | Source covered. All exposed food categories and product options collected; drinks excluded. |
| Zi Zai Vegetarian — Bendemeer | 23 Bendemeer Road #01-523, Singapore 330023 | 169 | Source covered. All exposed food categories and product options collected. Homemade drinks, beverages, canned drinks and jelly drinks excluded. |
| Zi Zai Vegetarian — Bishan | Blk 150 #01-133 Bishan Street 11, Singapore 570150 | 0 | Current exact-branch menu unavailable. Legacy group page lists Bishan, but live pickup selector has only four other outlets. A community closure report dates to September 2022; current operation needs merchant confirmation. No other outlet’s menu is copied here. |
| Divine Realm Vegetarian | 501 Hougang Avenue 8 #01-630, Singapore 530501 | 151 | Partial. All 14 exposed food categories, including breakfast, dim sum and daily claypot soup. Mee Rebus and Nasi Lemak have conflicting English and Chinese weekday schedules. |
| Divine Vegetarian Family Restaurant | Blk 356 #01-803 Hougang Ave 7, Singapore 530356 | 162 | Source covered. All 14 exposed food categories; honey concoctions and beverages excluded. |
| Greenland Vegetarian | 789 & 791 Upper Serangoon Road, Singapore 534659 | 123 | Partial. All exposed food products/options collected, excluding five course bundles that explicitly include tea. Butter Sauce Hericium has a tile/detail price conflict and no canonical price. |
| Time’s Vege | 643 Bukit Batok Central #01-44, Singapore 650643 | 161 | Source covered. All 13 exposed food categories, including eight double-boiled soups and food add-ons. |
| Zhen Yi Vegetarian | 128 Ang Mo Kio Ave 3 #01-1853, Singapore 560128 | 152 | Source covered. All exposed food categories and portions. Optional discounted drinks are omitted from the two prepared-food promotion sets. |
| True Veggie | 47 Lorong 27 Geylang, Singapore 388179 | 19 | Partial. Only prata products are exposed. Other breakfast/lunch/dinner category names appear without readable product rows. Current Thursday evening and next-day Friday noon pickup selections both expose only prata/drinks. Three separate unpriced brand recommendation names are retained without exact-outlet applicability. |
| Veganbliss | 229 Joo Chiat Road #01-01, Singapore 427489 | 0 | Current exact-branch menu unavailable. Official ordering destination loops to `/Home/NotAvailable`; directory-linked Facebook page is blocked and ownership could not be checked. Older indexed products are not imported as a current menu. Three unpriced group recommendation names remain separate brand context. |
| Daily Green — Hougang Mall | 90 Hougang Ave 10 #04-11, Singapore 538766 | 27 snapshot rows | Partial. Chinese delivery snapshot exposes 26 products; English snapshot exposes one. The English product overlaps the Chinese listing, so these are not 27 unique dishes. Snapshots are kept separate. Direct access requires human verification. |
| Daily Green — Bedok | 217 Bedok North Street 1 #01-77, Singapore 460217 | 11 | Partial. All 11 products in the readable English delivery snapshot collected. Current full menu, prices and promotions remain unconfirmed because direct access is blocked. |
| Daily Green — Ang Mo Kio | 721 Ang Mo Kio Avenue 8 #01-2823, Singapore 560721 | 6 prior product labels | Partial. Current delivery listing has no menu rows. Platform product links expose six prior names, all marked not available, with no current price. Review prose is excluded. Official unit #01-2823 is retained despite a community directory’s #01-2811. |
| Daily Green — 25A Geylang | 56/58 Lorong 25A Geylang, Singapore 388248 | 10 prior product labels | Partial. Current delivery listing has no menu rows. Ten prior platform product names are exposed; seven have displayed prices and three are explicitly not available. These are not treated as a current complete menu. Official postal code takes precedence over community directory variants. |
| Daily Green — Ubi | 3014B Ubi Road 1, Singapore 408722 | 0 | Current exact-branch menu unavailable. Official menu folder is empty and public social sources cannot supply readable current dishes. The historical brand menu is not assigned here. |
| Daily Green — Woodlands Street 31 | 306 Woodlands Street 31, Singapore 730306 | 4 existing pilot rows | Partial. Reuses the pilot’s exact-branch delivery snapshot: four Hotplate products only. These are not newly discovered dishes. Historical 79-row brand PDF remains separate. |
| Daily Green — Shaw Plaza | 360 Balestier Road #01-23, Singapore 329783 | 0 | Current exact-branch menu unavailable. Official address and a delivery-directory listing exist, but a readable current dish menu was not obtained. A review-mentioned dish is not promoted into merchant menu data. |
| Daily Green — NTU South Spine Canteen B | 50 Nanyang Avenue, Singapore 639798 | 0 | Current exact-branch menu unavailable. Official address and Grab partner address match; the partner listing supplies no menu. |

The Daily Green official gallery separately names Vegetarian Porridge, Signature Vegetarian Noodles, Vegetarian Nasi Lemak, Vegetarian Prawn Noodles, Vegetarian Chicken Rice and Vegetarian Mee Rebus. All six image captions were visually checked. No prices, effective dates or branch applicability are established by those captions, and no gallery artwork is republished.

## Price and option handling

Every one of **1,406 non-drink public Getz product-detail pages** was read using its actual selected pickup branch. Five tea-inclusive course bundles were then excluded, leaving 1,401 branch food products. All public product-detail requests completed successfully. The packet preserves **2,848 food portion/modifier choices** and **1,368 packaging-fee records**. Optional beverage choices are omitted.

Food rows keep a single dish identity. Portion choices and modifiers are nested in `optionGroups` and are not counted as additional dishes. Variant prices are complete option base prices; modifier prices are additional charges. The source’s required/optional selection text and disabled choices are retained where exposed. A disabled choice is recorded as unavailable in that source context; no positive current-stock guarantee is made.

`price` records the lowest published variant price when variants exist. `listingPrice` separately preserves the category tile amount. `packagingFee.application` distinguishes a fee added to option base prices from a fee already included in listed prices. Checkout, delivery fees and later price changes are unverified.

Several Getz detail headers display the first/default option beside “from”, even when a cheaper option appears later. For example, Divine Realm Sauerkraut Fish shows Large S$30.30 first, with Small S$15.30 later. The full option list is preserved and the actual lowest published option is used; the first header value is not assumed to be the minimum.

Two genuine conflicts remain explicit:

| Item | Category tile | Public product options | Treatment |
|---|---:|---|---|
| Greenland Butter Sauce Hericium | S$11.30 | Small S$14.00; Medium S$21.00; Large S$27.00, plus S$0.30 packing | Canonical dish price omitted; both observed prices/options retained. |
| Zi Zai Yishun Carrot Cake | S$5.80 | Small S$5.30; Medium S$8.30; Large S$11.30. Product note says S$0.30 packing is included. | Canonical dish price omitted; both observed prices/options retained. |

Food names retain the merchant’s mock-meat naming without treating it as an ingredient declaration. Decorative dietary/spiciness emoji are removed from normalized names. No vegan, allium-free or ingredient certification is inferred. Roti Tissue and tea-tree mushroom dishes remain food; the keyword audit explicitly distinguishes them from tissues and beverages.

Five Divine Realm breakfast products have explicit weekday notes, retained verbatim as availability facts. For Mee Rebus and Nasi Lemak, the English text says Tuesday/Thursday/Saturday while Chinese says Monday/Wednesday/Friday/Sunday. Neither schedule is selected as authoritative; the conflict is explicit and the branch remains partial. Category-level availability is also retained for Divine Family breakfast (6:30 am–2 pm, until sold out) and True Veggie prata. These are merchant menu schedules, not replacements for Google place opening hours.

## Sources and access boundaries

| Source | Role | Evidence boundary |
|---|---|---|
| [Zi Zai group ordering directory](https://online.zzv.sg/index.html) | Primary branch/brand ordering links and recommendation names | Undated legacy landing; Bishan listing conflicts with live selector. |
| [Zi Zai ordering](https://order.zzv.sg/Category) | Primary branch-selectable menu | Four actual pickup branches independently selected; branch-specific prices/options retained. |
| [Divine Realm ordering](https://divinerealm.zzv.sg/Category) | Primary exact-branch menu | Published pickup catalogue only; current stock not guaranteed. |
| [Divine Family ordering](https://divinefamily.zzv.sg/Category) | Primary exact-branch menu | Same boundary. |
| [Greenland ordering](https://greenland.zzv.sg/Category) | Primary exact-branch menu | One explicit price conflict; tea-inclusive bundles excluded. |
| [Time’s Vege ordering](https://timesvege.zzv.sg/Category) | Primary exact-branch menu | Published pickup catalogue only. |
| [Zhen Yi ordering](https://zhenyi.zzv.sg/Category) | Primary exact-branch menu | Prepared-food promotion sets retained; optional drink choices excluded. |
| [True Veggie ordering](https://trueveggie.zzv.sg/Category) | Primary exact-branch partial menu | Only prata is exposed despite broader category labels. The public Getz alias was also checked. |
| [Veganbliss ordering](https://veganbliss.getz.co/) | Group-linked official destination | Live redirect loop; no current complete catalogue obtained. |
| [Daily Green locations](https://www.dailygreen.sg/locations) | Primary current eight addresses | Address/identity evidence only. |
| [Daily Green Menus](https://www.dailygreen.sg/menus) | Primary menu entry point | Empty folder. |
| [Daily Green gallery](https://www.dailygreen.sg/gallery-1) | Six merchant-labelled food captions | Unpriced, undated brand context; not outlet menus. |
| [Hougang delivery English](https://www.foodpanda.sg/restaurant/ocwf/daily-green-hougang-mall), [Chinese](https://www.foodpanda.sg/zh/restaurant/ocwf/daily-green-hougang-mall) | Exact-address partner snapshots | Different menu exposure; direct fetch and normal managed-browser visit return human verification. No bypass attempted. |
| [Bedok delivery](https://www.foodpanda.sg/restaurant/y8ot/daily-green-bedok) | Eleven food rows in partner snapshot | Current complete menu and dine-in equivalence unverified. |
| [AMK listing](https://www.foodpanda.sg/restaurant/y2ic/daily-green-ang-mo-kio), [product links](https://www.foodpanda.sg/restaurant/y2ic/daily-green-ang-mo-kio/reviews) | Prior platform product labels | Review text excluded; all six labels are marked not available. |
| [Geylang listing](https://www.foodpanda.sg/restaurant/y8ss/daily-green-25a-geylang), [product links](https://www.foodpanda.sg/zh/restaurant/y8ss/daily-green-25a-geylang/reviews) | Prior platform product labels/prices | Review text excluded; current complete menu unconfirmed. |
| [NTU Grab listing](https://dineout.grab.com/sg/en/restaurants/daily-green-nanyang-avenue--4-C8C3VCJ3AXLTVA) | Partner identity cross-check | No dish menu supplied. |
| [Daily Green historical PDF](https://www.dailygreen.sg/s/VEGETARIAN-KITCHEN-MENU-A3-FA-V2.pdf) | Existing pilot reference, all 79 numbered food entries already collected | Kept in existing pilot research; not copied to current branches or counted again in this packet. |

The official Daily Green Facebook/Instagram links could not supply readable public current menus. The directory-linked Veganbliss social account could not be accessed or verified. Access controls and human-verification pages were respected. Third-party reviews are not used to fabricate complete merchant menus or current prices.

`checkedAt` is the research retrieval date, not a menu publication or effective date. Daily Green indexed snapshots range from last week to several months old; source notes preserve the retriever’s relative age. In particular, Bedok’s English price snapshot was reported as crawled three months ago. Such records require freshness review before consumer publication.

## Files and verification

- [Daily Green research](../../data/menu-research/menu-zzv-dailygreen.json): eight branch records, ten source-specific menus, 64 rows.
- [Zi Zai group shards](../../data/menu-research/zzv/): twelve branch records across eight brand files, fourteen menus, 1,407 rows including six brand-only recommendations.
- Existing [Woodlands pilot research](../../data/pilot/research/menu-expansion-woodlands.json) supplies the four already-collected Daily Green delivery rows and the separate historical PDF catalogue.

The top-level research file’s `shards` array contains relative path strings for all eight Zi Zai group files. Its `existingPilotMenuIds` explicitly names `daily-green-woodlands-street-31-delivery` (four existing branch snapshot rows) and `daily-green-published-menu` (79 historical brand PDF entries, reference only). The copied four-row research section also carries `existingPilotMenuId` so an index can treat it as referenced evidence rather than a newly discovered menu.

All new JSON files remain below 2,500 lines. Source, branch, menu and item references, unique identifiers, prices, option prices, packaging records, beverage exclusions and absence of private/ingredient fields were checked. The nine files contain 1,437 unique source records, 20 branches and 24 menus. The shared group-directory source is intentionally reused with identical content across brand shards.

A second pass fetched **140 individual public category/recommendations pages** across the ten readable pickup branches. All returned HTTP 200, selected address checks matched each intended branch, and no additional product IDs were found outside the collected all-items catalogue. The two price conflicts and the misleading first/default “from” amount were separately checked in the real visible product modals and captured as screenshots. The completed navigation and visual reports have no unresolved errors.

Read-only source capture used managed headless Playwright Chromium, not installed Google Chrome. No purchases, cart submissions, Google API calls, billing changes, app code changes, canonical pilot edits or public menu publication were performed by this research task.

Reproducible local capture/verification evidence is under `C:/Users/huien/QT/tmp/qa/menu-zzv-dailygreen/`:

- `*-branch-*.json` and HTML: actual pickup branch context, complete served category/product inventory.
- `*-detail-report.json` and `*-details/`: all 1,406 readable public detail responses, including source options/fees.
- `normalized-summary.json`, `research-validation.json`: extraction counts, price-conflict audit and reference/schema checks.
- `navigation-inventory.json`, `*-navigation/`, `navigation-audit.json`: individual public food-category and recommendations-page cross-checks against the collected product IDs.
- `trueveggie-tomorrow-noon.html`: alternate noon pickup context still exposing only prata/drinks.
- `daily-gallery-review.jpg`: six primary-source food captions visually inspected, for internal research only.
- `foodpanda-browser.png`/text: normal headless visit’s human-verification boundary.
- `price-visual-check.json`, `*-price-proof.png`: visible merchant UI verification of both price conflicts and the default-option header issue.

Current remaining gaps require a readable exact-branch merchant menu or merchant clarification, especially True Veggie’s missing lunch/dinner rows, the two inconsistent prices, Divine Realm’s two conflicting weekday schedules, Daily Green’s missing current menus, and the two unavailable Zi Zai-group branches. None is labelled complete solely because another branch or an older PDF has a menu.
