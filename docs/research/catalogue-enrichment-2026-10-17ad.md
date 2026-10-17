# Merchant hours, cover and menu update — 17 October 2026, batch ad

**Deployed and live verified: `20261017-merchant-data32`**, based on `20261017-suxiang-cover31`. Market, Location, Social, Cook and navigation source is byte-preserved. Full coverage remains incomplete.

Coverage: **173 covers /107 source-backed hours /174 browse locations**, with107having menu, cover and hours available. Remaining: **1cover /67hours /3coordinates**.175retained menu IDs contain224source menus and12,085source food occurrences. Reviewed available records are not a complete-menu/current-stock guarantee.

## Eleven hours records

All sources below were checked **17October2026** through the ordinary public merchant page, closing an optional login prompt and expanding its visible hours control where available. No login, private endpoint replay or access workaround. Full capture timestamps/hashes and notes are retained in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17ad.json).

| Exact branch | Accepted regular hours | Merchant source |
| --- | --- | --- |
|Genesis Vegan Restaurant (Havelock II) — 2 Havelock Road, #B1-01 Havelock II, Singapore 059763|Sun–Thu lunch & dinner · Fri lunch|[Merchant page](https://www.facebook.com/genesisvegan/)|
|Tracy Juice Culture — 190 Middle Road #01-34 Fortune Centre, Singapore 188979|Daily 09:30–18:15|[Merchant page](https://www.facebook.com/TracyJuiceCulture/)|
|Xie Bi An Vegetarian 谢必安素食 — 824 Tampines Street 81, #01-38, BK Coffeeshop, Singapore 520824|Daily 07:00–20:00|[Merchant page](https://www.facebook.com/xiebianvege/)|
|TPY 203 Vegetarian food — 203 Toa Payoh North, Singapore 310203|Mon–Sat 06:00–13:00 · Sun closed|[Merchant page](https://www.facebook.com/Tpy203veg/)|
|Green Harmony Vegetarian 素和轩 — 443 Ang Mo Kio Avenue 10, #01-1221, Singapore 560443|Daily 10:30–21:00|[Merchant page](https://www.facebook.com/p/%E7%B4%A0%E5%92%8C%E8%BD%A9-Green-Harmony-Vegetarian-61573781043177/)|
|Harmony Hut — 157A Serangoon North Avenue 1 #01-01, Singapore 551157|Tue–Sun 11:00–21:00 · Mon closed|[Merchant page](https://www.facebook.com/harmonyhutvegetariancafe/)|
|Leaf Corner — 60 Jurong West Street 91 #01-09, Nanyang Community Club, Singapore 649040|Daily 11:00–21:30|[Merchant page](https://www.facebook.com/leafcornersg/)|
|So Green Vegetarian — 445 Bedok North Street1 #01-02, Djitsun Mall, Singapore469661|Daily 11:00–21:00|[Merchant page](https://www.facebook.com/GuiLinVegetarian/)|
|Greenland Vegetarian — 789 & 791 Upper Serangoon Road, Singapore 534659|Daily 11:30–21:30|[Merchant page](https://www.facebook.com/greenland791/)|
|Mother Earth Classic — 530 Balestier Road #01-06, 329857, Singapore|Thu–Tue 10:30–21:30 · Wed closed|[Merchant page](https://www.facebook.com/motherearthclassic/)|
|Lin Lin Vegetarian Delight — 412 Bedok North Avenue 2, inside SinFoodie Coffeeshop, Singapore 460412|Tue–Sun 10:00–20:30 · lunar exceptions|[Merchant page](https://www.facebook.com/linlin.veg/)|

107 source-backed hours records. Several merchant panels are labelled updated2–5yearsago; those ages are retained in app notes and reconfirmation is advised. OriginalSin/NewGreenPastureMonday unconfirmed. LinLinMonday lunar exception dates/times unconfirmed. MotherEarthClassic7October one-off announcement is separate from regular Wednesday closure. Sufood source check15October retained.

LinLin's own18and24September posts supply the regular schedule; their visible dates do not print the year. A shared review's precise lunar1/15 claim was not converted into merchant-confirmed exception times. MotherEarthClassic's [7October announcement](https://www.facebook.com/motherearthclassic/posts/pfbid0kWAuu5zRrkhukHXmJJg4ndcDwgfxUdubEoR4PLyjssqL4jGMTvPMcfZbM5HxX1sTl) was checked separately: it announces opening that day without changing the weekly schedule. Its visible date does not print the year.

## Ascend18Cross cover and one dish

The [merchant's public photo](https://www.facebook.com/photo/?fbid=1163870909934825&set=a.130187213303205), checked **2026-10-17T02:15:55.482Z**, explicitly says the pictured new dish is exclusive to18Cross. It names **Smoky Braised ‘Pork’ Rice with Preserved Mustard Green**, describes a vegan base with mushroom soup and separately offers an optional braised egg. The canonical record retains these qualified source statements; the app displays only the dish name and **Price unavailable**, once. No price, surcharge, ingredients, allergen safety, exact publication timestamp or current stock was invented. The existing weighted-bowl conflict remains held. Only AscendCross menu content changed; two sibling dataset fingerprints refreshed without changing their foods.

The source image was fetched once and visually compared with a builtin image_gen enhancement. The same plate, food arrangement, rice, dark strips, orange pieces, cucumber slices, tomatoes and partial soup remain; promotional lettering was removed. No optional egg was added. JPEG960×720, **163,088bytes**, SHA256`baa6d9f2d8a147dd3b1cbed5f9808b5a0d35847b9280536e5de6241bd60e55e0`. Attribution, stable source URL, dates, prompt and review remain in the photo registry/audit. **Source rights are retained; AI enhancement does not establish a new licence.** The prior restricted Burpple photo remains unused. Esplanade profile hours were not transferred to Cross.

All **275central saved image receipts** have outcomes, zero pending; these are evidence receipts, not275venues. The sole cover gap is **HappyVegetarian106Hougang**, whose12exact-listing references carry explicit provider-reference-only notices. MakanVegan/SoonLai exact screenshot photos remain unrecovered, separate from current cover coverage.

## Retained source gaps and continuation

The JSON records every public-page outcome and exact capture hash. No transfer from DLifeSquare2 toChinatown, XingHua180Bencoolen toFortune/Somerset, KangSu472MacPherson toFarEast, MotherEarthBalestier toJurong, or LeafCornerNanyang toTaiSeng/Sembawang. DivineRealm's page says Unofficial Page; Time'sVege legacy page is unavailable. OriginalGreens remains without an explicit weekly merchant schedule. KALE dish-availability weekdays are not venue operating days. NewBodhiDeli/Teng primary links are separately queued for batchae and are not claimed complete here.

All **2,527food holds**,109zero-food research branches, historical1,828unnamed candidate IDs and3coordinate holds remain. Generated location-status counts have a separate definition; no Google identity approval was added. Register: **3,618source observations /3,544URLs /17,610food observations /zero undated sources**. Existing raw source dates remain unchanged.

## Verification and deployment

Publication/compiler/register/catalogue checks, isolated TypeScript, uncached Expo lint, clean export and shared-module consistency pass. All16API bundles come from one clean export. Package **911files**, SHA256`a444f5f4d015fc7867e406ddb3a8b33def68ee5941870b12f256bbbd974daef2`; only approved data/assets and clean dist changed. Raw research, captures, reports and secrets are excluded.

Live checks reconcile all175menu summary fingerprints,174unique browse entries,173cover metadata records,107hours records and140immutable asset hashes. All11newhours, newCrosscover and naturalfallback render; unknown-price newdish appears once without details.320/768/1440light/dark, Save/Saved/Map/menu/back, image failure, postal079331/S(postal), filters/back and unchanged-location reuse pass.13Greendotcards use4shared image requests once, retained on back. Runtime errors/unintended provider requests: zero. Exactweb/Android/iOS transport passes with existing scope key; physical-device appearance remains unverified.

Guarded promotion, backup and zero active avatar jobs passed. Only app/preview changed; admin/database remain unchanged. Menus/hours/assets are packaged on VPS, not PostgreSQL menu tables. Rollback `deployment-backups/20261017-merchant-data32`. Evidence `.local/coverage-2026-10-17ad/release.json`.

## Storage and performance

140JPEGassets total **19,477,212bytes**, largest299,725. Catalogue209,781bytes; first20summaries **22,616bytes /25.0ms**, one live sample rather than a benchmark. Visible-only images remain outside catalogue JSON. Catalogue8pages/40KBeach/15minutesfresh/24hoursoffline; images12entries/8MiB/24hours; menus5details/1.2MB. Account isolation, cancellation/deduplication, backoff and204/304validation remain.

```
quintaste-staging-app-1 141.3MiB / 768MiB 2.53%
quintaste-staging-preview-1 215.6MiB / 1.758GiB 75.24%
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   80G   17G  83% /
```

Preview CPU includes cold native Metro compilation. VPS17GBfree/83percentused requires monitoring; no broad pruning. All44original recovery files directly rehashed unchanged (7,200,176bytes), without expiry reader. Googleledger **2,419/2,500requests,81left**, SHA256`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`; live100/8/19/545unchanged. One publicCDNfetch/onebuiltin generation, zero paidGoogleMaps/Places calls or budget changes.
