# Gallery coverage continuation — 17 October 2026, batch e

**20261017-operator-covers7 is deployed and live verified on app/preview.** Six new enhanced covers bring coverage to48 of174browse venues, with85sourced hours records.126cover gaps and89hours gaps remain; full coverage is active. Main-card taps open location details, while Menu is separate. Menus stay one dish/name+price or supported range per row.

## Sources checked 17 October 2026

| Covers | Exact branch evidence |
| --- | --- |
| Elemen PLQ and Millenia Walk | [Operator locations](https://www.elemengroup.com.sg/locations), saved16October. Each gallery precedes its own exact branch caption; block IDs and address evidence are recorded in JSON. PLQ's first output invented window scenery and was rejected; the corrected output keeps white clipped windows. Millenia crop excludes dated promotional boards. |
| The Boneless Kitchen | [Operator homepage](https://thebonelesskitchen.com/), saved16October, exact1IrvingPlace#01-31 and matching visible signage. Initial image request406 succeeded with one ordinary browser-header retry, documented in its receipt. |
| Supreme Vege | [Operator homepage](https://www.supremevege.sg/), saved16October, exact12QueenStreet#02-03 and selected dish caption. Floating pieces already exist in the operator's stylized original; the enhancement retains that composition. |
| MTR Singapore | [Operator homepage](https://www.mtrsingapore.com/), saved16October, exact438SerangoonRoad. Food-only Chow Chow Bhath reference selected; inspected advertising poster rejected as a cover candidate. |
| Sproutz Downtown | [Operator homepage](https://www.sproutzdowntown.com/), saved16October, exact15CentralBoulevard#B1-05 and IMG2033 dessert image. |

Full source-image URLs, original hashes, review dates, branch evidence and built-in imagegen prompts are in [the audit](../../data/menu-research/catalogue-enrichment-2026-10-17e.json) and [photo registry](../../data/menus/catalogue-photos.json). Selected JPEGs live in `server-assets/catalogue`; private originals/generated PNGs and prompt receipts remain under `.local/coverage-2026-10-17`. Source attribution/rights are retained; enhancement does not establish a new licence or ingredient/current-availability claims. No expired development cache reader was invoked. Makan Vegan and Soon Lai exact screenshot images remain unrecovered.

Eight hours outcomes are documented in the audit; no schedule changed in this release. New useful evidence includes Boneless Kitchen's [operator-linked TableAgent business hours](https://tableagent.com/singapore/the-boneless-kitchen-korean/) and egg.plant's actual [landlord directory](https://bythebay.com.sg/directory), whose publicly loaded retail JSON supplies its schedule. These continue into the next batch. Kind Kones has an operator unit-number mismatch (#B1-17 versus published#B1-27); that hold stays. Secondary mall-named sites are not treated as actual landlord sources, and delivery windows are not substituted for restaurant hours.

## Verification, deployment and storage

The mandatory live inspection detected a concurrent Cook deployment. The first staging folder was retained privately; a fresh stage was built from **cook-benchmark1** and only the reviewed catalogue JSON/assets overlaid. Archive comparison proves unrelated Cook source/assets are preserved. All16API bundles were exported together with a cleared Metro cache. Isolated TypeScript, uncached scoped lint, catalogue/publication/source-register checks, server module consistency and all three API load orders pass.

Local and live browsers render all six new covers and verify main-card navigation to each exact location page, including available hours and honest missing-hours cases. Existing simple-menu search and40-row paging pass.320px dark/1440px light Greendot scrolling loads four unique images for13cards, with no redownload on returning from location details. No horizontal overflow, provider requests or runtime errors. All175menu fingerprints,174browse entries,85schedules,48cover metadata records,39immutable asset hashes,204/304 responses and location/cursor boundaries pass live. Exact web bytes and Android/iOS manifests/bundles pass with unchanged scope; physical-device UI remains unverified.

39unique JPEG assets total**5,181,884bytes**; this increment adds**561,497bytes**. Server catalogue index140,021bytes; first20card payload14,631bytes. One observed response was70.3ms, not a benchmark. During native compilation, app memory138.7MiB and preview195.1MiB; VPS26GB free/74%used. Existing bounded caches, cancellation/deduplication, account isolation, offline limits and20-summary pagination remain.

Research ledger unchanged2,419/2,500,81remaining; SHA256`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live Google100/8/19/545unchanged. No duplicate menu extraction or changes to2,527food holds. Other unresolved gaps remain109zero-food branches,1,828unnamed candidate IDs and8coordinate holds.

Archive805files, SHA256`1f55d6b17098dcae855bed56040a4a7b98e4036dd080604a2e94f2d2b9fab3aa`. Backup,zeroactivejobs and guarded promotion passed. Rollback`deployment-backups/20261017-operator-covers7`. Admin/database unchanged. Packaged JSON/assets serve the app on the VPS; no PostgreSQL menu-table migration. Evidence`.local/coverage-2026-10-17e/release.json`. This is a verified increment, not completion of full coverage.
