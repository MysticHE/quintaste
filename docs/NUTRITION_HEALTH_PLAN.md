# Nutrition and health benefits for Cook recipes — plan (19 October 2026)

Owner decision, 19 October 2026: free facts and badges for everyone; paid QuinTaste Plus for personal guidance at S$5.98/month or S$39.98/year, launched only after 100 recipes carry figures. Phase A is built (see §7); Phases B and C are not.

## 7. Phase A status (built 19 October 2026, not deployed)

- **Estimator in the app repo**: `scripts/recipe-nutrition.ts` with the reviewed key table `scripts/nutrition/ingredient-table.json` (107 keys, Singapore names and aliases, gram weights per unit, named USDA analogues) and `scripts/nutrition/usda-subset.json` (91 USDA SR Legacy rows, public domain). Rules: a recipe gets figures only when every measured line is matched and weighed; "to taste" lines are skipped and the page says so; water, pandan, tea leaves and curry leaves count as matched with no nutrients; a nutrient is left out when more than 10% of the nutritive weight comes from USDA rows that lack it (SR Legacy has no sugar value for tempeh, fermented tofu, millet and some spices). Cooking losses are not modelled: the figures are the raw inputs per serving, as recipe sites report them. The planned LLM parsing step was not needed for the current ingredient vocabulary; the table is the reviewed mapping the plan asked for, and unmatched lines are reported by the script for review.
- **Result**: all 18 bundled recipes carry estimates (`src/data/recipe-library/nutrition.ts`, merged in `src/data/recipes.ts`). All 9 live bot recipes also estimate (`.local/nutrition/live-recipes.json`); they are **not yet published** because the bot's `nutrition.py` on the VPS could not be read from this session and the editorial publish path is HMAC-signed by Hermes. Next step for the owner: either let the bot adopt this table (`nutrition_sg.json` regenerated from `ingredient-table.json` plus the USDA subset) or apply the nine figures through Admin > Content.
- **Standards in code**: `src/config/nutrition-standards.ts` holds the HPB Aug 2024 claim criteria used (light meal ≤300 kcal; HDP meal ≤500 kcal; source of protein ≥12% energy and ≥10 g; high in protein ≥20% energy; source of fibre ≥1.5 g/100 kcal; high in fibre ≥4 g per serving or ≥3 g/100 kcal; low in sugar ≤2 g per serving for meal types; sodium at or under 15% of the 2,000 mg daily limit) and the two approved nutrient function claims shown ("Protein helps in tissue building and growth."; "Dietary fibre aids in digestion."). Per-100 g criteria (low sodium, low fat) are not applied because recipes carry no serving weight. Percent of day uses 2,000 kcal, 2,000 mg sodium, 50 g sugar and 26 g fibre.
- **UI**: the "Nutrition Per Serving" section on the recipe page opens by default when figures exist, with badges, value and percent-of-day columns, one benefit line with its HPB claim number, the basis line, a "to taste not included" note and "Not dietary advice"; recipes without figures show "Unavailable: the ingredients could not all be matched to a reviewed nutrition table." No card badges or filters yet (Phase B).
- **Known limits**: micronutrients (iron, calcium, B12) are not in SR Legacy's macro extract and wait for Plus; ENCF is not used yet; analogues are named in the script report (hoisin for tim cheong and kecap manis, sriracha for chilli paste, miso for doubanjiang and fermented black beans, oyster sauce for the vegetarian version, egg noodles for yellow noodles, wonton wrappers for popiah skins); blanching or boiling salt is counted in full, so sodium can be overstated for blanched dishes.

## 7a. Bot adoption (prepared 19 October 2026, owner-authorised, deployment pending)

- **Why the bot never produced figures**: its estimator required a gram weight per ingredient line from the Cooker model (`grams`), which the published recipes never carried, so every estimate was refused. The source-page path (`from_page`) needs schema.org NutritionInformation, which none of the nine live sources publishes.
- **New module** `scripts/nutrition/bot/nutrition.py` (drop-in for the VPS `nutrition.py`): reads a v2 `nutrition_sg.json` generated from the app's reviewed table (`npx tsx scripts/recipe-nutrition.ts --bot <out>`: 107 reviewed foods with unit weights plus 82 of the bot's legacy whole-word keys from `bot-legacy-items.json`), matches the longest alias, weighs each line from its unit, uses the Cooker's gram estimate only for units the table cannot weigh, and applies the same 90% coverage, 10% missing-nutrient and "to taste" rules as the TypeScript script. Both implementations give identical figures for the nine live recipes.
- **Publisher change** (`publisher-nutrition-estimate.patch`): `nutrition_candidates` falls back to the table estimate when the page publishes no figures, so live recipes get a reviewed revision through the normal QT Manager review and HMAC publication at the next Cooker publication run (6-10 pm SGT). The evidence line names the basis and coverage.
- **Tests**: `test_nutrition.py` (9 tests: unit weights, longest alias, unweighable lines, Cooker-gram fallback, missing-nutrient omission, page-first, v1 table refused, backfill with and without figures). Locally the bot suite runs 145 tests with these files; the only error is an unrelated vendored module missing from the local copy.
- **Deployment**: `deploy.sh` backs up to `operator-tests/nutrition-table-<stamp>/`, installs the four files as root-owned read-only, runs the suite in the Hermes container, writes `release.json` with hashes and dry-runs the backfill. Uploaded so far: nutrition.py, nutrition_sg.json, publisher.py (as `/root/qt-nutrition-upload-*`); the session's permission classifier blocked uploading test_nutrition.py and running the script, so the owner runs the last step.

## 8. Phase B status (built 19 October 2026)

- **Cards**: each Cook recipe card shows one white nutrition line with at most two HPB badges in claim order (`recipeBadges` in `src/utils/nutrition.ts`, rendered by `RecipeRow`); recipes without figures show no line. The card's accessible label includes the badges.
- **Filters**: Recipe filters gains a "Nutrition" group with four multi-select choices that AND together: Under 500 kcal (also matches Light meal), Higher protein (Source of or High in protein), Higher fibre (Source of or High in fibre) and Under 300 mg sodium (`nutritionChoices` in `src/types/recipe-workspace.ts`, `matchesNutritionChoices`, applied in `browseRecipes`). Choices save immediately with the other Cook filters (`CookBrowse.nutrition`, validated on load, legacy records read as none), count in the active-filter total and reset with Reset filters. Recipes without figures drop out while any nutrition choice is on.
- **Verified** in the local web preview: all 18 bundled cards carry badge lines; Under 500 kcal narrows the list from 18 to 8 and the choice survives a reload. Not verified on a physical device.
- **Not built**: the free goal picker (age band, sex, one goal) planned as the Phase B take-up measure; it belongs with the Plus profile work and should be built only when the owner wants the beta measurement.

Original question: does Cook show nutrient levels and health benefits per recipe, how are they measured and mapped to standards, how can AI add them, and should they be a US$9.99/month subscription?

## 1. What exists today

| Piece | State | Where |
|---|---|---|
| Nutrition section on the recipe page | Built. Collapsible "Nutrition Per Serving" with kcal, protein, carbs, fat, fibre, sugar, sodium, a "From site" or "Estimated (USDA)" line and "Not dietary advice". Rendered only when a recipe carries `nutrition`. | `src/components/recipes/NutritionFacts.tsx`, `src/screens/food/RecipeDetail.tsx` |
| Recipe data field | Built. `Recipe.nutrition` with `basis: source \| estimate`, `coverage`, `checkedAt`, bounded per-serving values; the server rejects out-of-range values. | `src/types/food.ts`, `server/editorial/validation.mjs` |
| Bot pipeline | Built, never yielded. `nutrition.py` takes the source page's schema.org NutritionInformation, else estimates from a 192-key Singapore ingredient table mapped to USDA SR Legacy, only when matched ingredients cover 90% of weight. Failures are silent. | QT bot repo; see `docs/research/QT_BOTS_REMAINING_GAPS_2026-10-18-limits.md` §"Optional recipe nutrition" |
| Figures actually shown | **None.** 0 of 18 bundled recipes and 0 of 9 live bot recipes carry `nutrition` (checked 19 Oct against the live `/api/editorial/recipes`). | — |
| Health benefits | **Absent.** No field, no content, no UI. | — |
| Health badges / scores | Absent. The 17 Oct Cook benchmark deliberately listed "health scores or nutrient claims" as a non-goal. | `docs/research/reports/Recipe app feature benchmark.md` |
| Paid plans | None. The PRD gates store billing to Phase 3 (QT-035) and the AI features to Phase 4 (QT-059 to QT-063). The Lotus plan designs one-off In-App Purchases, not subscriptions. | `docs/PRD_COVERAGE.md`, `docs/AVATAR_LOTUS_PLAN.md` §6 |

Conclusion: the feature is 20% built (schema, validation, one UI section) and 0% delivered. Members see nothing.

## 2. How nutrient levels are measured and mapped to standards

### 2.1 Measuring a recipe (what every serious app does)

1. **Parse each ingredient line** into a canonical food and a gram weight. "2 tbsp light soy sauce" becomes `soy_sauce_light`, 30 g. Volume to weight needs a density per food; "1 onion" needs a typical-unit weight.
2. **Look up nutrients per 100 g** in a reference composition database and multiply.
3. **Apply cooking losses**: USDA yield factors (water loss or gain) and nutrient retention factors (vitamins lost in boiling, oil absorbed in frying).
4. **Divide by servings.** Report per serving, and optionally per 100 g.
5. **Report confidence.** Unmatched ingredients, missing weights or "to taste" lines lower coverage. Below a threshold the honest output is "Unavailable", never zero.

### 2.2 Composition databases

| Database | Use | Licence |
|---|---|---|
| **HPB Energy & Nutrient Composition of Food (ENCF)**, Singapore | Local dishes and ingredients: kway teow, tau pok, tau kwa, kaya, ikan bilis substitutes, mock meats, sambal, belacan-free pastes. Best match for Singapore cooking. | Public reference; confirm reuse terms before bulk extraction |
| **USDA FoodData Central** (SR Legacy, Foundation Foods) | Generic ingredients: tofu, rice, oils, vegetables, legumes. Already on the VPS (7,793 foods). | Public domain |
| **FAO/INFOODS, ASEAN Food Composition Tables** | Regional fill-ins | Open |

Rule: prefer ENCF for anything with a Singapore name, USDA for generics, and keep the mapping table human-reviewed (`nutrition_sg.json`, today 192 keys).

### 2.3 Mapping nutrients to standards

**Singapore (primary, since the app is Singapore-only)**

- **Regulator**: since 2 May 2024 nutrition labelling and health claims sit with MOH and HPB, food safety with SFA ([HPB nutrition labelling and claims](https://www.hpb.gov.sg/healthy-living/food-beverage/nutrition-labelling-and-claims)).
- **Daily reference values**: HPB Recommended Dietary Allowances for Singapore adults (energy about 2,200 kcal men / 1,800 kcal women; sodium under 2,000 mg; fibre 20 g women / 26 g men; protein about 0.8 g/kg). These are the denominators for "% of a day".
- **Healthier Choice Symbol nutrient guidelines**: per food category thresholds for sodium, sugar, saturated fat, fibre and wholegrain ([HealthHub overview](https://www.healthhub.sg/live-healthy/make_healthier_choice)). Category tables are in HPB's HCS Nutrient Guidelines PDFs.
- **Healthier Dining Programme**: a certified meal is **500 kcal or less**, drinks **5 g sugar per 100 ml or less** ([HPB HDP extension](https://www.hpb.gov.sg/newsroom/healthier-dining-programme-extended-to-include-food-in-hawker-centres-and-coffee-shops/); [Malay Mail explainer](https://malaymail.com/news/malaysia/2025/12/01/what-the-mychoice-logo-means-and-how-chagee-beat-other-tea-chains-to-join-the-healthier-dining-programme/200013)). Recipes are meals, so this is the right frame for a "Healthier meal" badge.
- **My Healthy Plate**: half vegetables and fruit, a quarter wholegrains, a quarter protein. A plate-shape score is simple to compute from ingredient groups.
- **Nutri-Grade** applies to beverages only; use it for the Desserts & drinks category.
- **Claims law**: nutrition claims ("low sodium", "source of protein", "high fibre") have fixed numeric conditions in the Food Regulations; health claims are limited to HPB's approved list (nutrient function, other function, disease risk reduction) in *A Guide to Nutrition Labelling for Food Products*, Section 6 and Appendix II ([claims guidance, Nov 2025](https://isomer-user-content.by.gov.sg/484/0851e8d4-af1d-4c60-98bd-c53c382c4fe5/guidance-document-for-application-of-new-claims-(nov-25).pdf); [ASEAN claims overview](https://www.tilleke.com/insights/food-health-claims-challenges-asean-manufacturers/3)). These rules bind food labels, not apps, but they are the safest vocabulary for an app too, and they are what HPB will expect if QuinTaste ever partners with them.

**International (for consistency and future markets)**

- **Codex CAC/GL 23-1997** guidelines for nutrition and health claims (the template Singapore follows).
- **WHO**: free sugars under 10% of energy, sodium under 2 g/day, 400 g vegetables and fruit a day.
- **EU Regulation 1924/2006** register of authorised claims (strictest list; a claim that passes the EU register passes nearly everywhere).
- **US FDA** Daily Values for percent-DV display.

### 2.4 From nutrients to "health benefits" without breaking the rules

A health benefit statement is a claim. The safe design is three layers, each stricter than the last:

1. **Facts**: the seven figures plus percent of the HPB daily value. Always allowed.
2. **Badges**: computed from HPB thresholds, worded as the law words them. "Lower in sodium", "Source of fibre", "Under 500 kcal", "Higher in protein", "Wholegrain", "Plate-balanced". Never "healthy" as a bare adjective, never a numeric health score (the benchmark's rejection of scores stands).
3. **Benefit lines**: only sentences drawn from the approved nutrient-function list, tied to a nutrient the recipe genuinely provides at claim level. "Fibre helps keep your digestion regular." "Calcium is needed for strong bones." No disease, weight-loss, diabetes, blood-pressure or cholesterol wording, ever. Each line cites HPB or HealthHub.

Everything carries "Estimated, not dietary advice" and the basis (source page or ingredient estimate).

## 3. How AI fits (and where it must not)

AI never invents a number. It does the parsing and the plain-English, and deterministic code does the arithmetic.

| Step | Who does it | Notes |
|---|---|---|
| Ingredient line to canonical food + grams | **LLM with structured output**, constrained to the reviewed key list; proposes new keys with a confidence | Replaces the brittle string match that has yielded zero results. Unknown keys go to a Telegram review queue for the owner, and the table grows from 192 toward about 600 keys. |
| Per-100 g lookup, yield and retention factors, per-serving totals, coverage | **Deterministic code** (extend `nutrition.py`) | Same as today, with the coverage threshold kept at 90%. |
| Threshold badges | **Rules engine** from HPB tables | Versioned table in the repo; a change in HPB criteria is a data edit, not a prompt edit. |
| Benefit lines | **LLM, retrieval-constrained**: it may only select and lightly rephrase sentences from the approved-claims file, given the recipe's badge set | Output validated against the allow-list; anything outside is dropped. Owner samples 10% on Telegram in the first month. |
| Personal fit ("fits your day") | **Deterministic**: recipe nutrients against the member's targets | Targets come from HPB RDA by age band and sex, adjusted by a chosen goal. |
| "Make it lighter" swaps (later, QT-062) | LLM proposes from a curated substitution list; code recomputes | Preserves the five-pungent rules; never makes a conflicting recipe compatible. |

Runtime: existing Cloudflare AI Gateway credential on the VPS, Singapore residency and the owner-approved budget per QT-059, and no personal data in prompts (recipes only; the member profile never leaves the device or is sent only as targets, not identity).

Bootstrapping the library: run the pipeline once over the 18 bundled recipes and 9 live recipes, publish figures through the existing editorial store (the field already validates), and attach the step to the Cooker so every future bot recipe gets figures or an explicit "Unavailable".

## 4. Should this be a US$9.99/month subscription?

### 4.1 Honest assessment

- **Nutrition facts are table stakes, not a premium.** Every benchmark app (NYT Cooking, Yazio, Lifesum, MyFitnessPal, FairPrice, HealthHub) shows per-serving facts free. Charging for the table alone reads as withholding, and reviewers will say so.
- **The catalogue is too small to carry a subscription today.** 27 recipes. Members will not pay US$9.99 a month for figures on 27 dishes. Nutrition-app subscriptions at that price (MyFitnessPal Premium on an annual plan, Lifesum monthly) sell logging, barcode scanning, meal plans and tracking across thousands of foods ([pricing comparison](https://nutrola.app/en/blog/premium-tier-decoder-15-apps-exactly-what-you-pay-for-2026); [MyFitnessPal cost](https://www.fitbudd.com/post/myfitnesspal-app-cost)). Yazio sits near US$3.75 a month on annual billing ([under €5 apps](https://nutrola.app/en/blog/best-nutrition-apps-under-e5-per-month-2026)).
- **The PRD and the Cook benchmark both warn against paywalls on core content** and against health scores. A paid plan is still possible, but it has to sell *personalisation and work done for the member*, not facts.
- **Recurring billing is new infrastructure**: Apple and Google auto-renewable subscriptions, server entitlement ledger, restore, grace periods, cancellation and refund handling, and a development build (no Expo Go). The Lotus plan's consumable-IAP design covers about half of it.

### 4.2 Recommendation: free facts, paid "QuinTaste Plus" for personal guidance

**Free, for everyone (the hook)**

- Per-serving facts with percent of a day, on every recipe that has reliable figures.
- HPB-threshold badges and plate balance.
- One benefit line per recipe.
- Filter: "Under 500 kcal", "Lower sodium", "Higher protein".

This is what makes members trust the app, open the section, and discover there is more.

**QuinTaste Plus (paid)**

The pain points of the actual audience, Singapore vegetarians and vegans, many of them older and five-pungent-free, are not "what is the calorie count". They are:

1. *"Am I getting enough protein, iron, calcium and B12 without meat?"*
2. *"Vegetarian hawker food is fried and carb-heavy; which home dishes are actually lighter?"*
3. *"Mock meats and sauces are salty; how salty is this dish really?"*
4. *"I cook for my parents, who watch sugar and salt. What should I change?"*
5. *"I do not want to log every meal."*

Plus answers those with work done for them:

- **Personal targets** from age band, sex and one chosen goal (Lower sodium, More protein, Lighter meals, Steady carbs, Growing kids). No medical conditions asked, which keeps the app out of HSA medical-device territory and keeps the data low-risk under PDPA. Targets stay on the device.
- **Fits-your-day meter** on every recipe and in Cook mode: this serving is 32% of your sodium for the day.
- **Plant-protein, iron, calcium and B12 view**: the micronutrients vegetarians actually worry about, with the benefit line and a note on absorption (vitamin C with iron). Needs ENCF/USDA micronutrient columns, which the current table lacks.
- **Make it lighter**: one-tap swap suggestions that recompute the figures (less oil, low-sodium soy, tau kwa for tofu puffs), five-pungent rules preserved.
- **Weekly cooked summary** from the existing cooked log, no manual logging: "This week you cooked five dishes; average 410 kcal and 780 mg sodium per serving."
- **Household profiles** (up to four) so a member cooking for parents sees two meters.
- **Shopping list with "Healthier Choice" hints** (sealed goods; no stock or price claims).
- Later: photo estimate for a hawker plate (QT-060), which is the Phase 4 feature members will talk about.

**Price**

- Charge in Singapore dollars through the stores. US$9.99 maps to the S$12.98 or S$13.98 tier; that is above Lifesum and MyFitnessPal's effective rates for a far smaller catalogue.
- Recommended: **S$5.98/month** or **S$39.98/year** (about S$3.33/month), 7-day free trial, annual plan shown first. Family plan at S$7.98/month for up to four household profiles.
- If the owner keeps US$9.99: make it the *family* price, not the solo price, and launch only after the catalogue reaches about 100 recipes with figures.

**What stays off the paywall, always**: diet fit, five-pungent exclusions, allergen "Unconfirmed" states, recipe steps, timers, shopping list. Paying never changes safety information. This matches PRD QT-072 and the owner's own rules.

### 4.3 Why this converts better than a flat paywall

- Members see real value free, so the first nutrition section they open is a win, not a lock. Soft paywalls on personalised features convert 2 to 4 times better than hard paywalls on content in the nutrition category.
- The paid tier sells outcomes the member cannot compute alone ("for me, this week"), which justifies recurring billing.
- Annual-first pricing and a trial lift lifetime value and reduce the monthly-cancel churn that kills S$6 subscriptions.
- Household profiles map to the real buyer: the adult child cooking for parents.

### 4.4 Targets to decide go or no-go on the paid tier

| Metric | Free phase gate before launching Plus |
|---|---|
| Recipes with reliable figures | 100 or more (today 0) |
| Nutrition section open rate on recipe pages | 35% or more |
| Members who set a goal in the free beta | 20% or more of weekly cookers |
| Trial to paid conversion (first 60 days of Plus) | 25% or more of trials, 3 to 5% of monthly active members |
| 90-day paid retention | 60% or more |

## 5. Build plan

### Phase A — Facts for every recipe (2 to 3 weeks, bot and server)

1. Replace the string matcher in `nutrition.py` with LLM structured parsing against the reviewed key list; add a Telegram review queue for unknown keys.
2. Extend `nutrition_sg.json` with ENCF entries for Singapore foods and USDA micronutrients (iron, calcium, B12, vitamin C, saturated fat, potassium).
3. Add USDA yield and retention factors for boil, stir-fry and deep-fry.
4. Run over the 18 bundled and 9 live recipes; publish through the editorial store. Bundled recipes get figures in `src/data/recipe-library` with provenance.
5. App: show the section open by default when figures exist, with percent-of-day column; add the "Unavailable: ingredients not matched" state instead of silence.
6. Add `badges` and one `benefit` line to `Recipe.nutrition`; server validates against the allow-list file.

### Phase B — Free health layer (2 weeks, app)

1. HPB threshold table and badge rules in `src/config/nutrition-standards.ts` (versioned, dated).
2. Badges on the recipe card chip row and the recipe page; filters "Under 500 kcal", "Lower sodium", "Higher protein".
3. Approved-claims file (`src/data/nutrition-claims.ts`) with HPB/HealthHub citations; LLM selection step in the bot.
4. Goal picker and age band/sex on Me (device only), free during beta, to measure take-up.

### Phase C — QuinTaste Plus (4 to 6 weeks, after Phase A/B gates pass)

1. Store products: auto-renewable `plus_monthly`, `plus_annual`, `plus_family` on Apple and Google; Expo SDK 57 billing library in a development build (same spike as the Lotus plan).
2. Server: `billing.entitlement` ledger (reuse the Lotus ledger design), receipt verification, restore, grace period, cancellation webhooks; feature gate `plus` in the staff console.
3. Fits-your-day meter, micronutrient view, make-it-lighter swaps, weekly summary from the cooked log, household profiles.
4. Paywall screen: benefits first, annual first, trial, "Restore purchases", terms and cancellation text as Apple and Google require.
5. PRD coverage update: QT-035, QT-059, QT-060 to QT-063, QT-072 move from Gated to Partial with evidence.

### Guardrails that apply in every phase

- No number without a basis; "Unavailable" over zero.
- No disease, medical, weight-loss or "healthy" wording; approved nutrient-function lines only, each cited.
- Member targets on device; recipes only in prompts; Singapore residency through the existing gateway; budget per QT-059.
- Paying never alters diet fit, exclusions or allergen states.
- Each release records: coverage per recipe, claim allow-list version, HPB table version.

## 6. Decisions needed from the owner

1. Free facts and badges for everyone, paid tier limited to personal guidance (recommended), or everything behind the subscription as first proposed.
2. Price: S$5.98/month and S$39.98/year with a family plan (recommended), or US$9.99 (S$12.98) as planned.
3. Gate: launch Plus only after 100 recipes carry figures (recommended), or launch with the current catalogue.
4. Whether to use ENCF beyond personal reference (confirm HPB reuse terms before bulk extraction).
5. Whether micronutrients (iron, calcium, B12) are in scope for Phase A or deferred to Plus.

Sources: [HPB nutrition labelling and claims](https://www.hpb.gov.sg/healthy-living/food-beverage/nutrition-labelling-and-claims), [HPB claims guidance Nov 2025](https://isomer-user-content.by.gov.sg/484/0851e8d4-af1d-4c60-98bd-c53c382c4fe5/guidance-document-for-application-of-new-claims-(nov-25).pdf), [HealthHub Healthier Choice](https://www.healthhub.sg/live-healthy/make_healthier_choice), [HPB Healthier Dining Programme](https://www.hpb.gov.sg/newsroom/healthier-dining-programme-extended-to-include-food-in-hawker-centres-and-coffee-shops/), [Malay Mail HDP explainer](https://malaymail.com/news/malaysia/2025/12/01/what-the-mychoice-logo-means-and-how-chagee-beat-other-tea-chains-to-join-the-healthier-dining-programme/200013), [Tilleke ASEAN claims](https://www.tilleke.com/insights/food-health-claims-challenges-asean-manufacturers/3), [Nutrola premium tier decoder](https://nutrola.app/en/blog/premium-tier-decoder-15-apps-exactly-what-you-pay-for-2026), [Nutrola under €5 apps](https://nutrola.app/en/blog/best-nutrition-apps-under-e5-per-month-2026), [FitBudd MyFitnessPal cost](https://www.fitbudd.com/post/myfitnesspal-app-cost).

## Learned ingredient database (built 20 October 2026, owner direction)

Member and AI recipes get nutrition from a database that grows with every recipe instead of a fixed list.

- **Reference.** `server-assets/nutrition/usda-reference.json`: all 7,793 USDA SR Legacy foods (public domain) with per-100 g figures and USDA's weighed portions; rebuild with `python -I scripts/nutrition/build_usda_reference.py <SR Legacy CSV folder> .`. It matches the reviewed subset exactly.
- **Order.** The reviewed table (`ingredient-table.json`) first, then `nutrition.ingredient` (schema `server/nutrition/schema.sql`, applied 20 Oct after a backup).
- **Learning** (`server/nutrition/resolve.mjs`). An unknown name goes to the AI with USDA candidates from `searchUsda`; it picks the same food in the same form and gives the weights (g per ml, grams per clove/stalk/whole). A second round uses its own search terms. A food USDA lacks (for example candlenut) is looked up with Google Search in food composition tables or on labels, and stored in `nutrition.food` with its source pages only when the figures pass consistency checks (macros within 105 g, energy within 25% of 4/4/9). The model never supplies a figure without a source.
- **Estimate** (`server/nutrition/dynamic.mjs`). Same rules as the static estimate (90% coverage by weight, nutrient omitted above 10% missing). A line whose food is unknown still counts by weight when its unit is a weight or volume, so a teaspoon of an unknown spice no longer blocks the recipe.
- **Refresh** (`server/nutrition/service.mjs`, hourly). It checks live recipes not yet checked at their revision (member recipes too), learns their names in one batch (60 names per run, only while `ai_recipes` is on), and recalculates every recipe whose names were corrected or learned since its last check (`nutrition.recipe_ingredient`, `nutrition.recipe_check`). Figures from a source page (`basis: "source"`) are never replaced.
- **Staff.** Admin **Community > Ingredients**: To check / Approved / Not found / Rejected / Asked again. Staff can approve, correct weights or a web food's figures (saving approves), reject (not used, not asked again), or ask the AI again with a note.
- **Suggested amounts.** AI recipes now carry an amount for every ingredient. Where the source gives none, the AI suggests one for the servings (`suggested: true`), and the app shows a "Suggested" tag. Only seasoning or garnish clearly added to taste stays "to taste".
