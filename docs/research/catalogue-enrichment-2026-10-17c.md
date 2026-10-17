# Gallery coverage continuation — 17 October 2026, batch c

Eight additional enhanced covers have passed local rendered-card checks. Release `20261017-branch-covers5` is deployed and live verified on app and preview. This is an increment, not completion of the full-coverage goal.

The current projection contains 175 menu IDs and 174 distinct browse venues, with 85 sourced hours records and 31 covers. There are 89 hours gaps and 143 cover gaps. The restored location-details route remains the card's main action; Menu remains separate. Menu data and all 2,527 held food observations are unchanged.

## Sources and exact branch mapping

| Cover | Evidence reviewed on 17 October 2026 |
| --- | --- |
| D'Life Orchard Gateway | [Selected operator ordering menu](https://dlife.getz.co/?StoreID=5f6ae0b4-a479-4131-a288-14bc7e3d5992&Service=PickUp&lang=EN), saved browser capture `dlife-getz-ui-01` from 15 October. Thai Style Claypot Curry image belongs to the selected Orchard product. |
| D'Life Jurong West | [Selected operator ordering menu](https://dlife.getz.co/?StoreID=eec50bad-d2aa-4c7d-a9c8-6aaef1ed32ad&Service=PickUp&lang=EN), saved `dlife-getz-ui-03`. The correct selected-branch cereal mushroom image and initially downloaded default-Orchard image have identical SHA256 bytes, so the existing enhancement was reused. A StoreID query alone was not accepted as branch evidence. |
| Nature Vegetarian Delights Bukit Batok and Rivervale Shores | [Operator restaurant page](https://www.naturevegedelights.com.sg/our-restaurants/), captured 16 October. Each image is nested in its exact address section; visible signage names its branch. Two separate enhancements. |
| Tofu G Mandarin Gallery, Ngee Ann City, Amoy Street and UE Square | Dedicated operator pages: [Mandarin Gallery](https://www.tofug.sg/mandaringallery), [Ngee Ann City](https://www.tofug.sg/takashimaya), [97 Amoy Street](https://www.tofug.sg/97amoy), [UE Square](https://www.tofug.sg/uesquare), captured 16 October. Each displays the selected reference and exact branch address. Photograph capture dates and original production methods are not independently known. |

Original references and generated PNGs are retained privately under `.local/coverage-2026-10-17/references` and `generated`. Each prompt is in `generated-<name>.json`. Built-in image generation was used, with visual comparison of source and output. Source rights and attribution remain; enhancement does not establish a new licence. Public JPEG metadata, source image URLs, original hashes, branch evidence and prompts are recorded in [the photo registry](../../data/menus/catalogue-photos.json) and [this batch's audit](../../data/menu-research/catalogue-enrichment-2026-10-17c.json).

The D'Life Signature yam-ring derivative is **held and unpublished**: its Getz reference is Novena, not Chinatown Point. The canonical Chinatown packet already excludes that source. Makan Vegan and Soon Lai's exact screenshot photos remain unrecovered. No expired development-cache reader was invoked and no recovery backup was changed.

No new hours were approved in this batch. D'Life Orchard secondary listings agree on 11:30–21:30 but lack a confirmed operator/mall schedule in this review. Jurong's [reservation listing](https://www.chope.co/singapore-restaurants/restaurant/d-life-jurong) gives 10:45–21:15, conflicting with other directory closing times. Pickup/delivery windows are not substituted for restaurant opening hours. Full URLs, check dates and reasons remain in the JSON audit.

## Verification and storage

Catalogue validation, publication/source-register checks, clean web export, isolated TypeScript, three API load orders, eight actual gallery covers and existing simple-menu search/paging passed. Zero browser errors or automatic provider requests were observed. All eight cover captures were visually reviewed. Isolated full lint reports only the three previously documented Windows junction casing errors in unchanged auth imports; uncached workspace lint of that auth file and relevant gallery/detail/cache files passes. No source-code changes were introduced in this batch.

The 31 JPEGs total 4,388,113 bytes; this batch adds 993,227 bytes. The complete server catalogue index is 131,174 bytes. Normal browsing still returns 20 summaries at a time and fetches image bytes only when needed, with the existing bounded caches, account isolation and conditional revalidation. Raw references and generated PNGs are excluded from the release.

Google ledger: 2,419/2,500 requests, 81 remaining; SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. No new Google calls. Physical-device UI remains unverified. The full-coverage goal remains active; next saved leads include Greendot branch-selected food photographs.

Live acceptance: all 175 menu fingerprints, 174 browse entries, 85 schedules, 31 immutable asset hashes, eight rendered new covers, menu search/paging, 204/304 and location boundaries pass. Exact web bytes and both native manifests/bundles pass with unchanged scope identity; physical-device UI remains unverified. No provider calls or browser errors. The first 20-card response is 14,631 bytes, observed 43.6 ms in one sample. During native compilation, app memory was 141.5 MiB and preview 160.6 MiB; this is a transient snapshot, not a benchmark. VPS disk remains 27 GB free.

Archive SHA256: `ee709214ff24750d4d401b36803368c3f357c20db735cf16bf8f64b1efd453d9`. Backup and zero-active-job checks passed. Rollback: `deployment-backups/20261017-branch-covers5`. Evidence: `.local/coverage-2026-10-17c/release.json`. Data/assets are packaged on the VPS; PostgreSQL menu-table migration was not needed.
