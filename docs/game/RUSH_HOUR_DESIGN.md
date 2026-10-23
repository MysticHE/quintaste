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

**Approval:** an artist approves the art before members see it. On 22 October 2026 the owner, acting as the artist, approved all 214 bundled pictures (`assets/game/provenance.json`: `status`, `approvedBy`, `approvedAt`). A re-import keeps an approval only while a picture's bytes are unchanged; a new or redrawn picture starts as a draft.

## Play your way, sound and bridges (19 October 2026)

- **Play your way** (`src/game/settings.ts`, saved in game progress): sound effects, café music, haptics and sound captions (all off by default); tap only; burner tap on/off or hold to heat (keyboards and switches still toggle); pace Normal, Relaxed (0.75×) or Slow (0.5×), which slows real time but not the simulation, so scores mean the same; hints as taught, always or off; text size following the app or Standard, Large, Largest; Reduce motion follows the app and phone until the member flips it, then the member's choice wins inside the game (`motion`: auto, reduced or full; 20 Oct 2026, because Android power saving locked it on). Since 20 Oct, motion and text size apply on every game screen (`GamePreferences`), and sound effects, café music and haptics also play on the Game tab and in the café (`src/game/cafe-feedback.ts`, sounds made by `scripts/make-cafe-sounds.py`).
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

## Playfield fixes, motion and sound, knob prototype (22 October 2026)

Owner requests from a Level 13 screenshot, a redesign mockup and two reference reels on game feel (coin pickups and level-ups).

- **Diet labels.** The five pungent rule is called **Vegetarian** everywhere in the game (app-wide rule of 20 October); teaching lines keep the reason ("one of the five pungent, so not vegetarian"). The guest's bubble shows their rules and the order card no longer repeats them.
- **Order card steps.** The ingredients wanted now are large (34 px); done and later ones step back (22 px).
- **Dragging (`shelfGesture.ts`, `layout.ts nearestStation`).** Four causes of "I press the card but it won't drag", each reproduced in `tests/touch.mjs` against the old code: the Label tab's touch area covered the top of its card and swallowed presses (the tab now passes presses to the drag: a press that moves drags the card, a tap reads the label); a shallow diagonal drag on a scrolling shelf scrolled first (now any press heading down lifts the card, only a flat swipe scrolls); a drop just beside a station floated home (one shared hit test for the shelf, the drop and the canvas, with 16 px to spare, nearest station wins); and a release the page never heard blocked every later drag (a new first finger replaces it).
- **The owner's mockup look (22 October 2026, second pass).** A round blue gear (pause and Play your way), the clock and takings in one panel and orders left in a card of its own; a bigger bowl and title on the order card with white step tiles; gold-edged bubbles with a bigger dish, bigger hearts and diet chips coloured per rule (Vegan green, Vegetarian red, Jain purple, No meat brown, preferences pale); five cards a row on the shelf, gold-edged Label cards with a tag icon, arrows at the sides and page dots on a longer shelf; dark station tags with an icon in front (plate, flame, plus, check, warning, turner; short words when three or more stations share the row); one gradient heat bar (blue, green across this step's band, amber, red) with the band outlined, coloured labels with markers, a big red Heat button, a white Restart pill and a status card (station, step, companion with a check and "Used"). **No chat panel:** only mistakes and wins are called out, as a toast over the counter that fades; routine lines are already shown by the bubbles, order card and heat bar. **Art:** QT Gamer repainted the café room behind the guests (`rh-bg`, variant 2, cropped to the window and tables) and the cook's worktop under the counter (`rh-kitchen`, new), both without words, from the mockup (`ops/qt-team/gamer/concepts-playfield2.json`); approved by the owner as artist on 23 October 2026, with the serving tray.
- **Motion and sound** (all off with Reduce motion; Full in Play your way now also wins over the phone's reduce-motion setting): coins pop, hang and are pulled in on a magnet curve; each one flashes the takings coin and bumps the number; good serves in a row show a "×N" chip and raise the serve and coin chimes (a returned plate or spoilt dish ends it; feedback only, it never changes coins); hearts float over a served guest; the pot squashes as an ingredient lands; a dish that turns ready dings. The level-clear sheet (`Celebrate.tsx`) fills the takings bar from empty with a rising tick, holds at each star line, bursts the star, slams the heading in with confetti on a clear and raises the rest one by one; a tap skips it. New synthesized sounds, each captioned: ready, takings tick, star, fanfare, reward, knob click, perfect, off the heat. Checks: `tests/juice.mjs`.
- **Owner feedback on the live game (23 October 2026).** Station tags show only when they matter: cooking (flame and how far it has cooked), ready, a warning or the take window; idle names, Add more and Empty are gone (a pot cooking for two keeps its "×2"). Bubbles are compact and never cover the order card (a tall one moves down over its guest), and guests stand taller. The shelf tray keeps room around its cards so borders and glows are not clipped (the brief's card rows too). The status card is now the companion's **Skill** card. Only mistakes are called out, as a toast just under the shelf. **One serving tray** (QT Gamer `serving-tray`, a rattan tray with a banana leaf and one plate) replaces the three-plate board; a second or third plated dish waits on a small plate at the tray's front corners, shown only while it holds a dish (the simulation still has three plate slots). **Coins** fly in the DOM layer over every panel (`coinsFx.ts`; on the canvas they vanished behind the order card), with the takings won popping over the guest, a slower magnet and a sparkle trail. **The pet** hops along the counter in front of the guests and cheers by the guest just served (`pet.ts`). A thumb's slightly curved sideways swipe scrolls the shelf again, also while the other thumb holds Heat. Reduce motion (Play your way, or the phone's own setting while the game follows it) turns every effect off.
- **Knob and cook timer (prototype, Chapter 1, development builds only).** Play your way > Heat: Knob and ring. **B, the knob:** the Heat button shows a gas knob; hold it and a chunky needle climbs the heat bar, wobbling, while the sweet spot breathes and the stove's flame grows with it (`Playfield.heatPreview`); let go and the flame holds there (`sim.setKnob`, `KNOB.rate`), graded on the spot ("Perfect heat!" in the middle half of the band, "Good", "Too cool", "A bit hot", "Too hot!"), with a tick each time the needle crosses the band. **C, the cook timer:** a bar under the heat bar where a marker rides as the step cooks to a gold star window; from 80% the station's tag turns gold ("Almost", then "Take off!") and the Restart pill becomes **Take off**, pulsing in the window while the station stands in a pulsing pool of gold light; Take off (or a tap on the station) within 0.3 s of done stamps **Perfect!** over the pan with a gold burst, earlier counts the missing cooking as off the band ("A bit early"), later runs into the red overcooked end of the bar and after 2 s comes off by itself ("Overcooked"). The first version's thin closing rings were dropped (owner, 22 Oct: "we can't just have a circle and call it a game"). Replay supports both ops (`RunSetup.knob`), but the server's game does not have the mode yet, so these services are practice and nothing is sent. Every Chapter 1 level clears in knob mode with the test player and replays exactly (`.local/juice/knob-check.ts`, `tests/knob.mjs`; frames: `tests/knob-look.mjs`). Decided 23 October (below): difficulty by chapter, Assist, and flips and folds on the timer. Still open: whether it replaces the burner switch.
- **Knob across the chapters, Assist, flips and folds (23 October 2026, owner: "proceed with 1-3 based on your recommendation").** Knob mode now plays every numbered level (Levels 1 to 100, development builds; specials, seasons, Kitchen levels and cafés keep the switch). **Harder by chapter** (`sim.knobTune`): the window either side of done shrinks from 0.35 s (Chapter 1) to 0.2 s (Chapter 10), the grace before an overcooked step comes off by itself from 2.5 s to 1.5 s, and the held needle climbs faster (0.75 to 1.1 heat a second) and wobbles more (0.8 to 1.6 times the first prototype's). **Assist** (Play your way > Knob assist): a slower (×0.6) and steadier (×0.4) needle, a let-go up to 0.06 outside the band lands just inside it, and every window is 1.6 times wider with a second more grace. **Flips and folds on the timer:** a flip shows the spatula at halfway on the cook timer and a fold shows at the start (the dough board gets the timer too); the mark and the station's tag glow gold ("Flip now!", "Fold now!") for 2 s after the turn falls due (Chapter 1) down to 1.4 s (Chapter 10), then turn red. A flip on time stamps **Perfect flip!**; a late one stamps **Late flip** and its wait past the window counts as off the band, like an overcooked take. A fold on time stamps **Neat fold!**; a late fold costs nothing (a dough board has no heat to overcook). The oven (thermostat, no knob) finishes its steps by itself in knob mode. Replay carries Assist (`RunSetup.assist`); the services stay practice. Checks: every level 1 to 100 clears with knob and with Assist at 0.7 s and 2.2 s, three seeds each, and replays exactly (`.local/juice/knob-check.ts`); real-input browser checks for the tune, Assist's catch, flips, folds and one level of every chapter (`.local/rh-harness/tests/knob2.mjs`).

## Four stations at most, two in view, and the pet behind the plates (23 October 2026)

- **Four stations at most** (owner: "keep 4 types of cooking methods max instead of 5"). `MAX_STATIONS = 4` in `content/levels.ts`; the level check (`scripts/validate-game.ts`) refuses a level with more, and café visits keep to it (`mission.ts`). The 16 five-station levels lost the station used by the fewest dishes, keeping each finale's signature dish; each lost order went to another dish of the level the guest can eat, keeping the order count: Level 30 drops the dessert pot (sago), 40 the rice cooker (claypot rice), 50 the steamer (idli), 60 and 70 the wok (no dish used it), 80 the soup pot (dumplings), 90 and 100 the oven (roast veg; Daniel's Level 100 order is chee cheong fun, which keeps its old difficulty), 95 and 99 the oven and griddle (the Western set, which keeps Level 94), and the season finales: Reunion kitchen the soup pot (braised mushrooms), Sunset bazaar the rice cooker (nasi lemak), Festival of lights the dessert pot (payasam), Year-end table the dough board (tang yuan) and Lantern bakery the blender (orh nee). Briefs that named a dropped station or dish were updated. Level 20 (signature service) uses only the stations its three dishes need (`signatureStations`); a menu that would need five loses dishes from the end (`signatureFit`), and the chalkboard offers only dishes that keep it at four (no menu of today's dishes needs more). Every level and season clears 6 of 6 at 0.7 s and 2.2 s; at 3.2 s Level 100 matches its old 4 of 6 and Sunset bazaar 6 rose from 4 to 6 of 6.
- **Two stations in view** (`layout.ts` `Row`, `viewLayout`, `RowNav.tsx`). The serving tray stays at the left and two stations share the rest of the row (a level of one or two looks as before); a row of three or four slides, resting on the first two or the last two. It slides with a sideways swipe on the stations (a press that lifts a ready dish carries the dish instead), its arrows (which sit on 14 px gutters at the row's sides, mostly clear of the stations), a card or paste held over a gutter for 0.45 s (the arrow glows; pausing over a station to aim never slides it), a tap on a guest whose dish starts on a hidden station, and any action that selects one: the row follows the selected station, and a slide hands the heat panel to the first station in view. The scene keeps each station in its own container and slides them together; a station leaving the view fades out instead of crossing the tray, takes no taps while out of view, and plays no effects there (a flare hit still shakes the screen, and a paste poured from it flies from where it was let go). An arrow becomes a chip naming the most urgent hidden station beyond it (a warning, a take-off or a ready dish), coloured like its tag. Tags, tools, stamps, drops, the basket and the shelf work on the stations in view (`Lv`); the harness reads them through `__rushView`. Checks: `.local/rh-harness/tests/rows.mjs`.
- **The pet behind the plates** (owner: "the pet seem to be blocking the serving plate"). It stands on the counter's back edge, drawn over the counter and the guests but under the plates and what is served on them, and rests only in the middle of the gaps between plates (and at the counter's ends when there is room); at a full counter of four it is a little smaller (44 px) and peeks out from between the plates. A served guest's nearest gap is where it pops up to cheer.

## Tablet layout, the wrong ingredient, the pet's perch and four-part recipe levels (23 October 2026)

- **Tablet layout** (owner: "a proper tablet layout instead of a phone column in the middle"; `layout.ts`). A landscape screen at least 900 px wide and 560 px tall (a tablet or desktop) shows two panes side by side: the café on the left (HUD and order card above the guests, the counter at its foot; guests walk in from the café's side) and the kitchen on the right (the shelf at the top, three rows of cards when the pane is tall enough, the stations and heat panel at the bottom), with the room and worktop pictures each covering their own side (`backdrop`, `kitchen`). A portrait tablet keeps one column, wider (up to 780 px), with up to seven cards a row. The station row shows as many stations as get a slot of 104 px or more, two at least (`rowShown`): a phone still shows two and slides, a tablet shows all four. Progress rings sit on each station's art. A row counts its arrow gutters when deciding how many fit. When the layout changes (a fold opened, a window widened) the row keeps a valid resting place, one rule (`clampStart`) shared by the screen and the playfield. In two panes the hint toast sits between the shelf and the stations when there is room, else above the café's counter, and the order caption stays in the café pane. Checks: `.local/rh-harness/tests/tablet.mjs` (landscape and portrait tablet, desktop, phone, a fold opened mid-row) and `toast-spots.mjs`.
- **The wrong ingredient, ringed** (`pan.ts drawWrong`). An ingredient that breaks a guest's rule wears a pulsing red ring and a small red cross in the pan until it is lifted out or the dish restarted; one poured or sprinkled in rings the bowl. With motion reduced the ring holds still. A wrong ingredient in the closed rice cooker rings the cooker's bowl, once however many there are. The mistake toast now runs to three lines, so its "Lift it out with its ✕ under the heat bar" is never cut off.
- **The pet at a full counter** (owner: "mostly hidden behind the seat numbers"). At four seats it is 44 px and stands on the plates' back edge, above the plates and their numbers, in the gaps between guests.
- **Four-part recipe levels.** A recipe level's dish may use up to `MAX_STATIONS` (4) parts: the pack rules (`pack.ts`), the shape check (`compile.ts`) and the QT bots' shape schema (`server/game/levels-worker.mjs`). Claypot rice compiles to the wok, rice cooker, soup pot and assembly board; built from code alone it clears every tier at 0.7 s and 2.2 s and replays exactly (`.local/kitchen-review/claypot-local.ts`).
- **No credits from a guest's phone** (owner, 23 October 2026). The sign-in import no longer moves device credits to the account (`server/game/progress.mjs`); bests, finds and decor bought on the device still come, decor capped by what the device's clears could have earned.

## Not done yet

- **Production gate:** a server-backed `games` control.
- **Account progress (Phase B):** account-backed progress with server replay of the event log.
- **Art delivery:** an art pack downloaded on first play instead of bundled.
- **Device checks:** physical-device frame-time and memory checks (GAME_PLAN §12.5).
- **Lotus Avatar:** the real flow and payments. Tiers are a development preview only.
- **Content review:** the cultural and religious reviewers (GAME_PLAN §6).
