# Menu continuation: primary menus and unresolved sources

Checked **16 October 2026 SGT** (UTC receipt times in each packet). This is an evidence pass for the remaining collection and app import review. It does not claim that the full 2,322-place directory is complete.

## New saved food facts

| Merchant/source | Branch scope | Food rows | Treatment |
|---|---|---:|---|
| MTR Singapore | 438 / 438A Serangoon Road, 218133 | 576 | Twelve separate Tuesday–Sunday breakfast/lunch and snacks/dinner menus; 71 distinct printed food names. All 24 currently linked menu images inspected. |
| Swaad | 70 Desker Road, 209593 | 103 | Current standalone food/portion rows. Sunday and seasonal restrictions retained. |
| Swaad catering | Desker source | 6 | Held: printed **CATERING ONLY**, not ordinary dine-in availability. |
| Swaad traditional festive foods | Desker source | 5 | Held: one day advance order, general 0.5 kg minimum, exact printed weight/price pairs retained. |
| Su Shi Lou Vegetarian | 768 Woodlands Avenue 6 #01-30/31 | 20 | Held: readable ordering-source representation, direct ordinary request HTTP 403. |
| Ren Yi Vegetarian | 820 Tampines Street 81, 520820 | 28 | Held: readable ordering-source representation, direct ordinary request HTTP 403. |
| Chee Wei Vegetarian | 147 Potong Pasir Avenue 1 #01-93, 350147 | 6 | Held: readable ordering-source representation, direct ordinary request HTTP 403. |
| Chee Wei Vegetarian | 610 Tampines North Drive 1 #01-01, 520610 | 5 | Held: readable ordering-source representation; current options/rendering unverified. |
| Mini Green Vegetarian | 210 Lorong 8 Toa Payoh | 24 | Held: same URL supplies conflicting meal and lok-lok menu representations; direct request HTTP 403. |

Total: **773 additional source-specific food records** across **20 menus** and **eight branch research records**. **679 rows are eligible for import review; 94 remain explicitly held.** Research eligibility does not itself publish a branch or approve a Google identity match. MTR overlaps across twelve schedules, so the total is not 773 unique dishes.

Packets:

- [MTR](../../data/menu-research/menu-continuation-mtr.json)
- [Swaad](../../data/menu-research/menu-continuation-swaad.json)
- [Independent stalls](../../data/menu-research/menu-continuation-stalls.json)

## Closed and narrowed gaps

**Lin Lin:** Nine exact public product modals opened with managed headless Chromium. Both rice variants and both variant-level option groups were confirmed for all eight fried-rice foods: **16 rice variants and 32 expanded group observations**. Every named choice and amount matched the stored source configuration. White Rice totals are 6.00. Brown Rice is 6.50 except Olive Fried Rice at 6.80. Add Rice is +0.80. Upsize is +3.00 except plain Fried Rice at +3.20. The accordion opens one group at a time; a collapsed group must not be interpreted as missing options.

The Mini Buffet remains held: its modal prints 17.80 per pax, minimum fifteen pax and no table setup, but the seeded main/meat groups still do not render. No checkout or minimum-charge inference was made. Exact-ID changes are in the [Lin Lin amendment](../../data/menu-research/menu-continuation-linlin-options.json); these are amendments, not duplicate food rows.

**JO-YI:** The merchant homepage and late-night page explicitly name three rotating examples: **Pistachio, Dark Chocolate and Oolong Peach**. These are saved in the [flavour amendment](../../data/menu-research/menu-continuation-joyi-flavours.json). They are not invented standalone 5.00 products. The full daily flavour list, flavour-specific premium tier/current stock, and unassigned Yuzu Mayo scope remain unknown.

## Source-specific details

MTR's official menu index currently links all 24 source images under a June 2026 upload path. That path is not presented as a guaranteed effective menu date. Each printed source has its own weekday/service label. Breakfast is 08:30–11:30, lunch 11:30–15:00 and snacks/dinner 17:30–21:30. The source says closed Mondays.

MTR's Wednesday breakfast/lunch prints Onion Rava Dosa at **8.50**, while Wednesday dinner prints **7.50**. Friday breakfast/lunch prints Poori Saagu (two pieces) at **6.00**, while dinner prints **7.00**. Both observations stay attached to their exact sources. Prices have a plain dollar symbol with no explicit currency code; **10% service charge**, **10% takeaway surcharge** and **GST extra** are retained without inventing the billing interaction or a GST rate.

All sixteen beverage-parent labels and four standalone condiment rows per MTR service menu are excluded. Named food sides, desserts and food-only meal sets are retained. Repeated Today's Special/category rows and dessert/snack duplicates are deduplicated within each service menu.

All seven linked Swaad images were read. Four buffet/thali packages include chaas and are excluded from food-only data. Eleven beverages are excluded. Printed portions, six catering-only restrictions, Sunday Daal Baati Choorma, seasonal Aam Ras, and five festive advance-order weights are retained. The dollar symbol does not independently establish a currency code. Tax treatment, effective date and current stock are unconfirmed.

Swaad's merchant location page also confirms **3 Shenton Way #01-04 Shenton House, 068805**. The shared menu footer names both addresses, but Shenton is described as quick service and has a different outlet ordering source. The flagship's full à-la-carte list is not automatically assigned to Shenton.

The [merchant map-link receipt](../../data/menu-research/menu-continuation-merchant-map-links.json) contains three exact source links. Swaad supplies a separate map short link on each branch card; HEAD-only redirects expose feature tokens without a direct observed Place ID. IDs remain unknown. MTR's advertised address map short link redirects to **Washington DC** and is rejected for identity matching; its embedded map is only a generic text query. No Google Maps page body, metadata or paid API was requested. The merchant's printed Singapore address remains its identity evidence.

MTR's homepage also prints later Friday–Sunday closing hours (15:30 and 22:00) than its linked menu service labels (15:00 and 21:30). Both source contexts remain explicit; menu labels do not replace live venue hours.

Ren Yi's displayed 15% promotional and original amounts remain separate, including source rounding. Chee Wei Mee Rebus is 6.20 at Potong Pasir and **from 5.20** at Tampines. No chain-wide price substitution occurs. CLOSED ordering labels do not establish permanent closure.

The Mini Green open-page representation has 24 food cards plus seventeen excluded beverages. A search representation for the exact same URL has 31 lok-lok/staple food cards. The alternative lists are not combined or labelled current. Its Breakfast Set Chinese suffix has unreadable replacement characters; no reconstructed Chinese name was invented. Generic delivery descriptions and dietary claims are not imported as ingredient facts.

## Remaining named-source gaps

| Branch/source | Current evidence boundary |
|---|---|
| Ki Su, 60 Tras Street | Merchant menu re-read; same three packages and unnamed seasonal Main/Soup/Dessert. No current course names invented. |
| Herbivore, Fortune Centre | Merchant home/Gallery remain readable, without a named/priced branch menu. Existing gallery inspection is preserved as earlier evidence; it was not relabelled as a new 50-image review. |
| Rulai Woodlands / Marsiling | Exact English, Chinese 茹莱斋 and address searches did not produce a readable primary menu. A new secondary company lead at 10 Marsiling Industrial Estate Road 1 #01-01 is registration evidence, not stall/menu confirmation. Ang Mo Kio, Sin Ming, Muar and registered offices remain separate. |
| Origanics Woodleigh / Buangkok | Current merchant Linktree re-read. Linked Grab navigation failed through web tool. Carte landing returned ordinary HTTP 200 but no server-rendered visible text; prior preview/date holds remain. NUS foods are not transferred. |
| Swaad Shenton | Exact merchant address confirmed; separate outlet-menu/options applicability remains for another source pass. |
| Five new delivery listings | Accessible current merchant rendering/options are still required before their held rows can be published. |

The [gap recheck receipt](../../data/menu-research/menu-continuation-gap-rechecks.json) records the actually inspected scope. An unavailable source is not proof that a venue has no menu.

## Source credibility

| URL | Source | Credibility for retained facts | Boundary |
|---|---|---|---|
| [MTR menus](https://www.mtrsingapore.com/menu/) | Merchant menu index and 24 linked images | 5/5 | Strong printed dish/price/day evidence; stock and effective date remain unknown. |
| [Swaad menu](https://swaadgovinda.com/menu), [locations](https://swaadgovinda.com/locations) | Merchant pages and seven linked images | 5/5 | Printed food/price/scope facts; Shenton's full menu applicability unresolved. |
| [Lin Lin ordering](https://linlinvegetarian.oddle.me/en_SG) | Merchant-linked ordering catalogue | 5/5 for observed controls | Thirty-two expanded groups confirmed; no cart/order action or minimum billing verification. |
| [JO-YI home](https://www.jo-yi.com/), [late-night desserts](https://www.jo-yi.com/late-night-desserts) | Merchant prose | 5/5 for named examples | Rotating examples, not complete inventory or flavour prices. |
| [Ki Su menu](https://www.kisu.com.sg/menu) | Merchant source | 5/5 for package labels | Unnamed seasonal courses stay unnamed. |
| [Herbivore](https://www.herbivore.sg/) | Merchant source | 5/5 for identity | No readable named/priced menu obtained. |
| [Origanics Linktree](https://linktr.ee/origanics.sg) | Merchant social/ordering hub | 5/5 for printed outlet lead | Food menu and current branch options unresolved. |
| [Su Shi Lou](https://www.foodpanda.sg/restaurant/c9tt/su-shi-lou-vegetarian-koufu-768-woodlands), [Ren Yi](https://www.foodpanda.sg/restaurant/xr8d/ren-yi-vegetarian-tampines-street-81), [Chee Wei Potong Pasir](https://www.foodpanda.sg/restaurant/gwj6/chee-wei-vegetarian-potong-pasir), [Chee Wei Tampines](https://www.foodpanda.sg/restaurant/sl18/chee-wei-vegetarian-tampines-north), [Mini Green](https://www.foodpanda.sg/restaurant/ed4x/mini-green-vegetarian-toa-payoh-lorong-8) | Ordering-source web representations | 3/5 | Exact-address/name/price observations held for currentness; no barrier bypass. |
| [Rulai company lead](https://www.companies.sg/business/53529605C/RULAI-VEGETARIAN-3) | Secondary company index | 1/5 for menu identity | Registration lead only; no menu or operation conclusion. |

## Verification

All three new source packets parsed with **zero duplicate source/branch/menu/item IDs, zero missing references and zero invalid numeric prices**. Files are below the 2,500-line limit. The source packets total approximately **0.4 MB** before compression; these facts contain no copied image bytes. Raw images and browser evidence remain under the workspace scratch evidence folder, separate from app data.

The amendment validation confirms all eight Lin Lin foods, sixteen price variants and thirty-two option groups against actual rendered text. Existing holds are preserved. Machine verification receipts are `tmp/qa/menu-continuation/dataset-validation.json` and `linlin-amendment-validation.json`.

No canonical index files, application code, publication records, Google allowances, account credentials or source holds were changed by this delegated source pass. App ingestion and final publication review are handled by the coordinating task.

