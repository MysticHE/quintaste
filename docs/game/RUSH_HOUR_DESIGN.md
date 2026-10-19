# Rush Hour: levels, companions and rewards (built design)

**Status:** built 18 October 2026; **live for all members from 19 October 2026** (owner decision; `src/config/game.ts` `gameEnabled = true`, commit be28cf6). The game has no server route, so the staff console `games` control does not switch it off. Open gaps: progress is stored on the device only (not synced to the account), the art is QT Gamer draft output awaiting artist approval, physical phones are untested, and the lotus tiers (Mochi, Ripple, Golden Dewdrop, the lotus skin) wait for the Lotus Avatar flow. Lotus tier preview stays in development builds only.

**Owner direction (18 October 2026):**
- Real recipe cooking with a logical, challenging and fun difficulty curve.
- Full vegetarian and vegan ingredient art from QT Gamer.
- Companions with different skill advantages, plus unlockable rewards and accessories.

**Source of truth:** the code (`src/game/content/*.ts`). This document explains it.

## Recipes

The owner warned that the app's sample recipes may not be reliable, so every game dish was checked against how it is really cooked, then simplified to two to four stages:

| Dish | Station | How it really cooks, in game steps | Lesson |
|---|---|---|---|
| Fried bee hoon | Wok | Aromatic and vegetable first, then soaked bee hoon and soy | Order of a stir-fry |
| Sesame greens and tofu | Wok | Tofu in oil, then greens and a topping (sesame seeds or egg) | Vegetarian is not always vegan |
| Kangkung with fermented beancurd | Wok | Fu ru and optional chilli, then kangkung; leaves scorch fast | Hold the heat band |
| Kangkung, stems first | Wok | Fu ru and stems, then leaves and optional chilli | Stems before leaves |
| Mapo tofu | Wok | Aromatic (ginger, garlic or Sichuan pepper) with bean paste, then tofu and a savoury bite (shiitake, black beans or tempeh) | Garlic hides in pastes |
| Tomato tofu | Wok | Aromatic and tomato, then tofu and seasoning | Spring onion is an allium |
| Sweet and sour tofu | Wok | Tofu in cornflour, capsicum and pineapple, then ketchup and vinegar | Ketchup can list onion and garlic |
| Mee goreng | Wok | Aromatic and chilli paste, yellow noodles and tempeh, bok choy and kecap | Some yellow noodles contain egg |
| ABC soup | Soup pot | Potato or corn with carrot or cabbage, then tomato and seasoning | Simmer, not boil; root-free swaps |
| Coconut laksa | Soup pot | Hot spice base, then stock and coconut milk at low heat, then noodles and tofu | Coconut milk splits when too hot |
| Ginger oat porridge | Soup pot | Oats (ginger optional), then a topping | Optional roots make Jain swaps easy |
| Claypot rice | Rice cooker | Rice steams (no heat to manage), then toppings and dark soy | Start the slowest dish first |
| Nasi lemak | Rice cooker and wok | Coconut rice, and sambal tempeh in the wok, put together on one plate | Many sambals contain belacan |
| Popiah | Wok and assembly board | Braised jicama and carrot filling, then skin, sauce, lettuce and peanuts in order | Layer order |
| Bubur cha cha | Dessert pot | Sweet potato and yam, sago, then coconut milk and pandan gently | Gentle heat for coconut |
| Sago gula melaka | Dessert pot | Sago, then palm sugar and coconut milk | Palm sugar scorches fast |

Kaya toast was left out: too many steps for one service.

## Rules (match the app's food choices)

| Rule | Guests | Refuses |
|---|---|---|
| Vegan | Daniel | Eggs, dairy, honey |
| No five pungent 五辛 | Auntie Mei (everyone on the Lunar 15th night) | The app's seven alliums |
| Jain | Asha | Alliums, root vegetables, mushrooms, eggs, honey (the app's Jain preset) |
| No meat or seafood | Jia Hui | Hidden animal ingredients (every guest refuses these in a vegetarian kitchen) |
| No mushrooms | Uncle Lim | Mushrooms |
| Less spicy | Nurul | Optional extra heat (fresh chilli, dried chillies, chilli sauce) |

**Never allergies.**

**Label traps:** pairs of look-alike products, labelled A and B, where one label lists the problem. Product names are fictional game labels.

| Pair | Problem in one label |
|---|---|
| Bean paste | Garlic |
| Ketchup | Onion and garlic powder |
| Chilli paste | Shallots and garlic |
| Vegetable stock | Onion and leek |
| Sambal | Belacan |
| Sweet sauce | Garlic |
| Yellow noodles | Egg |

## Levels 1–20

| L | Name | New decision | Stations | Orders / open | Rush clock |
|---|---|---|---|---|---|
| 1 | First plate | Drag, heat, plate, serve | Wok | 1 / 1 | 1:15 |
| 2 | Read the ticket | Vegan topping | Wok | 2 / 2 | 1:10 |
| 3 | Feel the heat | Hold the band; leaves scorch | Wok | 2 / 2 | 1:05 |
| 4 | Stems before leaves | Cooking order | Wok | 3 / 2 | 1:30 |
| 5 | Check the label | Bean paste labels; ginger swap | Wok | 3 / 3 | 1:35 |
| 6 | First lunch rush | Three dishes, mixed rules | Wok | 4 / 3 | 2:00 |
| 7 | Choose your menu | Three-step dish; ketchup label | Wok | 4 / 3 | 2:10 |
| 8 | Small preferences | No mushrooms, less spicy | Wok | 4 / 3 | 2:00 |
| 9 | Second station | Two heat bands at once | Wok, soup pot | 4 / 3 | 1:55 |
| 10 | Carryover heat | Lower the heat before coconut milk | Wok, soup pot | 4 / 3 | 2:25 |
| 11 | The swap | Allium-free mee goreng | Wok | 4 / 3 | 2:20 |
| 12 | Read the queue | Start rice first | Wok, rice cooker | 5 / 3 | 2:20 |
| 13 | Two-stage dish | Hot then low in one dish | Wok, soup pot | 5 / 3 | 2:55 |
| 14 | Hidden in the paste | Belacan and egg noodles | Wok, rice cooker | 5 / 3 | 2:30 |
| 15 | A fourth table | Shared pots: one cook feeds two guests | Wok, soup pot, rice cooker | 9 / 4 | 2:50 |
| 16 | Finish together | Two-part dish, layer order | Wok, assembly board | 4 / 3 | 2:20 |
| 17 | A familiar twist | Jain: ginger is a root | Wok, soup pot | 5 / 3 | 2:30 |
| 18 | Lunar 15th night | Everyone five pungent-free; desserts | Wok, soup pot, dessert pot | 6 / 3 | 3:05 |
| 19 | Dinner service | Triage across four stations | Four stations | 7 / 4 | 2:55 |
| 20 | Your signature service | Three dishes chosen on the chalkboard | All five | 6 / 4 | 2:50 |

**Every level has a clock** (Calm was removed on 19 October). **Hints fade:** full chef lines in Levels 1–4, first-time tips only in Levels 5–10, none from Level 11. Mistakes before cooking can always be lifted out for free.

### Difficulty, measured

`npx tsx scripts/validate-game.ts --react <seconds per action> --seeds 12` plays every level on several seeds through the real simulation with the bot in `scripts/game-bot.ts` (it rides each burner to the middle of its band, reads flare warnings, serves the most urgent guest first, swaps out an ingredient that ran out and clears a dish nobody wants any more). It also replays every trace the way the server settles it and plays all 1,356 Today's specials.

| Player | Seconds per action | Clear rate (12 seeds) |
|---|---|---|
| Expert | 0.7 | Every level, 3 stars |
| Competent | 2.2 | Every level, Level 20 11 of 12 |
| Newcomer dragging | 2.8 | Every level but six: L6 (the wave) 8, L11 11, L13 11, L14 10, L20 11 |
| Slower | 3.2 | Levels 1-5, 7-10, 12, 16, 17 all; L6 8, L11 10, L13 6, L14 5, L15 10, L18 1, L19 5, L20 9 |

Dragging is slower than tapping, so the competent and newcomer rows matter most. A cut to the clocks was tried and dropped: at 2.8 s it made Levels 7, 11 and 13 impossible, because the clock runs out with the last plate already on the board. The extra challenge comes from the twists and variation below instead. Levels 11, 13, 14 and 20 got a little more guest patience (77, 90, 83 and 90) after the seeds showed knife-edge outcomes.

## Scoring

These rules are unchanged from the PRD and GAME_PLAN §9:

- **Coins per serve:** 10, plus a heat tip of up to 4 and, in Rush, a quick tip of up to 2.
- **Stars:**
  - The first star needs every order served.
  - The second and third need 75% and 90% of the maximum takings.
  - So a fast wrong service never wins.
- **Stamps:** Served, Rules respected (no returned plate) and Steady heat (at least 60% of cooking time in the band). All three make a level Mastered.
- **Café credits:** 30 for a first clear, 8 for a replay and 20 for the first time a level is Mastered. Credits are earned only and never bought.

## Companions (equal value, so paying never wins)

| Companion | How you get it | Skill (once per Rush service) | Best for |
|---|---|---|---|
| Sprout | Free | Deep breath: freezes every guest's patience for 6 s | Several guests waiting |
| Pip (new puppy) | Clear Level 6 | Steady paws: holds the selected station's heat for 8 s | Leaves, coconut milk, palm sugar |
| Mochi (bao bun, as on board A06) | Purple lotus | Cheer up: +20 s patience to the guest with the least | Saving one guest |
| Ripple | Blue lotus | Bubble show: patience drains at half speed for 12 s | Long rice and soup dishes |
| Golden Dewdrop | Golden lotus | Golden minute: +12 s on the clock | The end of a busy service |

Skills never fix ingredients or read labels.

## Rewards and accessories

| Reward | How it unlocks |
|---|---|
| Lotus clip | Clear Level 5 |
| Coral scarf | Clear Level 8 |
| Lilac scarf | Clear Level 11 |
| Mushroom cap | Clear Level 13 |
| Lantern charm | Clear Level 18 |
| Chef hat, Wave scarf, Lotus crown | Purple, Blue and Golden lotus |

- **Fitted accessories:** every accessory is drawn fitted to every companion (45 renders).
- **Stations:** the soup pot (Level 9) and rice cooker (Level 12) appear on the café counter.
- **Decor:**
  - Lotus bowl: Level 4.
  - Paper lanterns: Level 18.
  - Herb planter and Window plant: 40 credits each.
  - Tea set and Peach lamp: 80 credits each.
- **Skins:** Sunny garden (free), Lantern night (Level 18), Lotus pond (Golden lotus), Signature café (Level 20).
- **Stations on the café counter:** soup pot (Level 9), rice cooker (Level 12) and assembly board (Level 16).
- **New find:** every unlock is revealed once on the New find screen (owner board), with Equip or Keep current look.

## Art

Every asset is QT Gamer draft output in the QuinTaste game style, pointed at a style board built from the approved art (`references/style-board.webp`):
- 61 pantry ingredients, including allium, egg, dairy and honey traps.
- 16 dishes; four were redrawn without spring onion garnish.
- Seven regulars; Pip and four new accessories.
- Every companion and accessory pair; stations; decor.

**Import:** `python -I scripts/import-game-art.py --source <gamer folder>` copies the chosen variants to `assets/game/` (177 images, 3.3 MB) and writes `assets/game/provenance.json` and `src/game/art.ts`.

**Approval:** an artist approves the art before members see it.

## Play your way, sound and bridges (19 October 2026)

- **Play your way** (`src/game/settings.ts`, saved in game progress): sound effects, café music, haptics and sound captions (all off by default); tap only; burner tap on/off or hold to heat (keyboards and switches still toggle); pace Normal, Relaxed (0.75×) or Slow (0.5×), which slows real time but not the simulation, so scores mean the same; hints as taught, always or off; text size following the app or Standard, Large, Largest; reduce motion on top of the app setting.
- **Sound:** synthesised with Web Audio inside the game page (`src/game/dom/audio.ts`): no audio files. Effects for place, sizzle (continuous while a pan with food is hot), plate, coins (rising pitch), serve, plate returned, new order and smoke, plus quiet café music. Nothing is created or played while a switch is off; pause suspends it. Each effect has a caption. Haptics run in the app with `expo-haptics` (light on place, plate and coins, success on serve, warning on returns and smoke, a tick entering or leaving the heat band).
- **Bridges:** Results and recipe pages offer Cook it for real (the allium-free adaptation when a guest kept no five pungent) and Find it nearby (Explore `/?q=`; the catalogue keyword now also matches dish names on published menus). Pantry cards open a page with Recipes with this (Cook `/cook?ingredient=`) and, for five pungent and Jain items, Set my food choices (`/food-choices`, never prefilled); Auntie Mei and Asha's regulars cards offer it too.
- **Today's special** (`src/game/special.ts`): on the chalkboard once Level 5 is cleared. The Singapore date picks one learned dish and four orders from regulars met so far; lunar 1st and 15th and Nine Emperor Gods days make every order five pungent-free. A clear earns the normal replay grant; nothing is recorded per day. `scripts/validate-game.ts` plays every distinct special over two years of dates.

## Playfield audit and redesign (19 October 2026)

Owner report: guests missing, ingredients not fitting the pan or cut off, sauces staying in the pan, flow not smooth. Root causes and fixes:

| Symptom | Cause | Fix |
|---|---|---|
| Guests, arcs, coins never drawn | `usePlayfield` read the scene right after `scene.add`, but Phaser creates the scene only after it boots, so `sceneRef` stayed null. Choosing a mode in the brief (even the selected one) replaced the run while the scene kept the old one, so no guests ever showed | The scene hands itself over in `hooks.ready(scene)`; choosing the current mode does nothing |
| Ingredients outside the pan, cut off | Items were placed at fractions of the station box, not of its art; bands were fixed percentages of the height, so the second shelf row was clipped | `layout.ts` is a budgeted column (HUD, recipe, scene, shelf, stations, heat, dialogue): the scene keeps a minimum for a guest plus bubble, shelf cards shrink first, the station row is only as tall as its art. `stationArt.ts` holds each art's bowl oval; `pan.ts` piles solids inside it |
| Bottles and jars left in the pan | Every item was a sprite in the pan | `ITEM_FORM` (`content/items.ts`) marks items poured or sprinkled; `motion.ts` flies the container over the pan, tips or shakes it and it leaves; the pan keeps a pool or speckles in the item's tone |
| Flow | Many small gaps | The state tag under each station reads Ready · Drag it or Scorched · Restart (a pointer tap only selects the station; see the drag-only note below); a dragged plate highlights the guests to serve; ingredients drag with a lit drop target and float home when dropped away; a refused card shakes; the heat button pulses when food waits on a cold burner; the recipe card names the next step; Service and Time's up banners; the brief slides away; results wait for the last coin; a screen too short for the layout (a phone on its side) pauses the service with a message |

Code: `layout.ts` (geometry), `scene.ts` (Phaser view), `pan.ts` and `motion.ts` (contents and one-shot motion), `useServiceEvents.ts` (events to effects), `Hud.tsx`, `Counter.tsx`, `Shelf.tsx`, `Controls.tsx` (panels), `styles.ts` and `styles-sheets.ts`. The sim only gained `uid` on the `placed` event. Class names must stay unique: a `seg` clash once stretched the brief's mode toggle.

**Test without the Expo dev server** (it can take minutes to bundle): `.local/rh-harness` (gitignored) bundles the game component with esbuild into a plain page; run `node build.mjs`, `node serve.mjs`, then the Playwright scripts in `tests/` (`rh.mjs` playthrough and device sweep, `bot.mjs` cooks one dish per level through the UI, `misc.mjs` drag, restart, large text, reduce motion, tap only). Phones, native touch and haptics were not tested on a device.

## Rush only, drag only, twists and variation (19 October 2026)

Owner direction: no Calm mode, every level a timed Rush, and ingredients, dishes and plates all dragged. This changed the shared simulation, so the rules version changed (`ENGINE_VERSION` 3, then 4 on 19 October for the shared pots and the stored bests) and runs started on an older build are refused with the usual "Update QuinTaste" message.

- **Rush only.** `createRun(which, pet, signature, hints, seed)` has no mode. Level 1 has a clock (1:15, patience 70). The brief and the level sheet have no mode row. `game.run.mode` keeps the value `rush` (the schema check still allows `calm`; no migration).
- **Drag only.** An ingredient is dragged from the shelf onto a station (it lights up; dropping away floats the card home). A ready dish is carried from its station to the plates, and a plate to its guest; the targets light up while carrying. A tap on a card shows "Drag X onto a station" and nothing else, from a pointer, a key press or assistive technology. **No tap path remains (owner decision, 19 October 2026, superseding the earlier accessibility exceptions):** the hidden station list, the keyboard and assistive-tech activation of cards and station tags, the Plate chip, the picked-plate mode and the **Tap only** setting were removed, and old saved `tapOnly` values are ignored. Controls that are not food keep a tap: the burner, a guest bubble (who to cook for), a station (select it, or restart a scorched or split dish), the Restart and lift-out chips, the companion's skill and the label button. A player who cannot drag cannot play the service; this knowingly departs from the PRD's equivalent-placement requirement (QT-050, WCAG 2.5.7).
- **Seed.** The app makes the run's UUID when a service is created and derives the seed from it (`seedOf`); the server derives the same seed from the stored run id, so replay needs no schema change. `sim/plan.ts` builds the whole plan before the first tick, so the simulation uses no randomness.
- **Shuffled jars.** Which of a look-alike pair (A or B) hides the problem is decided per run (`Run.flip`, `factsOf`, `PAIRS`). A card's name, letter and picture never change, only its label and tags, so reading the label is the only way. Before this, every pair's A was the bad one.
- **Variation.** From Level 5 dishes are dealt to different guests, only among orders that use the same stations (so pacing holds) and only where the guest can eat them; arrival gaps stretch or shrink by up to 20% (Level 1 and a wave stay as written).
- **Twists** (`Level.twists`, `TWISTS`): Flare-up (L3, 18, 19, 20): the burner surges once, warned 2.5 s ahead, only if it is on, so switching it off rides it out. Lunch wave (L6): three guests sit within seconds of a bell. Running low (L7, 11, 13, 17, 19): one ingredient runs out, chosen so every guest can still be served. Change of mind (L8, 14, 17, 20): a guest asks for another dish a few seconds after sitting. Don't walk away (L9, 10, 16, 18): a ready dish left over a hot burner burns after 6-7 s. VIP table (L12, 15, 19, 20): one guest has 65% patience and tips 4 more (the star targets count it).
- **Bonus goal** (`Level.bonus`, `BONUS`): one optional fourth stamp per level (Golden plate, Clean hands, First come first served, Swift service, Steady hands), shown in the brief and on the results. It never gates a clear, stars or Mastery and is never paid (the credit ledger has fixed reasons). It is now stored (see Personal best).
- **Shared pots (Level 15, `Order.party`, `SHARE`).** Three parties of two sit together: they arrive on the same second and order the same dish. Cooking for either starts a pot for two (`PartRun.portions`, `Plate.portions/shared`): the recipe card names both ("for Auntie Mei +1") and lists both guests' rules together (`tableRules`), so a swap must suit both; the pot takes 1.5 times as long at every step (`BATCH_SLOW`); the plate carries a "×2" tag, is dragged to one guest (paid and fed, the plate stays as "1 left") and then to the other. A second serve to a guest who cannot eat it is returned as usual. A leftover portion nobody wants is cleared. VIP and Change of mind never pick a party guest. The validator proves each party's dish is cookable under the combined rules on every seed. Level 15 now has nine guests and a 2:50 clock; Level 15 clears 12 of 12 at 2.2 s and 2.8 s per action and 10 of 12 at 3.2 s.
- **Personal best and the stored bonus stamp (`game.level_best`).** Each level keeps `bonus` (the stamp earned at least once), `coins` (best takings of a cleared service) and `left_secs` (most whole seconds left on the clock in a clear), next to the existing best stars and score. Applying a result (`applyResult`) returns `beat` (any of "score", "coins", "time"), only against a record that exists: a first clear, or a level cleared before these columns (0 = none yet), shows no "new". The brief shows "Your best" with the record and whether the bonus was earned before; the results show "Personal best" with "new" on what was beaten and "first time" on a newly earned bonus; the level sheet shows the record and a check on the bonus. The server stores them in the same transaction that settles the run, the device import merges them (max, or), and `Result.left` and the bonus are part of `sameResult`, so a replay must reproduce them. Schema: `server/game/schema.sql` adds three columns to `game.level_best` (additive; apply after a backup).

**Touch fix (20 October 2026).** On phones no ingredient could be dragged: shelf cards had `touch-action: pan-x` (so the shelf could scroll sideways), and any finger drag that began even slightly sideways was claimed by the browser as a scroll, which cancels the pointer. Mouse drags never hit this, so the mouse-only tests passed. Cards now take every touch (`touch-action: none`); a clearly sideways swipe on a shelf that scrolls is scrolled by hand, and a swipe that then leaves the shelf becomes a drag of that card (the shelf goes back). Follow-up the same day (`src/game/dom/shelfGesture.ts`): one pointer at a time, so a thumb on the burner never drops or moves a held card; the swipe follows the finger with snapping off and ends in a fling; a swipe flatter than about 35 degrees scrolls, a steeper one or one that drifts down lifts the card; the click left over from a drag or swipe is ignored for 400 ms (no stray "drag me" hint); and the burner toggles on press, because a phone sends no click for a tap made while another finger holds a card. `tests/touch.mjs` plays Level 1 with CDP touch events only (card to wok, dish to plates, plate to guest) and checks the long-shelf swipe and swipe-then-drag on Level 20; test phone input with touch events, never mouse alone.

Tests: `.local/rh-harness/tests` (see its README) plays Level 1 and every station type with real mouse drags, checks each twist's cues, that no key press or tap moves food, restart, large text, reduce motion and landscape, a shared pot on Level 15 and the personal best on the brief and results. `scripts/validate-game.ts` also checks the shared-pot rules and the personal-best rules.

## Not done yet

- **Production gate:** a server-backed `games` control.
- **Account progress (Phase B):** account-backed progress with server replay of the event log.
- **Art delivery:** an art pack downloaded on first play instead of bundled.
- **Device checks:** physical-device frame-time and memory checks (GAME_PLAN §12.5).
- **Lotus Avatar:** the real flow and payments. Tiers are a development preview only.
- **Content review:** the cultural and religious reviewers (GAME_PLAN §6).
