# Rush Hour content plan: chapters, Recipe Kitchen, seasons and cafés

**Status:** plan, 21 October 2026, not built; reviewed against the PRD, the game docs and the code the same day. This is the master plan for what members play and in what order. The technical pipeline that turns a recipe into a level (data, pictures, code, techniques, queue, tables) is in [RECIPE_LEVELS_PLAN.md](RECIPE_LEVELS_PLAN.md); where the two differ, this plan wins. Read with `docs/GAME_PLAN.md`, `docs/game/RUSH_HOUR_DESIGN.md`, `docs/GAME_HOME_PLAN.md`, `docs/GAME_ACCOUNT_PROGRESS.md` and `docs/AVATAR_LOTUS_PLAN.md`. Research sources are in §15.

## 1. Owner decisions (21 October 2026)

| Question | Decision | What it changes |
|---|---|---|
| Size of the main path | About 100 levels in 10 chapters; today's 20 levels are chapters 1–2; one chapter per new technique; the screen shows chapters, not a total | PRD §19 ("All 20 levels are proposed content"); the level limits in code and schema (§4) |
| How chapters are grouped | By cooking technique, with dishes from several cuisines; cuisine is a filter and collection, never a gate | Keeps PRD §18: cuisine paths unlock recipes and cosmetics, "not earning power or stereotypes" |
| Seasons | Rotate, never retire: festival seasons are featured, then stay on a Seasons shelf and return each year; nothing resets; free, earned by play | Nothing: fits QT-056/057 and the game plan's ban on countdowns and time-limited items |
| Recipe levels and cafés | Any recipe can become an optional level in a **Recipe Kitchen**, never the main path; public levels need staff review; member cafés come later, opt-in | QT-048 (private café) changes when cafés ship (§9) |

## 2. The shape: five ways to play

| | What it is | Order | Rewards | Content from | Review |
|---|---|---|---|---|---|
| **Main path** | 10 chapters of about 10 levels | Fixed | Credits and stars as today; chapter rewards | Staff recipes | Editor, cultural reviewer and artist for every level (GP:169, RHD:158) |
| **Recipe Kitchen** | Any recipe as an optional level, in three tiers (Learn, Service, From memory) | Shelves; a level opens once its techniques are learned | Small and capped (§8) | Staff-chosen public recipes; members' own recipes as private levels | Public: staff review; private: author only |
| **Seasons** | Festival menus | Any order within a season | Café skin and decor, earned any year | Staff recipes per festival | Editor, a reviewer from that community, artist |
| **Today's special** (built) | One learned dish a day | — | Replay grant | Learned dishes, now from every chapter | — |
| **Member cafés** (later) | Opt-in cafés serving up to six reviewed recipe levels | Any | None for the host (§9) | The host's chosen levels | Report, block, staff hide |

The main path teaches; the Recipe Kitchen and seasons give variety without bending its difficulty curve. Mario Maker (Story Mode vs Course World), Trackmania (seasonal campaign vs Track of the Day) and Levelhead separate official and community content the same way.

## 3. Main path: 10 chapters

**Each chapter:** one new technique, dishes from several cuisines, one new thing to recognise, about 10 levels. Comparable sizes: Diner Dash 10 per restaurant, Candy Crush about 15 per episode, Overcooked 2 six worlds of six.

**Inside a new chapter** (the existing Introduced → Practised → Revisited pattern, GP:165):

| Levels | Role |
|---|---|
| 1 | Introduce the technique with a worked example, full hints |
| 2–3 | Practise; hints fade to chips |
| 4 | Mixed review: earlier stations come back |
| 5 | The chapter's rule (a label or diet the new dishes raise) |
| 6 | Breather |
| 7 | Rush: short and hard (hard levels stay short and are followed by a breather; King and Rovio found difficulty spikes drive players away) |
| 8 | A twist (flare-up, lunch wave, running low…) |
| 9 | Mixed review with no hints |
| 10 | Finale: several stations at once; unlocks the chapter reward |

Chapters 1–2 are built and keep their existing levels and unlocks. The next chapter opens when the finale is cleared; play only, never coins or credits. Every level passes the test player at 0.7, 2.2, 2.8 and 3.2 s per action against pass thresholds per level role (breather, rush, finale), set in Phase 0 from the built levels' results (RHD:91-100). A level uses at most five stations, as many as the phone layout fits.

**Chapter map** (one technique per chapter, the order in RECIPE_LEVELS_PLAN §8.7; dishes are proposals for the content team and cultural reviewers, all made vegetarian or vegan):

| Ch. | Levels | New technique | Kitchen | Dishes across cuisines | Thing to recognise | Chapter reward |
|---|---|---|---|---|---|---|
| 1 | 1–10 (built) | Wok, then soup pot (L9) | Home kitchen | Bee hoon, kangkung, mapo tofu, tomato tofu, ABC soup | Vegan; no five pungent; labels; the ginger swap | Pip, chalkboard (built) |
| 2 | 11–20 (built) | Rice cooker (L12), assembly board (L16), dessert pot (L18) | Hawker stall | Claypot rice, nasi lemak, popiah, bubur cha cha | Substitutes, hidden animal ingredients, egg noodles, Jain, lunar days | Lantern night and Signature skins (built) |
| 3 | 21–30 | Blender, and transfer | Spice stall | Sambal tempeh, laksa paste, green curry, coconut chutney, mint chutney | Belacan and fish sauce hiding in pastes | Spice market skin |
| 4 | 31–40 | Steamer | Steam kitchen | Idli, chee cheong fun, chwee kueh, vegetable bao, ang ku kueh, steamed egg custard | Egg in custards and batters; yam and radish for Jain | Bamboo steamer skin |
| 5 | 41–50 | Oven or air fryer (one station, two looks; preheat) | Bakery corner | Sugee cake, roast vegetables, baked curry puffs, banana bread, naan | Butter, egg and honey in bakes; dairy-free swaps | Bakery skin |
| 6 | 51–60 | Griddle with flip | Breakfast counter | Thosai, prata, chapati, apam balik, carrot cake (chai tow kway), kaya toast with ready kaya | Ghee in flatbreads; radish fails Jain | Kopitiam skin |
| 7 | 61–70 | Fryer (deep-fry; batter by transfer) | Fritter stall | Vadai, goreng pisang, spring rolls, tempura, you tiao, tofu puffs | Egg in batters; lard on a bought pastry's label | Night stall skin |
| 8 | 71–80 | Fold and dough | Dumplings | Vegetable dumplings, gyoza, samosa, curry puff, tang yuan, mandu | Egg in wrappers; garlic chives in fillings | Dumpling house skin |
| 9 | 81–90 | Fridge: set, chill and fresh | Dessert and salad bar | Agar-agar, tau huay, sago pudding, mango sticky rice, rice paper rolls, gado-gado, rojak | Gelatin is animal; agar is not | Garden terrace skin |
| 10 | 91–100 | Multi-dish orders (whole meals) | Banquet hall | Thali, economy rice, reunion dinner, Western set | Every rule mixed, for a whole table | Head chef skin and badge |

**Where each technique is learned** (used by the Recipe Kitchen gate, §5): wok L1, soup pot L9, rice cooker L12, assembly board L16, dessert pot L18; each later technique at its chapter's first level (L21, L31, …). Pressure cooker and grill are learned in a staff-made technique lesson in the Recipe Kitchen or a season, when the "Needs …" counts call for them.

Kaya toast was left out of Rush Hour for having too many steps (RHD:35); with the griddle and ready kaya (a side-step shortcut) it becomes toast, spread, serve. Everything in the kitchen stays vegetarian (GP:136): animal ingredients appear only on bought-in labels.

## 4. Level identity and the schema

- **Never renumber.** Levels 1–20 keep their numbers; new main-path levels are appended. Unlocks are worked out from level numbers and first clears pay once per `level:N` (`server/game/schema.sql:79-80, 93`), so renumbering would move members' cosmetics and credits.
- **Headroom.** Allow level numbers up to 200 in the checks while planning 100, so "about 10 per chapter" can flex.
- **What has to change** (a migration rehearsed on a copy of production; new constraints added `NOT VALID`, then validated):

| Where | Today | Change |
|---|---|---|
| `src/game/progress.ts:41` | Accepts level keys 1–20 | Up to 200 |
| `server/game/schema.sql:26, 52` | `level BETWEEN 0 AND 20` | Up to 200 |
| `server/game/schema.sql:28, 54`; `server/game/router.mjs:83` | Today's special `top` 5–20 | Up to 200 |
| `server/game/schema.sql:67` | Level 0 means Today's special | A run kind (main, special, kitchen, season, café) with a pack hash, tier, host and menu snapshot |
| `src/game/sim/replay.ts:50`; `router.mjs:63, 121` | One rules version for all content; any change refuses every older app | Engine version plus a hash per pack; the server keeps the last few engines (RECIPE_LEVELS_PLAN §8.1) |
| `schema.sql:87` ledger source | `^[a-z]+:[A-Za-z0-9-]{1,64}$` | Keep it; use stable keys `kitchen:<recipeId>` and `season:<seasonId>-<n>`, never a pack hash (it changes with each revision and would pay twice, QT-054) |
| `src/game/content/cosmetics.ts:7` | Unlocks by level only | Add chapter and season unlocks |
| `progress.ts:19` cuisine | `chinese`, `malay`, `peranakan` | The app's cuisine list, used as a filter |

New tables for kitchen and season bests, ratings, reactions and quits are in RECIPE_LEVELS_PLAN §9.

## 5. Recipe Kitchen: where recipe levels go

Main-path and season levels are placed by staff. Kitchen levels are placed automatically:

| Question | Rule |
|---|---|
| Which shelf | The recipe's cuisine; also listed under each technique it uses |
| When it opens | Every technique in it has been learned (§3 map, or a technique lesson) and every rule its guests keep has been met. A locked level says what to learn: "Learn the steamer in Chapter 4" |
| Tiers | Learn, then Service, then From memory, each opening after the one before. Gather is part of the timed service. Kitchen levels use the kitchen of the chapter that teaches their main technique |
| How hard, before anyone plays | A starting rating from the level's features (ingredients, stages, stations at once, timing) and the test player's pass rates at the four speeds, turned into a predicted pass rate by a model fitted on main-path levels with real play (King's Candy Crush bots did this; simulation plus real data beat either alone) |
| How hard, after play | Glicko-2, player against level and tier (as Lichess rates puzzles): first attempt only; capped changes per player per day. Not rated: replays, plays with hints set above the tier's default or a slower Pace, and plays with a custom "Who are you cooking for?" table. Companion skills count as normal play (no pet is stronger than Sprout). The tier locks after enough unique players (30–50 suggested, to tune) and reopens only when the recipe is edited. Never raw clear rate: in a fixed order only stronger players reach later levels |
| What players see | **For you** (near their rating, techniques learned, predicted to pass about 60–80% of the time, to tune; saved recipes first); **New** (guaranteed showings until enough players); **Recipe of the day** (staff pick against published criteria, like Trackmania's Track of the Day); shelves; filters by diet, technique and tier |
| Quality | Early quits, dislikes counted only from players who finished, and reports take a level out of the rows above; it stays reachable from its recipe page. Staff can hide it |
| Promotion | Staff may move a kitchen level into a season or a future chapter after full review. Nothing joins the main path automatically |
| Review | Public levels: staff review in Admin (editor; a cultural reviewer for festival or religious dishes). Private levels: their author only, marked not reviewed. QT-052 holds: AI never decides safe combinations or which ingredients are optional; diet rules come from reviewed tables |

## 6. Seasons: rotate, never retire

- **Featured, then kept.** A season is featured around its festival, then moves to the Seasons shelf for good and is featured again the next year (Overcooked 2's seasonal map, Helldivers 2's "we will not retire" warbonds, Animal Crossing's yearly events).
- **Nothing resets, nothing expires.** No countdown and no "last chance": the label is "Featured now". Singapore's CCS acted against fake countdown timers in May 2026; EU consumer authorities act against time pressure in games.
- **No pass, nothing paid.** Rewards are a café skin and two or three decor items, earned by clearing the season's levels in any year.
- **Each season:** 6 levels from at least four dishes (fewer dishes, fewer levels), a fictional festival regular when the story needs one, a café skin (2:3 portrait and 3:2 wide), decor and a kitchen. Seasons open after Chapter 1; a level that needs a technique the player hasn't learned says what to learn.

**What each season can serve with the techniques built today** (wok, soup pot, rice cooker, assembly board, dessert pot), and what waits for a chapter:

| Season | 2026–27 | 2027–28 | Possible with built techniques | Waits for | Care |
|---|---|---|---|---|---|
| Reunion kitchen (Lunar New Year, Chap Goh Mei) | 6–7 Feb 2027 | 26–27 Jan 2028 (est.) | Buddha's delight, vegetarian yusheng (a toss on the board), longevity noodles, braised mushrooms | Nian gao (Ch 4, 6), tang yuan (Ch 8), pineapple tarts (Ch 5) | No ancestor altars |
| Sunset bazaar (Hari Raya Puasa) | 10 Mar 2027 | ~27 Feb 2028 (est.) | Sayur lodeh with ready lontong, jackfruit rendang, nasi lemak | Kuih (Ch 4) | Breaking the fast at sunset; never a Muslim character eating in daytime; review by Muslim staff |
| Zhai days (Vesak, lunar 1st/15th) | 20 May 2027 | ~8–9 May 2028 (est.) | Zhai bee hoon, Buddha's delight, mock char siew rice, zhai curry | — | No Buddha images as props |
| Nine days (Nine Emperor Gods, Navaratri) | 30 Sep–8 Oct 2027 | 18–26 Oct 2028 | Zhai stir-fries, sundal, payasam, vegetable curry | — | No deities, palanquins or fire-walking |
| Festival of lights snacks (Deepavali) | 28 Oct 2027 | ~17 Oct 2028 (est.) | Payasam, sundal (two dishes: a smaller season) | Murukku (Ch 7), laddu (Ch 8) | Lamps and kolam fine; no deities; ghee swaps for Vegan |
| Year-end table (Dongzhi, Christmas) | 22–25 Dec 2027 | 21–25 Dec 2028 | Vegetable devil's curry | Tang yuan (Ch 8), sugee cake (Ch 5) | Fruit cake usually contains alcohol |
| Lantern bakery (Mid-Autumn) | 15 Sep 2027 | 3 Oct 2028 | — | Mooncakes (Ch 5), snowskin and orh nee (Ch 3, 4, 9) | Traditional fillings use lard and yolk; yam fails Jain |
| Dumpling day (Duanwu) | 9 Jun 2027 | 28 May 2028 | — | Zongzi and kee chang (Ch 8) | Low |

- **Ready with today's techniques:** Reunion kitchen, Sunset bazaar, Zhai days and Nine days. The others start the year their chapters ship.
- **First season:** whichever of Lunar New Year, Hari Raya Puasa or Vesak 2027 is ready first; plan for Zhai days (Vesak, 20 May 2027), which needs no new technique and has the lowest risk. Deepavali 2026 (8 Nov) is too close.
- **Not themed:** Hungry Ghost month (no festive event that month), Hari Raya Haji and Thaipusam.
- **Calendar care:** Lunar New Year overlaps the start of Ramadan in 2026–2028. 2028 has a leap fifth month, which moves every festival from Hungry Ghost to Nine Emperor Gods about three weeks later; the app's lunar table runs only to January 2028 and must be extended and versioned first, so the app and server agree.
- **Optional extras:** Harvest breakfast (Pongal, January) and Spring popiah (Qingming season, no graves).

## 7. Looks: skins, kitchens, decor and art

| Look | Where | How it's earned | Art and code |
|---|---|---|---|
| Café skin | The home room | Chapter finales and seasons; Lotus pond stays a Golden Lotus perk | Portrait 2:3 and wide 3:2 (QT Gamer `homeSkin`), plus its own tap areas for the room's objects (GAME_HOME_PLAN hotspot registry) |
| Kitchen | The Rush Hour playfield (background and counter) | Comes with the chapter or season being played | One set per chapter and per season |
| Station | Each new technique | Comes with its chapter | Idle, working and done states |
| Decor | The café's four decor spots (ceiling, wall, two floor; `cosmetics.ts:42`) | Chapter and season rewards; credits (40/80/160) | One sprite each, made to fit a spot's size; more items mean more choice per spot, and a new spot needs room art and code |

Nothing is time-limited, and owned looks are kept forever (QT-056 "Restore keeps settled ownership"). Paid looks stay deferred (PRD §05); any paid look would need its own owner decision and be a direct purchase.

**Rough art per chapter** (estimate): one station, one kitchen, one café skin in two sizes, about 10 dish sprites, 10–25 ingredient sprites (falling as the library grows), two or three decor items. Per season: the same without a station. Every picture is made by QT Gamer and approved by the artist.

## 8. Rewards and economy

| Source | Today | With this plan |
|---|---|---|
| Main path first clears and Mastered (30 + 20 per level, `cosmetics.ts:67`) | About 1,000 credits | About 5,000 |
| Seasons (same per level, once ever) | — | About 2,400 (8 seasons × 6 levels) |
| Recipe Kitchen | — | Recommended: 8 per recipe's first clear, the first three a day, nothing for your own recipes; Mastered stamps there are collection only |
| Replays | 8 each, no daily cap (`GAME_ACCOUNT_PROGRESS.md:105`, an open owner decision) | Recommended: cap at five a day before Phase 1, or every other cap is moot |
| Spending | Decor 40/80; Lotus breed 600; re-bloom 150 | Decor sets at 40, 80 and 160 per chapter and season |

- **Lotus:** 600 credits for a breed assumes about Levels 1–20's first clears (`AVATAR_LOTUS_PLAN.md:147`), and credit players already reach Golden through re-blooms, guaranteed by about 2,850 credits (`:151`). With 7,000+ credits on offer, players who never pay reach Golden around the middle chapters. That's within the design ("credit players still reach Golden"), but faster than planned: model it in Phase 0 and decide (§14).
- Each attainment pays once (QT-054). Credits never pay creators or hosts (QT-056). No streaks, daily-login rewards or public leaderboards (GP:245).

## 9. Member cafés (later, opt-in)

The café design is in RECIPE_LEVELS_PLAN §4 and §10, with these rules:

- **PRD first:** QT-048 says the café is private and edits "never widen the audience"; update the PRD and the café sheet ("Only you can see your café", `CafeSheet.tsx:26`) before building.
- **No host rewards and no public counts.** Hosts see private counts only ("Your café served 18 guests this week"). No "Beat the chef" or visitor-based decor: they edge toward leaderboards (GP:245), and Google Play warns against rewarding reach.
- **Entrance:** the window is reserved for Stall visits (`GAME_HOME_PLAN.md:41`). Recommended: the window opens one "Out and about" sheet with Stall visits and Cafés.
- **Menu:** the chalkboard already holds the signature menu and Today's special; the café menu is a third section of the same sheet.
- **App store rules** for member-made content: terms accepted before opening a café (Google Play); filtering of the café name; report and block on every café and member level; timely responses; published contact details (Apple 1.2); age-checked members only. Levels stay data run by the built-in game, never downloaded code (Apple 2.5.2).
- **Singapore:** the Online Safety Commission (from 29 June 2026) can order takedowns; the staff hide action and case queue cover this.

## 10. Review and art: the real bottleneck

Content, not code, sets the pace. Each chapter needs about 10 reviewed staff recipes (editor and cultural reviewer), a technique spec and build, the art in §7 with artist approval, and test-player checks. Each season needs about 6 reviewed recipes, a reviewer from that community and its art. Each public kitchen level needs a staff review, so staff choose which public recipes to convert rather than converting everything that publishes.

- Phase 0 builds one Admin review queue for levels and one approval grid for pictures, so every review is a few taps.
- Track reviews and approvals per week from Phase 2; plan chapter and season dates from that rate, not from hopes.

## 10a. Also covered

| Area | Plan |
|---|---|
| Guests | Guests earn device credits and unlocks on numbered levels, imported once with a cap at sign-in (`GAME_ACCOUNT_PROGRESS.md:13, 50-55`). Kitchen and season progress stays on the device and is not imported; they see "Sign in to keep this". Reviewed packs need a public read route, because `/api/game` is for members only |
| Offline | Offline runs are practice, as today. Cached packs check a revocation list when online; a hidden or withdrawn recipe's pack can't start a credited run |
| Off switches | Separate Operations controls for the kitchen, seasons and cafés, beside `games`. Off: the shelf hides, new runs are refused with one short line, runs already started still settle within their 7 days (no loss). The app checks these before showing a new lane (fail closed), unlike `games`, which defaults to on |
| Old app versions | After the Phase 0 version split, an app missing a technique sees "Update the app to play this" on those levels only; everything else keeps settling |
| Diet labels | The app's labels changed on 20 October (AGENTS.md): Vegan = no dairy, egg or honey; Vegetarian = none of the five pungent; meat-free otherwise = Plant-Based. In the game, Daniel's Vegan rule = the app's Vegan; Auntie Mei's "No five pungent" = the app's Vegetarian; "a vegetarian kitchen" (meaning meat-free) = Plant-Based. Phase 0 reviews all game copy against this, starting with "Vegetarian is not always vegan" and "in a vegetarian kitchen" |
| Lunar days | The existing rule (every order five pungent-free on lunar 1st and 15th and Nine Emperor Gods days) stays in the main path and Today's special. It does not apply in the Recipe Kitchen, where many recipes have no reviewed swap for garlic; Zhai days and Nine days are five pungent-free by design |
| Accessibility | Drag only, as the owner decided (a known departure from QT-050/053). New techniques keep reduced motion, never rely on colour or sound alone for doneness, give generous flip and timing windows, and respect the Pace setting |
| Language | English, with the local dish name beside it where common (chwee kueh, thosai); cultural reviewers check names and spellings |
| Regulars | A chapter or season adds a fictional regular only when the story or a rule needs a person; guest rules stay the app's six; never allergies; the game never reads the member's own food choices |
| Stall visits | Kept as planned (GAME_PLAN §8); at most one interlude per chapter, untimed and select-only |
| Bridges | Results use the built "Cook it for real" and "Find it nearby" bridges (RHD:164), plus Add to shopping list |
| Play data and privacy | Ratings use each account's first attempts; quits and reactions are stored for quality only; Play-to-Cook needs a private event per finished Cook mode, because the `cooked` reaction counts once per member per recipe. Kept for these uses only, deleted with the account, never shown per person; PDPA notice updated before Phase 1, naming the AI provider as a processor for member drafts |
| Picture rights | QT Gamer drives a ChatGPT plan; confirm before Phase 0 ends that the terms allow a bot to use it at this scale, not only commercial use of the output. Provenance is stored per picture. Never prompt with a real brand or a member's photo without their licence |
| People | Cultural reviewers for Malay and Muslim, Indian and Hindu, and Buddhist and Taoist content, plus the artist, are owner-sourced: name them in Phase 0 |
| Cost | Shaping (QT Gamer) and pictures both run within the team's ChatGPT plan, with no per-level charge; the largest cost is review and art time (§10) |

## 11. Phases: seven, the last one repeating

| Phase | Delivers | After | Size (judgement) | Gate to finish |
|---|---|---|---|---|
| **0 Foundations** | Rules-version split; level pack format with the built 20 levels, 16 dishes and 78 items moved into it; the schema and code changes in §4; checks and test player moved into `src/game` with thresholds per level role; runtime pictures, asset store, art jobs and the QT Gamer bridge; Admin level review queue and picture grid; lunar table extended past 2028 and versioned; diet-label copy review; equivalents table and side-step rule; the compile-shape-check script over the 30 live recipes; replay cap decision | — | Large | Every built level replays identically; migration rehearsed on a production copy with no lost unlocks or credits; the open checks closed (PRD §19 playtest, accessibility and performance gate; physical devices, artist approval of current art and cultural reviewers named, RHD:200-207); at least two thirds of the 30 recipes compile with no new code; playtesters rate them as fun as built levels; AI cost, replay time, pictures per recipe and QT Gamer throughput measured; ChatGPT terms confirmed |
| **1 Recipe Kitchen (staff recipes)** | Staff-chosen public recipes as kitchen levels; shelves; technique gating; three tiers; Gather; bridges; starting difficulty from the test player; live Glicko-2 rating; quits and reactions; public pack route; revocation list | 0 | Large | Play-to-Cook measured; no diet-check escapes; ratings settle |
| **2 Chapter 3: blender and transfer** | The first new technique and chapter end to end: spec, code, test player, art, review, release | 0 (alongside 1) | Medium | Clear and drop-off per level acceptable; review and art rate measured |
| **3 Seasons** | Seasons shelf, featured calendar, season ids, unlocks and ledger; the first season | 0 | Medium | Cultural review signed off; no countdown wording; a past season plays after its feature ends |
| **4 My recipes, AI and member levels** | Private levels for their author (with an AI Recipes plan, no free tries); the on-demand queue; AI recipes get private levels with their request; staff review for public; Report on member levels; sketch cards. Needs the `recipes` control, off today | 1 | Large | Queue wait, failure rate, review time and cost within what the owner sets |
| **5 Member cafés** | PRD update; Open my café; café menu on the chalkboard; Out and about; report, block, terms, contact details; load test at 1,000 concurrent players | 4 | Large | Moderation manageable; app store review passes; load test passes |
| **6 Chapters 4–10 and yearly seasons** | The remaining seven techniques, one chapter per app release: 6a Steamer with burn-if-left (Ch 4), 6b Oven or air fryer with preheat (Ch 5), 6c Griddle with flip (Ch 6), 6d Fryer (Ch 7), 6e Fold and dough (Ch 8), 6f Fridge (Ch 9), 6g Multi-dish orders (Ch 10); pressure cooker and grill later as technique lessons. Each also opens the seasons that need it (§6). Returning seasons each year; the kitchen keeps growing | 2, 3 | Medium per chapter, repeating | Each chapter's gate as in Phase 2 |

**Phase 0 progress (22 October 2026, local, not committed or deployed):** level packs built (`src/game/content/pack.ts`): strict validation, a hash per pack, registration that can never change built-in content, and the rules version now covers built-in content only (still `1o5fyel`, so no app is asked to update). `scripts/check-game-pack.ts` proves the 16 built dishes, 78 items and 35 pan forms round-trip through the format, and that the live poriyal recipe plays as a pack through the real simulation with no new code (the test player clears it on 4/4 seeds at 0.7 and 2.2 s per action). Pack runs on the server, the same day: `src/game/mission.ts` builds a Recipe Kitchen service from a pack and a tier (Learn, Service, From memory) the way Today's special is built from a date; a run names the pack hash and tier and the server replays it from them (`RunSetup.mission`). `server/game/levels.sql` (additive, idempotent, applied twice to the local database) adds `game.recipe_level` (packs by hash: review, ready or hidden; public or one member's), `pack` and `tier` on `game.run` with the run-shape rule replacing `run_check` (added `NOT VALID`, then validated), and `game.kitchen_best`. The API serves a ready pack (`GET /api/game/packs/:hash`), opens mission runs (tiers in order), refuses runs of withdrawn, private or unknown packs, records bests, and pays no credits until the kitchen credit rule is decided. Signature dishes stay built-in only. Checks: `scripts/check-game-pack.ts` (every tier replays on 6 seeds; the test player clears each at 2.2 s; From memory clears 0/6 at 3.2 s, like Level 18) and `.local/recipe-levels/api-missions.mjs` (19 local API checks), plus the existing settle checks and the full validator. **Release needs** `server/game/levels.sql` applied with the operations role after a backup, before the code. Levels past 20, the same day: the app accepts bests only for levels it has (`readGame` uses `LEVELS.length`, so a device can never claim credits for levels that don't exist yet), the lobby and café treat "all done" as the last level, the server accepts a Today's special `top` up to the last level, and signature dishes are built-in only. `server/game/levels.sql` replaces the four 1–20 checks with 0–200 (special `top` 5–200), added `NOT VALID` and validated. `.local/recipe-levels/level-limits.mjs` adds a temporary Level 21 in memory and checks reading, opening, replay, the first-clear grant and the database bounds (11 checks). Adding Level 21 for real now needs only content: the level in `levels.ts` (this changes the rules version, so older apps are asked to update, as with any built-in content change). Runtime pictures and the QT Gamer art queue, the same day: `server/game/levels.sql` adds `game.asset` (normalized WebP by SHA-256; draft, approved or rejected; provenance), `game.art` (which approved picture each art key shows) and `game.art_job` (one open job per missing key). `server/game/art.mjs` serves approved pictures publicly at `/api/game-art/<sha256>.webp` (immutable, CORS open so the WebGL canvas can draw them), queues jobs for a pack's art keys that have neither a built-in nor an approved picture (`queueMissingArt`), lets QT Gamer claim and answer over signed routes (`/api/game-art/bot/claim`, `/jobs/:id/answer`; stale claims return to the queue, three attempts), re-checks every draft (PNG or WebP, real transparency, at least 64 px, at most 512 px after normalizing) and approves only through `approvePicture`, which needs the staff database role. `GET /api/game/packs/:hash` lists a pack's approved pictures; the app makes them absolute (`withPictures` in `src/game/artUris.ts`), and anything still missing plays as a Sketch card drawn from the playfield's tokens (`src/game/dom/sketch.ts`, checked in the harness: the poriyal mission's six new ingredients and dish show as dashed cards beside painted built-in art). `ops/qt-team/game_art_bridge.py` claims a job, runs QT Gamer's own generator and checks, and posts passing sprites or a failure; built and compiled locally, not deployed. Checks: `.local/recipe-levels/api-art.mjs` (13 local API checks; it caught that an alpha channel alone is not transparency, now refused). Found for Phase 1: the playfield names a mission "Level 2" (its tier's timing level); missions need their own label, and the pack must also be registered inside the game's web view, which has its own copy of the content. Admin review screens, the same day: staff console **Catalogue > Game levels** (`admin/src/components/content/GameLevels.tsx`, data in `admin/src/lib/game-content.ts`, capability `content`) with three tabs. **Levels**: waiting, live or hidden recipe levels with their recipe, revision, public or private owner, techniques, plays, lesson, every stage (slots, optional items, seconds, heat band, burns fast) and new ingredients with their tags; Approve, Hide, Show again. **Pictures**: QT Gamer drafts on a neutral fill so cut-out edges show; Approve (the picture is shown wherever its art key is used, marked In use), Set aside, and Draw again with notes for QT Gamer. **Picture jobs**: open and failed jobs with their errors, and Draw again. Every action is audited (`content.game_level.*`, `content.game_picture.*`); the sidebar counts levels and drafts waiting. Checked in the local console against the local database with a 20-minute QA staff session (`.local/recipe-levels/admin-seed.mjs`, `--cleanup` removes the fixtures): approve level, approve and set aside drafts, Draw again with notes, a second Draw again refused while a job is open, the database and four audit rows match, no server errors. Remaining Phase 0 code items, 22 October 2026:
- **Lunar table to 2031, from the Hong Kong Observatory** (`scripts/build-lunar-table.mjs` rebuilds `src/data/lunar.ts` from HKO's conversion tables; 130 lunar 1st/15th days and 54 Nine Emperor Gods days, 2026-10 to 2031-12, including the leap 5th month of 2028 and leap 3rd month of 2031). **It corrects the live table:** the Intl Chinese calendar it was built from put Lunar New Year 2027 on 7 Feb and Chap Goh Mei on 21 Feb; HKO and Singapore's public holiday say 6 and 20 Feb (2030 had the same one-day error). `LUNAR_VERSION` is now part of the game's rules version, so an app with an older table is asked to update instead of playing a lunar-day special the server would rebuild differently.
- **Today's special across chapters** needed no code: it already draws from every cleared level's dishes. `.local/recipe-levels/level-limits.mjs` proves it with a temporary Level 21 and a new dish (a player past it gets the dish on 4 of 120 days, a player before it never, and the server replays it).
- **Diet-label copy** (20 Oct rule): "vegetarian kitchen", "a vegetarian order" and "Not vegetarian" meant meat-free and now say plant-based (`dishes.ts`, `guests.ts`, `Overlays.tsx`, `BooksSheet.tsx`). Kept as accurate under the new labels: "Egg is vegetarian, but not vegan", "Vegetarian is not always vegan" and the allium-free "Vegetarian sambal".
- **Rules version** is now `1iypz0v` (was `1o5fyel`): the lunar table and the copy changes. As with any built-in content change, older apps are asked to update when this ships.
- **30-recipe trial** (`scripts/recipe-levels-trial.ts`, report in `.local/recipe-levels/trial-report.json`): **23 of 30 live recipes play with no new code** (the gate is two thirds), 6 need a technique (steamer 3, oven 2, griddle 1, as §8.7 predicted) and 1 failed: two recipes made a "tamarind paste" item with different details and the second pack was correctly refused, which confirms the canonical ingredient registry (`game.item`) must come before member recipes convert at scale. About 1.9 new pictures per playable recipe. The AI shaping step was not run (its key lives on the server): the code stand-in drops items past three per stage (the bee hoon lost its noodles) and guesses stations poorly for steps without a cooking verb (the carrot salad landed on the wok), so 23 is a floor for validity, not a measure of level quality.

**Phase 0 left for the owner and the team:** the playtest of recipe levels against built ones (fun), physical-device, accessibility and performance checks (PRD §19), naming the cultural reviewers and the artist (the owner approved all 214 current game pictures as the artist on 22 October 2026), the ChatGPT terms for QT Gamer, the replay cap decision, and running AI shaping on the server to measure its cost. Code follow-ups found on the way: the canonical ingredient registry (`game.item`), a mission label instead of "Level 2" in the playfield, registering a pack inside the game's web view, and ingredient names (not ids) in the Admin stage list.

**Follow-ups done (22 October 2026, after commit 4fa3f55), the start of Phase 1's play flow:** missions carry their pack hash and tier (`Level.mission`); the playfield names a service with `levelTitle` ("Recipe Kitchen · Service", "Today's special", "Level n") and "Next" with `nextService` (the next tier, or the next level up to the last one; this also removes a hard-coded Level 20 from the results screen); each tier has its own brief. The game's web view registers the pack itself (`RushHour` prop `mission: { pack, tier }`). `RunInfo` and `RunStart` carry `pack` and `tier`, so the app opens mission runs on the account; the device save records nothing and pays nothing for a mission (`applyRun`), matching the server. The Play screen opens a mission from `/game/play?pack=<hash>&tier=learn|service|memory`: it fetches the pack and its approved pictures (`fetchPack`, members only for now), checks the hash, and "Next" moves to the next tier. The Admin stage list shows ingredient names. Checked in the harness (title, brief, Sketch cards, the start message carrying `pack` and `tier`), with the full validator, pack and level-limit checks and both local API suites; rules version unchanged (`1iypz0v`). Still to build in Phase 1: the Recipe Kitchen screens (shelves, tier progress, Play on recipe pages), the public pack route for guests, the Gather round, ratings and the canonical ingredient registry.

**Recipe Kitchen screens (22 October 2026, after commit 86c9715):** the Rush Hour sheet (opened from the stove; no new labels on café objects) has two tabs, **Levels** and **Recipe Kitchen** (`src/screens/game/home/KitchenSection.tsx`). The Kitchen lists the newest live level of each recipe on shelves by cuisine (`game.recipe_level.cuisine`, additive in `levels.sql`; no cuisine shows under More recipes), each with its approved dish picture and three tier marks, or a lock that names where to learn the technique ("Learn the soup pot in Level 9"). Picking a recipe shows Learn, Service and From memory, each opening after the one before; the footer starts the picked tier. One rule decides locks on both sides (`src/game/kitchen.ts`: wok L1, soup pot L9, rice cooker L12, assembly board L16, dessert pot L18): the app shows it and the server refuses a locked run (`TECHNIQUE_LOCKED`). `GET /api/game/kitchen` returns the shelf with the member's bests; `src/hooks/useKitchen.ts` loads it for members (others see the sign-in prompt). Recipe pages show a controller action when the recipe has a live level, opening its next tier. The Play screen explains a locked level and goes back; locked or withdrawn starts become practice with a clear note. Checked: the local API suite (now 23 checks, including the technique lock and the shelf), the settle suite, validator, pack and level-limit checks, TypeScript and lint; and in a local web build signed in as Alice: the tab, cuisine shelves, the lock line, tier picking, Start Learn into the level, and the recipe page's Play action. Still to build in Phase 1: the public pack route for guests, the Gather round, ratings and the canonical ingredient registry.

**Level making by the QT bots (22 October 2026, after commit 48f5bae; owner: QT bots on the ChatGPT plan, never Gemini):** staff ask for a level from a recipe (a row in `game.level_job`). The app's level worker (`server/game/levels-worker.mjs`, control `game_levels`, off by default) compiles it with code (`src/game/compile.ts`: ingredients onto the game's items or the shared ingredient list `game.item`, steps onto stations; a recipe that needs an unbuilt technique or isn't published fails at once with the reason) and leaves the draft for QT Gamer. `ops/qt-team/game_level_bridge.py` claims it over signed routes (`server/game/levels-bot.mjs`), runs the `qt-gamer` Hermes profile (`gpt-6.1-sol`, the team's ChatGPT plan, no tools, ledgered through `reserve()`) and posts back one JSON shape. The worker checks the shape (only the given ingredients, one to four stages, nothing optional, no links or platform names; a refused shape goes back once with a readable reason), builds the pack, runs the test player on Learn and Service (at least 5 of 6 clears at 2.2 s) and stores the level for staff review with picture jobs for whatever art is missing. Stale claims return after 30 minutes (three claims at most); work nobody picks up in six hours fails, naming the bridge. QT Gamer's role note now covers level shaping. Checked locally: `.local/recipe-levels/api-levels.mjs` (20 checks with a signed stand-in) and the bridge itself against the local API with Hermes stood in (`bridge-driver.mjs`); not deployed. Still to build: the Admin form to ask for a level, then ratings and the Gather round.

**Make levels, ratings and the Gather round (22 October 2026, after commit 4a525ca):**
- **Make levels:** the staff console's Game levels page has a **Make levels** tab. It finds QuinTaste and members' published recipes, shows each one's newest level and any open job, takes an optional shelf (cuisine), and asks QT Gamer for a level (`game-level-jobs`, one open job per recipe, audited `content.game_level.make`). The latest jobs list shows their state, token use and why any failed, with Try again. When the app's recipe list can't be reached, members' recipes still show. A standing notice says jobs wait until **Game progress** and the new **Recipe levels** switch (Features, control `game_levels`) are both on. The worker now reads members' recipes by their `title` and skips restricted authors.
- **Ratings** (`src/game/rating.ts`, Glicko-2, one game per period): a player's first settled attempt at a level and tier counts, at most 30 a Singapore day. A run doesn't count when it used more help than the tier gives or ran at a slower Pace (runs now store `pace`). A tier's rating settles after 40 players; the player's keeps moving. New tables `game.level_rating` and `game.player_rating`, plus `game.run.rated`, all in `levels.sql`. The level worker plays each tier at 0.7, 2.2, 2.8 and 3.2 s per action on six seeds. It keeps the 2.2 s check and stores each tier's starting rating from those clear rates. The speeds stand for players rated 1900, 1500, 1300 and 1150, placeholders to fit once main-path play exists (§5). Admin level cards show each tier's difficulty. Not built: the For you row and the fitted model.
- **Gather round** (From memory only, inside the timed service and the server replay): `missionFor` adds `Level.gather`, one group per required slot plus up to three look-alikes from the built-in ingredients. Two of them are kinds a guest's rule turns away (alliums, egg, dairy) and one is plain fresh, picked by the pack hash. While gathering, the clock runs but guests, twists and burners wait. A basket covers the stations with empty spaces that never name what's missing, and fills in drop order. A right ingredient goes in. A look-alike is refused and counts as a mistake. An optional ingredient gets "is optional, leave it for now" with no mistake. Nothing goes on a station until the basket is full. The round's time is added to the clock. The test player gathers first and keeps its own clock. Built-in levels play exactly as before: 240 old-versus-new engine runs match, and the rules version is unchanged (`1iypz0v`). No released app plays missions, so the engine version stays. "Cook it for real" now opens a recipe level's own recipe page (QuinTaste's or a member's), where Add to shopping list already lives.
- **Checked locally:** pack checks with six new Gather checks; mission suite 34 checks including 7 rating checks; level pipeline 21 checks including starting ratings; picture and level-limit suites; the playfield harness at phone width (basket, look-alike refused, optional ingredient, service starting once the basket is full); the staff console (search, make, job state, switch notice). Level 20 clears 3 of 4 at 2.2 s in the validator, the same with the old engine.
- **Release needs** `levels.sql` applied again (additive) with the operations role after a backup.
- **Still to build:** For you, quits and reactions, and the revocation list.

**Phase 1 finished, and Chapter 3 (22 October 2026, after commit d91944f; owner decisions the same day: kitchen credits 8 a recipe, three a day; five paid replays a day; Chapter 3 next; commit only):**
- **Credits** (`DAILY_CREDITS` in `cosmetics.ts`, kept out of the rules version so no app is asked to update; enforced on the server):
  - A Recipe Kitchen recipe pays 8 credits once, on its first clear at any tier (ledger kind `kitchen`, source `recipe:<id>`).
  - The first three such recipes a Singapore day pay, and never a member's own recipe.
  - Main-path and Today's special replays pay for the first five a day; later ones say so and still count for stars and bests.
  - Guests' device credits stay as they were (the account import already caps them by bests).
- **For you and New** (`src/game/kitchen-rows.ts`):
  - For you holds playable levels whose next tier this player should clear 60 to 80 percent of the time, with saved recipes first. When none fall in the band, the closest still show.
  - New holds levels fewer than ten players have tried, newest first.
  - Both leave out locked, finished and held levels.
  - The Kitchen list now carries the player's rating, each tier's difficulty, when the level went live, whether it is held, and the member's reaction.
- **Quits and reactions:**
  - Quitting a recipe level now reports the run: it settles as a quit and counts as a rated attempt.
  - After a saved finish, two icon buttons say liked or not (`game.level_reaction`, only from finishers).
  - A level leaves For you and New once at least 10 plays have more than 40 percent quits, or at least 10 reactions have more than 40 percent dislikes. It stays on its shelf.
- **Revocation list:**
  - The phone keeps the last 20 public recipe levels it played (`src/services/game-packs.ts`), so one can be played offline as practice. Private levels are never kept.
  - Whenever the shelf or a level loads online, levels on `GET /api/game-public/revoked` (hidden by staff) are dropped.
  - A server answer such as a hidden level is final; only an unreachable server falls back to the kept copy.
- **Chapter 3, the spice stall (Levels 21 to 30):**
  - **Blender:** a timed appliance (`StationKind` `blender`, opens at Level 21 in the Recipe Kitchen too).
  - **Transfer:**
    - A part with `makes` is never plated. Once ready it is dragged onto the station whose part takes that paste (`transfer` in the engine, replayed by the server).
    - The paste carries what was blended into it, so every guest rule sees it (blended shallots still break a no five pungent order).
    - A poured paste can't be lifted out, and is never on the shelf.
  - **Dishes:** coconut chutney, mint chutney (yoghurt is the vegan trap), sambal tempeh, laksa from scratch, green curry. Bought rempah and curry-paste jars hide belacan or fish sauce on their labels.
  - **Levels:** follow the chapter pattern (introduce, practise twice, mixed review, the rule, breather, rush, twist, review, finale).
  - **Test player:** blends what suits everyone waiting for the dish and counts a poured paste as made. Every level clears 4 of 4 at 0.7 and 2.2 s per action. At 3.5 s, Levels 21 to 26 clear and the rush, twist, review and finale do not, as in Chapter 2.
  - **Rules version:** changes with this content, so older apps are asked to update. New look-alike jars change every level's seeded jar shuffle; Levels 1 to 19 still clear at every speed, and Level 20 drops one seed at 2.2 s, as before.
  - **Recipe compiler:** "blend" steps now compile to the blender, with the paste poured into the next station. "Nasi lemak with sambal tempeh" plays as rice cooker, blender and wok, 6 of 6 at 2.2 s.
  - **Art (22 October 2026):** QT Gamer drew the blender, the four dishes, the 14 ingredients (`concepts-chapter3.json`) and the three blended pastes carried from the blender (`concepts-blended.json`), two or three variants each; every variant passed QT Gamer's checks and was reviewed by eye against the house art. Three were redrawn because they looked like an allium or another ingredient: lemongrass (like spring onion), candlenuts (like garlic) and grated coconut (like a bowl of rice). Imported with `scripts/import-game-art.py --add` (merges new runs into the imported art); the blender's geometry follows its picture (`stationArt.ts`). Levels 21, 24, 27 and 30 cook, pour and serve in the harness. Approved by the owner, acting as the artist, on 22 October 2026. The chapter reward (Spice market skin) still waits for art, so Level 30 unlocks nothing yet.
- **Checked locally:**
  - Validator: every level and all 1,354 specials at 0.7 s.
  - Pack checks, including the new row and Gather checks.
  - API suites: missions 46, level making 21, pictures 13, level limits (now counting from the real number of levels).
  - The playfield harness at phone width: blend, pour onto the wok, card and chef wording.
  - TypeScript, server typecheck and lint.
- **Built since (22 October 2026):** member levels (Phase 4), Chapters 4 to 10, seven more seasons and cafés; see the 22 October note below §11.

**Review fixes and Phase 3, Seasons (22 October 2026, after commit ee4b433; commit only):**
- **Review fixes** (`a0cb69e`):
  - Shapes are checked against real stations.
  - Kept levels change in one queue.
  - Kitchen quality counts are two grouped queries, kept a minute.
  - The own-recipe check uses the recipe's id index.
  - Made items are cached until a pack adds dishes.
  - The recipe card counts poured pastes per guest in queue order.
  - The revocation list holds public levels only, uncapped.
  - The run index is built `CONCURRENTLY` after the transaction.
  - A pour feeds only as many guests as both halves were made for, and says so.
  - The test player prints nothing on the server.
- **Seasons** (`src/game/content/seasons.ts`):
  - **Content:** seasons are built-in content (the rules version covers them). Each has featured windows by Singapore date, a community reviewer's sign-off and six levels (`Level.season`).
  - **Featured, never expiring:** `featuredSeason` picks the one around its festival, shown as "Featured now". Every season stays on the shelf and plays any year: no countdown, no expiry, nothing paid.
  - **First season, Zhai days:** every order is five pungent-free. Its dishes are fried bee hoon, lo han jai (black fungus or baby corn for Uncle Lim; ginger optional for Asha), mock char siew rice (one char siew sauce hides honey and garlic) and zhai curry.
  - **Not live yet:** Zhai days has no sign-off yet, so production shows and serves nothing of it. Development builds and servers play it so it can be reviewed. The sign-off goes in `signedOff` in the release that turns it on.
  - **Test player:** all six levels clear 4 of 4 at 0.7 and 2.2 s per action; at 3.5 s every level but the finale clears.
- **Server:**
  - Season runs open behind the new `game_seasons` control (off by default; Admin Features "Seasons").
  - A season opens after Level 10, and a level needing an unlearned station says where to learn it.
  - Runs replay by season id and number (`game.run` `season_id`, `season_n`; the run check is now `run_kind`, added `NOT VALID` then validated).
  - The first clear and Mastered pay once ever (ledger `season_clear` / `season_mastered`, source `season:<id>-<n>`). Replays pay under the daily cap.
  - Bests go in `game.season_best` and come back in account progress (`GameProgress.seasons`).
  - A run started before the switch goes off still settles.
  - Guests keep season bests on the device; they are never imported.
- **App:**
  - A Seasons tab on the Rush Hour sheet, shown only when `GET /api/game-public/seasons` says on (fail closed).
  - Each season shelf has "Featured now", a "Not reviewed" mark in development, and six levels with stars or what to learn first.
  - Play opens `/game/play?season=…&n=…`, and "Next" moves through the season.
- **Art (22 October 2026):** QT Gamer drew the season's three dishes and seven ingredients (`concepts-zhai-days.json`), reviewed by eye; the char siew rice was redrawn because both first variants had spring onion on top. Levels 1, 4 and 6 cook and serve in the harness. Approved by the owner, acting as the artist, on 22 October 2026.
- **Rewards:** the café skin and decor wait for art.
- **Checked locally:**
  - Full validator: all 30 levels, 6 season levels and 1,354 specials at 0.7 and 2.2 s.
  - Pack checks (now with the review-fix checks).
  - API suites: seasons 14, missions 46, level making 21, pictures 13, level limits.
  - TypeScript, server typecheck, lint.
  - The Seasons tab itself is not checked in a browser or on a device.
- **Gate to finish Phase 3:** a reviewer's sign-off, the season art, and the live release.

**The rest of the phases (22 October 2026, owner: "setup the rest of the phases and game assets accordingly"; decisions the same day: guests play everything in order, cafés behind a switch, chapters live as built and seasons behind sign-off, deploy each part):**
- **Guests** (live, `d10fc9a`): Recipe Kitchen tiers open in order for guests with bests on the device (`GameProgress.kitchen`); the sign-in import brings season and Kitchen bests to the account (`server/game/progress.mjs`), with season clears counted in the import credit cap. One member check for the game (`useGameMemberId`).
- **Phase 4, member levels** (`d4de637`): a member asks for a private level from their own published recipe (`POST /api/game/levels`, `server/game/levels-members.mjs`: an AI Recipes plan, five a day, two in line; dedupes to a level already made); an AI recipe a member asked for gets one with its request; member jobs go first to QT Gamer and fail visibly after ten minutes in line; the level is the author's alone (ready at once) until staff **Make public**; public member levels can be reported (kind `level`) and drop out for blocked or restricted authors and hidden recipes. Checks: `.local/member-levels/api-check.mjs` (23).
- **Chapters 4 to 10** (`887ff6a`, Levels 31 to 100): steamer (burn-if-left), oven (thermostat, preheat), griddle (flip: a spatula dragged on at halfway), fryer (preheat, batter by transfer), dough board (fold, then the next station), fridge (set and chill after the dessert pot), whole meals (three stations on one tray). Engine: `Stage.turn`, `STATIONS` thermostat, preheat and burnAfter, the `turn` action in replay; the test player preheats, flips, folds and breaks two-station waits. New look-alike pairs roll on their own random stream, so Levels 1 to 30 deal exactly as before. Every level clears 6 of 6 at 0.7 and 2.2 s; finales are hard at 3.2 s like Level 30. Content in `src/game/content/chapters/`.
- **Seven more seasons:** Reunion kitchen, Sunset bazaar, Nine days, Festival of lights, Year-end table, Lantern bakery and Dumpling day, 42 levels and 19 dishes (`content/chapters/seasons-dishes.ts`), all clearing at 0.7 and 2.2 s; none signed off, so production shows none.
- **Phase 5, cafés** (`6d6ddaa`, behind `game_cafes`, off): Open my café (name of 30 characters with no links or numbers, a menu of up to six reviewed levels, terms version 1, open switch, private weekly counts); Out and about from the window lists open cafés (search by name or dish); a visit is a service of the menu (`mission.ts cafeFor`, run kind `cafe_host` and `cafe_menu`, replayed from the snapshot) that pays kitchen credits once per café; report, block and staff hide (Admin > Game levels > Cafés). QT-048 updated in docs/PRD_COVERAGE.md. Checks: `.local/cafes/api-check.mjs`; local load test 1,000 concurrent public reads from distinct addresses, all 200, warm p95 about 0.7 s on one local process (`.local/cafes/load.mjs`; production capacity not tested).
- **Art:** QT Gamer drew the six stations, the spatula and fold tools, the chapters' dishes and ingredients and the seasons' dishes and ingredients, each reviewed by eye; anything with spring onion, a pink or blue cast from the cut-out colour, or a look-alike was redrawn. Chapter and season reward skins and decor are not drawn yet, so those rewards still unlock nothing.
- **Before cafés turn on:** the owner's terms wording and published contact details. Before seasons show: each season's sign-off.
- **Review and release (22 October 2026):** a full code review (engine, server, app) found 30 issues; 29 were fixed in `ae74f94` (among them: café deals honour unchecked ingredients, compile no longer sends wok steps to the new stations, no flares on the oven, café credit once per recipe and never for your own, an opaque café id, members' level jobs survive retries, the turn tool sits above its station). Still open: an author's newer private level hides their public one from the café menu choices (the kitchen query returns one level per recipe). Live as **20261022-game2**; production guest check: Level 1 by finger drags, Level 31 shut for a new guest, one level of each of Chapters 4 to 10 opens with its station art after earlier clears, seasons shut.

**"Everything covered"** = Chapter 10 shipped, all eight seasons live, cafés open. Phases 1, 2 and 3 can run side by side once Phase 0 is done.

## 12. How we'll know it works

- **Per level:** first-attempt pass rate, time to pass, quits before the end, retries.
- **Per chapter:** how many who start it finish it (Overcooked 2's 36-level story is finished by 17% of players, so expect drop-off and watch where it happens).
- **Play to Cook:** share of cleared recipe levels followed by a finished Cook mode for that recipe within 7 days.
- **Kitchen:** ratings that settle; levels pulled for quality.
- **Seasons:** plays of past seasons, which shows the shelf works.
- **Economy:** credits earned and spent per week; Golden through re-blooms against Golden bought.
- Never targets: session length or streaks (GP:439).

## 13. Rules and documents this plan changes

| Rule or file | Change | When |
|---|---|---|
| PRD §19 "All 20 levels" | About 100 levels in 10 chapters (owner, 21 Oct) | Now |
| QT-048 private café; `CafeSheet.tsx:26` | Opt-in cafés | Before Phase 5 |
| `GAME_HOME_PLAN.md:41` window for Stall visits | One Out and about sheet | Before Phase 5 |
| Level limits, run shape, rules version, ledger keys, unlock kinds, cuisine list | §4 | Phase 0 |
| Game copy using the old meaning of "vegetarian" | The 20 October label rule (§10a) | Phase 0 |
| Replay grants with no daily cap (`GAME_ACCOUNT_PROGRESS.md:105`) | Owner decision (§14) | Phase 0 |
| RECIPE_LEVELS_PLAN: automatic publishing, Beat the chef, host decor, free member AI levels, Today's special from Saved, its own phases | Replaced by staff review, no host rewards, AI plans, the For you row and this plan's phases | Done 21 Oct |
| `AVATAR_LOTUS_PLAN.md:147, 151` credit assumptions | Re-model with this plan's earning | Phase 0 |

## 14. Open decisions (recommendation first)

1. **Replay cap:** five credited replays a day, decided before Phase 1.
2. **Lotus and Golden pace:** keep the breed at 600 and re-blooms at 150; model the Golden pace in Phase 0 and revisit after Chapter 4.
3. **Kitchen credits:** 8 per recipe's first clear, the first three a day, none for your own recipes.
4. **Host rewards:** none; private counts only.
5. **Café entrance:** the window's Out and about sheet with Stall visits and Cafés.
6. **First season:** Zhai days (Vesak, 20 May 2027) as the planned first; earlier only if ready.
7. **Chapter dishes and themes:** §3 is a proposal; the content team and cultural reviewers finalise each chapter.
8. **Image source:** keep QT Gamer on the ChatGPT plan if its terms allow automated use; otherwise choose a paid image API.
9. From RECIPE_LEVELS_PLAN §14: other members' recipes on café menus, private draft levels, sketch cards, picture approval, side-step shortcuts.

## 15. Research behind this plan (21 October 2026)

| Topic | Finding | Sources |
|---|---|---|
| Level groups | Cooking games group by restaurant or world: Diner Dash 5 × 10, Cooking Fever about 40 per restaurant, Overcooked 2 six worlds of six plus free seasonal kitchens | [MobyGames](https://www.mobygames.com/game/22237/), [Cooking Fever wiki](https://cookingfever.fandom.com/wiki/Talk:Restaurants/@comment-103.143.168.150-20200702102139), [Team17](https://www.team17.com/news/overcooked-2-winter-wonderland-update-out-now) |
| Finishing rates | 17.1% of Overcooked 2 players finish its 36-level story | [Steam stats](https://steamcommunity.com/stats/728880/achievements) |
| Difficulty | King: "crazy hard levels never pay off"; fix the least-fun levels. Rovio: level difficulty predicts 7-day churn | [mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/), [arXiv 2008.12937](https://arxiv.org/abs/2008.12937) |
| Learning path | Duolingo moved to one path with spaced review mixed in | [Duolingo blog](https://blog.duolingo.com/new-duolingo-home-screen-design) |
| Seasons | What resets: ranks (Clash Royale, Brawl Stars, Duolingo leagues), passes (Fortnite). What doesn't: Overcooked 2's seasonal map, Animal Crossing's yearly events, Helldivers 2's warbonds | [Supercell](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-october-2022), [Epic](https://www.epicgames.com/help/c-202300000001636/c-202300000001721/can-i-purchase-or-progress-on-a-previous-fortnite-pass-a202300000012800), [Team17](https://www.team17.com/news/overcooked-2-suns-out-buns-out-update-available-now), [Push Square](https://www.pushsquare.com/news/2024/01/unleash-democratic-carnage-with-warbonds-in-helldivers-2-on-ps5) |
| Time pressure | CCS action on fake countdown timers (May 2026); EU consumer actions on games (2025–2026); Digital Fairness Act expected Q4 2026 | [CCS](https://www.ccs.gov.sg/media-and-events/newsroom/announcements-and-media-releases/three-online-retailers-caught-using-false-urgency-tactics-and-misleading-claims-to-pressure-shoppers/), [European Commission](https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/coordinated-actions/social-media-online-games-and-search-engines_en), [European Parliament](https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act) |
| Member content | Apple 1.2 (filter, report, block, contact details), 2.5.2 (no downloaded code); Google Play UGC policy | [Apple](https://developer.apple.com/app-store/review/guidelines/), [Google Play](https://support.google.com/googleplay/android-developer/answer/9876937) |
| Placing levels | Official path vs community lanes; promotion by people, visibility by data: Mario Maker 2, Geometry Dash, Levelhead, Trackmania, Roblox | [Levelhead](https://blog.bscotch.net/post/levelhead-solving-the-play-problem-for-user-generated-content/), [Trackmania](https://doc.trackmania.com/play/what-is-totd/), [Roblox](https://create.roblox.com/docs/discovery), [RobTop](https://robtopgames.com/files/GDRating.pdf) |
| Rating levels | Glicko-2 player vs puzzle; first attempt only; capped updates; bots plus a regression predict pass rates before play | [Lichess code](https://raw.githubusercontent.com/lichess-org/lila/master/modules/puzzle/src/main/PuzzleFinisher.scala), [Sarkar & Cooper](https://par.nsf.gov/servlets/purl/10133941), [King bots paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf), [Kristensen & Burelli](https://arxiv.org/abs/2401.17436) |
| Calendar | Lunar dates, public holidays, Ramadan, festival practice and sensitivities | [HKO tables](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2027e.txt), [MOM](https://www.mom.gov.sg/employment-practices/public-holidays), [MUIS](https://www.muis.gov.sg/resources/media-releases/announcement-by-mufti-for-the-month-of-ramadan-1447h-2026-for-singapore/), [Roots](https://roots.gov.sg/ich-landing/ich/zhong-yuan-jie-hungry-ghost-festival), [SCCC](https://culturepaedia.singaporeccc.org.sg/en/social-practices/the-nine-emperor-gods-festival-in-singapore/), [IMDA game guidelines](https://imda.gov.sg/-/media/imda/files/regulation-licensing-and-consultations/content-and-standards-classification/policies_videogames_vgguidelines.pdf) |

No source compared retention under a finite and a growing campaign; the chapter plan rests on how comparable games are built, not on a controlled result. Appliance ownership in Singapore homes beyond microwaves is unsurveyed.

## 16. Risks

| Risk | Mitigation |
|---|---|
| The rules-version split or the schema migration breaks live progress | Append-only numbers; rehearsal on a production copy; identical-replay checks; `NOT VALID` then validate |
| Review and art can't keep up | One review queue and picture grid (Phase 0); staff choose which recipes to convert; measure the rate; set dates from it |
| Players stop partway through a chapter | Per-level quit data; fix or soften the worst levels, as King does |
| A cultural or religious misstep | A reviewer from that community for every season and festival dish; the "not themed" list |
| Credit inflation across 100 levels | Replay cap; kitchen cap; decor sinks; Golden pace modelled in Phase 0 |
| A season needs an unbuilt technique | §6 table: start each season the year its techniques exist |
| QT Gamer's plan terms or image limits | Confirm terms in Phase 0; measure throughput; owner decides on a paid image API if needed |
| Endless content demand (the "content treadmill") | Kitchen and seasons carry variety; mastery replays and Today's special between chapters |
| New rules on games (EU Digital Fairness Act, Singapore) | No currency for sale, no countdowns, no paid randomness; re-check before any paid item |
