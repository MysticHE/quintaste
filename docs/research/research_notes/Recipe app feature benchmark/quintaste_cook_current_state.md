# QuinTaste Cook / Recipe feature: current-state inventory (audited 2026-10-17)

Method: read source directly. Cook source is small: about 1,100 lines across ~45 files; the largest file is `src/data/recipes.ts` at 91 lines, so nothing is near the 2,500-line limit (dense style, many long single lines).
Status: local-only, browser/source verified. No backend; physical-device UI unverified.

## 1. Routes and navigation flow
Cook tab is an Expo Router Stack (`src/app/(tabs)/cook/_layout.tsx:1-6`: headerShown false, slide_from_right, "none" when reducedMotion). Route files are one-line re-exports.

| Route | File | Screen | Purpose |
|---|---|---|---|
| /cook | `src/app/(tabs)/cook/index.tsx` | `CookScreen` (`src/screens/food/Cook.tsx:13`) | Browse |
| /cook/filters | `src/app/(tabs)/cook/filters.tsx` | `CookFiltersScreen` (`CollectionFilters.tsx:11`) | All/Vegan/No alliums/Saved |
| /cook/my-recipes | `src/app/(tabs)/cook/my-recipes.tsx` | `MyRecipesScreen` (`MyRecipes.tsx:8`) | Private drafts list + floating + |
| /cook/shopping | `src/app/(tabs)/cook/shopping.tsx` | `ShoppingScreen` (`Shopping.tsx:8`) | Free-text checklist |
| /cook/ingredients/[id] | `src/app/(tabs)/cook/ingredients/[id].tsx` | `IngredientGuideScreen` (`IngredientGuide.tsx:10`) | Per-recipe ingredient notes |
| /cook/recipe/[id] | `src/app/cook/recipe/[id].tsx` | `RecipeDetailScreen` (`RecipeDetail.tsx:16`) | Bundled recipe detail (root stack) |
| /cooking/[id] | `src/app/cooking/[id].tsx` | `CookingScreen` (`Cooking.tsx:30`) | Guided cook mode |
| /timers | `src/app/timers.tsx` | `TimersScreen` (`Cooking.tsx:67`) | Timer list + alert opt-in |
| /private-recipe/[id] | `src/app/private-recipe/[id].tsx` | `PrivateRecipeScreen` (`PrivateRecipe.tsx:14`) | Own-recipe View and cook |
| /recipe-draft/[id] | `src/app/recipe-draft/[id].tsx` | `RecipeEditorScreen` (`RecipeEditor.tsx:8`) | Editor |
| /recipe-review/[id] | `src/app/recipe-review/[id].tsx` | `RecipeReviewScreen` (`RecipeReview.tsx:9`) | Rights/policy, Prepare Submission |

Screens are in `src/screens/food/`.

Flows:
- Browse -> RecipeRow -> /cook/recipe/[id] -> `Cook` writes `doc.cooking` -> /cooking/[id] (`RecipeDetail.tsx:24-33`) -> Next/Previous -> `Finish Cooking` sets `cooking:null`, notice "Cooking complete", `router.dismissTo(detailPath)` (`Cooking.tsx:41-49`). `Close` chip -> /cook; session persists.
- My Recipes -> floating + (`create()` -> /recipe-draft/[id]) -> editor -> `View & Cook` (/private-recipe/[id]) or `Review Publication` (/recipe-review/[id]) -> `Prepare Submission` -> status "ready", shown as "Ready to submit · Not sent" (`MyRecipes.tsx:17`, `RecipeReview.tsx:14,19`).
- Saved (Me > Saved, /saved) lists recipes; private ones open /private-recipe/[id]?from=saved (`Saved.tsx:49`); bundled open /cook/recipe/[id] (`src/utils/catalog.ts:35`).
- Persistent `TimerDock` appears on screens without `hideTimers` (`src/components/Screen.tsx:67`, `src/components/food/Timers.tsx:44`) and links to /timers.

## 2. Browse (`src/screens/food/Cook.tsx`)
- Header: `SearchField` "Search recipes", `IconButton` "Recipe Filters" (selected when filter != All), `MeButton` (`:24-28`). Titleless root.
- Shortcut chips: "My Recipes", "Shopping" (`:29`).
- Resume card only when `doc.cooking` is active and step < steps.length: name, "Step n/N · X servings", play icon (`:30-36`).
- Search: substring on name + cuisine + ingredient names (`:18`). Query is in-memory per owner (`useScopedValue`, `src/state/Food.tsx:45`), not persisted.
- Filters (`CollectionFilters.tsx:15`): All, Vegan, No alliums, Saved (single-select radio). Persisted immediately in `doc.recipes.filter` per owner (`Food.tsx:46`, `src/state/recipe-workspace.ts:31`); no Apply/Reset. "No alliums" requires ingredientsKnown, not withdrawn, no allium in `contains`.
- Sorting: fixed, by dietary-fit rank (fit < unknown < conflicts) (`:22`). No user sort.
- Categories: none. `cuisine` is only a search term.
- Row (`src/components/recipes/RecipeRow.tsx`): Card, 88x100 thumbnail (56x80 if width<360 and text scale>1), name (subtitle), "{min} min · {servings} servings", `RecipeFit` badge, independent Save bookmark (48 target).
- Empty state: "No Matching Recipes / Try another ingredient or filter." with "Edit filters" (`:37`).
- Withdrawn recipes are hidden (none withdrawn currently).

## 3. Recipe detail order (`RecipeDetail.tsx:34-54` + `src/components/recipes/RecipeOverview.tsx:31-50`)
1. Screen title = recipe name; back (from=saved returns to /saved).
2. Hero photo, full width, aspectRatio 2.4, radius 16, uncaptained (`RecipeOverview:32`).
3. Row: "{n} min" small muted + fit badge; Save (bookmark), Share, Recipe Info (info icon toggle), 48-unit icon buttons (`:35-40`).
4. "Contains: ..." and "Unconfirmed: ..." warning lines (`:41-42`).
5. Recipe Info panel (toggle): author · language · vN; "Bundled recipe · Illustrative image"; "Updated date · Ingredient claims unreviewed"; adaptationNote (`:43-48`).
6. Share fallback: selectable text + close (`:49`).
7. Withdrawn InfoBox if applicable.
8. Servings stepper (1-8) with `Reset Servings` link when changed; "Start Another Recipe?" InfoBox when replacing; primary `Cook` / `Resume` / `Replace & Cook` (`RecipeDetail.tsx:37-44`).
9. "Ingredients" heading with `Add To Shopping` (basket) and `Ingredient Guide` (book) icon buttons (`:45-48`); scaled ingredient lines (`:49`).
10. "Steps" title; flat numbered steps (title bold + instruction) (`:50-51`). No step photos/timers shown in detail.
11. `No-Allium Version` link when `adaptationId` (only coconut-laksa) (`:52`).
12. Collapsed `Private Note` (`CookSection`; stored in `doc.notes["recipe:"+id]`) (`:53`).
Not shown on bundled detail: description, cuisine (removed by override).

## 4. Cook mode (`src/screens/food/Cooking.tsx`)
- One step per screen. Header: recipe name + `Close`. "Step n/N · X servings" (accent) and a 4px progress bar with progressbar role/value (`:52-55`).
- Step content: title, instruction at 20 x textMultiplier font (`:56`), optional photo (private recipes only, 160px contain) (`:57`), assigned ingredients scaled to session servings (`:58`), optional "Start N min timer" button (`:59`).
- Buttons: Previous (step>0) and Next / Finish Cooking (`:61-62`). No swipe/gesture handlers, no keyboard shortcuts, no voice/hands-free (grep for PanResponder/key handlers in cook files found none).
- Wake lock PRESENT: `expo-keep-awake` ~57.0.2, `activateKeepAwakeAsync("quintaste-guided-cooking")` in `useFocusEffect`, released on blur; failure shows "Screen may sleep. Check your device settings." (`:17-29,63`).
- `CookingTools` (`src/components/recipes/CookingTools.tsx`): lists all timers (`TimerCard`), "Add Timer" chip (custom label <=60 chars + whole minutes 1-180), "Timer Settings" chip -> /timers.
- Timers (`Timers.tsx:22-43`, `src/state/Food.tsx:127-145`): multiple concurrent (max 20, each <=86,400 s); display m:ss or h:mm:ss; Pause/Resume, "+1 Min" (adds 60 s; paused stays paused), More: Restart, Dismiss. Deadline-based (`endsAt`), recomputed on AppState change; survive leaving cook mode. At zero: "Ready / Check your food". No in-app sound.
- Resume: `doc.cooking = {recipeId, recipeVersion, step, servings, startedAt}` persisted per owner; Browse shows resume card; detail button reads "Resume".
- Changed/withdrawn guard: "Recipe Changed" screen with Review Recipe (`:39`).
- Finish: clears session, notice, returns to detail. No completion screen, no history record, no rating.
- Starting a different recipe prompts to replace; timers continue.

## 5. Servings, units, ingredient guide, Shopping
- Servings integer 1-8 (`src/components/food/Controls.tsx:88-94`). Scaling is linear: `amount * servings / recipe.servings` (`src/utils/food-format.ts:9-13`), formatted with `Intl.NumberFormat("en-SG", maximumSignificantDigits 12)`. Times do not scale. Applies to detail, cook mode, private recipes, Shopping text.
- Units are free-text strings ("g", "tbsp", "ml", ""). No unit conversion (metric/imperial), no fraction display (0.5 shows as "0.5").
- Ingredient guide (`src/screens/food/IngredientGuide.tsx`, `src/data/ingredient-guide.ts`, 15 entries): per ingredient name, optional "Also called", one-sentence role, add-to-shopping button; fallback text "No reviewed substitute is available." Bundled recipes only. No substitutions, no photos.
- Shopping (`src/screens/food/Shopping.tsx`): flat private checklist `ShoppingNote {id, recipeId, text, checked}` (`src/types/recipe-workspace.ts:8`). Add free text (<=300 chars), check/uncheck, delete each. "Add To Shopping" on a recipe adds each scaled ingredient line, deduped by id `recipeId-ingredientId-servings`. NOT aggregated across recipes, no categories/aisles, no structured quantities, no clear-checked, no share/export, no stock claims. Max 100 notes.

## 6. Dietary fit (`src/utils/dietary.ts`, `src/components/food/Evidence.tsx`)
- `dietaryResult(item, diet, excluded)`: conflicts = (user exclusions + vegan-implied [Eggs, Dairy, Honey, Animal gelatin, Rennet] when user diet is Vegan) intersect recipe `contains`. fit = "Conflicts" | "Unknown" | recipe diet. Confirmed needs editorial/menu evidence checked within 90 days, ingredientsKnown, not withdrawn. Unknown = user exclusions not covered by confirmation.
- Badge: icon + label, semantic theme colors (success/warning/muted, dashed border for Unknown). Preferences come from `usePreferences().draft`. Not independent verification.
- Allium-free: "No alliums" filter (alliums config) + bundled "Ginger coconut laksa" (id gentle-laksa) linked from coconut-laksa via `adaptationId`/`adaptationNote`.

## 7. Private recipes and publication
- Create: `emptyRecipeDraft` (`src/state/recipe-workspace.ts:6`). Fields (`src/components/recipes/DraftFields.tsx`): title(100), description(2000), author(80), language(40, default English), servings (2 digits, 1-8), total minutes (1-1440), diet (Vegan/Vegetarian/Unspecified), sponsorship (None/Paid/Gifted/Affiliate), recipe photo; ingredients (name 120, amount decimal up to 3 dp, unit 24; max 40); steps (title 120, instruction 3000, timer minutes 1-180, step photo, per-step ingredient chips; max 30; up/down reorder, no drag).
- Autosave on each edit via `useRecipeWorkspace().edit` with Saved / Saving / Changes need Retry status and Retry Save (`RecipeEditor.tsx:15,19`). Max 20 drafts. Photos: data URI JPEG/PNG/WebP <=300,000 chars each, 1,200,000 aggregate; picker rejects large files (documented under 220 KB, shared `ListingPhotos`; camera/library on native, file picker on web). 1,500,000-byte total collection guard.
- Editing a ready or actively-cooked draft bumps `revision` and clears rights/policy (`src/hooks/useRecipeWorkspace.ts:13`).
- View and cook (`PrivateRecipe.tsx`): Edit / Copy / Share chips; servings scaling, `Original Servings`, Cook/Resume/Replace & Cook, `Add To Shopping`, Private Note, Publication section. Cooking requires `cookingIssue` (`src/utils/private-recipes.ts:5-11`): name, 1-8 servings, valid ingredients, complete steps. Author/photos/consent not required.
- Copy: "(copy)" title, revision 1, consent cleared.
- Share: text only via `Share.share` using `recipeShareText` (`private-recipes.ts:25-32`): title, author, "Private recipe · Not published or independently reviewed", description, servings/time, declared diet, sponsorship, ingredients, steps; excludes photos/notes. Fallback: selectable text.
- Publication: `publicationIssue` (`recipe-workspace.ts:10-20`) requires name, description, author, language, photo, servings, time, diet, ingredients, steps, sponsorship, rights + policy checkboxes. Result "Ready To Submit · Not Sent. Saved on this device. Publishing awaits creator approval and review services." Nothing is sent/approved/published.
- Delete: confirm "Delete This Recipe?" (removes photos). Export omits photo bytes.

## 8. Save, collections, notes, history, ratings
- Save: `toggleSave("recipe", id)` into `doc.saves` (`SavedItem {kind, id, savedAt, list}`), shown in Me > Saved. Saved supports user lists (max 30), type filters All/Places/Dishes/Recipes/Notes, search, remove/Undo (`src/screens/food/Saved.tsx`, `CollectionFilters.tsx:18-51`). No recipe-specific cookbook UI in Cook.
- Notes: one free-text Private Note per recipe; also searchable in Saved > Notes.
- Cooked history/log: ABSENT. Ratings/reviews: ABSENT. Only `startedAt` on the active session.

## 9. Local notifications for timers
- `expo-notifications` ~57.0.23 via curated `src/services/local-notifications.ts` (never import package root). Adapter `src/services/timer-alerts.native.ts`: Android channel "cooking-timers" (HIGH, default sound, vibration), DATE trigger, "Cooking timer finished" + label. Provider `src/state/TimerAlerts.tsx`; `timer-alert-coordinator.ts`, `timer-alert-sync.ts`, `timer-alert-policy.ts`; tap routing `src/hooks/useTimerNotification.native.ts` -> /timers.
- UI: `TimerAlertControl` (`src/components/food/TimerAlertControl.tsx`) only on /timers: Enable/Disable Alerts, approximate-alert warning on Android 31+, Alarms & Reminders, Device Settings, Retry. Not offered inside cook mode.
- Limits: web unsupported ("Phone alerts require the mobile app"); Android 12+ exact timing unverifiable (`timing-unverified`); bypasses app quiet hours; no iOS Live Activity, no Android ongoing timer actions, no remote push; no physical-device delivery verification.

## 10. Bundled recipe data (`src/data/recipes.ts`; type `Recipe` at `src/types/food.ts:41-46`)
4 recipes (3 distinct + 1 derived): miso-bowl (30 min, cuisine "Bowls"), coconut-laksa (25, "Local"), sesame-greens (20, "Asian"), gentle-laksa (derived allium-free variation, created via `recipes.push` at `:77`). All 2 servings, Vegan, author "QuinTaste sample kitchen", English, revision 1, updatedAt 2026-10-12. Photos: `assets/food/{bowl,laksa,greens}.png` via `src/data/photos.ts` (gentle-laksa reuses laksa).
Fields: id, name, description, photo key, minutes, servings, cuisine, dietary{diet, contains[], ingredientsKnown, evidence{kind, source, checkedAt, withdrawn?}}, ingredients[{id,name,amount:number,unit}], steps[{title, instruction, ingredientIds[], timer?{label,seconds}}], dishId?, adaptationId?, adaptationNote?, author, language, revision, updatedAt, withdrawal?.
Absent from model: nutrition, tags, difficulty, cost, equipment, video, per-step photos, yield text, prep/cook split, tips, source URL, ratings. `description` exists but is not displayed on detail.

## 11. Tokens, primitives, size
- Colors via `usePreferences().theme` semantic tokens (`src/theme/tokens.ts`, 153 lines; three palette families, light/dark; e.g. accent #b43829 coral, #285ba7 cobalt). Cook files use theme.accent/warning/error/muted/card/mutedForeground; no hardcoded hex observed in files read. Nunito through `T` (`src/components/ui.tsx`, 301 lines). Cook scale title23/subtitle18/body16/small13/button16.
- Primitives: `CookLayout` + `CookSection` (`src/components/recipes/CookLayout.tsx`; 12 padding/10 gap, collapsed children stay mounted); `Chip`, `Chips`, `IconButton`, `SearchField`, `EmptyState`, `InfoBox`, `Servings`, `SectionTitle`, `MeButton` (`src/components/food/Controls.tsx`, 110 lines; min 48 targets); `Card`, `Button`, `Field`, `Icon` (Ionicons) in `ui.tsx`; `FitBadge` (`src/components/food/Evidence.tsx`); `FloatingAddButton` (`src/components/FloatingAddButton.tsx`); `IngredientCheck` (`src/components/market/Ingredients.tsx`); `RecipePhoto` -> `ListingPhotos`; `PrivateNote` (`src/components/food/DetailParts.tsx:57`).
- State: `src/state/Food.tsx` (169 lines), `food-schema.ts`, `useFoodStorage.ts`; recipe workspace in `doc.recipes`.
- Largest cook-related files: recipes.ts 91, Cooking.tsx 75, Timers.tsx 73, timer-alert-coordinator.ts 66, TimerAlerts.tsx 59. None near 2,500.

## 12. Constraints a redesign must preserve
Sources: AGENTS.md, `docs/COOK_READINESS.md`, `.impeccable/surfaces/cook.md`.
- Binding clean Cook presentation override (15 Oct 16:49): bundled detail = uncaptained photo, time + computed fit badge, 48-unit Save/Share/Recipe-info icons; provenance only in one-tap Recipe info; no persistent sample/provenance/placeholder paragraphs; servings/Cook unboxed with no explanatory paragraph; shopping and guide icons in the Ingredients heading; flat ordered steps; keep conflict/unconfirmed warnings, Private note and no-allium variation; fictional linked-dish shortcut stays removed; browse rows show fit with no Editorial sample label; private recipes omit unspecified diet, absent author and None-sponsorship placeholders.
- Compact Cook layout: type 23/18/16/13/16, 48-unit targets with one padding layer, 12 insets/10 gaps, 88x100 thumbnails (56x80 narrow+large text), resume row only for active cooking, titleless root, filters save immediately without Apply/Reset.
- Private note / Publication / Author and Disclosure stay mounted while collapsed.
- Publication ends at "Ready to submit · Not sent"; never say sent/approved/published; edits clear consent and bump revision. No reviewed-content or ingredient-verification claims; fit is not verification. Paid recipes out of scope.
- Owner isolation (guest/profile), explicit guest copy clears consent, 1,500,000-byte guard, photo limits, export without photo bytes, delete clears data.
- Cooking: revision/withdrawal guards, replace prompt, timers survive close/delete, Finish cooking clears session and returns to detail immediately (no second completion screen).
- Timer alerts through `local-notifications.ts`; keep timing-unverified warning; no device-verified claims; web alerts unsupported.
- Reuse `FloatingAddButton`; semantic tokens only (no hardcoded colors, no directional accent borders); Nunito; palettes Light/Dark/System; no gameplay.
- Expo SDK 57: check versioned docs before Expo API work; run `npx tsc --noEmit` and `npx expo lint`; update `docs/PRD_COVERAGE.md` (QT-016/017/018/019, J04/J05, P04-P06 remain Partial).

## 13. NOT IMPLEMENTED (verified absent in source)
- Cooking history / cooked log, streaks, counts
- Ratings, reviews, comments, likes, public recipe discovery, sharing of cooked photos
- Meal planner / calendar
- Aggregated or merged shopping list, aisles/categories, clear-checked, list sharing, grocery delivery
- Unit conversion (metric/imperial), fraction formatting, servings beyond 1-8 or fractional
- Nutrition, calories
- Video/audio in recipes; voice/hands-free; swipe between steps; keyboard shortcuts; tick-off of step ingredients; per-step photos for bundled recipes
- Import from URL/photo/text, web clipper
- Cook-specific collections/cookbooks (only shared Saved lists), tags, category/time/difficulty/meal-type filters, sort options, recently viewed, search history, recommendations, pantry matching
- Difficulty, cost, equipment, prep/cook split, yield text, tips, substitutions, source URL for bundled recipes
- In-app timer sound, auto-start step timers, lock-screen/Live Activity timer UI, alert opt-in from cook mode
- Publishing to others, creator profiles, editorial review, cloud sync of recipes, paid recipes
- Content depth: only 4 bundled recipes (3 distinct), 3 images
