# Menu, gallery and review refinement

**Latest owner presentation override, 17 October:** `docs/BROWSE_CONTROLS.md` supersedes the long menu sources disclosure below. Display one Last updated date linked to the latest source, and place labelled pagination chevrons beside the dish range. Retain source records and existing menu/filter/cache semantics.

Owner instructions, 17 October 2026, supersede the earlier single-choice discovery filters and 24-point name-midpoint photo feather.

The gallery keeps a clear upper photograph and a 32-point feather above the first title line, blur radius 5 and a semantic dark fade from transparent through 0.58 to 0.76 opacity. This covers every line of long names at enlarged text sizes. Address, distance, rating, diet and opening hours use consistent Ionicons. Nunito Bold at a scaled 20/26 points carries place names; smaller metadata stays readable below. No new font dependency is needed. There is no separate black footer strip.

Ratings shown on cards are real **QuinTaste** community averages/counts, loaded in one bounded aggregate request for the visible catalogue, using the same block/restriction visibility as detail reviews. Empty ratings have an outlined star and honest no-review state; loading/failure never invents a zero rating. The Explore context row pairs the inset location/radius label with the total matching place count from the accepted catalogue response. A failed GPS attempt opens a compact dismissible recovery dialog; it never inserts a notice row above the gallery or changes the existing Work/Home search.

The menu has one place heading, a compact branch row, a Menu / Place & reviews navigation row, dish search, multi-select category chips and compact dish/price columns. Twenty dishes per page bound the page height. Sources, charges and availability qualifications remain under a collapsed Sources & availability section. Menu names, prices/ranges, saved keys and sources are preserved.

Discovery diet, cuisine and price-band filters allow multiple selections. Choices within a group use OR; independent groups combine with AND. Empty selections mean Any. Location origin and radius remain single-choice. Old single-value stored settings and vegan-only API searches remain readable; new array choices persist across reloads and participate in cache/cursor invalidation. Unconfirmed cuisine and venue price bands cannot satisfy a selected filter; no facts are inferred from dish names or prices. Published catalogue cuisine and venue-level price bands remain unconfirmed, so those filters currently yield no matches and the interface explains that unknowns are excluded.

Place reviews accept up to three optional raster photos. The existing camera/library picker prepares bounded JPEG uploads. Publishing text, rating and photo changes is one PostgreSQL transaction. Photos are stored in additive `community.place_review_photo`, at most 450 KB each and 1280 pixels on the longest edge, with EXIF/GPS and other input metadata removed by server re-encoding. Only the review owner can retain, replace or remove its images; older clients editing text preserve existing images. Deleting a review/account cascades to its images. Images honor restrictions/blocks on reads and are never returned inline in review JSON. Thumbnails open a larger viewer. Failed saves retain the selected images and text.

The VPS edge adds a dedicated `/api/place-reviews/` body-limit/rate router for photo uploads; the ordinary 16 KB route limit remains. Rollback restores both the prior images and the protected Compose snapshot, leaving additive photo/review tables and data intact.

## Missing Google reviews: inspected evidence

The older `LivePlaceDetail` requested Google reviews and held normalized place details only in an in-memory five-minute cache (`live-place-cache.ts`). The current owned catalogue route uses a different dataset and does not load that cache. Read-only audits of VPS and local PostgreSQL found no Google review table/columns; existing review storage is QuinTaste place reviews and Market order reviews. Inspection of 228 saved local data/artifact JSON files found no Google review snapshots. The development photo cache and its private recovery backup contain photos, not persisted review text. No cached Google reviews were erased or replaced during this change.

Catalogue details now expose a separately labelled Google reviews link to the exact Google Maps place ID when known (otherwise a place/address search). Google and QuinTaste ratings are not combined. No paid provider calls, automatic Google downloads or feature-control changes were made.

Local evidence: `.local/menu-review-refine/` contains 35 existing review API checks, 23 photo/security checks, 13 catalogue/filter checks, browser confirmation and captures, storage audits and release evidence. Alice/Bob accounts are reused and preserved according to [local testing instructions](LOCAL_TEST_ACCOUNTS.md). Native preview transport checks do not establish physical-device camera, permission, keyboard or screen-reader acceptance.

Implementation references: [Expo SDK 57 ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) and [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/).
