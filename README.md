# QuinTaste

The hosted app runs on the VPS and supports customer Google/username sign-in, staff Google/passkey access and authenticated avatar generation. **Deployment starts with the local [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md)**; [VPS overview](docs/VPS_DEPLOYMENT.md) lists current services and access URLs. The older local-preview sections below describe development flows and do not override the deployment runbook. Documentation stays local and is excluded from releases.

An Expo mobile preview for Android and iOS, based on the QuinTaste product requirements and UI/UX reference.

**Last updated:** 2026-10-16.

## Try the app

Install [Expo Go for Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [Expo Go for iPhone](https://apps.apple.com/app/expo-go/id982107779).

From this project folder:

```powershell
npm ci
npx eas-cli@latest login --browser
npm start
```

Sign in with the Expo account that owns the project, connect the phone and computer to the same Wi-Fi, and scan the printed QR code. Use the iPhone Camera app to scan on iOS. Keep the development server running while testing. Press `w` in the Expo terminal for the supplementary browser preview.

Expo project: [@mystiche/quintaste](https://expo.dev/accounts/mystiche/projects/quintaste).

## Preview flow

Startup leads to sign-in, create a preview profile, or guest entry. Account opens profile editing and settings. Settings include independent food exclusions, three color palettes, Light/Dark/System modes, text enlargement, reduced motion, screen-reader hints, and notification preferences.

Use example details such as `demo@example.com` and any password of at least eight characters. This is a local UI preview: it does not authenticate a real account, transmit credentials, store passwords, or connect Apple/Google sign-in. Provider and password-recovery actions explain their current availability.

Save changes stores the display name, bio, and preferences on the current device. Unsaved choices are a live preview and reset after restarting. The preview-profile session resets when the app restarts. Notification switches store preferences without requesting device permission or sending messages. Food exclusions are independent preferences, not an allergen-safety guarantee.

The current icon-only dock is **Explore, Cook, Social, Market and Game**. Social is the centre two-diner/shared-table icon and Game the rightmost leaf-controller icon. Social opens People and Events for opted-in food company and local gathering/application flows; Game retains an unavailable state with Try a recipe and Me. Open Saved from the first action in Me/profile settings; its count reflects the current collection. Saved and its filters retain /saved and /saved/filters, with Back/search/Filters and no dock or avatar. Live Social services and game mechanics remain gated. Market opens directly to browsing; My Listing sits beside Filters and opens owner management. Create listings only with its centered floating + above the dock. Market is a user-enabled local marketplace: browse/filter/save eligible pantry items, draft/publish/edit your own listing, chat and simulate offers/pickup/handover, or use Delete listing with Keep/Delete confirmation. Deletion removes the listing/photos, cancels active requests and retains messages/completed records. Listings/messages stay in the current device collection; there is no database, real multi-user chat, payment or delivery. Full ingredient text, ingredient-label/seal/date photos and reviewed Contains/May contain choices are required local publication checks; the seven-full-day cutoff is provisional. Ingredients to avoid separates Eggs from Milk / dairy and excludes contains or may-contain matches. The six unreviewed samples are excluded from browsing, so the default browse feed is empty; owned posts stay on My Listing. Photos must remain under 220 KB each and within the existing collection budget; oversize images are rejected. Native camera/library selection and browser file selection exist, with native permission and label-legibility acceptance pending. See [current scope](PRODUCT.md), [design concepts](DESIGN.md), [the marketplace contract](.impeccable/surfaces/market.md) and [PRD coverage](docs/PRD_COVERAGE.md) for production gaps.

## Development-only Explore services

The user has explicitly enabled a bounded local Explore service. It requires NODE_ENV=development and enabled:true in ignored .local/explore-services.json; production disables it. Ignored .local/explore-service uses an atomic, locked store. Guest/profile collections have separate opaque owner capabilities, kept in HttpOnly web cookies or native SecureStore; these are local ownership credentials, not production identity or cloud sync. Owner deletion erases server-owned records before the device collection.

Corrections/reports now follow draft → preview → queued → a server reference, with submitted/needs-info/user reply/approved/declined states, reasons and revisions. Photo attachments are limited to 512 KiB. The /local-review console requires the private .local/explore-service/reviewer.key; never publish or print its value. Version/idempotency checks, lock recovery and owner authorization are covered by isolated API/schema checks. Reviewer decisions never automatically change public venue facts. Production staffed intake, statutory response obligations and appeals remain unaccepted.

Home/Work now has independent, initially off opt-ins and queued withdrawals against a development-only coarse-area backend. This explicit local-flow authorization supersedes earlier blanket Phase 2-off/no-backend descriptions; it does not activate production community services. Exact private addresses stay on the device and nearby filters remain address-based. Saving an address never enrolls anyone. Local aggregate tests count collection identities, not production authenticated eligible accounts; snapshots remain null/suppressed pending approved privacy rules, with no public figures.

Offline Saved retains Google place IDs and user-authored private labels, lists, search and Undo. Live Google metadata remains five-minute memory-only data; this does not create an owned permanent catalogue or a photo-storage licensing exemption. The pilot research remains private, with a user-approved sanitized consumer Menu projection now published through /api/menus across the three clusters; its current menu-source coverage and remaining gaps are recorded in [menu coverage](docs/MENU_COVERAGE.md). Ingredient suitability remains unconfirmed. See [pilot catalogue scope](docs/PILOT_CATALOGUE.md). USB debugging is optional; no device is connected.

The [isolated API/schema report](.impeccable/review/explore-local-api.json) passed 12 grouped checks, including merge overlap, lock recovery, authorization, version/idempotency and participation privacy/deletion. Independent source/security review has no remaining findings. The [browser report](.impeccable/review/explore-local-validation.json) passed 11 grouped journeys with 17 captures and six control-bound checks at 320/375/768/1440 plus 320 larger-text and participation layouts. Four scoped axe surfaces had zero WCAG A/AA findings; page errors and paid Google calls were zero. Actual local APIs were exercised with controlled Google/network fixtures, including file-picker photo upload and protected reviewer retrieval. [Android transport](.impeccable/review/explore-local-native-transport.json) returned manifest/bundle HTTP 200, with case/offline-Saved/participation/SecureStore markers present and private Google/reviewer keys and server store excluded. Native-device appearance remains unverified. Final TypeScript and Expo lint exited 0 without warnings. The [visual finish review](.impeccable/review/explore-local-finish-review.json) individually inspected all 17 captures and ships only the local browser/source scope, with zero material findings. [Aggregate local gates](.impeccable/review/explore-local-gates.json) passed; final source review reapproved the hook/offline/minimum-target changes. The 40-module audit measured at most 88 lines/file and 71 lines/function; all three private service files are Git-ignored. Physical-device acceptance remains unverified. Production acceptance remains outstanding. See the [Explore audit](docs/EXPLORE_PHASE1.md).

## Earlier private pilot catalogue (before consumer Menu approval)

The original private pilot import, before menu expansion, contained 12 exact branch records, 11 menu records, 48 selected dish records, 56 source records and four held candidates across Outram/Chinatown, Rochor/Bugis and Woodlands. Each cluster has four branches and 16 selected dishes; six branch records are source-checked and six need information. All dish suitability is unconfirmed and ingredients are incomplete; none is approved for publication. No Google IDs, paid Google calls, copied media or merchant outreach were added.

The protected /local-review catalogue tab supports search, area/status filters, branch/source/menu/gap inspection, reviewer status with reasons/history, 90-day freshness, source-fingerprint invalidation and withdrawals through atomic reviewer-authorized writes. Source checks and reviewer source-reviewed status are not ingredient certification or publication approval. Consumer Explore is unchanged: menu/evidence/private-note blocks remain removed and Allium-free remains a Google keyword filter. See the [branch/status/source index](docs/PILOT_CATALOGUE.md).

Current [API checks](.impeccable/review/pilot-catalogue-api.json) passed eight groups including 21 invalid variants, with no outbound calls. [Playwright validation](.impeccable/review/pilot-catalogue-validation.json) passed six grouped journeys with 11 current recaptures and five scoped axe surfaces: zero violations, page errors, Google calls or installed-Chrome sessions. Actual read-only catalogue GET returned HTTP 200 with 12 branches/48 dishes. TypeScript and Expo lint exited 0 without warnings; source/data review approved. [Android transport](.impeccable/review/pilot-catalogue-native-transport.json) returned manifest/bundle HTTP 200; private Google/reviewer keys, server store and research JSON were excluded. The 22-module AST audit measured at most 106 lines/file and 71 lines/function; general and TypeScript source/data reviews approved. The [finish verdict](.impeccable/review/pilot-catalogue-finish-verdict.json) resolves F01 and F02 across all 11 inspected current recaptures, with no fix-introduced regression or remaining findings within its scoring-only local-web scope. Its SHIP disposition approves only those scored fixes; full-surface, physical-device/native and production acceptance are not established. Browser automation uses Playwright-managed headless Chromium, never installed desktop Chrome or a desktop profile.

## Current consumer Menu integration (15 October 2026)

Structured menu corrections now support Add, Edit and Remove, listed-dish lookup or manual entry, optional price/category, original values, removal reasons and the existing draft/offline/receipt/reviewer flow. Branch context survives topic changes and reloads; proposals do not mutate public menus. The case service remains local development only. Current source denominators, historical/partial notices and per-location gaps are in [menu coverage](docs/MENU_COVERAGE.md). Collection is also continuing through the separate 2,322-ID candidate directory; that inventory is not a completed-menu count.


The user's approved Menu composition is now integrated into consumer Explore. The public /api/menus endpoint works in production without a reviewer key. Versioned data/pilot/publication.json approves 11 menu-bearing branches, 15 source-specific menus and 732 food rows. Herbivore has no readable menu and is excluded. Counts include source overlaps and explicit variants, rather than unique currently available dishes. The server exposes sanitized branch/name/price/source/date facts with weekday and merchant-egg qualifiers, without ingredient certification, private review history, keys or copied images. Publication fingerprints automatically omit changed research data.

Matched photo cards have an independent dark Menu control with an authored open-book icon at the upper left. A full Menu CTA sits below Save/Directions/Share/Call in branch details and opens /menu/[id], with food categories, right-aligned prices, dish search, immediate source/category selection where applicable, source and checked date. Unknown prices/currency and availability/ingredient uncertainty stay visible. Existing native stack Back, Save and gallery behavior remain. Menu source opens separately on web with explicit new-tab attributes; native uses external opening with failure feedback. Owned menu matches for typed name/branch/postal remain reachable when Google is empty or unavailable, without additional filter steps. Allium-free remains the Google keyword filter, and private Home/Work behavior is unchanged.

Menus reuse a five-minute memory/network window and refresh on foreground. A bounded seven-day AsyncStorage copy provides saved/offline access with a visible warning; sources older than 90 days show recheck feedback. Withdrawals/removals take effect on refresh. Explicit --publish/--withdraw venue IDs preserve other manifest entries; production withdrawal needs the changed manifest deployed, while development also honors private local withdrawals. This selected-menu publication does not complete ingredient verification, broad menu/media rights, full offline catalogue, production identity or native-device acceptance. See the [publication/source contract](docs/PILOT_CATALOGUE.md).

Card information now has 12-unit horizontal padding, including opening hours; vertical spacing remains divider-to-hours6/bottom8. This explicit approval establishes public Menu navigation. Ingredient-evidence/private-note blocks remain removed.

The [source report](.impeccable/review/consumer-menu-source.json) passed seven groups. The [browser report](.impeccable/review/consumer-menu-validation.json) passed six grouped journeys with 18 captures (17 unique), four scoped axe surfaces with zero definite violations, and zero page errors or paid Google calls. Managed headless Chromium 156 was used, with no installed Chrome/profile. Coverage includes card shortcut/details/Menu/Back, separate source opening, retained Save/gallery, 320/375/768/1440, dark and larger text, unknown prices, weekday/egg qualifiers, saved-cache failure/Retry, withdrawal refresh, stale labels and owned-menu search during provider outage. [Android transport](.impeccable/review/consumer-menu-native-transport.json) returned manifest/bundle HTTP 200 with private Google/reviewer keys, server store and private research JSON excluded. TypeScript and Expo lint passed; final general/TypeScript source review approved after fixes. The [substitute finish review](.impeccable/review/consumer-menu-finish-review.json) ships the reviewed React Native Web/source scope: F01 is resolved, all 17 required images were individually inspected and valid, and no material fixes remain. Physical-device appearance, full-app AA and deployment acceptance remain unverified.

## Code layout

| Path | Responsibility |
| --- | --- |
| `src/app` | Expo Router routes and root layout |
| `src/screens` | Food utility, marketplace and account screen composition |
| `src/components` | Shared native controls and screen shell |
| `src/state` | Owner-scoped food/market collections, storage and preferences |
| `src/config` | Preference types, defaults and validation |
| `src/theme` | Semantic colors, typography and palette families |
| `assets` | Dumpling mascot, fictional sample imagery and prompt provenance |

All component colors reference semantic tokens. Native folders are generated by Expo and are not committed.

## Validation

```powershell
npm run typecheck
npm run lint
```

**Latest marketplace verification (15 October 2026):** [Browser validation](.impeccable/review/market-ingredients-validation.json) passed 18 checks with nine valid captures, including centered action/card spacing checks at 320/375/768/1440, ingredient editing/filtering, reload/delete, dark and enlarged-text states. Errors and scoped axe violations are zero; contrast/name incompletes remain. [State validation](.impeccable/review/market-ingredients-state.json) passed nine ingredient/publication/filter/storage checks. [Gates](.impeccable/review/market-ingredients-gates.json) record TypeScript/lint exit 0. [Android transport](.impeccable/review/market-ingredients-native.json) returned manifest/bundle HTTP 200, 8,848,271 bytes. The fresh fallback [finish review](.impeccable/review/market-ingredients-finish.json) ships only supplied browser/source scope with no material findings. Browser photos are explicitly synthetic QA fixtures, not real goods or publication evidence. Native iOS/Android appearance, camera/permissions, label-photo legibility, keyboard/gestures and VoiceOver/TalkBack remain unverified. Earlier six-card catalogue captures are historical and do not describe the current empty eligible browse feed. No new raster or backend service was added.

The historical October 13, 2026 preview was checked in Expo Go 57.0.9 on an Android API 36.1 phone emulator. Checks covered startup to login, invalid form feedback, opening the preview profile, diet changes, independent allium switches, saving, and hardware Back. Browser checks covered guest/create-profile navigation, password visibility, honest provider feedback, preference persistence after reload, profile normalization, palettes/modes, and 320px enlarged-text layouts. Browser checks found no console or page errors. The user also confirmed that the Expo Go preview works on their phone; the phone OS was not specified. Production JavaScript/Hermes bundle export passed for Android, iOS, and web. Native iOS behavior remains to be checked on an iPhone.

The first slice uses Expo SDK 57. Some SDK/tooling transitive dependencies currently have npm audit advisories without an SDK-compatible published fix. No forced major upgrades or SDK downgrades were applied. Production identity authentication and notification delivery remain unconnected; the development-only Explore service uses isolated owner capabilities.

The mascot is an AI-generated transparent raster derived from the supplied visual reference. Its exact prompt is embedded in `assets/chef.png` and recorded in `assets/provenance.json`. The fictional market atlas has its own [prompt provenance](assets/market/provenance.json) and never represents live goods or seller publication evidence.

Social walkthrough: choose **Show sample profiles**, then **Try local profile** and complete your profile with **Open to plans**. Choose 2/4/6 people including yourself, use an optional opener or write an introduction, and select **Say hi**. The fictional recipient must explicitly accept before chat opens. Agree a public place, future time and food arrangements; fill the group and confirm attendance. **My plans** holds groups, gatherings and applications. Events allows member gatherings without host approval; Classes/Home dining applications remain draft or ready, **not sent or approved**. There is no real registration, delivered chat, public event service or approval backend. See [current scope](PRODUCT.md#people-first-social-15-october-2026), [the contract](.impeccable/surfaces/social.md) and [PRD coverage](docs/PRD_COVERAGE.md).


## Optional animated avatar pilot

Me > Your avatar now provides a private four-frame portrait with blinking, gentle movement and a talking preview. The fictional sample, Save/Undo and local animation work without a key. OpenAI generation is disabled until a server-side key and an explicitly approved device are configured. See [setup and security boundaries](docs/AVATAR_SETUP.md). A production authenticated image service and live model/device acceptance remain separate gates.
