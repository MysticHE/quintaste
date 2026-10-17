# Reviewed catalogue enrichment — 17 October 2026, batch u

**Deployed and live verified: `20261017-verified-gaps24`**, based on `20261017-source-covers23`. Further coverage work is active at the user’s request. Full coverage remains incomplete.

This batch adds 3 exact-branch cover associations and 1 hours records. Coverage is **154 covers and 91 schedules across 174 browse locations**; 90 locations have reviewed menus, covers and hours. Remaining: 20 cover gaps and 83 hours gaps.

## Branch sources

| Branch | Source |
| --- | --- |
| research-verimix-le-quest-01-17 — 4 Bukit Batok Street 41 #01-17 Le Quest Mall, Singapore 657991 | [Image source](https://www.foodpanda.sg/restaurant/qzse/verimix-vegetarian-le-quest-mall), reviewed 2026-10-17; source capture 2026-10-16T23:06:29.026033+00:00. |
| research-ur01-kind-sprout-sengkang — Singapore 793461 | [Image source](https://take.app/kindsproutsg), reviewed 2026-10-17; source capture 2026-10-16T12:43:50.212617+00:00. |
| research-living-wholesome-bukit-timah — 2A Jalan Seh Chuan #01-060, Singapore 599213 | [Image source](https://www.foodpanda.sg/restaurant/wd61/living-wholesome-vegetarian-food-fortune-centre), reviewed 2026-10-17; source capture 2026-10-15T08:18:44.197Z. |
| research-omg-donuts-margaret-market | [Hours source](https://margaretmarket.sg/our-vendors/), checked 2026-10-17. |

Full source image URLs, source hashes, branch evidence, builtin imagegen prompts, changes and attribution are preserved in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17u.json). References and selected generated PNGs remain in `.local/coverage-2026-10-17`; production JPEGs are content-addressed under `server-assets/catalogue`. Each selected reference/output was visually inspected. Shared imagery does not create duplicate venues or establish current stock. No new licence is inferred from enhancement.

## Verification and performance

Live acceptance passes all 175 menu fingerprints, 174 unique browse entries, 154 photo records, 91 schedules, and all 122 asset hashes/immutable headers. Main card navigation opens exact location details; Menu stays separate. All new rendered cards and three simple-menu/search/paging cases pass. Narrow dark/wide light cache tests pass, with zero runtime errors or unintended provider requests. Existing missing-hours fallbacks remain honest.

Catalogue validation, three postal/API load orders, clean export and consistent module registry pass. Source is byte-preserved from the previously TypeScript/lint verified live baseline. All 16 API bundles come from one clean export; unrelated Cook/navigation work is preserved. Exact web bytes, Android/iOS manifests/bundles and unchanged scope pass. Physical-device appearance remains unverified.

122 unique image assets total 16,799,502 bytes. Catalogue index: 194,173 bytes. First 20 summary response: 21,098 bytes, 22.8 ms in one live sample, not a benchmark. Existing visible-only image loading, bounded caches, 20-record catalogue pages, account isolation, cancellation/deduplication, offline limits and204/304 revalidation remain. Memory/disk snapshots are stored in release evidence.

Menus remain 175 IDs / 223 source menus / 12,084 source occurrences. One preserved 150 Green source alias yields 174 browse cards. All 2,527 held foods, 109 zero-food research branches, 1,828 unnamed candidate IDs and3coordinate holds remain. Exact MakanVegan/SoonLai screenshot images remain unrecovered.

Google research ledger remains 2,419/2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters100/8/19/545 are unchanged. No new Google calls or duplicate extraction.

Archive: 878 files, SHA256 `2859af5452fd60d0aad28a3ce8addbad4d94f3f4ba9a29417deef02e47858e36`. Guarded promotion, backup and zero-active-job checks passed; app/preview healthy. Rollback: `deployment-backups/20261017-verified-gaps24`. Admin/PostgreSQL unchanged; data is deployed as packaged JSON/assets, without a menu-table migration. Evidence: `.local/coverage-2026-10-17u/release.json`.


## Location and source-review supplement

Five prior coordinate holds are resolved: Kind Sprout's operator-published postal point; exact named OneMap buildings for Funan, Ngee Ann City, Bukit Timah Interim Hawker Centre and the Lorong8ToaPayoh hawker centre. These are approximate building/postal points. Source URLs/check dates, selected rows, prior holds and qualifications remain in the JSON audit. Ngee Ann City's391/391Ablock suffix difference is explicit; canonical operator address was preserved. The index now has172located menu IDs, corresponding to171of174browse locations.

The remaining three coordinate holds concern Ananda's95/94SyedAlwiRoad difference, TofuG's97/96AmoyStreet difference and CrowdedBowl's campus/contradictory postal fields. No point was guessed. All five approved records pass actual1kmcentered owned-catalogue searches, with distance0 at their saved point and no provider call.

Verimix's new cover is matched to its exact merchant hero and landlord unit. The landlord image itself is only a logo; mall opening hours remain unassigned. Kind Sprout's postal and product-image token occur in the same saved primary page. Living Wholesome's existing enhanced brand bowl was reused with an explicit shared-food qualifier; no DFD photograph was copied or generated. OMG!Donuts' hours come from the exact tenant section of Margaret Market's directory; the ordinary403fetch and successful web-tool access are both recorded.

All43unique saved operatorPDFs were reviewed for hours-only evidence;9matched. No further unknown venue schedule was approved. Food extraction was not repeated. Fresh TypeScript, normal-workspace uncached lint and full live browser checks pass. Physical-device acceptance remains open. [Current174-branch checklist](current-catalogue-readiness-2026-10-17.md).
