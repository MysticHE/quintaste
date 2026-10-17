# Group plans and community events UX (small-group coordination, 2024–2026)

Research date: 17 October 2026. Scope: interaction design for a Social tab with People / Events / My plans, invitations to form groups of 2/4/6, pre-meal chat, attendance confirmation, gatherings, inbox, empty states and cold start. Older classics are labelled by year. "Research" = peer-reviewed or controlled field study; "practitioner" = design-system docs, blogs, help centres; "company" = vendor marketing or statements.

Method note: about 20 searches/fetches. Apple HIG and NN/g pages could not be retrieved (Apple's page is client-rendered; no NN/g article surfaced in search), so platform-guideline claims rely on published design-system documentation and are flagged as such.

## 1. Plan coordination UX: polls, "who's in", reminders, calendar export, venue suggestions, and what reduces flaking

### Takeaway
Leading tools converge on one pattern: a lightweight poll to decide, then a single event object with Going / Maybe / Can't go RSVPs, a visible headcount, automatic reminders for people who said "going", and calendar export. Peer-reviewed evidence shows that **visible poll responses change how people vote** (they herd toward popular or unpopular slots). Field evidence shows **reminders cut no-shows mainly in the short term**, and **framing the consequences** helps. Evidence for **deposits is weak and confounded**, and I found none for free social events.

### Cited Findings
**Polls and scheduling (research)**
- Zou, Meir & Parkes, "Strategic Voting Behavior in Doodle Polls", CSCW 2015 (classic, 2015): analysed all US Doodle polls from July to September 2011 (over 340,000), comparing hidden polls (respondents can't see others' answers) with open polls. In open polls, respondents were more likely to approve very popular or very unpopular slots but not intermediate ones. The authors explain this with a model combining personal and social utility, i.e. people want to *appear* available and cooperative. — [Parkes lab publication page](https://parkes.seas.harvard.edu/publications/strategic-voting-behavior-doodle-polls); [dblp record](https://dblp1.uni-trier.de/rec/conf/cscw/ZouMP15.html); [Harvard DASH full text](https://dash.harvard.edu/server/api/core/bitstreams/7312037d-7f18-6bd4-e053-0100007fdf3b/content)
- Follow-on work on the same line reports that votes correlate positively with earlier votes. On a set of more than 1.3 million polls, early voters had more influence on the result than late voters. This was reported in search summaries of later papers; I did not verify the exact attribution. — [arXiv 2402.09776, "Strategic Vote Timing in Online Elections With Public Tallies" (2024)](https://arxiv.org/pdf/2402.09776); [Tsang & Larson 2017 (Doodle poll game model)](https://cs.uwaterloo.ca/~klarson/papers/TsangLarson2017.pdf)

**Event objects, RSVPs and reminders (product, 2024–2025)**
- WhatsApp Events (rolled out in 2024: first to Communities, then to all groups). Any member can create an event. Members RSVP so there is a headcount, can see who has RSVP'd, and can add one extra guest (reportedly with no option to disable this). Events are pinned on the group info page, and people who said "going" get an automatic reminder near the time. — [Lowyat.NET, 2024](https://lowyat.net/2024/328466/whatsapp-events-group-chats); [Lowyat.NET, Communities rollout 2024](https://lowyat.net/2024/321497/whatsapp-events-groups-communities); [SAYS](https://says.com/my/tech/whatsapp-can-now-organise-meetings-events-for-groups)
- One guide lists a three-state response: "Going", "Maybe", "Can't Go". Other reports mention only going or not going, so this conflicts. — [Gulf News](https://gulfnews.com/amp/story/technology%2Fwhatsapp-organising-a-party-heres-how-to-create-an-event-1.1731925032656), compared with the [Lowyat.NET report](https://lowyat.net/2024/328466/whatsapp-events-group-chats)
- Coverage presents WhatsApp polls (2023) and events as a pair: polls to reach a decision, then an event to schedule it. One report says the events cannot sync to Google or other calendars. — [Inquirer USA](https://usa.inquirer.net/149544/its-now-easier-to-plan-events-using-whatsapp-heres-how); [Lowyat.NET](https://lowyat.net/2024/328466/whatsapp-events-group-chats)
- Luma (official help centre):
  - Hosts can set a ticket type to "require approval" and can show the location only to approved guests.
  - Guests choose channels per notification type (email, SMS/WhatsApp, push).
  - Reminders have been folded into "Event Blasts", which hosts can schedule.
  - A host's own events are added to their calendar automatically, and iCal sync covers Google, Apple and Outlook.
  - Luma warns that if email updates are off, a calendar entry may go stale after time or location changes.
  - Invited guests are not automatically counted as "going".
  
  Sources: [Luma — Creating an Event](https://help.lu.ma/p/creating-an-event); [Luma — Notification Types](https://help.luma.com/p/notification-types); [Luma Help Centre](https://help.luma.com/)
- Partiful:
  - RSVPs are keyed to phone number, with no app download, so guests get automatic reminders and event updates by text.
  - Guests open a link, enter a phone number and RSVP.
  - The invitation acts as a "social object", with comments and social proof of who is going.
  
  Sources: [Sacra analysis (secondary)](https://sacra.com/c/partiful); [Sacra research (secondary)](https://sacra.com/research/partiful)
- Partiful was Google's 2024 App of the Year. It reportedly had about 70,000 downloads in the first week of November 2024, 95% of them on iOS. — [Design Compass, Nov 2024](https://designcompass.org/en/2024/11/22/partiple-of-google-app-of-the-year/). In Q1 2025 it averaged about 500,000 monthly users, up 400% year on year (Sensor Tower estimate via CNBC). — [NBC San Diego / CNBC](https://www.nbcsandiego.com/news/business/money-report/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple/3807691/?amp=1)
- Platform entrants: Apple Invites launched in February 2025 and requires iCloud+ for hosts. WhatsApp native Events arrived in May 2024. — [Sacra (secondary)](https://sacra.com/c/partiful)

**Matched-group dining (Timeleft-type products; company claims and anecdotes)**
- Timeleft has users take a personality test, after which "its algorithm selects 5 compatible humans" (tables of 6). It claims more than 3 million guests seated. This is company marketing. — [Timeleft blog](https://timeleft.com/blog/dinner-with-strangers/)
- A 2025 first-person account says Timeleft/Kin-style apps notify you of the date and time but not who will attend. This is anecdotal. — [Garden Therapy blog](https://gardentherapy.ca/dinner-with-over-100-strangers/)
- Pricing reported in Lyon: a subscription of €19.99 a month for 4–5 dinners. — [Le Bonbon](https://en.lebonbon.fr/lyon/society/timeleft-meet-singles-in-lyon-through-dinner-parties-with-strangers)
- An Austin reviewer's table had one no-show out of six seats. A 2024 review called the questionnaire "a little superficial". Both are anecdotes. — [ATX Today](https://atxtoday.6amcity.com/culture/go-to-dinner-with-strangers-in-austin-with-timeleft); [Wherever I Look review](https://wherever-i-look.com/articles/experiences/timeleft-the-strangers-meeting-for-dinner-app-review)

**No-show reduction evidence (research and quasi-research)**
- Field experiment with 13,911 season-ticket holders of a German professional football club (2020): reminders reduced no-shows only in the short term, worked best when paired with a monetary-gift reward, and produced no persistent change in later games. Less frequent attenders were more responsive. — [CREMA working paper](https://www.crema-research.ch/publication/using-reminders-with-different-reward-opportunities-to-reduce-no-show-behaviorempirical-evidence-from-a-large-scale-field-experiment-in-professional-sport); [RePEc](https://econpapers.repec.org/paper/crawpaper/2020-19.htm)
- Outpatient clinic, Operations Research (INFORMS): adding one line to the text reminder, saying the wait for the next available appointment could be long, cut no-shows by 28.6% (difference-in-differences; quasi-experimental, not an RCT). — [INFORMS Operations Research](https://pubsonline.informs.org/doi/fpi/10.1287/opre.2023.2444)
- Deposits: a Singapore NUHS quality-improvement project on sleep studies saw no-shows fall from 9.1% to 4.3%. The deposit was bundled with reminders and financial counselling in an uncontrolled before/after design, so its effect cannot be isolated. — [CHILD (Singapore) project page](https://child.chi.sg/learn/child-collection/projects/deposit-collection-reduces-no-show-rates-for-sleep-studies/)
- Vendor blogs claim deposits reduce no-shows by 50% or more but cite no methods, so they are unreliable. — e.g. [SchedulingKit](https://www.schedulingkit.com/blog/average-no-show-rates-by-industry)

### Inferences
- For a group of 2/4/6, use **one event object per plan**: proposed place/date/time plus food arrangements, a per-person state (Invited → Accepted → Confirmed), and a headcount ("3 of 4 confirmed"). This matches the WhatsApp, Luma and Partiful convergence and maps onto QuinTaste's "each participant must confirm" rule.
- If date/time polls are added, the Doodle evidence supports **hiding others' votes until a person has voted**, or showing results only after voting, to reduce herding toward early or popular slots. In a 4–6 person group the first voter's influence is proportionally larger.
- Reminders are the best-supported anti-flake lever. Send them **only to confirmed participants** (WhatsApp/Luma pattern). Framing can mention the real consequence ("Your table of 4 is set for Sat 7pm") without guilt-tripping. The clinic study suggests consequence framing helps, but borrowing urgency language risks a nagging dark pattern (see question 7).
- Deposits are poorly evidenced for free, casual meals and would add payment scope that QuinTaste has deferred. The evidence does not justify them.
- Calendar export (.ics) is expected (Luma). WhatsApp's lack of calendar sync is a known gap. Luma's own warning about stale entries implies that plan edits should re-send updates, which aligns with QuinTaste's rule that plan edits reset confirmations.
- Like Luma's "location visible to approved guests", exact meeting details can stay hidden until an invitation is accepted. This fits QuinTaste's acceptance-gated chat.

### Gaps
- No published no-show or flake rate for Timeleft, Partiful, Luma or Meetup in 2024–2026. Only anecdotes and company claims were found.
- No randomised study of deposits or commitment devices (e.g. "I commit" pledges) for **free** social events.
- No peer-reviewed 2024–2026 study of venue-suggestion UX in group chats. Howbout was not researched within the tool budget.
- WhatsApp RSVP states and who receives reminders conflict across sources. Check the current WhatsApp Help Centre.

## 2. Chat and inbox design for group formation: requests vs accepted chats, read states, badges, system messages, strangers

### Takeaway
The dominant safety pattern for strangers is a **separate Requests area**. Until the recipient accepts, first contact is limited (Instagram: one text-only message, with no media). Luma likewise keeps invited and accepted guests distinct. For screen-reader users, chat needs a log-type live region and no auto-scroll. Research is thin on read receipts and unread badges specifically.

### Cited Findings
- Instagram:
  - People who don't follow the recipient can send **one** message until it is accepted, and further messages require acceptance.
  - Images, videos and voice notes reach non-followers only after acceptance.
  - The sender sees a system notice explaining the one-message limit.
  - Requests sit behind a "Requests" control above the DM inbox.
  - Coverage dates from 2023, and I found no 2024–2025 changes.
  
  Sources: [Neowin](https://www.neowin.net/news/instagram-is-changing-how-unknown-users-can-or-cant-text-you/); [FoneArena](https://www.fonearena.com/blog/401407/instagram-feature-protect-users-unwanted-dms.html/amp); [DesignRush 2023-08-04](https://spotlight.designrush.com/news/2023-08-04-instagram-new-features-enhance-user-safety-dms)
- Supporting tools: "Hidden Words" filters offensive requests into a separate folder, "Limits" handles sudden surges, "Restrict" lets users monitor without blocking, and Block stops all messages. — [Neowin](https://www.neowin.net/news/instagram-is-changing-how-unknown-users-can-or-cant-text-you/); [IANS](https://ianslive.in/instagram-to-now-protect-users-from-unwanted-dm-requests--20230804091805)
- Luma separates "inviting" from "adding" guests, and invited guests are not automatically "going". Hosts are notified when someone registers, joins the waitlist or accepts an invite. — [Luma Notification Types](https://help.luma.com/p/notification-types); [Luma Help Centre](https://help.luma.com/)
- Research (CSCW 2017, classic): in interviews with 14 people-nearby-app users, Hsiao & Dillahunt found that filters, profile photos and in-app chat supported online connection, but **most participants moved to other platforms to build mutual trust before meeting offline**. Their design implications call for apps to support trust-building and uncertainty reduction before meeting, including built-in chat and cross-platform verification. — [Hsiao & Dillahunt, "People-Nearby Applications: How Newcomers Move Their Relationships Offline…", CSCW '17](https://tawannadillahunt.com/wp-content/uploads/2024/05/paper427.pdf)
- Bumble BFF (relaunched in September 2025 on Geneva technology): keeps one-to-one matching with private DMs and adds a Groups tab with chat rooms and an in-app calendar for creating and tracking hangouts. Group discovery was slated for February 2026. — [TechCrunch, 18 Sep 2025](https://techcrunch.com/2025/09/18/bumble-bffs-revamped-app-is-here-focusing-on-friend-groups-and-community-building). The earlier Bumble For Friends group chats offered pre-written activity prompts (e.g. "something outdoors", "games night"); I could not confirm whether the 2025 app keeps them. — [The Everygirl](https://theeverygirl.com/bumble-for-friends-app/)
- Accessible chat (practitioner guidance, not standards):
  - Use `role="log"` with polite announcements and `aria-relevant="additions"` for the message list.
  - Keep the live region mounted before content arrives.
  - Never auto-scroll users who are reading older messages; offer a "New messages" badge or jump control, announced through a status region.
  - Don't distinguish senders by colour alone.
  
  Sources: [azukiazusa.dev](https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui); [Discord community request](https://support.discord.com/hc/sv/community/posts/360050784474-Live-regions-in-the-messages-section); [EZUD](https://ezud.com/accessible-chat-messaging-interfaces/); [Toyota DX playbook — chat messages accessibility](https://dx-playbook-prev.toyota-europe.com/cds/components/chat-messages-pages/accessibility/)

### Inferences
- QuinTaste's model (an invitation stays pending until accepted, chat opens after acceptance) matches the Instagram request pattern. The Inbox should show **Requests** (incoming invitations, with the sender's short message and profile summary plus Accept / Decline / Block) separately from **Chats** (accepted groups).
- Allowing one short text message with the invitation, and no media before acceptance, follows established practice and fits the existing "required short invitation message".
- **System messages** inside the chat should record plan changes ("Place changed to X; everyone needs to re-confirm"), joins and leaves, and confirmations. This makes the confirmation reset visible rather than silent. It is an inference from the Luma stale-calendar problem; I found no direct study.
- Hsiao & Dillahunt suggest people want to build trust before meeting. A pre-meal chat with optional interests and opener chips supports that. Verification signals would also help, but they are outside the local-preview scope.
- Unread badges: count per thread and total in Inbox. Avoid auto-scroll and announce new messages politely, per the accessibility guidance.

### Gaps
- No 2024–2026 peer-reviewed study of read receipts or "seen" indicators in group-formation contexts, or their effect on anxiety or flaking.
- No Hinge-specific material on message limits was found.
- No research found on the ideal number of invitation-request states or on request expiry, e.g. whether requests should expire after N days.

## 3. Profile cards and browse layouts for friendship: photos vs interests and prompts

### Takeaway
Friendship products in 2025 still mix photos with interest-based matching and prompts (Bumble BFF), while matched-dining products (Timeleft) remove browsing and photo choice altogether in favour of a questionnaire and blind table assignment. **I found no peer-reviewed study directly comparing photo-first and interest-first profiles for platonic matching.** The one relevant classic found (CSCW 2017) suggests matching on shared interests or common places and supporting trust-building.

### Cited Findings
- Bumble's standalone BFF app (2025) carries over dating-app features such as interest-based matching, photo prompts and customisable profiles. — [Fast Company SA, 19 Sep 2025](https://fastcompany.co.za/fast-company/business/2025-09-19-bumbles-new-bff-app-aims-to-spark-the-great-friennassance)
- Bumble statistic, company-commissioned and unverified: 47% of young adults want more friends to do activities with, and a similar share want an online platform to help build local community. — [TechCrunch, 18 Sep 2025](https://techcrunch.com/2025/09/18/bumble-bffs-revamped-app-is-here-focusing-on-friend-groups-and-community-building)
- Geneva, Bumble's community platform and the base for the BFF relaunch, had generated no revenue as of 30 June 2025. Monetisation of community and friendship products remains unproven. — [TechCrunch](https://techcrunch.com/2025/09/18/bumble-bffs-revamped-app-is-here-focusing-on-friend-groups-and-community-building)
- Timeleft matches through a personality test into groups of six strangers. Users are not shown the others beforehand, per a first-person account. — [Timeleft blog](https://timeleft.com/blog/dinner-with-strangers/); [Garden Therapy](https://gardentherapy.ca/dinner-with-over-100-strangers/)
- CSCW 2017 (classic): Hsiao & Dillahunt suggest apps could match on stated interests or commonly visited locations to create serendipitous "familiar stranger" connections. — [Hsiao & Dillahunt 2017](https://tawannadillahunt.com/wp-content/uploads/2024/05/paper427.pdf)
- A qualitative study of a loneliness app for older adults found participants most wanted features that support **mutual activities** and finding new connections, rather than sharing emotional states, and were wary of the app replacing in-person contact. — [University of Exeter repository](https://ore.exeter.ac.uk/repository/handle/10871/132353?show=full)
- Classic system work (2011, "Friendbook") inferred shared interests from the content of users' photos. It is a prototype, not a preference study. — [ACM via Unpaywall](https://unpaywall.org/10.1145%2F2070942.2071008)

### Inferences
- For a food-based social product, an **interest-and-logistics-first card** fits the purpose better than a photo-first card. Such a card would show first name, neighbourhood, diet, availability, preferred group size and food interests, with an optional avatar. This is an inference: the activity-first finding (Exeter) and the shared-interests implication (CSCW 2017) point that way, but no head-to-head evidence exists.
- Showing diet compatibility and availability overlap on the card reduces the chat back-and-forth needed to agree a plan.
- Timeleft's blind matching is an alternative model, but it conflicts with QuinTaste's people-first "browse, introduce, chat" direction. It is a benchmark to note, not a recommendation.

### Gaps
- No peer-reviewed 2024–2026 comparison of photo-first and interest-first profiles for platonic connection.
- No evidence on whether prompts ("Ask me about…") increase reply or acceptance rates in friendship contexts. Hinge-style prompt research is dating-specific and was not retrieved.

## 4. Information architecture: People / Events / My plans, segmented controls vs tabs, filters, search

### Takeaway
Design-system guidance broadly agrees that segmented controls suit **2–5 short, parallel options that switch or filter content within one view**, while tabs or tab bars suit **independent sections**. Sources conflict on whether segmented controls should be used for filtering. Bumble BFF (2025) separates one-to-one matching from a **Groups** tab with a calendar, which parallels People vs Events. NN/g and Apple HIG text could not be retrieved.

### Cited Findings
- A tab introduces a new view, while a segmented control filters or alters a smaller portion of content within the existing view. — [SaaS UI Design blog](https://www.saasui.design/blog/saas-tabs-segmented-control-ux-patterns)
- Trimble's mobile system allows a single selection from 2–5 options in a segmented control and advises against using it for filtering or navigating content (use tabs instead). — [Trimble Modus mobile segmented controls](https://styles.trimble.com/components/mobile/segmented-controls/)
- Toyota's design system says to use tabs when the options are independent sections or pages. — [Toyota DX playbook](https://dx-playbook-prev.toyota-europe.com/cds/components/forms/segmented-control/)
- On small screens, keep segment counts low and switch to a dropdown if items overflow. — [Surf design-system blueprint](https://designsystems.surf/blueprints/segmented-control)
- Bumble BFF's IA: one-to-one match/chat plus a separate Groups tab with chat rooms and an in-app event calendar. — [TechCrunch 2025](https://techcrunch.com/2025/09/18/bumble-bffs-revamped-app-is-here-focusing-on-friend-groups-and-community-building)
- Luma lets hosts restrict events by approval-required ticket types (category- and permission-level gating). — [Luma — Creating an Event](https://help.lu.ma/p/creating-an-event)

### Inferences
- People / Events / My plans are three short, parallel labels inside one bottom-dock destination (Social). A top segmented control is defensible because it switches between sibling lists within one screen, not app sections. However, Trimble and Toyota would call these independent sections, so it is borderline. The deciding factor is whether each segment keeps its own scroll position, search scope and filters. If it does, it behaves as tabs and should expose tab semantics (`tablist`/`tab`) to assistive technology.
- The current QuinTaste design (contextual filters only on People and Events; My plans searches groups, gatherings and applications together) matches the "segmented control changes content within one view" model, with filters scoped to the active segment.
- Search placeholder text that changes per segment ("Find people / Find events / Find my plans") clarifies scope. That is an inference; I found no direct study.

### Gaps
- No NN/g article was retrieved on segmented controls vs tabs. Apple HIG and Material 3 text could not be fetched; verify directly at [Apple HIG — Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls).
- No public IA teardown of Timeleft, Meetup or Partiful app tabs with dates was found.

## 5. Cold start and empty networks: seed events, waitlists, invite-a-friend, host-led events, honest labelling of sample content

### Takeaway
The best-known framework is Andrew Chen's **atomic network** (2021): the smallest network that delivers value, which is smaller than a city or even a neighbourhood. Seed it densely before expanding. Event products lean on **host-led** distribution (Partiful: hosts share links into existing chats with no guest app install) and on host-controlled approvals and waitlists (Luma). **No sources were found on honest labelling of sample or fictional content**; the closest relevant evidence is regulators flagging fake "social proof" as a deceptive pattern.

### Cited Findings
- Chen defines the atomic network as "the smallest version of a network where the product delivers real value to all participants", explicitly not a market or city. Examples:
  - Uber: 5pm rush hour in San Francisco's Financial District.
  - Slack: a single product team of 15–20 people.
  - Tinder: seeded at a USC campus party where bouncers required the app for entry.
  - Clubhouse: the founder's friend circle.
  
  Sources: [TechCrunch interview, Dec 2021 (classic)](https://techcrunch.com/2021/12/08/andrew-chen-of-a16z-on-how-startups-get-past-a-cold-start-to-survive-and-thrive/); [Andrew Chen blog](https://andrewchen.com/?p=210)
- A "first 1,000 active users" critical-mass heuristic appears in a summary site but not in Chen's own excerpts, so treat it as unverified. — [Pulse RevOps summary](https://pulserevops.com/sales-book-summaries/bs0233)
- Partiful's distribution is host-led: hosts build an event on a phone and drop the link into texts, Instagram DMs or WhatsApp, and guests RSVP with a phone number and no app. Monetisation is deferred to optional add-ons, keeping the core free. — [Sacra (secondary)](https://sacra.com/c/partiful)
- Luma: approval-required registration, waitlists, and host notifications when guests join a waitlist. Only hosts, not Luma support, can manage registration status. — [Luma Help Centre](https://help.luma.com/); [Luma Notification Types](https://help.luma.com/p/notification-types)
- Timeleft has company-published city-launch coverage (Paris), and assigns guests to groups rather than letting them browse. — [Timeleft: "Back to basics" Paris launch](https://timeleft.com/jp/post/back-to-basics-timeleft-launches-its-unique-dinners-in-paris/); [Timeleft blog](https://timeleft.com/blog/dinner-with-strangers/)
- Regulators: in the 2024 ICPEN/GPEN sweep of 642 subscription sites and apps, about 76% used at least one possible dark pattern, and 21.5% used notifications or other "social proof" to push sign-ups. These are not legal findings. — [FTC](https://www.ftc.gov/node/85835); [TechCrunch, 10 Jul 2024](https://techcrunch.com/2024/07/10/ftc-study-finds-dark-patterns-used-by-a-majority-of-subscription-apps-and-websites)

### Inferences
- For QuinTaste in Singapore, the atomic network is likely **one neighbourhood cluster plus one recurring format** (e.g. a weekly vegetarian lunch near one MRT hub), not "all of Singapore". This is my inference from Chen.
- Host-led seed gatherings, posted by real organisers, fit QuinTaste's Events model (casual gatherings of 2–30 without approval). They create value even when the People list is sparse.
- The empty state should offer concrete next actions (set up your profile and turn on "Open to plans", create a gathering, invite a friend), not a blank list.
- Sample or fictional profiles must be visibly labelled and **never counted in "who's going" or activity indicators**. Fabricated social proof is exactly what regulators flag (FTC/ICPEN). This supports QuinTaste's existing "fictional peer / Not sent" labelling.

### Gaps
- No 2024–2026 research or post-mortem on cold start specific to friendship or dining apps.
- No source on best practice for labelling sample or demo content in consumer social apps.
- No data on whether waitlists help or hurt early local-community products.
- Not verified: whether Timeleft concentrates supply into a single fixed weekly dinner slot per city. The page text was not fetched.

## 6. Accessibility and inclusivity: large text, screen readers in chat, reduced motion, low literacy, older adults

### Takeaway
A 2025 systematic review of age-friendly app design (132 studies) supports **simplified navigation, enlarged text and touch targets, voice interaction and error-tolerant interfaces**. Older adults favour **activity-based connection** over emotional-sharing features. Chat accessibility depends on log-style live regions and on never auto-scrolling. I found nothing specific on reduced motion or low literacy in social apps.

### Cited Findings
- Systematic review (2025, 132 studies) on mobile app design for older adults: essential elements are simplified navigation, enlarged text and touch targets, voice interaction and error-tolerant interfaces. Participatory design improved usability and satisfaction. — [PMC12350549](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12350549/)
- Older adults in a loneliness-app study (focus groups n=33, concept interviews n=10, one-week prototype trial n=12) most wanted features for mutual activities and making new connections, and were wary of replacing in-person contact. — [University of Exeter repository](https://ore.exeter.ac.uk/repository/handle/10871/132353?show=full)
- CHI 2024 Best Paper Honourable Mention on co-designing video calling for older adults living independently argues that mainstream tools such as Zoom are not tailored to many older adults' needs. Only the project page was retrieved. — [Project page](https://yushanxing.owlstown.net/projects)
- Chat screen-reader guidance (practitioner):
  - Use `role="log"`, polite announcements and additions-only relevance.
  - Keep the live region mounted.
  - Announce new messages through a status region with a jump-to-latest control, and never auto-scroll.
  - Don't distinguish senders by colour alone.
  - The 2007 ReefChat study found patchy screen-reader support for live regions at the time, so test with current NVDA, JAWS, VoiceOver and TalkBack.
  
  Sources: [azukiazusa.dev](https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui); [EZUD](https://ezud.com/accessible-chat-messaging-interfaces/); [ReefChat review](https://a11y-paradise.onrender.com/reviews/69c3018f1a4b2c857dd8259a)

### Inferences
- Opener chips (pre-written invitation starters) help low-literacy and second-language users as well as shy users. This is an inference; Bumble For Friends used similar activity prompts in group chats ([The Everygirl](https://theeverygirl.com/bumble-for-friends-app/)).
- Status changes such as "Pending", "Accepted", "3 of 4 confirmed" and "Plan changed — please re-confirm" should be text plus icon, not colour alone, and announced to screen readers.
- Group-size choice (2/4/6) works well as large, labelled radio chips rather than a slider. This is an inference from the guidance on enlarged targets and error tolerance.

### Gaps
- No 2024–2026 evidence on reduced-motion use or preferences in social or event apps.
- No study on low-literacy users in social-coordination apps.
- The full text of the CHI 2024 older-adult video-calling paper was not retrieved.

## 7. Anti-patterns: infinite swipe, engagement-bait notifications, paid-boost dark patterns

### Takeaway
Regulators are scrutinising deceptive and addictive design, but evidence specific to social-app notifications and swipe mechanics was not found in 2024–2026 primary sources. The relevant 2024 signals are the FTC/ICPEN sweep (social proof and nagging in subscription flows) and the EU Digital Fairness Fitness Check (October 2024), which flags addictive design in social media and will inform a Digital Fairness Act.

### Cited Findings
- ICPEN/GPEN sweep (29 January – 2 February 2024) of 642 subscription websites and apps:
  - About 76% used at least one possible dark pattern, and about 67% used several.
  - 21.5% used notifications or other social proof to push enrolment.
  - "Nagging" (repeated prompts to act) is a named pattern.
  - No legal findings were made.
  
  Sources: [FTC](https://www.ftc.gov/node/85835); [Hunton Andrews Kurth](https://huntonak.com/privacy-and-information-security-law/ftc-and-consumer-protection-networks-review-use-of-dark-patterns); [TechCrunch 2024](https://techcrunch.com/2024/07/10/ftc-study-finds-dark-patterns-used-by-a-majority-of-subscription-apps-and-websites)
- The European Commission's Digital Fairness Fitness Check (October 2024) flagged addictive design, particularly in social media and video games, as a gap in current consumer law and a basis for the proposed Digital Fairness Act. — [Arthur Cox](https://www.arthurcox.com/knowledge/eu-digital-fairness-fitness-check-shines-light-on-deceptive-patterns/); [Euronews, 4 Oct 2024](https://www.euronews.com/next/2024/10/04/eu-commission-current-consumer-rules-unfit-for-2024-online-market)
- Reminders' effect on attendance is short-lived, with no persistent habit change (football field experiment). Repeated nudging therefore has diminishing returns, apart from its ethical cost. — [CREMA](https://www.crema-research.ch/publication/using-reminders-with-different-reward-opportunities-to-reduce-no-show-behaviorempirical-evidence-from-a-large-scale-field-experiment-in-professional-sport)

### Inferences
- Avoid infinite swipe for People. A finite, filterable list with an explicit end ("That's everyone open to plans near you") respects the "no engagement bait" principle and fits QuinTaste's low-volume, neighbourhood-scale cold-start reality.
- Limit notifications to actionable events: a new invitation, an acceptance, a plan change needing re-confirmation, and one pre-meal reminder. Avoid "X people viewed your profile" or fake-activity nudges, since these are the social-proof and nagging patterns regulators flag.
- Do not introduce paid boosts or priority invitations. QuinTaste's no-hosting-fee stance for casual gatherings already avoids this.

### Gaps
- No 2024–2026 peer-reviewed study on infinite swipe in friendship or platonic apps.
- No regulatory report specific to social-app push-notification dark patterns or paid boosts in dating or friendship apps was retrieved.
- No NN/g, Baymard or Smashing article on these anti-patterns in social apps was retrieved within budget.
