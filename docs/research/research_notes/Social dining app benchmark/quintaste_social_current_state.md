# QuinTaste Social: current-state inventory and bug / stale-display hunt

Audit date: 2026-10-17. Read-only static audit; nothing was run, so every defect below is "by inspection, not reproduced".
Paths are relative to the project root. Code is dense (very long lines), so line numbers are the reliable pointer.

## 1. Routes, screens and navigation

### 1.1 Route table (under `src/app/social/` unless noted)

| URL | File | Renders | Purpose |
|---|---|---|---|
| `/social` | `src/app/(tabs)/social.tsx:1` | `MeetHomeScreen` (`src/screens/meet/Home.tsx`) | Tab root: People / Events / My plans |
| `/social/filters` | `filters.tsx` | `MeetFiltersScreen` (`meet/Filters.tsx`) | People filters: group size, diet, availability |
| `/social/inbox` | `inbox.tsx` | `MeetInboxScreen` (`meet/Inbox.tsx`) | Open groups; Blocked People header action |
| `/social/chat/[id]` | `chat/[id].tsx` | `MeetChatScreen` (`meet/Chat.tsx`) | Local chat for a group |
| `/social/group/[id]` | `group/[id].tsx` | `MeetGroupScreen` (`meet/Group.tsx`) | Members, sample replies, invite more, plan, confirm, leave, clear, delete |
| `/social/person/[id]` | `person/[id].tsx` | `MeetPersonScreen` (`meet/Person.tsx`) | Fictional profile, Say Hi, Report, Block/Unblock |
| `/social/profile` | `profile.tsx` | `MeetProfileScreen` (`meet/Profile.tsx`) | Own profile, autosaved |
| `/social/create` | `create.tsx` | `MeetCreateScreen` (`meet/Create.tsx`) | Chooser: Food Gathering / Cooking Class / Home Dining |
| `/social/gathering/[id]` (`new` allowed) | `gathering/[id].tsx` | `MeetGatheringScreen` (`meet/Gathering.tsx`) | Gathering create / post / edit / cancel / delete |
| `/social/application/[id]` (`new?kind=class` or `home`) | `application/[id].tsx` | `MeetApplicationScreen` (`meet/Application.tsx`) | Class / Home dining host application |
| `/social/report/[id]` | `report/[id].tsx` | `MeetReportScreen` (`meet/Safety.tsx:13`) | Save report and block |
| `/social/blocked` | `blocked.tsx` | `MeetBlockedScreen` (`meet/Safety.tsx:12`) | Unblock; delete saved reports |
| `/social/plans` | `plans.tsx` | `MeetPlansScreen` (`meet/Plans.tsx:9`) = `Redirect` to `/social?tab=plans` | Alias, still used internally |
| Legacy: `booking/[id]`, `friends`, `host/[id]`, `marks/[id]`, `meal/[id]`, `my-tables`, `reserve/[id]` | same names | `Redirect` to `/social` (7 identical files) | Old meal/Kaki/Tables routes |

Docs say old routes redirect and `/social/plans` redirects: verified. `src/app/_layout.tsx` has no explicit social stack config; `(tabs)/_layout.tsx:15` registers only `Tabs.Screen name="social"`. There is no `/meet` route; "meet" is only a code prefix.

### 1.2 Navigation flow

- Home (`Home.tsx:15-48`): one toolbar (SearchField + Inbox IconButton + MeButton) and `SocialTabs` radiogroup (`components/social/SocialTabs.tsx`). Section is in the URL (`?tab=`, `?eventType=`).
  - Filter button: People opens `/social/filters`; Events toggles an in-page chip row (Gatherings / Classes / Home dining) that sets `eventType`; My plans has none.
  - Create Event `FloatingAddButton` on Events and My plans opens `/social/create`.
  - Guest (non-member): People shows an empty state, "Set up profile" and "Browse Sample Profiles", which commits `samples` (allowed without member, `meet-actions.ts:77`). My plans is behind `MemberGate`.
- Invitation: Person > size chips + opener chips + intro > "Say Hi" > `invite` > push chat for the new group id. Group is `open` with one `invited` peer; chat says "waiting for a reply" (`utils/meet.ts:11`).
- Acceptance (fictional): Group > "Sample Replies" chip > Accept as / Decline as (`components/social/GroupTools.tsx:13`) > `sample-accept` / `sample-decline`. Chat unlocks when any peer is `accepted`.
- Plan: Group > `GroupPlan` (venue, `YYYY-MM-DD HH:mm` Singapore, food) > `plan` resets confirmations. The "I am In" button (`confirm`) needs a full group and future time. "Simulate Group Confirmations" (`sample-confirm`) fills the rest.
- Fill: "Invite More" > `add-person` (needs own `visible`) until `reservedCount == size`.
- Leave > `left`; a left group shows "Group Closed" + Delete Group (`delete-group` removes messages). Clear Messages is offered while messages exist.
- Gatherings: new gathering > Post Gathering / Save Draft > replace to the saved id. Posted: Save Changes / Cancel Gathering. Cancelled: Delete only. Draft: Delete Draft. Deletes return via `/social/plans`.
- Applications: new application with kind > Save Draft / "Save Ready To Submit" (copy: Not sent or approved) > replace to the saved id. Delete returns via `/social/plans`.
- Safety: Person > Report (reason + details) > "Save Report & Block" (report and block are one action). Person > Block (confirm). Inbox header > Blocked People > Unblock / Delete Report.
- Profile switch: `MemberGate` (`components/social/MeetUI.tsx`) offers "Try Local Profile" and passes a return destination preserving `kind`, `tab`, `eventType` and the pathname (with ids).

## 2. Data model

### 2.1 Types (`src/types/meet.ts`, 17 lines)

- `MeetProfile` (line 5): name (40), diet `Vegan|Vegetarian`, area (60), about (180), interests (max 5 x 30), times (subset of `meetTimes`: Weekday lunch / Weekday dinner / Weekends), size 2|4|6, visible, adult, excluded (`MarketIngredient[]`).
- `MeetPerson` = profile + id + `sample: true`; six fictional people in `src/data/meet.ts:2-9` (wei, ana, raj, mei, sara, lin).
- `MeetGroup` (line 7): id, size, intro (300), `peers[{id, status: invited|accepted|declined}]`, state `open|left`, createdAt, venue (160), starts ("YYYY-MM-DD HH:mm" string), food (1000), `confirmations` (literal "self" + accepted peer ids).
- `MeetMessage`: id, groupId, text (1000), createdAt. Only the user messages exist.
- `Gathering` (line 9): title (80), area (60), venue (160), starts, **seats as a string** (max 2 chars), diet, food (1000), state `draft|posted|cancelled`.
- `HostApplication`: kind `Cooking class|Home dining`, name (80), email (160), area (60), experience (1000), menu (2000), ingredients (3000), details (2000), consent, state `draft|ready`.
- `MeetNetwork` (version 2): profile, `samples`, groups, messages, gatherings, applications, blocked[], reports, filters {diet, time, size}. It lives at `FoodDocument.social.network` (`types/social.ts:37`, `emptySocial` line 44).
- Writes: `useMeet().commit` (`hooks/useMeet.ts:11-15`) runs `reduceMeet` inside `food.update` functional updates (atomic, owner-scoped); errors become a notice and return false.

### 2.2 Limits

| Item | Limit | Where |
|---|---|---|
| Groups | 30 | `meet-actions.ts:101`; read throws `meet-schema.ts:25` |
| Peers per group | size-1 non-declined | `meet-actions.ts:35`; read throws `meet-schema.ts:27` |
| Messages | 300 total | `meet-actions.ts:46`; read throws `meet-schema.ts:36` |
| Gatherings | 30 | `meet-actions.ts:73` |
| Applications | 10 | `meet-actions.ts:67` |
| Reports | 50 | `meet-actions.ts:92` |
| Gathering seats | integer 2-30 incl. organiser | `utils/meet.ts:15` |
| Group size | 2/4/6 incl. initiator | `meet-actions.ts:99` |
| Intro | 1-300 chars | `meet-actions.ts:99` |
| Whole FoodDocument | 1,500,000 B serialized guard | AGENTS.md Cook safeguards (global) |

### 2.3 States and guards

- Peer status: invited > accepted | declined (only fictional controls change it). `groupCount` = 1 + accepted; `reservedCount` = 1 + non-declined (`utils/meet.ts:8-9`).
- Confirmations clear on add-person, accept, decline, plan edit, block and leave. `confirm` needs `groupCount == size` and a future start (`meet-actions.ts:55-58`). `sample-confirm` needs `n.samples` and self confirmed.
- Block (`meet-actions.ts:24`) sets every group containing that non-declined peer to `left`; the same is applied on load (`meet-schema.ts:28`); unblock never reopens.
- Profile gate (`utils/meet.ts:4`): name, 18+ declaration, area, at least one time. `visible=true` can only be saved if valid (`meet-actions.ts:86-87`). Gatherings and applications need a valid profile but not `visible`.
- Member = `food.owner === "profile"`; guests may only toggle `samples` and `filters` (`meet-actions.ts:77-79`).

### 2.4 Owner isolation and persistence

- Screens remount with `key={owner + id + ready}`. `mergeMeet` (`meet-schema.ts:41`) unions guest groups/messages/gatherings/applications/reports/blocked into the profile and keeps the profile own `profile`, `samples`, `filters`.
- `Food.tsx:93-94` counts network groups/gatherings/applications/reports (not messages) in the merge count, plus the legacy bookings/drafts/messages/reports.

## 3. Fictional vs user-created, and labelling

| Item | Nature | Label |
|---|---|---|
| Six people (`data/meet.ts`) | Fictional | "Sample profiles · No one is contacted" (`Home.tsx:42`); "Fictional profile · No one is contacted" (`Person.tsx:17`); initial-only `PersonBadge` |
| Accept / Decline | Fictional, user-driven | "Sample Replies" chip; "Only you control these fictional replies." (`GroupTools.tsx`) |
| Group confirmations | Fictional | "Simulate Group Confirmations" |
| Own profile | Local demo | "Local profile · Your details are not published" |
| Chat messages | User only; no peer ever replies | "Local chat · No messages are sent to others"; "You · saved locally"; button "Save Message" |
| Groups / plans | User-created | "Local plan · No venue reservation is made"; "No booking or payment" |
| Gatherings | User-created; Events lists only the user own posted ones | "On this device"; "Posted locally · Not shared with others" |
| Applications | User-created | "Ready to submit · Not sent or approved" |
| Reports | User-created | "Report saved, not sent"; "Saved · Not Sent" |

Opener strings are static (`data/meet.ts:11-12`).

## 4. Bugs and logic defects (ranked; by inspection, not reproduced)

**B1. Declined invitee leaves a zombie group (medium-high).** `utils/meet.ts:9,11`, `Inbox.tsx:10`, `Chat.tsx:19`.
- When the only invitee declines, the group stays `open` with `groupCount == 1`. Inbox says "Awaiting reply" and Chat says "waiting for a reply" although nothing is awaited. No "declined" copy exists.
- Exit routes are only Group > Invite More or Leave. `add-person` drops declined peer rows (`meet-actions.ts:36`), so who declined is lost. `groupName` falls back to "Your group" when everyone declined.

**B2. Corrupt or oversized stored data makes the whole collection unreadable (medium).** `meet-schema.ts:11,27`, `Food.tsx:98`.
- `rows()` and the "group exceeds its size" check throw instead of dropping the item. `mergeMeet` unions guest and profile lists, so a union above 30 groups, 300 messages or 30 gatherings throws inside `readMeet`.
- Scenario: a guest with 20 groups opens the local profile that already holds 15 groups; merge or read throws and the user sees a generic error or "Collection Unavailable" with no way to shrink it.

**B3. People "group size" filter does not filter (medium, misleading).** `Home.tsx:25,33`, `Filters.tsx:20`.
- Size only re-sorts people (`Number(b.size === n.filters.size)`), but the filter button is highlighted for size != 4 and the empty-state "Clear filters" resets diet and time only, not size.
- Scenario: user picks 2, still sees all six people, and the filter icon stays highlighted after Clear filters.

**B4. "Open To Plans" toggle silently reverts (low-medium).** `Profile.tsx:17-22`.
- `set()` forces `visible=false` whenever `meetProfileIssue` is non-null. Tapping the toggle before name/area/availability/18+ appears dead; only the small AutosaveStatus text explains it.

**B5. Interests and avoided-ingredient data (low).** `Profile.tsx:28`.
- The interests field autosaves without updating `p`, so `p.interests` is stale until another `set()` (persistence still correct because `set()` recomputes from the text).
- The 5-item and 30-char caps apply only in the schema; the field can show 8 items while 5 are saved.
- `excluded` (avoided ingredients) is saved but never used in matching, Person, invitations or filters: dead data.

**B6. Past gatherings cannot be edited and never expire (low-medium).** `utils/meet.ts:18`, `meet-actions.ts:72`, `Events.tsx:8`.
- A posted gathering whose start has passed: "Save Changes" fails with "Choose a future date and time." (publish rule applies to posted rows). Only Cancel then Delete remains.
- It vanishes from Events but stays "Posted locally" in My plans. Groups with a past plan show "Past plan" but never complete or archive.

**B7. Date and seat polish (low).**
- `parseSocialDate` (`utils/social.ts:77-82`) is timezone-correct (explicit +08:00 and round-trip check), so there is no UTC date-only bug in Social. But there is no upper bound (year 9999 accepted).
- Display is inconsistent: Group shows the raw `YYYY-MM-DD HH:mm` (`Group.tsx:17`), Events shows `socialDate` which omits the year.
- Gathering `seats` is a free string: "02" passes and shows "02 people", and it is never tied to anything.

**B8. `Action` has no rejection handling (low).** `Shared.tsx:20`: `void run().finally(...)`. `commit` catches internally, but other `run` closures (for example `openProfile` in `MemberGate`) can reject unhandled; after `router.replace` the busy update runs on an unmounted component.

**B9. Navigation churn and param loss (low).**
- Inbox empty-state "Find people" calls `openSocial()` which pushes another `/social` instance (`Inbox.tsx:10`).
- Deletes use `router.replace("/social/plans")`, a redirect screen (extra hop).
- Legacy redirects drop all params and give no message.
- `eventType` stays in the URL after leaving Events (`Home.tsx:21`).
- Back always returns to `/social` (`backTo`), not the previous screen.

**B10. Application note vs unsaved edits (low).** `Application.tsx:24,30`: after editing a `ready` application the note still says "Ready to submit" until saved, and plain "Save Draft" silently downgrades `ready` to `draft`.

**B11. Report always blocks (low).** `Safety.tsx`: no report-without-block path (labelled "Save Report & Block", so honest). The Blocked screen lists reports under a "No Blocked People" empty state after an unblock.

**B12. Dead conditions (cosmetic).** `Person.tsx:16` `!person.visible && !existing` can never be true (all samples visible). `n.samples` can never be switched off by any UI (only `enabled:true` is dispatched, `Home.tsx:41`).

Checked and found sound: capacity (invite, add-person, accept use `reservedCount`/`groupCount`); block guards (`requirePerson`, `meetChatIssue`, group block check); past-date guards on plan, confirm and publish; duplicate message ids ignored; all writes are functional atomic updates; confirmations reset on any membership or plan change.

## 5. Stale display and legacy leftovers

1. **Whole legacy Tables / meal booking / Kaki stack is still compiled but unreachable.**
   - `src/screens/social/*` (17 files) are imported only by each other and by `useSocial`; no route imports them.
   - Also dead: `src/state/social-actions.ts`, the legacy half of `social-schema.ts`, `src/types/social.ts` (Kaki, bookings, marks, connections, HostDraft), `src/data/social.ts`, `src/components/social/BookingTools.tsx`, `src/hooks/useSocial.ts`.
   - `components/social/Shared.tsx` still exports `MealCard`, `SocialReady`, `socialBack` (imports `useSocial`, `photos`, `availableSeats`, `socialPrice`).
   - `utils/social.ts` is shared: `parseSocialDate` / `socialDate` are used by meet code but live in a booking module.
   - `FoodDocument.social` still carries slots, bookings, marks, connections, messages, reports, drafts, filters, profile, rulesAccepted; `Food.tsx:93` still counts them.
2. **Duplicated concepts:** `SocialMessage` / `SocialReport` / `blocked` vs `MeetMessage` / `MeetReport` / `blocked` in `MeetNetwork`; two each of Chat, Inbox, Person, Profile, Filters, Report screens; `social-schema.ts:37` migrates legacy block/profile into the network.
3. **Terminology:** UI says Social (tab), "Food Company" (Person title; Profile title "Your Food Company"), "Food Gathering", Group, Plans. Code says `meet*`. PRD docs still say Tables (QT-021 "Tables profile and friends", QT-028 "Spark Tables"). `LocalNote` default text is still "Sample meals · On this device" (`Shared.tsx:14`).
4. **Cross-domain import:** `src/screens/food/MyRecipes.tsx:8` imports `LinkRow` from `components/social/Shared`, which pulls the legacy `useSocial`/photos modules into Cook.
5. **Misleading labels:** "Save Message" (not Send; intentional but odd); "View Invitation / Sample reply controls" (`Chat.tsx:19`) is jargon; "Awaiting reply" persists after decline (B1); Events looks like discovery but lists only the user own gatherings; "Prefers N" appears on cards but not on the Person page.
6. **Hard-coded colours / directional borders:** none found in `src/screens/meet`, `src/screens/social`, `src/components/social` (no hex/rgba/named colours, no border-left/right/top/bottom). Everything uses `theme.*` and `Card`. `SocialTabs` uses a full-perimeter 1px border for focus (allowed).
7. **Touch targets:** `SocialTabs` tabs minHeight/minWidth 48; shared `Chip`, `IconButton`, search clear are 48 (`components/food/Controls.tsx:97-106`). `LinkRow` has no explicit minHeight but 12 padding plus text exceeds 48 in practice. No target under 48 found by inspection (not measured).
8. **Docs vs code:** Create Event FAB, `/social/plans` redirect and no-automatic-replies all match docs. AGENTS.md "samples off" state is reachable only before first sample enable; no UI turns samples off.

## 6. File sizes (lines; bytes in brackets)

Line counts are small but lines are very long (about 55 KB across `screens/meet`).

| File | Lines |
|---|---|
| `src/state/meet-actions.ts` | 105 (10,086 B) |
| `src/state/meet-schema.ts` | 43 (5,593 B) |
| `src/screens/meet/Home.tsx` | 48 (4,267 B) |
| `meet/Gathering.tsx` | 29 (4,392 B) |
| `meet/Application.tsx` | 33 (4,136 B) |
| `meet/Profile.tsx` | 33 (3,512 B) |
| `meet/Chat.tsx` / `Person.tsx` / `Group.tsx` | 28 / 26 / 25 |
| `meet/Safety.tsx` / `Plans.tsx` / `Filters.tsx` / `Events.tsx` / `Inbox.tsx` / `Create.tsx` | 19 / 31 / 26 / 13 / 12 / 10 |
| `src/components/social/` Shared 49, MeetUI 34, SocialTabs 36, GroupTools 23, BookingTools 27 | 169 |
| `types/meet.ts` 17, `data/meet.ts` 12, `utils/meet.ts` 26, `hooks/useMeet.ts` 17, `utils/social.ts` 82 | |
| Legacy: `screens/social/*` 17 files (approx 340 lines), `social-actions.ts` 112, `social-schema.ts` 60, `types/social.ts` 44, `data/social.ts` 24 | |

Nothing approaches the 2,000-line limit. The real risk is density (single lines of 300 to 1,700 characters); reformat when touching them.

## 7. Constraints a redesign must preserve

From AGENTS.md (People-first Social; Social, Game and Saved navigation; Cook and navigation refresh) and `.impeccable/surfaces/social.md`:

- People-first model: opt-in, introduce, chat before the meal, arrange together. No meal booking, no dating/romance, no Kaki marks. Old booking/check-in/Kaki routes redirect; old records stay private and exportable.
- Group totals 2/4/6 including the initiator. Gatherings 2-30 including the organiser, no host approval or fee. Cooking classes and Home dining are separate approval categories: draft/ready only, "Not sent / Not approved", no self-approval, neighbourhood only (no exact home address or identity documents).
- Profile: first name, neighbourhood, diet, availability, preferred size, optional About/interests, avoided ingredients, 18+ self-declaration and explicit Open to plans. Pausing stops new invitations but keeps chats.
- Invitation stays pending until the recipient accepts; chat opens for accepted participants only. No automatic peer replies; fictional controls stay explicit ("Simulate...", "Sample Replies").
- Plan needs a public place, future Singapore date/time and food arrangements; group must be full and every participant must confirm. Edits and membership changes reset confirmations.
- Block closes affected groups; unblock never restores them. Messages can be cleared; closed groups deleted with messages; unsent reports deleted without removing blocks.
- Layout: titleless root, single toolbar (search + Inbox + Me), one segmented People / Events / My plans row, contextual filters only on People and Events (immediate save, no Apply/Reset), event category kept in the URL, centred shared 48-unit `FloatingAddButton` on Events and My plans (hidden with the native keyboard), `/social/plans` redirects to `/social?tab=plans`, Try-local-profile recovery keeps route params (selected person, tab, event category, application kind).
- Keep action-level guards in `reduceMeet` (member, visibility, capacity, acceptance, future time, block) and owner-scoped bounded persistence (limits in 2.2). Keep honest local-only copy: Not sent, Not approved, No one is contacted, On this device.
- Visual: Nunito, semantic tokens from `src/theme/tokens.ts` (no hard-coded colours), no directional accent borders, 48-unit minimum targets, three palettes x light/dark/system, reduced transparency and large-text support, keyboard radiogroup behaviour of `SocialTabs`.
- Out of scope per docs: live profiles, delivered messages, shared event publication, identity verification, host review, moderation delivery, payments, database. Physical-device acceptance is unverified; do not claim it.
- Evidence to keep valid: `.impeccable/review/social-distill-*.json`; update `docs/PRD_COVERAGE.md` rows QT-021/023/025/026 after changes.
