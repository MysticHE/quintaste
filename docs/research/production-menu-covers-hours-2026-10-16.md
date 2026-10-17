# Production menu, covers and opening hours — 16 October 2026

Release **20261016-covers-hours-menu2** is deployed to app and Expo preview, based on the live `20261016-catalogue-photos1` archive. The user's active goal covers all available saved evidence, a simpler production menu, verification and deployment. This pass completes that available-evidence review; it does not claim that missing merchant facts have become known.

## Result and cause

The owned catalogue had no opening-hours fields, so moving Explore away from live provider cards lost those hours. The first photo restoration supplied owned photography but still had no hours path. The catalogue now includes independently reviewed, exact-branch schedules in `data/menus/catalogue-hours.json`, with source URL, check date, Singapore timezone and explicit partial-day/last-seating qualifications. Hours are stored facts, not a fabricated live open-now status. The generator checks branch/address identity and the client validates and serializes the metadata, including legacy summaries without hours or photos.

All 175 published menu IDs were reviewed against saved leads and 239 distinct ordinary public URLs were checked once. **72 IDs / 72 of 174 browse entries have source-backed hours**; 103 menu IDs / 102 browse entries remain unconfirmed. Delivery slots, entire-mall hours, stale social snippets and conflicting units do not become venue hours. Examples include the [operator's elemen outlet schedules](https://www.elemengroup.com.sg/locations), [Ananda outlet page](https://www.anandabhavan.com/outlet), [VeganBurg Eunos schedule](https://www.veganburg.com/location), and [Greendot's owner-linked directory](https://restaurant.momos.io/greendot-c29da/locations). All were checked 16 October. Greendot dine-in records were used, with delivery and patisserie schedules excluded; no Google API lookup was made. Unlisted days remain unconfirmed.

The [complete hours audit](../../data/menu-research/opening-hours-review-2026-10-16.json) preserves every published branch's outcome, checked source URLs and gaps. Kind Kones Forum is held because the current owner says #B1-17 while the saved menu address is #B1-27 & K1. Gokul, SUFOOD and Zhen Xiang have conflicting or unavailable current primary schedules. The ordering windows for OMG Donuts are not storefront hours.

## Photo recovery and enhancement

All **44 original cache files** remain byte-identical to their recoverable backup. Their image payloads total **7,184,768 bytes**; files including headers total **7,200,176 bytes**. They represent **29 distinct images / 27 place IDs**, not 44 branches. No expiry-triggering application cache read was used. Metadata was recovered from all duplicate headers, because the first legacy copy sometimes lacked attribution.

The [29-image / 44-file audit](../../data/menu-research/cover-enhancement-audit-2026-10-16.json) records exact associations, hashes, authors, Google Maps source URLs, check dates and each remaining hold. Fourteen distinct images match published branches: 12 selected covers plus two Ananda Syed Alwi alternates retained privately to avoid duplicate enhancement. Fourteen other images remain held for unpublished branches, ambiguous operators or unresolved premises. One image was identified as iNCREDiBOWL at 116 Tanjong Pagar; its current owner offers meat/seafood, so it is excluded from vegetarian/vegan coverage. Neither the screenshot's exact Makan Vegan branch nor Soon Lai image could be recovered from this cache.

The 12 selected references were enhanced with the built-in image-generation tool at the user's explicit direction. Prompts requested faithful exposure/colour/clarity improvement with the original venue, viewpoint, signage, food and people preserved. Originals and generated PNGs remain private; separately encoded, hash-addressed JPEG derivatives are delivered by the owned asset endpoint. A first Ki Su result with altered signage was rejected and replaced before packaging. Fine generated details are never used as menu, ingredient, hours or identity evidence.

| Enhanced branch | Reference subject |
| --- | --- |
| Zhen Xiang, 325 Woodlands Street 32 | Food counter |
| Lian Xin, Buddha Tooth Relic Temple basement | Dining-area interior |
| elemen, Woodlands Height | Interior |
| SUFOOD, Raffles City | Entrance |
| Gokul, Upper Dickson | Exterior |
| Lotus, 201 Balestier Road | Host hotel exterior, not restaurant interior |
| Whole Earth, 76 Peck Seah | Entrance |
| Ananda Bhavan, 95 Syed Alwi | Food photograph |
| True Veggie, 47 Lorong 27 | Stall frontage |
| Ki Su, 60 Tras | Entrance |
| NALAN, City Hall | Entrance, matched to owner City Hall imagery |
| Greendot, One Raffles Place | Interior |

The existing separately licensed Greendot Jewel enhancement is retained: **13 covers / 174 browse entries; 161 photo gaps**. The 12 new derivatives retain original contributor and Google Maps attribution. User-directed enhancement does **not** establish a new redistribution licence or remove source rights. Their registry entries explicitly record that basis and make no rights-cleared claim. The previous instruction against promoting expired cache files remains applicable to the untouched temporary originals; the user's later explicit instruction authorizes these separately generated derivatives. No blanket permanent-cache conversion or expiry change occurred.

## Simple menu presentation

Each displayed dish has one name-and-price row, with no expandable price/options section, publication prose, qualifier paragraphs or add-on list. Long names wrap for accessibility. Category filters, full-menu search, 40-row pagination and corrections remain available. Identical names and explicit Small/Medium/Large variants are consolidated. One prioritized current source supplies each dish; prices from separate ordering channels are not combined into an add-on range. Current sources precede historical sources, followed by the established ordering/delivery/dine-in/brand priority and check date.

**12,084 source occurrences across 223 source menus / 175 menu IDs produce 10,696 display rows**, including **899 bounded price ranges**. There are 2,411 lower-bound “From” prices and 3,384 rows with no confirmed numeric price/currency for display. Missing selection bounds, unread choices, nested unresolved choices and conditional prices do not invent a maximum. Structured absolute portion prices and complete constrained add-on groups produce ranges. Individual add-on categories are omitted from the dish reading view. Original observations, source links/check dates and held rows remain in canonical research; no food re-extraction or approval expansion occurred.

The public item payload omits long extraction details and qualifiers. Menu source metadata remains in JSON for traceability, while publication/debug prose is removed from the reading view. `scripts/menu-publication/price-range.ts` generates the bounded numeric projection; `src/utils/menu-display.ts` consolidates the reading list. Legacy cached menus remain schema-compatible.

## Performance and storage

Explore/Map still use owned `/api/catalogue`, 20 summaries per page, explicit/default/Home/Work location selection, owner/account isolation, cancellation/deduplication, eight memory pages, 40 KB/page, 15-minute freshness, 24-hour qualified offline limit and 60-second failure backoff. No polling or automatic provider discovery/geocoding/photo download was added. POST conditional revalidation returns 204; menu GET validators return 304. Saved summaries retain 40/80 KB/24-hour limits and omit private-derived distance. Catalogue bookmarks retain their existing IDs.

Images load for visible cards only. The owned cache retains 12 entries, bounded bytes, cancellation, deduplication, negative caching and offline expiry. Assets have immutable cache headers and return 404 without a provider fallback. Image bytes are absent from catalogue JSON and persistent summary storage.

The first live 20-card page is **13,583 bytes**, observed at **26.3 ms** for one warm request; this is not a load-test percentile. All 13 active cover JPEGs total **2,087,498 bytes**, largest **270,260 bytes**. Total selected-branch menu detail bytes fall from **5,744,848 to 2,576,276** (about 55% less), and the largest detail falls from **237,205 to 108,562 bytes**. These are totals across separate requests, never a startup download. Menu cache bounds remain five branches / 1.2 MB aggregate / 400 KB each. The approximately 20 MB menu server bundle stays server-side; the browser does not download it. Menus are packaged reviewed JSON, not PostgreSQL menu tables.

Immediately after promotion the app used about 140 MiB of its 768 MiB limit; the preview snapshot was about 154 MiB before native compilation. After both native bundles compiled, the app used 143.8 MiB and preview used 448.3 MiB of its 1.758 GiB limit; all four services remained healthy. VPS disk retained 28 GB free (72% used); workstation retained about 630 GB free. Earlier development-server retention concerns are not proven fixed by these production snapshots.

## Verification and deployment

TypeScript, Expo lint, changed-file uncached lint, research publication/source-register/catalogue checks and a clean 16-route export passed. The packager verified consistent Metro modules and a 752-file allowlist preserving unrelated navigation/profile/icon code. Archive SHA256: `44908ee5073a2268fe40f281cff0034bc2dfab19662d85e4215f2a7b89e41417`. The earlier local menu1 archive was superseded before any upload; it was never deployed.

All 175 actual exported menu handlers passed schema checks, row/name consolidation, price-bound checks and compact-payload assertions. All 13 covers and selected hours rendered in local and live browsers; the six-case light/dark 320/768/1440 matrix passed. Save, menu/back, Saved, Map, keyboard, large text, scrolling/cache reuse and 404 fallback passed. The one accessibility-label mismatch found during QA was corrected; the final scoped axe check has zero violations. Search and 40-row menu pagination passed. Live postal 079331, repeated formatted selection and Filters/back retained catalogue results without a refresh. No unintended Google/provider requests or browser runtime errors were observed.

Live API checks reconcile all 175 menu fingerprints, all nine browse pages / 174 distinct entries, 72 schedules, 13 photo metadata records and every asset hash. Conditional 204/304, invalid queries/cursors and a held-menu 404 pass. Exact web-bundle bytes match `entry-75ed67cf16685f7152ca2f3e97cf26e6.js`. Android and iOS manifests/bundles returned HTTP200, retained the existing Expo scope key and contain the current menu/hours/photo/cache markers (7,872,624 / 7,249,555 bytes). This is transport verification, separate from physical-device appearance; evidence is in `.local/cover-hours/release.json`.

The runbook procedure rebuilt app and preview sequentially, ran the database backup, confirmed zero active avatar jobs and retained protected rollback snapshot `deployment-backups/20261016-covers-hours-menu2`. Only app/preview were recreated; admin, PostgreSQL, secrets, account data and Expo scope identity were preserved. All documentation and private QA evidence remain local and were excluded from the release.

Google research ledger remains **2,419 / 2,500; 81 left**, 1,045,377 bytes, SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters remain text100 / nearby8 / details19 / photos545. The 2,527 held food observations, eight coordinate holds, 109 zero-food canonical branches and 1,828 unnamed candidate IDs remain unresolved. All 1,105 saved independent leads already have qualified review outcomes; no untouched reference queue was created. Missing merchant facts and physical-device UI acceptance remain explicit gaps, not completed factual coverage.

Local evidence: `.local/cover-hours/{menu-data-qa,catalogue-live-api,local-browser,live-browser,local-extra-qa,live-extra-qa,local-all-rendered,live-all-rendered,release}.json`, plus the source receipts and backup integrity audit linked above.
