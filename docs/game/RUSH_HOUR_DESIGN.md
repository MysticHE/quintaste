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
| 1 | First plate | Pick up, drop, heat, plate, serve | Wok | 1 / 1 | none |
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
| 15 | A fourth table | Four seats | Wok, soup pot, rice cooker | 6 / 4 | 2:40 |
| 16 | Finish together | Two-part dish, layer order | Wok, assembly board | 4 / 3 | 2:20 |
| 17 | A familiar twist | Jain: ginger is a root | Wok, soup pot | 5 / 3 | 2:30 |
| 18 | Lunar 15th night | Everyone five pungent-free; desserts | Wok, soup pot, dessert pot | 6 / 3 | 3:05 |
| 19 | Dinner service | Triage across four stations | Four stations | 7 / 4 | 2:55 |
| 20 | Your signature service | Three dishes chosen on the chalkboard | All five | 6 / 4 | 2:50 |

**Hints fade:** full chef lines in Levels 1–4, first-time tips only in Levels 5–10, none from Level 11. Mistakes before cooking can always be lifted out for free.

### Difficulty, measured

`npx tsx scripts/validate-game.ts --react <seconds per action>` plays every level through the real simulation:

| Player | Seconds per action | Result |
|---|---|---|
| Expert | 0.7 | All 20 levels with 3 stars |
| Average | 2.2 | All 20 cleared, mostly 2 stars, with 35–55 seconds left in late levels |
| Slow | 3.5 | 14 of 20 cleared |

The slow player fails the checkpoint levels (7, 11, 13, 14, 18 and 19) because guests run out of patience. Calm mode (no clock, no patience) and the companion skills are the way through. Clocks are set to about 1.35 times the average player's time.

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
| Flow | Many small gaps | Plates and Restart are one tap on the state tag under each station (Ready · Plate, Scorched · Restart); a plated dish picks itself and highlights the guests to serve; ingredients drag with a lit drop target and float home when dropped away; a refused card shakes; the heat button pulses when food waits on a cold burner; the recipe card names the next step; Service and Time's up banners; the brief slides away; results wait for the last coin; a screen too short for the layout (a phone on its side) pauses the service with a message |

Code: `layout.ts` (geometry), `scene.ts` (Phaser view), `pan.ts` and `motion.ts` (contents and one-shot motion), `useServiceEvents.ts` (events to effects), `Hud.tsx`, `Counter.tsx`, `Shelf.tsx`, `Controls.tsx` (panels), `styles.ts` and `styles-sheets.ts`. The sim only gained `uid` on the `placed` event. Class names must stay unique: a `seg` clash once stretched the brief's mode toggle.

**Test without the Expo dev server** (it can take minutes to bundle): `.local/rh-harness` (gitignored) bundles the game component with esbuild into a plain page; run `node build.mjs`, `node serve.mjs`, then the Playwright scripts in `tests/` (`rh.mjs` playthrough and device sweep, `bot.mjs` cooks one dish per level through the UI, `misc.mjs` drag, restart, large text, reduce motion, tap only). Phones, native touch and haptics were not tested on a device.

## Not done yet

- **Production gate:** a server-backed `games` control.
- **Account progress (Phase B):** account-backed progress with server replay of the event log.
- **Art delivery:** an art pack downloaded on first play instead of bundled.
- **Device checks:** physical-device frame-time and memory checks (GAME_PLAN §12.5).
- **Lotus Avatar:** the real flow and payments. Tiers are a development preview only.
- **Content review:** the cultural and religious reviewers (GAME_PLAN §6).
