# Social: you do not have to eat alone

Date: 20 October 2026 (revised the same day after owner feedback). Scope: the Social tab (People / Events / Areas / My plans), the person page, the profile editor and the invitation flow. Code read: `src/screens/meet/{Home,Person,Profile}.tsx`, `src/types/meet.ts`, `server/social/schema.sql`, `server/areas/schema.sql`, `docs/AREA_PARTICIPATION.md`. Builds on the 17 October [Social dining app benchmark](Social%20dining%20app%20benchmark.md). Nothing here is built.

Owner decisions recorded here: QuinTaste does not seed or host tables; members plan their own. First meetings are tables of 4–6, not 1:1. Discovery is area-based: the app tells a member how many vegetarian/vegan members share their Home or Work area and where those members usually eat. Profiles carry the practical facts locals look for in a partner (religion, hobbies, things in common). No Singpass verification.

## The short version

The People tab is dull because it is a directory. A row shows an initial, a first name, a diet label, an area and one About line. Nothing on it answers the questions a stranger asks before inviting anyone: *Who is actually around me? Will I like eating with this person? Is it normal and safe to ask? What exactly am I asking for?*

Six changes carry most of the value:

1. **"Your areas" at the top of Social.** From the live Area Participation data: *Tanjong Pagar (Work): 50+ vegetarian members · usual spots: Fortune Centre, Nature Cafe, Greendot Tanjong Pagar.* Then one action: **Start a lunch table here**.
2. **Member-started tables that other members can find.** Today a member can only see their own gatherings. A self-organised model fails without a feed. Tables are listed by area and spot, seats shown as avatars, join in one tap.
3. **Bring a kaki.** Join or invite as a pair so the default first table is 2 + 2. The one-to-one table unlocks only after a member has completed a group table.
4. **An invitation is a plan, not a chat.** Slot, spot, seats and who pays on the card; a 72-hour reply window; "Suggest another slot" as the soft no.
5. **A profile that reads like a person**: photo or avatar, age, religion, why plant-based, hobbies with "in common" chips, languages, education, work, three food prompts, and a real attendance record.
6. **Comfort rules without identity checks**: self-declared gender used only for table balance, same-gender tables, daytime defaults, public catalogue venues, attendance history as the trust signal.

## 1. Why people do not invite today

| Barrier | What the screen does now | Evidence |
|---|---|---|
| No sense of who is around | People is a flat list with no area context, although Areas already shows weekly bands | Pie's time in app rose from about 2 to about 10 minutes when it showed which connections were attending ([TechCrunch](https://techcrunch.com/2026/08/25/andy-dunns-startup-pie-becomes-less-of-an-events-app-and-more-of-a-social-network/)) |
| Nothing to react to | Initial, name, diet, area, one About line | Photos dominate first impressions; bio text has a much smaller effect ([Witmer et al. 2025 via GDI](https://www.globaldatinginsights.com/featured/profile-photos-dominate-first-impressions-in-online-dating-halo-effect/)) |
| Asking feels like a come-on | "Say Hi" with free text is socially ambiguous | 48% of Gen Z daters hold back for fear of seeming "too much" ([Hinge 2025 Gen Z D.A.T.E. report](https://hinge.co/newsroom/2025-GenZ-Report)) |
| 1:1 with a stranger of the other gender is awkward locally | Group size defaults to the inviter's preference, 2 allowed | Tinder's Double Date test: women about three times more likely to accept a pair than an individual ([LBC](https://www.lbc.co.uk/tech/tinder-double-date-app-new)) |
| Being the only woman | No composition rule | Timeleft's most common complaint ([Trustpilot](https://www.trustpilot.com/review/timeleft.com)); Timeleft runs women-only tables ([Timeleft](https://timeleft.com/post/meet-5-women-over-dinner/)) |
| Cannot find other people's tables | Events lists only the member's own gatherings | Benchmark gap "Browse others' gatherings, RSVP, waitlist: Missing" |
| No proof anyone shows up | Confirmations exist, attendance does not | Timeleft charges for no-shows ([Timeleft help](https://help.timeleft.com/hc/en-150/articles/25012703925148-What-Is-the-No-Show-Penalty-Fee)); QuinTaste takes no money, so visibility is the lever |

## 2. Positioning: makan first, romance allowed, never a dating app

Borrow dating apps' trust and profile mechanics, not their matching mechanics.

- Vocabulary: "makan", "table", "kaki", "plan". Never "date", "match", "like", "crush".
- One intent chip, **Here for**: *New friends* / *Makan kakis* / *Open to more*. Default *Makan kakis*. "Open to more" is self-declared, visible and filterable. No swipe deck, no mutual-reveal mechanic.
- Who pays defaults to *Own* and is printed on every table and invite.
- Public venues only, from the Explore catalogue. Home dining stays behind its application flow.

## 3. Your areas: the suggestion engine

Area Participation (live since 17 October) already stores one planning-area code per member per layer (Home, Work), publishes weekly bands (10+, 20+, 50+, 100+; under 10 is not disclosed) and prefills "Plan A Gathering Here". Build on it rather than beside it.

### What the member sees

A card at the top of Social > People, one per joined layer:

```
Tanjong Pagar · Work
50+ members · Vegetarian 20+ · Vegan 10+
Usual spots: Fortune Centre · Nature Cafe · Greendot Tanjong Pagar
3 tables this week
[Start a lunch table]   [See tables]
```

- **Counts** come from the existing weekly snapshot, extended with a per-label split (Vegan / Vegetarian / Plant-Based from `diet-labels`). Each split obeys the same minimum of 10; a label under 10 is simply omitted, never shown as a small number.
- **Usual spots** come from a new opt-in profile field, *My usual spots*: up to three catalogue places. The area card lists a spot only when at least three participating members in that area and layer chose it. Spots are catalogue places, so each has hours, a Menu link and a map.
- **Tables this week** counts member-started tables whose spot is in that area.
- A member who has not joined a layer sees the card with *Count me in* instead of numbers, which is the existing Location flow.

### Why this is the right wedge

Work-area weekday lunch is the most natural mixed-gender meal in Singapore. It is daytime, public, short, cheap, at a hawker centre or food court, and everyone pays their own. Colleagues do it without a second thought. The app only has to make "colleagues" out of "members who work around here". Home-area weekend brunch is the second wedge.

### The weekly nudge

One push or in-app notice per week, only to members who joined a layer: *12 members near Jurong East usually eat at Fortune Centre on weekdays. Start a table?* Never a streak, never a countdown, consistent with the Game home rules. Members can turn it off in Notifications.

### Privacy, kept as it is

Only the planning-area code leaves the device. Home area is never shown on a profile; a member chooses which area label to display (Work, or a hand-typed "Usually eat around"). Usual spots are public by choice. Counts are bands, never exact. Blocked members do not see each other's tables.

## 4. Tables that members start and others can join

This is the missing feed. Without it, "plan it yourselves" means "message strangers one by one".

**A table** has: spot (a catalogue place), day and slot, seats (4 or 6), diet labels the table keeps, who pays, optional *Same gender* flag, host, seats taken (avatars), one-line note. Any member with a complete profile may start one. Others join in one tap. Chat opens when the table reaches 3 (of 4) or 4 (of 6); the table locks 24 hours before the slot; a past table archives.

**Where tables appear**

- Social > People, under the Your areas card: *Tables near you this week*, filtered to the member's joined areas and default location.
- Social > Events: a *Tables* type beside Local events and Gatherings.
- Explore place page and card: *2 tables here this week* or *Start a table here*. This is the cheapest acquisition into Social, from the most-used tab.
- Areas map: *N tables this week* on the area card.

**"Eat today."** A table whose slot is today shows a *Today* pill and sorts first. A member at Fortune Centre at 11:40 can post *Table for 4 at 12:30, 3 seats left*; members whose Work area matches see it immediately. Spontaneous, low stakes, daytime.

**Guards** reuse Market and Social code: signed-in, DOB-checked, unrestricted account; capacity checked inside the transaction like Market slots; blocks hide each other's tables; reports go to the case queue; two no-shows pause *Open to plans* for 30 days.

**Gatherings** (2–30, existing) stay for larger or special events; a table is the small, fast, repeatable unit.

## 5. Bring a kaki

Joining a table or inviting a person offers *Bring a kaki*: pick someone you have already shared a completed table with, or send a one-time link to a friend who installs the app. Two seats are reserved together; declining as a pair frees both.

- The default first invite is a table of 4, pre-filled 2 + 2.
- **A 2-person table needs one completed group table first.** A stranger is never asked to a 1:1 meal by someone with no attendance history. This is a single check on the inviter's attended count.
- Pair links are the referral loop. No coupons.

## 6. The invitation card

Replace *Say Hi* + free text with a card the recipient can act on at a glance:

```
Lunch · Sat 25 Oct, 12:30
Fortune Centre, Middle Road          Open 10:30–21:00 · Menu
Table of 4 · 2 seats taken · Everyone pays their own
Keeps: Vegetarian
In common: Both free Sat lunch · Both Buddhist · Both hike
Message (≤300): …
[Accept]   [Suggest another slot]   [Not this time]
```

- Slot chips from the overlap of both members' *Usually free* times (existing `overlap()`).
- Spot suggestion: the inviter's or recipient's usual spots first, then catalogue places near the shared area that are open at that slot.
- **Opening Move**: a recipient may set one question on their profile ("What's your go-to hawker order?") that an invite must answer. Bumble reports higher chat initiation and reply rates and longer conversations from its version ([TechCrunch](https://techcrunch.com/2026/08/11/bumble-ditches-its-rule-that-kept-men-from-making-the-first-move/)).
- 72-hour reply window, then a quiet expiry line. *Suggest another slot* is a decline that keeps the door open.

## 7. Profile: the practical facts locals look for

Across 2024–25 surveys the qualities people say they want are consistent: honesty and kindness first ([Marriage Foundation 2025](https://marriagefoundation.org.uk/wp-content/uploads/2025/10/MF-Press-Release-Green-flags-Red-flags.pdf)), then humour, listening and common interests ([Readly via Yorkshire Post](https://www.yorkshireeveningpost.co.uk/lifestyle/experts-say-good-looks-are-no-longer-a-dating-priority-heres-what-people-are-really-looking-out-for-4987295); [Mintel](https://www.mintel.com/press-centre/swipe-right-for-a-sense-of-humor-72-of-single-americans-say-a-shared-sense-of-humor-is-important)), with trustworthiness and shared values at the top of Tinder's 2025 survey ([PinkNews](https://emdash.thepinknews.com/2024/12/06/golden-retriever-partner-tinder)). Those are shown through prompts and behaviour, not fields. The fields are the filters people apply before they read anything: Hinge groups them as Vitals (age, height, location, ethnicity, family plans, pets, zodiac), Virtues (job, education, religion, hometown, languages, intentions) and Vices (drinking, smoking), each with a *Visible on profile* switch ([Hinge help](https://help.hinge.co/hc/en-us/articles/360011053094-How-do-I-edit-my-profile)). For Singapore, Lunch Actually's regional survey found men ranked age first and women ranked education level first ([Yahoo SG](https://sg.news.yahoo.com/priorities-daters-singapore-malaysia-evolved-post-covid-survey-085245523.html)), and the 2024 Marriage, Family and Social Discourse survey found people with a religion markedly more interested in marriage than those without ([Salt&Light](https://saltandlight.sg/news/4-key-findings-from-the-marriage-family-and-social-discourse-survey-supplementary-report-on-religion/)). Religion is a first-order sort in Singapore, and for Muslims it carries legal consequences for marriage, so it belongs near the top and is never hidden behind a tap.

Every field below is optional, has its own *Visible on profile* switch, and is deleted with the account. "Card" means it appears on the People row; "Page" means the person page.

| Field | Choices | Where | Why |
|---|---|---|---|
| **Photo / avatar** | Real photo, or the member's existing generated avatar as the default | Card | Largest single effect on interest; no profile is ever a blank initial |
| **Age** | Exact age from the DOB check, or band (20s/30s/40s/50+) if the member prefers | Card | SG men's top criterion (Lunch Actually); Timeleft keeps tables within ~10 years |
| **Here for** | New friends / Makan kakis / Open to more | Card | Intent is the first filter; removes ambiguity |
| **Religion** | Buddhist, Taoist, Christian, Catholic, Muslim, Hindu, Sikh, Jain, Free thinker, Spiritual, Other, Prefer not to say | Card | First-order sort locally; Hinge Virtue; also explains many members' diet |
| **Why plant-based** | Religion, Ethics, Health, Environment, Family, Taste | Page, and one chip on the card when it matches the viewer | Unique to QuinTaste; a values signal and a built-in icebreaker |
| **Hobbies** | Multi-select from a bank of ~40 (hiking, cycling, badminton, pickleball, bouldering, running, gym, yoga, board games, K-drama, anime, gaming, photography, café hopping, baking, gardening, temple volunteering, travel, live music, reading…) plus up to three free-text | Page; *In common* chips on the card | "Common interests" ranks third in the Readly survey; Hinge's interest tags |
| **In common** | Computed: hobbies, religion, why plant-based, free times, languages, usual spots, area | Card, two chips max | The thing people actually scan for |
| **Languages** | English, Mandarin, Malay, Tamil, Hokkien, Cantonese, Teochew, Hakka, Japanese, Korean, other | Page | A table that cannot talk is a failed table; Hinge Virtue |
| **Education** | Secondary, Diploma, Degree, Postgraduate, Prefer not to say | Page | SG women's top criterion (Lunch Actually); Hinge Virtue |
| **Work** | One line, 40 characters ("Nurse", "Civil service", "Runs a bakery") | Page | The first question at any Singapore table; Hinge Virtue |
| **Ethnicity** | Chinese, Malay, Indian, Eurasian, Other, Prefer not to say | Page, off by default | Standard on Hinge and CMB and used locally; sensitive, so opt-in display |
| **Grew up in** | Singapore, Malaysia, or free text | Page | Local versus newcomer matters to locals; Hinge Hometown |
| **Height** | cm | Page | Heavily filtered on in the region; optional |
| **Drinking / smoking** | No / Sometimes / Yes | Page | Hinge Vices; the plant-based community skews alcohol-free, and gatherings already carry `alcohol_free` |
| **Family plans** | Want kids / Don't / Open / Have kids | Page, shown only when *Here for* is *Open to more* | Hinge Vital; irrelevant to makan kakis |
| **Chinese zodiac** | Derived from the DOB check, display optional | Page | Some families still check compatibility; costs nothing |
| **Pets** | Dog / Cat / Other / None | Page | Hinge Vital; dog photos test well for men ([Kennesaw State 2026](https://www.kennesaw.edu/news/stories/2026/ksu-research-shows-win-dating-apps.php)) |
| **Usual spots** | Up to three catalogue places | Page; feeds the area card | Where the first table will probably be |
| **Three food prompts** | From a bank of ~20: *My go-to hawker order*, *A dish I'll cross the island for*, *I can teach you to cook…*, *Teach me…*, *My kopi order says*, *The stall I'd defend in an argument* | One on the card, three on the page | Humour and values come through prompts, not fields |
| **Opening Move** | One question invites must answer | Page | §6 |
| **Attendance** | *4 tables · 0 no-shows*, computed | Card | Reliability is the scarce good |
| **Cooked N recipes** | Count of the member's existing `cooked` reactions | Card | Unique, credible taste signal |
| **Kaki says** | One line (≤80 chars) from someone they shared a completed table with; owner approves up to three | Page | Hinge's Friends' Takes, but only from real tablemates ([GDI](https://www.globaldatinginsights.com/featured/hinge-introduces-friends-take-feature-for-profile-contributions/)) |
| **Usually replies within…** | Computed | Page | Reduces ghosting fear |

**Leave out:** political views, income or salary band, housing status, exact birth date, exact address, voice prompts, star sign beyond the Chinese zodiac, anything that needs a paragraph.

**PDPA note:** religion and ethnicity are personal data the member volunteers for a stated purpose (finding dining company and, if they choose, partners). Show the purpose once at the field, keep display opt-in, export with the account data, delete with the account. Never use them for ranking that the member cannot see.

### The People card

Inside one card (semantic tokens, 48-point targets, no directional borders):

1. Photo or avatar (64) · first name · age · *Here for* chip · religion chip.
2. One prompt answer in quotes.
3. Two *In common* chips.
4. One muted line: `Tanjong Pagar · Vegetarian · 4 tables, 0 no-shows · Cooked 12`.
5. **Invite to a table**. Secondary: **Bring a kaki**.

### The People tab, top to bottom

1. Your areas cards (§3).
2. Tables near you this week (§4).
3. Observance chip (existing).
4. People, sorted by number of *In common* chips, then recency.
5. Filters gain: religion, hobbies, languages, *Here for*, age range, same area.

## 8. Comfort and safety without Singpass

- **Self-declared gender**, optional, used only for two things: the composition rule and same-gender tables. It can stay hidden on the profile.
- **Composition rule:** a mixed table of 4 or 6 is never one woman and the rest men. The join that would create that is refused with *This table needs one more woman first* and the seat is held 24 hours. Timeleft says women often exceed 60% of its diners ([Timeleft](https://timeleft.com/de/post/timeleft-algorithm-the-maestro-of-your-dinners/)), so the rule rarely bites but it is what makes women join.
- **Same-gender tables** as a host flag and a filter.
- **Daytime default**: the first suggested slot is lunch or brunch.
- **Public catalogue venues only**; a table cannot be created at a free-text address.
- **1:1 unlock** after one completed group table (§5).
- **Attendance** marked by any member after the slot; two unexcused no-shows pause *Open to plans* for 30 days. No money.
- **Trust signals instead of identity checks:** attendance record, *Kaki says*, *New member* label until the first completed table, and later an optional selfie photo check (Match reports bad-actor interactions down over 50% where it runs ([GDI](https://www.globaldatinginsights.com/featured/hinge-expands-face-check-testing-adds-direct-to-date-feature/))).
- **Share my plan** with a trusted contact: place, time, first names to Messages or WhatsApp in one tap.
- **Report means never seated together again**, extended from blocks to tables.
- **Table talk cards** in the pre-meal chat: three question cards drawn from the members' prompts and *Why plant-based* answers. Hinge found 85% of daters more likely to want a second meeting when asked thoughtful questions ([Hinge 2025](https://hinge.co/newsroom/2025-GenZ-Report)).
- Singapore's Online Safety Commission 24-hour escalation route still needs a staffed report intake before promotion scales.

## 9. Loops that use what QuinTaste already has

- **Explore → table**: *Start a table here* on place pages and cards; *N members near here usually eat here*.
- **Cook → table**: *Cook this together* creates a Potluck gathering where each seat brings one Cook recipe.
- **After the meal**: one sheet, three taps: *Attended*, *Would eat again with…*, *Kaki says*. Mutual *Would eat again* unlocks **Repeat** (invite past tablemates in two taps, as Timeleft does ([Timeleft](https://timeleft.com/post/timeleft-repeat-reconnect-with-friends/))).
- **Café credits**: one cosmetic for the first attended table. No streaks, no paid randomness.
- **Observance days**: the existing lunar chip also highlights tables that keep Vegetarian on the 1st and 15th.

## 10. Promotion

Members plan their own tables, so promotion has to recruit people into areas, not into events.

1. **Count Me In is the campaign.** Every push is "join your Work area and see who eats near you". The Areas map with bands is the shareable asset.
2. **Telegram**: a QuinTaste channel per region (Central, East, North, West) that posts new tables with deep links; the plant-based community already lives on Telegram.
3. **The orphaned Meetup**: Singapore Vegetarian Meetup has 5,473 members and no events; invite its organisers to post their gatherings as QuinTaste tables.
4. **Festival and temple calendar**: Singapore Vegan Festival and the Kong Meng San Vesak vegetarian fair, with a QR to "see who eats near you".
5. **Creator clips**: "I joined a vegetarian lunch table near my office" on TikTok and Lemon8, filmed at catalogue hawker centres.
6. **Venue partners**: a reserved table of 6 on a slow weeknight in exchange for the listing; no money changes hands.
7. **Paid social** only after the area → table → attended funnel is measured.

## 11. What to measure

| Metric | Why |
|---|---|
| Members joined to at least one area layer | Supply for the suggestion engine |
| Profiles with photo or avatar, religion, ≥3 hobbies, ≥1 prompt | Supply quality |
| Tables started per area per week; fill rate; time to fill | Does self-organising work |
| Invite → accept → confirmed → attended | The funnel |
| Share of tables with ≥2 women; share of women among attendees | The comfort goal, measured |
| No-show rate | The thing that kills repeat |
| Repeat rate (second table within 30 days) | Retention |
| Reports per 100 tables; time to first staff response | OSC readiness |

## 12. UI/UX design plan

The plan keeps the existing system: titleless root with one search box (filter button inside, never a count badge), icon-only tabs with accessible labels, grouped lists from `GroupedList.tsx`, Nunito, semantic tokens, 48-point targets, full-perimeter borders only, keyboard-only focus rings, no helper paragraphs (one line in `FirstRunState` only). What changes is that Social stops being a list of rows and becomes a set of cards with faces, places and seats.

### 12.1 Information architecture

| Tab (icon) | Today | Proposed |
|---|---|---|
| 1 | People | **Nearby** (`location-outline`), the new default landing: Your areas cards, Tables near you, map toggle. Replaces the Areas tab and absorbs its map |
| 2 | Events | **People**: the new person cards, sorted by In common |
| 3 | Areas | **Tables** (`restaurant-outline`): every joinable table, with type pills *Tables* (default) / *Gatherings* / *Local events* |
| 4 | My plans | **My plans** (`calendar-outline`): Needs you / Upcoming / Past, plus the profile row while incomplete |

Search placeholder follows the tab: *Find areas or spots* / *Find people* / *Find tables* / *Find my plans*. Inbox stays in the header. The floating add button appears on Tables and My plans (Nearby already has Start a lunch table) and opens **Start a table** (gatherings are a choice inside it).

### 12.2 First-run onboarding (first open of Social, signed in and DOB-checked)

Four short full-screen steps with a progress bar and Skip on each. Every step saves immediately.

1. **Your areas.** Home and Work rows with *Count me in* switches (existing Location flow, one confirmation each).
2. **Your face.** The member's avatar pre-selected; *Use a photo* secondary.
3. **The basics.** First name, Here for, religion, diet labels (prefilled from Food Choices), languages. Chips, no typing except the name.
4. **Your usual spots.** Catalogue search limited to the member's areas; pick up to three.

Finishing lands on Nearby with the member's own area card filled in. The profile can stay hidden; *Open to plans* is a switch on the last screen, off by default.

### 12.3 Nearby (default tab)

```
[ Find areas or spots           ⚙ ]  💬
 ◉Nearby   ○People   ○Tables   ○Plans
┌─────────────────────────────────────┐
│ 💼 Tanjong Pagar · Work             │
│ 50+ members                          │
│ [Vegetarian 20+] [Vegan 10+]        │
│ ◯◯◯  Fortune Centre                 │
│ ◯◯   Nature Cafe                    │
│ ◯◯   Greendot Tanjong Pagar         │
│ [ Start a lunch table ]  3 tables › │
└─────────────────────────────────────┘
┌ 🏠 Tampines · Home ─────── … ───────┐
Tables near you this week            See all ›
┌──────────┐ ┌──────────┐ ┌──────────┐
│ TODAY    │ │ SAT 25   │ │ SUN 26   │
│ 12:30    │ │ 11:00    │ │ 18:30    │
│ Fortune  │ │ Tampines │ │ Bugis    │
│ ◉◉○○ 2/4 │ │ ◉◉◉○ 3/4 │ │ ◉○○○○○   │
└──────────┘ └──────────┘ └──────────┘
[ Show map ]
```

- **Area card**: layer icon (home/briefcase), area name, band, diet-split pills (only splits at 10+), up to three usual spots each with stacked avatar dots representing *members who chose it* (decorative, no faces, accessible label "Usual spot for members here"), primary *Start a lunch table* (Work) or *Start a brunch table* (Home), trailing *N tables ›*.
- An area under 10 shows *Not enough yet* and the action *Start a table anyway*; never a small number.
- A layer not joined shows the area row with a *Count me in* button instead of numbers.
- **Table chips** in a horizontal edge-scroll row (`HorizontalChips bleed`): date tile, time, spot, seat dots with filled dots for taken seats. *Today* uses the accent pill.
- **Show map** swaps the lower half for the existing `AreaMap`; area taps open the same area card.
- Empty state (no layer joined): `FirstRunState` icon map, title *See who eats near you*, one line, action *Count me in*.

### 12.4 People

```
┌─────────────────────────────────────┐
│ (photo)  Mei, 29   [Makan kakis]    │
│          [Buddhist]  ✓ 4 tables     │
│ "Go-to order: yong tau foo, extra   │
│  bittergourd"                        │
│ [Both hike] [Both free Sat lunch]   │
│ Tanjong Pagar · Vegetarian · Cooked 12│
│ [ Invite to a table ]  [ + kaki ]   │
└─────────────────────────────────────┘
```

- One card per person, full perimeter border, 16 radius, 12 gutter. Photo/avatar 64 on the left; name 18 bold; age and chips on the same line, wrapping at large text.
- Chip tones: *Here for* = accent soft; religion and diet = neutral; *In common* = success soft with a check icon; attendance = muted text with a check, never a pill.
- One prompt answer, two lines max, in quotes, italic off (Nunito italics read poorly).
- Two actions, both 48 tall. *+ kaki* is an icon-and-label secondary.
- Tapping the card body opens the person page. *Invite to a table* opens the invitation sheet directly.
- A *New member* pill replaces the attendance line until the first completed table.
- Sort: In common count, then recency. No infinite scroll: pages of 20 with a *Show more* row.

### 12.5 Person page

Top to bottom: photo carousel (avatar first if no photo, dots for paging), name and age, chips row (Here for, religion, diet, Verified photo when it exists), *In common* group (all matches, not just two), three prompt cards, **About** list rows (work, education, languages, grew up in, height, drinking, smoking, pets, family plans, zodiac; each only if visible), **Usual spots** as three small place cards linking to Explore, **Kaki says** quotes with the writer's first name, attendance line, Opening Move question at the bottom right above the sticky action bar.

Sticky bottom bar: *Invite to a table* primary, *+ kaki* secondary. ••• menu keeps Report, Block, Safety.

### 12.6 Invitation sheet (sender)

A bottom sheet, not a new screen, so the person stays visible behind it.

1. **When**: chips of overlapping free slots for the next 7 days (*Today 12:30*, *Sat 11:00*…), then *Other time* opening the existing `SgDateTimeField`.
2. **Where**: three spot cards (usual spots first, then catalogue places open at that slot near the shared area); *Search places* row.
3. **Table**: 4 / 6 segmented (2 only when unlocked, with a lock icon and accessible hint otherwise); *Bring a kaki* row; *Same gender* switch; *Who pays* defaults to Own.
4. **Message**: the recipient's Opening Move question as the field label when set; opener chips from the recipient's prompts ("Ask about yong tau foo").
5. **Send invite**, disabled until message is non-empty.

The sheet shows a live preview of the card the recipient will see at the top, collapsed to one line.

### 12.7 Invitation card (recipient, in Inbox)

The card from §6, rendered as a bubble-width card at the top of the thread with three buttons: *Accept* (primary), *Suggest another slot* (secondary, opens the When step only), *Not this time* (link). A 72-hour countdown appears only as muted text ("Reply by Thu"); no timers or red states.

### 12.8 Table detail

Header block: spot photo (catalogue cover) with the spot name and hours chip over the existing blur treatment, date tile, time, *Who pays*, diet labels kept. **Seats** row: avatars for taken seats with first names under each, empty circles for open seats; tapping a face opens that person. Host row. Note. Action: *Join* (or *Join with a kaki*); for members, *Open chat*, *Share my plan*, *Leave*. If the composition rule blocks a join: the button reads *Needs one more woman first* and is disabled with that as its accessible hint; no paragraph.

### 12.9 Start a table

One scrolling form in three `FormSection`s, autosaved as a draft:

- **Where and when**: spot picker (catalogue only), slot chips, date/time field.
- **Table**: 4 / 6, diet labels kept (prefilled from the host), who pays, same gender, alcohol-free.
- **Note**: one line, 120 characters.

*Post table* at the bottom. After posting: the table detail with a *Share* action (deep link for Telegram/WhatsApp).

### 12.10 Chat additions

- Plan bar at the top (existing) shows seat avatars and *Share my plan*.
- **Table talk** chip above the composer opens three question cards drawn from members' prompts ("Ask Wei why plant-based"). Tapping inserts the question into the field; nothing is sent automatically.
- System lines for joins, leaves, spot or time changes and expiry (existing pattern).

### 12.11 After the meal

A sheet that opens once, the first time the member opens the app after the slot ends (also reachable from My plans > Past):

1. *Did you go?* Yes / No / Plans changed.
2. *Eat again with…* faces of tablemates, multi-select.
3. *Kaki says* (optional, one line per person).

*Done*. Mutual *Eat again* makes a **Repeat** row appear on My plans: *Eat with Mei and Raj again*.

### 12.12 Profile editor

Restructure `Profile.tsx` into the same sections as the person page so the member sees what others see:

- **Preview** button in the header shows the member's own card exactly as People renders it.
- Sections: *Photos*, *Basics* (name, age display, Here for, gender, religion, ethnicity), *Food* (diet, practice, why plant-based, avoid, usual spots), *About* (hobbies, languages, education, work, grew up in, height, drinking, smoking, pets, family plans), *Prompts* (three slots, pick from the bank), *Opening Move*, *Plans* (group size, usually free).
- Every optional field row has an eye icon toggle on the right for *Visible on profile* (accessible label "Show religion on profile"). Hidden fields are still used for In-common chips only if the member allows it (one switch at the top of the section).
- A completion meter (*Profile 6 of 10*) counts only the fields that drive matching: photo, Here for, religion, 3 hobbies, 1 prompt, languages, usual spots, free times, area, diet.
- Hobbies use a searchable chip grid; prompts open a picker sheet then a 100-character field.

### 12.13 Filters (People and Tables)

Grouped `FilterSection`s, immediate apply, *Done* only: Here for, age range (two-thumb slider, 18–70), religion (multi), diet labels, languages, hobbies, same area, free time, group size. Tables adds day (Today / This week / Weekend), spot area and same-gender only. The filter button shows the solid state when active, never a number.

### 12.14 Visual language

- **Faces everywhere**: no screen in Social shows a bare initial once onboarding is done; avatars are the fallback.
- **Seats as the core motif**: filled and open circles appear on table chips, table detail and the plan bar. One recognisable unit across the tab.
- **Places are catalogue cards**: reuse `LivePlaceCard`/cover photos for spots so Social visibly connects to Explore.
- **Chip tones carry meaning**: accent soft for intent, success soft for in-common, neutral for facts. No more than one row of chips per card on the People list.
- **Motion**: one 200 ms seat fill when a member joins; a 150 ms sheet rise; nothing looping, nothing on repeated actions; all honour the reduced-motion setting.
- **Copy**: titles in Title Case, chip labels two words max, no explanatory sentences. Status words are short and true: *Today*, *2 of 4*, *Reply by Thu*, *Needs one more woman first*, *New member*.

### 12.15 Accessibility

Seat rows read as "2 of 4 seats taken: Mei, Raj". Chips expose their tone in words where it carries meaning ("In common: both hike"). The invitation sheet is a modal with focus trapped and returned. Every eye-toggle states the field and its state. Card actions are separate targets from the card body. Large text: card chips wrap, prompts stay two lines with "more" on the person page.

## 13. Build order

**Now (additive columns on `social.profile`, two to three weeks):** Nearby tab replacing Areas (§12.1, §12.3) with the area card from the existing snapshot; first-run onboarding (§12.2); profile editor restructure with Preview and visibility toggles (§12.12); new People card and person page; religion, why plant-based, hobbies, languages, education, work, ethnicity, grew up in, height, drinking/smoking, family plans, pets, gender, usual spots, prompts, Opening Move, *Here for*; avatar as default picture; *In common* chips; invitation card with slot chips, spot suggestion, 72-hour expiry and *Suggest another slot*; attendance marking on existing plans and the *N tables · 0 no-shows* line; *Cooked N*; Share my plan; the Your areas card from the existing snapshot (total band only until the label split ships).

**Next (one additive table `social.table` plus a per-label snapshot split, three to four weeks):** member-started tables and the Tables tab, table chips on Nearby, table detail and Start a table (§12.8, §12.9), with entry points on Explore and the map; *Eat today*; Bring a kaki with pair seats and pair links; the 1:1 unlock; composition rule; same-gender tables; usual-spots aggregation on the area card; weekly area nudge; post-table sheet, *Would eat again*, *Kaki says*, Repeat; table talk cards.

**Later:** selfie photo check, staffed report intake for the OSC route, venue partner tables, café credit for first attendance, paid social.

**Do not build:** swipe decks, mutual-like reveals, voice prompts, paid boosts or visibility, money penalties, Singpass.

## Sources

- Tinder Double Date test results: [LBC](https://www.lbc.co.uk/tech/tinder-double-date-app-new), [YPulse](https://www.ypulse.com/newsfeed/2025/06/23/tinder-just-announced-a-new-double-date-feature-that-allows-friends-to-pair-up-and-match-with-other-duos/)
- Hinge profile structure: [Hinge help](https://help.hinge.co/hc/en-us/articles/360011053094-How-do-I-edit-my-profile); Face Check, Friends' Takes: [GDI](https://www.globaldatinginsights.com/featured/hinge-expands-face-check-testing-adds-direct-to-date-feature/), [GDI](https://www.globaldatinginsights.com/featured/hinge-introduces-friends-take-feature-for-profile-contributions/); 2025 Gen Z D.A.T.E. report: [Hinge](https://hinge.co/newsroom/2025-GenZ-Report)
- Bumble Opening Moves: [TechCrunch](https://techcrunch.com/2026/08/11/bumble-ditches-its-rule-that-kept-men-from-making-the-first-move/)
- Photos vs bios: [GDI on Witmer et al. 2025](https://www.globaldatinginsights.com/featured/profile-photos-dominate-first-impressions-in-online-dating-halo-effect/), [Kennesaw State 2026](https://www.kennesaw.edu/news/stories/2026/ksu-research-shows-win-dating-apps.php)
- Partner qualities surveys: [Marriage Foundation 2025](https://marriagefoundation.org.uk/wp-content/uploads/2025/10/MF-Press-Release-Green-flags-Red-flags.pdf), [Mintel](https://www.mintel.com/press-centre/swipe-right-for-a-sense-of-humor-72-of-single-americans-say-a-shared-sense-of-humor-is-important), [Yorkshire Evening Post on Readly](https://www.yorkshireeveningpost.co.uk/lifestyle/experts-say-good-looks-are-no-longer-a-dating-priority-heres-what-people-are-really-looking-out-for-4987295), [PinkNews on Tinder](https://emdash.thepinknews.com/2024/12/06/golden-retriever-partner-tinder), [Ipsos UK](https://www.ipsos.com/en-uk/node/1048436)
- Singapore: [Yahoo SG on Lunch Actually's survey](https://sg.news.yahoo.com/priorities-daters-singapore-malaysia-evolved-post-covid-survey-085245523.html), [Salt&Light on the MFSD 2024 religion report](https://saltandlight.sg/news/4-key-findings-from-the-marriage-family-and-social-discourse-survey-supplementary-report-on-religion/), [AsiaOne on GHS 2025 singles](https://www.asiaone.com/lifestyle/general-household-survey-2025-singles), [IPS Working Paper 65 on religious identity](https://lkyspp.nus.edu.sg/ips/rric/research/ips-working-papers-no-65-religious-identity-and-practice-among-singaporeans); SingStat inter-ethnic marriage table T28 exists in *Statistics on Marriages and Divorces 2025* but the proportions were not retrieved
- Timeleft: [algorithm post](https://timeleft.com/de/post/timeleft-algorithm-the-maestro-of-your-dinners/), [women's dinners](https://timeleft.com/post/meet-5-women-over-dinner/), [Repeat](https://timeleft.com/post/timeleft-repeat-reconnect-with-friends/), [no-show fee](https://help.timeleft.com/hc/en-150/articles/25012703925148-What-Is-the-No-Show-Penalty-Fee), [Trustpilot](https://www.trustpilot.com/review/timeleft.com)
- Pie engagement: [TechCrunch](https://techcrunch.com/2026/08/25/andy-dunns-startup-pie-becomes-less-of-an-events-app-and-more-of-a-social-network/)
- Area Participation contract: `docs/AREA_PARTICIPATION.md`
