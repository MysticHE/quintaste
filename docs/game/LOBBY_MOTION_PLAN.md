# Game tab motion, slide to enter and café tap markers (proposal, 20 October 2026)

Status: **built 20 October 2026, not committed or deployed.** Owner asked for more motion on the Game tab, a slide
control instead of the Enter café button, and a replacement for the café's tap dots; then (20 Oct) for the slider
centred under the cook and companion, a cleaner slider without the white ring, and the tap-anywhere glow to light one
object at a time in a softer gold.

Built: `src/screens/game/Lobby.tsx` (café name and progress top left, cast in the middle, slider centred under it,
zoom and warm flash on entering), `LobbyCast.tsx` (stir, wok toss with real ingredient art, steam, companion bounce
and heart, tap reactions), `home/SlideToEnter.tsx`, `home/SceneFx.tsx` (sunbeams, leaves, sparkles, reveal glow,
heart), café changes in `home/Scene.tsx` and `Home.tsx`. Not built: the butterfly at the window (no art for it).
Mockups from the proposal stage: `~/Downloads/quintaste-game-mockups/`.

Settings fixes in the same change: Play your way's Reduce motion could not be switched off whenever the app or phone
asked for less motion (on many Androids power saving does), which also froze all café motion; it is now a game choice
(`motion` in `src/game/settings.ts`, `GamePreferences`). Sound effects, café music, haptics and text size only acted
inside Rush Hour; they now also apply on the Game tab and in the café (`src/game/cafe-feedback.ts`).

## Why the Game tab looks still today

`src/screens/game/Lobby.tsx` already animates, but too little to notice:

| Effect | Actual motion |
|---|---|
| Cook sway (`Sway`) | ±0.9° every 1.9 s, about 2 px at the top of the figure |
| Companion hop (`Hop`) | About 10 px for 0.6 s, once every ~4 s, plus a 2.5% breath |
| Button halo (`PlayButton`) | Faint gold ring behind a gold pill |
| Entrance (`useEnter`) | Fade-in once on open |

Steam, dust motes and the window glint in `src/screens/game/home/Ambient.tsx` are used only in the café (`Scene.tsx`),
not on the Game tab. All motion also stops when Android "Remove animations" (often switched on by power saving) or
the game's Reduce motion setting is on (`usePreferences().reducedMotion`).

## Recommended Game tab motion

All of it is Reanimated (already installed), uses no new packages or art, and turns off with reduced motion.

1. **A living room.** Warm god rays from the window that slowly brighten and dim; a denser sparkle dust trail in the
   beam; two or three leaves drifting down from the hanging vines every few seconds; occasionally a small bird or
   butterfly crossing outside the window.
2. **The cook really cooking.** A clear stir rhythm (body bob plus wok tilt, about once a second), thick wok steam,
   and every few seconds a wok toss: food bits arc up with a sizzle sparkle and land back in the pan. This is the
   focal point.
3. **The Mochi Chef reacting.** Sways with the cook's rhythm, squash-bounces on each toss, and on tap pulses its blush
   and pops a heart. Its closed happy eyes never change (owner rule).
4. Optional: a very slow camera drift (about 3% over 20 s). Skip it if it competes with the god rays.

Limit: the cook and companion are single flat images, so arms cannot move independently. Real arm stirring needs
QT Gamer to draw a few frames or separated parts; try the version above first.

## Slide to enter (replaces the Enter café button)

- Compact gold pill styled as a track (owner rule: no large CTA bars). The dark arrow thumb sits at the left; a shine
  sweeps across "Slide to enter" (replaces the pulsing halo).
- Drag: the thumb follows the finger, the text fades as it passes; releasing below ~75% springs back.
- Complete: light haptic (`expo-haptics`), the thumb locks at the end and turns into a check, the room zooms toward
  the window/cook with a warm light flash, then `/game/cafe` opens.
- Tap on the track auto-slides the thumb across (single-pointer alternative, WCAG 2.5.7); screen readers get a plain
  "Open café" button action.
- Built with React Native's built-in touch handling (`PanResponder`) and Reanimated, so no new dependency.

## Café tap markers (replacing the gold dots)

### Duplicates found (`src/screens/game/Home.tsx` `hot` map and `PlayButton`)

| Tap target | Opens | Duplicate of |
|---|---|---|
| Mirror and aprons (`wardrobe`) | `avatar` sheet | Lian (`avatar`), the same sheet |
| Stove (`stove`) | `levels` sheet | The Play pill, which also opens `levels` |

Each pair has its own dot, so the café shows six dots for four destinations.

### Fix (built)

- Mirror opens the wardrobe (the avatar sheet). Tapping Lian only reacts (a wiggle and a boing) with no sheet, so
  there is one way to the wardrobe.
- The Play pill starts the next level directly (its label already names the level). The stove opens the level list.

### Markers (built)

- **Living objects instead of dots.** Characters need no marker; their motion and tap reactions signal it. The stove
  is marked by steam and a flame flicker. Backdrop objects (bookshelf, chalkboard, mirror) get a gold four-point
  sparkle that twinkles on the object surface, one object at a time, every few seconds.
- **Tap empty space to reveal.** Tapping anywhere that is not a hotspot lights each tappable object in turn with a
  soft gold glow (`RevealGlow`), one at a time (owner, 20 Oct); reduced motion shows them together briefly.
- **First visit.** Keep the existing `hint` (`!game.introSeen`): sparkles twinkle more often and more strongly until
  the first sheet opens.
- **Something new.** An object with something new (for example the chalkboard menu unlocking at Level 6) keeps a
  steady sparkle until opened.
- No labels, pills or icon rows (owner rule). Reduced motion keeps a static sparkle on each object.
