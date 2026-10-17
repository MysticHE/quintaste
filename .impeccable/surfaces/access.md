# Access and settings

Mode: Operate. Implement the existing visual world.
Authority: UI/UX PDF pages 6-7, 9, 53-54.
First viewport: cream, peach and coral background; rounded QuinTaste wordmark; warm dumpling chef; a clear welcome and primary action.
Signature interaction: apply and save a palette, display mode or preference immediately, then restore after reopening. The 16 October owner instruction removes separate Save/Apply controls for settings. Use the shared compact 48-unit controls, 16-unit semibold labels and 12-unit corners; see [the control contract](../../docs/UI_STANDARDIZATION.md).
Quality bar: plum body text, rounded heavy headings, milky panels, white perimeter edges, warm shadows, vivid coral actions, native back navigation and 48dp controls. Small screens scroll; text has no fixed height.
Boundaries: server-backed Google/username accounts in the deployed app; local preview only when accounts are disabled. Browser screenshots do not validate native devices. Semantic tokens only; no decorative directional borders.

Last updated: 2026-10-15. Saved is the first Me/profile settings action, with the actual collection count. It opens root-stack /saved; /saved/filters stays canonical. Back returns through Me to the originating tab; direct links have a fallback. Saved has Back/search/Filters and no avatar or bottom dock. Collection ownership, notes, lists and save/remove/Undo behavior remain unchanged.

16 October account walkthrough: Google-first sign-in, username method disclosed separately, one DOB date picker only for unconfirmed adults, direct task return. Recovery codes remain essential for username accounts; bio/avatar are optional. No forced guest import or always-visible autosave prose. Success notices are focused-screen only and dismiss after four seconds. See local `docs/ACCOUNT_SETUP_UX.md`.

## Me and settings refinement — 16 October 2026

The owner's latest screenshot request removes provider usernames, private-note/case counts, setting descriptions and duplicated settings destinations from Me. The profile header has a 64-unit avatar with an accessible Change Avatar action and a compact Edit Profile action beside it. Saved remains first with its real count. Every navigation row has a distinct themed icon, a 56-unit minimum target and an inset divider. Food Choices shows the current eating style and opens the existing autosaving Vegan/Vegetarian/Plant-Based selector at /exclusions, now titled Food Choices. /settings is Appearance only; Accessibility and Notifications remain direct Me destinations. Provider-generated usernames are also hidden from Edit Profile.

Use initial capitals for curated screen titles, section headings, field labels and action labels (for example Edit Profile). Do not change user content, persisted enum values, identifiers or prose. Existing authentication, eligibility, collection ownership, profile autosave and avatar storage behavior remain unchanged.

Validation: TypeScript and uncached Expo lint pass. Local React Native Web QA uses mocked account/API responses, verifies preference persistence and failure/Retry, avatar/profile navigation, guest separation, four widths including enlarged text, and scoped accessibility checks. Evidence: `.local/profile-cleanup/browser.json` and adjacent captures. No Android device was attached; physical-device appearance and real account backend acceptance are unverified. This change has not been deployed.


**Deployment, 16 October 2026:** Profile/settings release `20261016-profile-settings1` is now live on app and Expo preview. This supersedes the local-only status above. Live profile/diet persistence and Retry, responsive/accessibility checks, exact web bytes and Android/iOS preview transport passed; physical-device appearance remains unverified. Evidence: `.local/profile-cleanup/release.json`.
