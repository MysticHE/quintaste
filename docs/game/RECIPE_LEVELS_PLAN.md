# Recipe levels and café visits: the pipeline

**Status:** plan, 21 October 2026, not built. Owner idea: members turn their saved, created and AI recipes into Rush Hour levels, learn the recipe by playing, and open their café so other members can play their dishes. **This document is the technical pipeline (recipe to level, pictures, code, techniques, queue, data). Where levels go, chapters, seasons, phases and owner decisions are in [GAME_CONTENT_PLAN.md](GAME_CONTENT_PLAN.md), which wins where the two differ.** Recipe levels live in the optional Recipe Kitchen, never the main path. Read with `docs/GAME_PLAN.md`, `docs/game/RUSH_HOUR_DESIGN.md`, `docs/GAME_ACCOUNT_PROGRESS.md` and `docs/AI_RECIPES_PLAN.md`.

## 1. In one line

**Play it, then cook it.** Any recipe becomes a short café service that teaches its ingredients, step order and heat, then hands over to Cook mode and the shopping list. Members can open their café so others play their dishes.

## 2. Pain points it answers

| Pain point | What the feature does |
|---|---|
| Recipes get saved and never cooked | Saved recipes come first on the Recipe Kitchen's For you row (Today's special stays built from learned dishes, because the server rebuilds it from the date alone); every clear offers the existing **Cook it for real** bridge |
| Missing an ingredient halfway through | A **Gather** round picks the recipe's ingredients from a shelf with look-alikes, then **Add to shopping list** (mirrors Cook mode's Gather checklist) |
| Losing the step order or the heat | Each step is a stage on the right station with a heat band; hints fade on replays |
| Cooking for someone with other rules (a Jain parent, a vegan friend, the Lunar 15th) | **Who are you cooking for?** picks game regulars (Auntie Mei, Asha, Daniel); they refuse what breaks their rule, so the player practises the real swaps. Never read from the member's own Food Choices |
| Hidden garlic, egg or belacan in bought sauces | The existing label traps appear whenever the recipe uses one of those products |
| Nothing new once the 20 levels are cleared | Levels from other members' cafés, and visitors to your own café |

## 3. Is it unique?

A short web check on 21 October 2026 found apps that give XP for cooking (Seasoned, CookQuest), an AI quest built from the fridge (FoodQuest), a prototype that scores following a recipe step by step ("Let me cook"), and recipe contests (Chef League). None confirmed turning a member's own recipe into a playable level that other members visit. So it is uncommon, not proven unique; do not claim "first" in marketing. The mechanic is easy to copy; what is hard to copy is QuinTaste's content: Singapore vegetarian recipes, the diet rules, Cook mode and the community. A small 2023 study found a gamified recipe viewer gave a better user experience than the same app without the game (one poster, weak evidence).

Sources: [Seasoned](https://mwm.ai/apps/seasoned/6772698565), [FoodQuest](https://www.producthunt.com/products/foodquest), [Let me cook](https://contra.com/community/iuGcazBc-heres-our-submission-for-the-flowstepchallenge), [CookQuest](https://peerlist.io/aks_1817/project/cookquest--ai-gamified-cooking-app), [Chef League](https://toucharcade.com/games/chef-league), [Nommer](https://www.producthunt.com/products/nommer-ai/makers), [Winona State poster](https://openriver.winona.edu/rca/2023/schedule/36).

## 4. Three loops

**Learn my recipe (solo).** Recipe pages, Saved and My recipes get **Play**. Each recipe has three tiers; every service stays a timed Rush (owner rule, 19 Oct).

| Tier | Service | Teaches |
|---|---|---|
| Learn | One guest, a long clock, the full recipe card | Ingredients and step order |
| Service | 4–6 guests, hint chips, a built-in dish mixed in | Timing and heat while busy |
| From memory | Gather round first, no hints, guests with rules | Recall, swaps and labels |

Stars work as today: the first star needs every order served. Results show the recipe's one thing to remember, **Cook it for real** (the built bridge, opening Cook mode at this revision) and **Add to shopping list**. Tier rules are in GAME_CONTENT_PLAN §5.

**Open my café (host, later; GAME_CONTENT_PLAN §9).** The menu board (opens at Level 6) holds up to six reviewed recipe levels, the member's own first. **Open my café** is off by default.

**Visit cafés.** The window opens one **Out and about** sheet with Stall visits and Cafés: Featured, search by dish, and people you have shared a meal with in Social. A visit shows the host's avatar, decor and menu board and plays a service of the host's dishes; the run stores a snapshot of the host's menu, so a menu change during the 7-day settle window can't break replay. Results: like the café, Save the recipe, Cook it for real. Only the host sees their counts ("Your café served 18 guests this week · 3 cooked it after"); there are no host rewards and no public counts.

## 5. Which recipes, and who sees their levels

| Recipe | Who can play its level | On your café menu |
|---|---|---|
| Your draft or private recipe | Only you | No, until it is published |
| Your published member recipe | Only you until staff review the level, then everyone | Yes, as your signature dish |
| Your AI recipe (published) | Only you until staff review the level, then everyone | Yes, credited to its source |
| QuinTaste recipes (bundled, staff, bot) | Everyone, after staff review of the level | Yes |
| Another member's recipe you saved | Everyone, once its level is reviewed | Yes, "Recipe by <name>", if the author allows (GAME_CONTENT_PLAN §14) |
| Hidden or withdrawn recipe | Nobody; menus drop it | No |

Every public level is reviewed by staff (GAME_PLAN rule that every game recipe has an editor and a cultural reviewer, and PRD QT-052); code checks run first, so review only sees levels that already play correctly.

An edit makes a new recipe revision and a new level; menus move to the latest live revision and past results stay. A new compiler or item-table version re-runs the checks: a level whose stages come out unchanged keeps its review; one that changes goes back to review.

Authors can turn game levels off for their own recipe; deleting an account or recipe removes its levels and café entries. Drafts sent to the AI need the PDPA notice to name the AI provider as a processor. Member recipe levels depend on the `recipes` control, which is off today.

## 6. How a recipe becomes a level

```
recipe revision ─► 1 Compile (code) ─► 2 Shape (AI, one call) ─► 3 Check (code) ─► level pack (stored, immutable)
```

1. **Compile (code, free).** Recipes are already structured: ingredients with ids and steps that list their `ingredientIds` and timers. Code maps ingredient names to game items (the 78-item table plus aliases), drops steps with no ingredients (washing, chopping), and guesses each step's station from its verbs and the recipe category.
2. **Shape (QT bots).** QT Gamer (the `qt-gamer` Hermes profile, `gpt-6.1-sol` on the team's ChatGPT plan, owner 22 Oct: never Gemini) turns that draft into up to four stages of 1–3 ingredients per station with a fixed JSON schema, and writes short hints and the one thing to remember. It runs with no tools: `ops/qt-team/game_level_bridge.py` claims the draft over signed routes (`/api/game-levels/bot/*`, `server/game/levels-bot.mjs`) and posts back one JSON shape; an answer that used a tool is refused. Heat bands and timing stay the code's.
3. **Check (code).** The same rules the built-in dishes pass (`dishFeasible` and the test player in `scripts/validate-game.ts` and `game-bot.ts`), run on the server for every new level. The server image copies only `src/game`, so Phase 0 moves the check and the test player into `src/game`; the test player learns each new technique as it ships. A level that fails is never published.

| AI may | AI may not |
|---|---|
| Merge steps into 2–4 stages | Add an ingredient the recipe doesn't have |
| Choose a station and heat band from the allowed list | Invent a swap: swaps come only from a reviewed swap table (ginger for garlic and shallots, black beans or tempeh for shiitake, corn or cabbage for root vegetables) or the recipe's own variations |
| Map an ingredient to a game item or a generic card | Set diet tags: they come from the item table and the recipe's reviewed tags |
| | Mark an ingredient optional: that decides which guests can eat the dish, so it comes only from the recipe's own optional marks or staff review (PRD QT-052: "No live AI decides safe combinations") |
| Write hints and the remember line (short) | Name platforms or brands, make health claims, or follow instructions written inside recipe text (recipe text is data) |

**Checks:** valid shape; every slot item exists; every essential ingredient appears; 2–4 stages; the level never accepts an item that breaks the recipe's own diet label, except as a refused look-alike; a guest with a rule only orders the dish when the simulation proves a suitable path; an ingredient with unknown tags (a generic card) keeps the dish away from guests with rules, matching the app rule that a check that cannot be proven shows nothing; a test player clears it at 2.2 s per action; text checks.

**Failure is shown, never hidden** (owner rule, no silent fallback): "Couldn't make a level from this recipe", with a reason such as "Needs an oven". A shape that fails the checks goes back to QT Gamer once with the reason, then the job fails. A claim with no answer in 30 minutes goes back in line (three claims at most), and work nobody picks up in six hours fails with "check that the level bridge is running". One engine, the QT bots; no automatic switch to another.

## 7. Handling 1,000+ players

**The cost follows distinct recipes, not players.** A level is made once per recipe revision and shared. Staff choose which public recipes to convert (each public level costs a staff review and possibly picture approvals, so converting everything that publishes, such as ten wanted AI recipes a day, would flood review). Members' requests for their own recipes make private levels. Most players never trigger a job.

| Part | Design (reuses the AI recipes queue pattern) |
|---|---|
| Queue | `game.level_job` in PostgreSQL, claimed with `FOR UPDATE SKIP LOCKED`, so several app replicas share it |
| Dedupe | Key = hash(recipe id, revision, compiler version, item table version); a match returns the stored level at once and costs nothing |
| Priority | A member waiting > staff-chosen public recipes |
| Limits | 5 a day and 2 at once per member; daily total across everyone in a `game_levels` control note; Operations switch to turn it off |
| Workers | The app compiles and checks; QT Gamer's bridge on the VPS shapes one job at a time, within the team's own model caps (`reserve()`, `policy.json`) |
| Waiting | "In line · about 2 min", polled with backoff; the level appears in My recipes when ready |
| Timeouts | One retry; a job nobody finishes in 10 minutes fails visibly |

**Estimates to measure in Phase 0 (assumptions, not results):**
- Time: if one Hermes run takes 30–60 s, one bridge makes 60–120 levels an hour. A launch burst of 1,000 new recipes takes a day or so unless more bridges run; a normal day (10% of 1,000 players converting one recipe) takes about an hour. ChatGPT plan usage limits, not money, set the pace.
- Cost: shaping runs within the team's existing ChatGPT plan, so there is no per-level charge; the limit is the plan's usage allowance, shared with the other QT bots. Every run is ledgered in `state/usage.jsonl` and its tokens kept on the job.

**Pictures scale the same way:** an art job is per missing dish or ingredient, never per player or per recipe, and the count falls as the library grows (§8.5).

**Playing adds little server load:** the service runs on the phone. Per run the server takes a start, a finish (log up to 256 KB) and a replay; level packs are immutable and can be cached for a long time. Replay time per run is unmeasured, and production capacity for 1,000 concurrent users is unverified, so a load test is a gate before member cafés ship (GAME_CONTENT_PLAN Phase 5).

**Withdrawn levels:** cached packs check a revocation list (hidden or withdrawn recipe ids) when online; a revoked pack can't start a credited run, and offline runs of it never settle.

## 8. What a new recipe needs: data, pictures and code

**Short answer:** a new recipe needs **data and pictures, not new code**, as long as it only uses cooking techniques the game already has. Code is written once per technique, never once per recipe.

### 8.1 Why no code per recipe

The 16 built-in dishes are already data: `src/game/content/dishes.ts` lists each dish's stages, the items each slot accepts, seconds and heat bands. The simulation (`src/game/sim/engine.ts`) has no dish-specific code. Laksa's "coconut milk splits when too hot" is the `splitIfHot` flag; kangkung leaves scorching fast is `scorchSecs`. How an item shows in the pan (piled, poured or sprinkled, and its colour) is data too (`ITEM_FORM` in `items.ts`). It only feels like code because that data sits in TypeScript compiled into the app (the engine imports it at `engine.ts:6-8`). Move it to JSON the app downloads, and a new recipe needs no app release. This is also the App Store-safe route: an app may download data and images, but not code that adds features (App Store Review Guideline 2.5.2).

**One blocker first (Phase 0):** today one rules version covers every level, dish, item, guest and the engine (`src/game/sim/replay.ts:50`), and the server refuses any run whose version differs (`server/game/router.mjs:63, 121`). So any content change, even one new recipe, sends every older app to "Update QuinTaste to save game progress" on every level. Phase 0 splits it into an engine version plus a hash per pack; the server keeps the last few engine builds, and an app is refused only for packs that need a technique it lacks. Until that split ships, "no app release per recipe" does not hold.

### 8.2 Three layers

| Layer | What it is | Made by | How often | App release |
|---|---|---|---|---|
| Techniques | Engine behaviour, animation, station art, check rules | The team (code) | When demand shows a need | Yes |
| Recipe level | Stages, slots, timings, hints, which real steps each stage covers | The pipeline (§6), as data | Every published recipe | No |
| Pictures | The dish, and any ingredient the library lacks | QT Gamer | Only for what is missing | No, served at runtime (§8.5) |

### 8.3 The technique kit

| Technique | Station or flag | Status |
|---|---|---|
| Stir-fry, sauté, temper spices | Wok with heat band | Built |
| Simmer, boil, braise | Soup pot | Built |
| Gentle sweet heat (syrups, coconut desserts) | Dessert pot | Built |
| Cook rice | Rice cooker, no heat | Built |
| Assemble or layer in order | Assembly board | Built |
| A delicate add that scorches fast | `scorchSecs` | Built |
| Curdles or splits when too hot | `splitIfHot` | Built |
| Two parts on one plate; one pot for two guests | Multi-part dishes; shared pots | Built |
| Bake, roast | Oven | Not built |
| Steam | Steamer | Not built |
| Deep-fry | Oil pot with temperature | Not built |
| Blend, whisk | Blender (play is drag only, so no holding a button) | Not built |
| Rest, set, chill (agar, overnight oats) | Waiting stage | Not built |
| Knead, roll, fold dough | Dough board | Not built |
| Wash, cut, soak | Prep | Shown on the recipe card, not played |

A recipe that needs an unbuilt technique shows "Needs an oven" and is counted. The team builds the most-wanted technique next; every waiting recipe that needed it then becomes playable with no further work. Each level pack states its format version and the techniques it uses: an app too old for a technique shows "Update the app to play this", and the server replays a run with the engine version that played it (after the Phase 0 version split in §8.1). A level uses at most five stations, as many as the phone layout fits today.

### 8.4 Worked example: Cabbage, pea and coconut poriyal (live QuinTaste recipe)

| Real step | In the level |
|---|---|
| 1. Rinse and shred the cabbage, chop the chilli | Prep: on the recipe card only |
| 2. Heat oil; mustard seeds pop; urad dal until golden | Stage 1, wok, hot: oil, mustard seeds, urad dal (scorches fast) |
| 3. Briefly fry chilli and curry leaves | Stage 2: curry leaves, green chilli (optional, so "less spicy" guests can skip it) |
| 4. Cabbage, peas, water and salt; cover until tender | Stage 3, medium heat: cabbage, peas, salt (water left out) |
| 5. Fold in coconut, off the heat | Stage 4, low heat: grated coconut |

Code needed: none, the wok does it all. Pictures: one dish and six ingredients the library lacks (green peas, green chilli, grated coconut, mustard seeds, urad dal, curry leaves); cabbage, salt and cooking oil exist. By contrast the live Dutch baby needs an oven, so it waits for that technique.

### 8.5 Pictures: what QT Gamer makes, and what it can't

- **Images only.** QT Gamer makes sprites through ChatGPT image generation (gpt-image-2) on a flat background it removes, with automatic checks (border, coverage, margins, colour spill) and templates for an ingredient, a packaged product and a dish (`ops/qt-team/gamer/style.json`).
- **Shared, not per recipe.** Pictures are per ingredient and per dish name, used by every recipe. Canonical ingredient names (light soy sauce = soy sauce; reuse the nutrition ingredient table and Cook's ingredient terms) stop duplicates. Most recipes reuse tofu, ginger and soy, so new pictures per recipe fall as the library grows; two fried rice recipes share one dish picture.
- **The rest of an ingredient is data, never from the image model:** its name, fresh or pantry shelf, pan form and colour (`ITEM_FORM`), and diet tags (from `src/config/diet-labels.ts` and the recipe's reviewed tags; unknown stays unknown).
- **Never made per recipe:** look-alike label products (the A/B traps), stations, guests and café scenes.

**Gaps to close before pictures can flow automatically:**

1. **Art ships inside the app.** All 184 files (4.7 MB) live in `assets/game` and the generated `src/game/art.ts`, so a new picture needs an app release today. Needed: an app asset store (immutable, content-addressed, like `/api/catalogue-photos/<sha256>.jpg`), and the game downloading a level's pictures before service and caching them. The Phaser scene already loads pictures by URL (`src/game/dom/scene.ts:75`). Installed builds load the game page from the phone, so server pictures need CORS headers before the WebGL canvas can draw them.
2. **QT Gamer's output reaches the app only by a manual import** (`scripts/import-game-art.py`). Needed: an art job table the bot claims over signed routes (the `ops/qt-team/ai_recipes_bridge.py` pattern), upload to the asset store after its checks, and a vision check that the sprite shows the named food with no text.
3. **Every picture is a draft until an artist approves it** (owner rule). Approve per picture, not per recipe, in an Admin grid (Approve / Redo). Because pictures are reused, approvals fall over time.
4. **Speed is set by the ChatGPT plan's image limits, which are unmeasured.** Jobs wait in line visibly; no switch to another image model without the owner's say.

### 8.6 From "recipe published" to "playable"

1. The recipe publishes; a level job starts.
2. Level data is shaped and checked (§6), about a minute.
3. Missing pictures are listed: one art job per missing dish or ingredient, deduped across recipes.
4. QT Gamer makes two variants and checks them; the better one goes to the approval grid.
5. Approved pictures go to the asset store; once staff have reviewed the level, it opens to everyone.

Until the pictures are approved (§14, decision 4): public levels wait; the author can play their own level at once with plain category cards (sauce bottle, spice jar, leafy green, root, grain, noodle, fruit, protein, liquid) marked "Sketch", which swap to painted art when approved.

### 8.7 Growing the technique kit

**What real recipes and menus need (21 October 2026, keyword estimate, to confirm in Phase 0):**

| Source | On built techniques | What the rest needs |
|---|---|---|
| The app's 30 live recipes (steps) | 18 of 30 | Blend or whisk 7, steam 3, griddle or flip 3, rest or chill 3, oven 2 |
| Explore menus: 4,228 of 6,496 unique dish names that name a method | About 60% | Oven or air fryer 428, griddle 381, deep-fry 368, steam 162, grill 143, wrap or fold 84, set or chill 72, drinks 40 |

**Two free levers first (no new code):**

1. **Same technique, different words.** A reviewed table maps equivalents: pan-fry or sear in a pan = wok; blanch = soup pot; temper (tadka) = wok. Adds the sweet & sour tofu and the miso bowl.
2. **Shortcut a side step, never the core one.** A side step (blend a sambal, chill before serving, soak, marinate) may use a ready item, and results say so ("In the real recipe you blend the sambal yourself"). The step that defines the dish (bake the Dutch baby, steam the custard) is never shortcut. That's how the built-in nasi lemak and sago gula melaka already work, which adds them to the 30.

Together: about 22 of 30 recipes playable with no new code.

**Then build techniques from a few behaviour types, not one by one.** Every station is one of three types the engine already has; most new techniques are a new setup of a type plus art:

| Type | Built | New techniques it covers | New code |
|---|---|---|---|
| Heated pan or pot (heat band, scorch, split) | Wok, soup pot, dessert pot | Steamer (steady heat, runs dry), fryer (oil temperature band), griddle | Mostly settings; flip for the griddle |
| Timed appliance (no heat control, a timer) | Rice cooker | Blender, fridge (rest, set, chill), oven or air fryer (preheat first), pressure cooker | Settings, plus burn-if-left and preheat (today only heated stations can burn: stations without heat return before the "Don't walk away" check, `engine.ts:354-367`) |
| Board (ordered placement) | Assembly board | Dough and wrap (dumplings, curry puffs), salad toss | A fold drag |

**Six new pieces of code, each written once:**

| Piece | What it does | Unlocks |
|---|---|---|
| Transfer | What one station makes becomes an item for another | Blend a paste then fry it; batter then deep-fry; blanch then stir-fry; steam then pan-fry |
| Burn-if-left | A timed appliance's dish spoils if left after it's done | Oven, air fryer, steamer running dry |
| Preheat | Set the heat before food goes in | Oven, air fryer, fryer |
| Flip | Drag the spatula onto the pan at the right moment | Prata, thosai, pancakes, carrot cake, pan-fried tofu |
| Fold | Drag the edge over the filling | Dumplings, curry puffs, wraps |
| Multi-dish orders | One order asks for several dishes served together | Chapter 10 meals: thali, economy rice, reunion dinner |

All of them keep the owner's play rules: drag only, no holding, no rapid tapping, no multi-touch.

**Order: one technique per chapter** (GAME_CONTENT_PLAN §3 is the single source; cheap first, then by how many recipes and menu dishes each unlocks):

| Chapter | Build | Why | Recipes of the 30, cumulative |
|---|---|---|---|
| — | Equivalents and side-step shortcuts | No code | 22 |
| 3 | Transfer and blender | Homemade sambal and rempah, central to Malay, Peranakan and Indian cooking; batters; drinks | 24 |
| 4 | Steamer, with burn-if-left | Chinese home staple: steamed tofu, egg custard, kueh, buns, dumplings | 27 |
| 5 | Oven or air fryer (one station, two looks), with preheat | Largest gap on menus; air fryers are common in Singapore homes | 29 |
| 6 | Griddle with flip | Prata, thosai, pancakes, carrot cake, kaya toast (with ready kaya as a side-step shortcut) | 30 |
| 7 | Fryer (deep-fry) | Fritters, curry puffs, goreng pisang; uses transfer for batter | — |
| 8 | Fold and dough | Dumplings, curry puffs, tang yuan | — |
| 9 | Fridge (set, chill, fresh) | Agar-agar, tau huay, sago pudding; until then chilling is a side-step shortcut | — |
| 10 | Multi-dish orders | Whole meals | — |
| Later | Pressure cooker, grill | Through a staff-made technique lesson in the Recipe Kitchen or a season (GAME_CONTENT_PLAN §5), when the "Needs …" counts call for them | — |

**Same steps for every technique:**

1. **Spec, one page:** what really happens, the one lesson, the drag interaction, states and failures (raw, burnt, split, soggy), settings, art list, sounds, reduced motion, and the check rule: test-player pass thresholds at each speed for each level role (breather, rush, finale), set in Phase 0 from the built levels' results.
2. **Build:** the station setup, any new piece of code from the table above, the test player's support for the technique, and station art from QT Gamer (prop template; idle, working and done states), approved once.
3. **Calibrate** with three to five real recipes that need it; playtest.
4. **Ship** in an app release. Recipes that were waiting with "Needs …" are re-checked automatically and open when they pass.
5. **Measure:** the share of published recipes that are playable, tracked after every release.

Plan for one or two techniques per app release.

### 8.8 Built once (the real engineering work)

1. **Pack format and loader.** Convert the 16 built-in dishes and 78 items to the same format first; that proves the format can express everything.
2. **Runtime pictures.** Asset store, download and cache, category cards.
3. **Recipe level type.** Missions generated from (pack, tier, seed), the way `src/game/special.ts` builds Today's special and the server replays it (`server/game/router.mjs:64-85`); café services from the host's menu; the Gather round (drag the recipe's ingredients to a basket, look-alikes refused); results bridges.
4. **Pipeline.** Compile, shape, check and queue; art jobs and the QT Gamer bridge; the Admin approval grid. The art jobs, upload and bridge come in Phase 0, because Chapter 3 and the first season need pictures before member levels do.
5. **Versioning.** The rules-version split (§8.1); pack format and technique list; server replay by engine version; the lunar table's version included, so client and server agree on lunar days.
6. **Checks on the server.** The level check and the test player moved into `src/game`, so the server image can run them.

## 9. Data (additive `server/game/levels.sql`, operations role after a backup)

| Table | Holds |
|---|---|
| `game.recipe_level` | Pack hash, recipe id and revision, source, owner (null when public), visibility, status, pack JSON, check results, versions |
| `game.level_job` | Queue rows: member, input hash, priority, status, attempts, error, token usage, times |
| `game.cafe` | Member, café name, open switch, opened time |
| `game.cafe_menu` | Member, level, position (up to six) |
| `game.cafe_visit` | Visitor, host, week, run: for the host's private counts |
| `game.run` | Gains a run kind (main, special, kitchen, season, café), pack hash, tier, host and host-menu snapshot. Today level 0 is reserved for Today's special (`server/game/schema.sql:67`), so the run constraint is rewritten around the kind |
| `game.kitchen_best`, `game.season_progress` | Bests and stamps for kitchen and season levels, keyed by stable ids, beside the numbered `game.level_best` |
| `game.level_rating` | Glicko-2 rating, deviation and play count per level and tier |
| `game.level_reaction` | Likes and dislikes, from players who finished |
| `game.run_quit` | Services left before the end, for quality and drop-off |
| `game.item` | Canonical game ingredients: name, aliases, shelf, pan form and colour, diet tags, picture hash, approval state |
| `game.asset` | Approved pictures by content hash: kind, size, provenance (prompt, model, reference hash), approver |
| `game.art_job` | Missing dish or ingredient, status, variants, check results, QT Gamer claim and answer times |
| `game.unmapped_item` | Ingredient name, distinct-member count (HMAC), first and last seen |

New constraints are added `NOT VALID`, then validated, so existing rows never block the release. Credit ledger sources keep the one-colon format (`schema.sql:87`) and stable keys: `kitchen:<recipeId>` (one grant per recipe; tiers add collection stamps only) and `season:<seasonId>-<n>`, never a pack hash, which changes with every revision and would pay the same attainment twice (QT-054).

## 10. Safety, privacy and moderation

- Public levels only come from recipes that are already published and reviewed. Private levels carry the recipe's "not kitchen tested" note. Never allergies.
- A café is visible only after Open my café. It shows display name, avatar, décor and menu; no area or location.
- Signed-in, age-checked, unrestricted members only, as in Social. Guests play public levels on the device; reviewed packs need a public read route, because `/api/game` is for members only.
- Café names: 30 characters; links, emails and phone numbers refused (the Market rule).
- Reports go to the staff case queue (kinds `cafe` and `level`). Every public member level has Report, and blocking a member hides their levels and café. Staff hide a café or level in Admin > Content. Blocking is mutual.

## 11. Rewards and pricing

- **Kitchen and café levels:** 8 credits for a first clear, the first three a day, nothing for your own recipes (GAME_CONTENT_PLAN §8). Coins stay in-service only; credits stay earned-only and cosmetic.
- **Hosts** get no rewards for visitors: credits never pay creators (QT-056), and rewarding reach invites farming and breaks Google Play's member-content rules. Hosts see private counts only.
- No streaks, energy, countdowns, loss for absence, leaderboards or "Beat the chef" (GAME_PLAN principle 6, GP:245).
- **Pricing (recommended):** levels that staff make are free to play; QuinTaste covers their bot usage. A member asking the AI to turn their own recipe into a level uses an AI feature, and AI features are paid with no free tries (owner, 21 Oct), so it comes with an AI Recipes plan (Starter S$9.99, Pro S$24.99). An AI recipe a member requested gets its private level as part of that request (public after staff review), which gives the plans one more reason.
- **Marketing lines:** "Play it, then cook it." "Your recipes, your café." Keep "AI" in the explanation (AI shapes the level, QuinTaste's rules check it), not the headline.

## 12. Phases

The phases are in GAME_CONTENT_PLAN §11. This pipeline lands in them as follows:

| Pipeline part | Content-plan phase |
|---|---|
| Rules-version split, pack format, built dishes moved into it, runtime pictures and asset store, art jobs and the QT Gamer bridge, checks moved into `src/game`, equivalents table and side-step shortcut rule, the compile-shape-check script over the 30 live recipes with an internal playtest and measurements | 0 Foundations |
| Staff-chosen public recipes as kitchen levels, three tiers, Gather, Cook it for real, server replay by pack hash, revocation list | 1 Recipe Kitchen |
| Transfer and blender (the first new technique) | 2 Chapter 3 |
| On-demand queue, private levels, AI and member levels with staff review, Report on member levels, sketch cards, unmapped-item list | 4 My recipes |
| Cafés, Out and about, report and block | 5 Member cafés |
| Further techniques in the §8.7 order | 6 Chapters 4–10 |

## 13. How we'll know it works

- **Play to Cook:** share of cleared recipe levels followed by a finished Cook mode for that recipe within 7 days. This is the number that decides whether the feature helps or only entertains. The `cooked` reaction counts once per member per recipe, so this needs its own private event (recipe, time of each finished Cook mode), counted only in totals and covered by the PDPA notice.
- Saved-to-cooked rate, players against non-players.
- Day-7 and day-30 return for players.
- Cafés opened, and unique visitors per open café.
- Levels that pass checks on the first try, cost per level, 95th-percentile queue wait.

## 14. Owner decisions

**Decided 21 October 2026:** cafés open later, opt-in (needs the QT-048 update); every public level gets staff review; recipe levels live in the Recipe Kitchen, never the main path. Withdrawn: automatic publishing, host decor rewards and "Beat the chef". Other decisions are listed in GAME_CONTENT_PLAN §14.

**Still open (recommendation first):**

1. **Price of making a level.** Recommended: staff-made levels free to play; a member's own AI conversion comes with an AI Recipes plan (no free tries, owner rule 21 Oct) (§11).
2. **Other members' recipes on your menu.** Recommended: allowed with credit; authors get a "Let cafés serve this" switch, on by default.
3. **Private draft levels.** Recommended: allowed; only the owner plays them.
4. **Before pictures are approved.** Recommended: public levels wait; the author plays their own level at once with "Sketch" category cards.
5. **Picture approval.** Recommended: keep artist approval for every picture, done per picture in an Admin grid; revisit only if approval time becomes the bottleneck.
6. **Side-step shortcuts.** Recommended: allowed for side steps with an honest line on the results; never for the step that defines the dish (§8.7).
7. **First new techniques.** Recommended: transfer and blender, then steamer, then oven or air fryer, one per chapter (§8.7, GAME_CONTENT_PLAN §3).

## 15. Risks

| Risk | Mitigation |
|---|---|
| Recipe levels feel samey ("add two things, stir") | Guest rules, label traps, built-in dishes mixed in, café twists; Phase 0 playtest gate |
| Sketch cards look cheaper than painted art | Public levels wait for painted art; the unmapped-item list sends the most used names to QT Gamer first |
| Picture approval becomes the bottleneck | Approve per picture, reused everywhere; Approve / Redo grid; measure approval time in Phase 2 |
| The ChatGPT plan's image limits slow QT Gamer | Dedupe jobs; measure throughput in Phase 0; owner decides on any other image model |
| A bot driving a consumer ChatGPT plan may break its terms at scale | Confirm the terms for automated use (not only commercial use of the output) before Phase 0 ends; the alternative is a paid image API, an owner decision |
| New pictures drift from the house style | Style reference sent with every request; vision check; artist approval |
| A recipe needs a technique the game lacks | "Needs …" counts decide the next technique; the recipe waits rather than playing wrongly |
| A wrong step in a member recipe gets taught | Public levels only from reviewed recipes; private levels carry the not-kitchen-tested note |
| Playing replaces cooking | Every result leads to Cook it for real; Play-to-Cook is the main measure; cut what doesn't move it |
| Server capacity for 1,000 concurrent players is unverified | Load test before member cafés (Phase 5) |
| Competitors copy the mechanic | The moat is the recipes, diet rules and community, not the mechanic |
