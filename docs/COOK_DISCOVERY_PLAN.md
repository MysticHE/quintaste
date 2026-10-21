# Cook discovery: search demand, suggestions and the daypart feed (21 October 2026)

Owner thoughts, 21 October 2026: (1) track what members search for and, when nothing matches a common search, have the system source and create the recipe; (2) a suggestions dropdown fed by the recipes we actually have; (3) decide how recipes are ordered on the Cook feed, for example by time of day. Same day the owner accepted every recommendation below and added (4): the AI features on Cook are paid, S$9.99 a month for 5 recipes with a higher tier, payment flow screens first and the feature not gated yet.

**Status: live 21 October 2026** as app/preview 20261021-ci99-b242e94 and admin 20261021-cook1; `server/cook-search/schema.sql` is applied in production (see the runbook entry). See §7 for what was built and where it differs from the proposal.

## Owner decisions (21 October 2026)

1. Meat-dish searches and requests get the meat-free home version under a recognisable name ("Vegetarian chicken rice"), for wanted recipes and member requests alike (`server/ai-recipes/prompts.mjs`).
2. Wanted recipes go through the AI recipe pipeline and always wait for staff review; they are not handed to Cooker.
3. A term qualifies when at most 2 recipes match and at least 3 different members searched it in 14 days; at most 10 wanted recipes are written a day; two failures skip a term (`DEMAND` in `server/cook-search/demand.mjs`).
4. Daypart windows as in §3, weekend brunch 06:00–12:00.
5. The first card's time chip names the meal ("Dinner · 25 min"), and the search box keeps five recent searches on the device.
6. AI Recipes plans: **Starter** S$9.99 a month for 5 AI recipes and **Pro** S$24.99 a month for 20 (named Starter and Pro on 21 Oct so the only product term is "AI Recipes") (both confirmed by the owner, 21 October 2026). Payments not connected; nothing is gated. **No free tier** (owner, 21 Oct): no "free" wording anywhere; the daily limit of 3 stays until payments open.

## 0. What exists today (so the plan reuses it)

| Piece | Where | Behaviour now |
|---|---|---|
| Cook search box | `src/screens/food/Cook.tsx`, `BrowseHeader` | One text field; bundled recipes match on device (name, cuisine, categories, ingredient names, substring); member/AI recipes match on the server (`GET /api/recipes?q=`, `ILIKE` on title + ingredient names, 20 per page, newest first). No logging, no suggestions. |
| Feed order | `src/utils/recipe-browse.ts` `browseRecipes` | Sort = Best fit (diet fit rank only, then arrival order), Quickest, Recently cooked. Bundled + published + member pages are merged on the device. |
| Categories | `src/types/food.ts` `recipeCategories` | Breakfast, Noodles, Rice meals, With rice, Soups, Snacks & kueh, Desserts & drinks. No time-of-day field. |
| AI recipes | `/cook/ai`, `server/ai-recipes` | "Describe the dish" → Gemini with Google Search grounding → validators → published as a member recipe (low confidence → staff review). 3 jobs a day per member, 500 a day overall (`ops.control` notice `daily=N`), control `ai_recipes`. `input_hash` dedup reuses an existing recipe for videos only; a repeated dish request always starts a new job. |
| Bot recipes | QT Cooker (6–10 pm SGT, code in `C:\Users\huien\HA\companion-api\ops\qt-team`) | Picks pages itself, favours the least-represented category, five-pungent rule, Manager review, Telegram screenshot with Delete. Knows nothing about member searches. |
| Dropdown pattern | `src/components/discovery/LocationSearchField.tsx` + `LocationSuggestions` | 300 ms debounce, two characters, up to eight rows, web `aria-activedescendant`, keyboard navigation. Reusable. |

## 1. Search demand → "Wanted recipes" → the system makes them

### 1a. Immediate value, no schema (build first)
- **Zero-result search offers AI with the query filled in.** Today the empty state says "No Matching Recipes" and the floating button opens `/cook/ai` blank. Change the empty-state action to **Get This Recipe With AI** → `/cook/ai?dish=<query>` with the field pre-filled. One tap, uses the member's own quota (3 a day). Guests get the sign-in gate as now.
- **Dish requests reuse a published match.** Extend the `input_hash` reuse in `server/ai-recipes/router.mjs` to `kind='request'` (normalised: lower-case, trimmed, punctuation and "for N" removed) when a job with that hash published in the last 90 days. Saves a Gemini call and gives an instant "Open Recipe".

### 1b. Record demand (additive schema, manual release step)
- `recipes.search_term` (term text normalised ≤ 60 chars, day date, searches int, searchers int, results int, PRIMARY KEY (term, day)). Written by `POST /api/recipes/searches` from the device only when a search **settles**: ≥ 3 characters, 800 ms idle, and the result count is known. Never per keystroke, never the raw string: strip digit runs longer than 4, anything with `@`, and cap at 60 characters. `searchers` counts distinct members per day with a daily-salted hash kept only in memory of the request; no member id is stored. Guests count as searches, not searchers. Keep 90 days (`DELETE` in the existing nightly maintenance).
- `recipes.demand` (term PRIMARY KEY, first_seen, last_seen, searches, searchers, results, status IN ('open','queued','published','review','skipped'), job_id → `recipes.ai_job`, recipe_id → `recipes.recipe`, note). Rolled up from `search_term` once an hour by the existing in-process worker: a term enters `demand` when results ≤ 2 **and** searchers ≥ 3 over the last 14 days (owner may change both numbers in the `ops.control` notice, e.g. `demand=3/14`).

### 1c. The system sources and creates the recipe
- **Recommended route: the existing AI pipeline, not the bot.** The worker starts a `recipes.ai_job` with `kind='demand'` (new enum value), `user_id` = the QuinTaste system account, input = the term, and a prompt prefix that turns the request into the vegetarian home-cooking version ("members searched for *X*; write the meat-free Singapore home version if the dish is meat-based, keep the name recognisable"). The same validators, nutrition estimate and credit apply.
- **Publish to staff review, not straight to the feed.** Nobody asked for this exact recipe, so every `demand` job lands in Admin > Content > Member recipes as "Requested by N members" with the term, and Telegram gets the usual screenshot with Publish / Delete. Once trusted, the owner can flip `demand_auto=true` to publish confident results directly.
- **Budget:** at most 10 demand jobs a day (`ops.control` `demand_daily=10`), outside member quotas, inside the global 500 cap and the gateway spend ceiling. Terms that fail twice or are rejected are marked `skipped` and never retried automatically.
- **Why not Cooker:** Cooker runs on its own evening window, with its own shortlist and the five-pungent rule for QuinTaste-branded recipes. Demand recipes are member-feed recipes with "AI, from rated pages" credit, exactly like `/cook/ai` output, so the same rules and the same screen apply. If the owner prefers demand recipes to carry the QuinTaste brand, the alternative is to export `recipes.demand` as a nightly list Cooker reads first; the bot already has a shortlist step to plug it into.

### 1d. Staff view
- Admin > Content > **Wanted recipes**: term, searchers (14 d), results, status, recipe link; actions Make With AI (starts the job now), Skip (with note), Link Existing Recipe (when a recipe exists under another name, which also seeds the alias table in §2). Capability `content`, audited.

## 2. Suggestions dropdown built from real content

- **One index, server-side:** `recipes.suggest` (kind IN ('recipe','term','category'), text, normalised, recipe_id, weight), rebuilt whenever a recipe publishes, is hidden or restored (same hook as the cover update), plus a one-off backfill. Rows: every live recipe title; its dish aliases (staff-entered in Content, and the "Link Existing Recipe" action above); category names; the 60 most common ingredient names across live recipes. Bundled recipes are indexed on the device from `bundledRecipes()` and merged.
- **Matching:** `pg_trgm` similarity over `normalised` (needs `CREATE EXTENSION pg_trgm` with the operations role, one manual step) so "larksa" still finds laksa; prefix matches rank first, then similarity ≥ 0.3, weight = title > alias > ingredient. `GET /api/recipes/suggest?q=` returns ≤ 8 rows in ≤ 1 KB, cached 60 s per query at the edge, guests allowed.
- **Dropdown:** generalise `LocationSuggestions` into `SearchSuggestions` (same debounce, two characters, keyboard and screen-reader behaviour) and give `BrowseHeader` an optional `suggest` prop so Cook uses it now and Market/Explore can later. Row types: a **recipe** row (thumbnail, name, minutes; tap opens `/cook/recipe/:id`), a **term** row (search icon; tap fills the query), a **category** row (sets `browse.category`). When no recipe row matches, the last row is **Get "X" With AI** (→ §1a). No captions or helper text, per the filter-cleanup rule.
- **Recent searches:** five, device-only, shown when the box is focused and empty, with a clear control. Owner decision; off by default if unwanted.
- **Demand hook:** the settled-search log in §1b fires from the same place, so both features share one write.

## 3. Feed order by time of day (and what else should rank)

- **Dayparts in Singapore time** (use `sgDateTimeText`, never device-local time): Morning 05:00–10:30, Midday 10:30–14:30, Afternoon 14:30–17:30, Dinner 17:30–21:30, Late 21:30–05:00. Weekends shift Morning to 06:00–12:00 (brunch) and merge Midday into it.
- **Where a recipe fits comes from data it already has**, so no re-tagging is needed on day one: Breakfast → Morning; Noodles, Rice meals, With rice, Soups → Midday and Dinner; Snacks & kueh → Afternoon and Late; Desserts & drinks → Afternoon, Dinner (after-meal) and Late. Weekday Midday additionally favours `minutes ≤ 20`; Dinner favours `onePot` and 2+ servings. Add an optional `mealTimes` array to `Recipe` later so staff, Cooker and the AI validator can override the mapping (e.g. congee is Morning and Late).
- **Ranking for Best fit** (default sort), in order: diet fit rank (unchanged, it is the owner's diet promise) → daypart match (match 0, partial 1, none 2) → freshness bucket (published in the last 7 days first) → not cooked in the last 14 days → a per-day shuffle seed so the top of the feed rotates daily instead of showing the same ten recipes. Quickest and Recently cooked sorts are untouched. Filters still narrow; the daypart only orders.
- **No new rows or chips.** The owner removed category shortcuts and descriptive text from Cook on 17 October; the daypart is a quiet ordering rule. The only visible hint is optional: the first card's existing top-left chip could read "Dinner · 25 min" instead of "25 min" when the recipe matches the current daypart. Owner decision.
- **Keep it deterministic within a session**: compute the order once per (daypart, day) and keep it while the member scrolls, so cards do not jump when a page loads or the clock crosses 17:30 mid-scroll; re-rank on the next focus of the tab.
- **Server later:** today bundled + published + member pages merge on the device, so ranking stays on-device over the loaded pages. When the feed grows past a few hundred recipes, add `sort=feed&daypart=` to `GET /api/recipes` with the same rules in SQL so page one is already the right page.
- **Observances (phase 2):** Social already has the lunar table (`src/data/lunar.ts`). During the Nine Emperor Gods festival and the 1st/15th lunar days, boost Vegan-labelled recipes one bucket. Deepavali, CNY eve and Vesak can carry a staff-set "featured" list in Content.

## 4. Order of work and effort

| Step | Scope | Needs schema release | Effort |
|---|---|---|---|
| 1 | §1a zero-result → AI with the query; request-kind reuse; §3 daypart ranking on device | No | 1–2 days |
| 2 | §2 suggest index, endpoint, `SearchSuggestions`, `BrowseHeader.suggest`, recent searches | Yes (`recipes.suggest`, `pg_trgm`) | 2–3 days |
| 3 | §1b–1d search log, demand roll-up, `demand` jobs, Wanted recipes admin page, Telegram notice | Yes (`recipes.search_term`, `recipes.demand`, `ai_job.kind` check) | 3–4 days |
| 4 | `mealTimes` on recipes, server-side feed sort, observance boosts | Yes (jsonb only, no DDL) | 2 days |

Every schema change follows the runbook: backup, apply with the operations role, then deploy. All new tables are additive.

## 5. Questions put to the owner (answered at the top)

1. Searches for meat dishes ("chicken rice", "bak kut teh"): write the meat-free home version automatically (recommended), or skip them?
2. Demand recipes: AI pipeline into staff review (recommended) or hand the list to Cooker for the QuinTaste brand and five-pungent rule?
3. Thresholds: 3 distinct searchers in 14 days to qualify, 10 demand jobs a day. Change?
4. Daypart windows above, and the weekend brunch shift. Change?
5. Show the daypart word on the first card's chip, and keep device-only recent searches: yes or no?

## 6. AI Recipes plans and payment flow (owner, 21 October 2026)

Pricing and paywall research, the screen redesign and the recommended price model: [AI recipes pricing and paywall](research/reports/AI%20recipes%20pricing%20and%20paywall.md).

- Plans live in `src/config/ai-plans.ts` (`aiPlans`, `paymentsLive = false`). Every AI generation on Cook counts as one: describe a dish, import a video link, upload a video.
- Screens: `/cook/ai-plans` (two selectable plan cards, Continue) → `/cook/ai-checkout?plan=` (plan, recipes a month, billed monthly, pay with App Store / Google Play / Card by platform, renewal and cancel line, Subscribe). With payments off, Subscribe opens "Payments Aren't Open Yet · Nothing was charged" and returns to AI Recipes. Entry points: AI Recipes plan row on `/cook/ai`, AI Recipes Plan row in Me.
- Limits on `/cook/ai` (owner, 21 Oct): "N of 3 used in the last 24 hours · 2 at a time" under the plan row; under Import A Video: up to 20 minutes and 60 MB per video, private, removed or region-blocked videos cannot be read, and the TikTok/Instagram upload tip. At the member's daily limit or when everyone's daily total is used, a notice explains it and the buttons are off. The numbers come from the server (`usedToday`, `fullToday`, `limits` in the status response; constants in `server/ai-recipes/limits.mjs`).
- Server: `GET /api/ai-recipes/status` now returns `plan: null` and `usedThisMonth` (jobs started this Singapore month, failed ones excluded). The existing 3-a-day limit still applies; no monthly limit is enforced.
- To connect payments later: phone apps must sell this through App Store and Google Play subscriptions (digital goods), the web through a card processor; a subscription table keyed by account, store receipt validation on the server, then the monthly allowance check in `withinQuota` (`server/ai-recipes/router.mjs`) when a gate control is on. Lawyer and pricing questions stay with the owner.

## 7. What was built and where it differs from the proposal

| Part | Built | Difference from §1–§3 |
|---|---|---|
| Zero results → AI | Empty state primary **Get This Recipe With AI** (3+ characters) and the last suggestion row **Get "…" With AI** open `/cook/ai?dish=` pre-filled | — |
| Request reuse | Dish requests hash the normalised term (`server/cook-search/terms.mjs`); a live recipe from the same video, or the same dish within 90 days, is reused ("We already have this recipe."); reviewed jobs that staff published count | — |
| Search log | `POST /api/cook-search/searches` (members only, 120 an hour), settled after 800 ms, once per term per session; `recipes.search_term` (searches, latest results per day) and `recipes.search_member` (HMAC of the account id under a key derived from `BETTER_AUTH_SECRET`, deleted after 14 days) | Guests are not logged: only members count as searchers. Results = the higher of the device's count (it knows bundled recipes) and the server's own count |
| Wanted recipes | `server/cook-search/demand.mjs`: hourly roll-up into `recipes.demand`, every minute it follows jobs and starts staff requests; jobs `kind='demand'` with no account (`ai_job.user_id` and `recipe.author_id` may now be empty for AI drafts only); members' jobs run first; control `recipe_demand` (on; idle unless `ai_recipes` and `recipes` are on) | No Telegram notice: the app server has no Telegram channel (only the bots do). Staff see them in Admin > Content > AI recipes > **Wanted** (Make With AI, Link an existing recipe, Skip, Back to waiting) and in Needs review |
| Suggestions | `GET /api/cook-search/suggest?q=` (guests too): in-memory index rebuilt every 5 minutes from live member/AI recipes, bot and staff recipes, linked names, categories and the 60 commonest ingredients; prefix, word-prefix, substring, then trigram similarity per word (typos); blocked authors hidden; device adds bundled recipes | In-memory trigram matching instead of `pg_trgm` (no extension or table needed). No thumbnails: rows show an icon, the name and minutes. The list sits in the page flow under the search box, not floating, so it stays tappable on Android |
| Recent searches | Five per account or guest in AsyncStorage `@quintaste/recent-recipe-searches/<scope>`, shown when the box is empty, with Clear | — |
| Feed order | `src/utils/daypart.ts`, `useDaypart` (read on open, focus and foreground, never on a timer), Best fit key in `browseRecipes`; optional `Recipe.mealTimes` overrides categories | Server-side `sort=feed` and observance boosts not built (§3 "later" items) |

Checks run 21 October 2026: TypeScript (app and admin) and lint on changed files pass; `npx tsx` logic checks (23: term rules, typo similarity, every daypart window, weekend brunch, scoring) pass; `node .local/cook-discovery/api-check.mjs` (16, against the local API and `quintaste-dev-db`, reusing Alice and Bob) passes; the full wanted-recipe chain (roll-up → queued job → failure → back to waiting with the reason) was exercised with a dead local model address, no Gemini calls; admin role grants checked with a rolled-back transaction. All fixtures removed.

### Review fixes (21 October 2026)

- The search log counts recipes matching the typed text without the member's filters (`matchesQuery`), so a dish hidden by a Vegan filter is not reported as missing.
- Wanted recipes start within both today's 10 and the AI recipes daily cap for everyone (`server/ai-recipes/limits.mjs`); a cap of 0 pauses them. Terms that now find recipes are skipped and the next term takes the slot.
- Reused recipes ("We already have this recipe.") never ran, so they count toward no daily limit or monthly total (`RAN`).
- A guest viewing an author-less recipe is not its owner. Make With AI tells staff when switches or today's limits will delay the start.
- The search box keeps focus when the suggestion list opens (BrowseHeader always uses one wrapper). "Get … With AI" appears only when nothing at all matches (a category or ingredient match means recipes exist).
- One normaliser (`searchWords`) and one combobox keys hook (`useSuggestionKeys`, shared with Explore's location search); recent searches are saved once per settled term; suggestions read the block list only when a member recipe matched, cached for a minute per viewer.
- Review screens: `node .local/cook-discovery/capture.mjs "<folder>"` writes light and dark phone captures (local server with a dead AI address; no model calls).

### Screen revision 3 (owner, 21 October 2026)

- AI Recipes: no "AI-written · Not kitchen-tested" line; the Dish and Video link labels are hidden (headings name them); an info button beside "Describe A Dish" and "From A Video" opens "how it works" (`src/components/recipes/AiInfoTip.tsx`); Your Requests is one compact list (`AiRequests.tsx`): the recipe's own title (server `/mine` now returns it), status pill, open or try again, three shown with Show all, and Clear hiding finished requests on the device (server rows stay, so usage is unchanged).
- Plans: heading "Turn any dish or video into a recipe", plan tiles first, then "In every AI recipe" (step by step, nutrition per serving, nutrient highlights, diet labels, shopping list, video steps; no "healthy" or disease wording). Terms: the feature is "AI Recipes", what a plan gives is "AI recipes", plans are Starter and Pro; Cook entry points say "Get An AI Recipe".
