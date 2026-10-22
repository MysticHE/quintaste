# Game home: My little café

**Status:** built in the app on 18 October 2026 for development builds (`src/screens/game/Home.tsx`); members still see the placeholder and the `games` control stays locked. The owner kept this front-view café design; characters use the new cooking set (Lian, Wen, Mochi the bao bun, Sprout). Built details and differences: [game/RUSH_HOUR_DESIGN.md](game/RUSH_HOUR_DESIGN.md). The chalkboard now holds the signature menu for Level 20 instead of cuisine collections.

**19 October 2026 (owner direction):** the Game tab is a full-bleed lobby (`src/screens/game/Lobby.tsx`: room, cook, companion, level and stars, one compact Enter café pill) with the app dock. The café opens full screen at `/game/cafe` without the dock, with a Back button to the Game tab. No hotspot labels, outlines or quick-action icon row: objects in the room are the controls (stove → levels, shelf → books, companion, mirror → wardrobe, café name → café details with Arrange decor). One compact gold Play pill. Motion: entrance, wok steam, dust in the sunbeam, window glint, swaying decor, the cook's sway, the companion's hop, press glow, first-visit sparkles and a credits pop; all stop under reduced motion. Each skin has a 2:3 portrait room (phones) and a 3:2 wide room (QT Gamer `homeSkin`, `widen.py`) with the portrait room in the middle, so wide screens show the whole room without side bars.

**19 October 2026 (gap closure):** Play your way opens from a compact sliders pill in the café HUD and from the game's pause menu (one shared sheet). The chalkboard shows Today's special. The Level 16 assembly board and the Signature café skin (2:3 portrait plus 3:2 wide, QT Gamer runs `growth` and `widen-signature` in the VPS test folder) are in the app; both are drafts awaiting artist approval.

**Prototype:** [My Little Café](https://claude.ai/artifact/1b2ZNGxVgTvPEDvfQe4Jcr), a playable web prototype with QT Gamer concept art (private artifact, 18 October 2026). It is a design sketch, not app code.

**Owner direction (18 October 2026):**
- The Game tab opens on a home screen: the member's café in its chosen skin, their avatar, their pet and their decorations.
- Tapping elements in the scene leads into features, including the real game (Rush Hour).
- The home gains features over time.

Builds on:
- UI boards A08 (My little café), A09 (Decorate your café), A10 (Café details) and G06 (Back at your café: next lesson, learning collection, wardrobe, choose next level).
- PRD QT-047 (pets and wardrobe), QT-048 (private café with name, menu style, avatar, pet and decor; named snap positions; Undo and Save; never real property or a listing), QT-053, QT-056 and QT-057.
- [Game plan](GAME_PLAN.md) and [lotus avatar plan](AVATAR_LOTUS_PLAN.md).

## 1. Screen layout (portrait)

| Layer, top to bottom | Contents |
|---|---|
| HUD | Café name pill (opens Café details), credits balance, lotus chip (opens Lotus), Labels toggle |
| Scene | Café skin backdrop with decorations on named spots; the member's avatar standing **behind** the counter (Adult or Mini style); counter stations; their pet on the counter |
| Counter | Foreground layer with the stove; it hides the avatar below the chest, like a real stall owner |
| Primary action | One large button, always visible: **Play Level 5 · Check the label** |
| Dock | Levels, Books, Wardrobe, Decorate, Café: every hotspot is also here, so nothing is reachable only by finding it in the art |

## 2. Hotspots

| Scene element | Opens | Available from |
|---|---|---|
| Stove and wok | Rush Hour: next level, level path, Calm or Rush, which pet joins. The Play button and Levels open the same sheet | Level 1 |
| Bookshelf | Books: Recipe book (each links to its Cook recipe), Pantry book (label checks), Regulars book (in their own words) | Level 1 |
| Mirror and apron hook | Wardrobe: avatar form and outfit, accessories for each pet | Level 1 |
| Avatar behind the counter | Avatar card: switch Adult or Mini style, re-breed through the lotus, report | Lian, the mascot, until the member breeds their own |
| Pet on the counter | Pet card: its Rush Hour skill, which pet joins the next service, accessories | Sprout for everyone; more pets from Purple lotus |
| Menu board | Choose your menu: cuisine collection, Today's special (changes only when the member picks) | Level 6, when the café gains its menu board |
| Window | Out and about (22 Oct 2026): members' cafés to visit (behind `game_cafes`), and Stall visits, still "Coming in a later update" | Cafés built, off; Stall visits later |
| Lotus (HUD chip) | Lotus: your tier, re-bloom, breed, Golden | Always |
| Café name (HUD) | Café details: name and skin; the café stays private | Always |
| Decorate (dock) | Decorate mode | Level 1 |

**Visual cues:**
- First visit: a soft glow and short labels on the four core hotspots (stove, bookshelf, mirror, pet), plus one "Tap anything in your café" hint.
- After the first tap they stay quiet; labels return with the Labels toggle.
- Hotspots are at least 48-point targets and have screen-reader names.

## 3. The home grows with play and with releases

| When | What appears | Source |
|---|---|---|
| Level 1 | Starter café: counter and stove, bookshelf, mirror, Monstera and lotus painting | GAME_PLAN §9 café growth |
| After Level 4 | Lotus bowl decor (the first-clear grant) | GAME_PLAN §8 Level 4 |
| Level 6 | Menu board (choose your menu) | GAME_PLAN §9 |
| Level 9 | Soup pot beside the stove | GAME_PLAN §5 stations |
| Level 12 | Rice cooker | GAME_PLAN §5 |
| Level 16 | Assembly board on the counter, beside the rice cooker | GAME_PLAN §5 |
| After Level 18 | Paper lanterns and the Lantern night skin | Lunar 15th night level |
| After Level 20 | Signature café skin (portrait and wide) | GAME_PLAN §9 |
| Later releases | New hotspots, for example Stall visits at the window, a regulars' notice board, seasonal decor | New registry entries |

The tables of GAME_PLAN §9 (two at Level 1, a third at Level 6) arrive with the regulars' art; the prototype leaves them out.

**Hotspot registry:**
- Each hotspot is one entry: id, the art element and its tap area per skin, label, destination, unlock rule and dock order.
- A new feature is a new entry plus its art, with no layout rework.
- Locked entries show their unlock rule ("Level 6"); planned features say "Coming in a later update". Never a countdown.

## 4. Decorate mode (A09)

- **Named spots,** so screen readers and the station list can describe the café ("Wall by the door: lotus painting"):
  - Starter spots: Ceiling (hanging items), Wall by the door, Floor left and Floor right.
  - Window sill and counter end come with more decor.
- **Placing items:** tap a spot to see only the items that fit it, then tap one to place it. An item already placed elsewhere moves.
- **Saving:** Undo and Save. Leaving with changes asks before discarding.
- **Removing:** an item goes back to the inventory, never deleted (QT-048).
- **Where decor comes from:** the starter set, Rush Hour clears, lotus tiers, and later items bought with earned credits. Paid decor would need its own decision under QT-056.
- **Prototype examples** (values to tune): Monstera and lotus painting in the starter set; lotus bowl after Level 4; paper lanterns after Level 18.

## 5. Café details and skins (A10)

- **Name:** private; edits never widen the audience (QT-048).
- **Cuisine:** lives on the menu board only, so there is one place to change it.
- **Skins:** whole-café looks that keep every hotspot in place. Each skin stores its own tap areas in the registry.

| Skin | How it is unlocked |
|---|---|
| Sunny garden | Free, the default |
| Lantern night | Clear Level 18 |
| Lotus pond | Golden lotus perk |
| Signature café | Clear Level 20 |

- Earned skins are never time-limited.
- **Not a real place:** the café is never real property, seller approval or a dining listing.

## 6. Healthy play (QT-057)

The home never shows:
- daily login rewards, streaks or "come back" timers;
- default push notifications;
- countdowns or limited-time skins.

The café looks the same however long the member is away; regulars never leave because of absence.

## 7. Technical shape

- **Rendering:** the home is a Phaser scene in the same WebView as Rush Hour.
  - It shares the art pipeline (QT Gamer drafts, artist approves), Spine characters and pet attachments.
  - Moving from home into a level needs no reload.
- **Native screens:** text-heavy screens stay in React Native per GAME_PLAN §12.2. These are the books, Café details, settings and purchases.
- **Layers:** skin backdrop, back decor (ceiling, wall), avatar, counter, counter stations, pet, front decor (floor), hotspot tap areas, HUD.
- **Saving:**
  - Café layout, skin, name and equipped items save to the account (GAME_PLAN Phase B schema: café layout).
  - Before Phase B they save locally per account.
  - Saving is owner-only.

## 8. Concept art

Generated by QT Gamer in the VPS test folder (`operator-tests/gamer-test-20261018`), runs `home` and `home2`, all passing the cut-out checks:
- Three portrait skins (Sunny garden, Lotus pond, Lantern night) with the same layout and an empty floor for the counter layer.
- Counter with stove, four decor items, soup pot, rice cooker, and Sprout, the free pet.

Copies are in the bot workspace under `gamer/runs/home` and `gamer/runs/home2`. They are drafts for the design, not approved game art.

## 9. Owner decisions

1. **Primary action:** one always-visible Play button plus the dock (recommended), or hotspots only.
2. **Skins:** Sunny garden (free), Lantern night (Level 18), Lotus pond (Golden perk) and a signature café (Level 20).
3. **Decor sources:** play, tiers and earned credits only at launch (recommended).
4. **First-visit labels:** four core hotspots glow on the first visit (recommended).
5. **Future hotspots:** show planned features such as Stall visits as "Coming in a later update", or hide them until they ship.
