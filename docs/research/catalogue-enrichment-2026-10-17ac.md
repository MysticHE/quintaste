# Catalogue cover and source follow-up — 17 October 2026, batch ac

**Deployed and live verified: `20261017-suxiang-cover31`**, based on the actual live `20261017-market1` archive. Market, Location, Social, Cook and navigation source is byte-preserved. Full coverage remains incomplete.

Coverage is **172 covers / 96 source-backed hours / 174 browse locations**, with95 locations having menus, cover and hours available. Remaining: **2 covers, 78 hours and 3 coordinates**. All 174 browse locations have reviewed menu records across175 retained menu IDs; this does not certify complete menus or current stock. Original Sin and New Green Pasture Monday remain unconfirmed. Sufood retains its15October source-check date.

## Cover selected and reference audit

Su Xiang Vegetarian at **Lau Pa Sat stall46,18RafflesQuay,048582** now has a faithful AI-enhanced rice-dish cover. The exact [merchant partner listing](https://www.foodpanda.sg/restaurant/rnb4/su-xiang-vegetarian-kopitiam-at-lau-pa-sat) associates the [unmarked source image](https://foodpanda.dhmedia.io/image/fd-sg/products/54211229.jpg) with its rice-dish label. The page was checked17October2026at00:19:04UTC; the image was fetched once and visually reviewed/enhanced17October. Its earlier reference-only artwork holds remain retained. Source attribution and rights remain; enhancement establishes neither a new licence nor independently verified on-site photography, ingredients or current stock.

The built-in image_gen prompt and visual comparison are recorded in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17ac.json). It preserves the same rice dome, central garnish, leaf, plate, wood board and viewing angle, improving light/clarity conservatively. Production JPEG: **142,896 bytes**,960×720, SHA256`98fc947abb044766947fa216e1cef4cf384ae63ea3f8a313a06ca3fa3b6d42ed`. The project PNG is `.local/coverage-2026-10-17/generated/rnb4-product-54211229.png`; the immutable production asset is `server-assets/catalogue/98fc947abb044766947fa216e1cef4cf384ae63ea3f8a313a06ca3fa3b6d42ed.jpg`.

All **71 image references** in the three saved inventories now have outcomes:39 Su Xiang,12 Happy Hougang and20 Tian Yuan. Seven existing receipts were reused;64 new receipts record55 new food-image fetches and9 metadata-only outcomes. All55 images were visually inspected across five contact sheets:33 carry explicit provider-reference-only notices,3 unmarked Su Xiang references are ungenerated alternates,18 Tian Yuan references remain alternates to its existing deployed cover, and1 Su Xiang reference was selected. Eight beverage references were not fetched; the ThunderTeaBrownRice food reference was retained as metadata-only because TianYuan already has a cover. No reference was transferred across merchants or branches, and no duplicate food extraction or generation occurred.

The central queue contains **274 saved reference receipts**, all with outcomes and zero pending receipts. This is an evidence count, not274venues or274covers. Full URLs, source/image hashes, check dates and statuses remain in the JSON audit and branch checklist.

## Remaining photo and hours evidence

- **Happy Vegetarian Hougang106:** all12exact-listing image references carry provider reference-only notices; retain the honest fallback. Its community directory prints a conflicting postal code and schedule; neither is promoted.
- **Ascend18Cross:** merchant/landlord references remain logos or tied to Esplanade. The alternate [landlord tenant page](https://www.18cross.sg/tenant/ascend-signature) adds no food photo. An exact-branch reviewer-photo lead on [Burpple](https://www.burpple.com/ascend-vegetarian-signature-18-cross) was not downloaded or enhanced: its [terms](https://www.burpple.com/terms),A12andProprietaryRights8–9, restrict caching/republication/derivatives and distinguish attribution from consent. This is a specific source hold, not an inferred licence.

The20 focused source outcomes cover 22 branches and add **zero hours records**. BodhiDeli's [merchant page](https://take.app/bodhideli) has an alternate-Wednesday/lunar-day closure rule but no opening times; its delivery11–14window is not venue hours. [Orchardgateway's public directory](https://orchardgateway.sg/directory) confirmsDLifeB2-04A/05with an empty opening-time field; mall10:30–22:30hours are separate. Its normal public page dependencies were allowed, including Firebase; no private endpoint replay/authentication or paid Maps/Places call occurred. Earlier Loading90percent captures are superseded by the successfully loaded directory.

SHU's profile-linked [store page](https://shuvegetarian.oddle.me/en_SG/stores) explicitly separates pickup and delivery times for259JalanKayu; no other outlet schedule was inferred. MotherEarthClassic's selected Getz page has pickup slots only. Merchant Instagram bios forZhenXiang,Genesis andKangSu provide identity/contact without hours. LinLin's normal merchant request failed. The remaining landlord/operator/partner checks are individually dated and qualified in the JSON. The18taiseng.comsite explicitly calls itself an unofficial fan site; its Peace schedule was not treated as property evidence. New KindKones supplier hours do not resolve existing merchant conflicts. Earlier holds remain preserved.

## Verification and deployment

Fresh isolated TypeScript, uncached root Expo lint, catalogue write/check, clean export and module consistency pass. All 16 API bundles come from one export. Three postal/API load orders pass. Packaging verifies that only the photo registry, generated catalogue, new asset and clean export differ frommarket1. Package: **910files**, SHA256`a4481dc97db3d546ef7d72e74a1abfaad4dfd7fa15fbfed13dfb124124f0e5dd`. Documentation, research captures, raw research JSON, credentials and provenance reports are excluded from the release.

Live verification passes all 175 menu fingerprints,174 unique browse entries,172 cover records,96 hours records and139 immutable asset hashes. NewSuXiangcover plus both natural missing-photo cases, simple menus/search/40-row paging, Save/Saved/Map/back, photo failure,320/768/1440 light/dark and shared-image deduplication pass. Thirteen Greendot cards request four shared assets once, including after back navigation. Postal079331andS(079331), reselection and filters/back pass with no unnecessary catalogue refresh. Browser runtime errors and unintended provider requests: zero.

Exact live web bytes and Android/iOS manifest/bundle transport pass with the existing scope key and current markers. **Physical-device appearance remains unverified.** Guarded promotion, backup and zero-active-avatar-job checks passed; only app/preview changed. Admin/PostgreSQL are unchanged. Menus/hours/assets are packaged on VPS, not imported into PostgreSQL menu tables. Rollback: `deployment-backups/20261017-suxiang-cover31`. Evidence: `.local/coverage-2026-10-17ac/release.json`.

## Storage and performance

Production covers: **139 JPEGs / 19,314,124bytes**, largest299,725; this batch adds142,896 bytes. Catalogue index: **204,928bytes**. First20-summary response: **22,040bytes / 50.3ms**, one live sample rather than a benchmark. Images remain outside catalogue JSON and load only for visible cards. Catalogue8pages/40KBperpage,15minutes fresh/24hours offline; images12entries/8MiB/24hours; menus5details/1.2MBcombined. Account isolation, cancellation/deduplication, failure backoff and204/304validation remain.

```
quintaste-staging-app-1 140.3MiB / 768MiB 3.97%
quintaste-staging-preview-1 208.6MiB / 1.758GiB 77.67%
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   79G   17G  83% /
```

Preview CPU includes cold Metro compilation during native verification. VPS disk is83percent used with17GBfree in this snapshot. Retained releases, backups and Docker history require monitoring; no broad pruning was performed. Private source images/contact sheets and generated PNGs are not mobile payloads. Existing menu simplification retains10,696unique display rows from12,084source occurrences, about55percent smaller detail payloads, with one dish name and price/range per row.

Google research ledger remains **2,419/2,500requests,81left**, SHA256`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`; live counters100/8/19/545unchanged. All44 original backup files were directly rehashed and match 7,200,176 bytes; no expiry reader was called. This batch made55 public CDN image fetches and one built-in image generation, not paid Google Maps/Places requests. No budgets were reset/raised.

Preserved unresolved research:2,527food holds,109zero-food research branches,1,828unnamed candidate IDs,3coordinate conflicts, and the unrecovered exactMakanVegan/SoonLaiscreenshot photos. [Current174-branch checklist](current-catalogue-readiness-2026-10-17.md).
