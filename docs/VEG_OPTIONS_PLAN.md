# Veg options places: data plan (proposal, 19 October 2026)

Owner request: list places that are not fully vegetarian but have vegetarian or vegan dishes. Their menu
shows **only** the vegetarian/vegan dishes (owner decision). Gather the data in bulk, then let QT Explorer
verify and fill gaps. Not built.

## What Google actually has (researched 19 Oct)

| Google data | Where it comes from | Can we get it? |
|---|---|---|
| Menu tab on Maps/Search | Owner's Business Profile menu editor; menus pushed by Google partners (Actions Center feeds); merchant PDF/link | Not through any paid API. The Business Profile API `getFoodMenus` returns it (with per-dish `dietaryRestriction` VEGETARIAN/VEGAN), but only to accounts that manage that business. |
| Menu photos, "popular dishes" | Owner and customer photos; dish names from owners and reviewers | Not in the Places API. Scraping Maps pages breaks the Maps terms (no scraping, no caching, no building a database from Maps content); signed-out automated browsers get a limited view without menus (seen 19 Oct). |
| `servesVegetarianFood` (yes/no) | Owner/user attributes | Places API (New), Enterprise + Atmosphere tier. Coverage uneven; says nothing about which dishes. |
| `reviews`, `reviewSummary`, `generativeSummary` | Reviews and Google AI | Same tier. Display only, with attribution; cannot be stored. |
| Place ID | Google | Can be stored indefinitely. Everything else may not be stored (coordinates up to 30 days). |
| Places search | Text Search (New): 20 per page, about 60 per query | Paid. Needs many area queries to cover Singapore. |

Prices (lowest tier, per 1,000, after the monthly free cap): Text Search Enterprise + Atmosphere US$40
(1,000 free/month), Place Details Enterprise + Atmosphere US$25 (1,000 free/month), Text Search Pro US$32
(5,000 free). Check the pricing page before spending.

**Conclusion:** paying Google improves *finding* candidates (coverage, open/closed, a vegetarian flag), not
dish accuracy. The dish list must come from the merchant's own menu, ordering page or PDF, which is usually
what Google's Menu tab shows anyway.

## What we already have

- `data/singapore-vegetarian-place-ids.csv`: **2,322 Google place IDs** from the 14 Oct sweep (679 requests,
  240 queries such as "vegetarian restaurants in <area>"). Storing these IDs is allowed.
- `docs/research/location-menu-coverage.csv` eligibility of those IDs: 161 vegetarian-confirmed, **37
  mixed-menu already reviewed with sources**, 342 unresolved, **1,763 never assessed**, 12 suppliers,
  6 food courts. A vegetarian search returns many mixed places, so a large share of the 2,105
  unresolved/unassessed IDs are likely veg-options candidates. This is the starting dataset; no new
  harvest is needed to begin.
- Explorer's existing evidence store, PDF reading, Maps listing capture (2 per venue) and outlet capture.

## Harvest run, 19 Oct 2026 (owner-approved, about US$65)

Scripts `scripts/veg-options/{sweep,enrich,ledger}.ts`; private output in `.local/veg-options/` (gitignored).
Spend ledger `.local/veg-options/spend.jsonl` reserves each call before sending; hard caps search 1,000 and
details 3,600. The old identity ledger (2,419/2,500) is untouched.

- **Sweep** (Text Search IDs Only, free): 60 areas × 4 terms ("vegetarian options", "vegan options",
  "vegetarian friendly restaurants", "plant-based food"), 240 queries, 708 requests, **3,181 IDs**, of which
  **1,432 are new** to our directory. Each query returns at most 60 results, so busy areas may be under-covered.
- **Enrichment** (Place Details Enterprise + Atmosphere): **3,574 lookups**, 0 errors. About 981 were inside
  October's free cap; the rest billed at US$25 per 1,000 (≈ US$65; confirm in Cloud billing).

| Triage | Count | Meaning |
|---|---|---|
| priority | 1,727 | Google says it serves vegetarian food |
| normal | 1,485 | No Google flag |
| fully-veg-check | 243 | Google type is vegetarian/vegan restaurant: check against the main catalogue (Google is often wrong) |
| low | 34 | Google says no vegetarian food |
| skip-not-food | 82 | Not a food place |
| skip-closed | 2 | Permanently closed |
| id-obsolete | 1 | Place ID no longer valid |

1,693 have a website pointer. Stored per place: ID, triage, Google business status and vegetarian flag, and
the website (expires after 30 days, then null). No names, addresses, ratings or reviews. Explorer's queue order:
priority, then normal, then low; fully-veg-check goes to the main catalogue research.

## Name and address run, 19 Oct 2026 (owner-approved, cap 4,000)

Script `scripts/veg-options/identify.ts` (+ `sources.ts`); output `.local/veg-options/identities.json`.
Google's name and postcode (Place Details Pro) are a lookup key; the stored address and map point come from
OneMap, and a name counts as confirmed when the venue's own website shows it. Unconfirmed names and unmatched
postcodes are kept privately for 30 days until QT Explorer confirms them.

- **All 3,571 queued places processed** (excludes 2 closed and 1 obsolete ID). 3,907 Pro lookups, 216 of
  them repeats from early crashes and one overlapping run; about 2,580 were inside October's free Pro cap,
  the rest about US$22.
- **Address and map point from OneMap: 3,496 (97.9%).** 48 have no postcode on Google (often stalls or
  markets) and 27 postcodes are not in OneMap; QT Explorer finds those from the venue or Maps listing.
- **Name confirmed on the venue's own website: 866**; 2,705 pending QT Explorer. Unit number: 462.
- Website pointer: 1,691. Spend ledger repaired once (renumbered, every entry kept; backup
  `spend.before-renumber.jsonl`).

## Recommended pipeline

1. **Seed (no AI, no new Google calls):** the 2,105 unresolved/unassessed IDs plus the 37 mixed-menu
   records. Each already has a Maps link built from its place ID; many have source URLs.
2. **Optional paid enrichment (owner decision):** one Place Details call per seed ID with
   `businessStatus`, `servesVegetarianFood`, `websiteUri` and `displayName` (displayed transiently, not
   stored). Drops closed places and finds the official website. About 2,100 calls ≈ US$28 after the free
   1,000. A fresh area sweep with "vegetarian options"/"vegan options" queries to find places the 14 Oct
   sweep missed: about 60 areas × 4 queries × 3 pages ≈ 720 calls, mostly inside the free cap.
3. **Group by brand:** chains with many outlets (pizza, Japanese, café and Western chains) are verified once
   from the official menu and store locator, then applied per outlet that uses the same menu.
4. **Prefetch menus (code):** fetch each place's own website, ordering page or PDF once into the evidence
   store, rate-limited and robots-respecting. Pull lines labelled V, VG, (V), "vegetarian" or "vegan", or a
   vegetarian section, without a model.
5. **QT Explorer verifies (new "veg options" task):** about 5 places per worker (short dish lists). Each
   dish needs the venue's own vegetarian/vegan label on the stored page, exact name and explicit SGD price.
   No dish is counted from its name or ingredients. Google Maps listing capture confirms branch, hours and
   closure only.
6. **QT Manager reviews**, then **one Telegram digest per batch** (Approve all, or reject single places).
7. **Publish** the place type and the labelled dishes only. Recheck monthly; no remaining labelled dish
   means the place leaves Explore.

## Accuracy rules

- A place qualifies with at least 2 venue-labelled vegetarian/vegan dishes or a vegetarian section.
- Meat and seafood dishes are never stored or shown. The page shows "Vegetarian dishes · 6 of 38".
- No allium-free or five-pungent-free claims for these places; "Not a vegetarian kitchen" on the place page.
- Google ratings, reviews, photos and AI summaries are never stored or reused.
- Fully vegetarian places are never downgraded automatically.

## Expected throughput

Seed of about 2,100 IDs. If about half have a readable labelled menu, Explorer at about 5 places per worker
and several workers per 15-minute tick clears a few hundred places a week; chains clear many outlets at once.
Estimate only; the first pilot batch gives real numbers.

## Open owner decisions

1. Default off in Explore (recommended).
2. Minimum 2 labelled dishes; egg/dairy dishes count as V.
3. Pay for the Place Details enrichment and the extra area sweep (about US$30–60), or start with the seed only.
4. Pilot size (recommended: 50 places, then expand).

## Sources

- Places data fields: https://developers.google.com/maps/documentation/places/web-service/data-fields
- Places policies (caching, place IDs): https://developers.google.com/maps/documentation/places/web-service/policies
- Pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Business Profile food menus: https://developers.google.com/my-business/reference/rest/v4/FoodMenus
- Menu editor: https://support.google.com/business/answer/9455840
- Partner menu feeds: https://developers.google.com/actions-center/verticals/reservations/e2e/add-ons/add-menus/overview
