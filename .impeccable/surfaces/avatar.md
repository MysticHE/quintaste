# Avatar studio - current release contract (16 October 2026)

PRIMARY TARGET: src/screens/Avatar.tsx
MODE: Operate. Adaptive React Native Android/iOS; browser captures validate web/source only.
DIRECTION: Keep approved Nunito, semantic Coral/Peach, Cobalt/Turquoise and Lavender/Frost tokens, rounded portraits, compact controls and tonal selection with a check badge; reserve a full perimeter border for keyboard focus. Preserve the existing fictional sample and default chef.
FIRST VIEWPORT: Current portrait (224-unit maximum), restrained animation controls, autosave status, named selectable saved portraits plus Default chef and Sample. Create new avatar opens a focused photo task, immediately showing photo/camera controls and a return to the library.
BEHAVIOR: User explicitly chose automatic saving for generated portraits and selections. Successful generated portraits are appended to an encrypted account library, never replaced by selecting default/sample. Existing local portrait migrates before first cloud selection. A failed save keeps a device-scoped pending preview across reopening; Retry reuses generated frames without another model call. Explicit confirmed discard removes only pending preview. Explicit confirmed delete removes only one saved portrait. Account erasure cascades library and removes local preview key.
CAMERA: SDK 57 ImageManipulator converts local URI to bounded JPEG (1280 maximum dimension), supports larger camera/HEIC source inputs, recovers pending Android ImagePicker result and opens photo review, provides permission Settings fallback. Physical Android/iOS camera acceptance remains unverified.
SECURITY: Adult authenticated user, exact origin/custom header checks, owner-scoped SQL, encrypted payload AAD bound to account and avatar, 20-portrait storage capacity, immutable save-by-id, size/type/dimension validation, account deletion cascade. Original provider key remains in Cloudflare only. Source selfie never becomes a permanent library item. Generated frames stay until explicit deletion/account erasure; temporary preview still expires in 15 minutes.
VERIFY: .local/avatar-library-qa contains synthetic fixture backend, photo pipeline and browser evidence. No customer photos or provider keys accessed, no paid generation calls for this change. No native screenshot supplied; do not certify physical camera or whole-app production readiness.

## Avatar choice refinement (16 October 2026)

Avatar choices use a transparent 2-unit reserved border, accentSoft selected fill and a 20-unit accent check badge; unselected tiles use card. Keyboard focus alone reveals the full accent border; pointer activation clears it and web suppresses the default browser outline. Tiles wrap with basis96/grow1/maxWidth160/minHeight140 and gap8. Create new avatar uses the primary button.

Browser QA covers the avatar library and navigation in the local React Native Web preview: [report](../review/avatar-icon-refresh/report.json). The final matrix passed 13 groups with 25 captures and zero runtime errors. [Final gates](../review/avatar-icon-refresh/gates.json) record passing TypeScript and lint; [interaction checks](../review/avatar-icon-refresh/interactions.json) passed selection persistence, keyboard focus and Create/Back. The [independent finish review](../review/avatar-icon-refresh/finish.json) closed the focus-outline finding and ships the reviewed browser/source scope with no visible fix-induced regression. This visual change does not establish native/device or account/backend acceptance and has not been deployed.

The following historical pilot notes are retained for context and are superseded by this release contract.

> **16 October production update:** The private avatar editor now uses authenticated `/api/avatar` routes when customer accounts are enabled. Consent names Cloudflare/OpenAI and encrypted temporary retention. The production implementation and verified deployment supersede earlier development-only boundaries below; see [AVATAR_PRODUCTION.md](../../docs/AVATAR_PRODUCTION.md).

# Avatar
Mode: Operate. Me > Your avatar. Extend the existing QuinTaste visual system.

## Direction contract
THESIS: Inspect the character before committing a private identity.
OWN-WORLD: Existing Nunito, semantic palette, rounded controls and compact screen.
STORY: Choose a photo, consent to OpenAI, generate, inspect motion, Save; discard preserves the saved identity.
FIRST VIEWPORT: Back and title, centered portrait at up to 320 units, motion controls, primary Save.
FORM: User-selected Roast Room animated portrait; direct extension, no concept seed needed.
FINISH: Completed 15 October 2026: ship for the reviewed browser/source pilot; all seven captures valid, no material fixes, DESIGN.md and this brief updated, six rasters with provenance.

## Boundaries
2D portrait with 3D appearance, not a mesh or rig. Private local ownership. Production generation disabled until real authentication is integrated. No key in client; no source-photo persistence by the application. Model quality and billing require a live key test. Existing assets and three palettes remain authoritative.

## Built world

- The editor is a single scrolling task reached through Me > Your avatar, with Back, a centered contain-mode portrait capped at 320 logical units, wrapping motion controls and Save before the photo and consent cards. It inherits Nunito, semantic theme roles and the current rounded controls across the existing palettes; no new general theme tokens were introduced.
- The labelled fictional sample has a transparent, dimensional cartoon silhouette. Neutral, blink, half-open and open-mouth frames support local breathing/blinking and a talking demonstration. Pause and Reduce Motion hold the base frame; screen blur and background visibility stop playback. The saved portrait also appears in Me and the shared header.
- Photo selection is local until explicit OpenAI consent and Generate. Generation produces a private draft; Save commits it to the current device collection, Undo restores the previous identity and discard retains the saved identity. Errors, unavailable service and recovery have visible feedback. Talking preview is not speech-synchronized lip movement.
- The pilot uses the fixed Sunburst model by default for four sequential image edits. It requires an explicitly approved device capability, keeps the key on the server and rejects production generation. There are no automatic paid retries; recovery polls the existing request. Reservations cap attempts at two per owner and five globally per UTC day, including failed/cancelled attempts.
- Upload metadata is stripped; source photos are not persisted by the application. Server preview frames expire within 15 minutes. Only explicit Save stores generated frames in the private device collection; export contains metadata/frame names rather than image bytes. Cancellation stops remaining work, while a provider request already started may still be charged.
- The key is absent and generation is off, honoring the instruction to finish setup before the user adds it. [Avatar setup](../../docs/AVATAR_SETUP.md) owns configuration, retention and operational details. [PRD coverage](../../docs/PRD_COVERAGE.md) records the partial implementation override.

## Completed finish and evidence

The [fresh general-agent substitute review](../review/avatar-finish-review.json) returned **ship** for the bounded React Native Web/source development pilot, with no material fixes. All seven supplied captures were individually opened and valid: [mobile](../review/avatar-mobile.png), [Me](../review/avatar-me.png), [consent](../review/avatar-consent.png), [dark and larger text](../review/avatar-dark-large.png), [320-wide](../review/avatar-width-320.png), [768-wide](../review/avatar-width-768.png) and [desktop](../review/avatar-desktop.png). The fresh general-agent documenter substitute recorded the built system in [DESIGN.md](../../DESIGN.md) and this brief.

[Browser checks](../review/avatar-browser.json) passed seven journeys, with zero page errors and scoped axe findings. [Security checks](../review/avatar-security.json) passed seven groups without live provider calls. [Gates](../review/avatar-gates.json) record TypeScript/lint exit 0, six rasters with no missing provenance, and served 768-pixel sample WebP assets totaling 227,120 bytes. The [single detector run](../review/avatar-detector.json) returned no findings. [Android transport](../review/avatar-native.json) returned manifest/bundle HTTP 200 with expo-expect-signature requested with client markers present and provider implementation/private keys excluded; no native capture exists.

Acceptance excludes native appearance, camera/permissions and platform accessibility; live OpenAI output and billing; public deployment; and the original manual Adult/Mini mesh/rig specification. The finish reviewer also excluded provider prompt source and unrelated documentation. Existing dependency audit findings remain 32 advisories (20 high, 12 moderate); this bounded verification is not an absolute security or full-app accessibility claim.


**Deployment, 16 October 2026:** `20261016-avatar-icons1` is live on the VPS app and Expo preview. The release is based on review-fixes1 plus the three UI files; unrelated menu work and all API function bytes are unchanged. Live real-account selection/reload/Retry, Create/Back, navigation icons, exact web bytes, service health and Android/iOS manifests/bundles passed. The synthetic account was deleted; no paid generation ran. Physical-phone appearance remains unverified. See [deployment evidence](../../.local/avatar-icon-deploy/release.json) and [runbook](../../docs/DEPLOYMENT_RUNBOOK.md).
