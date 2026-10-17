# Food utility pilot

User-approved direction: Operate, native adaptive, code-led. Build from PRD 1.4 and its missing-screen supplement, retaining the 14 October approved semantic pastel palettes. This is an extension of the existing Expo app, not a web redesign.

The current five-tab shell is Explore/Cook/Social/Market/Game. Saved is first in Me/profile settings with the actual collection count; /saved and /saved/filters are root-stack tasks with Back, search and Filters, without an avatar or dock. Me lives on Cook/Social/Market/Game. Social now has the [people-first local flow](social.md); live Social services and Game mechanics remain gated. Guests can discover and save without signing in. The core journey is discovery → evidence-aware dish details → save → recipe → guided cooking.

Use white/pale cards, charcoal text, food photography, generous touch targets and compact wrapping chips. Use system navigation, native sheets, safe areas and the existing Nunito family. Unknown, stale, withdrawn and conflicting evidence remain distinct. Do not imply dietary or allergen certainty.

This deliverable is a functional local preview. The sample venue/dish index and food images are illustrative. Maps, live hours, Google enrichment, real authentication/sync, moderation delivery remain unavailable until connected. The later [Cook contract](cook.md) implements opt-in local native timer scheduling; physical-device background delivery remains unverified and web device alerts are unsupported.

Acceptance: local persistent saves/notes/case drafts/private places, independent exclusions, strict confirmed filtering, guest isolation/explicit merge, age check without birthday retention, tested recipe scaling, persistent cooking progress/deadline timers, all three palettes/modes, wrapping accessible controls, contextual Back, no dead-end tabs.

Native device capture is the acceptance evidence for native visual fidelity. Browser capture is supplemental only. Completion documentation must distinguish the two and record any blocked capture honestly.

## Direction contract

THESIS: Evidence-aware food discovery that gets a guest to a saved dish and a home recipe without account friction.

OWN-WORLD: Native utility with the approved Coral/Peach, Cobalt/Turquoise and Lavender/Frost tokens, Nunito type, plain near-white cards and illustrative food photos.

STORY: Explore an area, inspect ingredients/evidence, ask staff, save privately, cook and resume.

FIRST VIEWPORT: Area and profile toolbar, place-only search and one Filters control; open-now places first using explicit sample schedules. No redundant tab-page title. Useful food imagery begins above the fold.

FORM: Code-led extension of the existing Expo app, prescribed by the user and PRD 1.4. No random concept seed or composition tournament; no approved composition comp. The attached image is palette authority only.

## Compact UI refinement — 14 October 2026

The user explicitly removed the Places title and asked for the same concepts throughout all screens. Explore, Cook and Saved have no redundant root titles. Area is an inline toolbar control, never a standalone pill row. Search and essential actions form compact rows. Secondary discovery choices, recipe choices, Saved type and list choices live in their filter screens. Detail and timer secondary actions live under More. Task and item headings remain meaningful. Cards and spacing are compact while interactive targets stay at least 48 dp. Authentication has a compact task heading and grouped provider options.

Opening order evaluates Singapore time every minute and on app foreground; unknown and stale schedules never count as open. Two fictional venues have explicitly labelled sample schedules, not live business hours.

Current Cook extension: persistent immediate filters, author/language/version/date/sample evidence, original servings, guarded guided cooking and +1 minute timers, private shopping/ingredient guide, and local creator drafts/publication preparation. See [Cook contract](cook.md) and [readiness](../../docs/COOK_READINESS.md). Ready to submit is Not sent. Use the shared neutral48 rounded-square floating add, centered and keyboard-hidden; latest dock glyphs30/stroke2.2/row56/lens68×44 replace old metrics.
