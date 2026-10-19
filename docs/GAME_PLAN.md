# Rush Hour: enhanced game plan

**Status:** proposal, revision 4, 18 October 2026. Nothing is built. All balance values remain untested proposals.

**Revision 4 changes:** the owner supplied a polished art target (`docs/game/references/art-target-2026-10-18.webp`) and asked which platform suits it. The target is illustrated, pre-rendered 2.5D, so the plan changes from real-time 3D to a 2D game framework with rendered sprite art: **Phaser 4 with Spine characters in a WebView**, game code bundled in the app and the same build on web, sharing one TypeScript simulation with the server (§12.0). Unity becomes a 2D fallback. The layout now has seven bands (§13), with a separate heat panel and dialogue panel. For characters, the owner chose the board sketch's 2D regulars (Office lunch, Auntie Mei, Jia Hui) over the art target's character art (§2, §16).

**Revision 3 changes:** the owner supplied a time-management reference layout and a coin-pickup motion reference and asked for stylized 3D. The playfield now follows that layout framework (§13): HUD with round timer, takings and stars; a recipe strip; guests at counter seats with order bubbles and patience; ingredient shelves; stations at the bottom. Coins are in-service takings with a five-step pickup motion (§9, §13). Art direction is stylized 3D (toon shading, outlines). The engine is open again: web 3D first versus Unity first (§12.0).

**Revision 2 changes:** after reviewing every game and identity board (A01–A10, G01–G10, N25-01–04) and the owner's direction for a 2.5D game with drag and drop and rich animation built in Unity, this revision replaces revision 1's flat React Native views playfield with a 2.5D fixed-camera kitchen in **Unity as a Library**, follows the mockups' café composition and art direction, and moves the hawker-stall idea to an optional later dressing. The educational core, regulars, bridges and ethical rules from revision 1 stay.

**Builds on:** PRD Edition 1.4 §15–19 (pp28–33) and Appendix A (pp53–54); the reconstructed game design proposal 0.1 (`../others/QuinTaste_Interactive_Cooking_Game_Design_Reconstructed.pdf`); UI reference A01–A10 (pp27–30) and G01–G10 (pp31–35); supplement N25 (p28). Where this plan changes a PRD requirement, §16 says so.

## 1. Summary

The PRD plan is a well-guarded cooking loop (place, heat, plate, serve) with strong accessibility, integrity and ethical-economy rules, and the mockups set a clear look: a warm, sunlit 2.5D café kitchen with tactile 3D ingredients, a terracotta stove, a wooden counter and dining tables behind. What the plan lacks is food knowledge worth learning and links back into the app.

This plan keeps every guard and the mockups' look, and adds:

1. **A polished, illustrated 2.5D game.** A fixed-camera café kitchen drawn to the owner's art target (§2) in the reference layout (§13): HUD with timer, takings and stars across the top, guests with order bubbles at the counter, ingredient shelves, stations, a heat panel and a dialogue panel. Ingredients are picked up, carried and dropped with physical feedback (lift, arc, splash, sizzle, steam, toss), and coins fly to the counter on every serve. Engine: Phaser 4 with Spine in a WebView (§12.0).
2. **An educational core.** Every ticket carries the guest's food rules (Vegan, No five pungent, Jain, a taste preference). The player learns to read them, check packaged-ingredient labels and choose allowed swaps, which is the skill QuinTaste exists to support.
3. **Real recipes.** Every game dish is one of the Cook recipes, simplified to game portions. Sequence lessons come from the real method (kangkung stems before leaves).
4. **Meaning.** A small cast of fictional regulars whose own reasons and short stories unlock as you serve them well.
5. **Additive to the app.** After a service, bridges open the real recipe (Cook), the dish nearby (Explore) and the Ask-the-stall card. Nothing in the app ever needs game progress.
6. **Compelling, not compulsive.** Short services, mastery stamps, collections and a café that visibly grows. No streaks, energy, loot boxes or loss for absence (QT-057).

**On the engine.** PRD Appendix A picks React Native Skia v2 with pre-rendered isometric sprites first and lists Unity as a Library as the fallback "only if the spike fails". The owner's art target is exactly that kind of pre-rendered art, so revision 4 returns to Appendix A's approach (rendered sprites, fixed camera) but runs it in Phaser 4, a full 2D game framework with an official Spine runtime, instead of building game infrastructure on Skia (§12.0). The Appendix A spike criteria still decide; Unity 2D stays the fallback.

## 2. What the mockups establish

| Board | Fixes | Notes for the build |
|---|---|---|
| G01 Rush Hour | Pre-service brief: dish art, "Add → Cook → Plate → Serve", today's lesson, mode, Start service, accessible controls link | "Standard" becomes **Rush** (PRD wording) |
| G02 Add to the pan | Select ingredient, portions stepper, choose pan, Place in Pan 1, Cancel selection | Drawn as a form; becomes direct manipulation on the live playfield (N25-02) with select-then-place kept as the equal alternative |
| G03 Keep a steady heat | Heat band Cool / Target / Too hot with needle; cooking progress separate ("70% · cooking", not Ready) | Supplement p2: **tap toggle is the default**; hold is an option |
| G04 Serve the right table | Plated dish, destination tables with number and shape, wrong-table drop never silently delivers | Becomes dragging the plate to a table in the scene |
| G05 Nicely served | Skill points, learning XP and credits shown separately; "You learned"; Knowledge, Skill, Wallet | "Try again free" becomes **Play again** (QT-057) |
| G06 Back at your café | Café scene, Next lesson, Learning collection, Wardrobe, Choose next level | The old five-tab dock with Connect/Play is obsolete; use the current dock |
| G07–G08 Venue surprise | Optional venue claim with an equal at-home route; cosmetic item with no cash value | After the pilot, separate gate (QT-058); out of scope here |
| G09 Play your way | Place ingredients, heat control, pace, reduce motion, read orders aloud; pause safely | Kept as the in-game settings |
| G10 Reconnecting | Last action saved, pending rewards, retry the same attempt, no duplicate reward | Kept for Phase B |
| A01–A03 Avatar | Original stylised 3D character, Adult or Mini style, optional selfie | The board itself says the Blender proof **failed** appearance quality; 3D avatars stay a separate gate |
| A04–A07 Wardrobe and companion | Peach apron, Sprout the cream companion with leaf ears, preview versus own versus equip | Cosmetics for credits; Sprout is optional and gives hints from a perch away from food |
| A08–A10 Café | My little café, decorate with named positions, café details (name, cuisine style, menu collection, audience) | The meta layer; private, not a real venue or seller |
| N25-01–04 | Play from Me, one playfield with at most four open orders, level select with Calm/Rush, 2D portrait fallback | The Game tab replaces "Play from Me" (owner's 15 October navigation decision) |

**Art direction taken from the boards:** stylised, softly lit 3D with warm wood, cream stone counters, a terracotta stove, sage-green chairs, plants and ceramic bowls; chunky, readable ingredients; peach and coral accents that match the app's coral palette. The app's other palettes (cobalt, lavender) tint the café's soft furnishings so the game follows the player's chosen theme.

**Owner references, 18 October 2026 (revision 3):**

| Reference | What it sets | What it does not set |
|---|---|---|
| Time-management cooking game screenshot | Layout framework: HUD row (round timer ring, level, score bar, orders left, pause), a recipe strip for the current dish, guests across the counter with order bubbles and patience hearts, ingredient shelves in the middle, cooking stations at the bottom | Art style, its menu (meat, beer), lives and paid boosters |
| Owner's stylized 3D concept of Level 5 | Toon-shaded 3D look, rounded props, dark glass HUD panels, guest dialogue with a portrait | Final composition: guests move to the counter as in the reference layout |
| Coin-pickup motion reel (motionbykrit, "5 steps to make it feel satisfying") | Coins never just vanish: squash, sparkle, arc to the counter, the counter "eats" the coin, then the number ticks up (§13) | The reel itself sits behind Instagram's login; the steps come from its caption and comments plus standard practice |

**Owner art target, 18 October 2026 (revision 4).** Saved as `docs/game/references/art-target-2026-10-18.webp`; the earlier concept is `concept-2026-10-18-a.webp`. This target supersedes revision 3's toon-shaded 3D and dark glass HUD.

| Element | In the target |
|---|---|
| HUD | Cream rounded panels with soft shadows; teal timer ring around a dark disc; gold coin, count and a bar with three star marks; "Level 5"; orders left; orange List button |
| Recipe strip | Painted dish bowl, "Mapo tofu for Office lunch", ingredient slots that fill with the added items, a peach hint pill |
| Guests | Round faces with closed happy eyes, rosy cheeks and hands on cheeks; dark hair in buns; blue and coral sweaters; white bubbles with five hearts |
| Backdrop | Sunlit café: window onto a soft city and trees, pendant lamps, a chalkboard with a bao doodle, plants and jars |
| Counter | Wooden bar with cream plates and person-icon number pills at four seats |
| Shelves | One cream panel holding illustrated ingredient cards (Fresh left, Pantry right) with names; yellow Label tags on jars A and B |
| Stations | Wooden plating board with two plates; terracotta stove with a black wok and a glowing burner; utensil pot |
| Heat panel | Smooth blue-to-red gradient meter with a striped target band and ticks, words below; dark red "Heat off" pill; "Wok: Cool · Empty" |
| Dialogue | Round portrait, pink name pill, white speech panel |

**Style:** painted or softly rendered 3D look with warm light, rounded forms, gentle gradients and soft shadows, delivered as 2D sprites from one fixed camera. Nothing in the target moves the camera or needs real-time lighting, which is why §12.0 uses a 2D engine.

**Characters (owner choice, 18 October):** use the regulars as drawn in the board sketch on the published page: Office lunch (short dark hair, blue top), Auntie Mei (grey hair in a bun, coral top, apron in her portrait) and Jia Hui (ponytail, green top), each with a distinct look, walking in, bobbing while they eat and shaking their head at a rule break. They replace the art target's character art; the rest of the target stands. The final artist redraws them at the target's finish. Because the app is 18+, PRD 1.3 renamed Mini Me to Mini style to avoid child-appeal signals and keeps it out of store screenshots; apply the same rule to these round-faced characters, and keep clothing and context clearly adult.

## 3. Diagnosis of the PRD game plan

**Keep unchanged:** earned-only cosmetic credits and no loss for absence (QT-056/057); drag or select-then-place, tap-toggle heat, Calm mode and a semantic station list (QT-050/051/053); a deterministic simulation with server replay before credit (QT-055); separate knowledge, skill and credits with a scoring rule where a fast wrong service never beats a correct one (QT-054); the six-level gate before Levels 7–20 receive art (§19); the heat model and the dish/order state machines (§18).

**Gaps:**

| # | Gap | Evidence | Effect |
|---|---|---|---|
| G1 | Lessons are mechanics, not food knowledge | §19 decisions such as "toggle heat" and "keep four table identities distinct"; G05 "A steady target heat helps the ingredients cook evenly" | Little worth learning |
| G2 | QuinTaste's own expertise is missing | No ticket uses diet, the five pungent, Jain practice, labels or hidden ingredients | The game could belong to any app |
| G3 | Closed world | Only "View real recipe" after service | Does not feed Cook, Explore or Ask-the-stall |
| G4 | Guests are table numbers | No people behind orders | Serving feels abstract |
| G5 | Difficulty mostly comes from load | Most of Levels 9–20 add orders, tables or seconds | Repetitive; skews toward speed |
| G6 | Steps drawn as separate forms | G01–G04 show one card per step; N25-02 started the fix | Needs one living 2.5D playfield |
| G7 | Engine undecided between the PRD and the owner | Appendix A: Skia first, Unity fallback; owner: Unity | Revision 4 recommends Phaser 4 with Spine for the owner's illustrated art target, with the spike as the gate (§12.0) |

## 4. Concept

You run a small plant-based café, as drawn in the mockups. Regulars come in with their orders and their own food rules. Cook it right, serve it right, learn what is really in the food, and grow the café.

| Pillar | What the player does | What it records |
|---|---|---|
| **Cook it right** | Pick up, drop, heat, sequence, plate, serve | Service skill (per level and mode) |
| **Serve it right** | Read guest rules, check labels, choose allowed swaps | In-game food knowledge |
| **Grow your café** | Earn decor, wardrobe items and companion styles; fill the recipe book, pantry book and regulars' stories | Cosmetic ownership and collections |
| **Bridges** | Cook it for real, find it nearby, practise asking | Nothing; they open the app |

Keep the name **Rush Hour** and the meta screen **My little café** (QT-048 rules: private, not a real seller, never confused with Market **My shop**). A Singapore hawker-stall room is a strong later dressing for the same scene (numbered hawker tables, lunar-night lanterns); it is a decor set, not a separate game.

## 5. Core loop

**Per order** (about 20–60 simulated seconds):
1. **Read.** A guest walks up to a counter seat (seat pill with a person icon, number and shape) and an order bubble pops above them: dish, rule chips and, in Rush, patience hearts. Tapping a guest makes them the one you are cooking for, and the recipe strip shows their dish.
2. **Prepare.** Pick up an ingredient from the shelves and drop it in the pan, or tap it then tap the pan. Packaged items (jars, packets) show a Label tag; opening it pauses the round timer and every guest's patience.
3. **Cook.** Turn the burner on and off to hold the heat band. Add later ingredients when the pan shows Ready for next.
4. **Plate.** Slide the finished dish from the pan to the plating board. The board is finite; an occupied spot cannot be overwritten.
5. **Serve.** Drag the plate onto the guest, or tap the plate then the guest. Coins pop out and fly to the takings counter.

Guests at counter seats replace the dining tables behind the pass (revision 2). Seat plaques keep the PRD's number-and-shape identity (QT-049) for screen readers and the station list; with the order shown above each guest, the serving decision becomes "which plate fits whose rules", which is the lesson.

**Per service** (1.5–4.5 minutes): 1–9 orders, at most 4 open, then results and a natural stop.

### Stations

Every station uses the same controls (pick up and drop; burner toggle) or no heat at all. Each adds a decision, never a harder gesture.

| Station | First level | Decision it adds | Dishes (Cook recipe ids) |
|---|---|---|---|
| Pan | 1 | Heat band, ingredient sequence | `fried-bee-hoon`, `sesame-greens`, `kangkung`, `mapo-tofu`, `mee-goreng`, `sweet-sour-tofu` |
| Soup pot | 9 | Low simmer band, long cook, carryover heat | `abc-soup`, `coconut-laksa`, `oat-porridge` |
| Rice cooker | 12 | No heat control; start early, finish later | `nasi-lemak`, `claypot-rice` |
| Assembly board | 16 | Layer order, no heat | `popiah`, `kaya-toast`, `nasi-lemak` plate |
| Dessert pot | 18 | Gentle band; sugar scorches easily | `bubur-cha-cha`, `sago-gula-melaka` |

The prototype (Levels 1–6) uses only the pan.

### Ticket rules: the educational core

Rule chips use words plus an icon, never colour alone, and match the app's exclusion names (`src/config/preferences.ts`): **Vegan** (no eggs, dairy or honey); **No five pungent 五辛** (the app's seven-item allium list); **Jain** (the app's Jain preset); **taste preferences** (No mushrooms, Less spicy, Extra greens).

**Allergies are never ticket rules.** Game success must never suggest that food is safe for an allergic person (proposal 0.1 §5). Everything in the kitchen is vegetarian; the traps are vegetarian items that do not fit a particular guest. Hidden animal ingredients arrive only through bought-in products (a supplier's sambal whose label lists belacan) and are caught by reading the label.

Packaged items carry a game-authored label: product name, ingredients and a Contains line. Labels are fictional game products, never real brands, and the sheet says "Game label".

### Mistakes teach, never punish

- **Before heat:** a conflicting ingredient in the pan glows with a warning marker and the ticket chip pulses, with one sentence ("Garlic is one of the five pungent. Ginger is a common swap."). Tapping it lifts it back to its bowl, free.
- **Conflicting serve:** the guest politely pushes the plate back; it slides to the pass. It is not a valid delivery, so the player can remake the dish or serve that plate to another table without the rule. Only the Rules stamp is lost; the explanation is saved to the pantry book.
- **Scorch:** smoke puffs, the pan shows Needs restart; restart is free (PRD).
- **Wrong table:** the plate slides back to the pass with the reason (PRD).
- **Fading hints:** first appearance has a highlight and a chef line; the second only a chip highlight; later none.

## 6. Educational design

| Id | Objective | Introduced | Revisited |
|---|---|---|---|
| K1 | Read a ticket: dish, table, rules | L1 | every level |
| K2 | The five pungent, including hidden ones in pastes and garnishes | L5 | L6, L11, L18 |
| K3 | Vegan versus vegetarian: eggs, dairy, honey | L2 | L6, L14 |
| K4 | Check the label on packaged ingredients | L5 | L14 |
| K5 | Sequence from real technique (kangkung stems before leaves) | L4 | L13 |
| K6 | Ginger as a common allium swap | L5 | L11 |
| K7 | Hidden animal ingredients in bought-in products (belacan in sambal) | L14 | L19 |
| K8 | Some yellow noodles contain egg | L14 | L19 |
| K9 | Jain practice: roots and mushrooms too, so ginger is not the swap | L17 | L19 |
| K10 | Allowed substitutes and their trade-offs (from the Cook adaptation notes) | L11 | L20 |
| K11 | Lunar 1st and 15th and Nine Emperor Gods meals | L18 | Today's special |
| K12 | Asking the stall the right questions | Stall visit interlude | — |

Each objective is **Introduced** with a worked example, **Practised** with the hint faded (one accepted meaningful decision, QT-054), then **Revisited** in a different dish or twist interleaved with other rules. Level 17 deliberately breaks the Level 5 habit (ginger is a root), so recall beats repetition. Results show one **One thing to remember** sentence, saved as a pantry card. No quizzes during play.

**Honesty lines** (once in the pantry book and on the first label): game portions and times are not real recipe amounts or cooking instructions; real products vary, so check the actual label; food rules are each guest's own choice and nobody's rules are inferred; learning claims stay limited to in-game evidence unless the study in §14 measures transfer.

**Content review:** every game recipe, label, rule explanation and regular's story needs an editor and a relevant cultural or religious reviewer (Buddhist and Taoist vegetarian practice, Jain practice, Malay, Peranakan and Indian cuisine). Open question for the Jain reviewer: the app's Jain preset includes asafoetida among the alliums, while some Jain kitchens use it. Resolve before Level 17; it may also affect the app preset.

## 7. Regulars and companion

Fictional adult regulars with original 2D art, as drawn in the board sketch (owner choice, §2). Reasons are self-stated and never inferred from name or appearance; names, looks and wording need reviewer sign-off. Each has three short story notes that unlock after correct services. Nobody becomes sad or leaves when the player is away.

| Regular | Usual rule | In their words (draft) | Teaches | First level |
|---|---|---|---|---|
| Daniel | Vegan | "Started for the planet, stayed for the food." | K3 | L2 |
| Auntie Mei | No five pungent on the 1st and 15th | "My mother kept the lunar days. Now I do." | K2, K11 | L5 |
| Jia Hui | Meat-free weekdays | "Trying one new dish a week." | K1 | L7 |
| Uncle Lim | No mushrooms | "Since young, cannot." | preferences | L8 |
| Nurul | Less spicy | "I like taste, not pain." | preferences | L8 |
| Asha | Jain | Wording from the Jain reviewer | K9 | L17 |

**Sprout** (A06), when chosen, sits on a shelf perch away from food surfaces and can point at an order or repeat an optional hint. It never sells anything, hides instructions or becomes distressed (proposal 0.1 §2). Choosing no companion is complete.

## 8. Level plan

### Prototype: Levels 1–6 (pan only)

| L | Name | Orders / stations / max open / tables | Rush | Dish | New decision | Objectives |
|---|---|---|---|---|---|---|
| 1 | First plate | 1 / 1 / 1 / 1 | Untimed | Fried bee hoon | Pick up, drop, cancel, heat, plate, serve (guided) | K1 |
| 2 | Read the ticket | 2 / 1 / 1 / 1 | 100 s | Sesame greens & tofu | Regular or Large portions; Daniel's first Vegan chip | K1, K3 |
| 3 | Feel the heat | 2 / 1 / 1 / 2 | 110 s | Kangkung | Hold the band; notice the cooling delay; leaves scorch fast | heat |
| 4 | Stems before leaves | 3 / 1 / 2 / 2 | 120 s | Kangkung | Stems, then sauce and leaves; first-clear grant | K5 |
| 5 | Check the label | 3 / 1 / 2 / 2 | 130 s | Allium-free mapo tofu | Two bean-paste jars; Auntie Mei | K2, K4, K6 |
| 6 | First lunch rush | 4 / 1 / 2 / 3 | 150 s | Bee hoon, kangkung, mapo tofu | Alternate cooking and serving with mixed rules; prototype checkpoint | K1–K6 revisited |

Each game recipe is a short versioned contract: ingredient tokens (two to four per dish), stages, accepted substitutes, rule conflicts, label text and explanations, linked by `recipeId` to the Cook recipe. Example, Level 5 mapo tofu: stage 1 ginger plus allium-free bean paste; stage 2 tofu plus shiitake; distractors: garlic and the bean paste whose label lists garlic.

### Levels 7–20 (data only until the prototype passes)

| L | Name | Decision | Objectives |
|---|---|---|---|
| 7 | Choose your menu | Pick a cuisine collection (A10): Chinese, Malay, Peranakan or Indian. Equal dish sets; changes collection, not power. Indian needs new Cook recipes first. | K1 |
| 8 | Small preferences | Honour No mushrooms and Less spicy alongside rules | preferences |
| 9 | Second station | Soup pot simmers low while the pan runs hot | heat |
| 10 | Carryover heat | Lower the heat before the coconut milk goes in | heat |
| 11 | The swap | Allowed substitutes from the Cook adaptations (ginger coconut laksa, allium-free mee goreng) | K6, K10 |
| 12 | Read the queue | Rice cooker; three open orders; start rice early | planning |
| 13 | Two-stage dish | Laksa: a hot spice base, then a low broth band | K5 |
| 14 | Hidden in the paste | New supplier: sambal label lists belacan; yellow noodles with egg | K3, K4, K7, K8 |
| 15 | A fourth table | Keep four table identities distinct | K1 |
| 16 | Finish together | Assembly board: a shared order lands together without overwriting a ready plate | planning |
| 17 | A familiar twist | Jain guest: ginger is a root, so the Level 5 swap is wrong | K9 |
| 18 | Lunar 15th night | Every ticket five pungent-free; dessert pot; lantern decor | K2, K11 |
| 19 | Dinner service | Triage four open orders with mixed rules | K2–K9 |
| 20 | Your signature service | Choose three menu dishes; completion badge and café scene variant | K10 |

**Stall visit interlude** (after Levels 6 and 14): the player visits someone else's hawker stall as the customer and chooses which questions to ask (from `src/data/stall-questions.ts`) to find out whether a dish fits their order. No timer, select-only, about one minute; it ends on the real Ask-the-stall card. It reuses the ticket and label systems with different mechanics, so the owner decides whether it ships inside Rush Hour or as a separately gated mode (QT-057).

## 9. Progression and economy

**Unchanged from the PRD:** the service score (`floor(69 × V/N)` when incomplete; Rush `70 + 20Hq + 10Dq`, Calm `70 + 30Hq` when all correct); completion at 75% valid deliveries and a clear at all; 30 credits per first clear and 8 per eligible replay; 20 XP at first Practised and 10 at Revisited; credits earned-only, non-cashable and cosmetic; proposed prices 40 / 80 / 160.

**Takings (coins), revision 3:**
- Coins are the visible running tally of the service, shown as money for feel. They reset every service, cannot be spent, saved, bought or transferred, and never show a currency symbol.
- A correct serve pays a base of 10 coins, a heat tip of 0–4 from that dish's time in the target band and, in Rush only, a prompt tip of 0–2 from the guest's remaining patience. Calm pays the heat tip only.
- A serve that breaks the guest's rule pays nothing and the plate comes back; an expired guest (Rush) pays nothing. Neither takes back coins already earned.
- Stars on the takings bar: the first star needs every order served correctly; the second and third need takings at 75% and 90% of the level's maximum. A fast wrong service therefore never beats a correct one (QT-054).
- Results convert the service to the PRD service score and its one reward line in **café credits**, the only persistent currency (earned-only, fixed grants, a different icon from coins; QT-056).

**Presentation:**
- **Three stamps per level:** Served, Rules respected, Steady heat. Three stamps mark the level Mastered. Display only; the 0–100 score stays the single service score.
- **Recipe book:** a page per dish with Served, Mastered and **Cook mode finished** (from the existing cooked log, honest wording, no credits or skill), plus the bridges.
- **Pantry book:** a card per ingredient from `src/data/ingredient-guide.ts` (role; English, Chinese and Malay names), label watch-outs, conflicting rules and recipes that use it.
- **Regulars book:** each regular's rule, words and unlocked notes.
- **Café growth by clears, free:** L1 starter café (one pan, two tables); L6 a third table and a menu board; L9 soup pot; L12 rice cooker; L16 assembly board; L20 signature scene variant.
- **Decor, wardrobe and companion styles for credits:** named snap positions with preview, exact price and balance, then explicit Buy and Equip, Undo and Save (A04, A07, A09, QT-047/048). Items earned in a level are never time-limited.

## 10. Engagement without compulsion

**Brings people back:** feedback within 100 ms of every action; stamps and a café that visibly grows; choice of menu, levels, Calm or Rush, decor and signature menu; regulars who remember you; silhouetted recipe pages and pantry cards; 1.5–4.5 minute services with a natural stop; an optional **Today's special** built from unlocked content with a date seed, earning the normal replay grant, five pungent-free on lunar 1st and 15th and Nine Emperor Gods days (`src/data/lunar.ts`), with no streak or anything to miss.

**Never:** streak counters or streak loss, energy, daily-login rewards, loot boxes, time-limited exclusive items, default push notifications, public leaderboards, "friends are ahead" prompts, offers after failure, penalties for absence, rewards for eating less, rewards that change with the player's own diet. An optional break note lives in Play your way, off by default.

## 11. Bridges into QuinTaste

| Game moment | Bridge | Destination | Needed app change |
|---|---|---|---|
| Results, recipe page | Cook it for real | `/cook/recipe/[id]`; the allium-free adaptation when the guest was No five pungent | None |
| Results, recipe page | Find it nearby | Explore searching the dish name | Explore accepts a query parameter (none today) |
| Pantry card | Recipes with this | Cook list filtered to the ingredient | Cook accepts an ingredient filter parameter |
| Stall visit end | Your Ask-the-stall card | Ask the stall from the player's own food choices | `/ask` works without a dish or place id |
| Five pungent and Jain cards | Set my food choices | `/food-choices` | None; never prefilled from game play |
| Cook mode finished on a game recipe | Recipe book stamp | — | Read the cooked log |

A bridge tapped inside the game posts a message to React Native, which pauses the game, navigates, and resumes the café when the player returns (§12.2). The game never reads the player's diet or exclusions to change difficulty, rewards or content.

## 12. Technical architecture

### 12.0 Engine: a 2D game framework for pre-rendered 2.5D art

Every surface in the owner's art target faces one fixed camera: painted ingredient cards, posed characters, a backdrop that never moves. That is the usual cooking-game pipeline: model or paint once, render to sprites, animate in 2D, with skeletal animation (Spine) for characters. Real-time 3D would add file size, GPU load and art cost with no visible gain. Revision 3's three.js route is therefore superseded for the playfield; three.js stays an option for a later real 3D surface (for example a 3D avatar, if A01–A03 ever pass their gate).

Research on 18 October found that non-game apps that add games mostly use web technology (Shopee Games built its in-app games in HTML5 with the Egret engine to protect app size; WeChat and Alipay mini games run Cocos, Laya or Egret) or an animation runtime (Duolingo chose Rive as "an alternative to a game engine"). Unity inside an app appears mainly for AR (IKEA). No production write-up of Unity inside a React Native app was found, and the only Expo bridge is a 0.1.0 community package.

| | Phaser 4 + Spine in a WebView (recommended) | Cocos Creator 3.8, web build in a WebView | Unity 2D as a Library | React Native Skia (Appendix A) |
|---|---|---|---|---|
| Fits the art target | Sprites, tweens, particles, Spine | Sprites, particles, Spine | Yes | Sprites; tweens, particles and character animation built by hand |
| Inside the Expo app | WebView (`react-native-webview`), game code bundled in the app | Same | Full screen only, one instance, native rebuilds, no Expo Go | Native, inside React Native screens |
| Web build | The same build | Yes | Separate Web build, aimed at high-end phones | React Native Web |
| Rules and server check | One TypeScript simulation shared with the Node API | TypeScript | C# simulation plus a .NET worker | TypeScript |
| Character animation | Official `spine-phaser-v4` runtime | Reads Spine 3.8 exports only | Official Spine runtime | No official Spine runtime; Rive possible |
| Development | Code first, browser hot reload, existing Playwright testing | Visual scene editor | Editor; native rebuild per change | Hot reload; game systems written from scratch |
| Download size | Small code; art downloads after install | Similar | Runtime very likely exceeds the 8 MB / 10 MB budget | Small |

**Recommendation:** Phaser 4 with `spine-phaser-v4`, in a WebView inside the app and unchanged on web. Phaser 4.0.0 was released on 10 April 2026 and 4.1.0 on 30 April; the 4.2 line is current, and `spine-phaser-v4` 4.3.x needs Phaser 4.2.1 or later. Pin exact versions in the spike. Cocos Creator is the editor-centric alternative if the team prefers a visual editor, but its Spine support stops at 3.8 exports. Unity 2D is the fallback (§12.8) if the WebView fails the spike's frame-time or memory criteria on the budget Android.

**App Store 2.5.2 / 4.7:** ship all game code inside the app binary and download only art (atlases, Spine data, audio). Game code is never fetched at run time. This is first-party game code rather than third-party HTML5 mini apps; confirm against the current App Review Guidelines in the spike.

### 12.1 Art pipeline

1. **Style frame:** one finished screen that matches the art target, from a contracted illustrator or 3D artist, approved before the kit.
2. **Make:** Blender for props, ingredients and characters, lit once from the game camera; or paint in Procreate or Photoshop. Either way the result looks like the target.
3. **Render or export:** each ingredient in shelf-card, in-wok and plated states; wok, board, plates and burner glow; the backdrop as a few layers (wall and window, lamps, plants); HUD panels as nine-slice images.
4. **Animate:** Spine skeletons for guests, the chef portrait and Sprout (walk in, idle with blinks, eat, head shake, wave). Skins carry outfits, which later serve wardrobe and companion items.
5. **Pack and deliver:** TexturePacker atlases at 2× and 3×. Levels 1–6 art ships as one versioned, checksummed pack downloaded on first play and cached; the Game tab shows progress, and play works offline after the download.

### 12.2 App and game split

The service runs on a full-screen route (`game/play`) that hosts a WebView loading the bundled game files from the app package, with art from the cache. React Native keeps the text-heavy and navigational surfaces.

| Lives in React Native (app) | Lives in Phaser (game) |
|---|---|
| Game tab root (My little café overview card, Play, levels list, books entry) | Before-service brief, the service playfield and HUD, pause, label sheet |
| Recipe, Pantry and Regulars books (app tokens, native accessibility) | Café scene and decorate (A08–A09); wardrobe and companion previews (A04–A07) |
| Results summary with bridges, after the game reports the result | Results celebration (stamps, score) before handing back |
| Play your way settings (also reachable from the game's pause menu) | |
| Station list mode (§12.4) and every bridge's navigation | |

**Messages** (versioned JSON over `postMessage` and `onMessage`):
- React Native → game: `boot` (content version, level data, owned cosmetics, settings: input mode, heat mode, pace, hints, reduce motion, text scale, palette, sound and haptics), `pause`, `resume`, `setSettings`.
- Game → React Native: `ready`, `runStarted` (run id, seed, rules version), `checkpoint` (sequence, event log slice), `runFinished` (outcome, event log), `openBridge` (kind and id), `haptic` (kind), `exit`.

**Lifecycle:** app backgrounding pauses the game and turns the heat off (PRD: 20 of 20 trials). If the WebView's render process ends, the route reloads it and resumes from the last checkpoint with the same run id (G10). Haptics run in React Native on `haptic` messages. `react-native-webview` and a haptics module are not installed today; the spike adds them with `npx expo install`.

### 12.3 Simulation and server replay

- **One TypeScript simulation package** (`game/sim`) with no Phaser or DOM imports: fixed 20 Hz ticks, integer heat and progress (0–1000), a seeded PRNG, `step(state, action)` and `tick(state)`, the event log, the dish, order and run state machines, rule conflicts and scoring.
- The game, the React Native station list and, in Phase B, the Node API all use it; the server replays submitted event logs before it settles credits. There is one implementation, so client and server cannot drift.
- **Golden traces:** each level's authored feasible trace plus recorded runs are fixtures with expected outcomes and scores, checked on every change.
- **Content** stays as versioned JSON (game recipes linked to Cook `recipeId`, ingredient tokens linked to the ingredient guide, labels, rules, regulars, levels), validated by a script that replays every level's trace.

### 12.4 Accessibility

- Every essential action works by tap-then-tap as well as drag; burner toggle by default; no holds, multi-touch or rapid tapping (QT-050/051).
- **Station list mode** is a React Native screen driven by the same simulation: orders, stations (heat in words, progress percentage), ingredients with Check label, the board and seats, with native TalkBack, VoiceOver and Switch Access support. The canvas is never the accessible surface. PRD gate: a screen-reader user clears Levels 1–3 and a Switch Access user clears Level 3.
- Text scale, reduce motion, captions for every sound and separate sound, music and haptics switches are passed in `boot` and honoured in the game.

### 12.5 Spike: PRD Appendix A criteria (two weeks)

Build Level 3 and a Level 19-sized load with placeholder atlases and one Spine guest, in a development build of the app and on web, and measure:

| Criterion (Appendix A) | Expected with Phaser in a WebView |
|---|---|
| Level 19 load for 5 minutes on a budget Android: 30 fps median, at most 5% of frames over 33 ms, none over 700 ms; Pixel 7a and iPhone 11: 95% within 16.7 ms | Likely with WebGL, atlases and capped particles; the budget Android's WebView is the main risk and must be measured |
| Game within 250 MB on the budget Android; under 10 MB growth over 10 open and close cycles | Measure; destroy the WebView on exit; texture memory is the main cost |
| App start regresses by 100 ms or less | Achievable: the WebView is created only when Play is tapped |
| Download grows by at most 8 MB on Android and 10 MB on iOS | Likely: the engine, Spine runtime and game code are a few MB; art downloads on first play |
| Heat off and game paused in 20 of 20 background trials | Wire app state and the page's visibility event |
| Screen reader clears Levels 1–3 via the station list; Switch Access clears Level 3 | React Native station list (§12.4) |

Also check in the spike: `react-native-webview` on Expo SDK 57 and React Native 0.86 (New Architecture), WebGL in Android System WebView and WKWebView, loading bundled local files on both platforms, and licences (Phaser is MIT; the Spine runtimes require the team to hold a Spine Editor licence; confirm Esoteric Software's current terms).

### 12.6 Web

The same game build runs in the browser on the web app's `game/play` route. The spike measures mid-range and low-end phone browsers as well as desktop.

### 12.7 Repository layout

- `game/phaser/` — the Phaser project (TypeScript), built into a static package that is copied into the app bundle.
- `game/sim/` — the TypeScript simulation and golden-trace fixtures.
- `game/content/` — versioned JSON content and the validation script.
- `game/art/` — source art in Git LFS or outside the repository; built atlases go into the downloadable art pack, never the app bundle.
- `src/app/(tabs)/game.tsx` and root-stack routes `game/play`, `game/results/[run]`, `game/book`, `game/pantry`, `game/regulars`, `game/settings` in the app.
- Phase B: `server/game/` (routes, `schema.sql` with runs, events, evidence, ledger, entitlements, café layout) behind the existing `games` control, which stays locked in the staff console until production acceptance; replay runs inside the Node API.

### 12.8 Unity fallback

Used only if the spike fails on WebView frame time or memory, or if the game later grows into several real 3D games. The same atlases and Spine skeletons carry over (Spine has an official Unity runtime). Known costs, from the Unity 6.3 LTS manual and earlier research:

- Full screen only and one instance per app; about 80–180 MB stays in memory after `Application.Unload`, and on iOS Unity cannot reload after `Application.Quit` until the app restarts.
- No Expo Go and no iOS simulator; native rebuilds per change. The only Expo bridge, `@dolami-inc/react-native-expo-unity`, is 0.1.0 (February 2026); the alternative is a first-party Expo module.
- The runtime very likely exceeds Appendix A's 8 MB / 10 MB download budget, so it needs an owner-approved relaxation and on-demand art delivery.
- The simulation would need a C# port that passes the same golden traces, run on the server by a .NET worker.
- Accessibility through Unity's `AssistiveSupport` or the React Native station list.
- Unity Personal applies under USD 200,000 of revenue and funding in the last 12 months; confirm current terms.

## 13. Illustrated 2.5D playfield, HUD and motion

### Layout (portrait, fixed camera), from the owner's reference and art target

| Zone (top to bottom) | Contents |
|---|---|
| **HUD row** | Round timer ring (Rush; a Calm leaf instead), level name, takings bar with coin icon, count and three star marks, orders left, Pause. No lives or hearts here. |
| **Recipe strip** | The dish for the guest you are cooking for, with its painted picture; step slots in order (aromatic, bean paste → tofu, shiitake) that fill with the added items and tick, or show a warning when an item breaks the guest's rule; a hint pill that carries the guest's rule. Hints fade in later levels (§6). |
| **Guests at the counter** | Up to four seats, each with a plate and a pill (person icon, number, shape). Guests stand behind the bar with head, shoulders and hands above it. Each has an order bubble: rule chip and, in Rush, five patience hearts (their name in Calm). |
| **Ingredient shelves** | One panel with two trays of illustrated cards: Fresh (ginger, garlic, kangkung, carrot, tofu, shiitake) and Pantry (bean paste jars A and B with Label tags, soy sauce, sesame oil, kecap manis, rice). Off-recipe items are distractors that explain why they don't belong. With six cards across a phone, each is about 56 points wide (never below the PRD's 48), with its name always visible; the station list gives larger targets. |
| **Stations** | Plating board with finite plates on the left; terracotta stove with the wok, burner glow and progress ring on the right; later stations join this row (§5). |
| **Heat panel** | Heat meter with the striped target band, ticks and words (Cool, Target, Hot, Too hot); the burner toggle (Heat on / Heat off); wok status in words, and chips for what is in the wok (tap to lift out) plus Restart. |
| **Dialogue panel** | The speaker's round portrait, a name pill and their line: the chef's hints, or a guest's order, thanks or reason for returning a plate. |

Guests are fictional adult regulars drawn as in the board sketch (owner choice, §2). Decorative objects never sit on active hit areas, and the camera never travels during service.

### HUD behaviour

- **Timer ring (Rush):** drains clockwise, turns warm at 30 seconds and pulses gently in the last 10 (a colour change only with Reduce motion). It shows a pause mark and stops while a label is open, the game is paused or the app is in the background.
- **Takings bar:** the count rolls up to its new value; each star mark pops when reached. The first star stays empty until every order is served correctly.
- **Orders left:** counts down as guests are served or leave.
- **Patience hearts (Rush):** drain per guest; below two hearts the bubble wobbles slightly (colour only with Reduce motion). An expired guest waves and walks out; nothing is taken back.

### Direct manipulation

| Moment | Feedback | Timing |
|---|---|---|
| Touch an ingredient | Item lifts off its card, scales to 1.1, drop shadow appears; name shown; valid destinations glow | 120 ms |
| Carry | Item follows the finger at lift height; the pan rim brightens when the item is over a valid drop | follows input |
| Drop on the pan | Short arc into the pan, squash on landing, small splash and a sizzle burst if the pan is hot | 220 ms |
| Drop outside or invalid | Item floats back to its card; the reason appears in the dialogue panel | 200 ms |
| Tap then tap | Same lift on select; the same arc from card to wok on the second tap | as above |
| Conflict | Ingredient glows with a warning marker in the pan; ticket chip pulses twice | 400 ms |
| Ready | Steam column, pan contents settle, Ready tag | 300 ms |
| Plate | Food slides from pan onto a plate that glides to the plating board | 300 ms |
| Serve | Plate glides onto the guest's mat; the guest leans in, eats with three small bobs and a heart pops | 350 ms + 900 ms |
| Returned | The guest shakes their head and pushes the plate back; it glides to the board | 300 ms |

**While cooking:** contents toss gently every 1–1.5 seconds; colours shift from raw to cooked as progress rises; steam once progress passes half; sizzle sparks while in the band; smoke puffs above 0.85; a sparkle ring and "Ready" tag when done.

### Coin pickup: five steps so coins never just vanish

| Step | What happens | Timing |
|---|---|---|
| 1. Pop | Coins burst out above the guest with squash and stretch (0.6 → 1.2 → 1.0) | 120 ms |
| 2. Sparkle | A small star burst and a glint across each coin | 200 ms |
| 3. Arc | Coins fly on a curved path to the takings counter, 40 ms apart, speeding up as they go and spinning | 450–600 ms |
| 4. The counter eats it | The coin icon squashes on each arrival, the count rolls up and a "+12" label floats away; tips arrive as separate coins labelled "Heat tip" and "Quick tip" | 150 ms per coin |
| 5. Sound and touch | A soft chime per coin, rising in pitch, with a light haptic; both off by default and switchable | per coin |

With Reduce motion, the count updates with a short fade and the "+12" label, and nothing flies.

### Guest motion

Guests walk in from the side with a small hop per step, settle at their seat, and their bubble pops in with a slight overshoot. While waiting they idle (breathing, an occasional look at the kitchen). On a correct serve they eat and smile; on a rule conflict they shake their head kindly; when leaving they wave and walk out. Nobody ever shows distress at the player's absence (QT-047, QT-057).

**Reduce motion:** arcs become fades, no tossing, steam or particles, no bounces; all state still shows in words.

**Sound and haptics:** sizzle tied to heat, a soft bell for a new ticket, a serve chime, quiet café ambience; each with a visual equivalent. Haptic ticks on entering and leaving the heat band, on a valid drop and on a serve (the game sends `haptic` messages and React Native plays them, §12.2). Sound, music and haptics switch off independently.

**How the motion is built:** Phaser tweens for lifts, arcs, squash and the coin path; Phaser particles for steam, sparks, smoke and sparkles; Spine animations for guests walking, idling, eating, shaking their head and waving. The board sketch on the published page shows every moment above with placeholder art drawn in code.

## 14. Build phases and gates

| Phase | Scope | Exit gate |
|---|---|---|
| **S Spike** | Phaser 4 and `spine-phaser-v4` in a WebView in a development build and on web; Level 3 and a Level 19-sized load with placeholder atlases and one Spine guest | Appendix A criteria in §12.5 |
| **A0 Rules** | TypeScript simulation, golden traces, Levels 1–6 content and validator | Every Level 1–6 trace clears in Calm and Rush; recorded runs replay to identical scores |
| **A1 Playfield** | Illustrated café kitchen with final Level 1–6 art, drag and tap, heat, label sheet, station list mode, results, books and bridges in the app; local practice only | Budget Android and iPhone measurements; reduced motion; text scale; screen-reader pass of Levels 1–3 |
| **A2 Study** | At least 10 intended players including motor, visual and cognitive access needs; a six-item food-knowledge check before and after; voluntary-replay interviews | PRD interaction and access gates; the owner sets the continuation threshold before the study |
| **B Settlement** | Node replay with the shared simulation, server schema, credits, decor and wardrobe purchases, Pending/Settled, reconnect, `games` control | PRD integrity gate: duplicate retries, 100 concurrent identical grants and two-device spends give at most one grant and no negative balance |
| **C Content** | Levels 7–20 art, cuisine collections with reviewers, regulars, stations 2–5, Stall visit interlude, Today's special, hawker-stall dressing | Content gate per pack |

**Art production** (parallel from Phase S, pipeline in §12.1): a style frame matching the owner's art target, then the Level 1–6 kit: HUD panels, café backdrop layers, counter with plates and seat pills, plating board, stove and wok, 12 ingredients (shelf card, in-wok and plated states), dish art for mapo tofu, bee hoon and kangkung, 3 guests and the chef portrait as Spine characters (walk, idle, eat, head shake, wave), and Sprout. Characters are original; nothing imitates a real person or brand.

## 15. Measurement

- **Learning (study only):** six items before and after, such as picking the five pungent items from eight, spotting the garlic in a label, sorting vegan from vegetarian items and knowing why ginger does not suit a Jain order. Directional evidence only.
- **Transfer signals (aggregate):** bridge taps per service; Cook mode starts of game recipes within seven days; Ask-the-stall opens after the interlude.
- **Enjoyment:** voluntary replay and interview reasons; the level where players stop; Calm and Rush split. Session length and streaks are never targets.
- **Tuning:** invalid-drop reasons, label-check use, conflicts corrected before heat, scorch rate per level, frame time per device tier.

## 16. Owner decisions needed

1. **Engine:** Phaser 4 with Spine in a WebView, sharing one TypeScript simulation with the server (recommended, §12.0); Unity 2D as the fallback. The Appendix A spike is the gate.
2. **Art delivery:** game code inside the app within Appendix A's 8 MB / 10 MB budget, and the art pack downloaded on first play. Recommended. A budget relaxation is needed only if Unity is used.
3. **Setting:** the mockups' café for the prototype, hawker-stall dressing later. Recommended.
4. **Educational core:** diet-rule tickets and label checks, with allergies never used as ticket rules. Recommended.
5. **Dishes:** Cook recipes as game dishes, each with a culinary review of its game simplification. Recommended.
6. **Spine licence:** a Spine Editor licence for the artist and team, which the Spine runtimes require. Alternative: Rive for characters.
7. **Server replay:** the Node API replays runs with the shared TypeScript simulation. Recommended.
8. **Art production:** a contracted illustrator or 3D artist for the style frame and the Level 1–6 kit, matching the owner's art target.
9. **Reviewers:** Buddhist and Taoist vegetarian practice, Jain practice (including asafoetida), Malay, Peranakan and Indian cuisine.
10. **Prototype audience:** development builds only, or internal testers through a preview build with the `games` control.
11. **Stall visit interlude:** inside Rush Hour, or a separately gated mode.
12. **Coins:** in-service takings only, reset every service, with café credits as the only persistent currency. Recommended; anything persistent and spendable from coins would need its own economy review (QT-056).
13. **Characters:** decided 18 October: the board sketch's regulars (Office lunch, Auntie Mei, Jia Hui), not the art target's character art. Still open: confirm that game art stays out of store screenshots, as PRD 1.3 requires for Mini style.
14. **Lotus avatar (owner brief, 18 October):** mascot default avatar, paid AI avatar (US$1.99 or saved credits), lotus tiers that unlock accessories and pets, linked to Rush Hour. Plan and the paid-randomness question: [AVATAR_LOTUS_PLAN.md](AVATAR_LOTUS_PLAN.md). Owner decision 18 October: free first bloom, breed US$1.99 or 600 credits, re-bloom 150 credits, Golden Lotus US$9.99 with the breed included; credits stay earned-only.
16. **Built 18 October (development builds only):** the owner handed over the full build. Engine decision: Phaser 4 (MIT) in an Expo DOM component, no paid Spine (sprite and tween animation). Levels 1–20, validated recipes, companion skills and rewards: [game/RUSH_HOUR_DESIGN.md](game/RUSH_HOUR_DESIGN.md). Remaining gates there.
15. **Game home (owner direction, 18 October):** the Game tab opens on My little café, with the member's skin, avatar, pet and decor, and scene hotspots into Rush Hour, the books, the wardrobe and later features. Plan, hotspot registry, growth path and its own open decisions: [GAME_HOME_PLAN.md](GAME_HOME_PLAN.md).

## 17. PRD traceability

| PRD | In this plan |
|---|---|
| QT-045 avatar | Original chef portrait and Spine character in the café; player avatars in 3D stay behind their own gate (A01–A03 proof failed); the 2D portrait fallback (N25-04) remains |
| QT-046 selfie | Unchanged; not needed for play |
| QT-047 pets and wardrobe | Sprout and wardrobe cosmetics in Phase B, optional |
| QT-048 café | Kept as My little café; hawker dressing later |
| QT-049 playfield | Kept as one illustrated 2.5D playfield in the owner's reference layout and art target; guests at counter seats replace dining tables, with seat pills keeping number-and-shape identity; order bubbles add rule chips |
| QT-050 placement | Kept: drag plus tap-then-tap and station list |
| QT-051 heat | Kept; tap toggle default; each station declares its own band |
| QT-052 reviewed decisions | Extended: decisions come from Cook recipes, rule conflicts and labels |
| QT-053 modes | Kept; Rush shows the round timer ring and patience hearts, Calm shows neither |
| QT-054 learning | Objectives redefined as food knowledge; stamps added as presentation |
| QT-055 pause and recovery | Kept; the label sheet also pauses time; app backgrounding and WebView reloads force heat off and resume from the last checkpoint |
| QT-056 economy | Kept; in-service coin takings are a score tally that resets each service, and café credits stay the only persistent currency |
| QT-057 healthy play | Kept; adds an optional Today's special with no streak |
| QT-058 venue surprises | Out of scope; later, separate gate (G07–G08) |
| §19 level plan | Re-authored with mostly the same counts; Levels 7–20 stay data only until the gate |
| Appendix A | Revision 4 keeps Appendix A's pre-rendered sprite approach but runs it in Phaser 4 with Spine instead of Skia (§12.0); Unity stays the fallback; spike criteria kept |

## 18. Sources

- PRD Edition 1.4, UI reference Edition 1.1 and supplement Edition 1.4 (local PDFs in `..`).
- Owner art references: `docs/game/references/art-target-2026-10-18.webp` and `concept-2026-10-18-a.webp`.
- [Phaser stable releases](https://phaser.io/download/stable) and [spine-phaser runtime documentation](https://esotericsoftware.com/spine-phaser): Phaser 4.0.0 on 10 April 2026, 4.1.0 on 30 April; `spine-phaser-v4` 4.3.x needs Phaser 4.2.1 or later.
- [Cocos Creator 3.8 Spine support](https://docs.cocos.com/creator/3.8/manual/en/asset/spine.html): Spine 3.8 exports only.
- [The evolution of the Shopee Games game engine](https://segmentfault.com/a/1190000041495903/en) (Shopee, 2022): HTML5 games inside the Shopee app to protect app size.
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) 2.5.2 and 4.7: code bundled in the binary; HTML5 mini apps.
- [Spine Runtimes License](https://esotericsoftware.com/spine-runtimes-license): the runtimes require a Spine Editor licence; confirm current terms.
- [Unity as a Library, Unity 6.3 LTS manual](https://docs.unity3d.com/6000.3/Documentation/Manual/UnityasaLibrary.html): full-screen only, single instance, 80–180 MB kept after unload, no reload after iOS quit.
- [Unity mobile screen reader support](https://docs.unity3d.com/Manual/mobile-accessibility.html) and [accessibility module](https://docs.unity3d.com/Manual/accessibility/module-intro.html): TalkBack and VoiceOver via `AssistiveSupport`; the hierarchy is built by the game.
- [react-native-expo-unity on libraries.io](https://libraries.io/npm/react-native-expo-unity): 0.1.0, February 2026, Expo SDK 54+, New Architecture only.
- [Unity Web browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html) and [mobile browser roadmap](https://activation.unity3d.com/roadmap/415-web-mobile-browser-support).
- [Unity plans and pricing](https://unity.com/runtime-fee): Unity Personal threshold; confirm current terms before committing.
