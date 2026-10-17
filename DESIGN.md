<!-- filter-cleanup-20261017 -->
**Filter cleanup, 17 October 2026:** The owner removes Category shortcuts from Cook/Market browse and all descriptive sentences from every filter screen. All choices belong under Filters; keep headings, choices, actions and functional errors only. Cook adds explicit Vegetarian/Vegan multi-selection (OR), with legacy Vegan-only recovery. Market shows Vegetarian baseline/Vegan refinement, removes duplicate No egg in favour of ingredient exclusions, moves Saved-only under Filters and resets it with the other choices. Explore removes unsupported cuisine/price controls and neutralizes legacy selections. Preserve Events, publisher4, all prior protections and retained QA accounts. Contract: `docs/FILTER_CLEANUP.md`.
<!-- end-filter-cleanup-20261017 -->

<!-- browse-controls-20261017 -->
**Browse controls, 17 October 2026:** The owner replaces the separate Cook category/actions/sort rows and large Market circles with shared two-row Cook/Social People/Market browse controls, consistent Nunito labels, outlined icons and 48-point targets. Secondary actions scroll horizontally at narrow/enlarged sizes. Categories and named sorts live in grouped filters; immediate Cook/Social choices have Done, Market keeps Apply/Cancel/Reset semantics. Preserve Local events as default and its explicit event-type row from event-discovery2. Menu footer shows one latest source date/link; 48-point chevrons sit beside the dish range. This supersedes long menu source paragraphs and text pagination buttons. See `docs/BROWSE_CONTROLS.md`; preserve backend/edge protections and retained QA accounts.
<!-- end-browse-controls-20261017 -->

**Compact place details and reviews, 17 October 2026:** The owner's latest instruction replaces the long catalogue detail page with a 176-point photo, one branch heading/address, expandable hours, one labelled Directions/Menu/Save row and header Share. Sources & credits, Private note and Suggest an update start collapsed; source qualifications and original storage/route keys remain. QuinTaste reviews add one public 1–5 rating per signed-in, age-checked account/branch, optional text, edit/delete/report, sorting and bounded pages. Show only two community reviews initially and the member's own review once. Backend: `server/place-reviews`, additive `community.place_review`; reports use the existing staff queue, restrictions/blocks and trusted-origin/session guards apply. See `docs/PLACE_REVIEWS.md` and `.impeccable/surfaces/place-details.md`.

**Explore card refinement, 17 October 2026:** The owner's latest instruction removes the separate black Opening hours/Photo details strip from catalogue gallery cards. Hours summary stays on the photograph; full schedules, attribution and licence/source links remain in place details. Upper photos stay clear. Local blurRadius2 and the semantic photoBlend dark overlay feather over 24 points, reaching full blur at the measured location-name midpoint. Preserve the 156-point clear-photo spacer and dynamic text layout. Near Home/Work/radius context uses a noninteractive, inset label with a location icon, semibold location and muted distance (12-point outer inset, 10-point internal padding, 10-point corners, accentSoft fill); do not return it to the screen edge.

**Navigation color correction, 17 October 2026:** The owner's latest instruction supersedes the persistent Market accent below. Every inactive tab, including Market, uses `theme.mutedForeground`; only the selected tab uses the palette accent, filled icon and selected lens. Implementation: `TabDock.tsx`. Explicit SVG paint ownership remains required.

---

name: QuinTaste

description: Warm food-first discovery, local pantry marketplace, private collections and cooking in an Expo preview.

colors:

  coral-background-light: "#fffaf7"

  coral-gradient-middle-light: "#fff5ef"

  coral-gradient-end-light: "#ffede4"

  coral-accent-light: "#b43829"

  coral-soft-light: "#ffebe0"

  coral-background-dark: "#29212d"

  coral-gradient-middle-dark: "#693936"

  coral-gradient-end-dark: "#382337"

  coral-accent-dark: "#ffb29f"

  coral-action-start: "#b84935"

  coral-action-end: "#a73f2e"

  cobalt-background-light: "#f5fcff"

  cobalt-gradient-middle-light: "#effaff"

  cobalt-gradient-end-light: "#e5f8fa"

  cobalt-accent-light: "#285ba7"

  cobalt-soft-light: "#e5f3fb"

  cobalt-background-dark: "#172337"

  cobalt-gradient-middle-dark: "#214863"

  cobalt-gradient-end-dark: "#173b42"

  cobalt-accent-dark: "#a9d4ff"

  cobalt-action-start: "#255faf"

  cobalt-action-end: "#247989"

  lavender-background-light: "#fdf8ff"

  lavender-gradient-middle-light: "#faf2ff"

  lavender-gradient-end-light: "#f5e9fc"

  lavender-accent-light: "#7350a7"

  lavender-soft-light: "#f0e6fa"

  lavender-background-dark: "#252039"

  lavender-gradient-middle-dark: "#443359"

  lavender-gradient-end-dark: "#33273f"

  lavender-accent-dark: "#ddc6ff"

  lavender-action-start: "#7960a4"

  lavender-action-end: "#6c558f"

  foreground-light: "#232825"

  muted-foreground-light: "#62554e"

  card-light: "#fffdfb"

  border-light: "#e8e3df"

  divider-light: "#eee8e4"

  muted-light: "#f5eeea"

  shadow-light: "#51443e"

  success-light: "#276049"

  error-light: "#a82b35"

  success-soft-light: "#eef6ef"

  warning-light: "#875509"

  warning-soft-light: "#fff4de"

  foreground-dark: "#fcfaf8"

  muted-foreground-dark: "#dbcfc9"

  card-dark: "#30272c"

  border-dark: "#685159"

  divider-dark: "#4c3b43"

  muted-dark: "#3d3037"

  shadow-dark: "#110d19"

  success-dark: "#a9e5c7"

  error-dark: "#ffc5bd"

  success-soft-dark: "#233c33"

  warning-dark: "#ffe3a8"

  warning-soft-dark: "#403525"

  action-foreground: "#ffffff"

  overlay: "rgba(24,15,28,0.58)"

  transparent: "transparent"

  coral-navigation-glass-light: "rgba(255,245,239,0.22)"

  coral-navigation-glass-dark: "rgba(48,39,44,0.64)"

  coral-navigation-strong-accent: "#642116"

  cobalt-navigation-glass-light: "rgba(239,250,255,0.22)"

  cobalt-navigation-glass-dark: "rgba(32,45,60,0.64)"

  cobalt-navigation-strong-accent: "#12365f"

  lavender-navigation-glass-light: "rgba(250,242,255,0.22)"

  lavender-navigation-glass-dark: "rgba(46,40,61,0.64)"

  lavender-navigation-strong-accent: "#422b60"

  media-surface: "#171d19"

  media-foreground: "#ffffff"

  media-muted-foreground: "#eee9df"

  media-provider-foreground: "#ffffff"

  media-control: "rgba(23,29,25,0.84)"

  navigation-border-light: "rgba(255,255,255,0.52)"

  navigation-border-dark: "rgba(252,250,248,0.28)"

  provider-foreground-light: "#1f1f1f"

  provider-foreground-dark: "#ffffff"

  media-rating: "#ffd16a"

  media-divider: "rgba(255,255,255,0.28)"

  photo-blend-start: "rgba(23,29,25,0)"

  photo-blend-middle: "rgba(23,29,25,0.18)"

  photo-blend-end: "rgba(23,29,25,0.42)"

  coral-selection-light: "#ffebe09c"

  coral-selection-dark: "#ffb29f22"

  coral-hover-light: "#ffebe088"

  coral-hover-dark: "#ffb29f15"

  coral-selection-border-light: "#b4382944"

  coral-selection-border-dark: "#ffb29f65"

  coral-selection-glow-dark: "#ffb29f42"

  cobalt-selection-light: "#e5f3fb9c"

  cobalt-selection-dark: "#a9d4ff22"

  cobalt-hover-light: "#e5f3fb88"

  cobalt-hover-dark: "#a9d4ff15"

  cobalt-selection-border-light: "#285ba744"

  cobalt-selection-border-dark: "#a9d4ff65"

  cobalt-selection-glow-dark: "#a9d4ff42"

  lavender-selection-light: "#f0e6fa9c"

  lavender-selection-dark: "#ddc6ff22"

  lavender-hover-light: "#f0e6fa88"

  lavender-hover-dark: "#ddc6ff15"

  lavender-selection-border-light: "#7350a744"

  lavender-selection-border-dark: "#ddc6ff65"

  lavender-selection-glow-dark: "#ddc6ff42"

  selection-glow-light: "rgba(255,255,255,0.84)"

typography:

  display:

    fontFamily: "Nunito_800ExtraBold"

    fontSize: "28px"

    fontWeight: 800

  title:

    fontFamily: "Nunito_800ExtraBold"

    fontSize: "23px"

    fontWeight: 800

  subtitle:

    fontFamily: "Nunito_800ExtraBold"

    fontSize: "18px"

    fontWeight: 800

  body:

    fontFamily: "Nunito_400Regular"

    fontSize: "16px"

    fontWeight: 400

  small:

    fontFamily: "Nunito_400Regular"

    fontSize: "13px"

    fontWeight: 400

  button:

    fontFamily: "Nunito_600SemiBold"

    fontSize: "16px"

    fontWeight: 600

  place:

    fontFamily: "Nunito_400Regular"

    fontSize: "18px"

    fontWeight: 400

  caption:

    fontFamily: "Nunito_400Regular"

    fontSize: "12px"

    fontWeight: 400

  cook-title:

    fontFamily: "Nunito_800ExtraBold"

    fontSize: "23px"

    fontWeight: 800

  cook-subtitle:

    fontFamily: "Nunito_800ExtraBold"

    fontSize: "18px"

    fontWeight: 800

  cook-button:

    fontFamily: "Nunito_700Bold"

    fontSize: "16px"

    fontWeight: 700

rounded:

  frame: "30px"

  card: "24px"

  button: "18px"

  choice: "19px"

  notice: "16px"

  food-card: "22px"

  food-control: "16px"

  compact-row: "12px"

  media: "14px"

  navigation: "24px 24px 0 0"

  navigation-lens: "22px"

  search: "18px"

  evidence: "9px"

spacing:

  row: "12px"

  stack: "14px"

  card: "16px"

  screen: "20px"

  section: "22px"

  compact-screen: "8px"

  compact-vertical: "16px"

  compact-top: "14px"

  compact-stack: "12px"

  control-gap: "8px"

components:

  button-primary:

    backgroundColor: "{colors.coral-action-start}"

    textColor: "{colors.action-foreground}"

    typography: "{typography.button}"

    rounded: "{rounded.button}"

  button-secondary:

    backgroundColor: "{colors.card-light}"

    textColor: "{colors.foreground-light}"

    typography: "{typography.button}"

    rounded: "{rounded.button}"

  button-link:

    backgroundColor: "{colors.transparent}"

    textColor: "{colors.coral-accent-light}"

    typography: "{typography.button}"

    rounded: "{rounded.button}"

  card:

    backgroundColor: "{colors.card-light}"

    textColor: "{colors.foreground-light}"

    rounded: "{rounded.card}"

    padding: "{spacing.card}"

  field:

    backgroundColor: "{colors.card-light}"

    textColor: "{colors.foreground-light}"

    rounded: "{rounded.card}"

  choice-selected:

    backgroundColor: "{colors.coral-soft-light}"

    textColor: "{colors.foreground-light}"

    rounded: "{rounded.choice}"

    padding: "10px 13px"

  choice-unselected:

    backgroundColor: "{colors.muted-light}"

    textColor: "{colors.foreground-light}"

    rounded: "{rounded.choice}"

    padding: "10px 13px"

  navigation-back:

    backgroundColor: "{colors.transparent}"

    textColor: "{colors.foreground-light}"

    size: "48px"

  search-field:

    backgroundColor: "{colors.card-light}"

    textColor: "{colors.foreground-light}"

    typography: "{typography.body}"

    rounded: "{rounded.search}"

    height: "54px"

  fit-badge:

    backgroundColor: "{colors.success-soft-light}"

    textColor: "{colors.success-light}"

    typography: "{typography.small}"

    rounded: "{rounded.evidence}"

    padding: "4px 7px"

  live-place-card:

    backgroundColor: "{colors.transparent}"

    textColor: "{colors.media-foreground}"

    typography: "{typography.place}"

    rounded: "{rounded.food-card}"

    width: "100%"

  photo-information:

    backgroundColor: "{colors.transparent}"

    textColor: "{colors.media-foreground}"

    typography: "{typography.caption}"

    padding: "{spacing.control-gap}"

  navigation-dock:

    backgroundColor: "{colors.coral-navigation-glass-light}"

    textColor: "{colors.foreground-light}"

    rounded: "{rounded.navigation}"

    width: "100%"

  navigation-selected-tab:

    backgroundColor: "{colors.transparent}"

    textColor: "{colors.coral-navigation-strong-accent}"

    rounded: "{rounded.button}"

    height: "56px"

  navigation-selection-lens:

    backgroundColor: "{colors.coral-selection-light}"

    textColor: "{colors.coral-navigation-strong-accent}"

    rounded: "{rounded.navigation-lens}"

    width: "68px"

    height: "44px"

---



# Design System: QuinTaste



## Storage recovery and timer status (15 October 2026)



Oversized readable collections expose one **Manage storage** action. Storage uses compact checkbox rows grouped by recipe/listing, a prospective size indicator and one **Remove selected photos** action. Selection alone never deletes data; the action stays disabled until the whole collection fits. Keep the recovery warning out of the cleanup screen itself. Retain text and unselected photos; affected listings return to drafts. Use existing theme tokens and minimum 48-unit targets.



Android API 31+ timer controls disclose unverified exact timing before **Enable approximate alerts**, retain **Approximate alerts on** afterward, and offer **Alarms & reminders**. This functional limitation must remain visible even under the compact-copy direction. Private Saved Notes use their recipe name and return through the private recipe route.



## Overview



**Creative North Star: "Coral & Peach"**



QuinTaste inherits the supplied UI/UX PDF: pale peach backgrounds, charcoal text, rounded near-white cards, heavy Nunito headings and a smiling dumpling chef. The visual language is warm and welcoming while discovery, local pantry marketplace, private collections, cooking and account screens prioritize food, clear choices and native navigation.



Coral & Peach is the default family. Cobalt & Turquoise and Lavender & Frost reuse the same components, geometry and semantic roles. Extend this system from the shipped tokens and components rather than creating another visual identity.



**Last updated:** 2026-10-15. Extracted from [tokens](src/theme/tokens.ts), [shared UI](src/components/ui.tsx), [screen layout](src/components/Screen.tsx) and [preference controls](src/components/PreferenceControls.tsx), [food controls](src/components/food/Controls.tsx), [food cards](src/components/food/FoodCard.tsx) and [evidence](src/components/food/Evidence.tsx), [live venue cards](src/components/discovery/LivePlaceCard.tsx) and [native maps](src/components/discovery/LiveMap.native.tsx), [map results](src/components/discovery/MapResultsSheet.tsx), [live details](src/screens/food/LivePlaceDetail.tsx), [photos](src/components/discovery/GooglePhoto.tsx) and [reviews](src/components/discovery/GoogleReview.tsx), [photo viewer](src/components/discovery/GooglePhotoViewer.tsx), [tab dock](src/components/navigation/TabDock.tsx), [focused-scene backdrop](src/components/navigation/GlassNavigation.tsx) and [custom icons](src/components/navigation/QuinTasteIcon.tsx), [raster backdrop](src/components/discovery/GooglePhotoBackdrop.tsx), [photo lifetime](src/hooks/usePhotoData.ts) and [feather masks](src/components/discovery/PhotoBlend.native.tsx), [location search](src/components/discovery/LocationSearchField.tsx) and [suggestions](src/components/discovery/LocationSuggestions.tsx), [compact Filters](src/components/discovery/DiscoveryFilterOptions.tsx), [diet icons](src/components/food/DietIcon.tsx), [compact information](src/components/discovery/LivePlaceInformation.tsx) and [private address editor](src/components/food/PrivatePlaceForm.tsx). Product/data boundaries live in [PRODUCT.md](PRODUCT.md) and [LIVE_DISCOVERY.md](docs/LIVE_DISCOVERY.md); discovery composition lives in [its surface brief](.impeccable/surfaces/discovery.md). Marketplace patterns come from [Market](src/screens/market/Market.tsx), [listing cards](src/components/market/ListingCard.tsx), [photo slots](src/components/market/ListingPhotos.tsx), [delete confirmation](src/components/market/ListingDelete.tsx) and [pickup controls](src/components/market/ExchangeControls.tsx), with composition and scope in [the market contract](.impeccable/surfaces/market.md). These source files are authoritative when this extracted record drifts.



**Key Characteristics:**



- Soft food-inspired color and a transparent raster dumpling chef.

- Heavy rounded headings above readable, scalable body text.

- Near-white cards with full perimeter edges and quiet shadows.

- Compact task controls and progressive disclosure, with readable evidence and private-save feedback.

- Immediate appearance previews with deliberate local saves.



Current source follows the latest [user override](AGENTS.md): White Nunito 18/12 text sits directly on the real photo, with a raster blurRadius2 beginning at the measured place-name midpoint and a 24-unit feather. A separate low-alpha photo gradient reaches the measured name region; no pale information panel is rendered. Landscape cards use a 116-unit clear-photo spacer above measured information, preserving 12-unit horizontal padding, 8-unit top padding, 2-unit bottom padding and 2-unit gaps, whole-card photo, blurRadius2/24-unit feather and Save48 and source24 visible targets (native hitSlop10v/4h is parent-bounded) and photo-tap access in the gallery. Every name, address, distance, rating, hours and provider line is single-line with tail ellipsis; full raw name/address remain in the parent accessible label and details. No Allium status appears visually or in card accessibility text. The current 375-wide card is about 223 units tall, not a height cap. Google Maps is an independent target in the inline hours/footer row with gap8 and a full-width hairline divider. Failed-photo icon/text are centered below the control lane at top60 and truncate to one line. The icon-only dock keeps accessible names, a 56-unit interaction row and a responsive themed selection/hover lens capped at 68×44 with a persistent 1.5-unit selected-foreground border and fill. Explore uses 4-unit horizontal content padding; other screens retain 8.



**Local marketplace — latest 15 October 2026:** [Browser validation](.impeccable/review/market-ingredients-validation.json) passed 18 checks with nine valid captures, including centered action/card spacing checks at 320/375/768/1440, ingredient editing/filtering, reload/delete, dark and enlarged-text states. Errors and scoped axe violations are zero; contrast/name incompletes remain. [State validation](.impeccable/review/market-ingredients-state.json) passed nine ingredient/publication/filter/storage checks. [Gates](.impeccable/review/market-ingredients-gates.json) record TypeScript/lint exit 0. [Android transport](.impeccable/review/market-ingredients-native.json) returned manifest/bundle HTTP 200, 8,848,271 bytes. The fresh fallback [finish review](.impeccable/review/market-ingredients-finish.json) ships only supplied browser/source scope with no material findings. Browser photos are explicitly synthetic QA fixtures, not real goods or publication evidence. Native iOS/Android appearance, camera/permissions, label-photo legibility, keyboard/gestures and VoiceOver/TalkBack remain unverified. Earlier six-card catalogue captures are historical and do not describe the current empty eligible browse feed. No new raster or backend service was added.



**Latest footer/gallery correction — 15 October 2026:** [Current validation](.impeccable/review/card-spacing-validation.json) passed15 checks/15 captures with zero page errors or actual Google requests. Six layouts at320/375/414/768/1440 and375dark measured divider→hours6px,hours→bottom8px,card223px and computedblur2px. Source/Save/navigation,24-unit gallery pagination,swipe/keyboard/full-viewer credits,compact feedback and the View review URI passed; the removed gallery credit row and standalone Maps label are absent. [Final gates](.impeccable/review/card-spacing-gates.json) record TypeScript/lint/diff exit0 (CRLF warnings only) and source review with zero material issues. [Native transport](.impeccable/review/card-spacing-native-transport.json) returned HTTP200,8,848,267bytes with compact-card/short-review/gallery/feedback/divider source; private key/server snapshot code are absent. These are web/source and transport checks; native appearance and full-app AA remain unverified. Backend cache/token/fresh-metadata proofs are unchanged.



**Earlier card/gallery UI proof (backend cache checks retained) — 15 October 2026:** [Source validation](.impeccable/review/photo-600-source-validation.json) passed 22 checks without actual Google calls, including token tamper/expiry/cross-place rejection, fresh-metadata snapshot/credit preservation, production cache disablement and concurrent599→600 quota reservation. [Fresh snapshot acceptance](.impeccable/review/photo-600-fresh-snapshot-validation.json) passed three live checks: usage523→524 for the first three photos, then524 after fresh Google metadata and browser/reload, with23 stored photos. [Current live capture](.impeccable/review/photo-600-live-final-375.png) records the state. Code review approved the resolved temporary-file regex and independent Google Maps accessibility target. [Final gates](.impeccable/review/photo-600-gates.json) are verified-local-web-and-server: TypeScript, lint and git diff checks exit0 (line-ending warnings only), with source review approved and zero material open findings. [UI validation](.impeccable/review/clean-detail-validation.json) passed20 checks across15 retained captures at320/375/768/1440 in light/dark, with zero page errors. Gallery selection/keyboard/credits/full-viewer reuse, Saved, Share, feedback forms and no-photo fallback passed. Scoped card/gallery axe found zero definite violations; card contrast/name and gallery contrast remain incomplete, so no full AA claim is made. [Final Android transport](.impeccable/review/clean-detail-native-transport.json) returned bundle HTTP200,8,832,488bytes, gallery/feedback/divider present, server snapshot code and private key absent. Native device appearance remains unverified. Observed photo usage is524/600 with23 saved snapshots and no ledger reset. The earlier four same-reference checks are historical and do not establish fresh-metadata reuse. No native appearance/full-app AA/production release approval is claimed.



Current place cards use blurRadius2 with a 24-unit feather beginning at the measured name midpoint and photoBlend alpha0/.18/.42. Name/address/distance/rating/hours remain single-line with tail ellipsis. The navigation button is absolute-fill and accessible; Google Maps is a separate inline footer target beside hours with gap8. A full-width 1px/hairline theme.mediaDivider sits above that footer. There is no zoom icon. The 375-wide layout is about 223 units tall with 4-unit side gutters; this is an observed size, not a fixed height. Live place details use a horizontal paging GooglePhotoGallery: only visible/visited photos load, dots show 1/N, and swipe, keyboard and native adjustable actions select photos. Tapping a photo opens the existing viewer; no zoom icon or Photo N selection buttons remain. The compact author/source row below the gallery is removed; matching credits remain in the full-screen exact-photo viewer. Explanatory paragraphs (including Share), ingredient-evidence/Ask-the-stall blocks and private notes remain removed from live place details. Approved Menu entries now open their separate selected-item page below the primary actions. Save, Directions, Share, Call, hours, website and reviews remain. Equal adjacent bordered icon-and-label Correction and Report concern controls are 52 units tall and open the existing forms. Sample/cooking ingredient evidence and other private collection data remain separate. Detail hours/rating use a single compact shrinking/ellipsized row at narrow widths. The gallery retains native accessibilityValue and uses targeted web ARIA range props for React Native Web.



**Earlier resource-keyed development photo storage — 15 October 2026:** [Source validation](.impeccable/review/photo-600-source-validation.json) passed 14 checks. [Live validation](.impeccable/review/photo-600-live-validation.json) passed four checks with three actual Google photos decoded, zero page errors and zero additional Google calls on repeat/reload. Observed usage moved 507→508→508→510→510, without a reset, and 10 images were stored. [Live capture](.impeccable/review/photo-600-live-375.png) records the 375-wide state. Final TypeScript/lint gates are pending. The corrected source was covered by the edit and 14 checks; the final independent reread was sandbox-blocked, so no fresh final-review approval is claimed. Native appearance/full-app AA and production release remain unverified.



Development photo storage still requires NODE_ENV === 'development' and the ignored private developmentPhotoCache:true flag; production disables reads and writes. Ignored .local/dev-place-photos uses SHA256(identity+'|maxWidthPx=800') filenames. Legacy raw identities are resource names; stable snapshot identities are place/<placeId>/photos/<0-2>. Headers retain type, savedAt, original photo author/sourceUri credits and assetHash (SHA256 of the original resource name), without raw Google resource names or API keys. Fresh Google venue metadata uses a saved same-slot snapshot with its matching credits/digest rather than assuming Google photo references remain stable. Validated five-minute HMAC URLs pin stable identity, digest, snapshot flag and matching credits, with optional bounded compressed long-credit payloads. An expired, missing or version-mismatched pinned snapshot rejects and requires refreshed metadata; a different image is never served under old credits. Freshness remains 24 hours with read rejection/deletion and next-write pruning; bounds remain 5MiB/image, 64MiB total and 100 entries. Atomic writes and per-process serialized pruning remove actual <hash>.image.<uuid>.tmp orphans older than 60 seconds and count recent temporary bytes. Only requested photos are stored; there is no bulk prefetch, ledger reset or production storage permission. Google's standard [photo-name guidance](https://developers.google.com/maps/documentation/places/web-service/place-photos) and [Places caching restrictions](https://developers.google.com/maps/documentation/places/web-service/policies) still apply. The user explicitly requested development disk storage; development is not a provider licensing exemption.



**Earlier labels-only Filters/photo transfer — 15 October 2026:** [Playwright validation](.impeccable/review/photo-reuse-validation.json) passed 17 checks with six captures at 320/375/dark/768/1440, zero page errors or scoped axe violations and color-contrast incomplete. Only three of 20 initial cards requested photos; opening the active photo viewer added zero, scrolling reached eight total, and return/Filters added zero. Filters remain functional. The restored [pre-change baseline](.impeccable/review/photo-requests-before.json) records 20 initial requests and 21 after opening the viewer. [Helper validation](.impeccable/review/photo-reuse-source-validation.json) passed ten groups for sharing, releases/cancel, expiry, MIME/5MiB/decode failures and 503 cooldown. Final TypeScript and lint exit 0; source review found no material issue. [Current native transport](.impeccable/review/photo-reuse-native-transport.json) returned manifest/bundle HTTP 200 (8,815,781 bytes), current shared/lazy/labels-only paths included and the private Google key excluded. [Final gates](.impeccable/review/photo-reuse-gates.json) record TypeScript/lint exit 0, source review approval with zero findings and 12 scoped files (maximum 165 lines/file, 44/function). The photo allowance remains 500/500 with no reset or increase; native appearance, full-app AA and live-photo-image approval remain outstanding.



PhotoScrollView still defers unviewed cards. Client clear/blur, viewer, detail and Saved consumers share active URL-plus-original-metadata-expiry bytes, release after the final consumer or original five-minute expiry, retain the 20-second timeout/60-second 429-or-503 cooldown, and use no-store/cachePolicy none. Client metadata and HMAC photo tokens still expire after five minutes; the development server cache does not extend them. Development photo storage still requires NODE_ENV === 'development' and the ignored private developmentPhotoCache:true flag; production disables reads and writes. Ignored .local/dev-place-photos uses SHA256(identity+'|maxWidthPx=800') filenames. Legacy raw identities are resource names; stable snapshot identities are place/<placeId>/photos/<0-2>. Headers retain type, savedAt, original photo author/sourceUri credits and assetHash (SHA256 of the original resource name), without raw Google resource names or API keys. Fresh Google venue metadata uses a saved same-slot snapshot with its matching credits/digest rather than assuming Google photo references remain stable. Validated five-minute HMAC URLs pin stable identity, digest, snapshot flag and matching credits, with optional bounded compressed long-credit payloads. An expired, missing or version-mismatched pinned snapshot rejects and requires refreshed metadata; a different image is never served under old credits. Freshness remains 24 hours with read rejection/deletion and next-write pruning; bounds remain 5MiB/image, 64MiB total and 100 entries. Atomic writes and per-process serialized pruning remove actual <hash>.image.<uuid>.tmp orphans older than 60 seconds and count recent temporary bytes. Only requested photos are stored; there is no bulk prefetch, ledger reset or production storage permission. Google's standard [photo-name guidance](https://developers.google.com/maps/documentation/places/web-service/place-photos) and [Places caching restrictions](https://developers.google.com/maps/documentation/places/web-service/policies) still apply. The user explicitly requested development disk storage; development is not a provider licensing exemption.



**Earlier Google Maps/card alignment — 15 October 2026:** [Playwright alignment checks](.impeccable/review/maps-card-validation.json) passed 20 checks with eight controlled captures (320/375/dark/768/1440 and Filters 320/375/768), zero errors/scoped axe violations and contrast/name incompletes. [Source checks](.impeccable/review/maps-card-source-validation.json) passed 13 helper groups; [provider checks](.impeccable/review/maps-card-provider-validation.json) returned two fresh, capped HTTP 200 Allium keyword responses with 20 results each. [Live metadata checks](.impeccable/review/maps-card-live-validation.json) used actual Google metadata (HTTP 200, 20 results, first three displayed in Playwright); no photos loaded and three photo requests returned 503 at the allowance cap. Live 375/1440 captures verify fallback alignment. [Size audit](.impeccable/review/maps-card-size-audit.json): 17 files, maximum 164 lines/file and 49/function, no violations. [Gates](.impeccable/review/maps-card-gates.json): final TypeScript/lint exit 0. [Android transport](.impeccable/review/maps-card-native-transport.json): manifest/bundle HTTP 200, 8,810,492 bytes, current source included, private key excluded; native appearance unverified. The [final finish verdict](.impeccable/review/maps-card-finish-verdict.md) ships only the two scored overlap/Current-search fixes, resolved across ten valid recaptures without a new visible regression. Earlier [review](.impeccable/review/maps-card-finish-review.md) findings remain history. This does not approve full native fidelity, full-app AA or live photo imagery.



**Earlier immediate filters and compact cards — 15 October 2026:** The [browser report](.impeccable/review/instant-validation.json) passed 21 controlled interaction/responsive checks, with zero failures, runtime errors or scoped axe violations; contrast/name incompletes remain. [Allium validation](.impeccable/review/instant-allium-validation.json) covers free, garlic, unknown, withdrawn and stale evidence with a process-only fixture. [Provider validation](.impeccable/review/instant-provider-validation.json) returned fresh HTTP 200 responses for both diets, each capped at 20 results. [Gates](.impeccable/review/instant-gates.json) record TypeScript/lint exit 0, five-file 21st review with zero findings and the same-mode text finding resolved. The [size audit](.impeccable/review/instant-size-audit.json) covers 19 files, maximum 118 lines/file and 95/function, without violations. [Android transport](.impeccable/review/instant-native-transport.json) returned manifest/bundle HTTP 200 (8,687,995 bytes), current feature inclusion and no private Google key. The independent [finish review](.impeccable/review/instant-finish-review.md) gives **ship only within supplied web renders and native code review scope**. The 320/375/768/1440 captures use controlled venue/photo fixtures, not production Google photos. Native device appearance/permissions, full-app AA and production acceptance remain outstanding.



**Earlier Filters and private addresses — 15 October 2026:** The [main web report](.impeccable/review/filters-private-validation.json) passed 20 checks with four Filters widths (320/375/768/1440), a corrected private-editor capture and missing-Work recovery capture. The [focused GPS report](.impeccable/review/filters-private-gps-validation.json) passed three additional checks. Runtime errors and scoped axe violations are zero; contrast/name incompletes remain. Final TypeScript/lint passed, four helper assertions passed, three editor review findings were resolved and 21st review of five UI files returned zero findings. [Android transport](.impeccable/review/filters-private-native-transport.json) returned manifest/bundle HTTP 200 (8,678,618 bytes), includes the current feature paths and excludes the private Google key. The [finish verdict](.impeccable/review/filters-private-finish-verdict.json) finds no material issue at reviewed web scope. Native device visuals/permissions, full-app AA and production services remain unverified; the count backend stays gated.



**Earlier location search — 15 October 2026:** The final [browser report](.impeccable/review/location-search-validation.json) passed 16 functional/API/responsive checks at 320/375/768/1440 widths with zero runtime errors and zero scoped axe violations; contrast and label-name incompletes remain. The [state-flow report](.impeccable/review/location-search-state-validation.json) passed four additional checks for display synchronization after location changes, retained selection, preserved unsubmitted text and cancellation of a blurred delayed submit. The [finish verdict](.impeccable/review/location-search-finish-verdict.json) approves the web field/dropdown, including visible keyboard highlights and explicit selected options. Fresh TypeScript/lint passed and 21st review returned zero findings across five UI files. [Android transport](.impeccable/review/location-search-native-transport.json) is HTTP 200 for the manifest and 8,659,881-byte current field/API bundle, with the private Google key excluded. Native device captures and full-app AA remain unverified.



Earlier photo/dock verification (14 October 2026):



Final TypeScript and Expo lint passed with exit 0 and no warnings. Canonical [Playwright](.impeccable/review/photo-dock-playwright.json) passed 23 checks with six current screenshots: 375×812 light/dark, 768×1024 light and 1440×900 light, plus hover and decoded exact-photo viewer. Runtime/console/network errors are zero. Three initial photo cards make three shared proxy downloads; pressed opacity remains 1 with perimeter feedback. Entry/fresh-return/expiry requests are 1/0/1 and unchanged search routes add zero requests. Scoped axe has zero violations but contrast and label-name incompletes; no full AA/native claim. Final Android manifest/bundle HTTP 200, 8,635,670 bytes, current origin/raster/lens source and private key/name exclusion are recorded. Current LAN is exp://192.168.1.5:8083, CI server5816 without hot reload. Native finish remains **recapture** because four current phone/tablet Android/iOS captures are unavailable. Current evidence is recorded in [validation](.impeccable/review/photo-dock-validation.json), [Playwright](.impeccable/review/photo-dock-playwright.json) and [finish verdict](.impeccable/review/photo-dock-finish-verdict.json). Earlier accepted scope remains historical; these source docs do not approve a release.



Historical [food-utility validation](.impeccable/review/food-utility-validation.json), [food-utility verdict](.impeccable/review/food-utility-finish-verdict.json), [Android access QA](.impeccable/review/android-qa.json), [browser access QA](.impeccable/review/browser-qa.json) and [earlier access verdict](.impeccable/review/finish-verdict.json) retain their narrower scope. They do not validate live discovery or the current palette. No push or deployment is authorized.



## Colors



The 14 October 2026 palette refresh follows the supplied Coral–Peach Light, Cobalt–Turquoise Light and Lavender–Frost Light screenshot. A richer `backdrop` frames a much paler inner screen gradient. Supporting text, borders, cards and muted controls now use family-specific surfaces in both modes. Shared neutral values in the frontmatter describe the default Coral family; runtime tokens contain the Cobalt and Lavender overrides. Historical contrast measurements describe the 13 October baseline. Current scoped web scans retain contrast/name incompletes; rendered-device acceptance remains outstanding.



The frontmatter records the implemented palette values; colors below describe their roles. Light/Dark/System is independent of palette selection.



### Primary



Coral actions use the two `coral-action` stops. The darker `coral-accent-light` supports links, selection outlines and icons; it is distinct from the brighter action gradient. Cobalt and Lavender map the same roles to their own family.



Media roles keep venue text/icons white directly over photos, with functional rating color and a quiet divider. The transparent photoBlend stops support the dark fade; photo-glass panel tokens are removed. Navigation retains family tint and icon foreground/accent roles; restrained selection/hover fills use semantic tokens. Earlier selection-edge/highlight tokens remain legacy values; the current dock retains selection fill and a 1.5-unit border using navigation.selectedForeground. Keyboard focus has a separate outer 2-unit perimeter; pointer/touch activation does not leave that web focus-visible outline.



### Neutral



`foreground` is charcoal in light mode and warm ivory in dark mode. `muted-foreground` is the supporting text color. `card`, `border`, `divider` and `muted` provide opaque surfaces, complete edges, separators and quiet unselected controls. `success`, `warning` and `error` carry functional feedback. Soft success/warning fills support the labelled fit badges; Unknown uses the muted fill and a dashed full perimeter.



Background gradients run through each family's background, middle and end tokens. Dark mode replaces those stops, card surfaces and text roles; it is not an opacity overlay on light mode.



**The Semantic Color Rule.** Read colors from themeFor; component styles use semantic theme roles in every palette and display mode.



The historical [post-fix measurement](.impeccable/review/accessibility-fix-check.json) records a worst sampled light support-text ratio of 5.21:1 and sampled coral accent/card ratio of 5.50:1 for the earlier access baseline. Preserve it as bounded history; fresh native palette/accessibility measurement remains outstanding.



## Typography



Nunito is loaded in [the root layout](src/app/_layout.tsx). The frontmatter preserves the actual Expo font-family names and base scale: display/title/subtitle are ExtraBold, button labels are Bold, and ordinary body/small text are Regular. Shared bold labels use the Bold family. Compact screen headings use the subtitle role; the title role remains for larger headings such as guided step titles.



Dimensions in the frontmatter and sidecar are CSS projections of React Native logical units at the base scale. Runtime text follows device scaling; the optional Large and Larger choices multiply the base scale by 1.15 and 1.3. Place and caption add compact 18/12 base roles. Their default family is Regular; venue names explicitly apply the shared Bold family. Live card names and addresses use one line with tail ellipsis; their full raw text remains in the parent accessible label and details. Other content retains flexible wrapping. No line-height or tracking scale is defined.



**The Readable Heading Rule.** Keep enlarged headings flexible and allow wrapping; the shared title uses minWidth: 0 and flexShrink: 1.



Cook uses the scoped [CompactUI type scale](src/components/ui-density.tsx): title23, subtitle18, body16, small13 and button16, scaled by the existing text preference. Guided instructions use 20-unit text with 29-unit line height. These Cook overrides retain Nunito and do not replace other screens' type scales.



## Layout



Use [Screen](src/components/Screen.tsx): safe areas, a centered full-width frame capped at 760 logical units, an inner scrolling column and keyboard avoidance on iOS. Map uses the fill variant with a flex stage instead of nesting its viewport in that scrolling column. Native screens use square, borderless outer frames; the browser preview retains the rounded frame and narrow outer inset. Compact layout is the default: 8-unit horizontal inset, 16-unit vertical content padding, 14-unit top padding and outer gap, and 12-unit child stacks. The alternate roomy layout retains a 20-unit inset and 22-unit top/outer gap. Footers remain in the scroll flow. On tab routes Screen owns top/side safe areas; the absolute dock owns the bottom inset. Screen measures dock and feedback heights and reserves bottom content space, placing timer/storage/notices above the dock. Native and narrow web frames have square borderless outer edges. The dock fills its available width up to the 760-unit frame limit and reaches the bottom, with curved top corners only, no opaque host, no top padding and a minimum 2-unit bottom inset. Five equal icon-only tabs have minimum 48-unit width and 56-unit row height, with 30-unit icons and 2.2-unit strokes. Selected silhouettes are filled. The dock adds its border and bottom safe-area inset. Each responsive visual lens, capped at 68×44 units with a 22-unit radius and a persistent 1.5-unit selected-foreground border over the selection fill, sits within its interaction target, the dock hides for keyboard entry. Active-root reselection uses the public Expo Router scroll-to-top adapter and respects reduced motion. No general breakpoint scale is defined. Discovery uses its observed 600-unit threshold for a map/results two-pane layout. Below it, the controlled sheet uses a 104-unit peek, a half state capped at 360 units or 58% of stage height, and a full-height result state. Recenter and Search this map area stay explicit; panning does not request data.



Back, close, save, Me and icon controls retain 48-unit interaction targets. The location search field is at least 54 units tall with 48-unit search/clear controls; suggestion rows are at least 56 tall in a dropdown capped at 260 units. Other choices are at least 48 tall, rows 54, buttons 54 and form fields 72. Content and labels determine final height; choices and suggestions wrap. The earlier enlarged-heading correction was measured at 320px in a browser; current phone/tablet native layout and enlarged-text acceptance still require captures.



**The Compact Flow Rule.** Keep one free-text Place or postal code field with suggestions after typing, followed by Filters and the Search by my location crosshair in Explore’s single row. Keep Me on Cook/Social/Market/Game, diet choices inside Filters and root headings titleless; use 4-unit Explore content insets and 8-unit insets on other screens and retain 48-unit interaction targets.



Marketplace layout follows the user's Carousell screenshot within the existing compact shell. The titleless Market root opens directly to browsing with search, Inbox and Me, circular fictional-photo categories, a Saved heart and Newest/Lowest first/Highest first sort cycle. Filters and My Listing stay together on the same row. My Listing opens /market/my-listings with Back, search, Inbox and All/Active/Reserved/Draft/Paused/Sold/Unavailable chips. Creation is available only through the centered 48-unit neutral rounded-square floating + on My Listing, above the dock and measured feedback with a 12-unit offset and 72-unit extra scroll clearance; it hides for the native keyboard. Control groups retain an 8-unit gap; counts appear only when filtered or on My Listing. The Buy/Sell selector and Preview badge are removed without an information-badge replacement. The grid uses 12-unit column and 20-unit row gaps: two columns by default, three at viewport width 900 or greater, and one when app text multiplier times OS font scale is at least 1.3. Borderless resting cards use square rounded photos, Sealed or owner-status overlays, 20-unit prices, names capped at two lines without reserved blank height, public pickup areas and full date marks. A full semantic focus perimeter and separate Save/Manage targets remain. Preserve meaningful item names, form labels, validation and concise confirmation consequences. The [market surface contract](.impeccable/surfaces/market.md) owns this task composition. Metadata retains 2-unit gaps while removing the reserved two-line name height. Ingredients to avoid uses the same compact choices as the editor; default browse now shows the empty state because all six fictional samples lack reviewed ingredient evidence.



Private avatar inspection reuses the compact Screen and native Back to Me. Its square portrait fits the available width up to 320 logical units, stays centered in an accentSoft stage with 16-unit corners, and uses contain rendering to preserve the transparent silhouette. Motion controls wrap beneath the portrait; Save follows them. Photo selection and provider consent occupy separate shared cards lower in the same scroll flow. See [the avatar surface contract](.impeccable/surfaces/avatar.md).



## Elevation & Depth



Cards combine an opaque, near-white surface with a subtle full perimeter edge and a quiet shadow. The source uses shadow offset (0, 4), opacity 0.04, radius 14 and Android elevation 1; dark mode changes the shadow color. Keep this treatment subordinate to content and preserve native rendering differences. A live card measures its name and information region. Clear/blurRadius2 raster photos share the same data URI, aligned to the full image; softening starts at the measured name midpoint and feathers over 24 units. PhotoBlend masks the raster and transparent gradient separately; it does not blur UI or use UIVisualEffect/backdrop for the photo. The gradient uses clear/.18/.42 opacity and the measured name region; the photo mask accounts for the 8-unit information inset. White text remains above both image layers. Missing photos use the media surface and Photo unavailable. The navigation dock blurs the currently focused scene at intensity 70; iOS Reduce Transparency selects an opaque fallback, including a failed preference read. Native rendering/accessibility still needs acceptance.



## Shapes



Use the rounded frame, card, button, choice and notice shapes recorded above. Sample food cards and hero images use the food-card radius; food chips, ordinary icon controls, directory rows and map containers use the food-control radius. Live photo cards use the 22-unit food-card radius; their 2-unit focus edge is a full perimeter. The dock uses 24-unit top corners and square bottom corners, with 18-unit tab focus shapes; circular media controls reuse the card radius. Live branch action controls use the 12-unit compact-row radius; provider photo/review panels use the 14-unit media radius. Evidence badges use the compact evidence radius. Palette swatches are circular (28 logical units, radius 14). The startup orb is a soft circle behind the existing raster chef.



**The Perimeter Rule.** Use complete component borders. Directional accent rails are forbidden; full-width functional dividers remain allowed.



## Components



| Pattern | Shipped source | Appearance and behavior |

| --- | --- | --- |

| Text | [T](src/components/ui.tsx) | Semantic text color, shared scale and the active enlargement multiplier. |

| Buttons | [Button](src/components/ui.tsx) | Primary gradient, milky secondary and accent link variants; full focus perimeter, pressed opacity, disabled/busy semantics and a loading indicator. The scalar primary frontmatter color is its first gradient stop. |

| Consumer Menu | [MenuEntry](src/components/discovery/MenuEntry.tsx), [MenuSection](src/components/discovery/MenuSection.tsx), [MenuSourceLink](src/components/discovery/MenuSourceLink.tsx), [Menu](src/screens/food/Menu.tsx) | Reuse existing semantic action/card/accent/divider tokens and Nunito: compact dark upper-left48 Menu control with authored open-book icon,52 detail CTA, category-grouped dish rows/right-aligned prices, dish/source/category lookup and separate48 source link; native Back and platform-adapted source opening. |

| Cards and fields | [Card / Field](src/components/ui.tsx) | Rounded milky cards; a visible field label, semantic placeholder, accent focus border and error border/message. Web inputs suppress the browser’s inner automatic outline and use a rounded 2-unit semantic accent perimeter on the Field, including while invalid. Web inputs suppress the browser’s inner automatic outline and use a rounded 2-unit semantic accent perimeter on the Field, including while invalid. |

| Choices | [Choices](src/components/PreferenceControls.tsx) | Wrapping radio choices; a selected full outline, soft fill and checkmark. Display mode, diet and text size use this pattern. |

| Preference rows | [Row / Appearance](src/components/PreferenceControls.tsx) | Native independent switches or chevron navigation; named gradient palette swatches and a separate mode group. |

| Navigation and notices | [Screen](src/components/Screen.tsx) | Native back with startup fallback, dismissible notices, save/error announcements and storage-load Retry. |

| Chef | [Welcome](src/screens/Welcome.tsx), [AuthParts](src/screens/AuthParts.tsx) | Reuse [chef.png](assets/chef.png), with faithful PDF-derived raster provenance and the exact generation prompt in [provenance.json](assets/provenance.json). |

| Preview and save feedback | [Auth](src/screens/Auth.tsx), [Settings](src/screens/Settings.tsx), [Preferences](src/state/Preferences.tsx) | Auth validates a local preview form; provider buttons explain their disconnected state. Appearance previews immediately. Save writes profile/preferences to this device; a failed save retains the draft. |



Consumer Menu reuses Nunito and the existing semantic card, accent, action-gradient, divider and foreground tokens. The upper-left compact Menu control has a 48-unit minimum target, 16-unit outer radius, 13-unit visible-label radius and full focus perimeter; the detail CTA below the primary actions has a 52-unit minimum target and 16-unit radius. The separate Menu screen uses a 16-unit horizontal inset, flat item rows with a 50-unit minimum and 12-unit vertical padding, right-aligned tabular prices capped at 43% width, and 48-unit source links. Existing native Back and platform-adapted external-source behavior remain. Card information, including hours, now has 12-unit horizontal padding; top8/bottom2, divider-to-hours6 and hours-to-bottom8 remain. No new identity, token palette or CSS-detector pass is introduced.



Food discovery extends the same system. Place-card footer and inline Google Maps source have 24-unit visible height. The link uses native hitSlop10 vertically/4 horizontally, bounded by its parent; this does not guarantee a 44-unit target. Save remains48 and Maps stays an independent link beside hours. Information padding is 12 horizontally, 8 at the top and 2 at the bottom, with no116-unit minimum panel height. The clear-photo spacer is116; the observed375-wide card remains about223 units tall with4-unit side gutters. Divider linebox→hours is6px and hours linebox→card bottom is8px in the initial320/375/414/768/1440 measurements; all rows stay single-line. Raster blurRadius2,24-unit feather/midpoint start and photoBlend alpha0/.18/.42 are current; there is no zoom icon. GooglePhotoGallery removes its compact author/source row and uses24-unit pagination. The full-screen exact-photo viewer retains matching original credits. Live place details omit the standalone Google Maps word above feedback; their fallback link is labelled Open map. GoogleReview source actions are labelled View review and retain the same URI. Gallery paging/photo-tap access, existing actions/forms, and development snapshot/credit validation remain. Current place cards use blurRadius2 with a 24-unit feather beginning at the measured name midpoint and photoBlend alpha0/.18/.42. Name/address/distance/rating/hours remain single-line with tail ellipsis. The navigation button is absolute-fill and accessible; Google Maps is a separate inline footer target beside hours with gap8. A full-width 1px/hairline theme.mediaDivider sits above that footer. There is no zoom icon. The 375-wide layout is about 223 units tall with 4-unit side gutters; this is an observed size, not a fixed height. Live place details use a horizontal paging GooglePhotoGallery: only visible/visited photos load, dots show 1/N, and swipe, keyboard and native adjustable actions select photos. Tapping a photo opens the existing viewer; no zoom icon or Photo N selection buttons remain. The compact author/source row below the gallery is removed; matching credits remain in the full-screen exact-photo viewer. Explanatory paragraphs (including Share), ingredient-evidence/Ask-the-stall blocks and private notes remain removed from live place details. Approved Menu entries now open their separate selected-item page below the primary actions. Save, Directions, Share, Call, hours, website and reviews remain. Equal adjacent bordered icon-and-label Correction and Report concern controls are 52 units tall and open the existing forms. Sample/cooking ingredient evidence and other private collection data remain separate. Detail hours/rating use a single compact shrinking/ellipsized row at narrow widths. The gallery retains native accessibilityValue and uses targeted web ARIA range props for React Native Web. Filters renders only section headers and control labels: Diet, Vegetarian, Vegan, Allium-free, Cuisine, Price, Saved only, Search around and Distance. No Allium caption, diet legend, Google explanation or Home/Work help paragraph is shown. The Allium-free row has a 48-unit minimum target (observed 50). Auto-save/apply, private-address setup and functional loading/error/Retry states remain. Allium-free uses Google Maps keyword matches, not per-location ingredient storage. Saved noAlliums supplies optional validated DiscoverySearch.alliumFree; true requests Google Text Search with 'no onion no garlic' plus the selected vegetarian/vegan term. Strict diet, Singapore bounds/country checks, coordinate bias, radius post-filtering and area/map restrictions remain. Coordinate queries omit the literal Singapore text so it cannot override locationBias; area/bounds searches retain geography. Google has no Allium-free flag: keyword matches are not ingredient verification or complete ingredient information. The Allium-free control has no caption. Cooking and owned-recipe ingredient features are unchanged. Explore content uses 4-unit horizontal margins; other screens retain 8. Header controls center against the 54-unit field and its dropdown stays absolute. Search around uses two equal columns (48% basis with grow1); compact chips use the existing small font, one line and padding4/gap4 while preserving 48-unit targets. Current search is fully visible at 320. The 10-km chip wrapping at 320 is an accepted scrollable advisory. The photo request still runs usePhotoData → /api/place-photo → src/server/google-photo.ts. That handler checks the enabled development cache before reserving Google photo allowance and deduplicates concurrent misses; misses call Google media. Ignored .local/places-allowance.json now has placePhotos limit600 and developmentPhotoCache:true; src/server/google-allowance.ts enforces hard cap600. Raising the cap preserved existing usage rather than resetting it. Fresh-metadata acceptance observed photo usage 523→524 for the first three visible photos (one new fetch, others saved), then 524 after fresh Google metadata and 524 through browser/reload. There were 23 saved photos. The cap remains 600, with 76 calls remaining at that observation; later preview activity may change usage. Filters groups Diet, Search around and coordinate-based Distance in rounded cards. Vegetarian's carrot and Vegan's distinct sprout are authored SVGs beside radio labels. All exposed choices save/apply immediately per guest/profile, with no Apply/Reset control; a separate full-perimeter Allium-free checkbox row shows only its control label, with no caption or legend. Search around offers Singapore, Current search, Near Home and Near Work; missing private setup opens directly. Availability/Ingredient evidence sections and GPS/map/directory/exclusion actions are removed. Open-first listings and unknown hours remain; cuisine keywords, Google venue price bands 1–4 and Saved only auto-save/apply within the current search. Google Maps keyword matches drive Allium-free; keyword/category matches never verify ingredients.



| Pattern | Implemented source | Appearance and behavior |

| --- | --- | --- |

| Food root controls | [LocationSearchField](src/components/discovery/LocationSearchField.tsx), [LocationSuggestions](src/components/discovery/LocationSuggestions.tsx), [Explore](src/screens/food/Explore.tsx) | One free-text Place or postal code field followed by Filters and the Search by my location crosshair; no embedded selector or initial location choices. The 54-unit rounded field has 48-unit search/clear targets and a full focus perimeter. After typing, a dropdown with 16-unit corners uses wrapping name/address rows, semantic selected/hover feedback, loading/error/Retry and conditional OneMap/SLA attribution. Web exposes a combobox/listbox with explicit selected options and a guarded active descendant; keyboard highlights scroll into view. Me remains on Cook/Social/Market/Game and root headings stay titleless. |

| Native tabs | [Tab layout](src/app/(tabs)/_layout.tsx), [TabDock](src/components/navigation/TabDock.tsx), [GlassNavigation](src/components/navigation/GlassNavigation.tsx), [QuinTasteIcon](src/components/navigation/QuinTasteIcon.tsx) | Exactly Explore/Cook/Social/Market/Game are icon-only under the explicit 15 October navigation override; Market uses a seamless single-contour handle/body shopping bag with a leaf and no letter; centre Social uses a conversation bowl and rightmost Game a wide, shorter controller with a small rounded D-pad and two separated diagonal buttons. Its joined top-right leaf has no inner vein and stays hollow when selected; only the controller body fills. All selected glyphs and lens borders use navigation.selectedForeground equal to the palette theme.accent. Market also retains this accent when inactive; other inactive glyphs use mutedForeground. The outer dock surface has borderWidth0; default web outlines are suppressed while themed keyboard focus remains. Accessible names/tab roles/selected state remain on all platforms. Slim full-width focused-scene glass dock, top corners only, transparent host, 56-unit target row with a minimum 2-unit bottom inset. A responsive themed lens capped at 68×44 marks selection/hover with selection fill and a persistent 1.5-unit selected-foreground border. Keyboard hide, bottom spacing, events/history/owner isolation and reduced-motion-aware reselection remain. |

| Consistent selected navigation | [TabDock](src/components/navigation/TabDock.tsx), [QuinTasteIcon](src/components/navigation/QuinTasteIcon.tsx) | All five selected tabs retain the selection fill and a 1.5-unit lens border in navigation.selectedForeground, capped at 68×44 with radius22. A separate outer 2-unit perimeter indicates keyboard focus; web focus-visible keeps pointer/touch activation from leaving a focus outline. Market uses one continuous handle/body contour without a horizontal seam, outlined with a solid leaf when inactive and filled with a leaf cutout when selected. All five selected glyphs and lens borders use navigation.selectedForeground equal to theme.accent in each palette/mode. Glyph30, stroke2.2, row56, minimum target width48 and the shared floating add remain. |

| Profile Saved and future destinations | [Account](src/screens/Account.tsx), [Saved](src/screens/food/Saved.tsx), [Social](src/screens/meet/Home.tsx), [Game](src/screens/destinations/Game.tsx) | Saved is first in Me with the real collection count. Root-stack /saved and /saved/filters retain canonical URLs; Saved has Back/search/Filters and no avatar/dock. Social now offers opted-in profile cards, People/Events and local task screens; Game retains an unavailable state, Me and Try a recipe. Live Social services and game mechanics remain gated. |

| People-first Social | [Home](src/screens/meet/Home.tsx), [SocialTabs](src/components/social/SocialTabs.tsx), [SocialList](src/components/social/SocialList.tsx), [MeetUI](src/components/social/MeetUI.tsx) | One titleless search/Inbox/Me toolbar and one segmented People/Events/My plans row; contextual filters beside the segment for People/Events only. Every list, plan summary and menu uses the SocialList grouped surface: one bordered card per group with hairline row dividers inset to the text, 40-unit initial or tinted icon tiles, a bold one-line title, at most two muted lines and one trailing status pill or chevron. Forms use subtitle section headings and Title Case field labels. No explanatory notes; honesty uses short pills (Sample, Not sent, Posted · Not shared). Keyboard-only focus rings, 48-unit targets, semantic tokens and wrapping labels remain. |

| Sample food cards | [FoodCard](src/components/food/FoodCard.tsx) | Illustrative photo, compact item/metadata block and fit/evidence line for bundled cooking/evidence content. These cards are outside default Explore. Saved cards reveal list actions with More. |

| Live venue cards | [LivePlaceCard](src/components/discovery/LivePlaceCard.tsx), [LivePlaceInformation](src/components/discovery/LivePlaceInformation.tsx), [raster backdrop](src/components/discovery/GooglePhotoBackdrop.tsx), [PhotoBlend](src/components/discovery/PhotoBlend.native.tsx), [photo hook](src/hooks/usePhotoData.ts) | Rounded22 landscape; fixed116 clear-photo spacer plus measured metadata with 12-unit horizontal, 8-unit top and 2-unit bottom padding and 2-unit gaps, without duplicated panel height. Metadata uses one line with tail ellipsis; full raw name/address remain accessible and in details. WHITE Nunito18/12 metadata directly on real photo, no pale information panel. BlurRadius2 begins at measured name midpoint with 24-unit feather; masked soft dark fade blends into surrounding photo. Name/address use single-line tail ellipsis; approximate distance/rating/hours remain; no Allium status is shown or announced. Corner Save stays48; the independent inline Google Maps source has24-unit visible height with parent-bounded hitSlop10v/4h; no zoom icon remains; exact-photo viewer supplies full credits, ingredient evidence remains outside live place details. The card pair and matching viewer/detail/Saved consumers share one active URL-plus-original-expiry transfer; offscreen cards defer requests. |

| Saved Google place | [SavedPlaceCard](src/components/discovery/SavedPlaceCard.tsx) | Fresh metadata can label the row; after expiry/reload an honest saved-ID reference opens canonical live details and fetches current metadata on demand. User notes/lists remain local; there is no automatic background name enrichment. |

| Map and directory | [Map](src/screens/food/Map.tsx), [MapCanvas](src/components/discovery/DiscoveryMapCanvas.tsx), [results sheet](src/components/discovery/MapResultsSheet.tsx), [LiveMap](src/components/discovery/LiveMap.native.tsx), [Directory](src/screens/food/Directory.tsx) | Existing routes remain; their shortcuts are removed from Filters and Map retains its own filter control. Fill map, controlled camera/selection, 16-unit-radius peek/half/full results and wide two-pane layout remain. Map/List share accepted query/filters/radius and open-first results. Panning is camera-only; explicit search/recenter, 20-second loading timeout/Retry and source-linked selection expiry remain. Directory commits the area first. Web keeps an external-map fallback. |

| Location search and GPS | [AreaPicker](src/screens/food/AreaPicker.tsx), [LocationSearchField](src/components/discovery/LocationSearchField.tsx), [nearby hook](src/hooks/useNearbyLocation.ts), [Explore](src/screens/food/Explore.tsx) | Explore/Map/Search area share typed suggestions for areas, MRT stations, buildings, addresses and postal codes. Selected address coordinates center search without permission. Explore's accessible Search by my location crosshair requests foreground GPS directly. Temporary rounded GPS retains owner/unmount guards, a 20-second timeout and 30-minute expiry; fresh captures work before the next minute tick and action/API guards check real-time freshness. Changed geographic modes synchronize accepted display/keyword immediately; tapping the selected mode and diet/Allium-free/radius-only edits retain unsubmitted text. Persisted Current search without a memory selection asks for a new choice. |

| Compact Filters | [DiscoveryFilterOptions](src/components/discovery/DiscoveryFilterOptions.tsx), [Filters](src/screens/food/Filters.tsx) | Section cards have 18-unit insets and 14-unit gaps. Carrot Vegetarian/sprout Vegan and exclusive Search around chips retain radio semantics. Choices auto-save/apply immediately per guest/profile, with no Apply/Reset controls; missing Home/Work setup returns to its stored mode automatically; the independent Allium-free row has a 16-unit radius, complete edge, minimum 48-unit height (observed 50) and label only. Filters shows section headers and control labels only. Distance chips offer 1/3/5/10 km for coordinate-based contexts. |

| Private address editor | [PrivatePlaceForm](src/components/food/PrivatePlaceForm.tsx), [PrivatePlaces](src/screens/food/PrivatePlaces.tsx) | Reuse the rounded shared field in addressesOnly mode, with Home/Work/Other radios and a separate optional unit/details field. Saved cards expose Edit/Default/Remove; the current form exposes Save/Cancel and locks fields while saving. Error text uses the semantic error role. Discovery labels stay Near Home/Near Work; exact private content stays in the editor. |

| Live branch actions | [LivePlaceActions](src/components/discovery/LivePlaceActions.tsx), [LivePlaceDetail](src/screens/food/LivePlaceDetail.tsx) | Compact Save/Directions/Share/Call row: soft semantic fill, complete edge, 12-unit radius, 6-unit gap, minimum 58×60-unit targets. Current branch, checked timestamp, seven-day hours and next transition; missing phone disables Call. Public share preview excludes private data. |

| Provider photos and reviews | [GooglePhoto](src/components/discovery/GooglePhoto.tsx), [GoogleReview](src/components/discovery/GoogleReview.tsx) | Up to three attributed photos and five attributed business reviews; standalone/detail photo aspect 1.8, 14-unit media radius, review 12-unit inset/6-unit gap, linked author profile/source and optional avatar. Exact-photo expansion uses a contain-mode viewer with 48-unit Close/source/author targets and scrollable credits. cachePolicy none and honest unavailable states; business ratings never become ingredient evidence. |

| Fit and evidence | [Evidence](src/components/food/Evidence.tsx) | Text and distinct icons accompany fit colors; Unknown has a dashed full perimeter. Evidence source/date and uncertainty remain separate from fit. Live Google categories never produce confirmed ingredient badges. |

| Detail actions | [DetailParts](src/components/food/DetailParts.tsx) | Sample item Save stays visible, with Directions/Share/Call under More. Private notes and share preview reuse cards and labelled fields. Real branch actions use the dedicated top-row pattern below. |

| Compact Cook layout | [CookLayout](src/components/recipes/CookLayout.tsx), [shared density](src/components/ui-density.tsx), [UI](src/components/ui.tsx) | Cook-scoped 12-unit horizontal inset and 10-unit gaps; flat cards use 12-unit padding and 16-unit corners. Buttons retain a 48-unit minimum target, 12-unit corners and one content-padding layer; enlarged text may grow them. Fields use 56-unit minimum height with compact labels. Private note, Publication and Author & disclosure reveal secondary work; closed children stay mounted to preserve unsaved input and are hidden from accessibility. Ingredients, computed fit and applicable conflict/unknown warnings stay visible; bundled provenance moves behind Recipe info under the 16:49 user override. |

| Recipe browse rows | [RecipeRow](src/components/recipes/RecipeRow.tsx) | An 88-by-100 thumbnail (or accentSoft category tile when no illustrative photo exists) beside name, time/servings/one pot/cooked count and computed dietary fit replaces large Cook hero cards. A single-select horizontally scrolling category chip row and a compact sort-cycle chip sit above the rows. Below 360 units, combined app/system text scaling above 1 uses a 56-by-80 thumbnail to retain readable text. Independent Save keeps its 48-unit target; recipe opening inherits readable child content and supplies an Open recipe hint. Active cooking alone exposes the compact resume row. |

| Clean recipe overview | [RecipeOverview](src/components/recipes/RecipeOverview.tsx), [RecipeDetail](src/screens/food/RecipeDetail.tsx) | Uncaptained 2.4-aspect photo with 16-unit corners; time/content-width fit badge beside Save, Share and Recipe info icons, each retaining 48-unit targets. Browse and detail fit badges align to their content rather than filling the row; Cook/Resume/Replace & cook inherit their visible accessible names. Recipe info holds bundled/illustrative/unreviewed provenance and author/language/version/date. Applicable conflict and unknown-exclusion warnings remain in the main flow. Servings/Cook are unboxed; Ingredients has shopping/guide icons and steps are flat. Private note and no-allium variation remain. |

| Guided steps and timers | [Cooking](src/screens/food/Cooking.tsx), [Timers](src/components/food/Timers.tsx) | One item heading with Close, an optional Gather checklist before step 1, readable unboxed step instructions with large 56-unit ingredient tick rows (ticked lines strike through and recede), Servings/All ingredients toggle chips and a functional progress fill. Previous and Next/Finish cooking share a compact row. Finish cooking clears the session immediately and returns to recipe detail; independent timers and notes remain. Matching-version legacy completion clears on hydration; changed revisions still require review. Pause/resume and +1 min remain visible; restart/dismiss reveal under More. A compact timer dock carries label, remaining time and a non-color finished state. Timer-alert controls expose native opt-in, permission/error status, Settings and Retry; web explains its unsupported device-alert boundary. Independent timers remain visible through recipe revision review and deletion. |

| Recipe workspace | [MyRecipes](src/screens/food/MyRecipes.tsx), [RecipeEditor](src/screens/food/RecipeEditor.tsx), [RecipeReview](src/screens/food/RecipeReview.tsx) | Reuse existing fields, full-perimeter cards, neutral add control and Nunito. Incomplete drafts autosave with Saving/Saved/Retry feedback. Photos use uncropped contain preview; steps retain explicit up/down controls and per-step ingredient assignment chips. View & cook opens a readable private recipe with Edit/Copy/Share, original-serving restore and scaled ingredients. Guided steps show assigned ingredients, optional photos/timers and explicit revision-review recovery; saved servings/progress resume by owner. Copy starts revision 1 without publication consent; the deliberate text-share preview excludes photos/private notes and retains author, declared diet, sponsorship and unpublished status. Cook/Resume sits near servings, with reset only after a change and authored total minutes retained. Private note and Publication use disclosure rows; author/language/sponsorship live under Author & disclosure in the editor. Private content keeps meaningful recipe/time/diet and declared sponsorship; Recipe info holds author/version/description. Omit absent-author, unspecified-diet and no-sponsorship placeholders. Publication review retains rights/policy and Ready to submit / Not sent; editor Saved/Saving/Retry remains. No success styling that implies approval or public publication. |

| Shared floating add | [FloatingAddButton](src/components/FloatingAddButton.tsx), [Screen](src/components/Screen.tsx) | One neutral 48-unit rounded-square + with 16-unit corners across Social, legacy My Tables, Market My Listing and Cook My recipes. Center above measured dock/feedback with the existing 12-unit offset and 72-unit scroll clearance; hide for native keyboard. Preserve action-specific accessible names. |

| Compact access and resume | [AuthParts](src/screens/AuthParts.tsx), [Cook](src/screens/food/Cook.tsx) | Small chef beside the sign-in heading, paired provider affordances and a single compact cooking resume row with an explicit play target only while cooking is active. |



| Market controls | [Market](src/screens/market/Market.tsx), [AddListingButton](src/components/market/AddListingButton.tsx), [MarketCategories](src/components/market/MarketCategories.tsx), [MarketFilters](src/components/market/MarketFilters.tsx) | Default browse header has search/Inbox/Me, circular photo categories and Saved/sort tools. Filters and My Listing share one row. My Listing has Back/search/Inbox and status chips; its sole create action is a centered 48-unit neutral rounded-square floating +, placed above dock/feedback with a 12-unit offset, 72-unit scroll clearance and native keyboard hiding. Keep 48-unit targets. No Buy/Sell selector, Preview badge or replacement info badge. |

| Market listing cards | [ListingCard](src/components/market/ListingCard.tsx), [ListingPhoto](src/components/market/ListingPhoto.tsx) | Borderless at rest with a full 18-unit-corner focus perimeter and square 16-unit-corner photo. Metadata uses a 2-unit horizontal/6-unit top inset and 2-unit gaps. A 20-unit price precedes a name capped at two lines without reserved blank height, public pickup area and full date; Sealed or owner status overlays the photo with Save/Manage. Visible text supplies the accessible name with View listing details hint; ingredient-label fallback images use uncropped contain rendering, and sample artwork is never publication evidence. |

| Listing form and deletion | [ListingForm](src/screens/market/ListingForm.tsx), [Ingredients](src/components/market/Ingredients.tsx), [ListingPhotos](src/components/market/ListingPhotos.tsx), [ListingDelete](src/components/market/ListingDelete.tsx) | Compact ingredient panel groups a full-width label-photo tile, required full ingredient text, Contains/May contain selectors, eight common choices with More ingredients and a required checked-against-label checkbox. Text/photo/tag edits reset confirmation. Eggs and Milk / dairy remain separate. Photos offer native camera/library or browser file selection; ingredient-label images use uncropped contain rendering. Draft/publish and explicit Keep/Delete confirmation remain. |

| Local pickup status | [ExchangeControls](src/components/market/ExchangeControls.tsx) | Vertical icon-and-word progress, quantity/offer summary and consequential next actions in quiet full-perimeter panels. Public meeting/date/time is free text; handover/no-show/cancel/dispute and feedback are local, with explicitly labelled simulated counterpart actions. |



Ingredient switches remain independent of the diet radio choice. Keep the visible ingredient/cross-contact wording; preferences do not guarantee allergen safety. Credential fields are cleared after preview submission and are not included in saved preference data.



Navigation uses a native slide transition or no transition when app/device Reduce Motion is active. Essential labels remain available when optional reading hints are disabled.



The [schema-v2 sidecar](.impeccable/design/quintaste.json) supplies metadata and ten self-contained HTML/CSS pattern samples. Those samples are static Coral/Light projections for documentation, with local semantic CSS variables; they do not replace native components. The card sample is explicitly an unavailable-photo documentation fixture with placeholder values; no live Google photo/metadata is archived. Frost/native interaction is described from source and current web evidence. Synthesized tonal ramps are panel aids, not shipped palette tokens.



### Private animated portrait



[Avatar](src/screens/Avatar.tsx), [AvatarPortrait](src/components/avatar/AvatarPortrait.tsx) and [AvatarConsent](src/components/avatar/AvatarConsent.tsx) extend the existing Nunito hierarchy, semantic palette, rounded controls and scalable labels. A clearly labelled fictional sample demonstrates a dimensional cartoon portrait on a transparent background. The saved portrait appears in Me and the shared header; the existing chef remains the fallback. Portrait images have explicit square dimensions so small header instances cannot inherit an oversized intrinsic image.



**The Inspect Before Save Rule.** Choosing a photo or generating a portrait creates a private preview. Only Save changes the current device collection's identity. Keep Save, discard and Undo explicit, and retain the saved identity on failed or discarded work. The OpenAI consent card names the recipient, source-photo handling, separate provider retention and paid allowance before Generate becomes available. Selected-photo text distinguishes local selection from upload; errors and progress use readable live feedback.



**The Optional Motion Rule.** Four local frames support a neutral portrait, blink and two mouth positions. A subtle two-unit breathing translation supports the character without moving the controls. Pause holds the base frame; Reduce Motion, screen blur and background visibility stop animation. Talking preview is a demonstration loop, not speech synchronization. Missing expressions fall back to the base portrait; an unreadable base falls back to the chef. Saving or animating a result makes no AI call.



Generated portraits remain private to the device collection; exports include metadata rather than image bytes. Source-photo persistence, public avatar publishing and account synchronization are outside this component contract. The current generation service remains a development pilot with explicit device approval and production disabled. Setup and retention details live in [Avatar setup](docs/AVATAR_SETUP.md).



The [fresh finish review](.impeccable/review/avatar-finish-review.json) gives **ship for the bounded browser/source development pilot**, with seven valid captures and no material fixes. [Browser evidence](.impeccable/review/avatar-browser.json) covers seven journeys with zero page errors or scoped axe findings; [security checks](.impeccable/review/avatar-security.json) cover seven groups using an intercepted provider. [Gates](.impeccable/review/avatar-gates.json) record TypeScript/lint exit 0 and six provenance-bearing rasters with none missing. [Android transport](.impeccable/review/avatar-native.json) returned manifest/bundle HTTP 200 with expo-expect-signature requested with private provider code and keys excluded. Native appearance/camera/accessibility, live generated quality and billing, public deployment and the original full Adult/Mini rig remain unaccepted; these checks do not establish full-app accessibility or absolute security.



## Do's and Don'ts



### Do:



- Do reuse the shipped semantic tokens, text wrapper, cards, fields and controls.

- Do preserve guest entry, explicit local-preview feedback and independent ingredient switches.

- Do let small screens scroll and retain every action at enlarged text sizes.

- Do use the existing chef asset and preserve its transparent background.

- Do pair fit colors with text and icons. Cook keeps conflicts and unknown exclusions visible and discloses bundled/unreviewed provenance plus illustrative imagery through one-tap Recipe info; other evidence surfaces retain their relevant disclosures.

- Do keep white single-line 18/12 text directly on photos, soften the raster from the measured name midpoint and retain compact Google source/full exact-photo credits.

- Do keep one Explore search row and five icon-only glass tabs (Explore/Cook/Social/Market/Game) with accessible names, small themed selection/hover lenses, safe areas and the dock transparency fallback.

- Do keep provider business reviews separate from independent ingredient evidence and preserve author/source links.

- Do keep primary actions visible and reveal secondary choices through Filters or More without shrinking touch targets.

- Do save and apply filter selections immediately, pair Vegetarian's carrot with Vegan's sprout, and use single-line tail ellipsis for compact landscape metadata.



### Don't:



- Don't hardcode component colors or substitute palette-specific utility colors.

- Don't add decorative directional borders.

- Don't replace the approved chef asset, Nunito character or rounded surfaces.

- Don't imply real account creation, connected account providers or allergen safety.

- Don't add a pale information panel, blur text/UI, restore visible tab words or use a large glowing capsule/opaque dock host.

- Don't treat illustrative venue hours, photos or draft receipts as live public facts.

- Don't present search-match counts or Google categories as exhaustive venue totals or ingredient confirmation.

- Don't repeat Places, Cook or Market headings above already-labelled tab roots, or add a redundant heading to the Saved toolbar.





## Current Explore Phase 1 batch (15 October 2026)



Explore now controls location messages with Settings, Retry and Dismiss recovery. Location service preflight and an explicit foreground tap retain a 20-second timeout, cancellation, and owner/route/manual-edit guards; manual search remains available. Cuisine keywords, Google venue price bands 1–4 and Saved only auto-save/apply with the existing diet, Allium-free, Search around and Distance controls. Every immediate search and accepted-context comparison includes cuisine/price; the server validates inputs and post-filters Google price levels. Cuisine is keyword relevance, not reviewed classification; venue price bands are not exact SGD or dish prices. Saved only filters saved places within the current search matches. Empty results offer Widen area and Filters; provider/offline feedback stays short with Retry. Filters has labels/headers only, with no Apply, Reset or explanatory copy. Explore cards represent venues and now expose approved Menu navigation; private Home/Work boundaries remain.



The remaining Phase 1 launch work is the owned, reviewed venue/dish catalogue with evidence and merchant/menu rights; authenticated backend/cloud ownership and delivered correction/harm workflows; an offline owned catalogue; and native-device acceptance. Home/Work participation remains Phase 2 with separate explicit opt-ins and a backend; saving a private address never enrolls its owner or makes the address public. See the [Explore Phase 1 audit](docs/EXPLORE_PHASE1.md) for PRD sources, pilot recommendation and verification status.



The [source scenarios](.impeccable/review/explore-phase1-source.json) passed 12 checks with zero paid requests. The [browser report](.impeccable/review/explore-phase1-validation.json) passed 16 interaction checks with 11 captures at 320/375/768/1440 plus dark, zero page errors, zero scoped axe WCAG A/AA findings and zero actual Google requests. [Final gates](.impeccable/review/explore-phase1-gates.json) record TypeScript/lint exit 0 and no remaining source-review findings; the 28-file source audit measures at most 169 lines/file and 56 lines/function. [Android transport](.impeccable/review/explore-phase1-native-transport.json) returned manifest/bundle HTTP 200 (8,934,941 bytes), included the recovery/price/title components and excluded the private Google key. Native-device appearance and production acceptance remain unverified.





## Avatar library refinement (16 October 2026)



The avatar editor uses a 224-unit centered portrait, restrained animation controls, an honest autosave/retry status and selectable thumbnail library. It preserves Nunito and existing semantic palettes. Default chef and Sample only change the selection; saved generated portraits remain in the encrypted account library. The owner selected automatic saves for completed generation and avatar selection. Create new avatar opens a focused photo task with camera/library choices, local photo preparation and explicit provider consent before Generate; Back returns to the avatar library. Failed saves keep a device preview and offer one Retry. Delete and discard require confirmation; Keep is disabled once removal starts. Camera permission denial and interrupted cancellation expose explicit recovery. Native camera and appearance still require physical-device acceptance. Current implementation and evidence are in the avatar surface brief and local avatar production document.



**Earlier avatar and icon refinement (16 October 2026; dock icons superseded below):** Avatar choices use a transparent 2-unit reserved border, accentSoft selected fill and a 20-unit accent check badge; unselected tiles use card. Keyboard focus alone reveals the full accent border; pointer activation clears it and web suppresses the default browser outline. Tiles wrap with basis96/grow1/maxWidth160/minHeight140 and gap8. Create new avatar uses the primary button. Social uses two-person contours, Market a shopping bag with a leaf, and Game a simple controller without a sprout. Inactive glyphs are outlined and selected glyphs filled; glyph30/stroke2.2 and the dock geometry, selected lens and separate keyboard focus remain unchanged.



Browser QA covers the avatar library and navigation in the local React Native Web preview: [report](.impeccable/review/avatar-icon-refresh/report.json). The final matrix passed 13 groups with 25 captures and zero runtime errors. [Final gates](.impeccable/review/avatar-icon-refresh/gates.json) record passing TypeScript and lint; [interaction checks](.impeccable/review/avatar-icon-refresh/interactions.json) passed selection persistence, keyboard focus and Create/Back. The [independent finish review](.impeccable/review/avatar-icon-refresh/finish.json) closed the focus-outline finding and ships the reviewed browser/source scope with no visible fix-induced regression. This visual change does not establish native/device or account/backend acceptance and has not been deployed.



**Earlier dock signature and border refinement (16 October 2026; Market/Game superseded below):** Social uses a conversation bowl, Market a leaf-shaped awning above a stall, and Game a bao-shaped gamepad. Inactive glyphs are outlined and selected glyphs filled, with glyph30/stroke2.2, row56 and targets48+. The bottom navigation surface has no outer border (borderWidth0); suppress the default web outline while retaining the separate themed keyboard-focus border. The selected lens retains its 1.5-unit border and fill, capped at 68 by 44 with radius22.



[Local browser QA](.local/icon-border-redesign/local/report.json) passed eight palette/mode/width cases with 40 captures, zero runtime errors and zero scoped axe findings. TypeScript and lint passed; independent visual review found no blocking findings. Evidence covers local browser/source presentation only, not physical-device or account/backend acceptance. Deployed to VPS app and Expo preview as 20261016-dock-signatures2. Live Playwright repeated all eight cases and 40 captures successfully; exact web bytes and Android/iOS manifest/bundle markers passed. Evidence: .local/icon-border-redesign/release.json. Physical-device appearance remains unverified.



**Earlier Market/Game refinement (16 October 2026; superseded below):** Social retains the conversation bowl. Market follows the user's Shopee bag reference with an arched handle and a leaf inside, without a letter. Game uses an angled frying pan with a play triangle, reflecting the PRD pp29-33 Rush Hour cooking theme; this icon change does not implement gameplay. Market and Game use outlined inactive silhouettes with solid interior marks, and filled selected silhouettes with leaf/play cutouts. Preserve glyph30/stroke2.2, row56, targets48+, the borderless outer dock, separate themed keyboard focus and existing selected lens.



[Local browser QA](.local/market-game-redesign/local/report.json), served from http://127.0.0.1:8086, passed eight palette/mode/width cases and 40 captures, including exact current SVG-path assertions, with zero runtime errors and zero scoped axe findings. Isolated TypeScript, lint and clean export passed. Fresh independent visual review passed; current design guidance was reconciled with the reviewed icons. Release 20261016-market-play1 is deployed to VPS app and Expo preview. Live Playwright repeated all eight cases/40 captures successfully, and exact web bytes plus Android/iOS manifest/bundle markers passed. Evidence: .local/market-game-redesign/release.json. These checks do not establish physical-device appearance or new account/backend acceptance.



**Earlier seamless Market and controller Game (16 October 2026; superseded below):** Social retains the conversation bowl. Market uses a single continuous handle/body contour around its leaf, with no horizontal seam or letter. Game uses a custom Discord-inspired controller with a flat top, rounded grips, two eyes and a central play triangle; its authored silhouette is distinct from the Discord logo. Inactive marks are solid inside an outline; selected leaf/face marks are cutouts. Only the selected Game glyph uses theme.accent instead of the darker navigation.selectedForeground; other tabs and the selected lens retain their colors. Preserve glyph30/stroke2.2, row56, targets48+, the borderless outer dock and separate themed keyboard focus. This visual update does not implement gameplay.



[Earlier controller browser QA](.local/controller-refine/local/report.json) passed eight palette/mode/width cases with 40 captures, exact current-path and selected-Game-color assertions, zero runtime errors and zero scoped axe findings. Isolated TypeScript, lint and clean export passed. Fresh finish review ships the reviewed browser/source scope with current documentation and no blocking findings. Release 20261016-controller-face1 is deployed and verified: [release evidence](.local/controller-refine/release.json) records eight live browser cases, 40 captures, eight exact selected-Game-color assertions, current seamless-bag/controller paths, zero page errors and zero scoped axe findings. Exact web bytes and Android/iOS signed-manifest and current-bundle markers passed with the existing scope key. Physical-device appearance remains unverified. These checks do not establish physical-device appearance or new account/backend acceptance.



**Earlier joined-leaf controller and shared selected color (16 October 2026; superseded below):** Social retains the conversation bowl and Market retains its seamless single-contour handle/body bag with an internal leaf. Game uses a conventional D-pad plus and two diagonal buttons, with a leaf smoothly joined at the top right into one outer contour. The inactive outline has solid controls and a leaf vein; the selected silhouette has control and vein cutouts. All five selected tab glyphs and lens borders use the palette accent through shared navigation.selectedForeground, which equals theme.accent in light and dark modes. There is no Game-only color exception. Preserve glyph30/stroke2.2, row56, targets48+, borderWidth0 on the outer dock, separate themed keyboard focus and the selected lens fill/geometry. This replaces the eyes/play/Discord-inspired direction without implementing gameplay.



[Earlier joined-leaf browser QA](.local/leaf-controller/local/report.json) passed eight palette/mode/width cases, 56 captures and 40 exact selected-color assertions. Isolated TypeScript, uncached lint and clean export passed. Independent substitute finish review ships the reviewed scope; documentation finding F01 is resolved. Release 20261016-leaf-controller1 is deployed with healthy app/preview services: [release evidence](.local/leaf-controller/release.json) records eight live cases, 56 captures, 40 exact glyph-color and 40 lens-border-color checks, with zero runtime errors or scoped axe violations. Exact web bytes match; Android/iOS signature-request manifests and current-marker bundles returned HTTP 200 with the existing scope key. All 15 API bundles are byte-preserved. Physical-device appearance is unverified.



**Current wide controller and persistent Market color (16 October 2026):** Game uses a wider controller body spanning x2-30 with approximately 18 units of body height, a smaller rounded 5.2-unit D-pad and two separated diagonal buttons of 2.2-unit diameter. Its top-right leaf joins the single outer contour, has no inner vein and stays hollow in both states; selection fills only the controller body with control cutouts. Market retains its seamless handle/body leaf bag and always uses navigation.selectedForeground (the palette accent), with a selected filled body and inactive outline. Every other inactive glyph uses mutedForeground. All selected glyphs and lens borders remain palette accent. Social, glyph30/stroke2.2, row56, targets48+, borderless outer dock, separate keyboard focus and selected lens geometry remain. This supersedes the compact controller and inner leaf vein; gameplay scope is unchanged.



[Current browser QA](.local/wide-controller/local/report.json), isolated TypeScript, uncached lint and clean export passed. Fresh independent substitute full review ships the reviewed scope with no material fixes. Release 20261016-wide-controller1 is deployed with healthy app/preview services: [release evidence](.local/wide-controller/release.json) records eight live cases, 56 captures, 40 exact selected-color checks and 40 Market transition checks, including every glyph after each selected tab and Market-to-Game. Lens colors, borderWidth0, focus and navigation passed with zero scoped axe violations or page errors. Exact web bytes match; Android/iOS manifests and current-marker bundles returned HTTP 200 with the existing scope preserved. All 15 API bundles are byte-preserved; no paid calls were made. Physical-device appearance is unverified.



## Profile settings presentation (16 October 2026)



Me uses a compact avatar/Edit Profile header and distinct icon-led rows without descriptions, provider handles or notes/case counters. Saved retains its count and first position. Food Choices displays the current diet and opens the autosaving eating-style/exclusion page. Appearance no longer repeats food/accessibility/notification settings. Curated UI titles and action/field labels use initial capitals; user content and stored values retain their original case. See `.impeccable/surfaces/access.md` and `.local/profile-cleanup/browser.json`. Local implementation only; not deployed or verified on physical hardware.





**Deployment, 16 October 2026:** Profile/settings release `20261016-profile-settings1` is now live on app and Expo preview. This supersedes the local-only status above. Live profile/diet persistence and Retry, responsive/accessibility checks, exact web bytes and Android/iOS preview transport passed; physical-device appearance remains unverified. Evidence: `.local/profile-cleanup/release.json`.



**Deployment, 16 October 2026:** Profile/settings release `20261016-profile-settings1` is now live on app and Expo preview. This supersedes the local-only status above. Live profile/diet persistence and Retry, responsive/accessibility checks, exact web bytes and Android/iOS preview transport passed; physical-device appearance remains unverified. Evidence: `.local/profile-cleanup/release.json`.


Navigation color correction deployed as `20261017-market-tab-color1`. Local evidence: `.local/market-tab-color/release.json`; all six palette/mode cases and both native preview bundles verified. Physical-device appearance remains unverified.


UI correction deployed as `20261017-explore-card-refine1`. Local evidence: `.local/explore-card-refine/release.json`; local/live browser and both native preview bundles verified. Physical-device appearance remains unverified.


UI correction deployed as `20261017-place-reviews1`. Local evidence: `.local/place-detail-reviews/release.json`; local/live browser and both native preview bundles verified. Physical-device appearance remains unverified.


Menu/gallery/review follow-up deployed as `20261017-menu-reviews3`. Latest contract: `docs/MENU_GALLERY_REVIEWS.md`; evidence `.local/menu-review-refine/release.json`. This supersedes single-choice discovery diet/cuisine/price and the old midpoint photo feather.
