# QT bots: limits removed and resourceful sources (18 October 2026, 9:32 am SGT)

Owner-requested and deployed with `deploy_live_run.py 3`: 17 files, 115 checks passed on the VPS,
backup `operator-tests/live-run-20261018T013231Z`. The previous 3-hour run (7:31-9:32 am) was
stopped gracefully. Result: 107 rounds, 13 records, 4 published updates (2 recipes + 2 photos),
29 AI calls, 2 errors. New run `e2e-20261018T013235Z` ends at 12:32 pm SGT.

## Limits removed (owner)
- No monthly AI-call cap (`monthlyModelInvocations: null`). Every call is still in `state/usage.jsonl`,
  and summaries show the monthly count with "no monthly cap". No image cap.
- No daily role gates. Each round runs Cooker, then Event (discovery every round), then Explorer
  through venues until the round's reserve. Photos for every pending recipe are made in the same round.
- Worker limits are 40 turns and 900 s. The 1-5 am window, the 4:15 research cutoff and the
  Greendot 5-minute courtesy gap remain.

## Safeguards that replace the old stops (independent review x3)
- A role pauses for 1 hour only after 3 consecutive model/provider failures. Validation errors and
  budget-shortened timeouts do not count.
- A venue whose menu cannot load is marked attempted and skipped; it goes in report `notes`.
  Venues already awaiting review are not re-dispatched.
- Manager review: a deterministic failure switches to one-packet-at-a-time review. A single packet
  failing 3 times moves to `quarantinedReview`. Timeouts and outages are only retried.
- Explorer gets an explicit budget and needs at least 600 s. Photos stop starting 1200 s before
  the deadline. Publication needs 1100 s and allows at most 4 photos per review.
- The evidence cache allows 4000 entries / 1 GB, and nothing younger than 72 h is evicted.

## Resourceful Explorer and Event
- Explorer is told each recorded source's stored-copy completeness. It may verify from an
  alternative cited page when that page is the same listing (same path or vendor ID:
  foodpanda `/restaurant/<id>/`, Grab last segment) or a single-branch page showing the branch
  postal code. Otherwise `alternative-unconfirmed`.
- Dish-name matching needs word boundaries. Short names must start a line, after any number or code.
- Rechecks are timed by cause: tooling/source causes 18 h (weekly after 3); a dish absent from a
  copy at least 90% complete waits 14 days.
- Event searches broadly (seed organisers are not limits) and rechecks held leads from the last 7 days.
- New recipes publish only together with an approved photo. Audit-only menu reviews go into one
  end-of-run summary.

## Still open
- foodpanda and other sites can block or partially render pages; holds stay honest.
- AI call volume will be much higher (roughly 100-200 per night). It is not capped; watch provider limits.
- Hermes auto-update around 4:30 am SGT on 19 Oct will recreate the container. The reinstall timer
  has not been exercised for real.
- The image's bundled chrome-headless-shell ignores browser policy; never configure it.

## Schedule change (deployed 1:01 pm SGT, 18 Oct)
Owner request: Explorer runs 24 hours a day because so much menu data is still needed. Cooker and
Event run every day from 6 pm to 10 pm SGT.
- Hermes job `1d0f99df35ff` ("QT team scheduled work") now fires every 15 minutes (`*/15 * * * *`),
  delivery `local`. Each tick takes `state/run.lock`; a tick that finds it busy does nothing.
- `night_window.limits()` gives each tick a rolling deadline of about 55 minutes (`TICK_SECONDS` 3300).
  The last 15 minutes (`RESEARCH_TAIL`) are for review, images and publication only.
- `night_window.role_open()` gates new research per role. `ROLE_WINDOWS` sets qt-cooker and qt-event
  to 18:00-22:00 SGT, with no new start in the final 15 minutes. Explorer, Manager review, images
  and publication are not gated.
- Telegram sends one daily summary at or after 10:05 pm SGT, covering the last 24 hours (key
  `daily-summary:<date>`). The overnight "night-complete" message is gone. Live screenshots for real
  app changes are unchanged.
- All four QT profile `config.yaml` files are again owned by uid 10000 (mode 0600). qt-manager's had
  been root-owned and unreadable, so Hermes was running on its last good settings.
- Backup: `/opt/data/qt-team/operator-tests/schedule-20261018T050121Z`. 117 tests pass on the VPS.
- Expect about 24 Explorer ticks per day. Model calls are uncapped but every call is still ledgered.
  Watch provider rate limits and spend.

## Reasoning effort and missing covers (18 Oct, afternoon)
- All four QT profiles use reasoning effort **high** (was xhigh). Backup:
  `/opt/data/qt-team/operator-tests/effort-20261018T072634Z`. Global Hermes config unchanged.
- Missing covers. Owner flow, bot module `cover_photos.py`:
  1. Explorer searches once a day per branch without a cover, at most one search per round.
  2. It looks for a real photo of that exact branch under CC0, Public Domain Mark, CC BY or CC BY-SA,
     or on a page that explicitly grants reuse.
  3. The coordinator re-checks the stored page capture: licence, branch name/postal code, the quote,
     and that the image file is on the page. It rejects NC/ND/"all rights reserved".
  4. It downloads the image only through the egress guard (12 MB limit, at least 640x400), normalises it
     to a JPEG of at most 1.9 MB in `approved-references/`, and registers it as `pending-owner`.
  5. The Telegram reporter sends the photo with **Approve cover / Reject / Open source page** buttons.
     Approve records `rightsApprovalId owner-telegram-<token>`; Reject excludes that page from future searches.
  6. The next round enhances the photo (`venue_images.enhance_reference`, 3 attempts, 30 minutes apart).
  7. QT Manager inspects both the candidate and the reference pixels, then the publisher sends a venue
     `photo` patch with the original author, licence and source. The owner gets the usual live screenshot
     with Revert.
  8. A revert, a Manager hold, failed enhancement, or no answer within 14 days retires the photo, and
     Explorer searches again.
- App server (commit e4f01bc): `server/editorial/validation.mjs` `ownerReference` accepts an owner-approved
  reference carried in the asset provenance. The static `server-assets/editorial-references.json` still works.
- Only Happy Vegetarian (106 Hougang) lacks a cover today. An open-licence photo of a small hawker stall may not
  exist; then nothing is proposed and the place keeps its honest no-photo state.
- `run_model` now allows read-only browser tools. Script execution, CDP and credential-vault tools stay blocked.

## Event relevance and wording (18 Oct, evening)
- Owner removal, 7:03 pm SGT: five community Deepavali celebrations (Siglap South, Anchorvale, Punggol 21,
  Cheng San, Pasir Ris Elias) and the Tampines Central muscle-loss talk. Vegetarian was only one buffet option,
  or no food was served. Log: `/opt/data/qt-team/operator-tests/owner-event-removal-20261018T110324Z.json`.
  Owner removals block republication.
- Owner rule: vegetarian food must be the point of the event. Event now returns `vegetarianFocus`, and
  `workflow.normalize_event_packet` holds each event that is not `all-food-vegetarian` or
  `vegetarian-cooking-or-food-class`. It also holds a description over 200 characters or written in
  reviewer wording, and an over-long fee note.
- `dietEvidence` is user-facing: one sentence of at most 160 characters. `feeAmount` is the lowest SGD price,
  and `feeNote` is a short fee line. The publisher passes the bot's `feeNote` instead of the old stock
  sentence and strips non-app fields.
- `events_to_refresh` lists published events that still have reviewer wording or the old fee note. Event
  re-proposes each one once (`state.eventRefreshAt`).
- App (commit 46b6655, `ExternalEvents.tsx`): the expanded event shows the address, description, the fee
  note when there is one, and a single "Checked … Confirm details with the organiser." The fee tag reads
  "From S$x" when the fee note lists several amounts.

## Cooker quality bar (18 Oct, evening)
- Owner rule, strict: the source must show **4.5+ stars from 20+ ratings** and be **naturally allium-free and
  vegetarian as the author wrote it**. It must take **30 min or less** and use **at most 12 ingredients**. Every
  ingredient but one must be on `pantry_sg.json` (730 names in about 40 groups).
- The QuinTaste version keeps to **8 steps**. Source pages are allowed up to 16 HowToSteps because sites split
  easy recipes finely.
- `recipe_quality.py` reads the page's own schema.org Recipe data through the egress guard (cached 7 days in
  `state/recipe-data/`). It never relies on the model's account of the page.
- Two stages:
  1. `shortlist()`: Cooker names up to 8 pages; the bot code scores them and favours the least-represented app
     categories.
  2. Cooker writes only the best two `approvedSources`. `gate()` holds any proposal (recovered ones included)
     whose source or adaptation misses the bar, and attaches `sourceRating`.
  - No passing page is a valid outcome (`LookupError`), not a failure.
- App (commit 75fd975): `sourceRating` is validated by the server and shown in Recipe info as
  "Original rated 4.8 by 124 cooks on site".
- `audit_published()` checks bot recipes already live, four per round. A recipe below the bar goes to Telegram
  with **Remove recipe / Keep**.
- First live probe (read-only):
  - Kuih kodok (Rasa Malaysia) and green bean gomaae (Just One Cookbook) pass.
  - Most others fail on missing ratings, too few ratings, time, or seafood in the source.
- The same deploy carries the QT Gamer hooks, coordinated with that session, after my 19:25 Event deploy
  overwrote them.
- Creator credit (same evening, commit ac88ce1; bot deploy `creators-20261018T115113Z`):
  - Every source must name a person or organisation as author. Linked `@id` authors (Yoast, WP Recipe Maker)
    are resolved, so Rasa Malaysia shows "Bee Yinn Low".
  - `trusted_creators.json` (26 sites) gives a ranking boost and serves as search starting points.
  - `gate()` sets the recipe author from the page data. Recipe info reads
    "Recipe by <author> (<site>) · Original rated 4.6 by 73 cooks".
- Chinese recipes: there is no language limit. The checks read Chinese ingredient lines:
  - alliums such as 蒜 and 葱;
  - meat and seafood, while allowing 素鸡/素肉, 鸡蛋, 牛奶 and 肉桂;
  - Chinese source lines skip the pantry check, which applies to the English QuinTaste version instead.
  - Xiachufang (HTTP 418) and Douguo (403) block automated reading and are skipped.
  - Meishichina and Meishij publish no ratings, so they cannot pass.
  - Chinese cuisine therefore comes from rated creators: China Sichuan Food, Red House Spice, The Woks of Life,
    Made With Lau, Tiffy Cooks, Omnivore's Cookbook, Huang Kitchen.

## Code review fixes and no caps (18 Oct, night)
- No AI call, image or daily cap anywhere. The live policy is null for all three, and the reporter no longer
  falls back to 2,000.
- `workflow.rotate_runs` compresses run folders older than 14 days into `archive/` once the run archive passes
  60% of its limit. Folders still in the review queue are kept. The 537 MB limit would otherwise have stopped
  24-hour research in about 10 days.
- `workflow.run()` is now 27 lines. The `Round` class has one method per stage, each under 60 lines.
- Each round fetches the live app state once. Publication still fetches its own, because it needs the current
  revision.
- Fixes:
  - `recipe_quality.NothingToCook` replaces `LookupError`. A real KeyError is now reported, not swallowed.
  - `gate()` uses only the primary (first) source, so a rating can't be borrowed from another cited page.
  - The audit skips transient page-read failures instead of recording them as fails.
  - `PT0M` counts as no published time, and kombu dashi is allowed.
  - A re-proposed event without a fee note keeps the stored one.
  - The publisher publishes a cover only if the Telegram listener's own record shows the owner's Approve tap
    (`owner_tapped`).
  - Events that Event excludes while live go to `state/event-exclusions.json`, and Telegram asks
    Remove/Keep.

## Whole-venue diet proof (18 Oct, night)
- Owner question: why does a "vegetarian" place list BLT or bacon? A sweep of all 174 live menus
  (`state/diet-sweep-20261018.json`) found 100 venues with meat- or seafood-named dishes. They are Chinese
  vegetarian restaurants serving plant-based versions: Nature Vegetarian Delights, Zi Zai, SHU, Greenland,
  D'Life and others.
- Ahimsa Sanctuary's own site says "vegan", so its BLT and "fishy business" are plant-based. It is labelled
  Vegetarian; Explorer will propose Vegan once its quote is verified.
- An Açaí Affair's FAQ says most of the menu is vegan, with yogurt, honey and whey the exceptions, so
  Vegetarian is correct.
- `diet_review.py`:
  1. Once every 180 days per venue, Explorer gets `dietChecks` (current diet plus up to 10 meat-named dishes).
  2. It must return `dietReview` with a quote of at most 25 words from the venue's own page.
  3. The coordinator checks the quote is on the stored page and contains vegetarian, vegan, plant-based, 素 or 斋.
     A whole-venue Vegan label needs a vegan or plant-based quote.
  4. A `venueDiet` proposal without verified proof is dropped.
  5. Unconfirmed venues go to `state/diet-flags.json`, and Telegram tells the owner, who can hide them in
     Admin > Content.
- App (commit 59a41e6): a menu with meat-named dishes shows "Every dish here is vegetarian. Names like fish or
  chicken are plant-based versions."

## Optional recipe nutrition (18 Oct, night)
- Owner rule: nutrition is shown when reliable and otherwise left out. It is **never** part of the recipe bar,
  so a good recipe without figures still publishes.
- `nutrition.py`:
  1. Uses the source page's own schema.org NutritionInformation (per serving, sanity-checked).
  2. Otherwise estimates from `nutrition_sg.json`: 192 reviewed ingredient keys mapped to USDA FoodData Central
     SR Legacy (public domain, April 2018), per 100 g. Cooker supplies the gram weight for each ingredient.
     The estimate is shown only when matched ingredients cover at least 90% of the weight and no measured
     ingredient is unweighed.
  - Attached in `recipe_quality.gate()` after a recipe passes. Failures are swallowed, so the recipe just has
    no nutrition.
- The full USDA extract stays on the VPS at `state/usda-sr-legacy.json` (7,793 foods) for future additions to
  the table.
- App (commit a7d0594): `nutrition` is validated by the server (basis source/estimate, coverage 0.9 or more,
  bounded values). The recipe page shows a collapsible "Nutrition Per Serving" with "From <site>." or
  "Estimated from the ingredients (USDA data)." plus "Not dietary advice."

## Morning check, 19 Oct (6 am SGT)
- Hermes auto-updated to v0.22.2 around 5 am and recreated the container. The reinstall timer restored Chromium
  and the browser policy. The QT profiles kept reasoning effort high, and all services are active.
- Fixes, deployed with backups `morning-fixes-20261018T220651Z` and `publish-guard-20261018T220840Z`:
  - Hermes 0.22 adds a read-only `tool_search`. `run_model` now allows `tool_search`/`tool_describe`; before
    this, 4 Explorer rounds were voided.
  - The Cooker shortlist prompt no longer asks the model to filter by ratings it cannot see in extracted
    text. The coordinator reads the ratings.
  - `diet_review`: a venue's own "no animal products" statement now counts as vegan proof. Kind Kones was
    re-verified as vegan and its flag cleared.
  - QT Manager was holding any recipe with sesame for a missing allergen tag the app cannot store. Its prompt
    now lists the app's fixed tags.
  - The sesame-held, already-rated broccoli recipe is being re-reviewed. Five pre-bar recipes stay held.
  - Publish guard: a new recipe needs the `sourceRating` that only `recipe_quality.gate` attaches.
- Still live from before the bar, and sent to the owner on Telegram as Remove/Keep:
  - Pumpkin millet porridge
  - Vella aval
  - Carrot salad
  - Masala chai
  - Steamed egg custard
  - Cabbage poriyal
- VPS disk: 17 GB free (83%). Docker build cache is 21.5 GB (18.6 GB reclaimable) and grows with each app
  deploy; there are also 6.2 GB of unused images.

## PDF menus and diet-check noise, 19 Oct (12:30 pm SGT)
- Owner report: MOD Cafe showed "Price unavailable" for all 27 dishes, while Google Maps lists prices. Diet
  checks for MOD Cafe and Fennel came to Telegram as unconfirmed.
- Explorer cannot use Google Maps by design: no Google calls, and the Places API has no menus. The Google Maps
  menu repeats the merchant's own PDF. Explorer had found that PDF, but the extract provider returns HTTP 422 for
  PDFs, and this PDF is a single scanned image with no text layer. 12 PDF captures had failed this way (MOD
  Cafe, Greendot, Tung Lok LZ, Nalan and others).
- Fixes, deployed with backups `operator-tests/pdf-menus-20261019T042400Z` (later passes 042536Z and 042657Z) (126 tests pass):
  - `pdf_capture.py`: `web_extract` reads PDFs through the guard proxy (20 MB, 4 pages). A text layer is used as
    is. A scanned page is transcribed by the vision model and labelled "[Transcribed by the vision model ...]".
    Results are cached per PDF hash (`state/pdf-text`). `pypdf` 6.21.1 is bundled in `/opt/data/qt-team/vendor`.
  - `menu_coverage`: a venue's own recorded menu may print bare prices ("22.9"). These count as SGD only when the
    price ends the dish's line, ignoring [AF]/[VG] badges and Hot/Iced labels. Other pages still need S$/SGD.
    Pages showing other currencies are excluded.
  - Live check: the MOD PDF transcription matches the printed menu. Aloha Burger 22.9, Alvin's Fish & Chips
    19.9, MOD Sliders 18.9, Fried Mantou 7, Latte 5.9/6.9 and Shoe String Fries 6 all match.
  - `diet_review`: a quote may come from the page title (MOD Cafe's quote was its official title). A quote that
    is missing from the stored page retries once before the owner is asked; captures that landed after the check
    caused two of the flags. Explorer's instruction now accepts the parent brand's own site and says
    delivery-platform text copied between items does not outweigh an explicit whole-venue statement.
    Collagen, gelatin or real meat on the venue's own menu still means not-confirmed.
  - Recheck: MOD Cafe, The Crowded Bowl SP and Sangeetha Bhavan were cleared. Six remain:
    - An Açaí Affair: a collagen add-on.
    - Original Sin: set-menu PDFs list pescatarian seafood.
    - Mani Iyer and Bao Su Zhai: weak evidence.
    - The Crowded Bowl NTU: the quote is not on the stored page.
    - Fennel: delivery-platform conflict. Rechecked under the new rule on its next visit.
- MOD Cafe's prices appear after Explorer's next visit and the Manager-reviewed publication.

## Google Maps for Explorer, 19 Oct (afternoon)
- Owner direction: Explorer may use Google Maps "when needed, be smart about it". This supersedes the earlier "zero
  Google Maps calls" rule for Maps web pages. The paid Places API (googleapis.com; ledger 2,419/2,500) stays
  blocked.
- `maps_capture.py`: `web_extract` of a Google Maps link
  (`https://www.google.com/maps/search/?api=1&query=<name + address>` or a `/maps/place/` link) opens it in the
  guarded Chromium, expands the weekly hours and stores the listing text in the evidence cache (method
  `browser-google-maps`).
  - One capture at a time, at least 15 s apart, reused for 24 h. A challenge or "unusual traffic" page pauses
    Maps for 24 h and is never bypassed.
  - Google serves automated, signed-out browsers a "limited view". It shows category, rating, address/postcode,
    open or permanently/temporarily closed, today's/weekly hours, website and phone, but no menu or reviews.
  - Changing the browser identity to escape that view would be evading Google's bot controls, so it is not done.
  - Menu prices therefore still come from the venue's own pages and PDFs.
- Explorer rules:
  - Use Maps to confirm the branch, closure, hours and official website when own pages are missing, dead or
    disagree, and for diet checks. The business's own category (e.g. "Vegetarian restaurant") counts as a
    reliable listing.
  - At most two Maps extracts per venue. Never reuse Google photos or reviews.
  - Closure: Explorer returns `closure` with a quote, and `diet_review.closure_check` verifies it against the
    stored page. The owner gets one Telegram "Closure check" message (`state/closure-flags.json`) with Open place
    and Open source buttons. The venue stays listed until hidden in Admin > Content.
- First finding: Google Maps lists Fennel by Komala Vilas (413 River Valley Rd) as Permanently closed. That is why
  its own site could not be read and its diet check was unconfirmed.
- Risk noted for the owner: Google's Maps terms restrict automated collection of Maps content. Use stays small,
  per venue and as evidence only.

## Closed venues leave Explore automatically, 19 Oct (afternoon)
- Owner: closed venues should be removed from the Explore data automatically.
- App (commit 640ad22):
  - The editorial venue record accepts `closed: {status: 'permanently-closed', sourceUrl, quote, checkedAt}`. The
    quote must mention closed.
  - `closedVenues()` adds those venues to the withdrawn set in `/api/catalogue` and `/api/menus`. The venue leaves
    search, place pages and menus. Saved bookmarks show it as no longer published.
- Bot:
  - `publisher.closure_candidates` turns each verified permanent closure (`state/closure-flags.json`, written only
    when the quote is on the stored page) into a venue publication. QT Manager reviews it like any other.
  - The Telegram notice is text, not a screenshot: "Removed from Explore — <venue>", the quote, and the buttons
    Revert this update and Open source.
  - Revert restores the venue, and the owner's revert blocks automatic re-removal.
  - Temporary closures only send a "Closure check" message; the venue stays listed.
